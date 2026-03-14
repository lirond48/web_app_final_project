export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const commentRoutes = require("../routes/commentRoutes").default;

// Create test app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/comment", commentRoutes);

// Test database connection
const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_comments";

describe("Comments API Tests", () => {
  let Comment: any;
  let userId: any;
  let postId: any;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGODB_URI);
    Comment = require("../model/commentModel").default;
    await Comment.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
    userId = new mongoose.Types.ObjectId();
    postId = new mongoose.Types.ObjectId();
  });

  describe("POST /comment - Create Comment", () => {
    test("should create a new comment successfully", async () => {
      const response = await request(app)
        .post("/comment")
        .send({ user_id: userId.toString(), post_id: postId.toString(), comment: "This is a test comment" })
        .expect(201);

      expect(response.body).toHaveProperty("_id");
      expect(response.body.post_id.toString()).toBe(postId.toString());
      expect(response.body).toHaveProperty("comment", "This is a test comment");
    });

    test("should return 400 if comment text is missing", async () => {
      const response = await request(app)
        .post("/comment")
        .send({ user_id: userId.toString(), post_id: postId.toString() })
        .expect(400);

      expect(response.body).toHaveProperty("error", "comment is required");
    });

    test("should return 400 if user_id is not a valid ObjectId", async () => {
      const response = await request(app)
        .post("/comment")
        .send({ user_id: "not-a-valid-id", post_id: postId.toString(), comment: "test" })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Valid user_id (ObjectId) is required");
    });

    test("should return 400 if post_id is not a valid ObjectId", async () => {
      const response = await request(app)
        .post("/comment")
        .send({ user_id: userId.toString(), post_id: "not-a-valid-id", comment: "test" })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Valid post_id (ObjectId) is required");
    });
  });

  describe("GET /comment - Get All Comments", () => {
    test("should get all comments", async () => {
      await Comment.create([
        { user_id: userId, post_id: postId, comment: "Comment 1" },
        { user_id: userId, post_id: postId, comment: "Comment 2" },
      ]);

      const response = await request(app).get("/comment").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe("GET /comment/:post_id - Get Comments by Post ID", () => {
    test("should get comments for a specific post", async () => {
      const otherPostId = new mongoose.Types.ObjectId();

      await Comment.create([
        { user_id: userId, post_id: postId, comment: "Comment for post 1" },
        { user_id: userId, post_id: postId, comment: "Another comment for post 1" },
        { user_id: userId, post_id: otherPostId, comment: "Comment for other post" },
      ]);

      const response = await request(app).get(`/comment/${postId}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.every((c: any) => c.post_id.toString() === postId.toString())).toBe(true);
    });

    test("should return 400 if post_id is not a valid ObjectId", async () => {
      const response = await request(app).get("/comment/not-a-valid-id").expect(400);

      expect(response.body).toHaveProperty("error", "Invalid post_id format");
    });
  });

  describe("PUT /comment/:comment_id - Update Comment", () => {
    test("should update a comment successfully", async () => {
      const comment = await Comment.create({ user_id: userId, post_id: postId, comment: "Original comment" });

      const response = await request(app)
        .put(`/comment/${comment._id}`)
        .send({ comment: "Updated comment" })
        .expect(200);

      expect(response.body).toHaveProperty("comment", "Updated comment");
    });

    test("should return 400 if comment_id is not a valid ObjectId", async () => {
      const response = await request(app)
        .put("/comment/not-a-valid-id")
        .send({ comment: "Updated" })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Invalid comment_id format");
    });

    test("should return 404 if comment not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/comment/${fakeId}`)
        .send({ comment: "Updated" })
        .expect(404);

      expect(response.body).toHaveProperty("error", "Comment not found");
    });
  });

  describe("DELETE /comment/:comment_id - Delete Comment", () => {
    test("should delete a comment successfully", async () => {
      const comment = await Comment.create({ user_id: userId, post_id: postId, comment: "Comment to delete" });

      const response = await request(app).delete(`/comment/${comment._id}`).expect(200);

      expect(response.body).toHaveProperty("message", "Comment deleted successfully");
    });

    test("should return 400 if comment_id is not a valid ObjectId", async () => {
      const response = await request(app).delete("/comment/not-a-valid-id").expect(400);

      expect(response.body).toHaveProperty("error", "Invalid comment_id format");
    });

    test("should return 404 if comment not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app).delete(`/comment/${fakeId}`).expect(404);

      expect(response.body).toHaveProperty("error", "Comment not found");
    });
  });
});
