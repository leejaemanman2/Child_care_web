export default function Tag({ children }) {
    return (
        <em style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 9999,
            background: "#f1f5f9", fontStyle: "normal", fontSize: 12, marginRight: 6
        }}>
            #{children}
        </em>
    );
}
