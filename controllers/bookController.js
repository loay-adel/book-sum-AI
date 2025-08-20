import axios from "axios";

// Get book details from Google Books API
export const getBookDetails = async (bookTitle) => {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      bookTitle
    )}&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
    const response = await axios.get(url, { timeout: 15000 });

    if (response.data.items && response.data.items.length > 0) {
      const bookInfo = response.data.items[0].volumeInfo;
      return {
        title: bookInfo.title || "No Title",
        authors: bookInfo.authors ? bookInfo.authors.join(", ") : "Unknown",
        thumbnail: bookInfo.imageLinks
          ? bookInfo.imageLinks.thumbnail
          : "https://via.placeholder.com/128x192.png",
        pageCount: bookInfo.pageCount,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching book details:", error.message);
    return null;
  }
};

// Generate Amazon affiliate link
export const generateAmazonLink = (bookTitle) => {
  const searchQuery = encodeURIComponent(bookTitle);
  return `https://www.amazon.com/s?k=${searchQuery}&tag=${process.env.AMAZON_TAG}`;
};
