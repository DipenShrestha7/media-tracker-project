import type { ExploreItem } from "../types/explore";
import type { LibraryItem, LibraryStatus } from "../types/library";

const API_BASE = "/api";

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = (): string | null => {
    return localStorage.getItem("nexus_token");
  };
  const authToken = token();
  // 1. Build headers dynamically based on whether a body exists
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Please login to access library.");
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const fetchLibraryItems = () => requestJson<LibraryItem[]>("/library");

export const addItemToLibrary = (item: ExploreItem) =>
  requestJson<LibraryItem>("/library", {
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
