/**
 * Search route wiring for AI-assisted smart search.
 *
 * Responsibility:
 * - Expose `GET /api/search` endpoint.
 * - Ensure rate-limit middleware runs before controller.
 *
 * Called by:
 * - `index.ts` via `app.use("/api", searchRoutes)`.
 *
 * Returns:
 * - Express router instance.
 *
 * Must NOT be used by:
 * - Frontend direct LLM calls. Frontend should call `/api/search` only.
 */
import express from "express";
import { searchPosts } from "../controllers/searchController.js";
import { searchRateLimit } from "../middleware/searchRateLimit.js";

const router = express.Router();

/**
 * Smart search endpoint with protection middleware.
 *
 * Example:
 * - `GET /api/search?q=elegant white wedding`
 */
router.get("/search", searchRateLimit, searchPosts);

export default router;
