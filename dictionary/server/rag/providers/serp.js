// import fetch from "node-fetch"; // ❌ 삭제
import { fetchJson } from "../../util/net.js";

const ALLOWED = new Set((process.env.RAG_ALLOWED_DOMAINS || "")
    .split(",").map(s => s.trim()).filter(Boolean));

export async function searchSerp(query, max = 5) {
    const key = process.env.SERPAPI_KEY;
    if (!key) return [];
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google");
    u.searchParams.set("q", query);
    u.searchParams.set("num", String(max));
    u.searchParams.set("api_key", key);

    const j = await fetchJson(u.toString(), { timeoutMs: 6000 });
    const items = (j.organic_results || []).map((o, i) => {
        const host = (() => { try { return new URL(o.link).hostname.replace(/^www\./, ""); } catch { return ""; } })();
        if (ALLOWED.size && !Array.from(ALLOWED).some(d => host.endsWith(d))) return null;
        return {
            id: `serp-${i}-${host}`,
            title: o.title,
            org: host,
            url: o.link,
            year: undefined,
            score: 0.6 - i * 0.02,
            snippet: o.snippet || "",
            sourceType: "web",
        };
    }).filter(Boolean);
    return items.slice(0, max);
}
