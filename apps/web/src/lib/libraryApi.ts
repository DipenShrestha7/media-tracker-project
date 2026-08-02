import type { ExploreItem } from "../types/explore";
import type { LibraryItem, LibraryStatus } from "../types/library";

const API_BASE = "/api";

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const fetchLibraryItems = () => requestJson<LibraryItem[]>("/library");

export const fetchHistoryItems = () => requestJson<LibraryItem[]>("/history");

export const addItemToWatchlist = (item: ExploreItem) =>
  requestJson<LibraryItem>("/watchlist", {
    method: "POST",
    body: JSON.stringify(item),
  });

export const addItemToHistory = (item: ExploreItem) =>
  requestJson<LibraryItem>("/history", {
    method: "POST",
    body: JSON.stringify(item),
  });

export const updateLibraryItemStatus = (id: string, status: LibraryStatus) =>
  requestJson<LibraryItem>(`/library/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteLibraryItem = (id: string) =>
  requestJson<void>(`/library/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
