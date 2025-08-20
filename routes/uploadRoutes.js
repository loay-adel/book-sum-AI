import express from "express";
import multer from "multer";
import { summarizePDF } from "../controllers/uploadController.js";

const router = express.Router();

// إعداد رفع الملفات (يحفظ مؤقتًا في مجلد uploads/)
const upload = multer({ dest: "uploads/" });

// POST /api/upload
router.post("/", upload.single("file"), summarizePDF);

export default router;
