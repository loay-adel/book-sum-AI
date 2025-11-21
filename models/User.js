import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resultsCount: {
    type: Number,
    default: 0
  },
  bookTitle: String,
  success: {
    type: Boolean,
    default: true
  },
  responseTime: {
    type: Number,
    default: 0
  }
});

const savedSummarySchema = new mongoose.Schema({
  book: {
    title: {
      type: String,
      required: true
    },
    author: String,
    thumbnail: String,
    pageCount: Number
  },
  summary: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['search', 'upload'],
    default: 'search'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  amazonLink: String,
  recommendations: [{
    title: String,
    author: String,
    thumbnail: String
  }]
});

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  searchHistory: [searchHistorySchema],
  savedSummaries: [savedSummarySchema],
  readingPreferences: {
    favoriteCategories: [String],
    preferredLanguages: {
      type: [String],
      default: ['en', 'ar']
    },
    readingLevel: {
      type: String,
      default: 'intermediate'
    }
  },
  activityStats: {
    totalSearches: {
      type: Number,
      default: 0
    },
    totalSummaries: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);