import express from "express";
import multer from "multer";
import { summarizePDF } from "../controllers/uploadController.js";

const router = express.Router();


const upload = multer({ dest: "uploads/" });

// POST /api/upload
router.post("/", upload.single("pdf"), summarizePDF); 
export default router;