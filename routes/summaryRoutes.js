import express from "express";
import { getBookSummary } from "../controllers/summaryController.js";

const router = express.Router();

// POST /api/summary
router.post("/", getBookSummary);

export default router;
