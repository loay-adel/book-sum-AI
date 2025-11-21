import axios from "axios";
import { getBookDetails, generateAmazonLink } from "./bookController.js";
import OpenAI from "openai";

// Call Gemini AI via RapidAPI
export const callOpenAI = async (prompt, lang = "en") => {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
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
    const summary = await callOpenAI(prompt, lang);

    // Get recommendations with timeout
    const recommendationsPromise = getBookRecommendations(bookDetails.title, lang);
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve(getDefaultRecommendations(bookDetails.title, lang)), 5000)
    );
    
    const recommendations = await Promise.race([recommendationsPromise, timeoutPromise]);

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
    
    // Even if everything fails, return at least the book details
    const bookDetails = await getBookDetails(bookName) || {
      title: bookName,
      authors: "Unknown Author",
      thumbnail: "https://via.placeholder.com/128x192/374151/FFFFFF?text=Book+Cover"
    };
    
    res.json({
      book: bookDetails,
      summary: lang === "ar" ? "تعذر إنشاء الملخص. يرجى المحاولة لاحقًا." : "Could not generate summary. Please try again later.",
      amazonLink: generateAmazonLink(bookName),
      recommendations: getDefaultRecommendations(bookName, lang)
    });
  }
};

// Get book recommendations
const getBookRecommendations = async (bookTitle, lang = "en") => {
  try {
    const prompt =
      lang === "ar"
        ? `اقترح 3 كتب مشابهة لـ '${bookTitle}' مع مؤلفيها. قدم النتيجة كقائمة مرقمة بدون أي نص إضافي.`
        : `Suggest 3 books similar to '${bookTitle}' with their authors. Provide the result as a numbered list without any additional text.`;

    const response = await callOpenAI(prompt, lang);

    // Enhanced parsing logic
    const recommendations = parseRecommendations(response, lang);
    
    // If parsing fails, return default recommendations
    if (recommendations.length === 0) {
      return getDefaultRecommendations(bookTitle, lang);
    }

    return recommendations.slice(0, 3); // Ensure only 3 recommendations
  } catch (error) {
    console.error("Error getting recommendations:", error.message);
    return getDefaultRecommendations(bookTitle, lang);
  }
};

// Enhanced parsing function
const parseRecommendations = (response, lang) => {
  const recommendations = [];
  
  if (!response) return recommendations;

  // Split by common delimiters
  const lines = response.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.includes('Here are') && !line.includes('اقترح'));

  for (const line of lines) {
    if (recommendations.length >= 3) break;

    // Try different parsing patterns
    const book = parseBookFromLine(line);
    if (book && book.title && book.author && book.author !== 'Unknown Author') {
      recommendations.push({
        ...book,
        thumbnail: "https://via.placeholder.com/128x192.png?text=Book+Cover"
      });
    }
  }

  return recommendations;
};

// Parse book information from a line
const parseBookFromLine = (line) => {
  // Remove numbering (1., 2., 3., etc.)
  const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
  
  // Common patterns
  const patterns = [
    // Pattern: "Book Title by Author Name"
    /^"([^"]+)"\s+by\s+(.+)$/i,
    /^([^"]+)\s+by\s+(.+)$/i,
    // Pattern: "Book Title - Author Name"
    /^"([^"]+)"\s+-\s+(.+)$/i,
    /^([^"]+)\s+-\s+(.+)$/i,
    // Pattern: "Book Title" by "Author Name"
    /^"([^"]+)"\s+by\s+"([^"]+)"$/i,
    // Arabic pattern: "عنوان الكتاب" بواسطة "اسم المؤلف"
    /^"([^"]+)"\s+بواسطة\s+(.+)$/i,
    /^([^"]+)\s+بواسطة\s+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = cleanLine.match(pattern);
    if (match) {
      return {
        title: match[1].trim(),
        author: match[2].trim()
      };
    }
  }

  // If no pattern matches, try to split by common separators
  const separators = [' by ', ' - ', ' • ', ' | ', ' بواسطة '];
  for (const separator of separators) {
    const parts = cleanLine.split(separator);
    if (parts.length === 2) {
      return {
        title: parts[0].trim(),
        author: parts[1].trim()
      };
    }
  }

  return null;
};

// Default recommendations as fallback
const getDefaultRecommendations = (bookTitle, lang) => {
  const defaultRecs = {
    en: [
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
    ],
    ar: [
      {
        title: "الشيفرة النظيفة",
        author: "روبرت سي. مارتن",
        thumbnail: "https://covers.openlibrary.org/b/id/8265071-M.jpg"
      },
      {
        title: "المبرمج العملي",
        author: "أندرو هانت، ديفيد توماس",
        thumbnail: "https://covers.openlibrary.org/b/id/8265080-M.jpg"
      },
      {
        title: "أنماط التصميم",
        author: "إيريش غاما، ريتشارد هيلم، رالف جونسون، جون فليسيدس",
        thumbnail: "https://covers.openlibrary.org/b/id/8265081-M.jpg"
      }
    ]
  };

  return defaultRecs[lang] || defaultRecs.en;
};
