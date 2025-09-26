import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CommunityPage from "./pages/Community/CommunityPage";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main style={{ minHeight: "80vh" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/community" />} />
          <Route path="/community" element={<CommunityPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
