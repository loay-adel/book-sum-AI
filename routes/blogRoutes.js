import express from 'express';
import {
  saveAIResponseAsBlog,
  getLatestBlogs,
  getBlogBySlug,
  likeBlog,
  addComment,
  getBlogCategories,
  searchBlogs,
  saveAutoBlog 
} from '../controllers/blogController.js';

const router = express.Router();

// Save AI response as blog
router.post('/save', saveAIResponseAsBlog);

// Get latest blogs
router.get('/latest', getLatestBlogs);

// Get blog by slug
router.get('/:slug', getBlogBySlug);

// Like a blog
router.post('/:blogId/like', likeBlog);

// Add comment to blog
router.post('/:blogId/comment', addComment);

// Get categories
router.get('/categories/all', getBlogCategories);

// Search blogs
router.get('/search/all', searchBlogs);

// Auto-save route for automatic blog generation
router.post('/save/auto', saveAutoBlog); 

export default router;