import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Film,
  Filter,
  PlayCircle,
  Star,
  Trash2,
} from "lucide-react";
import type { LibraryItem, LibraryStatus } from "../../types/library";
import {
  deleteLibraryItem,
  fetchLibraryItems,
  updateLibraryItemStatus,
} from "../../lib/libraryApi";

type StatusFilter = "ALL" | LibraryStatus;

const mediaTypes = [
  "ALL",
  "MOVIE",
  "TV_SHOW",
  "ANIME",
  "MANGA",
  "MANHWA",
  "KDRAMA",
] as const;

const statusTabs: Array<{
  key: StatusFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "ALL", label: "All", icon: Film },
  { key: "PLAN_TO_WATCH", label: "Plan to Watch", icon: Clock },
  { key: "WATCHING", label: "Watching", icon: PlayCircle },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle2 },
];

const Library: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadLibrary = async () => {
      const token = localStorage.getItem("nexus_token");
      if (!token) {
        setLoadError("Please login to access library.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const libraryItems = await fetchLibraryItems();
        setItems(libraryItems);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load library.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadLibrary();
  }, []);

  const completedItems = items.filter((item) => item.status === "COMPLETED");
  const completedByType = mediaTypes
    .filter(
      (type): type is Exclude<(typeof mediaTypes)[number], "ALL"> =>
        type !== "ALL",
    )
    .map((type) => ({
      type,
      count: completedItems.filter((item) => item.type === type).length,
    }));

  const filteredItems = items.filter((item) => {
    const matchesStatus =
      selectedStatus === "ALL" || item.status === selectedStatus;
    const matchesType = selectedType === "ALL" || item.type === selectedType;
    return matchesStatus && matchesType;
  });

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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Library</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl">
            Track all your medias in one place.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-500/10 text-cyan-500 font-bold text-sm w-fit">
          <CheckCircle2 className="w-4 h-4" />
          <span>Total Completed: {completedItems.length}</span>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Completed by Media Type
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/60">
            {completedByType.map(({ type, count }) => {
              const hasItems = count > 0;
              return (
                <div
                  key={type}
                  className="flex flex-col py-2 sm:py-0 sm:px-4 first:pl-0 last:pr-0"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {type.replace("_", " ")}
                  </span>
                  <span
                    className={`mt-1 text-2xl font-black transition-colors ${
                      hasItems
                        ? "text-cyan-500 dark:text-cyan-400"
                        : "text-slate-300 dark:text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedStatus === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-2xl border border-dashed border-cyan-200 dark:border-cyan-800/50">
          <div className="flex items-center gap-3">
            {/* Optional loading spinner */}
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-base font-medium text-cyan-900 dark:text-cyan-200">
              Loading your library...
            </p>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 bg-cyan-500/10 dark:bg-cyan-950/30 rounded-2xl border border-dashed border-cyan-400/30 dark:border-cyan-500/30">
          <p className="text-base sm:text-lg font-semibold text-cyan-800 dark:text-cyan-300 text-center">
            {loadError}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 text-center">
            No items match the current filters yet.
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
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.status === "COMPLETED"
                      ? `Completed ${item.completedAt ?? "recently"}`
                      : `Status: ${item.status.replace("_", " ")}`}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 gap-2">
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

export default Library;
