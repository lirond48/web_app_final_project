import express from "express";
const router = express.Router();
import multer from "multer";
import User from "../model/userModel.js";
import mongoose from "mongoose";

const getBaseUrl = () => {
    const domain = process.env.DOMAIN_BASE || "localhost";
    const port = process.env.PORT || "3000";
    return `http://${domain}:${port}/`;
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.')
            .filter(Boolean) // removes empty extensions (e.g. `filename...txt`)
            .slice(1)
            .join('.')
        cb(null, Date.now() + "." + ext)
    }
})
const upload = multer({ storage: storage });

router.post('/', upload.single("file"), async function (req: any, res: any) {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    
    try {
        // Handle both Windows and Unix path separators
        const parts = req.file.path.split(/[/\\]/);
        const filename = parts[parts.length - 1];
        const base = getBaseUrl();
        const url = base + "uploads/" + filename;
        console.log("router.post(/file: " + url);
        
        // If user_id is provided, save the image URL to the user
        const userId = req.body.user_id || req.query.user_id;
        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ error: "Invalid user_id format" });
            }
            
            const user = await User.findByIdAndUpdate(
                userId,
                { image_url: url },
                { new: true, runValidators: true }
            );
            
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
        }
        
        res.status(200).send({ url: url });
    } catch (err: any) {
        console.error("Error processing file upload:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;