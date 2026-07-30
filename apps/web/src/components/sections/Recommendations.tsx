import React from "react";
import MediaCard from "../common/MediaCard";
import type { MediaItem } from "../../types";
import { recommendations } from "../../data/mockData";

export default function RecommendationsSection(): React.JSX.Element {
  return (
    <section className="px-8 max-w-7xl mx-auto my-12">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Recommended For You
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Handpicked suggestions based on your taste
          </p>
        </div>

        <button className="text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300 text-sm flex items-center gap-1 transition-colors">
          <span>View All</span>
          <span className="text-xs">→</span>
        </button>
      </div>

      {/* Horizontal Cards Slider */}
      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          {recommendations.map((item: MediaItem) => (
            <MediaCard
              key={item.id}
              title={item.title}
              genre={item.genre}
              type={item.type}
              rating={item.rating}
              image={item.image}
            />
          ))}
        </div>

        {/* Carousel Indicators (Dots) */}
        <div className="flex justify-center items-center gap-2 mt-6">
          <span className="w-6 h-2 rounded-full bg-purple-600 dark:bg-purple-500"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
        </div>
      </div>
    </section>
  );
}
