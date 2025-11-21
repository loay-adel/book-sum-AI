// models/AdminStats.js
import mongoose from 'mongoose';

const dailyVisitorSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    default: 0
  },
  unique: {
    type: Number,
    default: 0
  },
  byCountry: {
    type: Map,
    of: Number,
    default: new Map()
  },
  byDevice: {
    type: Map,
    of: Number,
    default: new Map()
  },
  byBrowser: {
    type: Map,
    of: Number,
    default: new Map()
  }
});

const dailySearchSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    default: 0
  },
  successful: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  popularQueries: {
    type: Map,
    of: Number,
    default: new Map()
  }
});

const dailyAdSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  }
});

const dailyPerformanceSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  averageLoadTime: {
    type: Number,
    default: 0
  },
  pdfUploads: {
    type: Number,
    default: 0
  }
});

const adminStatsSchema = new mongoose.Schema({
  overall: {
    visitors: {
      total: {
        type: Number,
        default: 0
      },
      unique: {
        type: Number,
        default: 0
      }
    },
    searches: {
      total: {
        type: Number,
        default: 0
      },
      successRate: {
        type: Number,
        default: 0
      }
    },
    ads: {
      impressions: {
        type: Number,
        default: 0
      },
      clicks: {
        type: Number,
        default: 0
      },
      revenue: {
        type: Number,
        default: 0
      },
      ctr: {
        type: Number,
        default: 0
      },
      byPosition: {
        type: Map,
        of: {
          impressions: Number,
          clicks: Number,
          revenue: Number
        },
        default: new Map()
      }
    },
    performance: {
      averageLoadTime: {
        type: Number,
        default: 0
      },
      pdfUploads: {
        type: Number,
        default: 0
      }
    }
  },
  daily: {
    visitors: [dailyVisitorSchema],
    searches: [dailySearchSchema],
    ads: [dailyAdSchema],
    performance: [dailyPerformanceSchema]
  }
}, {
  timestamps: true
});

export default mongoose.model('AdminStats', adminStatsSchema);