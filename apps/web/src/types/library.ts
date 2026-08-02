import type { ExploreItemType } from "./explore";

export type LibraryStatus = "PLAN_TO_WATCH" | "WATCHING" | "COMPLETED";

export interface LibraryItem {
  id: string;
  externalId: string;
  title: string;
  type: ExploreItemType;
  posterUrl: string;
  rating: number | undefined;
  year: number | undefined;
  genre: string[];
  source: "OMDB" | "ANILIST" | "TVMAZE";
  status: LibraryStatus;
  completedAt: string | undefined;
}
