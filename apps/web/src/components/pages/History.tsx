import React, { useEffect, useState } from "react";
import {
  Star,
  Calendar,
  MessageSquare,
  Film,
  Filter,
  Trash2,
} from "lucide-react";
import type { LibraryItem } from "../../types/library";
import { deleteLibraryItem, fetchHistoryItems } from "../../lib/libraryApi";

const History: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<LibraryItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const items = await fetchHistoryItems();
        setHistoryItems(items);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load history.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadHistory();
  }, []);

  const mediaTypes = [
    "ALL",
    "MOVIE",
    "TV_SHOW",
    "ANIME",
    "MANGA",
    "MANHWA",
    "KDRAMA",
  ];

  const filteredHistory = historyItems.filter((item) =>
    selectedType === "ALL" ? true : item.type === selectedType,
  );

  const handleDelete = async (id: string) => {
    await deleteLibraryItem(id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Watch & Read History
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Your personal logbook of completed titles, ratings, and reviews.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-500/10 text-cyan-500 font-bold text-sm">
          <Film className="w-4 h-4" />
          <span>Total Completed: {historyItems.length}</span>
        </div>
      </div>

      {/* Media Type Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        {mediaTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedType === type
                ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {type.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Log Feed */}
      {isLoading ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loading your history...
          </p>
        </div>
      ) : loadError ? (
        <div className="text-center py-20 bg-rose-50 dark:bg-rose-950/50 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
          <p className="text-sm">{loadError}</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No completed history found for this category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-cyan-500/40"
            >
              <div className="flex items-center gap-4">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-16 h-20 object-cover rounded-xl shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wide">
                    {item.type}
                  </span>
                  <h3 className="font-bold text-base">{item.title}</h3>

                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {typeof item.rating === "number" && (
                      <span className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {item.rating} / 10
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Finished {item.completedAt ?? "Recently"}
                    </span>
                  </div>

                  {false && (
                    <p className="text-xs italic text-slate-600 dark:text-slate-400 mt-2 flex items-start gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                      ""
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => void handleDelete(item.id)}
                className="self-end sm:self-center p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
