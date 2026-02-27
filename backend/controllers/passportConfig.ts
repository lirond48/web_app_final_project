import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../model/userModel.js";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function upsertOAuthUser(params: {
  provider: "google" | "facebook";
  providerId: string;
  email?: string;
  username?: string;
}) {
  const { provider, providerId, email, username } = params;

  const providerField = provider === "google" ? "google_id" : "facebook_id";

  // 1) Try by provider id
  let user: any = await User.findOne({ [providerField]: providerId } as any);

  // 2) If not found, try by email and link
  if (!user && email) {
    user = (await User.findOne({ email: email.toLowerCase() })) as any;

    if (user && !user.get(providerField)) {
      user.set(providerField, providerId);
      await user.save();
    }
  }

  // 3) Create new user
  if (!user) {
    if (!email) {
      throw new Error("Email was not provided by the external provider");
    }

    const safeUsername = (username || email.split("@")[0] || "user").trim();
    const randomPassword = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    user = await User.create({
      username: safeUsername,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      [providerField]: providerId,
    } as any);
  }

  return user;
}

/**
 * ✅ CALL THIS ONCE, AFTER dotenv.config(...)
 * This prevents crashes where env vars aren't loaded yet.
 */
export function initPassport() {
  // -------- Google (required) --------
  passport.use(
    new GoogleStrategy(
      {
        clientID: mustGetEnv("GOOGLE_CLIENT_ID"),
        clientSecret: mustGetEnv("GOOGLE_CLIENT_SECRET"),
        callbackURL: mustGetEnv("GOOGLE_CALLBACK_URL"),
      },
      async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const user = await upsertOAuthUser({
            provider: "google",
            providerId: profile.id,
            email,
            username: profile.displayName,
          });
          return done(null, user);
        } catch (e) {
          return done(e as any);
        }
      }
    )
  );
  }


export default passport;
