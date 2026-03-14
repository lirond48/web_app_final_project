export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const userRoutes = require("../routes/userRoutes").default;

// Create test app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/users", userRoutes);

// Test database connection
const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_users";

describe("Users API Tests", () => {
  let User: any;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGODB_URI);
    User = require("../model/userModel").default;
    await User.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("POST /users - Create User", () => {
    test("should create a new user successfully", async () => {
      const response = await request(app)
        .post("/users")
        .send({ username: "testuser", email: "test@example.com", password_hash: "password123" })
        .expect(201);

      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("username", "testuser");
      expect(response.body).toHaveProperty("email", "test@example.com");
      expect(response.body).not.toHaveProperty("password_hash");
      expect(typeof response.body._id).toBe("string");
    });

    test("should return 400 if username is missing", async () => {
      const response = await request(app)
        .post("/users")
        .send({ email: "test@example.com", password_hash: "password123" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "username, email, password_hash are required");
    });

    test("should return 400 if email is missing", async () => {
      const response = await request(app)
        .post("/users")
        .send({ username: "testuser", password_hash: "password123" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "username, email, password_hash are required");
    });

    test("should return 400 if password_hash is missing", async () => {
      const response = await request(app)
        .post("/users")
        .send({ username: "testuser", email: "test@example.com" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "username, email, password_hash are required");
    });

    test("should return 409 if email already exists", async () => {
      await User.create({ username: "existinguser", email: "test@example.com", password_hash: "hashedpassword" });

      const response = await request(app)
        .post("/users")
        .send({ username: "newuser", email: "test@example.com", password_hash: "password123" })
        .expect(409);

      expect(response.body).toHaveProperty("message", "Email already exists");
    });
  });

  describe("GET /users - Get All Users", () => {
    test("should get all users", async () => {
      await User.create([
        { username: "user1", email: "user1@example.com", password_hash: "hash1" },
        { username: "user2", email: "user2@example.com", password_hash: "hash2" },
      ]);

      const response = await request(app).get("/users").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty("_id");
      expect(response.body[0]).toHaveProperty("username");
      expect(response.body[0]).toHaveProperty("email");
      expect(response.body[0]).not.toHaveProperty("password_hash");
    });

    test("should return empty array when no users exist", async () => {
      const response = await request(app).get("/users").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("GET /users/:user_id - Get User by ID", () => {
    test("should get a user by _id", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });

      const response = await request(app).get(`/users/${user._id}`).expect(200);

      expect(response.body._id.toString()).toBe(user._id.toString());
      expect(response.body).toHaveProperty("username", "testuser");
      expect(response.body).toHaveProperty("email", "test@example.com");
      expect(response.body).not.toHaveProperty("password_hash");
    });

    test("should return 404 if user not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app).get(`/users/${fakeId}`).expect(404);

      expect(response.body).toHaveProperty("message", "User not found");
    });

    test("should return 400 if user_id is not a valid ObjectId", async () => {
      const response = await request(app).get("/users/not-a-valid-id").expect(400);

      expect(response.body).toHaveProperty("message", "Invalid user_id format");
    });
  });

  describe("PUT /users/:user_id - Update User", () => {
    test("should update a user successfully", async () => {
      const user = await User.create({ username: "oldusername", email: "old@example.com", password_hash: "hashedpassword" });

      const response = await request(app)
        .put(`/users/${user._id}`)
        .send({ username: "newusername", email: "new@example.com" })
        .expect(200);

      expect(response.body._id.toString()).toBe(user._id.toString());
      expect(response.body).toHaveProperty("username", "newusername");
      expect(response.body).toHaveProperty("email", "new@example.com");
      expect(response.body).not.toHaveProperty("password_hash");
    });

    test("should return 404 if user not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/users/${fakeId}`)
        .send({ username: "newusername" })
        .expect(404);

      expect(response.body).toHaveProperty("message", "User not found");
    });

    test("should return 400 if user_id is not a valid ObjectId", async () => {
      const response = await request(app)
        .put("/users/not-a-valid-id")
        .send({ username: "newusername" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "Invalid user_id format");
    });
  });

  describe("DELETE /users/:user_id - Delete User", () => {
    test("should delete a user successfully", async () => {
      const user = await User.create({ username: "testuser", email: "test@example.com", password_hash: "hashedpassword" });

      const response = await request(app).delete(`/users/${user._id}`).expect(204);

      expect(response.body).toEqual({});

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    test("should return 404 if user not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app).delete(`/users/${fakeId}`).expect(404);

      expect(response.body).toHaveProperty("message", "User not found");
    });

    test("should return 400 if user_id is not a valid ObjectId", async () => {
      const response = await request(app).delete("/users/not-a-valid-id").expect(400);

      expect(response.body).toHaveProperty("message", "Invalid user_id format");
    });
  });
});
