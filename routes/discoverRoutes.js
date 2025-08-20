import express from "express";
import { discoverBooks } from "../controllers/discoverController.js";

const router = express.Router();

// GET /api/discover
router.get("/", discoverBooks);

export default router;
