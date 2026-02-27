export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const authRoutes = require("../routes/authRoutes");

// Create test app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/auth", authRoutes);

// Test database connection
const TEST_MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test_auth";

// Set up JWT secrets for testing
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret_key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret_key";

describe("Auth API Tests", () => {
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

  describe("POST /auth/login - Login", () => {
    test("should login successfully with valid credentials", async () => {
      const User = require("../model/userModel");
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword
      });

      const loginData = {
        email: "test@example.com",
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(typeof response.body.accessToken).toBe("string");
      expect(typeof response.body.refreshToken).toBe("string");
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.refreshToken.length).toBeGreaterThan(0);

      // Verify refresh token hash is saved in database
      const user = await User.findOne({ email: "test@example.com" });
      expect(user.refresh_token_hash).toBeTruthy();
    });

    test("should return 400 if email is missing", async () => {
      const loginData = {
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty("message", "email and password are required");
    });

    test("should return 400 if password_hash is missing", async () => {
      const loginData = {
        email: "test@example.com"
      };

      const response = await request(app)
        .post("/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty("message", "email and password are required");
    });

    test("should return 401 if user does not exist", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password_hash: "password123"
      };

      const response = await request(app)
        .post("/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    test("should return 401 if password is incorrect", async () => {
      const User = require("../model/userModel");
      const hashedPassword = await bcrypt.hash("correctpassword", 10);
      await User.create({
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword
      });

      const loginData = {
        email: "test@example.com",
        password_hash: "wrongpassword"
      };

      const response = await request(app)
        .post("/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });
  });

  describe("POST /auth/logout - Logout", () => {
    test("should logout successfully with valid refresh token", async () => {
      const User = require("../model/userModel");
      const jwt = require("jsonwebtoken");
      
      // Create a user
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword,
        refresh_token_hash: await bcrypt.hash("some_refresh_token", 10)
      });

      // Create a valid refresh token
      const refreshToken = jwt.sign(
        { sub: 1 },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      const logoutData = {
        refreshToken
      };

      const response = await request(app)
        .post("/auth/logout")
        .send(logoutData)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify refresh token hash is removed from database
      const user = await User.findOne({ user_id: 1 });
      expect(user.refresh_token_hash).toBeNull();
    });

    test("should return 400 if refreshToken is missing", async () => {
      const logoutData = {};

      const response = await request(app)
        .post("/auth/logout")
        .send(logoutData)
        .expect(400);

      expect(response.body).toHaveProperty("message", "refreshToken is required");
    });

    test("should return 204 if refresh token is invalid or expired", async () => {
      const invalidToken = "invalid_token_string";

      const logoutData = {
        refreshToken: invalidToken
      };

      const response = await request(app)
        .post("/auth/logout")
        .send(logoutData)
        .expect(204);

      expect(response.body).toEqual({});
    });

    test("should return 204 if refresh token has invalid format", async () => {
      const User = require("../model/userModel");
      const jwt = require("jsonwebtoken");
      
      // Create a token with wrong secret
      const invalidToken = jwt.sign(
        { sub: 1 },
        "wrong_secret",
        { expiresIn: "7d" }
      );

      const logoutData = {
        refreshToken: invalidToken
      };

      const response = await request(app)
        .post("/auth/logout")
        .send(logoutData)
        .expect(204);

      expect(response.body).toEqual({});
    });

    test("should logout successfully and clear refresh token even if user doesn't exist", async () => {
      const jwt = require("jsonwebtoken");
      
      // Create a valid refresh token for non-existent user
      const refreshToken = jwt.sign(
        { sub: 999 },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      const logoutData = {
        refreshToken
      };

      const response = await request(app)
        .post("/auth/logout")
        .send(logoutData)
        .expect(204);

      expect(response.body).toEqual({});
    });
  });
});

