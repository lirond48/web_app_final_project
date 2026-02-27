import express from "express";
import * as postController from "../controllers/postController.js";
import multer from "multer";

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
router.get("/:post_id", postController.getPostById); //pass pointer to the function

router.post("/", upload.single("image"), postController.createPost);

router.put("/:post_id", postController.updatePost);
router.delete("/:post_id", postController.deletePost);

export default router;
