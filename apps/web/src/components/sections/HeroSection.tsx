import React, { useState, type SubmitEvent, type ChangeEvent } from "react";

export default function HeroSection(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSearch = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Handle search query logic here
    console.log("Searching for:", searchQuery);
  };

  return (
    <section className="relative px-8 py-12 md:py-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <div className="lg:col-span-6 z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6">
          Track. Explore. <br />
          Remember. <br />
          All in{" "}
          <span className="text-purple-600 dark:text-purple-400">NEXUS.</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
          Track movies, shows, anime, manga, and more. Get personalized
          recommendations and talk with our AI assistant.
        </p>

        <form
          onSubmit={handleSearch}
          className="flex items-center p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-purple-500/5 max-w-lg transition-all focus-within:border-purple-500"
        >
          <span className="px-3 text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            placeholder="Search for movies, shows, anime, manga..."
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm transition-colors shadow-md shadow-purple-600/20"
          >
            Search
          </button>
        </form>
      </div>
      <div className="lg:col-span-6 relative h-120 sm:h-120 w-full flex items-center justify-center">
        <div className="absolute top-0 right-36 w-36 sm:w-44 h-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] rotate-6 hover:rotate-0 transition-all duration-300 flex items-center justify-center text-center">
          <img className="w-full h-full object-cover" src="lost.webp" alt="" />
        </div>
        <div className="absolute top-2 left-4 sm:left-12 w-44 sm:w-50 h-64 sm:h-68 rounded-2xl overflow-hidden bg-slate-300 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] -rotate-6 hover:rotate-0 transition-all duration-300 z-10 flex items-center justify-center text-center">
          <img
            className="w-full h-full object-cover"
            src="darkknight.jpg"
            alt="dark knight image"
          />
        </div>
        <div className="absolute top-8 -right-10 w-36 sm:w-44 h-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] rotate-18 hover:rotate-10 transition-all duration-300 flex items-center justify-center text-center">
          <img
            className="w-full h-full object-cover"
            src="naruto.webp"
            alt="naruto image"
          />
        </div>
        <div className="absolute bottom-1 left-12 sm:left-10 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] rotate-6 hover:rotate-0 transition-all duration-300 z-20 flex items-center justify-center text-center">
          <img
            className="w-full h-full object-cover"
            src="berserk.webp"
            alt="berserk image"
          />
        </div>
        <div className="absolute bottom-0 left-44 sm:left-56 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] rotate-6 hover:rotate-0 transition-all duration-300 z-20 flex items-center justify-center text-center">
          <img
            className="w-full h-full object-cover"
            src="vincenzo.jpg"
            alt="vincenzo image"
          />
        </div>
        <div className="absolute -bottom-3 -right-10 sm:right-0 w-32 sm:w-45 h-48 sm:h-62 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] rotate-6 hover:rotate-0 transition-all duration-300 z-20 flex items-center justify-center text-center">
          <img
            className="w-full h-full object-cover"
            src="deathnote.jpg"
            alt="death note image"
          />
        </div>
      </div>
    </section>
  );
}
