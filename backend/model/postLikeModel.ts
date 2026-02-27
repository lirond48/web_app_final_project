import mongoose from "mongoose";

const postLikeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Post",
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: false } // We handle created_at manually
);

// Composite unique index to prevent duplicate likes
postLikeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

// Additional indexes for performance (already defined above, but explicit for clarity)
postLikeSchema.index({ post_id: 1 });
postLikeSchema.index({ user_id: 1 });

export default mongoose.model("PostLike", postLikeSchema);

