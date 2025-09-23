import { useEffect, useMemo, useState } from "react";
import { getExperts } from "../api";
import { ExpertCard } from "../components";
import "../qna.css";

export default function Experts() {
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState([]);

    // UI 상태
    const [search, setSearch] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [sort, setSort] = useState("rating"); // rating | name
    const [page, setPage] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        (async () => {
            const data = await getExperts();
            setList(data || []);
            setLoading(false);
        })();
    }, []);

    const specialties = useMemo(() => {
        return Array.from(new Set(list.map(e => e.specialty).filter(Boolean)));
    }, [list]);

    const filtered = useMemo(() => {
        let arr = list;
        if (search.trim()) {
            const s = search.toLowerCase();
            arr = arr.filter(e =>
                e.name.toLowerCase().includes(s) ||
                e.bio?.toLowerCase().includes(s) ||
                e.specialty?.toLowerCase().includes(s)
            );
        }
        if (specialty) arr = arr.filter(e => e.specialty === specialty);

        if (sort === "rating") arr = [...arr].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        else if (sort === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));

        return arr;
    }, [list, search, specialty, sort]);

    const start = (page - 1) * pageSize;
    const view = filtered.slice(start, start + pageSize);

    if (loading) return <div className="qna-wrap">불러오는 중…</div>;

    return (
        <div className="container">
            <h2 className="section-title">전문가 QnA</h2>

            <div className="toolbar">
                <input className="input" placeholder="전문가/전문분야/소개 검색" value={search}
                    onChange={e => { setPage(1); setSearch(e.target.value); }} />
                <select className="select" value={specialty} onChange={e => { setPage(1); setSpecialty(e.target.value); }}>
                    <option value="">전체 분야</option>
                    {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                </select>
                <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="rating">평점순</option><option value="name">이름순</option>
                </select>
            </div>

            <ul className="grid auto" style={{ listStyle: "none", padding: 0 }}>
                {view.map(ex => <ExpertCard key={ex.id} expert={ex} />)}
            </ul>

            {/* 페이지네이션 버튼도 .btn/.ghost 조합으로 스타일 통일 */}
        </div>
    );
}