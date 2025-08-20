// controllers/categoryController.js
import axios from "axios";

// Fetch real categories from Google Books API or Open Library API
const fetchCategoriesFromGoogleBooks = async () => {
  try {
    const categories = [
      { id: "fiction", en: "Fiction", ar: "خيال" },
      { id: "science", en: "Science", ar: "علمي" },
      { id: "business", en: "Business", ar: "أعمال" },
      { id: "fantasy", en: "Fantasy", ar: "فانتازيا" },
      { id: "biography", en: "Biography", ar: "سيرة ذاتية" },
      { id: "history", en: "History", ar: "تاريخ" },
      { id: "technology", en: "Technology", ar: "تكنولوجيا" },
      { id: "philosophy", en: "Philosophy", ar: "فلسفة" },
      { id: "psychology", en: "Psychology", ar: "علم النفس" },
      { id: "art", en: "Art", ar: "فن" },
    ];

    const categoriesWithBooks = await Promise.all(
      categories.map(async (category, index) => {
        try {
          const response = await axios.get(
            `https://www.googleapis.com/books/v1/volumes?q=subject:${category.id}&maxResults=2&key=${process.env.GOOGLE_BOOKS_API_KEY}`
          );

          const books = response.data.items
            ? response.data.items.slice(0, 4).map((item) => {
                const volumeInfo = item.volumeInfo || {};
                return {
                  id: item.id,
                  title: volumeInfo.title || "Unknown Title",
                  author: volumeInfo.authors
                    ? volumeInfo.authors[0]
                    : "Unknown Author",
                  thumbnail: volumeInfo.imageLinks
                    ? volumeInfo.imageLinks.thumbnail
                    : null,
                };
              })
            : [];

          return {
            id: category.id,
            name: category.en,
            name_ar: category.ar,
            books: books,
          };
        } catch (error) {
          console.error(`Error fetching ${category.id} books:`, error.message);
          return {
            id: category.id,
            name: category.en,
            name_ar: category.ar,
            books: [],
          };
        }
      })
    );

    return categoriesWithBooks;
  } catch (error) {
    console.error("Error fetching from Google Books:", error.message);
    return getFallbackCategories();
  }
};

/**
 * @desc Get all categories
 * @route GET /api/categories
 * @access Public
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await fetchCategoriesFromGoogleBooks();
    res.json(categories);
  } catch (error) {
    console.error("Error in getCategories:", error.message);
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

/**
 * @desc Get books in a specific category
 * @route GET /api/categories/:id
 * @access Public
 */
export const getCategoryBooks = async (req, res) => {
  try {
    const { id } = req.params;
    const categories = await fetchCategoriesFromGoogleBooks();
    const category = categories.find((c) => c.id === id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // If we have books in the category, return them
    if (category.books && category.books.length > 0) {
      return res.json(category.books);
    }

    // If no books in category, fetch from Open Library API
    try {
      const response = await axios.get(
        `https://openlibrary.org/subjects/${id}.json?limit=12`
      );

      if (!response.data || !response.data.works) {
        return res.json([]); // Return empty array if no works found
      }

      const books = response.data.works.map((work) => ({
        id: work.key
          ? work.key.replace("/works/", "")
          : `book-${Math.random().toString(36).substr(2, 9)}`,
        title: work.title || "Unknown Title",
        author:
          work.authors && work.authors[0]
            ? work.authors[0].name
            : "Unknown Author",
        thumbnail: work.cover_id
          ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`
          : null,
        published_year: work.first_publish_year || null,
      }));

      res.json(books);
    } catch (apiError) {
      console.error("Error fetching from Open Library:", apiError.message);
      // Return empty array if API call fails
      res.json([]);
    }
  } catch (error) {
    console.error("Error in getCategoryBooks:", error.message);
    res.status(500).json({
      message: "Failed to fetch category books",
      error: error.message,
    });
  }
};
