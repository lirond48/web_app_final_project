import Post from "../model/postModel.js";
import PostLike from "../model/postLikeModel.js";
import Comment from "../model/commentModel.js";
import mongoose from "mongoose";

const getPost = async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post_id",
          as: "comments",
        },
      },
      {
        $addFields: {
          comment_count: { $size: "$comments" },
        },
      },
      {
        $project: {
          comments: 0,
        },
      },
    ]);

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    const post = await Post.findById(postId).lean();

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment_count = await Comment.countDocuments({ post_id: postId });
    return res.json({ ...post, comment_count });
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

    res.status(201).json({ ...newPost.toObject(), comment_count: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user_id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (String(post.user_id) !== String(currentUserId)) {
      return res.status(403).json({ error: "You can only update your own posts" });
    }

    const body = req.body ?? {};
    const updates: any = { updated_at: new Date() };

    if (typeof body.description === "string") {
      updates.description = body.description;
    }

    if (req.file?.filename) {
      updates.url_image = `/uploads/${req.file.filename}`;
    }

    if (!("description" in updates) && !("url_image" in updates)) {
      return res.status(400).json({ error: "At least one field (description/image) must be provided" });
    }

    const updated = await Post.findByIdAndUpdate(postId, { $set: updates }, { new: true, runValidators: true }).lean();

    if (!updated) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment_count = await Comment.countDocuments({ post_id: postId });
    return res.json({ ...updated, comment_count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user_id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (String(post.user_id) !== String(currentUserId)) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await PostLike.deleteMany({ post_id: postId });
    await Comment.deleteMany({ post_id: postId });
    const deleted = await Post.findByIdAndDelete(postId);

    if (!deleted) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json({ message: "Post deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getPostComments = async (req, res) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comments = await Comment.find({ post_id: postId }).sort({ created_at: 1 });
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const createPostComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user_id;
    const body = req.body ?? {};
    const comment = body.comment;
    const userIdFromBody = body.user_id;
    const effectiveUserId = currentUserId || userIdFromBody;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    if (!effectiveUserId || !mongoose.Types.ObjectId.isValid(effectiveUserId)) {
      return res.status(400).json({ error: "Valid user_id (ObjectId) is required" });
    }

    if (!comment || typeof comment !== "string") {
      return res.status(400).json({ error: "comment is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const newComment = await Comment.create({
      post_id: postId,
      user_id: effectiveUserId,
      comment,
    });

    return res.status(201).json(newComment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getPostCommentsCount = async (req, res) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const count = await Comment.countDocuments({ post_id: postId });
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export {
  getPost,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getPostComments,
  createPostComment,
  getPostCommentsCount,
};
