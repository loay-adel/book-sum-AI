import axios from "axios";

export const discoverBooks = async (req, res) => {
  try {
    const { subject, length, lang = "en" } = req.query;

    if (!subject) {
      return res.status(400).json({
        message: lang === "ar" ? "الموضوع مطلوب." : "Subject is required.",
      });
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      subject
    )}&maxResults=40&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
    const response = await axios.get(url, { timeout: 15000 });

    let books = [];
    if (response.data.items) {
      for (const item of response.data.items) {
        const bookInfo = item.volumeInfo || {};
        const pageCount = bookInfo.pageCount || 0;

        // Filter by length if specified
        if (length === "short" && pageCount >= 150) continue;
        if (length === "medium" && (pageCount < 150 || pageCount > 400))
          continue;
        if (length === "long" && pageCount <= 400) continue;

        books.push({
          title: bookInfo.title || "No Title",
          authors: bookInfo.authors ? bookInfo.authors.join(", ") : "Unknown",
          thumbnail: bookInfo.imageLinks
            ? bookInfo.imageLinks.thumbnail
            : "https://via.placeholder.com/128x192.png",
          pageCount: pageCount,
        });
      }
    }

    res.json(books);
  } catch (error) {
    console.error("Error in discoverBooks:", error.message);
    res.status(500).json({
      message:
        lang === "ar" ? "فشل في اكتشاف الكتب." : "Failed to discover books.",
    });
  }
};
