import "dotenv/config";
import axios from "axios";
import { getBookCover } from "./imageController.js";


export const getBookDetails = async (bookTitle) => {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
      bookTitle
    )}&limit=1`;
    const response = await axios.get(url, { timeout: 15000 });

    if (response.data.docs && response.data.docs.length > 0) {
      const bookInfo = response.data.docs[0];


      const imageInfo = await getBookCover(bookTitle, bookInfo.author_name?.[0]);
      
      return {
        title: bookInfo.title || "No Title",
        authors: bookInfo.author_name
          ? bookInfo.author_name.join(", ")
          : "Unknown",
        thumbnail: imageInfo.medium, 
        coverImage: imageInfo.original, 
        pageCount: bookInfo.number_of_pages_median || null,
        publishedYear: bookInfo.first_publish_year || null,
        isbn: bookInfo.isbn ? bookInfo.isbn[0] : null,
        localImage: !imageInfo.isPlaceholder,
        imagePath: imageInfo.filename
      };
    }
    return getFallbackBookDetails(bookTitle);
  } catch (error) {
    console.error("Error fetching book details:", error.message);
    return getFallbackBookDetails(bookTitle);
  }
};

const getFallbackBookDetails = async (bookTitle) => {
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
  const bookData = fallbackBooks[normalizedTitle] || {
    title: bookTitle,
    authors: "Unknown Author",
    pageCount: null,
    publishedYear: null,
  };

  // Get or download cover image
  const imageInfo = await getBookCover(bookData.title, bookData.authors);
  
  return {
    ...bookData,
    thumbnail: imageInfo.medium,
    coverImage: imageInfo.original,
    localImage: !imageInfo.isPlaceholder,
    imagePath: imageInfo.filename
  };
};

// Enhanced book details with local image caching
export const getEnhancedBookDetails = async (bookTitle) => {
  try {
    // Get book details (this will now use local images)
    const bookDetails = await getBookDetails(bookTitle);

    // Generate purchase links
    const purchaseLinks = generateBookstoreLinks(
      bookDetails.title,
      bookDetails.authors
    );

    return {
      ...bookDetails,
      purchaseLinks,
      primaryPurchaseLink: purchaseLinks.amazon,
      imageInfo: {
        isLocal: bookDetails.localImage,
        path: bookDetails.imagePath,
        sizes: {
          thumbnail: bookDetails.thumbnail,
          medium: bookDetails.coverImage
        }
      }
    };
  } catch (error) {
    console.error("Error in enhanced book details:", error.message);
    
    // Get placeholder image
    const placeholder = {
      original: '/uploads/images/placeholder.jpg',
      thumbnail: '/uploads/images/thumbnails/placeholder.jpg',
      medium: '/uploads/images/medium/placeholder.jpg'
    };
    
    const fallbackDetails = await getFallbackBookDetails(bookTitle);
    return {
      ...fallbackDetails,
      thumbnail: placeholder.medium,
      coverImage: placeholder.original,
      localImage: false,
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