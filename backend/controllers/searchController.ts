/**
 * Backend smart-search controller (`GET /api/search`).
 *
 * Responsibility:
 * - Validate query length.
 * - Apply in-memory protections (results cache + filters cache).
 * - Parse query into structured filters via AI client (mock/live).
 * - Build Mongo query and compute heuristic score.
 * - Fall back to plain keyword search if AI parsing fails.
 *
 * Called by:
 * - `routes/searchRoutes.ts`
 *
 * Returns:
 * - `{ results: [{ post: <existing Post shape>, score: number }] }`
 *
 * Must NOT be used by:
 * - Frontend direct AI calls; frontend must call backend `/api/search` only.
 */
import Post from "../model/postModel.js";
import { parseSearchQueryToFilters, SearchAiError } from "../src/clients/llmClient.js";
import { DEFAULT_SEARCH_FILTERS, SearchFilters } from "../src/types/search.js";

/** Minimum query length protection enforced before any AI/database work. */
const MIN_QUERY_LENGTH = 3;
/** Cache TTL for query->filters (AI output). */
const FILTERS_CACHE_TTL_MS = 10 * 60 * 1000;
/** Short TTL for query->final ranked results. */
const RESULTS_CACHE_TTL_MS = 90 * 1000;
/** Candidate cap before local scoring. */
const MAX_CANDIDATES = 50;
/** Default number of results returned. */
const DEFAULT_TOP_K = 20;
/** Hard cap to protect payload size and query fanout. */
const MAX_TOP_K = 30;
const DEBUG_AI = process.env.DEBUG_AI === "true";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type RankedResult = {
  post: Record<string, unknown>;
  score: number;
};

type AiPath = "live" | "mock" | "fallback";

type SearchMeta = {
  aiUsed: boolean;
  aiPath: AiPath;
};

/**
 * In-memory cache for AI parsed filters.
 * Key strategy: normalized query string.
 */
const filtersCache = new Map<string, CacheEntry<SearchFilters>>();
/**
 * In-memory cache for final search results.
 * Key strategy: normalized query string.
 */
const resultsCache = new Map<string, CacheEntry<RankedResult[]>>();
/** Metadata cache for result provenance (live/mock/fallback) used for response headers. */
const resultsMetaCache = new Map<string, CacheEntry<SearchMeta>>();

/**
 * DEBUG_AI-only logger for search flow internals.
 *
 * Example:
 * - `debugAiLog("results cache hit", { query: normalizedQuery })`
 */
function debugAiLog(message: string, extra?: Record<string, unknown>): void {
  if (!DEBUG_AI) {
    return;
  }
  if (extra) {
    console.log(`[ai-debug] ${message}`, extra);
    return;
  }
  console.log(`[ai-debug] ${message}`);
}

/**
 * Reads a cached value and drops expired entries.
 *
 * Inputs:
 * - `cache`: target cache map.
 * - `key`: normalized query key.
 *
 * Returns:
 * - Cached value or `null` if missing/expired.
 *
 * Side effects:
 * - Deletes stale entries.
 *
 * Example:
 * - `const cached = getCache(resultsCache, "white wedding");`
 */
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

/**
 * Stores value in cache with absolute expiry.
 *
 * Inputs:
 * - `cache`, `key`, `value`, `ttlMs`.
 *
 * Side effects:
 * - Writes cache entry.
 *
 * Example:
 * - `setCache(filtersCache, "sporty", filters, FILTERS_CACHE_TTL_MS);`
 */
function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Writes verifiable AI execution headers onto the HTTP response.
 *
 * Inputs:
 * - `mode`: resolved runtime mode (`mock` or `live` from env).
 * - `aiUsed`: whether this request path used AI parsing logic (or cached AI result).
 * - `aiPath`: `live` | `mock` | `fallback`.
 * - `aiCall`: whether this request actually attempted a live `/api/generate` call.
 */
function setAiHeaders(
  res,
  mode: "mock" | "live",
  aiUsed: boolean,
  aiPath: AiPath,
  aiCall: "yes" | "no"
): void {
  res.setHeader("X-AI-Mode", mode);
  res.setHeader("X-AI-Used", aiUsed ? "true" : "false");
  res.setHeader("X-AI-Path", aiPath);
  res.setHeader("X-AI-Call", aiCall);
}

/**
 * Tokenizes query for both fallback search and scoring.
 *
 * Inputs:
 * - `query`: raw search text.
 *
 * Returns:
 * - Normalized lowercase tokens (len >= 2).
 *
 * Example:
 * - `tokenize("Elegant white wedding")`
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

/**
 * Escapes regex meta characters to avoid unintended patterns.
 *
 * Inputs:
 * - `value`: raw keyword.
 *
 * Returns:
 * - Regex-safe text.
 *
 * Example:
 * - `escapeRegex("c++") // "c\\+\\+"`
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds one case-insensitive OR regex from word list.
 *
 * Inputs:
 * - `words`: candidate keywords.
 *
 * Returns:
 * - `RegExp` or `null` if no usable words.
 *
 * Example:
 * - `buildRegexOr(["white","wedding"]) // /white|wedding/i`
 */
function buildRegexOr(words: string[]): RegExp | null {
  const clean = [...new Set(words.filter(Boolean).map((w) => w.toLowerCase()))];
  if (clean.length === 0) {
    return null;
  }
  return new RegExp(clean.map(escapeRegex).join("|"), "i");
}

/**
 * Checks if a path exists in current Post schema.
 *
 * Inputs:
 * - `field`: schema field name.
 *
 * Returns:
 * - `true` when field is present.
 *
 * Example:
 * - `postHasField("occasion")`
 */
function postHasField(field: string): boolean {
  return Boolean((Post.schema as any).path(field));
}

/**
 * Returns queryable field name only if schema supports it.
 *
 * Inputs:
 * - `name`: preferred field name.
 *
 * Returns:
 * - Same name or `null`.
 *
 * Example:
 * - `const seasonField = pickQueryField("season");`
 */
function pickQueryField(name: string): string | null {
  if (postHasField(name)) {
    return name;
  }
  return null;
}

/**
 * Translates AI filters + query text into a Mongo find query.
 *
 * Inputs:
 * - `rawQuery`: original query.
 * - `filters`: normalized AI filters.
 *
 * Returns:
 * - Mongo query object.
 *
 * Side effects:
 * - None.
 *
 * Failure behavior:
 * - Produces `{}` when no filters can be applied.
 *
 * Example:
 * - `const mongoQuery = buildMongoQuery("white wedding", filters);`
 */
function buildMongoQuery(rawQuery: string, filters: SearchFilters) {
  const qTokens = tokenize(rawQuery);
  const includeWords = [...new Set([...filters.include_keywords, ...qTokens])];
  const excludeWords = [...new Set(filters.exclude_keywords)];

  const andClauses: any[] = [];
  const orClauses: any[] = [];

  const descriptionField = pickQueryField("description");
  const tagsField = pickQueryField("tags");

  const includeRegex = buildRegexOr(includeWords);
  if (includeRegex) {
    if (descriptionField) {
      orClauses.push({ [descriptionField]: includeRegex });
    }
    if (tagsField) {
      orClauses.push({ [tagsField]: includeRegex });
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
    orClauses.push({ [occasionField]: new RegExp(`^${escapeRegex(filters.occasion)}$`, "i") });
  }
  const styleField = pickQueryField("style");
  if (styleField && filters.style) {
    orClauses.push({ [styleField]: new RegExp(`^${escapeRegex(filters.style)}$`, "i") });
  }
  const seasonField = pickQueryField("season");
  if (seasonField && filters.season) {
    orClauses.push({ [seasonField]: new RegExp(`^${escapeRegex(filters.season)}$`, "i") });
  }
  const colorsField = pickQueryField("colors");
  if (colorsField && filters.colors.length > 0) {
    const colorsRegex = buildRegexOr(filters.colors);
    if (colorsRegex) {
      orClauses.push({ [colorsField]: colorsRegex });
    }
  }
  const genderField = pickQueryField("gender");
  if (genderField && filters.gender) {
    orClauses.push({ [genderField]: new RegExp(`^${escapeRegex(filters.gender)}$`, "i") });
  }

  if (orClauses.length > 0) {
    andClauses.push({ $or: orClauses });
  }

  return andClauses.length > 0 ? { $and: andClauses } : {};
}

/**
 * Computes simple heuristic relevance score for one post.
 *
 * Inputs:
 * - `post`: Mongo post document.
 * - `rawQuery`: user query.
 * - `filters`: AI filters.
 *
 * Returns:
 * - Integer-like score (higher is better).
 *
 * Side effects:
 * - None.
 *
 * Example:
 * - `const score = computeScore(post, "sporty winter", filters);`
 */
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

/**
 * Keyword-only fallback search when AI parse is unavailable.
 *
 * Inputs:
 * - `rawQuery`: user query.
 *
 * Returns:
 * - Ranked results list with same `{post, score}` shape.
 *
 * Side effects:
 * - Mongo read query.
 *
 * Failure behavior:
 * - Propagates DB errors to controller handler.
 *
 * Example:
 * - `const fallback = await fallbackKeywordSearch("elegant white");`
 */
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

/**
 * Express handler for `/api/search`.
 *
 * Inputs:
 * - `req.query.q`: free-text query.
 *
 * Returns:
 * - JSON `{ results: [{ post, score }] }`.
 *
 * Side effects:
 * - Cache reads/writes.
 * - Optional AI call (mock/live via client).
 * - Mongo query.
 *
 * Protections:
 * - Min query length check here (`MIN_QUERY_LENGTH`).
 * - Rate limiting is enforced in middleware (`searchRateLimit`).
 * - Filters cache (10m) and results cache (~90s) are applied here.
 *
 * Failure behavior:
 * - AI parse failure => keyword fallback search.
 * - Unexpected errors => HTTP 500 with message.
 *
 * Example:
 * - `GET /api/search?q=elegant white wedding`
 */
async function searchPosts(req, res) {
  try {
    const mode = process.env.LLM_MODE === "live" ? "live" : "mock";
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (rawQuery.length < MIN_QUERY_LENGTH) {
      debugAiLog("min query length check returned empty results", { rawQueryLength: rawQuery.length });
      setAiHeaders(res, mode, false, "fallback", "no");
      return res.json({ results: [] });
    }

    const normalizedQuery = rawQuery.toLowerCase();
    const cachedResults = getCache(resultsCache, normalizedQuery);
    if (cachedResults) {
      res.setHeader("X-Search-Results-Cache", "HIT");
      debugAiLog("results cache hit", { query: normalizedQuery });
      const meta = getCache(resultsMetaCache, normalizedQuery);
      if (meta) {
        setAiHeaders(res, mode, meta.aiUsed, meta.aiPath, "no");
      } else {
        const fallbackPath: AiPath = mode === "mock" ? "mock" : "fallback";
        setAiHeaders(res, mode, mode === "mock", fallbackPath, "no");
      }
      return res.json({ results: cachedResults });
    }
    res.setHeader("X-Search-Results-Cache", "MISS");
    debugAiLog("results cache miss", { query: normalizedQuery });

    let filters = getCache(filtersCache, normalizedQuery);
    let meta: SearchMeta = {
      aiUsed: mode === "mock",
      aiPath: mode === "mock" ? "mock" : "fallback",
    };
    if (filters) {
      res.setHeader("X-Search-Filters-Cache", "HIT");
      debugAiLog("filters cache hit", { query: normalizedQuery });
      meta = {
        aiUsed: mode === "mock" ? true : true,
        aiPath: mode === "mock" ? "mock" : "live",
      };
      setAiHeaders(res, mode, meta.aiUsed, meta.aiPath, "no");
    } else {
      res.setHeader("X-Search-Filters-Cache", "MISS");
      debugAiLog("filters cache miss", { query: normalizedQuery });
      try {
        filters = await parseSearchQueryToFilters(rawQuery);
        debugAiLog("filters returned by AI parser", { query: normalizedQuery, filters });
        meta = {
          aiUsed: true,
          aiPath: mode === "mock" ? "mock" : "live",
        };
        setAiHeaders(res, mode, meta.aiUsed, meta.aiPath, mode === "live" ? "yes" : "no");
      } catch (error) {
        if (error instanceof SearchAiError) {
          debugAiLog("AI parse failed; using keyword fallback", { query: normalizedQuery, message: error.message });
          const fallback = await fallbackKeywordSearch(rawQuery);
          const top = fallback.sort((a, b) => b.score - a.score).slice(0, DEFAULT_TOP_K);
          setCache(resultsCache, normalizedQuery, top, RESULTS_CACHE_TTL_MS);
          meta = { aiUsed: false, aiPath: "fallback" };
          setCache(resultsMetaCache, normalizedQuery, meta, RESULTS_CACHE_TTL_MS);
          setAiHeaders(res, mode, false, "fallback", mode === "live" ? "yes" : "no");
          return res.json({ results: top });
        }
        throw error;
      }

      setCache(filtersCache, normalizedQuery, filters, FILTERS_CACHE_TTL_MS);
    }

    const mongoQuery = buildMongoQuery(rawQuery, filters);
    const finalKeywords = [...new Set([...tokenize(rawQuery), ...filters.include_keywords])];
    debugAiLog("final keyword list used for search", { query: normalizedQuery, keywords: finalKeywords });
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
    setCache(resultsMetaCache, normalizedQuery, meta, RESULTS_CACHE_TTL_MS);
    return res.json({ results: ranked });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const mode = process.env.LLM_MODE === "live" ? "live" : "mock";
    setAiHeaders(res, mode, false, "fallback", mode === "live" ? "yes" : "no");
    return res.status(500).json({ error: message });
  }
}

export { searchPosts };
