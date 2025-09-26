import { NavLink } from "react-router-dom";

export default function NavBar() {
    const menus = [
        { path: "/", name: "홈" },
        { path: "/stories", name: "동화" },
        { path: "/behaviors", name: "행동사전" },
        { path: "/routines", name: "루틴" },
        { path: "/growth", name: "성장/건강" },
        { path: "/community", name: "커뮤니티" },
    ];

    return (
        <nav className="nav">
            {menus.map((m) => (
                <NavLink
                    key={m.path}
                    to={m.path}
                    className={({ isActive }) => (isActive ? "active" : "")}
                    end={m.path === "/"}  // 홈 경로 정확히 매칭
                >
                    {m.name}
                </NavLink>
            ))}
        </nav>
    );
}
