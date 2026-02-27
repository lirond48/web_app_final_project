import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Auth
    password_hash: { type: String, required: true },
    refresh_token_hash: { type: String, default: null },

    // External providers (optional)
    google_id: { type: String, default: null, index: true },
    
    // Profile image
    image_url: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
