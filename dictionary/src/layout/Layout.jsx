import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

export default function Layout() {
    return (
        <div className="layout-medium">
            <Header />
            <main className="container">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
