export default function ExpertCard({ expert }) {
    return (
        <li className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontWeight: 700 }}>{expert.name} · <span className="muted">{expert.specialty}</span></div>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{expert.bio}</p>
                </div>
                <button className="btn success" onClick={() => alert("연락요청(추후 구현)")}>연락하기</button>
            </div>
            <div style={{ marginTop: 8 }} className="muted">⭐ {expert.rating?.toFixed?.(1) ?? expert.rating}</div>
        </li>
    );
}
