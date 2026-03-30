import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { LandingPage } from "./pages/LandingPage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { WellbeingPage } from "./pages/WellbeingPage";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

function App() {
  return (
    <YouTubeDataProvider>
      <InstagramDataProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing page — no sidebar, fullscreen */}
            <Route path="/" element={<LandingPage />} />
            {/* App pages — with sidebar */}
            <Route element={<Layout />}>
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/youtube/dashboard" element={<DashboardPage />} />
              <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
              <Route path="/wellbeing" element={<WellbeingPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </InstagramDataProvider>
    </YouTubeDataProvider>
  );
}

export default App;
