export default function Pagination({ total = 1, page = 1, onPrev, onNext, onPage }) {
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    const isFirst = page <= 1;
    const isLast = page >= total;

    return (
        <div className="pagination">
            <button className="page-btn" onClick={onPrev} disabled={isFirst}>
                이전
            </button>

            {pages.map((n) => (
                <button
                    key={n}
                    className={`page-btn ${n === page ? "current" : ""}`}
                    onClick={() => onPage?.(n)}
                    disabled={n === page}
                >
                    {n}
                </button>
            ))}

            <button className="page-btn" onClick={onNext} disabled={isLast}>
                다음
            </button>
        </div>
    );
}
