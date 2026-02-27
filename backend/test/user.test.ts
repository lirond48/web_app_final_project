export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const userRoutes = require("../routes/userRoutes");

// Create test app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/users", userRoutes);

// Test database connection
const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_users";

describe("Users API Tests", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_MONGODB_URI);
  });

  afterAll(async () => {
    // Clean up: close database connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up users collection before each test
    const User = require("../model/userModel");
    await User.deleteMany({});
  });

  describe("POST /users - Create User", () => {
    test("should create a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/users")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("user_id");
      expect(response.body).toHaveProperty("username", "testuser");
      expect(response.body).toHaveProperty("email", "test@example.com");
      expect(response.body).not.toHaveProperty("password_hash");
      expect(typeof response.body.user_id).toBe("number");
    });

    test("should return 400 if username is missing", async () => {
      const userData = {
        email: "test@example.com",
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/users")
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty("message", "username, email, password_hash are required");
    });

    test("should return 400 if email is missing", async () => {
      const userData = {
        username: "testuser",
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/users")
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty("message", "username, email, password_hash are required");
    });

    test("should return 400 if password_hash is missing", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com"
      };

      const response = await request(app)
        .post("/users")
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty("message", "username, email, password_hash are required");
    });

    test("should return 409 if email already exists", async () => {
      const User = require("../model/userModel");
      await User.create({
        user_id: 1,
        username: "existinguser",
        email: "test@example.com",
        password_hash: "hashedpassword"
      });

      const userData = {
        username: "newuser",
        email: "test@example.com",
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/users")
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty("message", "Email already exists");
    });
  });

  describe("GET /users - Get All Users", () => {
    test("should get all users", async () => {
      const User = require("../model/userModel");
      await User.create([
        {
          user_id: 1,
          username: "user1",
          email: "user1@example.com",
          password_hash: "hash1"
        },
        {
          user_id: 2,
          username: "user2",
          email: "user2@example.com",
          password_hash: "hash2"
        }
      ]);

      const response = await request(app)
        .get("/users")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty("user_id");
      expect(response.body[0]).toHaveProperty("username");
      expect(response.body[0]).toHaveProperty("email");
      expect(response.body[0]).not.toHaveProperty("password_hash");
    });

    test("should return empty array when no users exist", async () => {
      const response = await request(app)
        .get("/users")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("GET /users/:user_id - Get User by ID", () => {
    test("should get a user by user_id", async () => {
      const User = require("../model/userModel");
      await User.create({
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        password_hash: "hashedpassword"
      });

      const response = await request(app)
        .get("/users/1")
        .expect(200);

      expect(response.body).toHaveProperty("user_id", 1);
      expect(response.body).toHaveProperty("username", "testuser");
      expect(response.body).toHaveProperty("email", "test@example.com");
      expect(response.body).not.toHaveProperty("password_hash");
    });

    test("should return 404 if user not found", async () => {
      const response = await request(app)
        .get("/users/999")
        .expect(404);

      expect(response.body).toHaveProperty("message", "User not found");
    });
  });

  describe("PUT /users/:user_id - Update User", () => {
    test("should update a user successfully", async () => {
      const User = require("../model/userModel");
      await User.create({
        user_id: 1,
        username: "oldusername",
        email: "old@example.com",
        password_hash: "hashedpassword"
      });

      const updateData = {
        username: "newusername",
        email: "new@example.com"
      };

      const response = await request(app)
        .put("/users/1")
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("user_id", 1);
      expect(response.body).toHaveProperty("username", "newusername");
      expect(response.body).toHaveProperty("email", "new@example.com");
      expect(response.body).not.toHaveProperty("password_hash");
    });

    test("should return 404 if user not found", async () => {
      const updateData = {
        username: "newusername"
      };

      const response = await request(app)
        .put("/users/999")
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty("message", "User not found");
    });
  });

  describe("DELETE /users/:user_id - Delete User", () => {
    test("should delete a user successfully", async () => {
      const User = require("../model/userModel");
      await User.create({
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        password_hash: "hashedpassword"
      });

      const response = await request(app)
        .delete("/users/1")
        .expect(204);

      expect(response.body).toEqual({});

      // Verify user is deleted
      const deletedUser = await User.findOne({ user_id: 1 });
      expect(deletedUser).toBeNull();
    });

    test("should return 404 if user not found", async () => {
      const response = await request(app)
        .delete("/users/999")
        .expect(404);

      expect(response.body).toHaveProperty("message", "User not found");
    });
  });
});

