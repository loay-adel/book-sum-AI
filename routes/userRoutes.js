// routes/userRoutes.js
import express from 'express';
import {
  getUserData,
  saveSearch,
  saveSummary,
  getSearchHistory,
  getSavedSummaries,
  deleteSummary,
  updatePreferences,
  exportUserData,
  clearUserData
} from '../controllers/userController.js';

const router = express.Router();

router.get('/:userId', getUserData);
router.post('/:userId/search', saveSearch);
router.post('/:userId/summary', saveSummary);
router.get('/:userId/search-history', getSearchHistory);
router.get('/:userId/saved-summaries', getSavedSummaries);
router.delete('/:userId/summary/:summaryId', deleteSummary);
router.put('/:userId/preferences', updatePreferences);
router.get('/:userId/export', exportUserData);
router.delete('/:userId/clear', clearUserData);

export default router;