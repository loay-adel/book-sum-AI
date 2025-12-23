// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

// Rate limiting configuration
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 50;

export const authenticateAdmin = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // Also check for token in cookies
    else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'No authentication token provided' 
      });
    }

    // Verify JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ 
        message: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, jwtSecret, { 
      algorithms: ['HS256'],
      maxAge: '8h'
    });

    // Check if admin exists and is active
    const admin = await Admin.findById(decoded.id).select('-password -twoFactorSecret');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        message: 'Admin account not found or inactive' 
      });
    }

    // Add admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Rate limiting middleware for login
export const loginRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { attempts: 1, firstAttempt: now });
  } else {
    const record = rateLimit.get(ip);
    
    // Reset if window has passed
    if (now - record.firstAttempt > RATE_LIMIT_WINDOW) {
      rateLimit.set(ip, { attempts: 1, firstAttempt: now });
    } else {
      record.attempts++;
      
      if (record.attempts > MAX_ATTEMPTS) {
        return res.status(429).json({
          message: 'Too many login attempts. Please try again in 15 minutes.',
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - record.firstAttempt)) / 1000)
        });
      }
    }
  }
  
  next();
};

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimit.entries()) {
    if (now - record.firstAttempt > RATE_LIMIT_WINDOW) {
      rateLimit.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);