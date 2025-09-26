import { useState } from "react";

export default function FilterTabs() {
    const [active, setActive] = useState("all");
    return (
        <div className="segmented">
            <button className={active === "all" ? "active" : ""} onClick={() => setActive("all")}>전체</button>
            <button className={active === "new" ? "active" : ""} onClick={() => setActive("new")}>최신순</button>
        </div>
    );
}
