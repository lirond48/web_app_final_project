import mongoose from "mongoose";
import PostLike from "./postLikeModel.js";

const postSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  url_image: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  like_count: {
    type: Number,
    default: 0,
    required: false,
  },
  created_at: {
    type: Date,
    required: true,
  },
  updated_at: {
    type: Date,
    required: false,
  },
});

// Virtual for PostLikes navigation property
postSchema.virtual("post_likes", {
  ref: "PostLike",
  localField: "_id",
  foreignField: "post_id",
});

// Cascade delete: When a Post is deleted, delete all related PostLikes
postSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    await PostLike.deleteMany({ post_id: doc._id });
  }
});

postSchema.pre("findByIdAndDelete", async function () {
  const doc = await this.model.findById(this.getQuery());
  if (doc) {
    await PostLike.deleteMany({ post_id: doc._id });
  }
});

// Also handle direct delete operations
postSchema.pre("deleteOne", { document: true, query: false }, async function () {
  await PostLike.deleteMany({ post_id: this._id });
});

export default mongoose.model("Post", postSchema); // Post is the name of the collection in the database