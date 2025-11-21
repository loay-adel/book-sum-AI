// controllers/adminController.js
import AdminStats from '../models/AdminStats.js';
import User from '../models/User.js';

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