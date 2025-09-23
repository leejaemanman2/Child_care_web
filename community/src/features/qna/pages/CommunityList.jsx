import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getQuestions } from "../api";
import { QuestionCard } from "../components";
import "../qna.css";

export default function CommunityList() {
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState([]);
    const [search, setSearch] = useState("");
    const [tag, setTag] = useState("");
    const [sort, setSort] = useState("recent");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        (async () => {
            const data = await getQuestions();
            setQ(data); setLoading(false);
        })();
    }, []);

    const tags = useMemo(() => {
        const s = new Set();
        q.forEach(it => it.tags?.forEach(t => s.add(t)));
        return Array.from(s);
    }, [q]);

    const filtered = useMemo(() => {
        let arr = q;
        if (search.trim()) {
            const s = search.toLowerCase();
            arr = arr.filter(it =>
                it.title.toLowerCase().includes(s) || it.body.toLowerCase().includes(s)
            );
        }
        if (tag) arr = arr.filter(it => it.tags?.includes(tag));
        if (sort === "votes") arr = [...arr].sort((a, b) => (b.votes || 0) - (a.votes || 0));
        else if (sort === "views") arr = [...arr].sort((a, b) => (b.views || 0) - (a.views || 0));
        else arr = [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return arr;
    }, [q, search, tag, sort]);

    const start = (page - 1) * pageSize;
    const view = filtered.slice(start, start + pageSize);

    if (loading) return <div className="qna-wrap">불러오는 중…</div>;

    return (
        <div className="container">
            <h2 className="section-title">커뮤니티 & QnA</h2>

            <div className="toolbar">
                <input className="input" placeholder="검색(제목/본문)" value={search}
                    onChange={e => { setPage(1); setSearch(e.target.value); }} />
                <select className="select" value={tag} onChange={e => { setPage(1); setTag(e.target.value); }}>
                    <option value="">전체 태그</option>
                    {tags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="recent">최신순</option><option value="votes">추천순</option><option value="views">조회순</option>
                </select>
                <Link className="btn" to="/ask">질문하기</Link>
                <Link className="btn ghost" to="/experts">전문가</Link>
            </div>

            <ul className="grid" style={{ listStyle: "none", padding: 0 }}>
                {view.map(it => <QuestionCard key={it.id} item={it} />)}
            </ul>

            {/* 기존 Pagination 컴포넌트 그대로 사용해도 되고 버튼들에 .btn 적용만 해줘도 OK */}
        </div>
    );
}