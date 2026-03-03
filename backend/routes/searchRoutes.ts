import express from "express";
import { searchPosts } from "../controllers/searchController.js";
import { searchRateLimit } from "../middleware/searchRateLimit.js";

const router = express.Router();

router.get("/search", searchRateLimit, searchPosts);

export default router;
