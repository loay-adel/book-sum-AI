// routes/categoryRoutes.js
import express from "express";
import {
  getCategories,
  getCategoryBooks,
} from "../controllers/categoryController.js";

const router = express.Router();

// GET /api/categories
router.get("/", getCategories);

// GET /api/categories/:id
router.get("/:id", getCategoryBooks);

export default router;
