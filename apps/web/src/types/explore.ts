export type ExploreItemType =
  | "MOVIE"
  | "TV_SHOW"
  | "ANIME"
  | "MANGA"
  | "MANHWA"
  | "KDRAMA";

export interface ExploreItem {
  id: string;
  externalId: string;
  title: string;
  type: ExploreItemType;
  posterUrl: string;
  rating: number | undefined;
  year: number | undefined;
  genre: string[];
  source: "OMDB" | "ANILIST" | "TVMAZE";
}

export interface ExploreResponse {
  moviesAndSeries: ExploreItem[];
  animeManga: ExploreItem[];
  kdramas: ExploreItem[];
}
