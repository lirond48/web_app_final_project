import express from "express";
import * as authController from "../controllers/authController.js";
import passport from "passport";

const router = express.Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// ----- OAuth (Google / Facebook) -----
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=google` }),
  authController.oauthSuccessRedirect
);

export default router;
