import pkg from "pdf-parse-fixed";
import fs from "fs";
import path from "path";
import { callOpenAI } from "./summaryController.js";

const pdf = pkg;

export const summarizePDF = async (req, res) => {
  let pdfPath;
  
  try {
    console.log("=== PDF UPLOAD DEBUG ===");
    console.log("File received:", req.file?.originalname, req.file?.mimetype);

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Please upload a PDF file" 
      });
    }

    const { lang = "en", userId, bookTitle } = req.body;

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        success: false,
        message: "Invalid file type. Please upload a PDF file." 
      });
    }

    // Check file size
    if (req.file.size === 0) {
      return res.status(400).json({ 
        success: false,
        message: "The uploaded file is empty." 
      });
    }

    // Read the uploaded file
    pdfPath = path.join(process.cwd(), req.file.path);
    const dataBuffer = fs.readFileSync(pdfPath);
    
    console.log("File size in bytes:", dataBuffer.length);

    try {
      // Try to parse the PDF
      const pdfData = await pdf(dataBuffer);
      console.log("PDF parsed successfully, pages:", pdfData.numpages);

      // Extract text with better cleanup
      let extractedText = pdfData.text || "";
      
      // Clean the text
      extractedText = extractedText
        .replace(/\s+/g, " ")
        .replace(/\n+/g, "\n")
        .trim();

      console.log("Extracted text length:", extractedText.length);
      console.log("First 200 chars:", extractedText.substring(0, 200));

      // Check if text was extracted successfully
      if (!extractedText || extractedText.trim().length < 50) {
        console.log("Text too short, might be scanned PDF");
        return res.status(400).json({ 
          success: false,
          message: "This appears to be a scanned PDF. Please use a text-based PDF file with selectable text." 
        });
      }

      // Truncate text if too long
      if (extractedText.length > 30000) {
        extractedText = extractedText.substring(0, 30000);
        console.log("Text truncated to 30000 characters");
      }

      // Generate summary prompt
      const summaryPrompt =
        lang === "ar"
          ? `لخص النص التالي باللغة العربية بطريقة واضحة ومنظمة في فقرات قصيرة:\n\n${extractedText}`
          : `Summarize the following text in English in a clear and organized manner with short paragraphs:\n\n${extractedText}`;

      console.log("Calling OpenAI for summary...");
      const summary = await callOpenAI(summaryPrompt, lang);
      
      if (!summary || summary.trim().length === 0) {
        throw new Error("Failed to generate summary from AI");
      }

      console.log("Summary generated successfully, length:", summary.length);

      // Generate recommendations
      const recommendationsPrompt =
        lang === "ar"
          ? `بناءً على النص أدناه، اقترح 3 كتب مرتبطة بالموضوع مع أسماء المؤلفين. النص: ${extractedText.substring(0, 1500)}`
          : `Based on the text below, suggest 3 related books with author names. Text: ${extractedText.substring(0, 1500)}`;

      console.log("Calling OpenAI for recommendations...");
      const recommendationsResponse = await callOpenAI(recommendationsPrompt, lang);
      
      // Parse recommendations
      const recommendations = parseRecommendations(recommendationsResponse);

      res.json({
        success: true,
        summary,
        recommendations: recommendations.slice(0, 3), // Limit to 3
        textLength: extractedText.length,
        pageCount: pdfData.numpages || 1,
        fileName: req.file.originalname
      });

    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError.message);
      
      if (pdfError.message.includes('PDF') || pdfError.message.includes('corrupt')) {
        return res.status(400).json({ 
          success: false,
          message: "The PDF file appears to be corrupted or invalid. Please try a different file." 
        });
      }
      
      throw pdfError; // Re-throw to be caught by outer try-catch
    }

  } catch (error) {
    console.error("Error in summarizePDF:", error.message);
    
    // More specific error messages
    if (error.message.includes('AI') || error.message.includes('OpenAI') || error.message.includes('timeout')) {
      return res.status(503).json({ 
        success: false,
        message: "AI service is temporarily unavailable. Please try again later." 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Failed to process PDF. Please try again with a different file." 
    });
  } finally {
    // Clean up uploaded file
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        console.log("Cleaned up temporary file:", pdfPath);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError.message);
      }
    }
  }
};

// Helper function to parse recommendations
const parseRecommendations = (response) => {
  if (!response) return [];
  
  const recommendations = [];
  const lines = response.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    if (recommendations.length >= 3) break;
    
    const cleanLine = line.trim();
    
    // Try different patterns
    const patterns = [
      /^[*-]?\s*"?([^"»«]+?)"?\s+[-–—]\s+([^,]+)/i,
      /^[*-]?\s*"?([^"»«]+?)"?\s+by\s+([^,]+)/i,
      /^[*-]?\s*"?([^"»«]+?)"?\s+بواسطة\s+([^,]+)/i,
      /^Book \d+:?\s*"?([^"»«]+?)"?\s*[-–—]\s*([^,]+)/i,
      /^الكتاب \d+:?\s*"?([^"»«]+?)"?\s*[-–—]\s*([^,]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        const title = match[1].trim();
        const author = match[2].trim();
        
        // Basic validation
        if (title.length > 2 && author.length > 2 && 
            !title.includes('Unknown') && !author.includes('Unknown')) {
          
          recommendations.push({
            title,
            author,
            thumbnail: `https://via.placeholder.com/128x192/374151/FFFFFF?text=${encodeURIComponent(title.substring(0, 8))}`
          });
          break;
        }
      }
    }
  }
  
  // If no recommendations found, return default ones
  if (recommendations.length === 0) {
    return [
      {
        title: "How to Read a Book",
        author: "Mortimer J. Adler",
        thumbnail: "https://via.placeholder.com/128x192/374151/FFFFFF?text=How+to+Read"
      },
      {
        title: "The Elements of Style",
        author: "William Strunk Jr.",
        thumbnail: "https://via.placeholder.com/128x192/374151/FFFFFF?text=Elements"
      },
      {
        title: "On Writing Well",
        author: "William Zinsser",
        thumbnail: "https://via.placeholder.com/128x192/374151/FFFFFF?text=On+Writing"
      }
    ];
  }
  
  return recommendations;
};