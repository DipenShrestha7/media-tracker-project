export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const getImageUrl = (path?: string | null) => {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_URL ? `${API_URL}${normalizedPath}` : normalizedPath;
};
