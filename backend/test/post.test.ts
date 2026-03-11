export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const postRoutes = require("../routes/postRoutes").default;

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret_key";

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/post", postRoutes);
app.use(express.static(path.join(process.cwd(), "public")));

const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_posts";
const testImagePath = path.join(process.cwd(), "test", "avatar.png");

describe("Posts API Tests", () => {
  let User: any;
  let Post: any;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGODB_URI);
    User = require("../model/userModel").default;
    Post = require("../model/postModel").default;
    await User.syncIndexes();
    await Post.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Post.deleteMany({});
    await User.deleteMany({});
  });

  describe("POST /post - Create Post", () => {
    test("should create a new post successfully", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });

      const response = await request(app)
        .post("/post")
        .field("user_id", user._id.toString())
        .attach("image", testImagePath)
        .expect(201);

      expect(response.body).toHaveProperty("_id");
      expect(response.body.user_id.toString()).toBe(user._id.toString());
      expect(response.body).toHaveProperty("url_image");
      expect(response.body).toHaveProperty("comment_count", 0);
    });

    test("should return 400 if user_id is missing", async () => {
      const response = await request(app)
        .post("/post")
        .attach("image", testImagePath)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    test("should return 400 if image is missing", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });

      const response = await request(app)
        .post("/post")
        .send({ user_id: user._id.toString() })
        .expect(400);

      expect(response.body).toHaveProperty("error", "image file is required");
    });
  });

  describe("GET /post - Get All Posts", () => {
    test("should get all posts with pagination", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });

      await Post.create([
        { user_id: user._id, url_image: "/uploads/img1.jpg", created_at: new Date() },
        { user_id: user._id, url_image: "/uploads/img2.jpg", created_at: new Date() },
      ]);

      const response = await request(app).get("/post").expect(200);

      expect(response.body).toHaveProperty("posts");
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(2);
      expect(response.body).toHaveProperty("pagination");
    });
  });

  describe("GET /post/:id - Get Post by ID", () => {
    test("should get a post by id", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });
      const post = await Post.create({ user_id: user._id, url_image: "/uploads/img.jpg", created_at: new Date() });

      const response = await request(app).get(`/post/${post._id}`).expect(200);

      expect(response.body._id.toString()).toBe(post._id.toString());
    });

    test("should return 404 if post not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app).get(`/post/${fakeId}`).expect(404);

      expect(response.body).toHaveProperty("error", "Post not found");
    });

    test("should return 400 if id is not a valid ObjectId", async () => {
      const response = await request(app).get("/post/not-a-valid-id").expect(400);

      expect(response.body).toHaveProperty("error", "Invalid id format");
    });
  });

  describe("PUT /post/:id - Update Post", () => {
    test("should update a post successfully", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });
      const post = await Post.create({ user_id: user._id, url_image: "/uploads/img.jpg", created_at: new Date() });

      const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });

      const response = await request(app)
        .put(`/post/${post._id}`)
        .set("Authorization", `Bearer ${token}`)
        .field("description", "Updated description")
        .expect(200);

      expect(response.body).toHaveProperty("description", "Updated description");
    });

    test("should return 401 if no auth token provided", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app).put(`/post/${fakeId}`).send({ description: "test" }).expect(401);
    });

    test("should return 403 if user does not own the post", async () => {
      const owner = await User.create({ username: "owner", email: "owner@example.com", password_hash: "hashedpassword" });
      const other = await User.create({ username: "other", email: "other@example.com", password_hash: "hashedpassword" });
      const post = await Post.create({ user_id: owner._id, url_image: "/uploads/img.jpg", created_at: new Date() });

      const token = jwt.sign({ sub: other._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });

      const response = await request(app)
        .put(`/post/${post._id}`)
        .set("Authorization", `Bearer ${token}`)
        .field("description", "Hijacked")
        .expect(403);

      expect(response.body).toHaveProperty("error", "You can only update your own posts");
    });

    test("should return 404 if post not found", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });
      const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/post/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .field("description", "test")
        .expect(404);

      expect(response.body).toHaveProperty("error", "Post not found");
    });
  });

  describe("DELETE /post/:id - Delete Post", () => {
    test("should delete a post successfully", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });
      const post = await Post.create({ user_id: user._id, url_image: "/uploads/img.jpg", created_at: new Date() });
      const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });

      const response = await request(app)
        .delete(`/post/${post._id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("message", "Post deleted successfully");
    });

    test("should return 401 if no auth token provided", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app).delete(`/post/${fakeId}`).expect(401);
    });

    test("should return 403 if user does not own the post", async () => {
      const owner = await User.create({ username: "owner", email: "owner@example.com", password_hash: "hashedpassword" });
      const other = await User.create({ username: "other", email: "other@example.com", password_hash: "hashedpassword" });
      const post = await Post.create({ user_id: owner._id, url_image: "/uploads/img.jpg", created_at: new Date() });

      const token = jwt.sign({ sub: other._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });

      const response = await request(app)
        .delete(`/post/${post._id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty("error", "You can only delete your own posts");
    });

    test("should return 404 if post not found", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });
      const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/post/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Post not found");
    });
  });
});
