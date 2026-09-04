import React, { useState, useEffect } from "react";
import {
  Star,
  RefreshCcw,
  AlertCircle,
  Sparkles,
  Check,
  BookmarkPlus,
  X,
} from "lucide-react";
import type { ExploreItem } from "../../types/explore";
import type { LibraryStatus } from "../../types/library";
import { addItemToLibrary } from "../../lib/libraryApi";

interface RecommendationsProps {
  onOpenLogin: () => void;
}

const Recommendations: React.FC<RecommendationsProps> = ({ onOpenLogin }) => {
  const [recommendations, setRecommendations] = useState<ExploreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedStatuses, setAddedStatuses] = useState<
    Record<string, LibraryStatus>
  >({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [authErrorModal, setAuthErrorModal] = useState<string | null>(null);

  const token = localStorage.getItem("nexus_token") || "";

  useEffect(() => {
    if (!token) {
      setError("Please login to see recommendations");
      setIsLoading(false);
      return;
    }

    void fetchRecommendations();
  }, [token]);

  const fetchRecommendations = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refresh: forceRefresh }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please login again.");
          localStorage.removeItem("nexus_token");
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

      setRecommendations(recs);

      if (recs.length === 0) {
        setError(
          "No recommendations could be generated. Try adding more items to your library.",
        );
      }
    } catch (err: unknown) {
      console.error("Failed to fetch recommendations:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load recommendations. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (item: ExploreItem) => {
    if (!token) {
      setAuthErrorModal("Please login to access library.");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      const savedItem = await addItemToLibrary(item);
      setAddedStatuses((prev) => ({ ...prev, [item.id]: savedItem.status }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this item.",
      );
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <Sparkles className="w-12 h-12 text-cyan-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">AI Recommendations</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center">
          Login to get personalized recommendations based on your library
        </p>
        <button
          onClick={onOpenLogin}
          className="px-6 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 font-semibold"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-cyan-500" />
            AI Recommendations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Personalized for your library
            {recommendations.length > 0 && ` (${recommendations.length} items)`}
          </p>
        </div>
        <button
          onClick={() => void fetchRecommendations(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 disabled:opacity-50 shadow-sm"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 p-4 flex items-start gap-3 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array(10)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className="rounded-2xl aspect-2/3 bg-slate-200 dark:bg-slate-800 animate-pulse"
              />
            ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-10 text-center text-slate-500 dark:text-slate-400">
          <p className="mb-2">No recommendations available</p>
          <p className="text-sm">
            Add items to your library to get personalized recommendations
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {recommendations.map((item) => {
            const savedStatus = addedStatuses[item.id];
            const isInLibrary = Boolean(savedStatus) || Boolean(item.inLibrary);
            const isSaving = Boolean(savingIds[item.id]);

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all shadow-sm flex flex-col"
              >
                <div className="aspect-2/3 w-full overflow-hidden relative bg-slate-200 dark:bg-slate-800">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-cyan-500/30">
                    {item.type.replace("_", " ")}
                  </span>
                  {typeof item.rating === "number" && (
                    <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {item.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-cyan-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.genre.length > 0
                        ? item.genre.join(", ")
                        : "No genre listed"}
                      {item.year ? ` • ${item.year}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (!token) {
                        setAuthErrorModal("Please login to access library.");
                        return;
                      }
                      void handleSaveItem(item);
                    }}
                    disabled={isSaving || isInLibrary}
                    className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isInLibrary
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                        : "bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white shadow-xs"
                    } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isInLibrary ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">In Library</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Add to Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {authErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 text-center shadow-2xl space-y-4">
            <button
              onClick={() => setAuthErrorModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h3 className="text-xl font-bold text-white">Login Required</h3>
            <p className="text-slate-300 text-base">{authErrorModal}</p>
            <button
              onClick={() => {
                setAuthErrorModal(null);
                onOpenLogin();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
