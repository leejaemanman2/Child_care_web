// import fetch from "node-fetch"; // ❌ 삭제
import { fetchJson } from "../util/net.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function summarizeToSchema({ userInput, age_months, duration, context, docs }) {
    // ... (프롬프트 동일)
    const body = {
        model: MODEL,
        temperature: 0.2,
        messages: [
            { role: "system", content: `당신은 소아(0~6세) ... JSON으로만 답합니다 ...` },
            {
                role: "user", content: /* 기존 user 블록 그대로 */ `
사용자 서술:
${userInput}
${age_months ? `- 나이(개월): ${age_months}` : ""}${duration ? `\n- 기간/빈도: ${duration}` : ""}${context ? `\n- 맥락: ${context}` : ""}

참고 문헌 후보:
${docs.map((d, i) => `[${i + 1}] ${d.title} · ${d.org}\n${d.url}\n요약: ${d.snippet || ""}`).join("\n\n")}
` }
        ],
        response_format: { type: "json_object" }
    };

    const j = await fetchJson(OPENAI_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 8000, // LLM은 조금 더 길게
    });
    const raw = j?.choices?.[0]?.message?.content ?? "{}";
    try { return JSON.parse(raw); } catch { return null; }
}
