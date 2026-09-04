import React, {
  useCallback,
  useEffect,
  useState,
  type SubmitEvent,
  type ChangeEvent,
} from "react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import MediaCard from "../common/MediaCard";
import Footer from "../layout/Footer.tsx";
import type { ExploreItem } from "../../types/explore";
import { addItemToLibrary } from "../../lib/libraryApi";

interface HomePageProps {
  onOpenLogin: () => void;
  authVersion?: number;
}

const HomePage: React.FC<HomePageProps> = ({ onOpenLogin, authVersion = 0 }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recommendations, setRecommendations] = useState<ExploreItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("nexus_token"),
  );
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setToken(localStorage.getItem("nexus_token"));
  }, [authVersion]);

  const fetchTopRecommendations = useCallback(async () => {
    const authToken = localStorage.getItem("nexus_token");
    if (!authToken) {
      setRecommendations([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ refresh: false }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("nexus_token");
          setToken(null);
          setRecommendations([]);
          setError("Please login to see recommendations.");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.detail || `HTTP ${response.status}`,
        );
      }

      const data = await response.json();
      const recs: ExploreItem[] =
        data.recommendations || data.metadata?.recommendations || [];
      setRecommendations(recs.slice(0, 5));
    } catch (err: unknown) {
      console.error("Failed to fetch home recommendations:", err);
      setRecommendations([]);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load recommendations.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTopRecommendations();
  }, [token, fetchTopRecommendations]);

  const handleSearch = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSaveItem = async (item: ExploreItem) => {
    if (!token) {
      onOpenLogin();
      return;
    }

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await addItemToLibrary(item);
      setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this item.",
      );
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div>
      <section className="relative px-8 py-12 md:py-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6">
            Track. Explore. <br />
            Remember. <br />
            All in{" "}
            <span className="text-cyan-600 dark:text-cyan-400">NEXUS.</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
            Track movies, shows, anime, manga, and more. Get personalized
            recommendations and talk with our AI assistant.
          </p>

          <form
            onSubmit={handleSearch}
            className="flex items-center p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-cyan-500/5 max-w-lg transition-all focus-within:border-cyan-500"
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
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-xl text-sm transition-colors shadow-md shadow-cyan-600/20"
            >
              Search
            </button>
          </form>
        </div>
        <div className="lg:col-span-6 relative h-120 sm:h-120 w-full flex items-center justify-center">
          <div className="absolute top-0 right-36 w-36 sm:w-44 h-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-white/30 dark:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] rotate-6 hover:rotate-0 transition-all duration-300 flex items-center justify-center text-center">
            <img
              className="w-full h-full object-cover"
              src="lost.webp"
              alt=""
            />
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
      <section className="px-8 max-w-7xl mx-auto my-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Recommended For You
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Handpicked suggestions based on your taste
            </p>
          </div>

          <button
            onClick={() => navigate("/recommendations")}
            className="text-cyan-600 dark:text-cyan-400 font-semibold hover:text-cyan-700 dark:hover:text-cyan-300 text-sm flex items-center gap-1 transition-colors"
          >
            View All
            <span className="text-xs">→</span>
          </button>
        </div>

        {!token ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-10 text-center space-y-4">
            <Sparkles className="w-10 h-10 text-cyan-500 mx-auto" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              Login to see personalized recommendations
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              We use your library to suggest movies, shows, anime, and more.
            </p>
            <button
              onClick={onOpenLogin}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Login
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="min-w-50 w-56 shrink-0 rounded-2xl aspect-2/3 bg-slate-200 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 p-6 text-rose-700 dark:text-rose-300 text-sm">
            {error}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-10 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <p>No recommendations yet.</p>
            <p className="text-sm">
              Add items to your library, then visit Recommendations to generate
              picks.
            </p>
            <button
              onClick={() => navigate("/recommendations")}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Get recommendations
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
              {recommendations.map((item) => (
                <MediaCard
                  key={item.id}
                  title={item.title}
                  genre={
                    item.genre.length > 0
                      ? item.genre.join(" • ")
                      : "No genre listed"
                  }
                  type={item.type}
                  rating={item.rating}
                  image={item.posterUrl}
                  year={item.year}
                  inLibrary={Boolean(item.inLibrary) || Boolean(addedIds[item.id])}
                  onAddToLibrary={() => {
                    if (savingIds[item.id]) return;
                    void handleSaveItem(item);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default HomePage;
