import { Link } from "react-router-dom";
import { Tag } from "./";

export default function QuestionCard({ item }) {
    return (
        <li className="q-card">
            <h3 className="q-title">
                <Link to={`/questions/${item.id}`}>{item.title}</Link>
            </h3>
            <p className="q-body">{item.body}</p>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(item.tags || []).map(t => (
                    <span key={t} className="muted" style={{
                        border: "1px solid var(--line)", padding: "2px 8px", borderRadius: 999
                    }}>
                        #{t}
                    </span>
                ))}
            </div>
        </li>
    );
}