// server/rag/cache.js
export function makeLru({ max = 100, ttlMs = 60 * 60 * 1000 } = {}) {
    const map = new Map(); // key -> { value, ts }
    return {
        get(key) {
            const v = map.get(key);
            if (!v) return null;
            if (Date.now() - v.ts > ttlMs) { map.delete(key); return null; }
            map.delete(key); map.set(key, v); // bump
            return v.value;
        },
        set(key, value) {
            map.set(key, { value, ts: Date.now() });
            if (map.size > max) {
                const k0 = map.keys().next().value;
                map.delete(k0);
            }
        },
        size() { return map.size; }
    };
}
