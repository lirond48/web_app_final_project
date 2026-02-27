import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Post" },
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    comment: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Comment", commentSchema); // Comment is the name of the collection in the database