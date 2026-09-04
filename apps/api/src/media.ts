export type ExploreType =
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
  type: ExploreType;
  posterUrl: string;
  rating: number | undefined;
  year: number | undefined;
  genre: string[];
  source: "OMDB" | "ANILIST" | "TVMAZE";
  inLibrary?: boolean;
}

export interface ExploreResponse {
  moviesAndSeries: ExploreItem[];
  animeManga: ExploreItem[];
  kdramas: ExploreItem[];
}

const FALLBACK_POSTER =
  "https://placehold.co/600x900/0f172a/ffffff?text=No+Poster";

const OMDB_SEARCH_TERMS = [
  "space",
  "time",
  "dark",
  "night",
  "life",
  "love",
  "king",
  "future",
  "world",
  "hero",
];

const TVMAZE_SEARCH_TERMS = ["korean", "k-drama", "korea", "drama"];

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index]!;
    const randomItem = copy[randomIndex]!;
    copy[index] = randomItem;
    copy[randomIndex] = current;
  }

  return copy;
};

const uniqueBy = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const parseYear = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
};

const formatPoster = (poster?: string | null): string => {
  if (!poster || poster === "N/A") {
    return FALLBACK_POSTER;
  }

  return poster;
};

const safeNumber = (value?: string | number | null): number | undefined => {
  if (value === undefined || value === null || value === "N/A") {
    return undefined;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isNaN(numericValue) ? undefined : numericValue;
};

const selectRandomTerms = (terms: string[], count: number): string[] =>
  shuffle(terms).slice(0, count);

interface OmdbSearchResult {
  imdbID: string;
  Title: string;
  Type: string;
  Poster?: string;
  Year?: string;
}

async function fetchOmdbSearchResults(
  apiKey: string,
  searchTerm?: string,
): Promise<ExploreItem[]> {
  const selectedTerms = searchTerm?.trim()
    ? [searchTerm.trim()]
    : selectRandomTerms(OMDB_SEARCH_TERMS, 5);

  const searchResults = await Promise.all(
    selectedTerms.map(async (term) => {
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(term)}`,
      );

      if (!response.ok) {
        return [];
      }

      const payload: {
        Response?: string;
        Search?: OmdbSearchResult[];
      } = await response.json();

      if (payload.Response !== "True" || !payload.Search) {
        return [];
      }

      return payload.Search;
    }),
  );

  const pool = uniqueBy(searchResults.flat(), (item) => item.imdbID).filter(
    (item) => item.Type === "movie" || item.Type === "series",
  );

  const pickedItems = shuffle(pool).slice(0, 10);

  const detailedItems = await Promise.all(
    pickedItems.map(async (item): Promise<ExploreItem | null> => {
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(item.imdbID)}&plot=short&r=json`,
      );

      if (!response.ok) {
        return null;
      }

      const detail: {
        Response?: string;
        imdbID: string;
        Title?: string;
        Poster?: string;
        imdbRating?: string;
        Genre?: string;
        Year?: string;
        Type?: string;
      } = await response.json();

      if (detail.Response !== "True" || !detail.Title) {
        return null;
      }

      return {
        id: `omdb-${detail.imdbID}`,
        externalId: detail.imdbID,
        title: detail.Title,
        type: detail.Type === "series" ? "TV_SHOW" : "MOVIE",
        posterUrl: formatPoster(detail.Poster),
        rating: safeNumber(detail.imdbRating),
        year: parseYear(detail.Year),
        genre: detail.Genre
          ? detail.Genre.split(",")
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [],
        source: "OMDB",
      };
    }),
  );

  return detailedItems.filter((item): item is ExploreItem => item !== null);
}

async function fetchAniListItems(searchTerm?: string): Promise<ExploreItem[]> {
  const query = async (
    mediaType: "ANIME" | "MANGA",
    perPage: number,
  ): Promise<
    Array<{
      id: number;
      type?: string;
      countryOfOrigin?: string | null;
      format?: string;
      averageScore?: number | null;
      genres?: string[] | null;
      coverImage?: {
        extraLarge?: string | null;
        large?: string | null;
      } | null;
      title?: {
        romaji?: string | null;
        english?: string | null;
        native?: string | null;
      } | null;
      startDate?: { year?: number | null } | null;
    }>
  > => {
    const response = await fetch("https://graphql.anilist.co/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: `
          query ExploreMedia($page: Int!, $perPage: Int!, $type: MediaType, $search: String) {
            Page(page: $page, perPage: $perPage) {
              media(type: $type, search: $search, sort: POPULARITY_DESC, isAdult: false) {
                id
                type
                countryOfOrigin
                averageScore
                genres
                coverImage {
                  extraLarge
                  large
                }
                title {
                  romaji
                  english
                  native
                }
                startDate {
                  year
                }
              }
            }
          }
        `,
        variables: {
          page: 1,
          perPage,
          type: mediaType,
          search: searchTerm?.trim() || undefined,
        },
      }),
    });

    if (!response.ok) {
      return [];
    }

    const payload: {
      data?: {
        Page?: {
          media?: Array<{
            id: number;
            type?: string;
            countryOfOrigin?: string | null;
            format?: string;
            averageScore?: number | null;
            genres?: string[] | null;
            coverImage?: {
              extraLarge?: string | null;
              large?: string | null;
            } | null;
            title?: {
              romaji?: string | null;
              english?: string | null;
              native?: string | null;
            } | null;
            startDate?: { year?: number | null } | null;
          }>;
        };
      };
      errors?: Array<{ message?: string }>;
    } = await response.json();

    if (!payload.data?.Page?.media) {
      return [];
    }

    return payload.data.Page.media;
  };

  const [animeResults, mangaResults] = await Promise.all([
    query("ANIME", 20).catch(() => []),
    query("MANGA", 20).catch(() => []),
  ]);

  const animeItems = animeResults.map((item) => ({
    id: `anilist-anime-${item.id}`,
    externalId: String(item.id),
    title:
      item.title?.english ||
      item.title?.romaji ||
      item.title?.native ||
      "Untitled",
    type: "ANIME" as const,
    posterUrl:
      item.coverImage?.extraLarge || item.coverImage?.large || FALLBACK_POSTER,
    rating:
      typeof item.averageScore === "number"
        ? Number((item.averageScore / 10).toFixed(1))
        : undefined,
    year: item.startDate?.year ?? undefined,
    genre: item.genres?.slice(0, 4) ?? [],
    source: "ANILIST" as const,
  }));

  const mangaItems = mangaResults.map((item) => {
    const isManhwa = item.countryOfOrigin === "KR" || item.format === "MANHWA";

    return {
      id: `anilist-manga-${item.id}`,
      externalId: String(item.id),
      title:
        item.title?.english ||
        item.title?.romaji ||
        item.title?.native ||
        "Untitled",
      type: isManhwa ? ("MANHWA" as const) : ("MANGA" as const),
      posterUrl:
        item.coverImage?.extraLarge ||
        item.coverImage?.large ||
        FALLBACK_POSTER,
      rating:
        typeof item.averageScore === "number"
          ? Number((item.averageScore / 10).toFixed(1))
          : undefined,
      year: item.startDate?.year ?? undefined,
      genre: item.genres?.slice(0, 4) ?? [],
      source: "ANILIST" as const,
    };
  });

  return [...animeItems, ...mangaItems];
}

async function fetchTvMazeItems(searchTerm?: string): Promise<ExploreItem[]> {
  const selectedTerms = searchTerm?.trim()
    ? [searchTerm.trim()]
    : selectRandomTerms(TVMAZE_SEARCH_TERMS, TVMAZE_SEARCH_TERMS.length);

  const searchResults = await Promise.all(
    selectedTerms.map(async (term) => {
      const response = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(term)}`,
      );

      if (!response.ok) {
        return [];
      }

      const payload: Array<{
        score: number;
        show: {
          id: number;
          name: string;
          language?: string | null;
          genres?: string[] | null;
          premiered?: string | null;
          rating?: { average?: number | null } | null;
          image?: { medium?: string | null; original?: string | null } | null;
        };
      }> = await response.json();

      return payload;
    }),
  );

  const pool = uniqueBy(
    searchResults
      .flat()
      .filter(
        ({ show }) =>
          show.language === "Korean" || /korea|k-drama/i.test(show.name),
      ),
    ({ show }) => String(show.id),
  );

  return shuffle(pool)
    .slice(0, 10)
    .map(({ show }) => ({
      id: `tvmaze-${show.id}`,
      externalId: String(show.id),
      title: show.name,
      type: "KDRAMA" as const,
      posterUrl: show.image?.original || show.image?.medium || FALLBACK_POSTER,
      rating: show.rating?.average ?? undefined,
      year: parseYear(show.premiered),
      genre: show.genres?.slice(0, 4) ?? ["Drama"],
      source: "TVMAZE" as const,
    }));
}

const CANDIDATE_TYPE_MAP: Record<string, ExploreType> = {
  movie: "MOVIE",
  movies: "MOVIE",
  series: "TV_SHOW",
  tv: "TV_SHOW",
  tv_show: "TV_SHOW",
  "tv show": "TV_SHOW",
  kdrama: "KDRAMA",
  "k-drama": "KDRAMA",
  anime: "ANIME",
  manga: "MANGA",
  manhwa: "MANHWA",
};

const mapCandidateType = (value?: string): ExploreType => {
  if (!value) {
    return "MOVIE";
  }

  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  return CANDIDATE_TYPE_MAP[normalized] ?? (value.toUpperCase() as ExploreType);
};

const inferSource = (
  type: ExploreType,
  hint?: string,
): ExploreItem["source"] => {
  const normalized = hint?.toUpperCase();
  if (normalized === "OMDB" || normalized === "ANILIST" || normalized === "TVMAZE") {
    return normalized;
  }

  if (type === "ANIME" || type === "MANGA" || type === "MANHWA") {
    return "ANILIST";
  }
  if (type === "KDRAMA") {
    return "TVMAZE";
  }
  return "OMDB";
};

const stubExploreItem = (
  candidate: {
    title?: string;
    year?: number | null;
    type?: string;
    source_hint?: string;
    source?: string;
  },
  index: number,
): ExploreItem => {
  const type = mapCandidateType(candidate.type);
  return {
    id: `rec-${index}-${(candidate.title || "unknown").toLowerCase().replace(/\s+/g, "-")}`,
    externalId: candidate.title || `rec-${index}`,
    title: candidate.title || "Unknown Media",
    type,
    posterUrl: FALLBACK_POSTER,
    rating: undefined,
    year: candidate.year ?? undefined,
    genre: [],
    source: inferSource(type, candidate.source_hint || candidate.source),
  };
};

async function lookupOmdbTitle(
  apiKey: string,
  title: string,
  year?: number,
  type?: ExploreType,
): Promise<ExploreItem | null> {
  const params = new URLSearchParams({
    apikey: apiKey,
    t: title,
    plot: "short",
    r: "json",
  });
  if (year) {
    params.set("y", String(year));
  }
  if (type === "TV_SHOW") {
    params.set("type", "series");
  } else if (type === "MOVIE") {
    params.set("type", "movie");
  }

  const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  if (!response.ok) {
    return null;
  }

  const detail: {
    Response?: string;
    imdbID?: string;
    Title?: string;
    Poster?: string;
    imdbRating?: string;
    Genre?: string;
    Year?: string;
    Type?: string;
  } = await response.json();

  if (detail.Response !== "True" || !detail.imdbID || !detail.Title) {
    return null;
  }

  return {
    id: `omdb-${detail.imdbID}`,
    externalId: detail.imdbID,
    title: detail.Title,
    type: detail.Type === "series" ? "TV_SHOW" : "MOVIE",
    posterUrl: formatPoster(detail.Poster),
    rating: safeNumber(detail.imdbRating),
    year: parseYear(detail.Year) ?? year,
    genre: detail.Genre
      ? detail.Genre.split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [],
    source: "OMDB",
  };
}

async function lookupAniListTitle(
  title: string,
  type: "ANIME" | "MANGA" | "MANHWA",
): Promise<ExploreItem | null> {
  const mediaType = type === "ANIME" ? "ANIME" : "MANGA";
  const response = await fetch("https://graphql.anilist.co/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: `
        query RecMedia($search: String!, $type: MediaType) {
          Page(page: 1, perPage: 1) {
            media(search: $search, type: $type, isAdult: false, sort: SEARCH_MATCH) {
              id
              type
              countryOfOrigin
              format
              averageScore
              genres
              coverImage { extraLarge large }
              title { romaji english native }
              startDate { year }
            }
          }
        }
      `,
      variables: { search: title, type: mediaType },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload: {
    data?: {
      Page?: {
        media?: Array<{
          id: number;
          countryOfOrigin?: string | null;
          format?: string | null;
          averageScore?: number | null;
          genres?: string[] | null;
          coverImage?: { extraLarge?: string | null; large?: string | null } | null;
          title?: {
            romaji?: string | null;
            english?: string | null;
            native?: string | null;
          } | null;
          startDate?: { year?: number | null } | null;
        }>;
      };
    };
  } = await response.json();

  const item = payload.data?.Page?.media?.[0];
  if (!item) {
    return null;
  }

  const isManhwa = item.countryOfOrigin === "KR" || item.format === "MANHWA";
  const resolvedType: ExploreType =
    mediaType === "ANIME" ? "ANIME" : isManhwa ? "MANHWA" : "MANGA";

  return {
    id: `anilist-${resolvedType.toLowerCase()}-${item.id}`,
    externalId: String(item.id),
    title:
      item.title?.english ||
      item.title?.romaji ||
      item.title?.native ||
      title,
    type: resolvedType,
    posterUrl:
      item.coverImage?.extraLarge || item.coverImage?.large || FALLBACK_POSTER,
    rating:
      typeof item.averageScore === "number"
        ? Number((item.averageScore / 10).toFixed(1))
        : undefined,
    year: item.startDate?.year ?? undefined,
    genre: item.genres?.slice(0, 4) ?? [],
    source: "ANILIST",
  };
}

async function lookupTvMazeTitle(title: string): Promise<ExploreItem | null> {
  const response = await fetch(
    `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`,
  );
  if (!response.ok) {
    return null;
  }

  const show: {
    id: number;
    name: string;
    genres?: string[] | null;
    premiered?: string | null;
    rating?: { average?: number | null } | null;
    image?: { medium?: string | null; original?: string | null } | null;
  } = await response.json();

  if (!show?.id) {
    return null;
  }

  return {
    id: `tvmaze-${show.id}`,
    externalId: String(show.id),
    title: show.name,
    type: "KDRAMA",
    posterUrl: show.image?.original || show.image?.medium || FALLBACK_POSTER,
    rating: show.rating?.average ?? undefined,
    year: parseYear(show.premiered),
    genre: show.genres?.slice(0, 4) ?? ["Drama"],
    source: "TVMAZE",
  };
}

export async function hydrateMediaCandidates(
  candidates: Array<{
    title?: string;
    year?: number | null;
    type?: string;
    source_hint?: string;
    source?: string;
    posterUrl?: string;
    poster_url?: string;
    id?: string;
    externalId?: string;
    rating?: number | null;
    genre?: string[];
    genres?: string[];
  }>,
): Promise<ExploreItem[]> {
  const apiKey = process.env.OMDB_API_KEY;

  return Promise.all(
    candidates.map(async (candidate, index) => {
      const existingPoster = candidate.posterUrl || candidate.poster_url;
      if (existingPoster && candidate.id && candidate.externalId) {
        const type = mapCandidateType(candidate.type);
        return {
          id: candidate.id,
          externalId: candidate.externalId,
          title: candidate.title || "Unknown Media",
          type,
          posterUrl: existingPoster,
          rating: candidate.rating ?? undefined,
          year: candidate.year ?? undefined,
          genre: candidate.genre || candidate.genres || [],
          source: inferSource(type, candidate.source_hint || candidate.source),
        };
      }

      const type = mapCandidateType(candidate.type);
      const source = inferSource(type, candidate.source_hint || candidate.source);
      const title = candidate.title?.trim();
      if (!title) {
        return stubExploreItem(candidate, index);
      }

      try {
        let hydrated: ExploreItem | null = null;
        if (source === "ANILIST") {
          hydrated = await lookupAniListTitle(
            title,
            type === "ANIME" ? "ANIME" : type === "MANHWA" ? "MANHWA" : "MANGA",
          );
        } else if (source === "TVMAZE") {
          hydrated = await lookupTvMazeTitle(title);
        } else if (apiKey) {
          hydrated = await lookupOmdbTitle(apiKey, title, candidate.year ?? undefined, type);
        }

        return hydrated ?? stubExploreItem(candidate, index);
      } catch {
        return stubExploreItem(candidate, index);
      }
    }),
  );
}

export async function buildExploreResponse(
  searchTerm?: string,
  libraryIds?: Set<string>,
): Promise<ExploreResponse> {
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    throw new Error("OMDB_API_KEY is missing from the backend environment.");
  }

  const [moviesAndSeries, animeManga, kdramas] = await Promise.all([
    fetchOmdbSearchResults(apiKey, searchTerm).catch(() => []),
    fetchAniListItems(searchTerm).catch(() => []),
    fetchTvMazeItems(searchTerm).catch(() => []),
  ]);

  const stamp = (items: ExploreItem[]): ExploreItem[] =>
    libraryIds
      ? items.map((item) => ({ ...item, inLibrary: libraryIds.has(item.id) }))
      : items;

  return {
    moviesAndSeries: stamp(moviesAndSeries),
    animeManga: stamp(animeManga),
    kdramas: stamp(kdramas),
  };
}
