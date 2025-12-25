import express from "express";
import multer from "multer";
import {
  uploadImage,
  getBookCover,
  cleanupOldImages
} from "../controllers/imageController.js";
import path from "path";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload image for a book
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { bookTitle } = req.body;
    
    if (!bookTitle || !req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Book title and image are required" 
      });
    }

    const imageInfo = await uploadImage(req.file, bookTitle);
    
    res.json({
      success: true,
      message: "Image uploaded successfully",
      image: imageInfo
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to upload image" 
    });
  }
});

// Get or download book cover
router.get("/cover/:bookTitle", async (req, res) => {
  try {
    const { bookTitle } = req.params;
    const { author, force } = req.query;
    
    if (!bookTitle) {
      return res.status(400).json({ 
        success: false, 
        message: "Book title is required" 
      });
    }

    const imageInfo = await getBookCover(bookTitle, author, force === 'true');
    
    res.json({
      success: true,
      bookTitle,
      image: imageInfo
    });
  } catch (error) {
    console.error("Error getting book cover:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get book cover" 
    });
  }
});

// Clean up old images (admin only)
router.delete("/cleanup", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await cleanupOldImages(parseInt(days));
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deleted} old images`,
      ...result
    });
  } catch (error) {
    console.error("Error cleaning up images:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to clean up images" 
    });
  }
});

export default router;