import { Link } from "react-router-dom";
import NavBar from "./NavBar";
import "./Header.css";

export default function Header() {
    return (
        <header className="header">
            <div className="header-inner">
                {/* 좌측 브랜드 */}
                <Link to="/" className="brand">초보 육아 웹</Link>

                {/* 중앙 네비 */}
                <NavBar />

                {/* 우측 로그인/회원가입 */}
                <div className="auth">
                    <Link to="/signin" className="btn outline pill">로그인</Link>
                    <Link to="/signup" className="btn pill">회원가입</Link>
                </div>

            </div>
        </header>
    );
}
