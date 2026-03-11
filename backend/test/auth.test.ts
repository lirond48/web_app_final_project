export {};
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const authRoutes = require("../routes/authRoutes").default;

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

  describe("POST /auth/login - Login", () => {
    test("should login successfully with valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword,
      });

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password_hash: "password123" })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(typeof response.body.accessToken).toBe("string");
      expect(typeof response.body.refreshToken).toBe("string");
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.refreshToken.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty("success", true);

      const user = await User.findOne({ email: "test@example.com" });
      expect(user.refresh_token_hash).toBeTruthy();
    });

    test("should return 400 if email is missing", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ password_hash: "password123" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "email and password are required");
    });

    test("should return 400 if password_hash is missing", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com" })
        .expect(400);

      expect(response.body).toHaveProperty("message", "email and password are required");
    });

    test("should return 401 if user does not exist", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: "nonexistent@example.com", password_hash: "password123" })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    test("should return 401 if password is incorrect", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword,
      });

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password_hash: "wrongpassword" })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });
  });

  describe("POST /auth/refresh - Refresh Token", () => {
    test("should return new tokens with valid refresh token", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword,
      });

      const loginResponse = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password_hash: "password123" });

      const { refreshToken } = loginResponse.body;

      const response = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body).toHaveProperty("success", true);
    });

    test("should return 400 if refreshToken is missing", async () => {
      const response = await request(app).post("/auth/refresh").send({}).expect(400);

      expect(response.body).toHaveProperty("message", "refreshToken is required");
    });

    test("should return 401 if refresh token is invalid", async () => {
      const response = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: "invalid_token" })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid refresh token");
    });
  });

  describe("POST /auth/logout - Logout", () => {
    test("should logout successfully with valid refresh token", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        password_hash: hashedPassword,
      });

      const loginResponse = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password_hash: "password123" });

      const { refreshToken } = loginResponse.body;

      const response = await request(app)
        .post("/auth/logout")
        .send({ refreshToken })
        .expect(204);

      expect(response.body).toEqual({});

      const user = await User.findOne({ email: "test@example.com" });
      expect(user.refresh_token_hash).toBeNull();
    });

    test("should return 400 if refreshToken is missing", async () => {
      const response = await request(app).post("/auth/logout").send({}).expect(400);

      expect(response.body).toHaveProperty("message", "refreshToken is required");
    });

    test("should return 204 if refresh token is invalid or expired", async () => {
      const response = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: "invalid_token_string" })
        .expect(204);

      expect(response.body).toEqual({});
    });

    test("should return 204 if refresh token was signed with wrong secret", async () => {
      const jwt = require("jsonwebtoken");
      const invalidToken = jwt.sign(
        { sub: new mongoose.Types.ObjectId().toString() },
        "wrong_secret",
        { expiresIn: "7d" }
      );

      const response = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: invalidToken })
        .expect(204);

      expect(response.body).toEqual({});
    });
  });
});
