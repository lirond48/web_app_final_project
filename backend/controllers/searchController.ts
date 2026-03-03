import Post from "../model/postModel.js";
import { parseSearchQueryToFilters, SearchAiError } from "../src/clients/llmClient.js";
import { DEFAULT_SEARCH_FILTERS, SearchFilters } from "../src/types/search.js";

const MIN_QUERY_LENGTH = 3;
const FILTERS_CACHE_TTL_MS = 10 * 60 * 1000;
const RESULTS_CACHE_TTL_MS = 90 * 1000;
const MAX_CANDIDATES = 50;
const DEFAULT_TOP_K = 20;
const MAX_TOP_K = 30;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type RankedResult = {
  post: Record<string, unknown>;
  score: number;
};

const filtersCache = new Map<string, CacheEntry<SearchFilters>>();
const resultsCache = new Map<string, CacheEntry<RankedResult[]>>();

function getCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = cache.get(key);
  if (!hit) {
    return null;
  }

  if (Date.now() >= hit.expiresAt) {
    cache.delete(key);
    return null;
  }

  return hit.value;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegexOr(words: string[]): RegExp | null {
  const clean = [...new Set(words.filter(Boolean).map((w) => w.toLowerCase()))];
  if (clean.length === 0) {
    return null;
  }
  return new RegExp(clean.map(escapeRegex).join("|"), "i");
}

function postHasField(field: string): boolean {
  return Boolean((Post.schema as any).path(field));
}

function pickQueryField(name: string): string | null {
  if (postHasField(name)) {
    return name;
  }
  return null;
}

function buildMongoQuery(rawQuery: string, filters: SearchFilters) {
  const qTokens = tokenize(rawQuery);
  const includeWords = [...new Set([...filters.include_keywords, ...qTokens])];
  const excludeWords = [...new Set(filters.exclude_keywords)];

  const andClauses: any[] = [];

  const descriptionField = pickQueryField("description");
  const tagsField = pickQueryField("tags");

  const includeRegex = buildRegexOr(includeWords);
  if (includeRegex) {
    const includeTargets: any[] = [];
    if (descriptionField) {
      includeTargets.push({ [descriptionField]: includeRegex });
    }
    if (tagsField) {
      includeTargets.push({ [tagsField]: includeRegex });
    }
    if (includeTargets.length > 0) {
      andClauses.push({ $or: includeTargets });
    }
  }

  const excludeRegex = buildRegexOr(excludeWords);
  if (excludeRegex) {
    const excludeTargets: any[] = [];
    if (descriptionField) {
      excludeTargets.push({ [descriptionField]: { $not: excludeRegex } });
    }
    if (tagsField) {
      excludeTargets.push({ [tagsField]: { $not: excludeRegex } });
    }
    if (excludeTargets.length > 0) {
      andClauses.push({ $and: excludeTargets });
    }
  }

  const occasionField = pickQueryField("occasion");
  if (occasionField && filters.occasion) {
    andClauses.push({ [occasionField]: new RegExp(`^${escapeRegex(filters.occasion)}$`, "i") });
  }
  const styleField = pickQueryField("style");
  if (styleField && filters.style) {
    andClauses.push({ [styleField]: new RegExp(`^${escapeRegex(filters.style)}$`, "i") });
  }
  const seasonField = pickQueryField("season");
  if (seasonField && filters.season) {
    andClauses.push({ [seasonField]: new RegExp(`^${escapeRegex(filters.season)}$`, "i") });
  }
  const genderField = pickQueryField("gender");
  if (genderField && filters.gender) {
    andClauses.push({ [genderField]: new RegExp(`^${escapeRegex(filters.gender)}$`, "i") });
  }

  return andClauses.length > 0 ? { $and: andClauses } : {};
}

function computeScore(post: Record<string, unknown>, rawQuery: string, filters: SearchFilters): number {
  const text = [post.description, ...(Array.isArray(post.tags) ? post.tags : [])]
    .filter((x) => typeof x === "string")
    .join(" ")
    .toLowerCase();

  const includeWords = [...new Set([...filters.include_keywords, ...tokenize(rawQuery)])];
  let score = 0;
  for (const word of includeWords) {
    if (word && text.includes(word.toLowerCase())) {
      score += 1;
    }
  }

  return score;
}

async function fallbackKeywordSearch(rawQuery: string) {
  const tokens = tokenize(rawQuery);
  const regex = buildRegexOr(tokens);
  const query = regex ? { description: regex } : {};
  const posts = await Post.find(query).sort({ created_at: -1 }).limit(MAX_CANDIDATES).lean();
  return posts.map((post) => ({
    post,
    score: computeScore(post as Record<string, unknown>, rawQuery, DEFAULT_SEARCH_FILTERS),
  }));
}

async function searchPosts(req, res) {
  try {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (rawQuery.length < MIN_QUERY_LENGTH) {
      return res.json({ results: [] });
    }

    const normalizedQuery = rawQuery.toLowerCase();
    const cachedResults = getCache(resultsCache, normalizedQuery);
    if (cachedResults) {
      res.setHeader("X-Search-Results-Cache", "HIT");
      return res.json({ results: cachedResults });
    }
    res.setHeader("X-Search-Results-Cache", "MISS");

    let filters = getCache(filtersCache, normalizedQuery);
    if (filters) {
      res.setHeader("X-Search-Filters-Cache", "HIT");
      console.info(`[search] filters cache hit for query="${normalizedQuery}"`);
    } else {
      res.setHeader("X-Search-Filters-Cache", "MISS");
      console.info(`[search] filters cache miss for query="${normalizedQuery}"`);
      try {
        filters = await parseSearchQueryToFilters(rawQuery);
      } catch (error) {
        if (error instanceof SearchAiError) {
          console.warn(`[search] AI parsing failed, using keyword fallback. ${error.message}`);
          const fallback = await fallbackKeywordSearch(rawQuery);
          const top = fallback.sort((a, b) => b.score - a.score).slice(0, DEFAULT_TOP_K);
          setCache(resultsCache, normalizedQuery, top, RESULTS_CACHE_TTL_MS);
          return res.json({ results: top });
        }
        throw error;
      }

      setCache(filtersCache, normalizedQuery, filters, FILTERS_CACHE_TTL_MS);
    }

    const mongoQuery = buildMongoQuery(rawQuery, filters);
    const maxResults = filters.max_results ? Math.min(MAX_TOP_K, filters.max_results) : DEFAULT_TOP_K;

    const posts = await Post.find(mongoQuery).sort({ created_at: -1 }).limit(MAX_CANDIDATES).lean();
    const ranked = posts
      .map((post) => ({
        post,
        score: computeScore(post as Record<string, unknown>, rawQuery, filters as SearchFilters),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    setCache(resultsCache, normalizedQuery, ranked, RESULTS_CACHE_TTL_MS);
    return res.json({ results: ranked });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}

export { searchPosts };
