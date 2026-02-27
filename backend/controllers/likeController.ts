import PostLike from "../model/postLikeModel.js";
import Post from "../model/postModel.js";
import mongoose from "mongoose";

/**
 * Like a post (idempotent - can be called multiple times safely)
 */
const likePostAsync = async (req: any, res: any) => {
  try {
    const { post_id } = req.params;
    const { user_id } = req.body; // Get from request body

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "user_id is required and must be a valid ObjectId" });
    }

    if (!post_id || !mongoose.Types.ObjectId.isValid(post_id)) {
      return res.status(400).json({ message: "Invalid post_id format" });
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already liked (idempotent check)
    const existingLike = await PostLike.findOne({
      user_id,
      post_id,
    });

    if (existingLike) {
      // Already liked - return success (idempotent)
      return res.status(200).json({
        message: "Post already liked",
        liked: true,
        like_count: post.like_count || 0,
      });
    }

    // Create the like and increment count atomically
    try {
      await PostLike.create({ user_id, post_id, created_at: new Date() });

      // Increment like_count atomically using $inc
      const updatedPost = await Post.findByIdAndUpdate(
        post_id,
        { $inc: { like_count: 1 } },
        { new: true }
      );

      return res.status(200).json({
        message: "Post liked successfully",
        liked: true,
        like_count: updatedPost?.like_count || 0,
      });
    } catch (error: any) {
      // Handle unique constraint violation (duplicate key error)
      if (error.code === 11000 || error.name === "MongoServerError") {
        // Duplicate like - idempotent success (race condition handled)
        const currentPost = await Post.findById(post_id);
        return res.status(200).json({
          message: "Post already liked",
          liked: true,
          like_count: currentPost?.like_count || 0,
        });
      }
      throw error;
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Unlike a post (idempotent - can be called multiple times safely)
 */
const unlikePostAsync = async (req: any, res: any) => {
  try {
    const { post_id } = req.params;
    const { user_id } = req.body; // Get from request body

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "user_id is required and must be a valid ObjectId" });
    }

    if (!post_id || !mongoose.Types.ObjectId.isValid(post_id)) {
      return res.status(400).json({ message: "Invalid post_id format" });
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if liked
    const existingLike = await PostLike.findOne({
      user_id,
      post_id,
    });

    if (!existingLike) {
      // Not liked - return success (idempotent)
      return res.status(200).json({
        message: "Post not liked",
        liked: false,
        like_count: post.like_count || 0,
      });
    }

    // Delete the like
    const deleteResult = await PostLike.deleteOne({ user_id, post_id });

    if (deleteResult.deletedCount > 0) {
      // Decrement like_count atomically, but don't go below 0
      // Use $inc with $max to ensure it doesn't go negative
      const currentLikeCount = post.like_count || 0;
      const newLikeCount = Math.max(0, currentLikeCount - 1);

      const updatedPost = await Post.findByIdAndUpdate(
        post_id,
        { $set: { like_count: newLikeCount } },
        { new: true }
      );

      return res.status(200).json({
        message: "Post unliked successfully",
        liked: false,
        like_count: updatedPost?.like_count || 0,
      });
    } else {
      // Race condition: like was already deleted
      const currentPost = await Post.findById(post_id);
      return res.status(200).json({
        message: "Post not liked",
        liked: false,
        like_count: currentPost?.like_count || 0,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Check if a post is liked by the current user
 */
const isPostLikedByUserAsync = async (req: any, res: any) => {
  try {
    const { post_id } = req.params;
    const user_id = req.query.user_id || req.body.user_id; // Get from query params or body

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "user_id is required and must be a valid ObjectId" });
    }

    if (!post_id || !mongoose.Types.ObjectId.isValid(post_id)) {
      return res.status(400).json({ message: "Invalid post_id format" });
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if liked
    const like = await PostLike.findOne({
      user_id,
      post_id,
    });

    return res.status(200).json({
      liked: !!like,
      like_count: post.like_count || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get the like count for a post
 */
const getPostLikesCountAsync = async (req: any, res: any) => {
  try {
    const { post_id } = req.params;

    if (!post_id || !mongoose.Types.ObjectId.isValid(post_id)) {
      return res.status(400).json({ message: "Invalid post_id format" });
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get actual count from PostLike collection (for verification)
    const actualCount = await PostLike.countDocuments({ post_id });

    return res.status(200).json({
      like_count: post.like_count || 0,
      actual_count: actualCount, // For debugging/verification
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export {
  likePostAsync,
  unlikePostAsync,
  isPostLikedByUserAsync,
  getPostLikesCountAsync,
};

