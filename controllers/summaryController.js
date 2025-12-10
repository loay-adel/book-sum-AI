// backend/controllers/summaryController.js
import "dotenv/config";
import axios from "axios";
import { getBookDetails, generateAmazonLink } from "./bookController.js";
import OpenAI from "openai";

// Call OpenAI API
export const callOpenAI = async (prompt, lang = "en") => {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 500
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI Error:", error.message);
    return lang === "ar"
      ? "تعذر إنشاء الملخص. يرجى المحاولة لاحقًا."
      : "Could not generate summary. Please try again later.";
  }
};

// Get book summary
export const getBookSummary = async (req, res) => {
  try {
    const { bookName, lang = "en", userId = null } = req.body;

    if (!bookName) {
      return res.status(400).json({ message: "Book name is required" });
    }

    // Get book details (you need to implement or import getBookDetails)
    let bookDetails;
    try {
      bookDetails = await getBookDetails(bookName);
    } catch (error) {
      console.error("Error getting book details:", error);
      bookDetails = {
        title: bookName,
        authors: "Unknown Author",
        thumbnail: "https://via.placeholder.com/128x192/374151/FFFFFF?text=Book+Cover"
      };
    }

    // Generate prompt
    const prompt =
      lang === "ar"
        ? `اكتب ملخصًا لكتاب '${bookDetails.title}' للمؤلف ${bookDetails.authors}. ركز على الأفكار الرئيسية والموضوعات.`
        : `Write a summary of the book '${bookDetails.title}' by ${bookDetails.authors}. Focus on the main ideas and themes.`;

    // Get summary from AI
    const summary = await callOpenAI(prompt, lang);

    // Get recommendations
    const recommendations = await getBookRecommendations(bookDetails.title, lang);

    // Generate Amazon link
    const amazonLink = generateAmazonLink(bookDetails.title);

    res.json({
      success: true,
      book: bookDetails,
      summary,
      amazonLink,
      recommendations
    });
  } catch (error) {
    console.error("Error in getBookSummary:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate summary. Please try again." 
    });
  }
};

// Get book recommendations
const getBookRecommendations = async (bookTitle, lang = "en") => {
  try {
    const prompt =
      lang === "ar"
        ? `اقترح 3 كتب مشابهة لـ '${bookTitle}' مع مؤلفيها.`
        : `Suggest 3 books similar to '${bookTitle}' with their authors.`;

    const response = await callOpenAI(prompt, lang);

    // Simple parsing
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().includes('here are') && !line.includes('اقترح'));

    const recommendations = [];
    
    for (const line of lines) {
      if (recommendations.length >= 3) break;
      
      const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
      
      // Try to parse title and author
      if (cleanLine.includes(' by ') || cleanLine.includes(' - ')) {
        const separator = cleanLine.includes(' by ') ? ' by ' : ' - ';
        const parts = cleanLine.split(separator);
        
        if (parts.length >= 2) {
          recommendations.push({
            title: parts[0].replace(/["']/g, '').trim(),
            author: parts[1].replace(/["']/g, '').trim(),
            thumbnail: "https://via.placeholder.com/128x192/374151/FFFFFF?text=Book+Cover"
          });
        }
      }
    }

    // If no recommendations found, return defaults
    if (recommendations.length === 0) {
      return [
        {
          title: "Clean Code",
          author: "Robert C. Martin",
          thumbnail: "https://covers.openlibrary.org/b/id/8265071-M.jpg"
        },
        {
          title: "The Pragmatic Programmer",
          author: "Andrew Hunt, David Thomas",
          thumbnail: "https://covers.openlibrary.org/b/id/8265080-M.jpg"
        },
        {
          title: "Design Patterns",
          author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
          thumbnail: "https://covers.openlibrary.org/b/id/8265081-M.jpg"
        }
      ];
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return [];
  }
};