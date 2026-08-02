import { useEffect, useState } from "react";
import Navbar from "./components/layout/Navbar.tsx";
import Footer from "./components/layout/Footer.tsx";
import LoginModal from "./components/modals/LoginModal.tsx";
import Explore from "./components/pages/Explore.tsx";
import Assistant from "./components/pages/Assistant.tsx";
import About from "./components/pages/About.tsx";
import History from "./components/pages/History.tsx";
import Watchlist from "./components/pages/Watchlist.tsx";
import HomePage from "./components/pages/HomePage.tsx";
import { Routes, Route, Navigate } from "react-router";

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [authVersion, setAuthVersion] = useState<number>(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenLogin={() => setIsLoginOpen(true)}
        authVersion={authVersion}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => setAuthVersion((version) => version + 1)}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/history" element={<History />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/homepage" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}
