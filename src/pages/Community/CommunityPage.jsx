import { useEffect, useMemo, useState } from "react";
import "../../styles/tokens.css";
import "../../styles/ui.css";
import "../../styles/community.css";

import SearchBar from "../../components/community/SearchBar";
import FilterTabs from "../../components/community/FilterTabs";
import PostCard from "../../components/community/PostCard";
import Pagination from "../../components/community/Pagination";
import Modal from "../../components/Modal";
import QuestionForm from "../../components/community/QuestionForm";

const PAGE_SIZE = 10;
const STORAGE_POSTS = "community_posts_v1";
const STORAGE_COMMENTS = "community_comments_v1";

const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const MM = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
};

function makeDate(dayOffset = 0, h = 9, m = 0) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    d.setHours(h);
    d.setMinutes(m);
    return fmt(d);
}

export default function CommunityPage() {
    // 작성 모달
    const [openCreate, setOpenCreate] = useState(false);
    const [expertMode, setExpertMode] = useState(false);

    // 상세/수정 모달
    const [openView, setOpenView] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);

    const [selected, setSelected] = useState(null);

    // 목록 제어
    const [order, setOrder] = useState("latest");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    // 댓글
    const [comments, setComments] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_COMMENTS);
            if (raw) return JSON.parse(raw);
        } catch { }
        return {};
    });
    const [commentDraft, setCommentDraft] = useState("");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentDraft, setEditingCommentDraft] = useState("");

    // 초기 더미 22개
    const seed = [
        {
            id: 1,
            title: "이유식 초기 재료 추천 부탁드려요",
            date: "2025-09-21 11:10",
            views: 17,
            likes: 1,
            tags: ["#이유식", "#초기", "#엄마일기"],
            content:
                "아기 첫 이유식을 시작하려고 합니다. 알레르기 고려해서 어떤 재료부터 시작하면 좋을까요? 초보라 팁도 부탁드려요!",
            isExpert: false,
        },
        {
            id: 2,
            title: "아기 수면 훈련 언제 시작하나요?",
            date: "2025-09-20 21:30",
            views: 42,
            likes: 3,
            tags: ["#수면", "#5개월", "#루틴"],
            content:
                "5개월 아기인데 낮잠 시간이 들쭉날쭉해요. 수면 훈련은 몇 개월부터 시작하는 게 적당한가요?",
            isExpert: false,
        },
    ];
    const extra = Array.from({ length: 20 }, (_, i) => {
        const n = i + 1;
        const isMeal = i % 2 === 0;
        return {
            id: i + 3,
            title: isMeal ? `초기 이유식 레시피 아이디어 ${n}` : `아기 수면 루틴 잡는 팁 ${n}`,
            date: makeDate(i + 1, 9 + (i % 8), (i * 3) % 60),
            views: 20 + i * 3,
            likes: i % 5,
            tags: isMeal ? ["#이유식", "#초기"] : ["#수면", "#루틴"],
            content: isMeal
                ? "처음 2주 동안은 쌀미음으로 시작하고, 단일 식재료를 하루에 하나씩 시도해요. 묽기는 아기 상태를 보며 점차 조절!"
                : "기상·낮잠·취침 시간을 먼저 고정하고, 환경(빛/소리/온도)을 안정화하세요. 신호-반응 루틴을 반복하는 게 핵심.",
            isExpert: false,
        };
    });
    const DEFAULT_POSTS = useMemo(() => [...seed, ...extra], []);

    // 글 목록 (로컬스토리지)
    const [posts, setPosts] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_POSTS);
            if (raw) return JSON.parse(raw);
        } catch { }
        return DEFAULT_POSTS;
    });
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_POSTS, JSON.stringify(posts));
        } catch { }
    }, [posts]);

    // 댓글 저장
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(comments));
        } catch { }
    }, [comments]);

    // 검색/정렬/페이지
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return posts;
        return posts.filter((p) => {
            const inTitle = p.title.toLowerCase().includes(q);
            const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
            return inTitle || inTags;
        });
    }, [posts, query]);
    const ordered = filtered; // 추후 정렬 확장

    const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
    useEffect(() => {
        setPage(1);
    }, [query, order]);

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = ordered.slice(start, start + PAGE_SIZE);

    const handlePrev = () => setPage((p) => Math.max(1, p - 1));
    const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
    const handlePage = (n) => setPage(n);

    // 상세 보기
    const openPost = (post) => {
        setSelected(post);
        setCommentDraft("");
        setEditingCommentId(null);
        setOpenView(true);
    };

    // 글 작성 완료 → 최상단
    function handleCreate(formData) {
        const now = new Date();
        const tags =
            Array.isArray(formData.tags)
                ? formData.tags
                : String(formData.tags || "")
                    .split(/[,\s]+/)
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (t.startsWith("#") ? t : `#${t}`));

        const newPost = {
            id: Date.now(),
            title: (formData.title || "").trim() || "(제목 없음)",
            date: fmt(now),
            views: 0,
            likes: 0,
            tags,
            content: String(formData.content || ""),
            isExpert: expertMode,
        };

        setPosts((prev) => [newPost, ...prev]);
        setOpenCreate(false);
        setExpertMode(false);
        setPage(1);
    }

    // 글 수정 시작 (수정 모달 오픈)
    const [editDraft, setEditDraft] = useState({ title: "", tags: "", content: "", isExpert: false });
    const startEdit = () => {
        if (!selected) return;
        setEditDraft({
            title: selected.title,
            tags: (selected.tags || []).join(" "),
            content: selected.content || "",
            isExpert: !!selected.isExpert,
        });
        setOpenEdit(true);
    };

    // 글 수정 저장
    const saveEdit = (e) => {
        e.preventDefault();
        if (!selected) return;
        const tags = String(editDraft.tags || "")
            .split(/[,\s]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (t.startsWith("#") ? t : `#${t}`));

        setPosts((prev) =>
            prev.map((p) =>
                p.id === selected.id
                    ? { ...p, title: editDraft.title || "(제목 없음)", tags, content: editDraft.content, isExpert: !!editDraft.isExpert }
                    : p
            )
        );
        // 선택된 객체도 즉시 갱신
        setSelected((prev) =>
            prev
                ? {
                    ...prev,
                    title: editDraft.title || "(제목 없음)",
                    tags,
                    content: editDraft.content,
                    isExpert: !!editDraft.isExpert,
                }
                : prev
        );
        setOpenEdit(false);
    };

    // 글 삭제
    const deletePost = () => {
        if (!selected) return;
        if (!confirm("이 글을 삭제하시겠어요?")) return;
        setPosts((prev) => prev.filter((p) => p.id !== selected.id));
        setComments((prev) => {
            const cp = { ...prev };
            delete cp[selected.id];
            return cp;
        });
        setOpenView(false);
        setSelected(null);
    };

    // 댓글 등록
    const submitComment = (e) => {
        e.preventDefault();
        const txt = commentDraft.trim();
        if (!selected || !txt) return;
        setComments((prev) => {
            const list = prev[selected.id] || [];
            return {
                ...prev,
                [selected.id]: [...list, { id: Date.now(), text: txt, date: fmt(new Date()) }],
            };
        });
        setCommentDraft("");
    };

    // 댓글 수정/삭제
    const beginEditComment = (c) => {
        setEditingCommentId(c.id);
        setEditingCommentDraft(c.text);
    };
    const cancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentDraft("");
    };
    const saveEditComment = (id) => {
        if (!selected) return;
        const text = editingCommentDraft.trim();
        if (!text) return;
        setComments((prev) => {
            const list = prev[selected.id] || [];
            return {
                ...prev,
                [selected.id]: list.map((c) => (c.id === id ? { ...c, text } : c)),
            };
        });
        cancelEditComment();
    };
    const deleteComment = (id) => {
        if (!selected) return;
        if (!confirm("댓글을 삭제할까요?")) return;
        setComments((prev) => {
            const list = prev[selected.id] || [];
            return {
                ...prev,
                [selected.id]: list.filter((c) => c.id !== id),
            };
        });
    };

    const commentsOfSelected = selected ? comments[selected.id] || [] : [];

    return (
        <main className="main-offset">
            <div className="container community-wrap">
                {/* 상단 패널 */}
                <div className="panel pad section">
                    <div className="community-header">
                        <div className="community-title">커뮤니티 &amp; QnA</div>
                        <div className="actions">
                            <button
                                className="btn outline pill"
                                onClick={() => {
                                    setExpertMode(false);
                                    setOpenCreate(true);
                                }}
                            >
                                질문하기
                            </button>
                            <button
                                className="btn pill"
                                onClick={() => {
                                    setExpertMode(true);
                                    setOpenCreate(true);
                                }}
                            >
                                전문가
                            </button>
                        </div>
                    </div>

                    <div className="toolbar">
                        <SearchBar value={query} onChange={setQuery} />
                        <button className="tab">전체</button>
                        <div className="tab-group">
                            <FilterTabs value={order} onChange={setOrder} />
                        </div>
                    </div>
                </div>

                {/* 목록 */}
                {pageItems.length === 0 ? (
                    <div className="panel pad" style={{ textAlign: "center", color: "var(--muted)" }}>
                        검색 결과가 없습니다.
                    </div>
                ) : (
                    <div className="grid-2">
                        {pageItems.map((p) => (
                            <PostCard key={p.id} post={p} onOpen={openPost} />
                        ))}
                    </div>
                )}

                {/* 페이지네이션 */}
                <Pagination
                    total={totalPages}
                    page={page}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onPage={handlePage}
                />

                {/* 작성 모달 */}
                <Modal
                    open={openCreate}
                    onClose={() => {
                        setOpenCreate(false);
                        setExpertMode(false);
                    }}
                    title={expertMode ? "전문가 글 작성" : "질문 작성"}
                >
                    <QuestionForm
                        mode={expertMode ? "expert" : "user"}
                        onSubmit={handleCreate}
                        onCancel={() => {
                            setOpenCreate(false);
                            setExpertMode(false);
                        }}
                    />
                </Modal>

                {/* 상세 보기 모달 */}
                <Modal
                    open={openView}
                    onClose={() => setOpenView(false)}
                    title={selected ? selected.title : "질문 상세"}
                >
                    {selected && (
                        <div>
                            {/* 상단 액션 */}
                            <div className="detail-actions">
                                <button className="btn outline sm" onClick={startEdit}>
                                    수정
                                </button>
                                <button className="btn ghost sm" onClick={deletePost}>
                                    삭제
                                </button>
                            </div>

                            {selected.isExpert && <span className="expert-badge">🧑‍⚕️ 전문가</span>}

                            <div className="meta" style={{ margin: "8px 0 12px" }}>
                                {selected.date} · 조회 {selected.views} · 추천 {selected.likes}
                            </div>

                            <div className="badges" style={{ marginBottom: 12 }}>
                                {(selected.tags || []).map((t) => (
                                    <span className="badge" key={t}>
                                        {t}
                                    </span>
                                ))}
                            </div>

                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 16 }}>
                                {selected.content}
                            </div>

                            {/* 댓글 */}
                            <div className="comments">
                                <div className="comments-header">댓글 {commentsOfSelected.length}</div>

                                <ul className="comment-list">
                                    {commentsOfSelected.map((c) => (
                                        <li key={c.id} className="comment-item">
                                            {editingCommentId === c.id ? (
                                                <>
                                                    <textarea
                                                        className="textarea"
                                                        value={editingCommentDraft}
                                                        onChange={(e) => setEditingCommentDraft(e.target.value)}
                                                    />
                                                    <div className="row-right">
                                                        <button className="btn sm pill" onClick={() => saveEditComment(c.id)}>
                                                            저장
                                                        </button>
                                                        <button className="btn outline sm pill" onClick={cancelEditComment}>
                                                            취소
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="comment-text">{c.text}</div>
                                                    <div className="comment-meta">{c.date}</div>
                                                    <div className="row-right gap8">
                                                        <button className="btn outline sm" onClick={() => beginEditComment(c)}>
                                                            수정
                                                        </button>
                                                        <button className="btn ghost sm" onClick={() => deleteComment(c.id)}>
                                                            삭제
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                    {commentsOfSelected.length === 0 && (
                                        <li className="comment-empty">첫 댓글을 남겨보세요.</li>
                                    )}
                                </ul>

                                <form className="comment-form" onSubmit={submitComment}>
                                    <textarea
                                        className="textarea"
                                        placeholder="댓글을 입력하세요"
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                    />
                                    <div className="comment-actions">
                                        <button type="submit" className="btn pill">
                                            등록
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* 글 수정 모달 */}
                <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="글 수정">
                    <form className="edit-form" onSubmit={saveEdit}>
                        <label className="label">제목</label>
                        <input
                            className="input"
                            value={editDraft.title}
                            onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                            placeholder="제목을 입력하세요"
                        />

                        <label className="label">태그</label>
                        <input
                            className="input"
                            value={editDraft.tags}
                            onChange={(e) => setEditDraft((d) => ({ ...d, tags: e.target.value }))}
                            placeholder="#태그1 #태그2 또는 공백/쉼표 구분"
                        />

                        <label className="label">내용</label>
                        <textarea
                            className="textarea"
                            value={editDraft.content}
                            onChange={(e) => setEditDraft((d) => ({ ...d, content: e.target.value }))}
                            placeholder="내용을 입력하세요"
                        />

                        <label className="row-left" style={{ gap: 8 }}>
                            <input
                                type="checkbox"
                                checked={editDraft.isExpert}
                                onChange={(e) => setEditDraft((d) => ({ ...d, isExpert: e.target.checked }))}
                            />
                            전문가 글로 표시
                        </label>

                        <div className="row-right">
                            <button type="submit" className="btn pill">
                                저장
                            </button>
                            <button type="button" className="btn outline pill" onClick={() => setOpenEdit(false)}>
                                취소
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </main>
    );
}
