export type MediaType =
  | "Movie"
  | "TV Show"
  | "Anime"
  | "Manga"
  | "K-Drama"
  | "Manhwa"
  | "Others";

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface MediaItem {
  id: number;
  title: string;
  genre: string;
  type: MediaType;
  rating: string;
  image: string;
}

export interface Feature {
  title: string;
  desc: string;
  icon: string;
}
