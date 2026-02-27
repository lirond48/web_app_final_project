import express from "express";
import * as likeController from "../controllers/likeController.js";

const router = express.Router();

// Like routes (authentication removed for testing)
router.post("/post/:post_id/like", likeController.likePostAsync);
router.delete("/post/:post_id/like", likeController.unlikePostAsync);
router.get("/post/:post_id/like", likeController.isPostLikedByUserAsync);
router.get("/post/:post_id/likes/count", likeController.getPostLikesCountAsync); // Public endpoint

export default router;

