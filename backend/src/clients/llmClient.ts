/**
 * AI client for converting free-text search queries into structured JSON filters.
 *
 * Responsibility:
 * - Expose one backend API (`parseSearchQueryToFilters`) used by `/api/search`.
 * - Decide mock vs live mode via `LLM_MODE`.
 * - Call remote LLM `/api/generate` only in live mode.
 */
import axios, { AxiosError } from "axios";
import { DEFAULT_SEARCH_FILTERS, SearchFilters } from "../types/search.js";

const DEFAULT_BASE_URL = "http://10.10.248.41";
const DEFAULT_MODEL = "llama3.1:8b";
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const DEBUG_AI = process.env.DEBUG_AI === "true";

/**
 * Generic concept lexicon used in mock mode only to increase recall without network calls.
 * This is intentionally broad and not tied to one specific concept.
 */
const GENERIC_LEXICON: Record<string, string[]> = {
  party: ["celebration", "night out", "evening", "event"],
  work: ["office", "business", "meeting", "professional"],
  daily: ["everyday", "casual", "routine", "day to day"],
  sporty: ["sport", "gym", "workout", "training", "activewear"],
  formal: ["elegant", "suit", "tuxedo", "dressy"],
  streetwear: ["urban", "casual", "trend", "city"],
  winter: ["cold weather", "layered", "coat"],
  summer: ["warm weather", "lightweight", "breathable"],
};

export class SearchAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchAiError";
  }
}

function debugAiLog(message: string): void {
  if (!DEBUG_AI) {
    return;
  }
  console.log(`[ai-debug] ${message}`);
}

function normalizeMode(value: string | undefined): "mock" | "live" {
  return value === "live" ? "live" : "mock";
}

function parseRetryAfterMs(retryAfter: string | string[] | undefined): number {
  if (!retryAfter) {
    return 0;
  }

  const value = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

function dedupe(words: string[]): string[] {
  return [...new Set(words.filter(Boolean))];
}

function expandTokenForms(token: string): string[] {
  const forms = [token];
  if (token.endsWith("y") && token.length > 3) {
    forms.push(token.slice(0, -1) + "ies");
  }
  if (token.endsWith("ing") && token.length > 5) {
    forms.push(token.slice(0, -3));
  }
  if (token.endsWith("ed") && token.length > 4) {
    forms.push(token.slice(0, -2));
  }
  if (token.endsWith("s") && token.length > 3) {
    forms.push(token.slice(0, -1));
  }
  return dedupe(forms);
}

function buildMockExpandedKeywords(tokens: string[]): string[] {
  const expanded: string[] = [];

  for (const token of tokens) {
    expanded.push(...expandTokenForms(token));
    const lex = GENERIC_LEXICON[token];
    if (lex) {
      expanded.push(...lex.map((w) => w.toLowerCase()));
    }
  }

  if (tokens.length > 1) {
    expanded.push(tokens.join(" "));
  }

  return dedupe(expanded);
}

function parseMockFilters(query: string): SearchFilters {
  const tokens = tokenize(query);
  const include = buildMockExpandedKeywords(tokens);
  const colors = tokens.filter((word) =>
    ["white", "black", "blue", "red", "green", "pink", "brown", "gray", "grey", "beige"].includes(word)
  );
  const season = tokens.find((word) => ["winter", "summer", "spring", "autumn", "fall"].includes(word)) || null;

  const exclude_keywords: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if ((tokens[i] === "not" || tokens[i] === "without") && tokens[i + 1]) {
      exclude_keywords.push(tokens[i + 1]);
    }
  }

  return {
    ...DEFAULT_SEARCH_FILTERS,
    colors: dedupe(colors),
    season,
    include_keywords: include,
    exclude_keywords: dedupe(exclude_keywords),
    max_results: 20,
  };
}

function buildPrompt(query: string): string {
  return [
    "You are an AI parser for a fashion search engine.",
    "Given a free-text query, output ONLY valid JSON using EXACT fields:",
    '{"occasion":string|null,"style":string|null,"colors":string[],"season":string|null,"gender":"male"|"female"|"unisex"|null,"include_keywords":string[],"exclude_keywords":string[],"max_results":number|null}',
    "Rules:",
    "- Return JSON only (no markdown, no explanations).",
    "- include_keywords must be expanded keywords for general recall: synonyms + closely related terms for ANY concept.",
    "- Keep include_keywords lowercase and practical for text matching.",
    "- Unknown values => null or [].",
    "- max_results <= 20.",
    `Query: "${query}"`,
  ].join("\n");
}

function parseFiltersPayload(raw: unknown, query: string): SearchFilters {
  if (!raw || typeof raw !== "object") {
    throw new SearchAiError("AI returned invalid filters payload");
  }

  const obj = raw as Record<string, unknown>;
  const normalizeStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null);
  const normalizeArr = (v: unknown) =>
    Array.isArray(v)
      ? [...new Set(v.filter((x) => typeof x === "string").map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
      : [];
  const genderRaw = normalizeStr(obj.gender);
  const gender = genderRaw === "male" || genderRaw === "female" || genderRaw === "unisex" ? genderRaw : null;

  const maxRaw = typeof obj.max_results === "number" ? obj.max_results : null;
  const max_results = maxRaw && Number.isFinite(maxRaw) ? Math.min(20, Math.max(1, Math.floor(maxRaw))) : null;
  const queryTokens = tokenize(query);
  const includeFromAi = normalizeArr(obj.include_keywords);

  return {
    occasion: normalizeStr(obj.occasion),
    style: normalizeStr(obj.style),
    colors: normalizeArr(obj.colors),
    season: normalizeStr(obj.season),
    gender,
    include_keywords: dedupe([...queryTokens, ...includeFromAi]),
    exclude_keywords: normalizeArr(obj.exclude_keywords),
    max_results,
  };
}

function extractGeneratedText(payload: Record<string, unknown>): string {
  const value = payload.response ?? payload.text ?? payload.output ?? (payload.message as any)?.content;
  return typeof value === "string" ? value : "";
}

async function fetchLiveFilters(query: string): Promise<SearchFilters> {
  const baseURL = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  const username = process.env.LLM_USER;
  const password = process.env.LLM_PASS;
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  debugAiLog(`Live AI parse call started for query="${query.toLowerCase()}"`);

  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    try {
      const response = await axios.post(
        `${baseURL.replace(/\/+$/, "")}/api/generate`,
        {
          model: DEFAULT_MODEL,
          prompt: buildPrompt(query),
          stream: false,
          format: "json",
          options: {
            temperature: 0.2,
            num_predict: 250,
          },
        },
        {
          timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
          auth: username && password ? { username, password } : undefined,
        }
      );

      const data = (response.data ?? {}) as any;
      const candidate = data.response ?? data.text ?? data.output ?? data;

      let parsed: any;
      if (typeof candidate === "string") {
        if (!candidate.trim()) {
          throw new SearchAiError("AI generate returned empty string");
        }
        parsed = JSON.parse(candidate);
      } else if (candidate && typeof candidate === "object") {
        parsed = candidate;
      } else {
        const text = extractGeneratedText(data);
        if (!text) {
          throw new SearchAiError("AI generate returned unsupported payload");
        }
        parsed = JSON.parse(text);
      }

      debugAiLog("Live AI parse call succeeded");
      return parseFiltersPayload(parsed, query);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const canRetry = status === 429 && attempt < MAX_RETRIES;
      if (canRetry) {
        const retryAfterMs = parseRetryAfterMs(axiosError.response?.headers?.["retry-after"]);
        debugAiLog(`Live AI rate limited (429), retrying in ${retryAfterMs || 500 * (attempt + 1)}ms`);
        await sleep(retryAfterMs || 500 * (attempt + 1));
        attempt += 1;
        continue;
      }

      const message = error instanceof Error ? error.message : "Unknown AI error";
      throw new SearchAiError(message);
    }
  }

  throw new SearchAiError("AI query parse failed after retries");
}

export async function parseSearchQueryToFilters(query: string): Promise<SearchFilters> {
  const mode = normalizeMode(process.env.LLM_MODE);
  if (mode === "mock") {
    debugAiLog("Using mock AI query parser (no network call)");
    return parseMockFilters(query);
  }

  debugAiLog("Using live AI query parser (/api/generate)");
  return fetchLiveFilters(query);
}
