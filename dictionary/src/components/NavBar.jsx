import { NavLink } from "react-router-dom";

export default function NavBar() {
    return (
        <nav className="nav">
            <NavLink to="/" end>홈</NavLink>
            <NavLink to="/stories">동화</NavLink>
            <NavLink to="/behaviors">행동사전</NavLink>
            <NavLink to="/routines">루틴</NavLink>
            <NavLink to="/growth">성장/건강</NavLink>
            <NavLink to="/community">커뮤니티</NavLink>
        </nav>
    );
}
