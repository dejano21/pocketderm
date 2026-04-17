import { Routes, Route, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Sidebar from "./components/Sidebar";
import { useMediaQuery } from "./hooks/useMediaQuery";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import Capture from "./screens/Capture";
import AnalysisResults from "./screens/AnalysisResults";
import MoleHistory from "./screens/MoleHistory";
import MoleDetail from "./screens/MoleDetail";
import DermatologistSummary from "./screens/DermatologistSummary";
import GenAChat from "./screens/GenAChat";
import Profile from "./screens/Profile";

export default function App() {
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isOnboarding = location.pathname === "/" || location.pathname === "/onboarding";

  return (
    <div className="app-layout">
      {isDesktop && !isOnboarding && <Sidebar />}
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/results" element={<AnalysisResults />} />
          <Route path="/history" element={<MoleHistory />} />
          <Route path="/history/:id" element={<MoleDetail />} />
          <Route path="/dermatologist" element={<DermatologistSummary />} />
          <Route path="/chat" element={<GenAChat />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        {!isOnboarding && <BottomNav />}
      </div>
    </div>
  );
}
