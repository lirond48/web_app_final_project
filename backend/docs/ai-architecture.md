# AI Architecture

## High-level flow

```text
Frontend /search page
    -> GET /api/search?q=...
        -> searchRateLimit middleware (20/min per IP)
        -> searchController.searchPosts
            -> min query length check (q.length >= 3)
            -> results cache lookup (query -> ranked results, ~90s)
            -> filters cache lookup (query -> SearchFilters, 10m)
            -> if filters cache miss:
                 -> llmClient.parseSearchQueryToFilters(q)
                    -> LLM_MODE=mock: local deterministic parser (no network)
                    -> LLM_MODE=live: POST /api/generate (retry on 429)
            -> build Mongo query from filters + query tokens
            -> fetch posts from Mongo
            -> compute heuristic score and return:
               { results: [{ post, score }] }
            -> if AI parse fails: fallback keyword-only Mongo search
```

## AI-related files and roles

- `src/clients/llmClient.ts`
  - Converts free-text query into structured `SearchFilters`.
  - Contains mock/live switch (`LLM_MODE`), live AI call, retry handling, and payload normalization.
- `src/types/search.ts`
  - Defines `SearchFilters` schema and default empty filters object.
- `middleware/searchRateLimit.ts`
  - Enforces `/api/search` rate limit (20 requests/minute/IP).
- `controllers/searchController.ts`
  - Main search flow: min-length gate, cache use, AI parse, Mongo query, scoring, fallback.
- `routes/searchRoutes.ts`
  - Wires route + middleware: `GET /api/search`.
- `index.ts`
  - Mounts search routes under `/api`.

## Protections (where and how)

- Rate limit:
  - File: `middleware/searchRateLimit.ts`
  - Middleware: `searchRateLimit`
  - Policy: 20 requests/minute per IP
- Filters cache:
  - File: `controllers/searchController.ts`
  - Store: in-memory `Map` (`filtersCache`)
  - Key: normalized query (`q.trim().toLowerCase()`)
  - TTL: 10 minutes
- Results cache:
  - File: `controllers/searchController.ts`
  - Store: in-memory `Map` (`resultsCache`)
  - Key: normalized query
  - TTL: ~90 seconds
- Min query length:
  - File: `controllers/searchController.ts`
  - Check: `q.length < 3 => { results: [] }`
- Mock vs live:
  - File: `src/clients/llmClient.ts`
  - Decision: `LLM_MODE`
  - `mock`: no network call
  - `live`: calls `POST {LLM_BASE_URL}/api/generate`

## Environment variables

- `LLM_MODE`
  - `mock` or `live`.
  - `mock` is safe default for local/dev without VPN.
- `DEBUG_AI`
  - When `true`, prints AI debug logs (mode, cache hits, limiter blocks, fallback events).
- `LLM_BASE_URL`
  - Base URL for live AI service.
- `LLM_USER`
  - Basic Auth username (backend only).
- `LLM_PASS`
  - Basic Auth password (backend only).

Do not place real credentials in source files or docs.

## How to tell AI parse vs fallback

Set `DEBUG_AI=true` and watch backend logs:

- Mock parser path:
  - `[ai-debug] Using mock AI query parser (no network call)`
- Live parser path:
  - `[ai-debug] Using live AI query parser (/api/generate)`
- Filters cache path:
  - `[ai-debug] filters cache hit` or `filters cache miss`
- Results cache path:
  - `[ai-debug] results cache hit` or `results cache miss`
- Fallback path (AI error -> keyword search):
  - `[ai-debug] AI parse failed; using keyword fallback`
- Rate limit block:
  - `[ai-debug] rate-limit blocked search request`
