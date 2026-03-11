# Option 1: Free-Text Search -> AI JSON Filters -> Mongo Query

## How it works

`GET /api/search?q=...` performs these steps on the backend:

1. Validate query length (`>= 3`), otherwise returns `{ "results": [] }`.
2. Reuse cached final results (short cache).
3. Reuse cached parsed filters (10 min cache) or parse query via AI.
4. Build Mongo query from structured filters + keywords.
5. Rank candidates with heuristic keyword scoring and return:

```json
{
  "results": [{ "post": { "...existing post fields..." }, "score": 3 }]
}
```

No embeddings are used in this option.

## Environment variables

Use placeholders only:

```env
LLM_BASE_URL=http://10.10.248.41
LLM_USER="user"
LLM_PASS="pass"
LLM_MODE=mock
```

## Mock vs live

- `LLM_MODE=mock`:
  - Never calls the real AI.
  - Deterministically derives filter JSON from query text.
  - Works without VPN.
- `LLM_MODE=live`:
  - Calls `POST /api/generate` on `LLM_BASE_URL`.
  - Uses Basic Auth from env.
  - If AI parsing fails, backend falls back to plain keyword Mongo search.

## Protections

- Rate limit: `20 requests/min` per IP on `/api/search`.
- Filters cache: `query -> filters` for `10 minutes`.
- Results cache: `query -> results` for `~90 seconds`.

## Curl example

```bash
curl "http://localhost:3000/api/search?q=elegant%20white%20wedding"
```
