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
      {/* Left Column: Headline & Search */}
      <div className="lg:col-span-6 z-10">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
          <span>✨</span> Your Universe. Organized.
        </span>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6">
          Track. Explore. <br />
          Remember. <br />
          All in{" "}
          <span className="text-purple-600 dark:text-purple-400">NEXUS.</span>
        </h1>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
          Track movies, shows, anime, manga, and more. Get personalized
          recommendations and talk with our AI assistant.
        </p>

        {/* Search Bar */}
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

      {/* Right Column: Hero Card Collage (3D/Layered Layout) */}
      <div className="lg:col-span-6 relative h-105 sm:h-120 w-full flex items-center justify-center">
        {/* Top Floating Card - Spirited Away */}
        <div className="absolute top-0 right-12 w-36 sm:w-44 h-52 sm:h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-xl rotate-6 hover:rotate-0 transition-all duration-300 flex items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">
            [ Spirited Away ]
          </span>
        </div>

        {/* Main Center Card - Batman */}
        <div className="absolute top-4 left-4 sm:left-12 w-44 sm:w-52 h-64 sm:h-80 rounded-2xl bg-slate-300 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-2xl -rotate-6 hover:rotate-0 transition-all duration-300 z-10 flex items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">
            [ Batman / Main ]
          </span>
        </div>

        {/* Back Right Card - Attack on Titan */}
        <div className="absolute top-8 right-0 w-36 sm:w-44 h-52 sm:h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-lg rotate-12 flex items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">
            [ Attack on Titan ]
          </span>
        </div>

        {/* Bottom Left Overlay Card - The Witcher */}
        <div className="absolute bottom-4 left-12 sm:left-24 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-xl -rotate-3 z-20 flex items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">
            [ The Witcher ]
          </span>
        </div>

        {/* Bottom Center Overlay Card - One Piece */}
        <div className="absolute bottom-0 left-44 sm:left-56 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-xl rotate-3 z-20 flex items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">
            [ One Piece ]
          </span>
        </div>

        {/* Bottom Right Overlay Card - Chainsaw Man */}
        <div className="absolute bottom-6 right-4 sm:right-8 w-32 sm:w-40 h-48 sm:h-56 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-xl rotate-12 z-20 flex items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">
            [ Chainsaw Man ]
          </span>
        </div>
      </div>
    </section>
  );
}
