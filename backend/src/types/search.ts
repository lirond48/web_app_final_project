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
