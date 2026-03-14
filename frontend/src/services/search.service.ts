/**
 * Frontend gateway for smart search requests.
 *
 * Responsibility:
 * - Call backend `/api/search` and return typed response for UI components.
 *
 * Must NOT do:
 * - No direct calls to LLM endpoints (`/api/generate`, `/api/embeddings`, or remote AI base URL).
 * - Frontend always uses backend as the only search API.
 */
import { Post } from "./post.service";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Builds an absolute API URL from relative path.
 *
 * Example:
 * - `buildApiUrl("/api/search?q=wedding")`
 */
const buildApiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

export interface SearchResultItem {
  post: Post;
  score: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
}

class SearchService {
  /**
   * Executes backend smart search.
   *
   * Inputs:
   * - `q`: user free-text query.
   * - `signal`: optional abort signal for canceling in-flight requests.
   *
   * Returns:
   * - `{ results: [{ post, score }] }` matching backend contract.
   *
   * Side effects:
   * - Network call to backend `/api/search`.
   *
   * Failure behavior:
   * - Throws `Error` on non-2xx responses.
   *
   * Example:
   * - `await searchService.searchPosts("elegant white wedding", controller.signal)`
   */
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
