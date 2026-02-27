export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const postRoutes = require("../routes/postRoutes");

// Create test app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/post", postRoutes);

// Test database connection
const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_posts";

describe("Posts API Tests", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_MONGODB_URI);
  });

  afterAll(async () => {
    // Clean up: close database connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up posts collection before each test
    const Post = require("../model/postModel");
    await Post.deleteMany({});
  });

  describe("POST /post - Create Post", () => {
    test("should create a new post successfully", async () => {
      const postData = {
        post_id: 9,
        user_id: 77
      };

      const response = await request(app)
        .post("/post")
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty("post_id", 9);
      expect(response.body).toHaveProperty("user_id", 77);
    });
  });

  describe("GET /post - Get All Posts", () => {
    test("should get all posts", async () => {
      const Post = require("../model/postModel");
      await Post.create([
        { post_id: 1, user_id: 100 },
        { post_id: 2, user_id: 200 }
      ]);

      const response = await request(app)
        .get("/post")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe("GET /post/:post_id - Get Post by ID", () => {
    test("should get a post by post_id", async () => {
      const Post = require("../model/postModel");
      await Post.create({ post_id: 1, user_id: 100 });

      const response = await request(app)
        .get("/post/1")
        .expect(200);

      expect(response.body).toHaveProperty("post_id", 1);
      expect(response.body).toHaveProperty("user_id", 100);
    });

    test("should return 404 if post not found", async () => {
      const response = await request(app)
        .get("/post/999")
        .expect(404);

      expect(response.body).toHaveProperty("error", "Post not found");
    });

    test("should return 400 if post_id is not a number", async () => {
      const response = await request(app)
        .get("/post/abc")
        .expect(400);

      expect(response.body).toHaveProperty("error", "post_id must be a number");
    });
  });

  describe("PUT /post/:post_id - Update Post", () => {
    test("should update a post successfully", async () => {
      const Post = require("../model/postModel");
      await Post.create({ post_id: 1, user_id: 100 });

      const updateData = {
        user_id: 200
      };

      const response = await request(app)
        .put("/post/1")
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("post_id", 1);
      expect(response.body).toHaveProperty("user_id", 200);
    });

    test("should return 404 if post not found", async () => {
      const updateData = {
        user_id: 200
      };

      const response = await request(app)
        .put("/post/999")
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Post not found");
    });
  });

  describe("DELETE /post/:post_id - Delete Post", () => {
    test("should delete a post successfully", async () => {
      const Post = require("../model/postModel");
      await Post.create({ post_id: 1, user_id: 100 });

      const response = await request(app)
        .delete("/post/1")
        .expect(200);

      expect(response.body).toHaveProperty("message", "Post deleted successfully");
    });

    test("should return 404 if post not found", async () => {
      const response = await request(app)
        .delete("/post/999")
        .expect(404);

      expect(response.body).toHaveProperty("error", "Post not found");
    });
  });
});
