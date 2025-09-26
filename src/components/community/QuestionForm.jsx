import { useState } from "react";

export default function QuestionForm({ onSubmit, onCancel }) {
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState("");
    const [content, setContent] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        const payload = {
            title: title.trim(),
            tags: tags.split(",").map(t => t.trim()).filter(Boolean),
            content: content.trim(),
            date: new Date().toISOString()
        };
        onSubmit?.(payload);
    }

    return (
        <form onSubmit={handleSubmit} className="q-form">
            <div className="q-row">
                <label>제목</label>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
            </div>
            <div className="q-row">
                <label>태그</label>
                <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="#태그1, #태그2 (쉼표로 구분)" />
            </div>
            <div className="q-row">
                <label>내용</label>
                <textarea className="input" style={{ height: 180, resize: "vertical" }} value={content} onChange={e => setContent(e.target.value)} placeholder="질문 내용을 자세히 적어주세요" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn ghost" onClick={onCancel}>취소</button>
                <button type="submit" className="btn">등록</button>
            </div>
        </form>
    );
}
