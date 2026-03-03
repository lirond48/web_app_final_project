import axios, { AxiosError } from "axios";
import { DEFAULT_SEARCH_FILTERS, SearchFilters } from "../types/search.js";

const DEFAULT_BASE_URL = "http://10.10.248.41";
const DEFAULT_MODEL = "llama3.1:8b";
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

export class SearchAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchAiError";
  }
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
  return [...new Set(words)];
}

function parseMockFilters(query: string): SearchFilters {
  const tokens = tokenize(query);
  const colors = tokens.filter((word) =>
    ["white", "black", "blue", "red", "green", "pink", "brown", "gray", "grey", "beige"].includes(word)
  );

  const season = tokens.find((word) => ["winter", "summer", "spring", "autumn", "fall"].includes(word)) || null;
  const occasion =
    tokens.find((word) => ["wedding", "work", "party", "formal", "daily", "sport", "sporty", "streetwear"].includes(word)) ||
    null;
  const genderToken = tokens.find((word) => ["male", "female", "unisex", "men", "women"].includes(word)) || null;
  const normalizedGender: "male" | "female" | "unisex" | null =
    genderToken === "men"
      ? "male"
      : genderToken === "women"
      ? "female"
      : genderToken === "male" || genderToken === "female" || genderToken === "unisex"
      ? genderToken
      : null;

  const exclude_keywords: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if ((tokens[i] === "not" || tokens[i] === "without") && tokens[i + 1]) {
      exclude_keywords.push(tokens[i + 1]);
    }
  }

  return {
    ...DEFAULT_SEARCH_FILTERS,
    occasion,
    style: occasion,
    season,
    gender: normalizedGender,
    colors: dedupe(colors),
    include_keywords: dedupe(tokens.filter((t) => t !== "not" && t !== "without")),
    exclude_keywords: dedupe(exclude_keywords),
    max_results: 20,
  };
}

function buildPrompt(query: string): string {
  return [
    "You are a search query parser for fashion posts.",
    "Return ONLY valid JSON with EXACT fields:",
    '{"occasion":string|null,"style":string|null,"colors":string[],"season":string|null,"gender":"male"|"female"|"unisex"|null,"include_keywords":string[],"exclude_keywords":string[],"max_results":number|null}',
    "Rules:",
    "- No markdown, no prose, JSON only.",
    "- Unknown values must be null or [].",
    "- max_results must be <= 20 if provided.",
    "- include_keywords and exclude_keywords should be lowercase.",
    `User query: "${query}"`,
  ].join("\n");
}

function parseFiltersPayload(raw: unknown): SearchFilters {
  if (!raw || typeof raw !== "object") {
    throw new SearchAiError("AI returned invalid filters payload");
  }

  const obj = raw as Record<string, unknown>;
  const normalizeStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null);
  const normalizeArr = (v: unknown) =>
    Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string").map((x) => String(x).trim().toLowerCase()).filter(Boolean))] : [];
  const genderRaw = normalizeStr(obj.gender);
  const gender = genderRaw === "male" || genderRaw === "female" || genderRaw === "unisex" ? genderRaw : null;

  const maxRaw = typeof obj.max_results === "number" ? obj.max_results : null;
  const max_results = maxRaw && Number.isFinite(maxRaw) ? Math.min(20, Math.max(1, Math.floor(maxRaw))) : null;

  return {
    occasion: normalizeStr(obj.occasion),
    style: normalizeStr(obj.style),
    colors: normalizeArr(obj.colors),
    season: normalizeStr(obj.season),
    gender,
    include_keywords: normalizeArr(obj.include_keywords),
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

      const text = extractGeneratedText(response.data || {});
      if (!text) {
        throw new SearchAiError("AI generate returned empty content");
      }

      const parsed = JSON.parse(text);
      return parseFiltersPayload(parsed);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const canRetry = status === 429 && attempt < MAX_RETRIES;
      if (canRetry) {
        const retryAfterMs = parseRetryAfterMs(axiosError.response?.headers?.["retry-after"]);
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
  if (normalizeMode(process.env.LLM_MODE) === "mock") {
    return parseMockFilters(query);
  }

  return fetchLiveFilters(query);
}
