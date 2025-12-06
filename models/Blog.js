import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  bookDetails: {
    title: String,
    author: String,
    thumbnail: String
  },
  user: {
    userId: {
      type: String,
      required: true
    },
    username: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    default: 'Uncategorized'
  },
  language: {
    type: String,
    enum: ['en', 'ar'],
    default: 'en'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    userId: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    userId: String,
    username: String,
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

// Generate slug before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }
  next();
});

// Index for better query performance
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Blog', blogSchema);