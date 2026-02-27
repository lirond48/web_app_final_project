import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import multerRoutes from "../routes/multerRoutes.js";
import path from "path";
import fs from "fs";

// Use process.cwd() and relative path instead of __dirname
const testDir = path.join(process.cwd(), "test");
const uploadsDir = path.join(process.cwd(), "public", "uploads");

// Set up environment variables for multer
process.env.DOMAIN_BASE = process.env.DOMAIN_BASE || "localhost";
process.env.PORT = process.env.PORT || "3000";

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/upload", multerRoutes);
// Serve static files for testing
app.use(express.static(path.join(process.cwd(), "public")));

describe("File Tests", () => {
    test("upload file", async () => {
        const filePath = path.join(testDir, "avatar.png");
        
        // Check if test file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`Test file not found: ${filePath}`);
        }

        const response = await request(app)
            .post("/upload")
            .attach('file', filePath);
        
        // Log response for debugging
        if (response.statusCode !== 200) {
            console.log("Response status:", response.statusCode);
            console.log("Response body:", JSON.stringify(response.body, null, 2));
            console.log("Response text:", response.text);
        }
        
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty("url");
        
        // Extract the path from the URL
        let url = response.body.url;
        url = url.replace(/^.*\/\/[^/]+/, '');
        
        // Test that the file can be accessed
        const res = await request(app).get(url);
        expect(res.statusCode).toEqual(200);
    });
});