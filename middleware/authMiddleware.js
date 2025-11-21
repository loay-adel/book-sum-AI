// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }


    // Verify token with better error handling
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    

    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: 'Admin account deactivated' });
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({ message: 'Token expired' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.name, error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      // More specific error messages
      if (error.message.includes('malformed')) {
        return res.status(401).json({ message: 'Token is malformed or corrupted' });
      }
      if (error.message.includes('secret')) {
        return res.status(401).json({ message: 'Token verification failed' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    res.status(401).json({ message: 'Authentication failed' });
  }
};