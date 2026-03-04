import dotenv from "dotenv";
dotenv.config({ path: ".env_dev" });

import express from "express";
import bodyParser from "body-parser";
import request from "supertest";
import mongoose from "mongoose";
import Post from "../model/postModel.js";
import searchRoutes from "../routes/searchRoutes.js";

type Case = {
  query: string;
  description: string;
};

const TEST_CASES: Case[] = [
  { query: "party", description: "night out celebration" },
  { query: "work", description: "office business meeting" },
  { query: "daily", description: "CASUAL everyday" },
  { query: "sporty", description: "gym workout training" },
  { query: "formal", description: "suit elegant tuxedo" },
];

async function seedPosts() {
  for (const testCase of TEST_CASES) {
    const exists = await Post.findOne({ description: testCase.description }).lean();
    if (exists) {
      continue;
    }

    await Post.create({
      user_id: new mongoose.Types.ObjectId(),
      url_image: `/uploads/recall-seed-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`,
      description: testCase.description,
      like_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

async function run() {
  process.env.LLM_MODE = "mock";
  process.env.DEBUG_AI = "true";

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await seedPosts();

  const app = express();
  app.use(bodyParser.json());
  app.use("/api", searchRoutes);

  for (const testCase of TEST_CASES) {
    const response = await request(app).get(`/api/search?q=${encodeURIComponent(testCase.query)}`).expect(200);
    const results = Array.isArray(response.body?.results) ? response.body.results : [];
    const found = results.some((item: any) =>
      String(item?.post?.description || "").toLowerCase().includes(testCase.description.toLowerCase())
    );

    if (!found) {
      throw new Error(`Recall verification failed for query "${testCase.query}"`);
    }
  }

  console.log("verifySearchRecall passed");
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
