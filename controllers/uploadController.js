import pkg from "pdf-parse-fixed";
import fs from "fs";
import path from "path";
import { callOpenAI } from "./summaryController.js";


const pdf = pkg;

export const summarizePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a PDF file" });
    }

    const { lang = "en" } = req.body;

    // Read the uploaded file
    const pdfPath = path.join(process.cwd(), req.file.path);
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);

    // Extract text
    let extractedText = pdfData.text;

    // Clean and truncate text if needed
    extractedText = extractedText.replace(/\s+/g, " ").substring(0, 30000);

    // Generate prompt based on language
    const prompt =
      lang === "ar"
        ? `لخص النص التالي باللغة العربية:\n\n${extractedText}`
        : `Summarize the following text in English:\n\n${extractedText}`;

    // Get summary from Gemini AI
    const summary = await callOpenAI(prompt, lang);

    // Get recommendations based on PDF content
    const recommendationsPrompt =
      lang === "ar"
        ? `اقترح 3 كتب ذات صلة بمحتوى النص التالي:\n\n${extractedText.substring(
            0,
            1000
          )}`
        : `Suggest 3 books related to the content of the following text:\n\n${extractedText.substring(
            0,
            1000
          )}`;

    const recommendations = await getBookRecommendationsFromPrompt(
      recommendationsPrompt,
      lang
    );

    res.json({
      summary,
      recommendations,
    });

    // Delete the file after processing
    fs.unlinkSync(pdfPath);
  } catch (error) {
    console.error("Error in summarizePDF:", error.message);
    res.status(500).json({ message: "Failed to summarize PDF" });
  }
};

// Helper function to get recommendations from a prompt
const getBookRecommendationsFromPrompt = async (prompt, lang = "en") => {
  try {
    const response = await callOpenAI(prompt, lang);

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
        thumbnail: "https://via.placeholder.com/128x192.png",
      });
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations from prompt:", error.message);
    return [];
  }
};
