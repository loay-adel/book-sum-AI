import AdminStats from '../models/AdminStats.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import crypto from 'crypto';

const generateSecureToken = (adminId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  // In production, store token in database with expiry
  return { token, expires };
};


export const getAdminStats = async (req, res) => {
  try {
    let stats = await AdminStats.findOne().sort({ createdAt: -1 });
    
    if (!stats) {
      // Create default stats if none exist
      stats = new AdminStats({
        overall: {
          visitors: { total: 0, unique: 0 },
          searches: { total: 0, successRate: 0 },
          ads: { impressions: 0, clicks: 0, revenue: 0, ctr: 0 },
          performance: { averageLoadTime: 0, pdfUploads: 0 }
        },
        daily: {
          visitors: [],
          searches: [],
          ads: [],
          performance: []
        }
      });
      await stats.save();
    }

    // Calculate real statistics from user data
    const users = await User.find({});
    
    // Calculate total searches and summaries from all users
    let totalSearches = 0;
    let totalSummaries = 0;
    let successfulSearches = 0;
    
    users.forEach(user => {
      totalSearches += user.activityStats?.totalSearches || 0;
      totalSummaries += user.activityStats?.totalSummaries || 0;
      
      // Count successful searches (simplified - you might want more sophisticated logic)
      user.searchHistory?.forEach(search => {
        if (search.success) successfulSearches++;
      });
    });

    // Update stats with real data
    stats.overall.searches.total = totalSearches;
    stats.overall.searches.successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0;
    stats.overall.performance.pdfUploads = totalSummaries; // Using summaries as proxy for uploads

    await stats.save();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
};

export const getPopularSearches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const users = await User.find({});
    
    const allSearches = new Map();
    
    // Aggregate searches from all users
    users.forEach(user => {
      user.searchHistory?.forEach(search => {
        if (search.query) {
          allSearches.set(search.query, (allSearches.get(search.query) || 0) + 1);
        }
      });
    });

    const popularSearches = Array.from(allSearches.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([query, count]) => ({ query, count }));

    res.json(popularSearches);
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    res.status(500).json({ message: 'Failed to fetch popular searches' });
  }
};

export const getVisitorStats = async (req, res) => {
  try {
    const users = await User.find({});
    const totalUsers = users.length;
    
    // Calculate unique visitors (simplified - using user count)
    const uniqueVisitors = totalUsers;
    
    // Calculate today's visitors (users active today)
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = users.filter(user => {
      const lastActive = new Date(user.activityStats?.lastActive).toISOString().split('T')[0];
      return lastActive === today;
    }).length;

    res.json({
      total: totalUsers * 3, // Estimate: each user visits 3 times on average
      today: todayVisitors,
      unique: uniqueVisitors,
      byCountry: {}, // You'll need to track this separately
      byDevice: {},  // You'll need to track this separately  
      byBrowser: {}  // You'll need to track this separately
    });
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({ message: 'Failed to fetch visitor statistics' });
  }
};

export const getPerformanceStats = async (req, res) => {
  try {
    const users = await User.find({});
    
    let totalSearches = 0;
    let successfulSearches = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalSummaries = 0;

    users.forEach(user => {
      totalSearches += user.activityStats?.totalSearches || 0;
      totalSummaries += user.activityStats?.totalSummaries || 0;
      
      user.searchHistory?.forEach(search => {
        if (search.success) successfulSearches++;
        if (search.responseTime) {
          totalResponseTime += search.responseTime;
          responseTimeCount++;
        }
      });
    });

    const averageLoadTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0;
    const failedSearches = totalSearches - successfulSearches;

    res.json({
      averageLoadTime: Math.round(averageLoadTime),
      successfulSearches,
      failedSearches,
      pdfUploads: totalSummaries,
      successRate: Math.round(successRate * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    res.status(500).json({ message: 'Failed to fetch performance statistics' });
  }
};

// Keep your existing ad stats and other functions...
export const getAdStats = async (req, res) => {
  try {
    const stats = await AdminStats.findOne().sort({ createdAt: -1 });
    
    if (!stats) {
      return res.json({
        impressions: 0,
        clicks: 0,
        revenue: 0,
        ctr: 0,
        byPosition: {}
      });
    }

    res.json({
      impressions: stats.overall.ads.impressions,
      clicks: stats.overall.ads.clicks,
      revenue: stats.overall.ads.revenue,
      ctr: stats.overall.ads.ctr,
      byPosition: stats.overall.ads.byPosition ? Object.fromEntries(stats.overall.ads.byPosition) : {}
    });
  } catch (error) {
    console.error('Error fetching ad stats:', error);
    res.status(500).json({ message: 'Failed to fetch ad statistics' });
  }
};

// ADD THE MISSING EXPORTS HERE:
export const exportStats = async (req, res) => {
  try {
    const stats = await AdminStats.findOne().sort({ createdAt: -1 });
    
    if (!stats) {
      return res.status(404).json({ message: 'No statistics found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=bookwise-stats-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error exporting stats:', error);
    res.status(500).json({ message: 'Failed to export statistics' });
  }
};

export const clearStats = async (req, res) => {
  try {
    await AdminStats.deleteMany({});
    
    // Create a fresh empty stats document
    const newStats = new AdminStats({
      overall: {
        visitors: { total: 0, unique: 0 },
        searches: { total: 0, successRate: 0 },
        ads: { impressions: 0, clicks: 0, revenue: 0, ctr: 0 },
        performance: { averageLoadTime: 0, pdfUploads: 0 }
      },
      daily: {
        visitors: [],
        searches: [],
        ads: [],
        performance: []
      }
    });
    
    await newStats.save();
    
    res.json({ message: 'All statistics cleared successfully' });
  } catch (error) {
    console.error('Error clearing stats:', error);
    res.status(500).json({ message: 'Failed to clear statistics' });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    // Sanitize input
    const sanitizedUsername = username.toLowerCase().trim();
    
    // Find admin user
    const admin = await Admin.findOne({ 
      username: sanitizedUsername,
      isActive: true 
    });
    
    if (!admin) {
      // Don't reveal that user doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay response
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      const timeLeft = Math.ceil((admin.lockUntil - Date.now()) / 1000);
      return res.status(423).json({
        message: `Account is locked. Try again in ${timeLeft} seconds.`,
        retryAfter: 0
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment failed attempts
      await admin.incLoginAttempts();
      
      // Check if account should be locked
      const updatedAdmin = await Admin.findById(admin._id);
      if (updatedAdmin.isLocked()) {
        return res.status(423).json({
          message: 'Account has been locked due to too many failed attempts. Try again in 15 minutes.',
          retryAfter: 900 // 15 minutes in seconds
        });
      }
      
      // Delay response to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

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

    // Create secure token with limited payload
    const token = jwt.sign(
      { 
        id: admin._id.toString(),
        role: admin.role,
        iss: 'bookwise-admin',
        aud: 'bookwise-web'
      },
      jwtSecret,
      { 
        expiresIn: '8h',
        algorithm: 'HS256',
        jwtid: crypto.randomBytes(16).toString('hex') // Unique JWT ID
      }
    );

 const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
      domain: isProduction ? '.booksummarizer.net' : undefined
    };

    console.log('Setting cookie with options:', cookieOptions);
    console.log('Token to set:', token.substring(0, 20) + '...');

    res.cookie('admin_token', token, cookieOptions);

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        lastLogin: admin.lastLogin
      },
      // For debugging, also return token in response (remove in production)
      token: process.env.NODE_ENV === 'development' ? token : undefined
    });

  } catch (error) {
    console.error('Admin login error:', error);
    
    // Don't leak sensitive error information
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Authentication failed';
    
    res.status(500).json({ 
      message: errorMessage
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear cookie
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    // If using Authorization header, recommend client to remove token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify current password
    const isValid = await admin.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    // Invalidate all existing sessions (optional)
    // You could implement a token blacklist here

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id)
      .select('-password -twoFactorSecret -loginAttempts -lockUntil');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update fields
    if (username) admin.username = username;
    if (email) admin.email = email;
    
    admin.updatedAt = new Date();
    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
