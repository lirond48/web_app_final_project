export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const commentRoutes = require("../routes/commentRoutes");

// Create test app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/comment", commentRoutes);

// Test database connection
const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_comments";

describe("Comments API Tests", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_MONGODB_URI);
  });

  afterAll(async () => {
    // Clean up: close database connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up comments collection before each test
    const Comment = require("../model/commentModel");
    await Comment.deleteMany({});
  });

  describe("POST /comment - Create Comment", () => {
    test("should create a new comment successfully", async () => {
      const commentData = {
        comment_id: 1,
        post_id: 1,
        comment: "This is a test comment"
      };

      const response = await request(app)
        .post("/comment")
        .send(commentData)
        .expect(201);

      expect(response.body).toHaveProperty("comment_id", 1);
      expect(response.body).toHaveProperty("post_id", 1);
      expect(response.body).toHaveProperty("comment", "This is a test comment");
    });

    test("should return 400 if comment_id is not a number", async () => {
      const commentData = {
        comment_id: "not-a-number",
        post_id: 1,
        comment: "This is a test comment"
      };

      const response = await request(app)
        .post("/comment")
        .send(commentData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    test("should return 409 if comment_id already exists", async () => {
      const Comment = require("../model/commentModel");
      await Comment.create({
        comment_id: 1,
        post_id: 1,
        comment: "Existing comment"
      });

      const commentData = {
        comment_id: 1,
        post_id: 2,
        comment: "Duplicate comment_id"
      };

      const response = await request(app)
        .post("/comment")
        .send(commentData)
        .expect(409);

      expect(response.body).toHaveProperty("error", "comment_id already exists");
    });
  });

  describe("GET /comment - Get All Comments", () => {
    test("should get all comments", async () => {
      const Comment = require("../model/commentModel");
      await Comment.create([
        { comment_id: 1, post_id: 1, comment: "Comment 1" },
        { comment_id: 2, post_id: 1, comment: "Comment 2" }
      ]);

      const response = await request(app)
        .get("/comment")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe("GET /comment/:post_id - Get Comments by Post ID", () => {
    test("should get comments for a specific post", async () => {
      const Comment = require("../model/commentModel");
      await Comment.create([
        { comment_id: 1, post_id: 1, comment: "Comment for post 1" },
        { comment_id: 2, post_id: 1, comment: "Another comment for post 1" },
        { comment_id: 3, post_id: 2, comment: "Comment for post 2" }
      ]);

      const response = await request(app)
        .get("/comment/1")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.every(c => c.post_id === 1)).toBe(true);
    });
  });
});
