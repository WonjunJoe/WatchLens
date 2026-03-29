import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

function App() {
  return (
    <YouTubeDataProvider>
      <InstagramDataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/youtube/dashboard" element={<DashboardPage />} />
              <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </InstagramDataProvider>
    </YouTubeDataProvider>
  );
}

export default App;
