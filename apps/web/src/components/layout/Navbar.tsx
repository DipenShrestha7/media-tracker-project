import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { NavLink } from "react-router";
import axios from "axios";

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenLogin: () => void;
  authVersion: number;
}

type User = {
  id?: number;
  name?: string;
  email?: string;
};

function Navbar({
  darkMode,
  setDarkMode,
  onOpenLogin,
  authVersion,
}: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsDropdownOpen(false);
  };
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const response = await axios.get("/api/getuser", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data) {
          setUser(response.data);
        } else {
          console.warn("Response.data came back empty/undefined!");
        }
      } catch (error) {
        console.error("Axios Request Failed:", error);
      }
    };

    fetchUser();
  }, [authVersion]);
  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-purple-600 dark:text-purple-400 font-bold"
      : "hover:text-purple-600 dark:hover:text-purple-400";

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-2 font-black text-2xl tracking-wide text-purple-600 dark:text-purple-400 cursor-pointer">
        <img className="w-35" src="nexuslogo.png" alt="logo-text" />
      </div>

      <ul className="hidden md:flex items-center gap-8 font-medium text-slate-600 dark:text-slate-300">
        <li>
          <NavLink to="/" end className={getNavLinkClassName}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/explore" className={getNavLinkClassName}>
            Explore
          </NavLink>
        </li>
        <li>
          <NavLink to="/watchlist" className={getNavLinkClassName}>
            Watchlist
          </NavLink>
        </li>
        <li>
          <NavLink to="/history" className={getNavLinkClassName}>
            History
          </NavLink>
        </li>
        <li>
          <NavLink to="/assistant" className={getNavLinkClassName}>
            AI Assistant
          </NavLink>
        </li>
        <li>
          <NavLink to="/about" className={getNavLinkClassName}>
            About
          </NavLink>
        </li>
      </ul>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          aria-label="Toggle Theme"
        >
          {darkMode === true ? (
            <Moon
              className="h-4.5 w-4.5 transition-transform duration-300 hover:rotate-12"
              style={{ color: "var(--text-muted)" }}
            />
          ) : (
            <Sun
              className="h-4.5 w-4.5 transition-transform duration-300 hover:scale-110"
              style={{ color: "#fbbf24" }}
            />
          )}
        </button>
        {user && user.name ? (
          <div className="relative">
            {/* Trigger Button */}
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-xs"
            >
              <div className="w-7 h-7 rounded-full bg-linear-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {user?.name}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                {/* Click Outside Overlay */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl dark:shadow-purple-950/20 backdrop-blur-md z-20 overflow-hidden py-1.5 transition-all">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-linear-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-xs">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="p-1 rounded-lg bg-red-100 dark:bg-red-500/10 group-hover:bg-red-200 dark:group-hover:bg-red-500/20 transition-colors">
                        <svg
                          className="w-4 h-4 text-red-600 dark:text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                      </div>
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Fallback Login Button when logged out */
          <button
            onClick={onOpenLogin}
            className="px-6 py-2 rounded-xl border border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white dark:hover:text-white font-medium transition cursor-pointer"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
