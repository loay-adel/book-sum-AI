import express from 'express';
import {
  getAdminStats,
  getPopularSearches,
  getVisitorStats,
  getAdStats,
  getPerformanceStats,
  exportStats,
  clearStats,
  adminLogin
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';





const router = express.Router();

// Admin login route

router.post('/login', )

// Protected admin routes
router.use(authenticateAdmin);

router.get('/stats', getAdminStats);
router.get('/stats/popular-searches', getPopularSearches);
router.get('/stats/visitors', getVisitorStats);
router.get('/stats/ads', getAdStats);
router.get('/stats/performance', getPerformanceStats);
router.get('/stats/export', exportStats);
router.delete('/stats/clear', clearStats);

export default router;