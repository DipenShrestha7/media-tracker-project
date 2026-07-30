import type { Category, MediaItem, Feature } from "../types/index.ts";

export const categories: Category[] = [
  { id: "movies", label: "Movies", icon: "🎬" },
  { id: "tv", label: "TV Shows", icon: "📺" },
  { id: "anime", label: "Anime", icon: "👾" },
  { id: "manga", label: "Manga", icon: "📙" },
  { id: "manhwa", label: "Manhwa", icon: "📘" },
  { id: "kdramas", label: "K-Dramas", icon: "💖" },
  { id: "others", label: "Others", icon: "💬" },
];

export const recommendations: MediaItem[] = [
  {
    id: 1,
    title: "Interstellar",
    genre: "Sci-Fi • Adventure",
    type: "Movie",
    rating: "8.6/10",
    image: "",
  },
  {
    id: 2,
    title: "Demon Slayer",
    genre: "Action • Fantasy",
    type: "Anime",
    rating: "8.7/10",
    image: "",
  },
  {
    id: 3,
    title: "Breaking Bad",
    genre: "Crime • Drama",
    type: "TV Show",
    rating: "9.5/10",
    image: "",
  },
  {
    id: 4,
    title: "Berserk",
    genre: "Dark Fantasy • Action",
    type: "Manga",
    rating: "9.2/10",
    image: "",
  },
  {
    id: 5,
    title: "Crash Landing on You",
    genre: "Romance • Drama",
    type: "K-Drama",
    rating: "8.8/10",
    image: "",
  },
];

export const features: Feature[] = [
  {
    title: "Track Everything",
    desc: "All your media in one beautiful place.",
    icon: "⭐",
  },
  {
    title: "AI Assistant",
    desc: "Ask anything about your favorite media.",
    icon: "💬",
  },
  {
    title: "Personalized",
    desc: "Smart recommendations just for you.",
    icon: "📊",
  },
  {
    title: "Your Data",
    desc: "Private, secure, and always yours.",
    icon: "🛡️",
  },
];
