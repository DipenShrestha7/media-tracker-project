import React, { useEffect, useState } from "react";
import { Star, CheckCircle2, Clock, Trash2, PlayCircle } from "lucide-react";
import type { LibraryItem, LibraryStatus } from "../../types/library";
import {
  deleteLibraryItem,
  fetchLibraryItems,
  updateLibraryItemStatus,
} from "../../lib/libraryApi";

const Watchlist: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryStatus>("PLAN_TO_WATCH");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const libraryItems = await fetchLibraryItems();
        setItems(libraryItems);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load watchlist.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadItems();
  }, []);

  const filteredItems = items.filter((item) => item.status === activeTab);

  const handleUpdateStatus = async (id: string, newStatus: LibraryStatus) => {
    const updatedItem = await updateLibraryItemStatus(id, newStatus);

    setItems((prev) =>
      prev.map((item) => (item.id === id ? updatedItem : item)),
    );
  };

  const handleRemove = async (id: string) => {
    await deleteLibraryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Your Media Library
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Manage your personal watch history, active shows, and future
          watchlist.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
        {[
          { key: "PLAN_TO_WATCH", label: "Plan to Watch", icon: Clock },
          { key: "WATCHING", label: "Watching", icon: PlayCircle },
          { key: "COMPLETED", label: "Completed", icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as LibraryStatus)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                isActive
                  ? "border-cyan-500 text-cyan-500"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loading your library...
          </p>
        </div>
      ) : loadError ? (
        <div className="text-center py-20 bg-rose-50 dark:bg-rose-950/50 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
          <p className="text-sm">{loadError}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No items in this list yet. Start exploring to add media!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-20 h-28 object-cover rounded-xl"
              />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wide">
                    {item.type}
                  </span>
                  <h3 className="font-bold text-sm line-clamp-1">
                    {item.title}
                  </h3>
                  {typeof item.rating === "number" && (
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {item.rating} / 10
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      void handleUpdateStatus(
                        item.id,
                        e.target.value as LibraryStatus,
                      )
                    }
                    className="text-xs bg-slate-200 dark:bg-slate-800 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="PLAN_TO_WATCH">Plan to Watch</option>
                    <option value="WATCHING">Watching</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  <button
                    onClick={() => void handleRemove(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
