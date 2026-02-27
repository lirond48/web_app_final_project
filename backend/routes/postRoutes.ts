import express from "express";
import * as postController from "../controllers/postController.js";
import multer from "multer";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").filter(Boolean).slice(1).join(".");
    cb(null, `${Date.now()}.${ext}`);
  },
});
const upload = multer({ storage });

router.get("/", postController.getPost); //pass pointer to the function
router.get("/:id/comments", postController.getPostComments);
router.get("/:id/comments/count", postController.getPostCommentsCount);
router.get("/:id", postController.getPostById); //pass pointer to the function

router.post("/", upload.single("image"), postController.createPost);
router.post("/:id/comments", authenticateToken, postController.createPostComment);

router.put("/:id", authenticateToken, upload.single("file"), postController.updatePost);
router.delete("/:id", authenticateToken, postController.deletePost);

export default router;
