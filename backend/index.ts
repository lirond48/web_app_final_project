import dotenv from "dotenv";
dotenv.config({ path: ".env_dev" });
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import multerRoutes from "./routes/multerRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import passport from "passport";
import { initPassport } from "./controllers/passportConfig.js";

const app = express();

// Serve static files from public directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// OAuth (Google)
initPassport();
app.use(passport.initialize());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use("/post", postRoutes);
app.use("/comment", commentRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/upload", multerRoutes);
app.use("/", likeRoutes);
app.use("/public", express.static("public"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mongo connection failed:", message);
    process.exit(1);
  }
}

startServer();
