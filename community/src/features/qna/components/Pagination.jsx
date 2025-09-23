export default function Pagination({ total = 0, page = 1, pageSize = 10, onChange }) {
    const last = Math.max(1, Math.ceil(total / pageSize));
    return (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "16px 0" }}>
            {Array.from({ length: last }, (_, i) => i + 1).map(n => (
                <button
                    key={n}
                    onClick={() => onChange?.(n)}
                    style={{
                        padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb",
                        background: n === page ? "#2563eb" : "white",
                        color: n === page ? "#fff" : "#0f172a", cursor: "pointer"
                    }}
                >
                    {n}
                </button>
            ))}
        </div>
    );
}
