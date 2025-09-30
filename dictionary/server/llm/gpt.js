// server/llm/gpt.js
import "dotenv/config";
import OpenAI from "openai";
import { z } from "zod";

const LlmOut = z.object({
    hypotheses: z.array(z.object({
        label: z.string(),
        confidence: z.number().min(0).max(1),
        why: z.string().optional(),
    })).min(1).max(5),
    actions: z.array(z.string()).min(1).max(8),
    disclaimer: z.string().optional(),
});

function getOpenAI() {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error("OPENAI_API_KEY not set");
    return new OpenAI({ apiKey: key });
}

// 백틱/코드펜스 제거 + 첫 번째 JSON 객체 추출
function extractJson(str = "") {
    const cleaned = String(str).replace(/```json|```/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) throw new Error("No JSON object found");
    return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generatePlan({ input, ageMonths, signals, alerts, context }) {
    const openai = getOpenAI();

    const prompt = [
        `사용자 서술: ${input}`,
        `나이(개월): ${ageMonths ?? "-"}`,
        `추출 신호: ${signals?.join(", ") || "-"}`,
        `위험 라벨: ${alerts?.join(", ") || "-"}`,
        `근거 컨텍스트(상위 RAG 3건):`,
        context,
        ``,
        `요구사항:`,
        `- 소아(0–6세) 기준으로 가설/권장대응을 작성.`,
        `- 반드시 JSON만 반환. 키: hypotheses[{label,confidence,why}], actions[], disclaimer`,
        `- confidence는 0~1 실수.`,
    ].join("\n");

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // 1차 시도
    const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
            { role: "system", content: "당신은 근거기반의 소아 트리아지/상담 보조 모델입니다. 주어진 컨텍스트 안에서만 답하세요. 출력은 JSON만." },
            { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
    });

    try {
        const raw = resp.choices?.[0]?.message?.content ?? "{}";
        const data = LlmOut.parse(extractJson(raw));
        return data;
    } catch (e1) {
        // 2차 재시도(더 엄격한 지시)
        const r2 = await openai.chat.completions.create({
            model,
            temperature: 0,
            messages: [
                { role: "system", content: "JSON만 출력. {\"hypotheses\":[],\"actions\":[],\"disclaimer\":\"...\"}" },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
        });
        const raw2 = r2.choices?.[0]?.message?.content ?? "{}";
        try {
            const data2 = LlmOut.parse(extractJson(raw2));
            return data2;
        } catch (e2) {
            throw new Error("LLM JSON parse failed");
        }
    }
}
