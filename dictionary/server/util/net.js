// server/util/net.js
export async function fetchJson(url, { method = "GET", headers = {}, body, timeoutMs = 6000 } = {}) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const r = await fetch(url, {
            method,
            headers: { "User-Agent": "behavior-api/1.0", ...headers },
            body,
            signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("json")) return await r.text();
        return await r.json();
    } finally {
        clearTimeout(id);
    }
}
