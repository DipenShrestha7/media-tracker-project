import React from "react";
import type { Feature } from "../../types";
import { features } from "../../data/mockData";

export default function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 pt-12 pb-8 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {features.map((feature: Feature, index: number) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"
            >
              <span className="text-2xl" role="img" aria-label={feature.title}>
                {feature.icon}
              </span>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {feature.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Copyright & Links */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} NEXUS. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <a
              href="#privacy"
              className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#help"
              className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
