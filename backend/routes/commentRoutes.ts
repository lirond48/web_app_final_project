import express from "express";
import * as commentController from "../controllers/commentController.js";

const router = express.Router();

router.get("/", commentController.getComments);
router.get("/:post_id", commentController.getCommentsByPostId);

router.post("/", commentController.createComment);
router.put("/:comment_id", commentController.updateComment);
router.delete("/:comment_id", commentController.deleteComment);

export default router;