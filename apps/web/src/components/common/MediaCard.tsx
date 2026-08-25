import { useState } from "react";
import { Star, BookmarkPlus, Check } from "lucide-react";
import type { MediaItem, MediaType } from "../../types";

export interface MediaCardProps extends Omit<
  Partial<MediaItem>,
  "type" | "rating"
> {
  title: string;
  genre: string;
  type: MediaType | string;
  rating?: string | number;
  image?: string;
  year?: string | number;
  inLibrary?: boolean;
  onAddToLibrary?: () => void;
}

export default function MediaCard({
  title,
  genre,
  type,
  rating,
  image,
  year,
  inLibrary = false,
  onAddToLibrary,
}: MediaCardProps) {
  const [isSaved, setIsSaved] = useState<boolean>(inLibrary);

  const handleSave = () => {
    if (isSaved) return;
    setIsSaved(true);
    if (onAddToLibrary) {
      onAddToLibrary();
    }
  };

  // Format rating string or number cleanly (e.g. "8.6/10" -> "8.6")
  const formatRating = (rawRating?: string | number): string | null => {
    if (rawRating === undefined || rawRating === null || rawRating === "")
      return null;
    if (typeof rawRating === "number") return rawRating.toFixed(1);
    const cleaned = String(rawRating).replace(/\/10$/, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? cleaned : num.toFixed(1);
  };

  const formattedRating = formatRating(rating);
  const displayType = typeof type === "string" ? type.replace("_", " ") : type;

  return (
    <div className="min-w-50 w-56 shrink-0 group relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all duration-300 shadow-sm flex flex-col">
      {/* Image Container */}
      <div className="aspect-2/3 w-full overflow-hidden relative bg-slate-200 dark:bg-slate-800">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800">
            <span className="text-xs font-semibold line-clamp-2">{title}</span>
          </div>
        )}

        {/* Type Badge */}
        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-cyan-500/30 z-10">
          {displayType}
        </span>

        {/* Rating Badge */}
        {formattedRating && (
          <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20 z-10">
            <Star className="w-3 h-3 fill-amber-400" />
            {formattedRating}
          </span>
        )}
      </div>

      {/* Details Section */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3
            className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-cyan-500 transition-colors"
            title={title}
          >
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
            {genre}
            {year ? ` • ${year}` : ""}
          </p>
        </div>

        {/* Add to Library Button */}
        <button
          onClick={handleSave}
          disabled={isSaved}
          className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isSaved
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
              : "bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white shadow-xs"
          }`}
        >
          {isSaved ? (
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
}
