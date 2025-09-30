// src/pages/Behaviors/BehaviorPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BEHAVIOR_DATA } from "./data";
import { analyzeBehavior, ragReload } from "../../services/behaviorApi";
import "../../styles/behavior.css";

/** ---- 기능 요약 ----
 * 1) 샘플칩: textarea 아래에 5개 예시 클릭-삽입
 * 2) 히스토리(LocalStorage): 최근 10개 저장/표시/재실행/삭제/전체삭제
 * 3) 결과 복사/요약 복사/공유: 클립보드 복사 + 링크 공유(?q=)
 */

// 도메인/배지
const domainOf = (url = "") => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};
const badgeOf = (org, url) => (org || "").trim() || domainOf(url);

// ---- client-side pre-triage helpers ----
function parseTempCClient(s = "") {
    const norm = String(s).replace(/,/g, ".").replace(/\s+/g, " ").toLowerCase();
    const m = norm.match(/\b(3[4-9]|4[0-3])(?:\.(\d))?\s*(?:도|℃|°c|도씨)?\b/i);
    if (!m) return null;
    const val = Number(((Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0))).toFixed(1));
    return isFinite(val) ? val : null;
}
function riskByAgeTempClient(ageMonths, tempC) {
    if (tempC == null) return null;
    if (typeof ageMonths === "number" && ageMonths >= 0 && ageMonths < 3 && tempC >= 38.0) return "high";
    if (typeof ageMonths === "number" && ageMonths >= 3 && ageMonths <= 6 && tempC >= 39.0) return "high";
    if (tempC >= 39.0) return "high";
    return "low";
}

// ---- 샘플 칩 ----
const SAMPLE_CHIPS = [
    "고열 39.5℃, 기운 없음",
    "입술이 파래요(청색증)",
    "수유량 감소 · 보챔",
    "낯선 곳에서 떼쓰기 심함",
    "밤중에 자주 깸",
    "발진이 눌러도 안 사라짐",
    "목이 뻣뻣해요",
    "경련/강직 의심",
];

const LS_HISTORY_KEY = "cb_analyze_history_v1";


// YYYY-MM-DD HH:mm
function fmt(ts) {
    try {
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch {
        return String(ts);
    }
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(LS_HISTORY_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
function saveHistory(items) {
    try { localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(items.slice(0, 10))); }
    catch { }
}

// 요약 문자열
function summarizeResult(text, res) {
    const risk = res?.extracted?.risk_level || "low";
    const alerts = (res?.alerts || []).join(", ");
    const hyps = res?.hypotheses?.map((h) => h.label).slice(0, 3).join(", ") || "—";
    const topAction = res?.actions?.[0] || "";
    return `입력: ${text}
위험도: ${risk.toUpperCase()} ${alerts ? `(신호: ${alerts})` : ""}
가설: ${hyps}
주요 대응: ${topAction}`;
}

function toHistoryItem(inputText, res) {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        text: inputText,
        risk: res?.extracted?.risk_level || "low",
        alerts: res?.alerts || [],
        hyps: (res?.hypotheses || []).map((h) => h.label),
        res,
    };
}

/* ──────────────────────────────────────────────
 *  UI Components (추가)
 * ────────────────────────────────────────────── */
function TriageBanner({ triage }) {
    if (!triage?.level) return null;
    const color =
        triage.level === "emergent" ? "danger" :
            triage.level === "urgent" ? "warn" : "ok";
    const label =
        triage.level === "emergent" ? "응급 경고" :
            triage.level === "urgent" ? "주의 필요" : "일반";
    const reasons = (triage.reasons || []).join(" · ") || "추가 확인 필요";

    return (
        <div className={`triage-banner triage-${color}`} style={{ marginTop: 12 }}>
            <div className="triage-title">{label}</div>
            <div className="triage-reasons">{reasons}</div>
            {triage?.tempC != null && (
                <div className="muted">추정 체온: {Number(triage.tempC).toFixed(1)}℃</div>
            )}
        </div>
    );
}

function FollowupsCard({ items = [] }) {
    if (!items.length) return null;
    return (
        <div className="card">
            <h4>추가로 확인하세요</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
                {items.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
        </div>
    );
}

function CitationsList({ items = [] }) {
    if (!items.length) return null;
    return (
        <div className="card" style={{ marginTop: 12 }}>
            <h4>출처</h4>
            <ul className="refs" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
                {items.map((c, i) => (
                    <li key={c.url || c.id || i}>
                        <span className="badge" style={{ marginRight: 8 }}>{badgeOf(c.org, c.url)}</span>
                        <a href={c.url} target="_blank" rel="noreferrer">{c.title || c.url}</a>
                        {typeof c.score === "number" && <span className="org"> · {c.score.toFixed(2)}</span>}
                        {c.snippet && <div className="snippet" style={{ marginTop: 4, color: "#475569" }}>{c.snippet}</div>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ────────────────────────────────────────────── */

function refineFromCitations(res) {
    if (!res) return null;
    const cits = Array.isArray(res.citations) ? res.citations : [];
    const top = cits.slice(0, 3);
    const domainOf = (url = "") => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
    const badge = (c) => (c.org || "").trim() || domainOf(c.url);
    const pick = (i) => (top.length ? top[i % top.length] : null);

    // 신호: 라벨 다듬기
    const signalMap = {
        "발열/고열": "발열(고열 포함)",
        "호흡곤란": "호흡 곤란",
        "의식저하": "의식 저하",
        "경련/강직": "경련 또는 강직",
        "발진/출혈징후": "사라지지 않는 발진/점상출혈",
    };
    const signals = (res.extracted?.signals || []).map(s => signalMap[s] || s);

    // 가설: 근거 한 줄 붙이기
    const hypotheses = (res.hypotheses || []).map((h, i) => {
        const ev = pick(i);
        const whyBits = [];
        if (h.why) whyBits.push(h.why);
        if (ev) whyBits.push(`근거: ${badge(ev)} — ${ev.snippet || ""}`);
        return { ...h, why: whyBits.join(" / ").slice(0, 280) };
    });

    // 대응: 근거 도메인 태그 붙여 가독성↑
    const actions = (res.actions || []).map((a, i) => {
        const ev = pick(i);
        return ev ? `${a}  · 근거: ${badge(ev)}` : a;
    });

    // 추적질문: 기존 + 근거 기반 키워드 감지로 1~2개 보강
    const add = [];
    const textAll = top.map(t => (t.snippet || "") + " " + (t.text || "")).join(" ").toLowerCase();
    if (/유리잔|blanch/i.test(textAll)) add.push("발진에 유리잔 테스트(눌러서 색 변하는지) 해보셨나요?");
    if (/수분|hydration|dehydration|소변/i.test(textAll)) add.push("수분 섭취/소변 횟수는 평소 대비 어떤가요?");
    if (/해열제|acetaminophen|paracetamol|ibuprofen/i.test(textAll)) add.push("해열제(종류/용량/최근 복용시각)는 어떻게 되나요?");
    const followups = Array.from(new Set([...(res.followups || []), ...add])).slice(0, 6);

    return { signals, hypotheses, actions, followups };
}


export default function BehaviorPage() {
    // ===== 뷰 전환: 분석 / 사전 =====
    const [view, setView] = useState("analyze");
    const showDebug = typeof window !== "undefined" && window.location.search.includes("debug=1");

    // ===== (사전) 검색/필터/정렬 =====
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState("전체");
    const [sort, setSort] = useState("가나다");
    const [selected, setSelected] = useState(null);
    

    const allTags = useMemo(() => {
        const set = new Set();
        BEHAVIOR_DATA.forEach((b) => b.tags?.forEach((t) => set.add(t)));
        return ["전체", ...Array.from(set)];
    }, []);

    const filtered = useMemo(() => {
        let list = BEHAVIOR_DATA.filter((b) => {
            const hitTag = activeTag === "전체" || (b.tags || []).includes(activeTag);
            const text = (b.title + b.meaning + b.actions + (b.example || "")).toLowerCase();
            const hitQuery = text.includes(query.trim().toLowerCase());
            return hitTag && hitQuery;
        });
        if (sort === "가나다")
            list = list.slice().sort((a, b) => a.title.localeCompare(b.title, "ko"));
        return list;
    }, [activeTag, query, sort]);

    // ===== (분석) 입력/상태 =====
    const [aiInput, setAiInput] = useState({ ageMonths: "", duration: "", context: "", text: "" });
    const [advanced, setAdvanced] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRes, setAiRes] = useState(null);
    const refined = useMemo(() => refineFromCitations(aiRes), [aiRes]);
    const [aiErr, setAiErr] = useState("");
    const [preNote, setPreNote] = useState("");
    const [preRisk, setPreRisk] = useState(null);

    // ===== (분석) 히스토리 =====
    const [history, setHistory] = useState([]);

    // URL ?q= 프리필
    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const q = sp.get("q");
        if (q) setAiInput((s) => ({ ...s, text: q }));
    }, []);

    // 히스토리 최초 로드
    useEffect(() => { setHistory(loadHistory()); }, []);

    // 입력 변경 시 사전 트리아지
    useEffect(() => {
        const t = parseTempCClient(aiInput.text);
        const age = aiInput.ageMonths === "" ? undefined : Number(aiInput.ageMonths);
        if (t == null) { setPreNote(""); setPreRisk(null); return; }
        const r = riskByAgeTempClient(isNaN(age) ? undefined : age, t);
        setPreRisk(r);
        setPreNote(`체온 감지: ${t}℃${r === "high" ? " · 연령 대비 고열(주의)" : ""}`);
    }, [aiInput.text, aiInput.ageMonths]);

    // ===== (분석) 사전 추천 =====
    function recommendFromDictionary(res) {
        if (!res) return [];
        const needles = new Set([
            ...(res.extracted?.signals ?? []),
            ...((res.hypotheses ?? []).map((h) => h.label) ?? []),
        ]);
        const scored = BEHAVIOR_DATA.map((b) => {
            const tagHit = (b.tags ?? []).reduce((s, t) => s + (needles.has(t) ? 2 : 0), 0);
            const titleHit = [...needles].some((n) => b.title?.includes(n)) ? 1 : 0;
            return { item: b, score: tagHit + titleHit };
        })
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        return scored.map((s) => s.item);
    }

    // 복사 유틸
    async function copyText(t) {
        try { await navigator.clipboard.writeText(t); alert("클립보드에 복사했어요."); }
        catch (e) { alert("복사 실패: " + (e.message || e)); }
    }
    async function copyResultJson() { if (aiRes) await copyText(JSON.stringify(aiRes, null, 2)); }
    async function copySummary() { if (aiRes) await copyText(summarizeResult(aiInput.text, aiRes)); }
    async function copyShareLink() {
        const base = window.location.origin + window.location.pathname;
        const q = encodeURIComponent(aiInput.text || "");
        await copyText(`${base}?q=${q}`);
    }

    // 히스토리 조작
    function pushHistory(item) {
        const items = [item, ...history].slice(0, 10);
        setHistory(items);
        saveHistory(items);
    }
    function removeHistory(id) {
        const items = history.filter((h) => h.id !== id);
        setHistory(items);
        saveHistory(items);
    }
    async function rerunFromHistory(h) {
        setAiInput((s) => ({ ...s, text: h.text }));
        setAiErr(""); setAiRes(null); setAiLoading(true);
        try {
            const data = await analyzeBehavior({ text: h.text });
            setAiRes(data);
            // “다시 분석”은 히스토리에 중복 저장 안 함
        } catch (err) {
            setAiErr(err.message || "분석 중 오류가 발생했습니다.");
        } finally {
            setAiLoading(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }

    // 제출
    async function onAnalyze(e) {
        e.preventDefault();
        setAiErr(""); setAiRes(null);

        if (!aiInput.text.trim()) {
            setAiErr("상태를 한 줄로 적어주세요. (예: “고열 39도, 숨이 가빠보여요”)");
            return;
        }

        setAiLoading(true);
        try {
            const payload = {
                age_months: advanced && aiInput.ageMonths !== "" ? Number(aiInput.ageMonths) : undefined,
                duration: advanced ? (aiInput.duration?.trim() || undefined) : undefined,
                context: advanced ? (aiInput.context?.trim() || undefined) : undefined,
                text: aiInput.text?.trim() || "",
            };
            const data = await analyzeBehavior(payload);
            setAiRes(data);
            pushHistory(toHistoryItem(payload.text, data));
        } catch (err) {
            setAiErr(err.message || "분석 중 오류가 발생했습니다.");
        } finally {
            setAiLoading(false);
        }
    }

    // ===== 렌더 =====
    return (
        <div className="page behaviors layout-fixed">
            {/* 상단 탭 */}
            {/* 상단 탭 */}
            <nav
                className="card"
                style={{
                    position: "sticky",
                    top: 8,
                    zIndex: 5,
                    display: "flex",
                    gap: 8,
                    padding: 8,
                    alignItems: "center",
                    marginBottom: 12,
                    flexWrap: "wrap",
                }}
            >
                <button
                    type="button"
                    className={`tag ${view === "analyze" ? "active" : ""}`}
                    onClick={() => setView("analyze")}
                >
                    ✨ 상황 분석 (홈)
                </button>
                <button
                    type="button"
                    className={`tag ${view === "dictionary" ? "active" : ""}`}
                    onClick={() => setView("dictionary")}
                >
                    📚 행동사전
                </button>
                {showDebug && (
                    <button
                        type="button"
                        className="tag"
                        onClick={async () => {
                            try {
                                const r = await ragReload();
                                alert(r.ok ? `RAG 소스 재로딩 완료 (${r.count ?? "?"}건)` : "RAG 응답 비정상");
                            } catch (e) {
                                alert("RAG 리로드 실패: " + (e.message ?? e));
                            }
                        }}
                        title="RAG 소스 재로딩"
                    >
                        ♻️ RAG 리로드
                    </button>
                )}
            </nav>


            {view === "analyze" ? (
                <>
                    {/* 입력 폼 */}
                    <section className="card" style={{ padding: 16 }}>
                        <h3>AI 행동/건강 분석</h3>
                        <p className="muted" style={{ marginTop: 4 }}>
                            * 의학적 진단이 아니며 참고용 가이드입니다. 위험 신호가 있으면 즉시 진료가 필요합니다.
                        </p>

                        <form
                            onSubmit={onAnalyze}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); } }}
                            style={{ display: "grid", gap: 12, marginTop: 12 }}
                        >
                            <textarea
                                className="input-roomy"
                                rows={5}
                                placeholder='아이 상태를 적어주세요. 예) "고열 39도, 숨이 가빠보여요"'
                                value={aiInput.text}
                                onChange={(e) => setAiInput((s) => ({ ...s, text: e.target.value }))}
                            />


                            {/* 예비 경고 */}
                            {preNote && (
                                <div
                                    className={`pill ${preRisk === "high" ? "danger" : "ok"}`}
                                    style={{ display: "inline-block", marginTop: 6 }}
                                    title="서버 전송 전 클라이언트 예비 경고"
                                >
                                    {preNote}
                                </div>
                            )}

                            {/* 샘플 칩 */}
                            <div className="chips-grid">
                                {SAMPLE_CHIPS.map((c) => (
                                    <button
                                        type="button"
                                        key={c}
                                        className="tag chip-wide"
                                        onClick={() => setAiInput((s) => ({ ...s, text: c }))}
                                        title="예시 입력 적용"
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>


                            {/* 고급 옵션 */}
                            <div>
                                <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                    <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
                                    고급 옵션 (개월수/기간/맥락 추가)
                                </label>
                            </div>

                            {advanced && (
                                <div className="card" style={{ padding: 12, display: "grid", gap: 10, background: "#fafbfd" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
                                        <label>아기 나이(개월)</label>
                                        <input
                                            type="number" min="0" step="1"
                                            value={aiInput.ageMonths}
                                            onChange={(e) => setAiInput((s) => ({ ...s, ageMonths: e.target.value }))}
                                            placeholder="예: 24"
                                        />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
                                        <label>기간/빈도</label>
                                        <input
                                            value={aiInput.duration}
                                            onChange={(e) => setAiInput((s) => ({ ...s, duration: e.target.value }))}
                                            placeholder="예: 2주간, 하루 3~4회"
                                        />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
                                        <label>상황/맥락</label>
                                        <input
                                            value={aiInput.context}
                                            onChange={(e) => setAiInput((s) => ({ ...s, context: e.target.value }))}
                                            placeholder="예: 낯선 장소에서 더 심함"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 액션 버튼들 */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button type="submit" className="btn btn-primary" disabled={aiLoading}>
                                    {aiLoading ? "분석 중..." : "AI로 분석하기"}
                                </button>
                                {!!aiRes && (
                                    <>
                                        <button type="button" className="btn btn-ghost" onClick={copySummary}>요약 복사</button>
                                        <button type="button" className="btn btn-ghost" onClick={copyShareLink}>링크 공유</button>
                                    </>
                                )}
                            </div>

                            {aiLoading && <div className="skeleton" style={{ height: 72 }} />}
                            {aiErr && <div className="alert error">{aiErr}</div>}
                        </form>
                    </section>

                    {/* ✅ 트리아지 경고 배너 (색상/아이콘은 CSS에 정의) */}
                    {aiRes?.triage && <TriageBanner triage={aiRes.triage} />}

                    {/* 결과 카드들 */}
                    {aiRes && (
                        <>
                            <div
                                className="ai-results"
                                style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)" }}
                            >
                                <div className="card">
                                    <h4>감지된 신호</h4>
                                    <p style={{ margin: 0 }}>
                                        {(refined?.signals?.length ? refined.signals : aiRes.extracted?.signals)?.join(", ") || "—"}
                                    </p>
                                </div>

                                <div className="card">
                                    <h4>가능성이 높은 원인</h4>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {(refined?.hypotheses || aiRes.hypotheses || []).map((h, i) => {
                                            const pct = Math.round((h.confidence ?? 0) * 100);
                                            return (
                                                <li key={h.label || i} style={{ marginBottom: 8 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                        <strong>{h.label}</strong>
                                                        <span className="muted">{pct}%</span>
                                                    </div>
                                                    <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                                                    {h.why && <div className="muted" style={{ marginTop: 6 }}>{h.why}</div>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                <div className="card">
                                    <h4>권장 대처</h4>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {(refined?.actions || aiRes.actions || []).map((a, i) => (<li key={i}>{a}</li>))}
                                    </ul>
                                </div>
                            </div>

                            {/* ✅ Followups 별도 카드 */}
                            <div style={{ marginTop: 12 }}>
                                <FollowupsCard items={refined?.followups || aiRes?.followups || []} />
                            </div>

                            {/* ✅ 출처 (도메인 배지 + 스니펫) */}
                            <CitationsList items={aiRes?.citations || []} />

                            {/* 디버그 JSON */}
                            {showDebug && (
                                <pre
                                    style={{
                                        whiteSpace: "pre-wrap", background: "#f4f6fb",
                                        padding: 16, borderRadius: 12, marginTop: 12,
                                    }}
                                >
                                    {JSON.stringify(aiRes, null, 2)}
                                </pre>
                            )}
                        </>
                    )}


                    {/* 분석 히스토리 */}
                    <section className="card" style={{ marginTop: 16 }}>
                        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <h4 style={{ margin: 0 }}>최근 분석(최대 10개)</h4>
                            <button
                                className="btn btn-ghost"
                                disabled={history.length === 0}
                                onClick={() => {
                                    if (history.length === 0) return;
                                    if (!confirm("최근 분석 기록을 모두 삭제할까요?")) return;
                                    setHistory([]); saveHistory([]);
                                }}
                                title="히스토리 비우기"
                            >
                                전체 삭제
                            </button>
                        </header>

                        {history.length === 0 ? (
                            <p className="muted" style={{ marginTop: 8 }}>아직 분석 기록이 없어요.</p>
                        ) : (
                            <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
                                {history.map((h) => (
                                    <li key={h.id} className="card" style={{ padding: 12 }}>
                                        <div style={{ display: "grid", gap: 8 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                                <div>
                                                    <strong>{fmt(h.ts)}</strong>
                                                    <span className={`pill ${h.risk === "high" ? "danger" : "ok"}`} style={{ marginLeft: 8 }}>
                                                        {h.risk.toUpperCase()}
                                                    </span>
                                                    {h.alerts?.length ? (
                                                        <span className="muted" style={{ marginLeft: 8 }}>
                                                            신호: {h.alerts.join(", ")}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button type="button" className="tag" onClick={() => rerunFromHistory(h)}>다시 분석</button>
                                                    <button type="button" className="tag" onClick={() => copyText(summarizeResult(h.text, h.res))}>요약 복사</button>
                                                    <button
                                                        type="button" className="tag"
                                                        onClick={() => { if (confirm("이 기록을 삭제할까요?")) removeHistory(h.id); }}
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="muted" style={{ wordBreak: "break-word" }}>입력: {h.text}</div>
                                            {h.hyps?.length ? (<div className="muted">가설: {h.hyps.slice(0, 3).join(", ")}</div>) : null}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* 추천 카드 모달 */}
                    {selected && (
                        <div className="modal-backdrop" onClick={() => setSelected(null)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <header>
                                    <h3>{selected.title}</h3>
                                    <button type="button" className="icon" onClick={() => setSelected(null)}>✕</button>
                                </header>
                                <div className="modal-body">
                                    <p>🧠 <strong>의미/원인</strong> — {selected.meaning}</p>
                                    <p>🛠️ <strong>대응 방법</strong> — {selected.actions}</p>
                                    {selected.example && <p>🏠 <strong>일상 예시</strong> — {selected.example}</p>}
                                    <div className="pill-row">
                                        {selected.tags?.map((t) => (<span key={t} className="pill">#{t}</span>))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // ===== 행동사전 뷰 =====
                <>
                    <h2 className="page-title">행동사전</h2>

                    <div className="behavior-toolbar">
                        <div className="search">
                            <input placeholder="검색 (제목/키워드)" value={query} onChange={(e) => setQuery(e.target.value)} />
                        </div>
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option>가나다</option>
                        </select>
                    </div>

                    <div className="tags" style={{ marginBottom: 12 }}>
                        {allTags.map((t) => (
                            <button
                                type="button" key={t}
                                className={`tag ${activeTag === t ? "active" : ""}`}
                                onClick={() => setActiveTag(t)}
                            >
                                #{t}
                            </button>
                        ))}
                    </div>

                    <div className="behavior-grid">
                        {filtered.map((b) => (
                            <article key={b.id} className="behavior-card" onClick={() => setSelected(b)}>
                                <h4>{b.title}</h4>
                                <p>🧠 <strong>의미/원인</strong> — {b.meaning}</p>
                                <p>🛠️ <strong>대응</strong> — {b.actions}</p>
                                {b.example && <p>🏠 <strong>예시</strong> — {b.example}</p>}
                                <div className="pill-row">
                                    {b.tags?.map((t) => (<span key={t} className="pill">#{t}</span>))}
                                </div>
                            </article>
                        ))}
                        {filtered.length === 0 && <div className="empty">검색 결과가 없어요.</div>}
                    </div>

                    {/* 사전 상세 모달 */}
                    {selected && (
                        <div className="modal-backdrop" onClick={() => setSelected(null)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <header>
                                    <h3>{selected.title}</h3>
                                    <button type="button" className="icon" onClick={() => setSelected(null)}>✕</button>
                                </header>
                                <div className="modal-body">
                                    <p>🧠 <strong>의미/원인</strong> — {selected.meaning}</p>
                                    <p>🛠️ <strong>대응 방법</strong> — {selected.actions}</p>
                                    {selected.example && <p>🏠 <strong>일상 예시</strong> — {selected.example}</p>}
                                    <div className="pill-row">
                                        {selected.tags?.map((t) => (<span key={t} className="pill">#{t}</span>))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
