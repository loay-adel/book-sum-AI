import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

// Enhanced fallback with comprehensive sample books
const getFallbackCategoryBooks = (category) => {
  const fallbackBooks = {
    fiction: [
      { id: "fiction-1", title: "The Great Gatsby", author: "F. Scott Fitzgerald", thumbnail: "https://covers.openlibrary.org/b/id/8265047-M.jpg" },
      { id: "fiction-2", title: "To Kill a Mockingbird", author: "Harper Lee", thumbnail: "https://covers.openlibrary.org/b/id/8265048-M.jpg" },
      { id: "fiction-3", title: "1984", author: "George Orwell", thumbnail: "https://covers.openlibrary.org/b/id/7222246-M.jpg" },
      { id: "fiction-4", title: "Pride and Prejudice", author: "Jane Austen", thumbnail: "https://covers.openlibrary.org/b/id/8265051-M.jpg" },
    ],
    science: [
      { id: "science-1", title: "A Brief History of Time", author: "Stephen Hawking", thumbnail: "https://covers.openlibrary.org/b/id/8265050-M.jpg" },
      { id: "science-2", title: "The Selfish Gene", author: "Richard Dawkins", thumbnail: "https://covers.openlibrary.org/b/id/8265053-M.jpg" },
      { id: "science-3", title: "Cosmos", author: "Carl Sagan", thumbnail: "https://covers.openlibrary.org/b/id/8265055-M.jpg" },
    ],
    business: [
      { id: "business-1", title: "The Lean Startup", author: "Eric Ries", thumbnail: "https://covers.openlibrary.org/b/id/8265052-M.jpg" },
      { id: "business-2", title: "Good to Great", author: "Jim Collins", thumbnail: "https://covers.openlibrary.org/b/id/8265057-M.jpg" },
      { id: "business-3", title: "The 7 Habits of Highly Effective People", author: "Stephen R. Covey", thumbnail: "https://covers.openlibrary.org/b/id/8265059-M.jpg" },
    ],
    fantasy: [
      { id: "fantasy-1", title: "The Hobbit", author: "J.R.R. Tolkien", thumbnail: "https://covers.openlibrary.org/b/id/8265054-M.jpg" },
      { id: "fantasy-2", title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", thumbnail: "https://covers.openlibrary.org/b/id/8265061-M.jpg" },
      { id: "fantasy-3", title: "The Name of the Wind", author: "Patrick Rothfuss", thumbnail: "https://covers.openlibrary.org/b/id/8265063-M.jpg" },
    ],
    biography: [
      { id: "biography-1", title: "Steve Jobs", author: "Walter Isaacson", thumbnail: "https://covers.openlibrary.org/b/id/8265056-M.jpg" },
      { id: "biography-2", title: "The Diary of a Young Girl", author: "Anne Frank", thumbnail: "https://covers.openlibrary.org/b/id/8265065-M.jpg" },
      { id: "biography-3", title: "Long Walk to Freedom", author: "Nelson Mandela", thumbnail: "https://covers.openlibrary.org/b/id/8265067-M.jpg" },
    ],
    history: [
      { id: "history-1", title: "Sapiens", author: "Yuval Noah Harari", thumbnail: "https://covers.openlibrary.org/b/id/8265058-M.jpg" },
      { id: "history-2", title: "Guns, Germs, and Steel", author: "Jared Diamond", thumbnail: "https://covers.openlibrary.org/b/id/8265068-M.jpg" },
      { id: "history-3", title: "A People's History of the United States", author: "Howard Zinn", thumbnail: "https://covers.openlibrary.org/b/id/8265069-M.jpg" },
    ],
    technology: [
      { id: "technology-1", title: "The Innovators", author: "Walter Isaacson", thumbnail: "https://covers.openlibrary.org/b/id/8265060-M.jpg" },
      { id: "technology-2", title: "The Phoenix Project", author: "Gene Kim", thumbnail: "https://covers.openlibrary.org/b/id/8265070-M.jpg" },
      { id: "technology-3", title: "Clean Code", author: "Robert C. Martin", thumbnail: "https://covers.openlibrary.org/b/id/8265071-M.jpg" },
    ],
    philosophy: [
      { id: "philosophy-1", title: "Meditations", author: "Marcus Aurelius", thumbnail: "https://covers.openlibrary.org/b/id/8265062-M.jpg" },
      { id: "philosophy-2", title: "Thus Spoke Zarathustra", author: "Friedrich Nietzsche", thumbnail: "https://covers.openlibrary.org/b/id/8265072-M.jpg" },
      { id: "philosophy-3", title: "The Republic", author: "Plato", thumbnail: "https://covers.openlibrary.org/b/id/8265073-M.jpg" },
    ],
    psychology: [
      { id: "psychology-1", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", thumbnail: "https://covers.openlibrary.org/b/id/8265064-M.jpg" },
      { id: "psychology-2", title: "Man's Search for Meaning", author: "Viktor Frankl", thumbnail: "https://covers.openlibrary.org/b/id/8265074-M.jpg" },
      { id: "psychology-3", title: "Influence: The Psychology of Persuasion", author: "Robert B. Cialdini", thumbnail: "https://covers.openlibrary.org/b/id/8265075-M.jpg" },
    ],
    art: [
      { id: "art-1", title: "The Story of Art", author: "E.H. Gombrich", thumbnail: "https://covers.openlibrary.org/b/id/8265066-M.jpg" },
      { id: "art-2", title: "Ways of Seeing", author: "John Berger", thumbnail: "https://covers.openlibrary.org/b/id/8265076-M.jpg" },
      { id: "art-3", title: "The Letters of Vincent van Gogh", author: "Vincent van Gogh", thumbnail: "https://covers.openlibrary.org/b/id/8265077-M.jpg" },
    ],
  };

  return {
    id: category.id,
    name: category.en,
    name_ar: category.ar,
    books: fallbackBooks[category.id] || [],
  };
};

const getFallbackCategories = () => {
  const categories = getCategorySubjects();
  return categories.map((category) => getFallbackCategoryBooks(category));
};

// Map categories to Open Library subjects
const getCategorySubjects = () => {
  return [
    { id: "fiction", en: "Fiction", ar: "خيال", subject: "fiction" },
    { id: "science", en: "Science", ar: "علمي", subject: "science" },
    { id: "business", en: "Business", ar: "أعمال", subject: "business" },
    { id: "fantasy", en: "Fantasy", ar: "فانتازيا", subject: "fantasy" },
    { id: "biography", en: "Biography", ar: "سيرة ذاتية", subject: "biography" },
    { id: "history", en: "History", ar: "تاريخ", subject: "history" },
    { id: "technology", en: "Technology", ar: "تكنولوجيا", subject: "technology" },
    { id: "philosophy", en: "Philosophy", ar: "فلسفة", subject: "philosophy" },
    { id: "psychology", en: "Psychology", ar: "علم النفس", subject: "psychology" },
    { id: "art", en: "Art", ar: "فن", subject: "art" },
  ];
};

// NEW: Fast fallback - return cached fallback data immediately
const getFastFallbackCategories = () => {
  const cacheKey = "fastFallbackCategories";
  let cached = cache.get(cacheKey);
  
  if (!cached) {
    cached = getFallbackCategories();
    cache.set(cacheKey, cached);
  }
  
  return cached;
};

// NEW: Optimized API call with better error handling
const makeOptimizedAPICall = async (url, timeout = 3000) => {
  try {
    const response = await axios.get(url, {
      timeout,
      validateStatus: (status) => status < 500,
      headers: {
        'User-Agent': 'Bookwise-App/1.0 (https://yourdomain.com)'
      }
    });

    if (response.status === 429) {
      throw new Error('Rate limited');
    }

    if (response.status === 200 && response.data && response.data.works) {
      return response.data.works.slice(0, 3); // Only get 3 books
    }

    throw new Error('Invalid response');
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout');
    }
    throw error;
  }
};

// NEW: Completely optimized fetch function
const fetchCategoriesOptimized = async () => {
  const cacheKey = "categoriesWithBooks";
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const categories = getCategorySubjects();
  const categoriesWithBooks = [];
  let successfulAPICalls = 0;

  // Try to get at least some data from API, but don't wait too long
  for (const category of categories) {
    try {
      // Only try API for first 3 categories to speed things up
      if (successfulAPICalls >= 3) {
        categoriesWithBooks.push(getFallbackCategoryBooks(category));
        continue;
      }

      const works = await makeOptimizedAPICall(
        `https://openlibrary.org/subjects/${category.subject}.json?limit=3`
      );

      const books = works.map((work, index) => ({
        id: work.key ? work.key.replace("/works/", "") : `book-${category.id}-${index}`,
        title: work.title || "Unknown Title",
        author: work.authors && work.authors[0] ? work.authors[0].name : "Unknown Author",
        thumbnail: work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg` : null,
        published_year: work.first_publish_year || null,
      }));

      categoriesWithBooks.push({
        id: category.id,
        name: category.en,
        name_ar: category.ar,
        books: books,
      });

      successfulAPICalls++;
      
      // Small delay between successful calls
      if (successfulAPICalls < 3) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      // Immediately use fallback for this category
      categoriesWithBooks.push(getFallbackCategoryBooks(category));
    }
  }

  // Cache the results
  cache.set(cacheKey, categoriesWithBooks);
  return categoriesWithBooks;
};

/**
 * @desc Get all categories - ULTRA FAST VERSION
 * @route GET /api/categories
 * @access Public
 */
export const getCategories = async (req, res) => {
  try {
    // Set a timeout for the entire request
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Overall timeout')), 5000)
    );

    const categoriesPromise = fetchCategoriesOptimized();
    
    const categories = await Promise.race([categoriesPromise, timeoutPromise]);
    
    res.json(categories);
  } catch (error) {
    console.error("Fast fallback triggered:", error.message);
    // Return cached fallback immediately
    const fallbackCategories = getFastFallbackCategories();
    res.json(fallbackCategories);
  }
};

/**
 * @desc Get books in a specific category - OPTIMIZED
 * @route GET /api/categories/:id
 * @access Public
 */
export const getCategoryBooks = async (req, res) => {
  try {
    const { id } = req.params;

    // Check cache first
    const cacheKey = `category-${id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const categorySubjects = getCategorySubjects();
    const categoryInfo = categorySubjects.find((c) => c.id === id);

    if (!categoryInfo) {
      return res.status(404).json({ message: "Category not found" });
    }

    try {
      const works = await makeOptimizedAPICall(
        `https://openlibrary.org/subjects/${categoryInfo.subject}.json?limit=12`,
        4000
      );

      const books = works.map((work, index) => ({
        id: work.key ? work.key.replace("/works/", "") : `book-${id}-${index}`,
        title: work.title || "Unknown Title",
        author: work.authors && work.authors[0] ? work.authors[0].name : "Unknown Author",
        thumbnail: work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg` : null,
        published_year: work.first_publish_year || null,
      }));

      cache.set(cacheKey, books);
      return res.json(books);

    } catch (apiError) {
      console.error("API failed for category", id, "using fallback");
      // Use fallback immediately
      const fallback = getFallbackCategoryBooks(categoryInfo);
      cache.set(cacheKey, fallback.books); // Cache the fallback too
      return res.json(fallback.books);
    }

  } catch (error) {
    console.error("Error in getCategoryBooks:", error.message);
    // Final fallback
    const categorySubjects = getCategorySubjects();
    const categoryInfo = categorySubjects.find((c) => c.id === req.params.id);
    const fallback = categoryInfo ? getFallbackCategoryBooks(categoryInfo) : { books: [] };
    res.json(fallback.books);
  }
};

// NEW: Health check endpoint for categories
export const getCategoriesHealth = async (req, res) => {
  try {
    // Test one API call to check if Open Library is responsive
    await makeOptimizedAPICall('https://openlibrary.org/subjects/fiction.json?limit=1', 2000);
    res.json({ status: 'healthy', message: 'Open Library API is responsive' });
  } catch (error) {
    res.json({ status: 'degraded', message: 'Using fallback data', error: error.message });
  }
};