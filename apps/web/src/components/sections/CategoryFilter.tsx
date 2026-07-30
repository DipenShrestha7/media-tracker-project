import React, { useState } from "react";
import type { Category } from "../../types";
import { categories } from "../../data/mockData";

export default function CategoryFilter(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string>("movies");

  return (
    <section className="px-8 max-w-7xl mx-auto my-8">
      <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
        {categories.map((category: Category) => {
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex flex-col items-center justify-center min-w-27.5 py-4 px-5 rounded-2xl border transition-all duration-200 group ${
                isActive
                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-600 dark:border-purple-500 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800"
              }`}
            >
              <span className="text-2xl mb-2 transition-transform group-hover:scale-110">
                {category.icon}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isActive
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                }`}
              >
                {category.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
