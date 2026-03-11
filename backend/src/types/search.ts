/**
 * Shared search filter types used by AI parser and search controller.
 *
 * Responsibility:
 * - Define strict JSON shape expected from AI parsing.
 *
 * Called by:
 * - `src/clients/llmClient.ts`
 * - `controllers/searchController.ts`
 *
 * Returns:
 * - Type definitions only (no runtime I/O).
 *
 * Must NOT be used by:
 * - Frontend direct LLM integration logic.
 */

/**
 * Structured filter schema extracted from free-text queries.
 *
 * Example:
 * - `{ occasion: "wedding", colors: ["white"], include_keywords: ["elegant"], ... }`
 */
export type SearchFilters = {
  occasion: string | null;
  style: string | null;
  colors: string[];
  season: string | null;
  gender: "male" | "female" | "unisex" | null;
  include_keywords: string[];
  exclude_keywords: string[];
  max_results: number | null;
};

/**
 * Default empty filter object used for fallback scoring and initialization.
 *
 * Example:
 * - `computeScore(post, q, DEFAULT_SEARCH_FILTERS)`
 */
export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  occasion: null,
  style: null,
  colors: [],
  season: null,
  gender: null,
  include_keywords: [],
  exclude_keywords: [],
  max_results: null,
};
