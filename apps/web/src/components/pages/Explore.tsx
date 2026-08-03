import React, { useEffect, useState } from "react";
import {
  Search,
  Star,
  Check,
  Filter,
  RefreshCcw,
  BookmarkPlus,
} from "lucide-react";
import type { ExploreItem, ExploreResponse } from "../../types/explore";
import type { LibraryStatus } from "../../types/library";
import { addItemToLibrary } from "../../lib/libraryApi";
import { useSearchParams } from "react-router";

const Explore: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [_, setActiveSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [addedStatuses, setAddedStatuses] = useState<
    Record<string, LibraryStatus>
  >({});
  const [exploreData, setExploreData] = useState<ExploreResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const mediaTypes = [
    "ALL",
    "MOVIE",
    "TV_SHOW",
    "ANIME",
    "MANGA",
    "MANHWA",
    "KDRAMA",
  ];
  // useEffect(() => {
  //   const urlQuery = searchParams.get("q") || "";
  //   setSearchQuery(urlQuery);
  //   setActiveSearch(urlQuery);
  // }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    // 1. Read query directly from URL inside the effect
    const urlQuery = searchParams.get("q") || "";
    setSearchQuery(urlQuery); // Sync input box text

    const loadExploreData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const trimmedSearch = urlQuery.trim();
        const query = trimmedSearch
          ? `?q=${encodeURIComponent(trimmedSearch)}`
          : "";

        const response = await fetch(`/api/explore${query}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Explore data request failed with status ${response.status}`,
          );
        }

        const payload: ExploreResponse = await response.json();

        if (!controller.signal.aborted) {
          setExploreData(payload);
        }
      } catch (error: any) {
        // Ignore cancellations
        if (error.name === "AbortError" || controller.signal.aborted) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load explore data.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadExploreData().catch(() => {});

    return () => controller.abort();
  }, [searchParams]);

  const handleSearchSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearch(searchQuery);
    setSearchParams({ q: searchQuery.trim() });
  };

  const handleSaveItem = async (item: ExploreItem) => {
    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      const savedItem = await addItemToLibrary(item);

      setAddedStatuses((prev) => ({ ...prev, [item.id]: savedItem.status }));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to save this item.",
      );
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const visibleItems = (items: ExploreItem[]) =>
    items.filter((item) => {
      const matchesType = selectedType === "ALL" || item.type === selectedType;
      const matchesQuery =
        searchQuery.trim().length === 0 ||
        item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.genre.some((entry) =>
          entry.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        );

      return matchesType && matchesQuery;
    });

  const renderSection = (
    title: string,
    description: string,
    items: ExploreItem[],
  ) => {
    const filteredItems = visibleItems(items);

    if (filteredItems.length === 0) {
      return null;
    }

    return (
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {filteredItems.length} results
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredItems.map((item) => {
            const savedStatus = addedStatuses[item.id];
            const isInLibrary = Boolean(savedStatus);
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
                    onClick={() => handleSaveItem(item)}
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
      </section>
    );
  };

  const sections = [
    {
      title: "Movies & Series",
      description: "Mixed movies and series of different genre.",
      items: exploreData?.moviesAndSeries ?? [],
    },
    {
      title: "Anime, Manga & Manhwa",
      description: "Popular AniList entries with both anime and manga items.",
      items: exploreData?.animeManga ?? [],
    },
    {
      title: "K-Dramas",
      description: "TVMaze results filtered for Korean-language drama picks.",
      items: exploreData?.kdramas ?? [],
    },
  ];

  const hasVisibleResults = sections.some(
    (section) => visibleItems(section.items).length > 0,
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header & Search Bar */}
      <div className="max-w-3xl mx-auto text-center mb-10 space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Explore & Discover
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Live data from OMDb, AniList, and TVMaze, all normalized into one
          discovery feed.
        </p>

        <form onSubmit={handleSearchSubmit} className="relative mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a movie, anime, drama, or genre..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-slate-900 dark:text-white shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
          >
            Search
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Refreshing the page loads a new randomized explore set.</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none justify-start sm:justify-center">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
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
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-10 text-center text-slate-500 dark:text-slate-400">
          Loading live explore data...
        </div>
      ) : loadError ? (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 p-6 text-rose-700 dark:text-rose-300">
          {loadError}
        </div>
      ) : hasVisibleResults ? (
        <div className="space-y-12">
          {sections.map((section) => {
            const sectionNode = renderSection(
              section.title,
              section.description,
              section.items,
            );

            return sectionNode ? (
              <React.Fragment key={section.title}>{sectionNode}</React.Fragment>
            ) : null;
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-10 text-center text-slate-500 dark:text-slate-400">
          No results match the current filters.
        </div>
      )}
    </div>
  );
};

export default Explore;
