// import fetch from "node-fetch";  // ❌ 삭제 (Node 18+면 전역 fetch 사용)
import { fetchJson } from "../../util/net.js";

export async function searchPubMed(query, max = 5) {
    const params = new URLSearchParams({
        db: "pubmed",
        term: `${query} AND (child OR infant OR pediatric)`,
        retmode: "json",
        retmax: String(max),
        sort: "relevance",
    });
    const esJson = await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`);
    const ids = esJson?.esearchresult?.idlist ?? [];
    if (!ids.length) return [];
    const sumParams = new URLSearchParams({ db: "pubmed", id: ids.join(","), retmode: "json" });
    const sumJson = await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${sumParams}`);
    const result = [];
    for (const id of ids) {
        const r = sumJson?.result?.[id];
        if (!r) continue;
        result.push({
            id: `pubmed-${id}`,
            title: r.title,
            org: r.fulljournalname || "PubMed",
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            year: Number((r.pubdate || "").slice(0, 4)) || undefined,
            score: 0.7,
            snippet: r.elocationid || r.source || "",
            sourceType: "pubmed",
        });
    }
    return result;
}
