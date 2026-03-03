import { Post } from "./postService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const buildApiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

export interface SearchResultItem {
  post: Post;
  score: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
}

class SearchService {
  async searchPosts(q: string, signal?: AbortSignal): Promise<SearchResponse> {
    const url = buildApiUrl(`/api/search?q=${encodeURIComponent(q.trim())}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to search posts" }));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<SearchResponse>;
  }
}

export const searchService = new SearchService();
