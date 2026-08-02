import React from "react";
import {
  Film,
  Bot,
  Sparkles,
  Search,
  Database,
  Zap,
  Layers,
  Code2,
} from "lucide-react";

const About: React.FC = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto transition-colors duration-200">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>Next-Gen Media Intelligence</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Track Everything.{" "}
          <span className="text-cyan-500">Understand Anything.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
          Your unified personal hub for Movies, Anime, Manga, TV Shows, Manhwa,
          and K-Dramas—backed by an AI assistant that actually knows what you
          watch.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Unified Media Hub</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            No more switching between letterboxd, MyAnimeList, and spreadsheets.
            Aggregate all your watchlists and history across every media format
            into one organized place.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">RAG AI Assistant</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Need a plot recap or answer to a confusing ending? Our
            LangChain-powered AI searches live web data and vector stores to
            give instant, accurate responses without spoilers.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Cross-Media Discovery</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Enjoyed a mind-bending sci-fi movie like *Inception*? The AI
            cross-engine recommends matching Anime, Manga, or K-Dramas sharing
            similar thematic DNA.
          </p>
        </div>
      </div>

      {/* Tech Stack Showcase */}
      <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 mb-20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
            <Code2 className="w-5 h-5" />
            <span>Architecture & Specs</span>
          </div>
          <h2 className="text-3xl font-bold mb-6">
            Built with modern tech for high performance
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            <div className="border-l-2 border-cyan-500 pl-4">
              <span className="text-slate-400 block text-xs">Frontend</span>
              <span className="font-semibold text-base">React + Tailwind</span>
            </div>
            <div className="border-l-2 border-cyan-500 pl-4">
              <span className="text-slate-400 block text-xs">Backend API</span>
              <span className="font-semibold text-base">Node.js Fastify</span>
            </div>
            <div className="border-l-2 border-cyan-500 pl-4">
              <span className="text-slate-400 block text-xs">AI & Vectors</span>
              <span className="font-semibold text-base">
                Python + LangChain
              </span>
            </div>
            <div className="border-l-2 border-cyan-500 pl-4">
              <span className="text-slate-400 block text-xs">Database</span>
              <span className="font-semibold text-base">Neon PostgreSQL</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Providers */}
      <div className="text-center space-y-6">
        <h3 className="text-xl font-bold">Powered by Open Data APIs</h3>
        <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 opacity-75">
          <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-400">
            <Database className="w-4 h-4 text-cyan-500" /> OMDb API
          </span>
          <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-400">
            <Search className="w-4 h-4 text-cyan-500" /> Jikan (MyAnimeList)
          </span>
          <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-400">
            <Layers className="w-4 h-4 text-cyan-500" /> Kitsu API
          </span>
        </div>
      </div>
    </div>
  );
};

export default About;
