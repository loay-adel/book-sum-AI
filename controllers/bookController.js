import "dotenv/config"; // تحميل متغيرات البيئة
import axios from "axios";

// Get book details from Open Library API (no rate limiting issues)
export const getBookDetails = async (bookTitle) => {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
      bookTitle
    )}&limit=1`;
    const response = await axios.get(url, { timeout: 15000 });

    if (response.data.docs && response.data.docs.length > 0) {
      const bookInfo = response.data.docs[0];

      // Get cover image if available
      let thumbnail = "https://via.placeholder.com/128x192.png?text=No+Image";
      if (bookInfo.cover_i) {
        thumbnail = `https://covers.openlibrary.org/b/id/${bookInfo.cover_i}-M.jpg`;
      }

      return {
        title: bookInfo.title || "No Title",
        authors: bookInfo.author_name
          ? bookInfo.author_name.join(", ")
          : "Unknown",
        thumbnail: thumbnail,
        pageCount: bookInfo.number_of_pages_median || null,
        publishedYear: bookInfo.first_publish_year || null,
        isbn: bookInfo.isbn ? bookInfo.isbn[0] : null,
      };
    }
    return null;
  } catch (error) {
    console.error(
      "Error fetching book details from Open Library:",
      error.message
    );
    return getFallbackBookDetails(bookTitle);
  }
};

// Fallback book details in case API fails
const getFallbackBookDetails = (bookTitle) => {
  const fallbackBooks = {
    "the great gatsby": {
      title: "The Great Gatsby",
      authors: "F. Scott Fitzgerald",
      thumbnail: "https://covers.openlibrary.org/b/id/8265047-M.jpg",
      pageCount: 180,
      publishedYear: 1925,
    },
    "to kill a mockingbird": {
      title: "To Kill a Mockingbird",
      authors: "Harper Lee",
      thumbnail: "https://covers.openlibrary.org/b/id/8265048-M.jpg",
      pageCount: 281,
      publishedYear: 1960,
    },
    1984: {
      title: "1984",
      authors: "George Orwell",
      thumbnail: "https://covers.openlibrary.org/b/id/7222246-M.jpg",
      pageCount: 328,
      publishedYear: 1949,
    },
    "pride and prejudice": {
      title: "Pride and Prejudice",
      authors: "Jane Austen",
      thumbnail: "https://covers.openlibrary.org/b/id/8265051-M.jpg",
      pageCount: 432,
      publishedYear: 1813,
    },
    "the hobbit": {
      title: "The Hobbit",
      authors: "J.R.R. Tolkien",
      thumbnail: "https://covers.openlibrary.org/b/id/8265054-M.jpg",
      pageCount: 310,
      publishedYear: 1937,
    },
  };

  const normalizedTitle = bookTitle.toLowerCase();
  return (
    fallbackBooks[normalizedTitle] || {
      title: bookTitle,
      authors: "Unknown Author",
      thumbnail: "https://via.placeholder.com/128x192.png?text=No+Image",
      pageCount: null,
      publishedYear: null,
    }
  );
};

// Generate Amazon affiliate link with better search parameters
export const generateAmazonLink = (bookTitle, author = "") => {
  const searchQuery = encodeURIComponent(`${bookTitle} ${author}`.trim());
  const amazonTag = process.env.AMAZON_TAG || "your-tag-20"; // fallback tag

  return `https://www.amazon.com/s?k=${searchQuery}&tag=${amazonTag}`;
};

// Alternative: Generate multiple bookstore links
export const generateBookstoreLinks = (bookTitle, author = "") => {
  const searchQuery = encodeURIComponent(`${bookTitle} ${author}`.trim());
  const amazonTag = process.env.AMAZON_TAG || "your-tag-20";

  return {
    amazon: `https://www.amazon.com/s?k=${searchQuery}&tag=${amazonTag}`,
    barnesAndNoble: `https://www.barnesandnoble.com/s/${searchQuery}`,
    bookDepository: `https://www.bookdepository.com/search?searchTerm=${searchQuery}`,
    abebooks: `https://www.abebooks.com/servlet/SearchResults?kn=${searchQuery}`,
  };
};

// Get book details with multiple fallback options
export const getEnhancedBookDetails = async (bookTitle) => {
  try {
    // Try Open Library first
    let bookDetails = await getBookDetails(bookTitle);

    if (!bookDetails || bookDetails.title === "No Title") {
      // If Open Library fails, try Google Books as fallback
      try {
        if (process.env.GOOGLE_BOOKS_API_KEY) {
          const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
            bookTitle
          )}&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
          const googleResponse = await axios.get(googleUrl, { timeout: 10000 });

          if (
            googleResponse.data.items &&
            googleResponse.data.items.length > 0
          ) {
            const googleBookInfo = googleResponse.data.items[0].volumeInfo;
            bookDetails = {
              title: googleBookInfo.title || bookTitle,
              authors: googleBookInfo.authors
                ? googleBookInfo.authors.join(", ")
                : "Unknown",
              thumbnail: googleBookInfo.imageLinks
                ? googleBookInfo.imageLinks.thumbnail
                : "https://via.placeholder.com/128x192.png",
              pageCount: googleBookInfo.pageCount,
              publishedYear: googleBookInfo.publishedDate
                ? new Date(googleBookInfo.publishedDate).getFullYear()
                : null,
            };
          }
        }
      } catch (googleError) {
        console.error("Google Books API also failed:", googleError.message);
        // Continue with Open Library result or fallback
      }
    }

    // If both APIs fail, use our fallback
    if (!bookDetails) {
      bookDetails = getFallbackBookDetails(bookTitle);
    }

    // Generate multiple purchase links
    const purchaseLinks = generateBookstoreLinks(
      bookDetails.title,
      bookDetails.authors
    );

    return {
      ...bookDetails,
      purchaseLinks,
      primaryPurchaseLink: purchaseLinks.amazon,
    };
  } catch (error) {
    console.error("Error in enhanced book details:", error.message);
    const fallbackDetails = getFallbackBookDetails(bookTitle);
    return {
      ...fallbackDetails,
      purchaseLinks: generateBookstoreLinks(
        fallbackDetails.title,
        fallbackDetails.authors
      ),
      primaryPurchaseLink: generateAmazonLink(
        fallbackDetails.title,
        fallbackDetails.authors
      ),
    };
  }
};