import { useEffect } from "react";
import "./Modal.css";

export default function Modal({ open, onClose, children, title = "새 글 작성" }) {
    useEffect(() => {
        function onKey(e) { if (e.key === "Escape") onClose?.(); }
        if (open) { document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; }
        return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="btn ghost sm" onClick={onClose}>닫기</button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}
