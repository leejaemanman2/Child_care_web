import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { searchPubMed } from "./providers/pubmed.js";
import { searchSerp } from "./providers/serp.js";
import { makeLru } from "./cache.js";

const searchCache = makeLru({ max: 200, ttlMs: 45 * 60 * 1000 });

function keyOf(query) { return (query || "").trim().toLowerCase(); }

const ORG_BOOST = { AAP: 1.0, NHS: 1.0, WHO: 0.8, UNICEF: 0.7, KDCA: 1.0 };
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- tokenizer ----
function tokenize(s = "") {
    return (s || "")
        .toLowerCase()
        .replace(/[^0-9a-zA-Z\u3131-\u318E\uAC00-\uD7A3]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

// 간단 리랭커: 도메인 신뢰/연도/쿼리 길이에 따른 가중치
function rerank(query, docs) {
    const now = new Date().getFullYear();
    const allow = new Set((process.env.RAG_ALLOWED_DOMAINS || "").split(",").map(s => s.trim()).filter(Boolean));
    const qLen = (query || "").split(/\s+/).filter(Boolean).length;

    return docs.map(d => {
        let s = d.score ?? 0;
        // 권위 도메인 가중치
        if (allow.size && d.org && Array.from(allow).some(dom => String(d.org).includes(dom))) s += 0.15;
        // 최신 연도 가중치
        if (d.year && d.year >= now - 3) s += 0.08;
        // 쿼리 길이가 길면 웹/논문 가중치 소폭
        if (qLen >= 6) s += 0.03;
        return { ...d, score: s };
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

// ✅ 새 함수: 하이브리드 검색
export async function searchTopNHybrid(query, n = Number(process.env.RAG_MAX_DOCS || 6)) {
    const key = keyOf(query) + "::" + n;
    const cached = searchCache.get(key);
    if (cached) return cached;

    const tasks = [
        searchPubMed(query, Math.ceil(n / 2)),
        searchSerp(query, Math.ceil(n / 2)),
    ];
    const results = (await Promise.allSettled(tasks))
        .flatMap(s => s.status === "fulfilled" ? s.value : []);
    const dedup = new Map();
    for (const d of results) dedup.set(d.url, d);
    const top = rerank(query, Array.from(dedup.values())).slice(0, n);
    searchCache.set(key, top);
    return top;
}

let DOCS = [];
let DF = new Map();
let TF = [];
let N = 0;

let LAST_SOURCE = "__fallback__";
let LAST_LOADED_AT = 0;

function buildIndex() {
    DF.clear();
    TF.length = 0;
    N = DOCS.length;

    DOCS.forEach((doc, i) => {
        const tf = new Map();
        const seen = new Set();
        const tokens = [
            ...tokenize(doc.title || ""),
            ...tokenize(doc.title || ""),
            ...tokenize(doc.title || ""),
            ...tokenize(doc.org || ""),
            ...tokenize(doc.text || ""),
        ];
        tokens.forEach((t) => {
            tf.set(t, (tf.get(t) || 0) + 1);
            if (!seen.has(t)) {
                DF.set(t, (DF.get(t) || 0) + 1);
                seen.add(t);
            }
        });
        TF[i] = tf;
    });
}

function makeSnippet(text = "", query = "", max = 180) {
    try {
        const flat = String(text).replace(/\s+/g, " ").trim();
        if (!flat) return "";
        const key = String(query).split(/\s+/).filter(Boolean).slice(0, 6).join("|");
        if (!key) return flat.slice(0, max) + (flat.length > max ? "…" : "");
        const re = new RegExp(`(.{0,80})(?:${key})(.{0,80})`, "i");
        const m = flat.match(re);
        const snip = m ? `${m[1] || ""}${m[0] || ""}${m[2] || ""}`.trim() : flat.slice(0, max);
        return snip.length > max ? snip.slice(0, max) + "…" : snip;
    } catch {
        return "";
    }
}

function loadFallback() {
    DOCS = [
        {
            id: "kdca-fever",
            title: "영유아 발열 및 응급 신호 안내",
            org: "KDCA",
            url: "https://example.org/kdca/fever",
            text:
                "영유아의 고열(39℃ 이상), 호흡곤란, 청색증, 경련, 의식저하 등은 응급 신호입니다. " +
                "발열 시 미온수 마사지, 수분 보충, 해열제 복용 안내, 위험 신호 시 즉시 119 또는 응급실 방문.",
        },
        {
            id: "aap-2019",
            title: "Transitions in Early Childhood",
            org: "AAP",
            url: "https://example.org/aap",
            text:
                "낯선 환경 전이 시 예고·시각 단서 제공, 짧은 전이 루틴, 취침 전 20–30분 조용한 시간, " +
                "문제행동에는 기능적 대체활동 제시.",
        },
        {
            id: "who-2020",
            title: "Caregiver Guidelines",
            org: "WHO",
            url: "https://example.org/who",
            text:
                "양육자 지침: 일관된 루틴, 수면 위생, 안전한 놀이 환경, 위험 신호 관찰 및 즉시 진료 권고.",
        },
    ];
    LAST_SOURCE = "__fallback__";
}

export function reload() {
    try {
        const pJsonl = path.join(__dirname, "sources.jsonl");
        const pJson = path.join(__dirname, "sources.json");

        if (fs.existsSync(pJsonl)) {
            const lines = fs.readFileSync(pJsonl, "utf8").split(/\r?\n/).filter(Boolean);
            DOCS = lines.map((ln) => JSON.parse(ln));
            LAST_SOURCE = pJsonl;
        } else if (fs.existsSync(pJson)) {
            DOCS = JSON.parse(fs.readFileSync(pJson, "utf8"));
            LAST_SOURCE = pJson;
        } else {
            loadFallback();
        }
    } catch (e) {
        console.error("[RAG] reload error:", e.message);
        loadFallback();
    }

    LAST_LOADED_AT = Date.now();
    buildIndex();
    console.log(`[RAG] loaded ${DOCS.length} docs from ${LAST_SOURCE}`);
    return { count: DOCS.length, source: LAST_SOURCE };
}

function scoreDoc(queryTokens, i) {
    const tf = TF[i];
    const doc = DOCS[i];
    let s = 0;
    for (const q of queryTokens) {
        const tfv = tf.get(q) || 0;
        if (!tfv) continue;
        const df = DF.get(q) || 1;
        const idf = Math.log((N + 1) / df);
        s += tfv * idf;
    }
    // 기관 가중치 보정
    s += (ORG_BOOST[doc.org] ?? 0) * 0.5;
    return s;
}

export function searchTopN(query, topN = 3) {
    if (!DOCS.length) reload();
    const qTokens = tokenize(query);

    // 점수화
    let scored = DOCS.map((d, i) => ({
        ...d,
        score: scoreDoc(qTokens, i),
    })).filter(x => x.score > 0);

    // 같은 org/제목 유사한 문서 중복 제거
    const seen = new Set();
    const deduped = [];
    for (const d of scored.sort((a, b) => b.score - a.score)) {
        const key = `${(d.org || "").toLowerCase()}::${(d.title || "").toLowerCase().replace(/\s+/g, " ")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // 간단 스니펫
        const t = (d.text || "").replace(/\s+/g, " ").trim();
        d.snippet = t.slice(0, 140) + (t.length > 140 ? "…" : "");
        deduped.push(d);
    }

    return deduped.slice(0, topN);
}

// ✅ stats 함수 하나로 통합
export function stats() {
    if (!DOCS.length) reload();
    return {
        count: DOCS.length,
        source: LAST_SOURCE,
        updated_at: LAST_LOADED_AT,
        sample_ids: DOCS.slice(0, 5).map((d) => d.id),
        cacheSize: searchCache.size(),   // 캐시 상태도 같이 포함
    };
}
