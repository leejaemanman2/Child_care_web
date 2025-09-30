const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

export async function analyzeBehavior(payload) {
    const res = await fetch(`${BASE}/api/analyze-behavior`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    // 상태코드별 사용자 메시지
    if (!res.ok) {
        if (res.status === 429) {
            throw new Error("요청이 많습니다. 잠시 후 다시 시도해주세요.");
        }
        let body = {};
        try {
            body = await res.json();
        } catch (_) { }
        throw new Error(body.message || "분석 중 문제가 발생했습니다.");
    }

    return res.json();
}

export async function ragReload() {
    const res = await fetch(`${BASE}/rag/reload`, { method: "POST" });
    if (!res.ok) throw new Error("rag reload 실패");
    return res.json();
}
