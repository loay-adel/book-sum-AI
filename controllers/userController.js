import User from '../models/User.js';

export const getUserData = async (req, res) => {
  try {
    const { userId } = req.params;
    let user = await User.findOne({ userId });

    if (!user) {
      // إنشاء مستخدم جديد إذا لم يوجد
      user = new User({
        userId,
        searchHistory: [],
        savedSummaries: [],
        readingPreferences: {
          favoriteCategories: [],
          preferredLanguages: ['en', 'ar'],
          readingLevel: 'intermediate'
        },
        activityStats: {
          totalSearches: 0,
          totalSummaries: 0,
          lastActive: new Date()
        }
      });
      await user.save();
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

export const saveSearch = async (req, res) => {
  try {
    const { userId } = req.params;
    const { query, resultsCount, bookTitle, success = true, responseTime = 0 } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const searchEntry = {
      query,
      resultsCount: resultsCount || 0,
      bookTitle: bookTitle || null,
      success,
      responseTime
    };

    user.searchHistory.unshift(searchEntry);
    
    // الاحتفاظ بآخر 50 بحث فقط
    if (user.searchHistory.length > 50) {
      user.searchHistory = user.searchHistory.slice(0, 50);
    }

    user.activityStats.totalSearches++;
    user.activityStats.lastActive = new Date();

    await user.save();
    res.json({ message: 'Search saved successfully', search: searchEntry });
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ message: 'Failed to save search' });
  }
};

export const saveSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { book, summary, type = 'search', amazonLink, recommendations = [] } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const summaryEntry = {
      book,
      summary,
      type,
      amazonLink,
      recommendations
    };

    // التحقق من عدم وجود نسخة مكررة
    const existingIndex = user.savedSummaries.findIndex(
      s => s.book.title === book.title
    );

    if (existingIndex !== -1) {
      user.savedSummaries[existingIndex] = summaryEntry;
    } else {
      user.savedSummaries.unshift(summaryEntry);
    }

    // الاحتفاظ بآخر 100 ملخص فقط
    if (user.savedSummaries.length > 100) {
      user.savedSummaries = user.savedSummaries.slice(0, 100);
    }

    user.activityStats.totalSummaries++;
    user.activityStats.lastActive = new Date();

    await user.save();
    res.json({ message: 'Summary saved successfully', summary: summaryEntry });
  } catch (error) {
    console.error('Error saving summary:', error);
    res.status(500).json({ message: 'Failed to save summary' });
  }
};

export const getSearchHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.json([]);
    }

    const history = user.searchHistory.slice(0, parseInt(limit));
    res.json(history);
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ message: 'Failed to fetch search history' });
  }
};

export const getSavedSummaries = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.json([]);
    }

    const summaries = user.savedSummaries.slice(0, parseInt(limit));
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching saved summaries:', error);
    res.status(500).json({ message: 'Failed to fetch saved summaries' });
  }
};

export const deleteSummary = async (req, res) => {
  try {
    const { userId, summaryId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.savedSummaries = user.savedSummaries.filter(
      summary => summary._id.toString() !== summaryId
    );

    await user.save();
    res.json({ message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ message: 'Failed to delete summary' });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.readingPreferences = { ...user.readingPreferences, ...preferences };
    user.activityStats.lastActive = new Date();

    await user.save();
    res.json({ message: 'Preferences updated successfully', preferences: user.readingPreferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
};

export const exportUserData = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=bookwise-user-${userId}-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ message: 'Failed to export user data' });
  }
};

export const clearUserData = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.searchHistory = [];
    user.savedSummaries = [];
    user.activityStats.totalSearches = 0;
    user.activityStats.totalSummaries = 0;
    user.activityStats.lastActive = new Date();

    await user.save();
    res.json({ message: 'User data cleared successfully' });
  } catch (error) {
    console.error('Error clearing user data:', error);
    res.status(500).json({ message: 'Failed to clear user data' });
  }
};