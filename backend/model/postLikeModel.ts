import mongoose from "mongoose";

const postLikeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Post",
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: false }
);

postLikeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });
postLikeSchema.index({ user_id: 1 });
postLikeSchema.index({ post_id: 1 });

export default mongoose.model("PostLike", postLikeSchema);