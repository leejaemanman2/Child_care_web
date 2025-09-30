import { BrowserRouter, Routes, Route } from "react-router-dom";
import BehaviorPage from "./pages/Behaviors/BehaviorPage";
import Layout from "./layout/Layout.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<BehaviorPage />} />
          {/* <Route path="community" element={<CommunityPage />} /> 등 필요시 추가 */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
