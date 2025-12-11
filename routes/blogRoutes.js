// routes/blogRoutes.js
import express from 'express';
import { 
  saveAutoBlog, 
  getLatestBlogs, 
  getBlogBySlug,
  likeBlog,
  addComment,
  getBlogCategories,
  searchBlogs
} from '../controllers/blogController.js';

const router = express.Router();

// Auto-save routes
router.post('/auto-save', saveAutoBlog);
router.post('/save-pdf-summary', saveAutoBlog);

// Other blog routes
router.get('/latest', getLatestBlogs);
router.get('/:slug', getBlogBySlug);
router.post('/:blogId/like', likeBlog);
router.post('/:blogId/comment', addComment);
router.get('/categories/all', getBlogCategories);
router.get('/search', searchBlogs);

export default router;