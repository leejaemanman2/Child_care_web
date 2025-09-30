// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { fileURLToPath } from "url";
import crypto from "crypto";
import "dotenv/config"

import { searchTopN, reload as ragReload, stats as ragStats } from "./rag/search.js";
import { generatePlan } from "./llm/gpt.js";
import { searchWebTopN, webStats } from "./web/search.js";
import webRouter from "./web/search.js";


// ──────────────────────────────────────────────────────────
// Boot & App
// ──────────────────────────────────────────────────────────
dotenv.config();

const BUILD = "guardrails-v2-rag1";
const app = express();

if (process.env.WEB_SEARCH === "1") {
    app.use("/web", webRouter);
}

// 요청 ID & 소요시간 로거
app.use((req, res, next) => {
    const rid = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const t0 = Date.now();
    res.setHeader("x-request-id", rid);
    res.on("finish", () => {
        const ms = Date.now() - t0;
        console.log(`[${rid}] ${req.method} ${req.url} -> ${res.statusCode} ${ms}ms`);
    });
    next();
});

app.use(morgan("tiny"));
app.use(express.json({ limit: "32kb" }));

const ALLOW_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());

app.use(
    cors({
        origin(origin, cb) {
            if (!origin || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
            return cb(new Error("Not allowed by CORS"));
        },
    })
);

// 레이트리밋 (분당 30회, /api에만 적용)
app.use(
    "/api",
    rateLimit({
        windowMs: 60 * 1000,
        limit: 30,
        standardHeaders: "draft-7",
        legacyHeaders: false,
    })
);

// 부팅 로그
console.log("[BOOT] behavior-api build:", BUILD);
console.log("[BOOT] index path:", new URL(import.meta.url).pathname);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiDoc = YAML.parse(fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get("/docs.json", (_req, res) => res.json(openapiDoc));

// 헬스체크
app.get("/healthz", (_req, res) => res.json({ ok: true, build: BUILD }));

// 간단 요청 로그
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// ──────────────────────────────────────────────────────────
// 위험 신호 라벨 테이블
// ──────────────────────────────────────────────────────────
const RISK_LABELS = [
    { re: /(호흡\s*곤란|숨\s*(가빠|가빴|가쁜|차(?:다|요)?|헐떡|거칠|빠르(?:게|고)?|힘들(?:다|어요)?))/u, label: "호흡곤란" },
    { re: /(청색증|입술(?:이)?\s*(퍼래|퍼렇|파랗|새파랗|파래짐|푸르딩딩)|손발(?:이)?\s*(퍼래|퍼렇|파랗|새파랗|파래짐|푸르딩딩))/u, label: "청색증" },
    { re: /경련|떨림|강직/u, label: "경련/강직" },
    { re: /의식\s*저하|무반응|축\s*늘어짐|깨워도\s*반응/u, label: "의식저하" },
    { re: /탈수|소변\s*감소|입\s*마름/u, label: "탈수 의심" },
    { re: /(39|40)\s*(?:\.?\d+)?\s*(도|℃|°C|도씨)/u, label: "39℃ 이상 고열" },
    { re: /고열/u, label: "고열" },
    { re: /사라지지\s*않는\s*발진|점상\s*출혈|유리잔\s*테스트.*사라지지/u, label: "지워지지 않는 발진/점상출혈" },
    { re: /목이\s*뻣뻣|경부\s*강직/u, label: "목 경직" },
    { re: /기면|극심한\s*무기력/u, label: "기면/극심한 무기력" },
];

// ──────────────────────────────────────────────────────────
// 유틸: 체온 파서/트리아지
// ──────────────────────────────────────────────────────────
function extractTempC(s = "") {
    if (!s) return null;
    const norm = String(s).replace(/,/g, ".").replace(/\s+/g, " ").toLowerCase();
    const m = norm.match(/\b(3[4-9]|4[0-3])(?:\.(\d))?\s*(?:도|℃|°c|도씨)?\b/i);
    if (!m) return null;
    const intPart = Number(m[1]);
    const dec = m[2] ? Number(m[2]) / 10 : 0;
    const val = Number((intPart + dec).toFixed(1));
    return isFinite(val) ? val : null;
}

function riskByAgeTemp(ageMonths, tempC) {
    if (tempC == null) return null;
    if (typeof ageMonths === "number" && ageMonths >= 0 && ageMonths < 3 && tempC >= 38.0) return "high";
    if (typeof ageMonths === "number" && ageMonths >= 3 && ageMonths <= 6 && tempC >= 39.0) return "high";
    if (tempC >= 39.0) return "high";
    return "low";
}

function extractSignals({ age_months, duration, context, text }) {
    const blob = [age_months ?? "", duration ?? "", context ?? "", text ?? ""].join(" ");
    const signals = [];
    if (/던지|throw|집어던지/giu.test(blob)) signals.push("던지기 반복");
    if (/낯선|처음|새로운/giu.test(blob)) signals.push("낯선 환경 불안");
    if (/낮잠|수면|잠/giu.test(blob)) signals.push("수면 루틴 혼란");
    if (/(발열|열|고열)\s*(\d{2})?\s*도?/giu.test(blob)) signals.push("발열/고열");
    if (/호흡\s*곤란|숨\s*가쁨|쌕쌕|가쁜\s*호흡/giu.test(blob)) signals.push("호흡곤란");
    if (/청색증|입술이\s*파랗|손발이\s*파랗/giu.test(blob)) signals.push("청색증");
    if (/경련|떨림|강직/giu.test(blob)) signals.push("경련/강직");
    if (/의식\s*저하|무반응|축\s*늘어짐|깨워도\s*반응/giu.test(blob)) signals.push("의식저하");
    if (/발진|점상\s*출혈|사라지지\s*않는\s*발진/giu.test(blob)) signals.push("발진/출혈징후");
    if (/목이\s*뻣뻣|경부\s*강직/giu.test(blob)) signals.push("목 경직");
    return Array.from(new Set(signals));
}

function detectRisks({ age_months, duration, context, text }) {
    const blob = [age_months ?? "", duration ?? "", context ?? "", text ?? ""].join(" ");
    const labels = [];
    for (const { re, label } of RISK_LABELS) if (re.test(blob)) labels.push(label);

    const tempC = extractTempC(blob);
    const triage = riskByAgeTemp(typeof age_months === "number" ? age_months : undefined, tempC);
    if (tempC !== null && tempC >= 39.0) labels.push("39℃ 이상 고열");
    if (triage === "high") labels.push("연령/체온 기준 고위험");

    if (labels.length) console.log("⚠️ risk alerts matched:", labels);
    return Array.from(new Set(labels));
}

function buildTriage({ age_months, text, alerts }) {
    const tempC = extractTempC(text);
    const reasons = [];
    let level = "routine"; // routine | urgent | emergent

    const emergentSet = new Set(["호흡곤란", "청색증", "의식저하", "경련/강직"]);
    const urgentSet = new Set(["지워지지 않는 발진/점상출혈", "목 경직", "탈수 의심"]);

    for (const a of alerts) if (emergentSet.has(a)) { reasons.push(a); level = "emergent"; }
    if (level !== "emergent") for (const a of alerts) if (urgentSet.has(a)) { reasons.push(a); level = "urgent"; break; }

    const tempRisk = riskByAgeTemp(age_months, tempC);
    if (tempRisk === "high") { reasons.push(`연령대 대비 고열 ${tempC}℃`); level = "emergent"; }
    else if (tempC != null && tempC >= 38.5 && level === "routine") { reasons.push(`발열 ${tempC}℃`); level = "urgent"; }

    return { level, reasons, tempC };
}

function buildFollowups({ signals, alerts, age_months }) {
    const qs = [];
    if (alerts.includes("호흡곤란")) qs.push("숨이 빨라지거나 쌕쌕거림이 있나요? (호흡수/분)");
    if (alerts.includes("청색증")) qs.push("입술/손발 파래짐이 지속되나요? 대략 몇 분 정도인가요?");
    if (alerts.includes("의식저하")) qs.push("깨웠을 때 눈맞춤/소리에 반응하나요?");
    if (alerts.includes("경련/강직")) qs.push("경련은 몇 분 지속됐나요? 이후 졸림/혼란이 있었나요?");
    if (signals.includes("발열/고열")) qs.push("해열제 복용 시간과 용량은 어떻게 되나요?");
    if (typeof age_months === "number" && age_months < 3) qs.push("생후 3개월 미만인가요? 최근 감염 노출이 있었나요?");
    qs.push("수분 섭취와 소변 횟수는 평소 대비 어떤가요?");
    return Array.from(new Set(qs)).slice(0, 6);
}

// ──────────────────────────────────────────────────────────
// 메인 API: 웹+로컬 근거 → LLM 생성
// ──────────────────────────────────────────────────────────
app.post("/api/analyze-behavior", async (req, res) => {
    const BodySchema = z.object({
        age_months: z.number().int().min(0).max(72).optional(),
        duration: z.string().max(100).optional(),
        context: z.string().max(200).optional(),
        text: z.string().min(2).max(2000),
    });
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            ok: false,
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((i) => i.message).join(", "),
        });
    }
    const { age_months, duration, context, text } = parsed.data;

    const signals = extractSignals({ age_months, duration, context, text });
    const alerts = detectRisks({ age_months, duration, context, text });
    const triage = buildTriage({ age_months, text, alerts });
    const followups = buildFollowups({ signals, alerts, age_months });

    // ── RAG(Local)
    let localHits = [];
    try {
        const q = [text, (signals || []).join(" "), (alerts || []).join(" ")].join(" ");
        localHits = searchTopN(q, 3).map(h => ({
            id: h.id,
            title: h.title,
            org: h.org,
            url: h.url,
            score: h.score ?? 0.5,
            snippet: h.snippet || (h.text ? String(h.text).slice(0, 300) : ""),
            text: h.text || "",
            source: "local",
        }));
    } catch (e) {
        console.warn("RAG search failed:", e.message);
    }

    // ── Web Search
    let webHits = [];
    if (process.env.WEB_SEARCH === "1") {
        try {
            const q = [text, (signals || []).join(" "), (alerts || []).join(" ")].join(" ");
            webHits = await searchWebTopN(q, 3); // [{id,title,org,url,score,snippet,text,source:"web"}]
        } catch (e) {
            console.warn("WEB search failed:", e.message);
        }
    }

    // ── Merge & dedupe by URL
    const byUrl = new Map();
    [...localHits, ...webHits].forEach(h => {
        const k = h.url || h.title;
        if (!k) return;
        const prev = byUrl.get(k);
        if (!prev || (h.score ?? 0) > (prev.score ?? 0)) byUrl.set(k, h);
    });
    const hits = Array.from(byUrl.values())
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);

    // ── Build LLM context
    const contextText = hits.map(h => {
        const body = (h.text || h.snippet || "").slice(0, 2500);
        return `# ${h.title}${h.org ? " · " + h.org : ""}\n${h.url || ""}\n${body}`;
    }).join("\n---\n").slice(0, 10000);

    // ── LLM Generate (fail-safe)
    // ── LLM Generate (fail-safe)
    let llm = null, llmErr = null;
    try {
        llm = await generatePlan({
            input: text,
            ageMonths: age_months,
            signals,
            alerts,
            context: contextText,
        });
    } catch (e) {
        llmErr = e?.message || String(e);
        console.warn("[LLM] generatePlan failed:", llmErr);
    }


    const baseActions = [
        "전이 신호 제공: 활동 전 5분 예고",
        "던지기 대체활동: 소프트볼 바구니에 넣기",
        "수면 루틴 고정: 취침 전 20–30분 조용한 시간",
    ];

    const response = {
        extracted: { signals, risk_level: (alerts.length || triage.level !== "routine") ? "high" : "low" },
        triage,
        vitals: { tempC: triage.tempC },
        followups,
        hypotheses: llm?.hypotheses ?? [
            { label: "적응/전이 스트레스", confidence: 0.58, why: "낯선 상황에서 악화되는 서술" },
            { label: "감각추구(던지기)", confidence: 0.45, why: "던지기 반복, 주의 끌기 맥락" },
        ],
        actions: llm?.actions ?? baseActions,
        disclaimer: llm?.disclaimer || "이 결과는 의학적 진단이 아니며 참고용입니다. 위험 신호가 있으면 즉시 진료가 필요합니다.",
        citations: hits.map(({ id, title, org, url, score, snippet }) => ({ id, title, org, url, score, snippet })),
        alerts,
        meta: { llm_used: !!llm, llm_error: llmErr, model: process.env.OPENAI_MODEL || "gpt-4o-mini" },

    };

    if (alerts.length) {
        response.actions = [
            "⚠️ 응급 경고: 호흡곤란·청색증·경련·의식저하·고열(39℃ 이상) 등 위험 신호 시 즉시 119 또는 응급실 방문",
            ...response.actions,
        ];
    }


    return res.json(response);
});

// ──────────────────────────────────────────────────────────
// 디버그/리로드 & 상태
// ──────────────────────────────────────────────────────────
app.post("/debug/match", (req, res) => {
    const alerts = detectRisks(req.body || {});
    res.json({ build: BUILD, alerts });
});

app.post("/rag/reload", (_req, res) => {
    const r = ragReload();
    res.json({ ok: true, ...r });
});

app.get("/rag/stats", (_req, res) => res.json({ ok: true, ...ragStats() }));

app.get("/web/stats", (_req, res) => res.json(webStats()));

app.get("/web/search", async (req, res) => {
    const q = (req.query.q || "").toString();
    const n = Number(req.query.n || 3);
    if (!q) return res.status(400).json({ ok: false, message: "q required" });
    try {
        const items = await searchWebTopN(q, n);
        res.json({ ok: true, count: items.length, items });
    } catch (e) {
        res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────────────────
// RAG preload & Start
// ──────────────────────────────────────────────────────────
try {
    const { count, source } = ragReload();
    console.log(`[BOOT] RAG preloaded ${count} docs from ${source}`);
} catch (e) {
    console.warn("[BOOT] RAG preload failed:", e.message);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
