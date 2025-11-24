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

    // SIMPLIFIED PROMPT - No reasons, just book titles and authors
    const recommendationsPrompt =
      lang === "ar"
        ? `بناءً على النص أدناه، أذكر 3 كتب مرتبطة بالموضوع مع أسماء المؤلفين فقط. بدون تفسيرات أو أسباب.

النص: ${extractedText.substring(0, 1500)}

الإجابة يجب أن تكون بهذا الشكل فقط:
كتاب 1: عنوان الكتاب - اسم المؤلف
كتاب 2: عنوان الكتاب - اسم المؤلف  
كتاب 3: عنوان الكتاب - اسم المؤلف`
        : `Based on the text below, list 3 related books with author names only. No explanations or reasons.

Text: ${extractedText.substring(0, 1500)}

Response must be in this exact format:
Book 1: Book Title - Author Name
Book 2: Book Title - Author Name
Book 3: Book Title - Author Name`;

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

// SIMPLIFIED recommendation parser
const getBookRecommendationsFromPrompt = async (prompt, lang = "en") => {
  try {
    const response = await callOpenAI(prompt, lang);

    if (!response) return [];



    const lines = response.split("\n").filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             // Remove any lines that contain explanatory text
             !trimmed.toLowerCase().includes("here are") &&
             !trimmed.toLowerCase().includes("based on") &&
             !trimmed.toLowerCase().includes("related books") &&
             !trimmed.toLowerCase().includes("suggest") &&
             !trimmed.toLowerCase().includes("reason") &&
             !trimmed.toLowerCase().includes("explanation") &&
             !trimmed.startsWith("Note:") &&
             !trimmed.startsWith("ملاحظة:") &&
             !trimmed.startsWith("**") &&
             !trimmed.includes("Unknown Author") &&
             (trimmed.toLowerCase().includes("book") || trimmed.includes("كتاب") || /^\d+\./.test(trimmed));
    });
    
    const recommendations = [];
    const seenTitles = new Set();

    for (const line of lines) {
      if (recommendations.length >= 3) break;

      let cleanLine = line.trim();
      
      // Remove numbering patterns
      cleanLine = cleanLine.replace(/^(Book\s*\d+:?|الكتاب\s*\d+:?|\d+\.\s*|[-•*]\s*)/i, '').trim();
      
      if (!cleanLine || !cleanLine.includes('-')) continue;

      // Simple split by the first dash that separates title and author
      const dashIndex = cleanLine.indexOf(' - ');
      if (dashIndex === -1) continue;

      const title = cleanLine.substring(0, dashIndex).trim();
      const author = cleanLine.substring(dashIndex + 3).trim();

      // Basic validation
      if (!title || !author || 
          title === "Unknown Book" || 
          author === "Unknown Author" ||
          title.length < 2 || 
          author.length < 2) {
        continue;
      }

      // Clean any remaining special characters or quotes
      const cleanTitle = title.replace(/["«»"*]/g, '').trim();
      const cleanAuthor = author.replace(/["«»"*]/g, '').trim();

      // Skip duplicates
      const titleKey = cleanTitle.toLowerCase();
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        
        recommendations.push({
          title: cleanTitle,
          author: cleanAuthor,
          thumbnail: `https://via.placeholder.com/128x192/374151/FFFFFF?text=${encodeURIComponent(cleanTitle.substring(0, 8))}`
        });
      }
    }

  
    return recommendations;

  } catch (error) {
    console.error("Error getting recommendations:", error.message);
    return [];
  }
};