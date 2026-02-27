import User from "../model/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// ---- shared helpers ----
function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

// עוזרים לייצר טוקנים
function signAccessToken(user_id: string) {
  return jwt.sign({ sub: user_id }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(user_id: string) {
  return jwt.sign({ sub: user_id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

function buildOAuthRedirectUrl(params: {
  accessToken: string;
  refreshToken: string;
  user_id: string;
  username: string;
  email: string;
}) {
  const { accessToken, refreshToken, user_id, username, email } = params;
  const base = getFrontendUrl();

  // Use URL fragment (#...) so tokens won't be sent to the server on next requests
  const hash =
    `accessToken=${encodeURIComponent(accessToken)}` +
    `&refreshToken=${encodeURIComponent(refreshToken)}` +
    `&user_id=${encodeURIComponent(user_id)}` +
    `&username=${encodeURIComponent(username)}` +
    `&email=${encodeURIComponent(email)}`;

  return `${base}/oauth-callback#${hash}`;
}

// POST /auth/login
const login = async (req: any, res: any) => {
  try {
    const { email, password_hash } = req.body;

    // ולידציה
    if (!email || !password_hash) {
      return res.status(400).json({ message: "email and password are required" });
    }

    // למצוא משתמש לפי אימייל
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // להשוות סיסמה (password plaintext) מול hash ששמור ב-DB
    const ok = await bcrypt.compare(password_hash, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ליצור access + refresh
    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());

    // לשמור refresh ב-DB כ-hash (כדי שאפשר יהיה לבטל אותו ב-logout)
    user.refresh_token_hash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    //  להחזיר טוקנים
    return res.status(200).json({ accessToken, refreshToken, user_id: user._id, username: user.username, email: user.email, success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message, success: false });
  }
};


// POST /auth/refresh
// Gets a new access token (and rotates the refresh token) using a valid refresh token.
const refresh = async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user_id = payload.sub;
    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(user_id);
    if (!user || !user.refresh_token_hash) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    const ok = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!ok) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // Rotate refresh token (recommended)
    const newAccessToken = signAccessToken(user._id.toString());
    const newRefreshToken = signRefreshToken(user._id.toString());
    user.refresh_token_hash = await bcrypt.hash(newRefreshToken, 10);
    await user.save();

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user_id: user._id,
      username: user.username,
      email: user.email,
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message, success: false });
  }
};


// GET /auth/google/callback  
// Passport puts the user object on req.user
const oauthSuccessRedirect = async (req: any, res: any) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
    }

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());

    user.refresh_token_hash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    const redirectUrl = buildOAuthRedirectUrl({
      accessToken,
      refreshToken,
      user_id: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    return res.redirect(redirectUrl);
  } catch {
    return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
  }
};


// POST /auth/logout
const logout = async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;

    // חייבים refreshToken
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    // אימות refresh token
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      // גם אם הטוקן לא תקין/פג תוקף — מבחינת logout אפשר להחזיר 204
      return res.status(204).send();
    }

    const user_id = payload.sub;
    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(204).send();
    }

    // ביטול הסשן: מוחקים את ה-hash ששמור ב-DB
    await User.findByIdAndUpdate(
      user_id,
      { $set: { refresh_token_hash: null } }
    );

    // הצלחה
    return res.status(204).send();
  } catch (err: any) {
    // logout הוא פעולה "בטוחה" — גם במקרה תקלה אפשר להחזיר 204 כדי לא לחשוף מידע
    return res.status(204).send();
  }
};
export { login, refresh, logout, oauthSuccessRedirect };


