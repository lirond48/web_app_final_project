import User from "../model/userModel.js";
import Post from "../model/postModel.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const createUser = async (req: any, res: any) => {
  try {
    const { username, email, password_hash } = req.body;
    if (!username || !email || !password_hash) {
      return res.status(400).json({ message: "username, email, password_hash are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const password = await bcrypt.hash(password_hash, 10);

    // MongoDB will automatically generate _id (ObjectId)
    const user = await User.create({
      username,
      email,
      password_hash:password,
    });

    // לא מחזירים סיסמה/רפרש החוצה
    return res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      image_url: user.image_url,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

const getUsers = async (_req: any, res: any) => {
  try {
    const users = await User.find().select("_id username email image_url");
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

const getUserById = async (req: any, res: any) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user_id format" });
    }

    const user = await User.findById(userId).select("_id username email image_url");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req: any, res: any) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user_id format" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      req.body,
      { new: true, runValidators: true }
    ).select("_id username email image_url");

    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req: any, res: any) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user_id format" });
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

const getUserPosts = async (req: any, res: any) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user_id format" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const posts = await Post.find({ user_id: userId });
    return res.json(posts);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export { createUser, getUsers, getUserById, updateUser, deleteUser, getUserPosts };
