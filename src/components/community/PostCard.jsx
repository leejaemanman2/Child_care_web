export default function PostCard({ post, onOpen }) {
    const handleKey = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.(post);
        }
    };

    return (
        <div
            className={`card post-card clickable ${post.isExpert ? "expert" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen?.(post)}
            onKeyDown={handleKey}
            aria-label={`${post.title} 자세히 보기`}
        >
            {/* 전문가 배지 + 제목 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {post.isExpert && <span className="expert-badge">🧑‍⚕️ 전문가</span>}
                <div className="title">{post.title}</div>
            </div>

            {/* 날짜 · 조회 · 추천 */}
            <div className="meta">
                {post.date} · 조회 {post.views} · 추천 {post.likes}
            </div>

            {/* 태그 */}
            <div className="badges">
                {(post.tags || []).map((t) => (
                    <span className="badge" key={t}>
                        {t}
                    </span>
                ))}
            </div>
        </div>
    );
}
