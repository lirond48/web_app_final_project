import Post from "../model/postModel.js";
import PostLike from "../model/postLikeModel.js";
import mongoose from "mongoose";

const getPost = async (req, res) => { 
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.post_id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post_id format" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json(post);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const createPost = async (req, res) => {
  try {
    const body = req.body ?? {};
    const user_id = body.user_id;
    const description = body.description;

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Valid user_id (ObjectId) is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "image file is required" });
    }

    const now = new Date();
    const newPost = await Post.create({
      user_id,
      description,
      url_image: `/uploads/${req.file.filename}`,
      created_at: now,
      updated_at: now,
    });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const postId = req.params.post_id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post_id format" });
    }

    // החלפה/עדכון של שדות לפי מה שנשלח ב-body
    const updated = await Post.findByIdAndUpdate(
      postId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.post_id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post_id format" });
    }

    // Cascade delete: Delete all related PostLikes first
    await PostLike.deleteMany({ post_id: postId });

    const deleted = await Post.findByIdAndDelete(postId);

    if (!deleted) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json({ message: "Post deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export {
  getPost,
  getPostById,
  createPost,
  updatePost,
  deletePost
};
