// src/components/community/SearchBar.jsx
export default function SearchBar({ value, onChange, placeholder = "검색(제목/태그)" }) {
    return (
        <input
            className="input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    );
}
