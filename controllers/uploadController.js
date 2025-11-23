import pkg from "pdf-parse-fixed";
import fs from "fs";
import path from "path";
import { callOpenAI } from "./summaryController.js";

const pdf = pkg;

export const summarizePDF = async (req, res) => {
  let pdfPath;
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a PDF file" });
    }

    const { lang = "en" } = req.body;

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: "Invalid file type. Please upload a PDF file." });
    }

    // Read the uploaded file
    pdfPath = path.join(process.cwd(), req.file.path);
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Validate PDF structure
    if (dataBuffer.length === 0) {
      return res.status(400).json({ message: "The uploaded file is empty." });
    }

    const pdfData = await pdf(dataBuffer);

    // Extract text
    let extractedText = pdfData.text;

    // Check if text was extracted successfully
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ 
        message: "Could not extract text from PDF. The file may be scanned or image-based." 
      });
    }

    // Clean and truncate text if needed
    extractedText = extractedText.replace(/\s+/g, " ").trim().substring(0, 30000);

    // Generate prompts for parallel processing
    const summaryPrompt =
      lang === "ar"
        ? `لخص النص التالي باللغة العربية بطريقة واضحة ومنظمة:\n\n${extractedText}`
        : `Summarize the following text in English in a clear and organized manner:\n\n${extractedText}`;

    const recommendationsPrompt =
      lang === "ar"
        ? `اقترح 3 كتب ذات صلة بمحتوى النص التالي مع اسم المؤلف وسبب الاقتراح:\n\n${extractedText.substring(0, 1500)}`
        : `Suggest 3 books related to the content of the following text with author names and reason for suggestion:\n\n${extractedText.substring(0, 1500)}`;

    // Process summary and recommendations in parallel
    const [summary, recommendations] = await Promise.all([
      callOpenAI(summaryPrompt, lang),
      getBookRecommendationsFromPrompt(recommendationsPrompt, lang)
    ]);

    // Validate AI responses
    if (!summary || summary.trim().length === 0) {
      throw new Error("Failed to generate summary from AI");
    }

    res.json({
      success: true,
      summary,
      recommendations: recommendations || [],
      textLength: extractedText.length,
      pageCount: pdfData.numpages || 1
    });

  } catch (error) {
    console.error("Error in summarizePDF:", error.message);
    
    // More specific error messages
    if (error.message.includes('PDF')) {
      return res.status(400).json({ 
        message: "Invalid PDF file. Please ensure the file is not corrupted." 
      });
    } else if (error.message.includes('AI') || error.message.includes('OpenAI')) {
      return res.status(503).json({ 
        message: "AI service is temporarily unavailable. Please try again later." 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to process PDF. Please try again with a different file." 
    });
  } finally {
    // Clean up uploaded file
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError.message);
      }
    }
  }
};

// Improved recommendation parser
const getBookRecommendationsFromPrompt = async (prompt, lang = "en") => {
  try {
    const response = await callOpenAI(prompt, lang);

    if (!response) return [];

    const lines = response.split("\n").filter(line => 
      line.trim() && !line.trim().startsWith("Note:") && !line.trim().startsWith("ملاحظة:")
    );
    
    const recommendations = [];
    const seenTitles = new Set();

    for (const line of lines) {
      if (recommendations.length >= 3) break;

      const cleanLine = line.replace(/^\d+\.\s*[-•]?\s*/, "").trim();
      
      if (!cleanLine) continue;

      // Enhanced parsing for different formats
      let title, author = "Unknown Author";
      
      // Try multiple parsing strategies
      if (cleanLine.includes(" by ")) {
        [title, author] = cleanLine.split(" by ", 2);
      } else if (cleanLine.includes(" - ")) {
        [title, author] = cleanLine.split(" - ", 2);
      } else if (cleanLine.includes(":")) {
        [title, author] = cleanLine.split(":", 2);
      } else {
        title = cleanLine;
      }

      // Clean up titles and authors
      title = title?.replace(/["«»"]/g, '').trim() || "Unknown Book";
      author = author?.replace(/["«»"]/g, '').trim() || "Unknown Author";

      // Remove trailing punctuation and reasons
      title = title.replace(/[\.:;-]\s*$/, '');
      author = author.replace(/[\.:;-]\s*$/, '');

      // Skip duplicates
      const titleKey = title.toLowerCase();
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        
        recommendations.push({
          title,
          author,
          thumbnail: `https://via.placeholder.com/128x192/374151/FFFFFF?text=${encodeURIComponent(title.substring(0, 10))}`
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error.message);
    return [];
  }
};