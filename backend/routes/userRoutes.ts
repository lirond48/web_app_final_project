import express from "express";
import * as userController from "../controllers/userController.js";

const router = express.Router();

router.post("/", userController.createUser);
router.get("/", userController.getUsers);
router.get("/:user_id/posts", userController.getUserPosts);
router.get("/:user_id", userController.getUserById);
router.put("/:user_id", userController.updateUser);
router.delete("/:user_id", userController.deleteUser);

export default router;
