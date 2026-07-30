import React from "react";

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenLogin: () => void;
}

export default function Navbar({
  darkMode,
  setDarkMode,
  onOpenLogin,
}: NavbarProps) {
  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-2 font-black text-2xl tracking-wide text-purple-600 dark:text-purple-400">
        <span className="text-3xl">
          <img className="w-6" src="main_logo.png" alt="main_logo" />
        </span>{" "}
        <img className="w-30" src="logo_text.png" alt="logo-text" />
      </div>

      <ul className="hidden md:flex items-center gap-8 font-medium text-slate-600 dark:text-slate-300">
        <li className="text-purple-600 dark:text-purple-400 font-bold cursor-pointer">
          Home
        </li>
        <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
          Explore
        </li>
        <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
          Watchlist
        </li>
        <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
          History
        </li>
        <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
          AI Assistant
        </li>
        <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
          About
        </li>
      </ul>

      <div className="flex items-center gap-4">
        {/* Dark/Light Toggle */}
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          aria-label="Toggle Theme"
        >
          {darkMode ? "🌙" : "☀️"}
        </button>

        {/* Login Button */}
        <button
          onClick={onOpenLogin}
          className="px-6 py-2 rounded-xl border border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white dark:hover:text-white font-medium transition"
        >
          Login
        </button>
      </div>
    </nav>
  );
}
