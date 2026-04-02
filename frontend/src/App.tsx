import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { WellbeingPage } from "./pages/WellbeingPage";
import { AuthProvider } from "./contexts/AuthContext";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

function App() {
  return (
    <AuthProvider>
      <YouTubeDataProvider>
        <InstagramDataProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/youtube/dashboard" element={<DashboardPage />} />
                  <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
                  <Route path="/wellbeing" element={<WellbeingPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </InstagramDataProvider>
      </YouTubeDataProvider>
    </AuthProvider>
  );
}

export default App;
