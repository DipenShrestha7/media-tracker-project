import type { ExploreItem } from "./media.js";
import {
  LibraryEntry,
  type LibraryStatus,
} from "../src/models/libraryEntryModel.js";
import { hasDatabase } from "../src/config/db.js";

export interface LibraryItem extends ExploreItem {
  status: LibraryStatus;
  completedAt: string | undefined;
}

const statusRank: Record<LibraryStatus, number> = {
  PLAN_TO_WATCH: 1,
  WATCHING: 2,
  COMPLETED: 3,
};

const promoteStatus = (
  currentStatus: LibraryStatus,
  nextStatus: LibraryStatus,
): LibraryStatus =>
  statusRank[nextStatus] > statusRank[currentStatus]
    ? nextStatus
    : currentStatus;

const ensureDatabase = () => {
  if (!hasDatabase) {
    throw new Error(
      "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
    );
  }
};

const toLibraryItem = (entry: LibraryEntry): LibraryItem => ({
  id: entry.id,
  externalId: entry.externalId,
  title: entry.title,
  type: entry.type as ExploreItem["type"],
  posterUrl: entry.posterUrl,
  rating: entry.rating ?? undefined,
  year: entry.year ?? undefined,
  genre: entry.genre,
  source: entry.source,
  status: entry.status,
  completedAt: entry.completedAt ? entry.completedAt.toISOString() : undefined,
});

const upsertEntry = async (
  item: ExploreItem,
  nextStatus: LibraryStatus,
  userId: string,
): Promise<LibraryItem> => {
  ensureDatabase();
  const existing = await LibraryEntry.findOne({
    where: { id: item.id, userId },
  });
  const resolvedStatus = existing
    ? promoteStatus(existing.status as LibraryStatus, nextStatus)
    : nextStatus;
  const resolvedCompletedAt =
    resolvedStatus === "COMPLETED" ? new Date() : null;

  if (existing) {
    await existing.update({
      externalId: item.externalId,
      title: item.title,
      type: item.type,
      posterUrl: item.posterUrl,
      rating: item.rating ?? null,
      year: item.year ?? null,
      genre: item.genre,
      source: item.source,
      status: resolvedStatus,
      completedAt: resolvedStatus === "COMPLETED" ? resolvedCompletedAt : null,
    });

    return toLibraryItem(existing);
  }

  const created = await LibraryEntry.create({
    id: item.id,
    userId,
    externalId: item.externalId,
    title: item.title,
    type: item.type,
    posterUrl: item.posterUrl,
    rating: item.rating ?? null,
    year: item.year ?? null,
    genre: item.genre,
    source: item.source,
    status: resolvedStatus,
    completedAt: resolvedCompletedAt,
  });

  return toLibraryItem(created);
};

export const listLibraryItems = async (
  userId: string,
): Promise<LibraryItem[]> => {
  ensureDatabase();
  const entries = await LibraryEntry.findAll({
    where: { userId },
    order: [["updatedAt", "DESC"]],
  });

  return entries.map(toLibraryItem);
};

export const addToLibrary = (item: ExploreItem, userId: string) =>
  upsertEntry(item, "PLAN_TO_WATCH", userId);

export const updateLibraryStatus = async (
  id: string,
  status: LibraryStatus,
  userId: string,
): Promise<LibraryItem | null> => {
  ensureDatabase();
  const entry = await LibraryEntry.findOne({ where: { id, userId } });

  if (!entry) {
    return null;
  }

  await entry.update({
    status,
    completedAt: status === "COMPLETED" ? new Date() : null,
  });

  return toLibraryItem(entry);
};

export const getLibraryIds = async (
  userId: string,
): Promise<Set<string>> => {
  ensureDatabase();
  const entries = await LibraryEntry.findAll({
    where: { userId },
    attributes: ["id"],
    raw: true,
  });

  return new Set(entries.map((entry) => entry.id));
};

export const removeLibraryItem = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  ensureDatabase();
  const deletedCount = await LibraryEntry.destroy({ where: { id, userId } });
  return deletedCount > 0;
};
