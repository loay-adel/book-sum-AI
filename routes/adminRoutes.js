import express from 'express';
import {
  getAdminStats,
  getPopularSearches,
  getVisitorStats,
  getAdStats,
  getPerformanceStats,
  exportStats,
  clearStats
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';


import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';


const router = express.Router();

// Admin login route

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;



    // Input validation
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    // Find admin user
    const admin = await Admin.findOne({ username, isActive: true });
    
    if (!admin) {

      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {

      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Ensure JWT secret is available
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ 
        message: 'Server configuration error' 
      });
    }

    // Create token with consistent algorithm
    const token = jwt.sign(
      { 
        id: admin._id.toString(), 
        username: admin.username, 
        role: admin.role 
      },
      jwtSecret,
      { 
        expiresIn: '8h',
        algorithm: 'HS256' 
      }
    );



    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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