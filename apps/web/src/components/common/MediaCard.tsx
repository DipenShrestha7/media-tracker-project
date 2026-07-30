import type { MediaItem } from "../../types";

// Omitting `id` from MediaItem since the card doesn't need to consume its own ID internally
type MediaCardProps = Omit<MediaItem, "id">;

export default function MediaCard({
  title,
  genre,
  type,
  rating,
  image,
}: MediaCardProps) {
  return (
    <div className="min-w-50 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
      {/* Image Container */}
      <div className="h-64 bg-slate-200 dark:bg-slate-800 relative flex items-center justify-center text-slate-400 text-xs text-center p-2">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          `[ Poster: ${title} ]`
        )}
        <span className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-md uppercase">
          {type}
        </span>
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-bold text-base truncate">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {genre}
        </p>
        <div className="text-xs font-semibold text-amber-500 flex items-center gap-1">
          ★ {rating}
        </div>
      </div>
    </div>
  );
}
