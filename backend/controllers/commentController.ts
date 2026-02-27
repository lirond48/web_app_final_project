import Comment from "../model/commentModel.js";
import mongoose from "mongoose";

const getComments = async (req, res) => {
  try {
    const comments = await Comment.find();
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /comment/:post_id
// מחזיר את כל התגובות של פוסט לפי post_id (ObjectId)
const getCommentsByPostId = async (req, res) => {
  try {
    const postId = req.params.post_id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post_id format" });
    }

    const comments = await Comment.find({ post_id: postId });
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /comment
// יצירת תגובה חדשה
const createComment = async (req, res) => {
  try {
    const { user_id, post_id, comment } = req.body;

    if (!comment || typeof comment !== "string") {
      return res.status(400).json({ error: "comment is required" });
    }

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Valid user_id (ObjectId) is required" });
    }

    if (!post_id || !mongoose.Types.ObjectId.isValid(post_id)) {
      return res.status(400).json({ error: "Valid post_id (ObjectId) is required" });
    }

    // MongoDB will automatically generate _id (ObjectId) for the comment
    const newComment = await Comment.create({ user_id, post_id, comment });
    return res.status(201).json(newComment);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// PUT /comment/:comment_id
// עדכון תגובה לפי comment_id (ObjectId)
const updateComment = async (req, res) => {
  try {
    const commentId = req.params.comment_id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: "Invalid comment_id format" });
    }

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Comment not found" });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /comment/:comment_id
// מחיקת תגובה לפי comment_id (ObjectId)
const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.comment_id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: "Invalid comment_id format" });
    }

    const deleted = await Comment.findByIdAndDelete(commentId);

    if (!deleted) {
      return res.status(404).json({ error: "Comment not found" });
    }

    return res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export {
  getComments,
  getCommentsByPostId,
  createComment,
  updateComment,
  deleteComment
};