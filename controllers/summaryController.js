import axios from "axios";
import { getBookDetails, generateAmazonLink } from "./bookController.js";

// Call Gemini AI via RapidAPI
export const callGeminiAPI = async (prompt, lang = "en") => {
  try {
    const options = {
      method: "POST",
      url: process.env.RAPID_API_URL,
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": process.env.RAPID_API_HOST,
      },
      data: {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
    };

    const response = await axios.request(options);

    // Extract text from response based on RapidAPI structure
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }

    return lang === "ar"
      ? "تعذر إنشاء الملخص. يرجى المحاولة لاحقًا."
      : "Could not generate a summary. Please try again later.";
  } catch (error) {
    console.error("Error calling Gemini API:", error.message);
    return lang === "ar"
      ? "تعذر إنشاء الملخص. يرجى المحاولة لاحقًا."
      : "Could not generate a summary. Please try again later.";
  }
};

// Get book summary
export const getBookSummary = async (req, res) => {
  try {
    const { bookName, lang = "en" } = req.body;

    if (!bookName) {
      return res.status(400).json({ message: "Book name is required" });
    }

    // Get book details from Google Books API
    const bookDetails = await getBookDetails(bookName);
    if (!bookDetails) {
      return res.status(404).json({
        message:
          lang === "ar"
            ? "لم يتم العثور على كتاب بهذا العنوان."
            : "No book found with that title.",
      });
    }

    // Generate prompt based on language
    const prompt =
      lang === "ar"
        ? `اكتب ملخصًا لكتاب '${bookDetails.title}' للمؤلف ${bookDetails.authors}. ركز على الأفكار الرئيسية والموضوعات.`
        : `Write a summary of the book '${bookDetails.title}' by ${bookDetails.authors}. Focus on the main ideas and themes.`;

    // Get summary from Gemini AI
    const summary = await callGeminiAPI(prompt, lang);

    // Get recommendations
    const recommendations = await getBookRecommendations(
      bookDetails.title,
      lang
    );

    // Generate Amazon link
    const amazonLink = generateAmazonLink(bookDetails.title);

    res.json({
      book: bookDetails,
      summary,
      amazonLink,
      recommendations,
    });
  } catch (error) {
    console.error("Error in getBookSummary:", error.message);
    res.status(500).json({ message: "Failed to generate summary" });
  }
};

// Get book recommendations
const getBookRecommendations = async (bookTitle, lang = "en") => {
  try {
    const prompt =
      lang === "ar"
        ? `اقترح 3 كتب مشابهة لـ '${bookTitle}' مع مؤلفيها.`
        : `Suggest 3 books similar to '${bookTitle}' with their authors.`;

    const response = await callGeminiAPI(prompt, lang);

    // Parse the response to extract recommendations
    const lines = response.split("\n").filter((line) => line.trim());
    const recommendations = [];

    for (const line of lines.slice(0, 3)) {
      const cleanLine = line.replace(/^\d+\.\s*/, "").trim();

      // Try to extract title and author
      let title, author;
      if (cleanLine.includes(" by ")) {
        [title, author] = cleanLine.split(" by ", 2);
      } else if (cleanLine.includes(" - ")) {
        [title, author] = cleanLine.split(" - ", 2);
      } else {
        title = cleanLine;
        author = "Unknown Author";
      }

      recommendations.push({
        title: title.trim(),
        author: author.trim(),
        thumbnail: "https://via.placeholder.com/128x192.png", // Placeholder, you could fetch actual thumbnails
      });
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error.message);
    return [];
  }
};
