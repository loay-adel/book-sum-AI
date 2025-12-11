import Blog from '../models/Blog.js';
import User from '../models/User.js';

// Save AI response as blog post
export const saveAIResponseAsBlog = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      aiResponse, 
      bookDetails, 
      tags = [], 
      category, 
      language,
      userId,
      username 
    } = req.body;

    // Validate required fields
    if (!title || !content || !aiResponse || !userId) {
      return res.status(400).json({
        message: 'Title, content, AI response, and userId are required'
      });
    }

    // Create new blog post
    const blog = new Blog({
      title,
      content,
      aiResponse,
      bookDetails: bookDetails || null,
      user: {
        userId,
        username: username || `User_${userId.slice(0, 6)}`
      },
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
      category: category || 'Uncategorized',
      language: language || 'en'
    });

    // Save to database
    await blog.save();

    // Also save to user's activity if user exists
    try {
      await User.findOneAndUpdate(
        { userId },
        { 
          $push: { 
            blogPosts: {
              blogId: blog._id,
              title: blog.title,
              timestamp: blog.createdAt
            }
          },
          $set: { 
            'activityStats.lastActive': new Date()
          }
        },
        { upsert: true }
      );
    } catch (userError) {
      console.log('Note: User not found, but blog saved successfully');
    }

    res.status(201).json({
      message: 'Blog post created successfully',
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        createdAt: blog.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving blog post:', error);
    res.status(500).json({
      message: 'Error creating blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get latest blog posts
export const getLatestBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      language,
      sortBy = 'newest'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { isPublished: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (language && language !== 'all') {
      query.language = language;
    }

    // Build sort options
    let sortOptions = {};
    switch(sortBy) {
      case 'oldest':
        sortOptions.createdAt = 1;
        break;
      case 'popular':
        sortOptions.views = -1;
        break;
      case 'featured':
        query.featured = true;
        sortOptions.createdAt = -1;
        break;
      default: // newest
        sortOptions.createdAt = -1;
    }

    // Get total count for pagination
    const total = await Blog.countDocuments(query);

    // Get blogs with pagination
    const blogs = await Blog.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -updatedAt')
      .lean();

    // Format response
    const formattedBlogs = blogs.map(blog => ({
      id: blog._id,
      title: blog.title,
      excerpt: blog.content.substring(0, 200) + (blog.content.length > 200 ? '...' : ''),
      aiResponseExcerpt: blog.aiResponse.substring(0, 150) + (blog.aiResponse.length > 150 ? '...' : ''),
      bookDetails: blog.bookDetails,
      user: blog.user,
      category: blog.category,
      language: blog.language,
      tags: blog.tags,
      views: blog.views,
      likesCount: blog.likes.length,
      commentsCount: blog.comments.length,
      createdAt: blog.createdAt,
      slug: blog.slug,
      featured: blog.featured
    }));

    res.json({
      blogs: formattedBlogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({
      message: 'Error fetching blog posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single blog post by slug
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOneAndUpdate(
      { slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    )
    .select('-__v')
    .lean();

    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Get related posts
    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      $or: [
        { category: blog.category },
        { tags: { $in: blog.tags } }
      ],
      isPublished: true
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title slug thumbnail createdAt')
    .lean();

    res.json({
      blog: {
        ...blog,
        id: blog._id,
        relatedBlogs
      }
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      message: 'Error fetching blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add like to blog post
export const likeBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Check if user already liked
    const alreadyLiked = blog.likes.some(like => like.userId === userId);
    
    if (alreadyLiked) {
      // Remove like
      blog.likes = blog.likes.filter(like => like.userId !== userId);
      await blog.save();
      
      return res.json({
        message: 'Like removed',
        likesCount: blog.likes.length,
        liked: false
      });
    }

    // Add like
    blog.likes.push({ userId });
    await blog.save();

    res.json({
      message: 'Blog liked successfully',
      likesCount: blog.likes.length,
      liked: true
    });
  } catch (error) {
    console.error('Error liking blog:', error);
    res.status(500).json({
      message: 'Error processing like',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add comment to blog post
export const addComment = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { userId, username, content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ 
        message: 'userId and content are required' 
      });
    }

    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Add comment
    blog.comments.push({
      userId,
      username: username || `User_${userId.slice(0, 6)}`,
      content
    });

    await blog.save();

    // Get the last comment (the one we just added)
    const newComment = blog.comments[blog.comments.length - 1];

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment,
      commentsCount: blog.comments.length
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      message: 'Error adding comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get blog categories
export const getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { 
        _id: '$category', 
        count: { $sum: 1 },
        latest: { $max: '$createdAt' }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json(categories.map(cat => ({
      name: cat._id,
      count: cat.count,
      latest: cat.latest
    })));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Search blog posts
export const searchBlogs = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Text search
    const blogs = await Blog.find(
      { 
        $text: { $search: q },
        isPublished: true 
      },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" }, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v -updatedAt')
    .lean();

    // Count total results
    const total = await Blog.countDocuments({ 
      $text: { $search: q },
      isPublished: true 
    });

    res.json({
      blogs: blogs.map(blog => ({
        id: blog._id,
        title: blog.title,
        excerpt: blog.content.substring(0, 150) + (blog.content.length > 150 ? '...' : ''),
        bookDetails: blog.bookDetails,
        user: blog.user,
        category: blog.category,
        views: blog.views,
        createdAt: blog.createdAt,
        slug: blog.slug
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        query: q
      }
    });
  } catch (error) {
    console.error('Error searching blogs:', error);
    res.status(500).json({
      message: 'Error searching blog posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


export const saveAutoBlog = async (req, res) => {
  console.log('saveAutoBlog called with body:', req.body);
  
  try {
    const { 
      title, 
      content, 
      aiResponse, 
      bookDetails, 
      tags = [], 
      category, 
      language = 'en',
      userId,
      username,
      isPublished = true,
      featured = false,
      generationType = 'ai_summary'
    } = req.body;

    console.log('Validating required fields...');

    // Validate required fields
    if (!title || !content || !aiResponse || !userId) {
      console.log('Missing required fields:', { title, content, aiResponse, userId });
      return res.status(400).json({
        message: 'Title, content, AI response, and userId are required'
      });
    }

    console.log('Creating new blog post...');

    // Create new blog post
    const blog = new Blog({
      title,
      content,
      aiResponse,
      bookDetails: bookDetails || null,
      user: {
        userId,
        username: username || `User_${userId.slice(-6)}`
      },
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
      category: category || 'AI Generated Summaries',
      language,
      isPublished,
      featured,
      isAutoGenerated: true,
      generationType,
      source: generationType === 'pdf_summary' ? 'pdf_upload' : 'user_search',
      metadata: {
        aiModel: 'GPT-4',
        wordCount: aiResponse.split(' ').length,
        responseTime: req.body.responseTime || 0
      }
    });

    console.log('Blog document created:', blog);

    // Save to database
    await blog.save();
    
    console.log('Blog saved successfully, ID:', blog._id);

    res.status(201).json({
      message: 'Blog auto-saved successfully',
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        createdAt: blog.createdAt
      }
    });
  } catch (error) {
    console.error('Error auto-saving blog post:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Error auto-saving blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};