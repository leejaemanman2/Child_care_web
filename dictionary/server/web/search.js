import express from "express";
import { searchSerp } from "../rag/providers/serp.js";
import crypto from "crypto";
import { makeLru } from "../rag/cache.js";

const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const TTL = Number(process.env.WEB_TTL_MIN || 1440) * 60 * 1000;
const router = express.Router();
const cache = makeLru({ max: 200, ttlMs: TTL });

const WEIGHTS = {
    "nhs.uk": 0.25, "aap.org": 0.25, "healthychildren.org": 0.25,
    "who.int": 0.2, "unicef.org": 0.15, "cdc.gov": 0.15, "uptodate.com": 0.2,
    "jmj.or.kr": 0.15, "pediatrics.or.kr": 0.15,
};

const host = (u = "") => {
    try { return new URL(u).hostname.replace(/^www\./, ""); }
    catch { return ""; }
};

function rerank(query, items = []) {
    const H = Object.fromEntries(items.map((d, i) => [`${d.url}`, i]));
    return items
        .map(d => {
            let s = d.score ?? 0.5;
            const h = host(d.url);
            if (WEIGHTS[h]) s += WEIGHTS[h];
            if (d.year && d.year >= (new Date().getFullYear() - 3)) s += 0.05;
            return { ...d, score: s };
        })
        .sort((a, b) => (b.score - a.score) || (H[a.url] - H[b.url]));
}

router.get("/search", async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const n = Math.max(1, Math.min(6, Number(req.query.n || 3)));
        if (!q) return res.status(400).json({ ok: false, error: "missing q" });

        const key = crypto.createHash("md5").update(q + "::" + n).digest("hex");
        const cached = cache.get(key);
        if (cached) return res.json({ ok: true, q, n, results: cached });

        const raw = await searchSerp(q, Math.max(6, n + 3));
        const m = new Map();
        for (const d of raw) {
            const k = d.url?.split("#")[0];
            if (!k) continue;
            if (!m.has(k) || (d.score ?? 0) > (m.get(k).score ?? 0)) m.set(k, d);
        }

        const ranked = rerank(q, Array.from(m.values()))
            .slice(0, n)
            .map(d => ({ ...d, sourceType: "web" }));

        cache.set(key, ranked);
        return res.json({ ok: true, q, n, results: ranked });
    } catch (e) {
        console.error("[web/search] error:", e);
        return res.status(500).json({ ok: false, error: e.message });
    }
});

router.get("/stats", (_req, res) => {
    res.json({ ok: true, cacheSize: cache.size(), ttlMin: TTL / 60000 });
});

export default router;

export async function searchWebTopN(q, n = 3) {
    if (!SERPAPI_KEY || process.env.WEB_SEARCH !== "1") return [];
    const params = new URLSearchParams({
        engine: "google",
        q,
        hl: "ko",
        num: String(n),
        api_key: SERPAPI_KEY,
    });
    const url = `https://serpapi.com/search.json?${params.toString()}`;

    const r = await fetch(url);
    if (!r.ok) return [];

    const json = await r.json();
    return (json.organic_results || [])
        .slice(0, n)
        .map((it, i) => ({
            id: `web-${i}`,
            title: it.title || "",
            url: it.link || "",
            org: (it.source || it.displayed_link || "").replace(/^https?:\/\//, ""),
            score: 0.7 - i * 0.05,
            snippet: it.snippet || "",
            text: it.snippet || "",
            source: "web",
        }));
}

export function webStats() {
    return { ok: true, engine: "serpapi", enabled: process.env.WEB_SEARCH === "1" };
}
