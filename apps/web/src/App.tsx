import { useState } from "react";
import Navbar from "./components/layout/Navbar.tsx";
import HeroSection from "./components/sections/HeroSection.tsx";
import CategoryFilter from "./components/sections/CategoryFilter.tsx";
import RecommendationsSection from "./components/sections/Recommendations.tsx";
import FeatureGrid from "./components/layout/Footer.tsx";
import LoginModal from "./components/modals/LoginModal.tsx";

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        <Navbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenLogin={() => setIsLoginOpen(true)}
        />

        <main>
          <HeroSection />
          <CategoryFilter />
          <RecommendationsSection />
        </main>

        <FeatureGrid />

        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
      </div>
    </div>
  );
}
