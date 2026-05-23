/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";

dotenv.config();

// Initialize the Google Gemini API client lazily
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please ensure your backend is configured with a valid GEMINI_API_KEY in the environment variables.");
  }
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

/**
 * Server-side file validator to support a wider range of document/image formats with clear error guidance.
 */
function validateUploadedFileServer(file: { data: string; mimeType: string; filename?: string }): { isValid: boolean; error: string | null } {
  if (!file || !file.data) return { isValid: true, error: null };
  const name = (file.filename || "").toLowerCase();
  const mime = (file.mimeType || "").toLowerCase();

  // Wide range of checked combinations: PDF, DOCX, RTF, ODT, Common Text files, Common Image formats (including BMP, TIFF, HEIC, HEIF, SVG)
  const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff|tif|heic|heif|svg)$/i.test(name);
  const isText = mime.startsWith("text/") || /\.(txt|csv|tsv|json|md|xml|html)$/i.test(name);
  const isDocx = mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx");
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isRtf = mime === "application/rtf" || mime === "text/rtf" || name.endsWith(".rtf");
  const isOdt = mime === "application/vnd.oasis.opendocument.text" || name.endsWith(".odt");

  if (isPdf || isDocx || isImage || isText || isRtf || isOdt) {
    // Check base64 size (approx file size: base64 string length * 0.75)
    const approxSize = file.data.length * 0.75;
    if (approxSize > 15 * 1024 * 1024) {
      return {
        isValid: false,
        error: `The file "${file.filename || "Uploaded File"}" exceeds our 15MB file size limit. Current size is approx ${(approxSize / (1024 * 1024)).toFixed(1)}MB.`
      };
    }
    return { isValid: true, error: null };
  }

  // Explicit clear warnings for common problematic files
  if (name.endsWith(".doc")) {
    return {
      isValid: false,
      error: `Legacy Word document format (.doc) in "${file.filename}" is incompatible. Please save or convert your document to modern Word (.docx) or PDF first.`
    };
  }
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".ods")) {
    return {
      isValid: false,
      error: `Spreadsheets (.xls, .xlsx, .ods) in "${file.filename}" are not directly supported. Please convert or export your test sheet content to PDF, docx, or simple CSV/text first.`
    };
  }
  if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
    return {
      isValid: false,
      error: `PowerPoint presentations (.ppt, .pptx) in "${file.filename}" are not supported. Please save slides as PDF or standard text outlines first.`
    };
  }
  if (name.endsWith(".pages") || name.endsWith(".numbers") || name.endsWith(".key")) {
    return {
      isValid: false,
      error: `Apple document formats (.pages, .numbers, .key) in "${file.filename}" are not supported. Please export them as PDF, Word (.docx), or plain text first.`
    };
  }
  if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z") || name.endsWith(".tar") || name.endsWith(".gz")) {
    return {
      isValid: false,
      error: `Compressed archives (.zip, .rar, .7z) in "${file.filename}" cannot be directly processed. Please extract your PDF or Word document from the archive first.`
    };
  }
  if (name.endsWith(".db") || name.endsWith(".sql") || name.endsWith(".sqlite")) {
    return {
      isValid: false,
      error: `Database files (.db, .sql, .sqlite) in "${file.filename}" are not supported. Please export the content to CSV, TSV, or plain text first.`
    };
  }

  const extension = name.split(".").pop()?.toUpperCase() || "unknown";
  return {
    isValid: false,
    error: `Unsupported file type in "${file.filename}": ".${extension}". For optimal analysis, please provide a standard PDF document, Microsoft Word document (.docx), RTF (.rtf), OpenDocument (.odt), standard text file (.txt, .csv, .tsv), or high-contrast image (PNG, JPEG, WebP, BMP, TIFF, HEIC/HEIF).`
  };
}

/**
 * Utility function to preprocess uploaded test files.
 * Extracts content for unsupported Gemini MIME types (like Word .docx, txt, csv, rtf, odt)
 * and passes supported ones (like PDF, images) as native inlineData.
 */
async function processUploadedFile(file: { data: string; mimeType: string; filename?: string }): Promise<{
  textContent?: string;
  inlineData?: { data: string; mimeType: string };
}> {
  try {
    const mime = (file.mimeType || "").toLowerCase();
    const name = (file.filename || "").toLowerCase();

    // Check for Word .docx document processing
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      console.log(`Processing DOCX file: ${file.filename || "document.docx"} via mammoth`);
      const buffer = Buffer.from(file.data, "base64");
      const result = await mammoth.extractRawText({ buffer });
      return { textContent: result.value };
    }

    // Check for plain-text, csv, json, rtf, odt, tsv, html, xml, md
    if (
      mime.startsWith("text/") ||
      mime === "application/json" ||
      mime === "application/javascript" ||
      mime === "application/xml" ||
      mime === "application/rtf" ||
      mime === "text/rtf" ||
      mime === "application/vnd.oasis.opendocument.text" ||
      name.endsWith(".txt") ||
      name.endsWith(".csv") ||
      name.endsWith(".tsv") ||
      name.endsWith(".json") ||
      name.endsWith(".xml") ||
      name.endsWith(".md") ||
      name.endsWith(".html") ||
      name.endsWith(".rtf") ||
      name.endsWith(".odt")
    ) {
      console.log(`Processing text-based file ${file.filename || "file.txt"} via raw string decoding`);
      const text = Buffer.from(file.data, "base64").toString("utf-8");
      return { textContent: text };
    }

    // Standardize Gemini-supported mimeTypes to resolve potential OS/browser discrepancies
    let finalMimeType = (file.mimeType || "").toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
      finalMimeType = "image/jpeg";
    } else if (name.endsWith(".png")) {
      finalMimeType = "image/png";
    } else if (name.endsWith(".webp")) {
      finalMimeType = "image/webp";
    } else if (name.endsWith(".gif")) {
      finalMimeType = "image/gif";
    } else if (name.endsWith(".pdf")) {
      finalMimeType = "application/pdf";
    } else if (name.endsWith(".heic")) {
      finalMimeType = "image/heic";
    } else if (name.endsWith(".heif")) {
      finalMimeType = "image/heif";
    }

    if (!finalMimeType) {
      finalMimeType = "application/octet-stream";
    }

    // Default: pass natively as inlineData (e.g., PDF and image formats natively supported by Gemini)
    return {
      inlineData: {
        data: file.data,
        mimeType: finalMimeType,
      },
    };
  } catch (err: any) {
    console.error(`Error processing file ${file.filename || "unknown"}:`, err);
    // Safe text file fallback if readable bytes
    try {
      const text = Buffer.from(file.data, "base64").toString("utf-8");
      if (/^[\x20-\x7E\r\n\t]*$/.test(text.slice(0, 100))) {
        return { textContent: text };
      }
    } catch {}
    
    // Fallback directly to native inlineData with standard normalization
    let fallbackMime = (file.mimeType || "").toLowerCase();
    const name = (file.filename || "").toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) fallbackMime = "image/jpeg";
    else if (name.endsWith(".png")) fallbackMime = "image/png";
    else if (name.endsWith(".webp")) fallbackMime = "image/webp";
    else if (name.endsWith(".pdf")) fallbackMime = "application/pdf";

    return {
      inlineData: {
        data: file.data,
        mimeType: fallbackMime || "application/octet-stream",
      },
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits higher to accept PDF base64 file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API to check server status & API key configuration
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasApiKey: !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY,
    });
  });

  // Core API: Analyze Test
  app.post("/api/analyze-test", async (req, res): Promise<any> => {
    try {
      let aiClient: GoogleGenAI;
      try {
        aiClient = getAiClient();
      } catch (err: any) {
        return res.status(500).json({
          error: "Gemini API key is not configured on the server. Please check the 'Settings > Secrets' panel and configure GEMINI_API_KEY.",
          details: err.message,
        });
      }

      const {
        questionsFile, // { data: string, mimeType: string, filename: string }
        answersFile,   // { data: string, mimeType: string, filename: string }
        explanationsFile, // { data: string, mimeType: string, filename: string }
        questionsText, // string
        answersText,   // string
        explanationsText, // string
        testTitle,     // string
        previousAnalysisContext, // string summarizing past results/topics
      } = req.body;

      // Server-side validation of uploaded files
      if (questionsFile) {
        const validation = validateUploadedFileServer(questionsFile);
        if (!validation.isValid) {
          return res.status(400).json({ error: validation.error });
        }
      }
      if (answersFile) {
        const validation = validateUploadedFileServer(answersFile);
        if (!validation.isValid) {
          return res.status(400).json({ error: validation.error });
        }
      }
      if (explanationsFile) {
        const validation = validateUploadedFileServer(explanationsFile);
        if (!validation.isValid) {
          return res.status(400).json({ error: validation.error });
        }
      }

      // Construct content parts for Gemini
      const contentsParts: any[] = [];

      // Introduction context for Gemini
      let instructionsText = `You are a world-class academic tutor and highly rigorous JEE/NEET exam evaluator. Your primary job is to grade the student's answers, determine which answers are correct with extreme mathematical/scientific precision, calculate their scores, and run an in-depth syllabus analysis.

Test Title: "${testTitle || "Test Evaluation"}"

`;

      if (previousAnalysisContext) {
        instructionsText += `\n=== STUDENT'S HISTORICAL PERFORMANCE CONTEXT ===\n${previousAnalysisContext}\nCompare the student's new scores with their past scores and concept mastery. In the 'overallFeedback' summary, explicitly highlight where they have made progress (e.g., weak topics that have now improved to strong/moderate) and which weak or high-importance areas need continued focus.\n\n`;
      }

      let processedQuestionsText = questionsText || "";
      let processedAnswersText = answersText || "";
      let processedExplanationsText = explanationsText || "";

      // Cleanly process the Question Paper
      if (questionsFile && questionsFile.data) {
        const processed = await processUploadedFile(questionsFile);
        if (processed.textContent) {
          processedQuestionsText = `${processedQuestionsText}\n\n[Parsed Text of Uploaded Question File "${questionsFile.filename || "questions.docx"}"]:\n${processed.textContent}`;
        } else if (processed.inlineData) {
          contentsParts.push({
            text: `[DOCUMENT START: TARGET QUESTION PAPER - FILENAME: "${questionsFile.filename || "questions_paper"}" - TYPE: QUESTION_PAPER]`
          });
          contentsParts.push({
            inlineData: processed.inlineData,
          });
          contentsParts.push({
            text: `[DOCUMENT END: TARGET QUESTION PAPER]`
          });
          instructionsText += `\n[FILE ATTACHMENT INFO]: The document labeled WITH "[DOCUMENT START: TARGET QUESTION PAPER...]" is the original Question Paper. Please parse all questions contained in it.`;
        }
      }

      if (processedQuestionsText) {
        instructionsText += `\n\n=== QUESTION PAPER TEXT ===\n${processedQuestionsText}\n==========================\n`;
      }

      // Cleanly process the Submitted Answers
      if (answersFile && answersFile.data) {
        const processed = await processUploadedFile(answersFile);
        if (processed.textContent) {
          processedAnswersText = `${processedAnswersText}\n\n[Parsed Text of Uploaded Answers File "${answersFile.filename || "answers.docx"}"]:\n${processed.textContent}`;
        } else if (processed.inlineData) {
          contentsParts.push({
            text: `[DOCUMENT START: STUDENT'S SUBMITTED ANSWERS SHEET - FILENAME: "${answersFile.filename || "student_answers"}" - TYPE: SUBMITTED_ANSWERS]`
          });
          contentsParts.push({
            inlineData: processed.inlineData,
          });
          contentsParts.push({
            text: `[DOCUMENT END: STUDENT'S SUBMITTED ANSWERS SHEET]`
          });
          instructionsText += `\n[FILE ATTACHMENT INFO]: The document labeled WITH "[DOCUMENT START: STUDENT'S SUBMITTED ANSWERS SHEET...]" is the Student's actual answers sheet (could be a hand-written page, MCQ list, or OMR/table). Please parse and extract user answers from it.`;
        }
      }

      if (processedAnswersText) {
        instructionsText += `\n\n=== USER SUBMITTED ANSWERS ===\n${processedAnswersText}\n==========================\n`;
      }

      // Cleanly process the reference solutions/explanations
      if (explanationsFile && explanationsFile.data) {
        const processed = await processUploadedFile(explanationsFile);
        if (processed.textContent) {
          processedExplanationsText = `${processedExplanationsText}\n\n[Parsed Text of Uploaded Reference Explanations/Solutions File "${explanationsFile.filename || "solutions.docx"}"]:\n${processed.textContent}`;
        } else if (processed.inlineData) {
          contentsParts.push({
            text: `[DOCUMENT START: REFERENCE SOLUTIONS & ANSWERS KEY - FILENAME: "${explanationsFile.filename || "solutions_key"}" - TYPE: SOLUTIONS_KEY]`
          });
          contentsParts.push({
            inlineData: processed.inlineData,
          });
          contentsParts.push({
            text: `[DOCUMENT END: REFERENCE SOLUTIONS & ANSWERS KEY]`
          });
          instructionsText += `\n[FILE ATTACHMENT INFO]: The document labeled WITH "[DOCUMENT START: REFERENCE SOLUTIONS & ANSWERS KEY...]" is the official Solutions explanation key. Read and copy all correct answers from it.`;
        }
      }

      if (processedExplanationsText) {
        instructionsText += `\n\n=== REFERENCE EXPLANATIONS & CORRECT SOLUTIONS KEY ===\n${processedExplanationsText}\n======================================================\n`;
      }

      const hasContent = contentsParts.length > 0 || processedQuestionsText.trim() || processedAnswersText.trim();
      if (!hasContent) {
        return res.status(400).json({
          error: "No test questions or answers were provided. Please upload files or enter text content.",
        });
      }

      instructionsText += `\n\n=== CRITICAL EXTRACTION AND GRADING DIRECTIVES ===

1. ADVANCED RESPONSIVE OCR & MULTI-COLUMN LAYOUT PARSING (FOR HANDWRITTEN/SCANNED ANSWER SHEETS):
   - Many student answer sheets are handwritten, scanned, offset-line printed, or arranged in multiple parallel columns (e.g., column 1 has Q1-Q15, column 2 has Q16-Q30).
   - Carefully scan each section of the image/PDF. Identify columns sequentially. Be careful not to blend the horizontal lines of two different columns (e.g., do not read "Q2: B" alongside "Q17: A" as "217 B" or something equivalent). Process each column vertically from top to bottom.
   - Text Alignment Offsets: If a handwritten option like "A", "B", "C", or "D" is written slightly higher or lower than the question number line (staggered), map them correctly. Look at the nearby question numbers and context to ensure they are grouped accurately.
   - Handwriting Deciphering & Semantic Smoothing: Handwritten option letters can look highly ambiguous or distorted under speed constraints:
     * An 'a' or 'A' can look like an 'o', 'd', 'u', '4', or 'h'.
     * A 'b' or 'B' can look like 'h', '6', '13', '8', or a bracketed '1)'.
     * A 'c' or 'C' can look like an 'e', '(', 'o', or 'i'.
     * A 'd' or 'D' can look like 'a', 'cl', 'o', '0', or 'cl'.
     * A '1' or 'A' might look like an arrow '->' or slash '/'.
     Analyze the context of choice sets on standard entry multiple-choice tests. Standard option names will almost always map to one of these: "A", "B", "C", "D" (or option labels "1", "2", "3", "4" respectively). Deduce the student's most plausible option. If a question number with an option-like letter is found, extract it directly.
   - If a question is listed in the main question paper but there is no trace of it being answered anywhere on the sheet, label its userAnswer as "Unanswered" (do not guess wrong options).

2. ULTRA-RIGOROUS VERIFIED CORRECT KEY MATCHING (CELESTIAL CORRECTNESS MANDATE):
   - CORRECT KEYS MUST NO LONGER BE WRONG. Pick and verify the correct key with absolute caution.
   - PRIORITY 1: OFFICIAL SOLUTIONS KEY: If the user provided a "REFERENCE SOLUTIONS & CORRECT SOLUTIONS KEY" (via pasted text or attached document), you MUST trust this key as the absolute, infallible ground-truth correct key. Directly extract and match the student's answer against it. Do NOT override the provided key file with model solving.
   - PRIORITY 2: MULTI-STEP SUBJECT MATTER RESOLUTION: If NO solution key is uploaded, you must solve each question in your internal thoughts twice with high academic precision across Physics, Chemistry, Biology, and Mathematics. Double-check all calculation steps, units, and chemical reactions before declaring a correctAnswer. Do not guess or output typical incorrect web answers.
   - Equivalent Normalizations: Student's answer matching must be flexible and ignore cosmetic/formatting variations:
     * Options matching: option symbol "A", option text "[A]", option parenthesis "(A)", option index value "1", or the full text value of option "A" (e.g. "Newton's First Law") are all equivalent. If they represent the same choice, they must be marked as CORRECT (isCorrect = true).
     * Numerical matches: Numeric quantities (like "5.6", "5.60", "28/5") representing mathematically equal figures must be marked CORRECT.

3. MAXIMUM COMPLETENESS MANDATE:
   - You MUST identify and output ALL questions found in the document. If there are 60 questions, your output "questions" array MUST contain exactly 60 objects representing all of them in order.
   - You must identify and evaluate ALL subjects present (Physics, Chemistry, Mathematics, Biology). Do not focus on only one or truncate the output early.

4. SHORTNESS RESTRICTION FOR PERFORMANCE:
   - Keep "questionText" highly compact and the "explanation" extremely brief (strictly exactly 1 short, concise sentence max explaining the correct concept).

5. TOPIC CLASSIFICATION:
   - Classify into a precise, multi-level chapter category. Always start with one of the identical subject prefixes: "Physics - ", "Chemistry - ", "Mathematics - ", or "Biology - " (e.g. "Physics - Mechanics - Newton's Laws").

You indeed have all tools and files. Output correct, complete JSON according to the schema.`;

      contentsParts.push({ text: instructionsText });

      // Run generative model
      const modelName = "gemini-3.5-flash"; // standard flash model for quick evaluation
      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: contentsParts,
        config: {
          systemInstruction: "You are a highly efficient, expert exam evaluator and syllabus analyzer. Always respond with correct, complete JSON matching the requested schema. You MUST process and list absolutely ALL questions found across all subjects (Physics, Chemistry, Mathematics, Biology). Correct answer correctness is your top priority: when a Solutions Key is provided, copy correct keys from it verbatim; when no Key is provided, double-solve questions with absolute scientific accuracy. To avoid hitting output size limits, keep ALL 'explanation' and 'questionText' fields extremely brief (strictly exactly 1 short sentence max per explanation). Never truncate or stop output prematurely.",
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallFeedback: {
                type: Type.STRING,
                description: "An encouraging, highly concise critique summarizing performance, gaps, and main actionable recommendation (limit to 1-2 short paragraphs).",
              },
              questions: {
                type: Type.ARRAY,
                description: "Individual grading analysis for each question found.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: {
                      type: Type.INTEGER,
                      description: "The number of the question in sequence.",
                    },
                    questionText: {
                      type: Type.STRING,
                      description: "The text of the question.",
                    },
                    userAnswer: {
                      type: Type.STRING,
                      description: "The user's submitted answer (specify 'Unanswered' if missing/not provided).",
                    },
                    correctAnswer: {
                      type: Type.STRING,
                      description: "The correct ideal answer.",
                    },
                    isCorrect: {
                      type: Type.BOOLEAN,
                      description: "Is the user's answer correct?",
                    },
                    isUnattempted: {
                      type: Type.BOOLEAN,
                      description: "Did the user leave this question unanswered, skipped, or completely blank?",
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "Syllabus explanation clarifying the concept or mistake (keep extremely concise, strictly 1 sentence max).",
                    },
                    topic: {
                      type: Type.STRING,
                      description: "The highly precise, multi-level conceptual subtopic this question belongs to (must start with subject prefix, e.g., 'Physics - Kinematics - Projectile Motion'). Group identical/similar questions under the exact same multi-level text label.",
                    },
                    importance: {
                      type: Type.STRING,
                      description: "Exams frequency or weight of this topic.",
                      enum: ["High", "Medium", "Low"],
                    },
                  },
                  required: ["questionNumber", "questionText", "userAnswer", "correctAnswer", "isCorrect", "isUnattempted", "explanation", "topic", "importance"],
                },
              },
            },
            required: ["questions", "overallFeedback"],
          },
        },
      });

      const responseText = response.text || "{}";
      const rawResult = JSON.parse(responseText.trim());
      
      // Secondary server-side parsing, filtering and computations
      const rawQuestions = rawResult.questions || [];
      
      // Inline helper functions inside the handler to prevent any modular dependency slips
      const isUnattemptedText = (ans: string) => {
        if (!ans) return true;
        const answer = ans.trim();
        return !answer || /^(unanswered|unattempted|n\/a|not answered|not attempted|-|none|empty)$/i.test(answer);
      };

      const getSubjectFromTopicServer = (topic: string): string => {
        if (!topic) return "General";
        const norm = topic.trim().toLowerCase();
        const parts = topic.split("-").map(p => p.trim().toLowerCase());
        const firstPart = parts[0] || "";
        
        if (firstPart.includes("physics") || norm.includes("physics")) return "Physics";
        if (firstPart.includes("chemistry") || norm.includes("chemistry")) return "Chemistry";
        if (firstPart.includes("math") || norm.includes("math") || norm.includes("algebra") || norm.includes("calculus") || norm.includes("geometry")) return "Mathematics";
        if (firstPart.includes("biology") || norm.includes("biology") || norm.includes("botany") || norm.includes("zoology") || norm.includes("photosynthesis") || norm.includes("mitosis") || norm.includes("cell")) return "Biology";
        
        const physicsKeywords = ["mechanics", "kinematics", "force", "gravity", "motion", "thermodynamics", "optics", "current", "induction", "magnetic", "circuit", "capacitor", "resistance", "nuclear", "oscillation", "semiconductor"];
        const chemistryKeywords = ["organic", "inorganic", "reagent", "reaction", "bond", "acid", "base", "salt", "ph", "molecule", "atom", "element", "catalyst", "amine", "alcohol", "aldehyde", "ketone", "hydrocarbon", "stoichiometry"];
        const mathKeywords = ["calculus", "algebra", "geometry", "trigonometry", "matrix", "matrices", "determinant", "integration", "derivative", "probability", "statistics", "binomial", "series", "sequence"];
        const biologyKeywords = ["botany", "zoology", "anatomy", "physiology", "genetics", "evolution", "ecology", "cell", "tissue", "photosynthesis", "mitosis", "meiosis", "dna", "rna", "digestive", "immune"];
        
        if (physicsKeywords.some(kw => norm.includes(kw))) return "Physics";
        if (chemistryKeywords.some(kw => norm.includes(kw))) return "Chemistry";
        if (mathKeywords.some(kw => norm.includes(kw))) return "Mathematics";
        if (biologyKeywords.some(kw => norm.includes(kw))) return "Biology";
        
        return "General";
      };

      const expandGranularTopicServer = (topic: string): string => {
        if (!topic) return "General - Concept Analysis - Basic Theory";
        let clean = topic.trim().replace(/\s*-\s*/g, " - ");
        const parts = clean.split(" - ").map(p => p.trim());
        
        if (parts.length >= 3) {
          return clean;
        }
        
        const subject = getSubjectFromTopicServer(topic);
        const norm = topic.toLowerCase();
        
        if (parts.length === 1) {
          if (subject === "Physics") {
            if (norm.includes("mechanic") || norm.includes("force") || norm.includes("laws")) return "Physics - Mechanics - Newton's Laws of Motion";
            if (norm.includes("kinematic") || norm.includes("speed") || norm.includes("velocity")) return "Physics - Mechanics - Kinematics";
            if (norm.includes("electro") || norm.includes("current") || norm.includes("charge")) return "Physics - Electrodynamics - Electric Current";
            if (norm.includes("optic") || norm.includes("lens") || norm.includes("light")) return "Physics - Optics - Wave Theory & Ray Optics";
            return `Physics - Core Area - ${parts[0]}`;
          }
          if (subject === "Chemistry") {
            if (norm.includes("organic") || norm.includes("carbon") || norm.includes("amine")) return "Chemistry - Organic Chemistry - Functional Groups";
            if (norm.includes("inorganic") || norm.includes("periodic") || norm.includes("element")) return "Chemistry - Inorganic Chemistry - Periodic Trends";
            if (norm.includes("physical") || norm.includes("equilibrium") || norm.includes("thermo")) return "Chemistry - Physical Chemistry - Thermodynamics";
            return `Chemistry - Core Area - ${parts[0]}`;
          }
          if (subject === "Mathematics") {
            if (norm.includes("calculus") || norm.includes("deriv") || norm.includes("integ")) return "Mathematics - Calculus - Integration & Derivatives";
            if (norm.includes("algebra") || norm.includes("matrix") || norm.includes("matrices")) return "Mathematics - Algebra - Linear Matrices";
            if (norm.includes("geometry") || norm.includes("line") || norm.includes("circle")) return "Mathematics - Coordinate Geometry - Conic Sections";
            return `Mathematics - Core Area - ${parts[0]}`;
          }
          if (subject === "Biology") {
            if (norm.includes("cell") || norm.includes("cytology") || norm.includes("mitosis")) return "Biology - Cell Biology - Cell Division";
            if (norm.includes("plant") || norm.includes("photosynthe") || norm.includes("botany")) return "Biology - Plant Physiology - Photosynthesis";
            if (norm.includes("human") || norm.includes("anatom") || norm.includes("heart")) return "Biology - Human Physiology - Organ Systems";
            return `Biology - Core Area - ${parts[0]}`;
          }
          return `General - Academic Core - ${parts[0]}`;
        }
        
        if (parts.length === 2) {
          const subtheme = parts[1];
          const first = parts[0];
          if (first === "Physics" || first === "Chemistry" || first === "Mathematics" || first === "Biology") {
            if (norm.includes("mechanic") || norm.includes("motion")) return `${first} - ${subtheme} - Dynamics & Kinematics`;
            if (norm.includes("electro") || norm.includes("charge")) return `${first} - ${subtheme} - Field & Current`;
            if (norm.includes("organic")) return `${first} - ${subtheme} - Structural Hydrocarbons`;
            if (norm.includes("inorganic")) return `${first} - ${subtheme} - Chemical Bonding`;
            if (norm.includes("calculus")) return `${first} - ${subtheme} - Limits & Continuity`;
            if (norm.includes("algebra")) return `${first} - ${subtheme} - Matrices & Equations`;
            if (norm.includes("physio")) return `${first} - ${subtheme} - Transport System`;
            if (norm.includes("genet")) return `${first} - ${subtheme} - Molecular Inheritances`;
            return `${first} - ${subtheme} - Concept Focus`;
          } else {
            return `${subject} - ${first} - ${subtheme}`;
          }
        }
        
        return clean;
      };

      const generateServerRecommendation = (topic: string, evaluation: string): string => {
        const norm = topic.toLowerCase();
        if (evaluation === "Strong") {
          return `Excellent mastery over ${topic}. Maintain this proficiency by solving advanced mock test questions and keeping a high solving speed. No major revision required in this category.`;
        }
        if (evaluation === "Moderate") {
          if (norm.includes("mechanic") || norm.includes("physics")) {
            return `Solid starting point for ${topic}. Minor calculation errors or formula application slipups are present. Work through 10-15 classical numerical problems step-by-step.`;
          }
          if (norm.includes("organic") || norm.includes("chemistry")) {
            return `Conceptual understanding of ${topic} is decent. We recommend revising structural reaction mechanisms and creating a concise reagent table to eliminate minor pressure errors.`;
          }
          if (norm.includes("calculus") || norm.includes("math")) {
            return `Good foundation in ${topic}. Dedicate time to solve boundary-case limit exercises, check variable bounds carefully, and write down full algebraic steps.`;
          }
          return `Good grasp of ${topic}. Review key derivation steps, solve 10-15 standard textbook exercises, and catalog any repeated mistakes in your revision notebook.`;
        }
        // Weak
        if (norm.includes("mechanic") || norm.includes("physics")) {
          return `Critical concept gaps in ${topic}. Re-study foundational physical theories, draw free-body diagrams carefully, and practice simple solved problems before attempting timed tests.`;
        }
        if (norm.includes("organic") || norm.includes("chemistry")) {
          return `Severe gaps in ${topic}. Revise basic molecular layouts, organic reaction pathways, periodic periodic trends, or chemical balancing formulas from your core reference books.`;
        }
        if (norm.includes("calculus") || norm.includes("math")) {
          return `Fundamental blindspots in ${topic}. Review essential step-by-step mathematical proofs, practice basic substitution methods, and solve at least 25 textbook examples.`;
        }
        return `Conceptual review highly recommended for ${topic}. Read core study material, create concise summary charts, practice formula derivations, and work through beginner-level solved questions.`;
      };

      let correctCount = 0;
      let totalQuestions = rawQuestions.length;

      // Classify, normalize and process each question
      const processedQuestions = rawQuestions.map((q: any) => {
        const userAnswerStr = (q.userAnswer || "").trim();
        const unatt = q.isUnattempted === true || isUnattemptedText(userAnswerStr);
        const correct = q.isCorrect === true && !unatt;
        
        if (correct) {
          correctCount++;
        }

        const expandedTopic = expandGranularTopicServer(q.topic);

        return {
          questionNumber: Number(q.questionNumber || 1),
          questionText: String(q.questionText || "Question Content Analysis"),
          userAnswer: unatt ? "Unanswered" : String(q.userAnswer),
          correctAnswer: String(q.correctAnswer || "Not provided"),
          isCorrect: correct,
          isUnattempted: unatt,
          explanation: String(q.explanation || "No specific detailed reference provided."),
          topic: expandedTopic,
          importance: q.importance || "Medium",
        };
      });

      // Recalculate percentage grade based on correct answers
      const percentageGrade = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(1)) : 0;

      // Group and calculate topic metrics
      const topicsMap = new Map<string, { topic: string; correct: number; total: number; importance: "High" | "Medium" | "Low"; }>();
      
      processedQuestions.forEach((q: any) => {
        const tName = q.topic;
        const existing = topicsMap.get(tName);
        if (existing) {
          existing.total++;
          if (q.isCorrect) {
            existing.correct++;
          }
        } else {
          topicsMap.set(tName, {
            topic: tName,
            correct: q.isCorrect ? 1 : 0,
            total: 1,
            importance: q.importance || "Medium"
          });
        }
      });

      const processedTopics = Array.from(topicsMap.values()).map(t => {
        const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
        let evaluation: "Strong" | "Moderate" | "Weak" = "Weak";
        if (pct >= 70) evaluation = "Strong";
        else if (pct >= 40) evaluation = "Moderate";

        return {
          topic: t.topic,
          correct: t.correct,
          total: t.total,
          percentage: pct,
          evaluation,
          recommendation: generateServerRecommendation(t.topic, evaluation),
          importance: t.importance
        };
      });

      // Construct identical schema output that frontend uses, fully computed with flawless programmatic consistency!
      const finalResultObj = {
        score: correctCount,
        totalQuestions: totalQuestions,
        percentage: percentageGrade,
        overallFeedback: String(rawResult.overallFeedback || "Evaluation completed successfully."),
        questions: processedQuestions,
        topics: processedTopics
      };
      
      return res.json(finalResultObj);
    } catch (e: any) {
      console.error("Analysis Error:", e);
      return res.status(500).json({
        error: "Failed to analyze the test files. Please check if they are readable and try again.",
        details: e.message || e.toString(),
      });
    }
  });

  app.post("/api/gemini/explain", async (req, res) => {
    try {
      const { questionText, userAnswer, correctAnswer, topic, explanation, chatHistory, message, provider: requestedProvider, model } = req.body;

      if (!questionText) {
        return res.status(400).json({ error: "Missing required parameter: questionText" });
      }

      // Automatically determine the best provider based on configuration and request preference
      const hasGemini = !!process.env.GEMINI_API_KEY;
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      
      const provider = requestedProvider === "openai" || (!hasGemini && hasOpenAI)
        ? "openai"
        : "gemini";

      if (provider === "openai") {
        if (!hasOpenAI) {
          return res.status(400).json({
            error: "OpenAI provider selected but OPENAI_API_KEY is not configured. Please check the 'Settings > Secrets' panel."
          });
        }
      } else {
        if (!hasGemini) {
          return res.status(500).json({
            error: "Gemini API key is not configured on the server. Please check the 'Settings > Secrets' panel and configure GEMINI_API_KEY, or configure OPENAI_API_KEY for GPT support.",
          });
        }
      }

      // Construction of system instructions context
      const systemInstruction = 
        `You are a brilliant, deeply empathetic, and highly encouraging IIT-JEE & NEET competitive mentor and academic tutor. ` +
        `Your teaching chemistry is warm, supportive, and emotionally rich—just like a real beloved life teacher who uses funny, simple real-world anecdotes or analogies to explain complex scientific questions. ` +
        `Provide comprehensive, step-by-step academic solutions and walkthroughs. ` +
        `Adhere strictly to these formatting and academic rules:\n` +
        `1. Warm Teacher Check-in: Start with a brief, warm, supportive sentence or encouraging mentorship word.\n` +
        `2. Pedagogy with Analogies: For complex concepts (such as matrix determinants, kinematic vectors, cellular phases, reaction catalysts, or acidic buffers), always explain them with a highly relatable, real-life analogy (e.g., comparing chemical catalysts to a wedding scheduler, or derivatives to a camera's speedometer snap) to build intuitive understanding.\n` +
        `3. Clean Layout & Beautiful Spacing: Format the solution with spacious layouts, using multiple double newlines so paragraphs breathe. Divide sections cleanly with titles like "💡 Teachers Intuitive Analogy", "📋 Key Formulae Book & Cheatsheet", "🎯 Step-by-Step Rigorous Walkthrough", and "⚠️ Avoid These Trap Pitfalls".\n` +
        `4. Mathematical Perfect-Formatting: Express math equations and variable constants using standard LaTeX formatting wrapped in $$ (for centering blocks) or $ (for inline parameters). Ensure no raw backslashes appear directly.\n` +
        `5. Time Heuristics: Share standard quick mnemonic tricks or shortcuts to solve similar competitive questions under 60 seconds.`;

      // Context prompt representing the active question details
      const questionContext = 
        `[ACTIVE SUBJECT / TOPIC] ${topic || "General Practice"}\n` +
        `[QUESTION CONTENT]\n${questionText}\n\n` +
        `[STUDENT'S SUBMITTED ANSWER] ${userAnswer || "Unanswered"}\n` +
        `[CORRECT KEY SYLLABUS OPTION] ${correctAnswer || "Not provided"}\n` +
        `[QUICK DIAGNOSTIC CONGNITIVE NOTES] ${explanation || "N/A"}\n\n` +
        `You are tutoring the student on this specific question. Use this question context to anchor all of your responses, answers, derivations, or follow-up doubts.`;

      const finalPrompt = message
        ? String(message)
        : `Generate an extensive, step-by-step rigorous logical solution and detailed walkthrough. Break down all concepts, define terms, trace derivations, write relevant equations, and explain the correct option choice perfectly.`;

      if (provider === "openai") {
        // Build openai messages list
        const messages: any[] = [
          { role: "system", content: systemInstruction },
          { role: "user", content: questionContext }
        ];

        if (Array.isArray(chatHistory) && chatHistory.length > 0) {
          chatHistory.forEach((turn: any) => {
            // OpenAI expects "assistant" role instead of "model"
            messages.push({
              role: turn.role === "user" ? "user" : "assistant",
              content: turn.text
            });
          });
        }

        messages.push({ role: "user", content: finalPrompt });

        const oaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.2
          })
        });

        if (!oaiResp.ok) {
          const errData = await oaiResp.json().catch(() => ({}));
          throw new Error(`OpenAI API status ${oaiResp.status}: ${JSON.stringify(errData)}`);
        }

        const oaiData = await oaiResp.json();
        const text = oaiData.choices?.[0]?.message?.content || "";
        return res.json({ text, provider: "openai" });
      } else {
        // Gemini execution
        let aiClient: GoogleGenAI;
        try {
          aiClient = getAiClient();
        } catch (err: any) {
          return res.status(500).json({
            error: "Gemini API Client not initialized. Please ensure your GEMINI_API_KEY is configured in your Environment variables.",
            details: err.message,
          });
        }

        const contentsParts: any[] = [];

        if (!chatHistory || chatHistory.length === 0) {
          // Single turn - group context with prompt
          contentsParts.push({
            role: "user",
            parts: [{ text: `${questionContext}\n\n${finalPrompt}` }],
          });
        } else {
          // Multi turn - start with context, then follow history, then final prompt
          contentsParts.push({
            role: "user",
            parts: [{ text: questionContext }]
          });

          chatHistory.forEach((turn: any) => {
            contentsParts.push({
              role: turn.role === "user" ? "user" : "model",
              parts: [{ text: turn.text }],
            });
          });

          contentsParts.push({
            role: "user",
            parts: [{ text: finalPrompt }]
          });
        }

        let finalSystemInstruction = systemInstruction;
        if (model === "deepseek-r1") {
          finalSystemInstruction += `\n\n[DEEPSEEK REASONER MODE] You MUST start your response with a highly rigorous, extensive, step-by-step scientific/mathematical Chain of Thought analyzing multiple solving pathways, equations, potential traps, or errors, and WRAP this entire thinking trace inside raw XML <think> and </think> tags at the very beginning of your response. Inside and outside of the think block, render mathematical formulas beautifully using standard LaTeX enclosed in $$ (for block-level centering) and $ (for inline formulas). At the end (outside of the think tags), write your encouraging and beautifully crafted detailed walkthrough study guide. Enjoy!`;
        } else if (model === "gemini-3.1-pro") {
          finalSystemInstruction += `\n\n[ACADEMIC RIGOR MODE] Provide extremely comprehensive conceptual details, dimensional equations, and sub-concept intersections. Structure your proofs and key definitions in highly visually appealing blocks, utilizing LaTeX math parameters ($...$ and $$...$$) for all formulas.`;
        } else if (model === "ollama") {
          finalSystemInstruction += `\n\n[SANDBOX ENGINE MODE] Keep your response highly direct, analytical, formula-driven, and brief, like a terminal logic analyzer output. Ensure equations are styled properly in standard LaTeX.`;
        }

        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contentsParts,
          config: {
            systemInstruction: finalSystemInstruction,
            temperature: 0.2, // low temperature for robust scientific explanations
          },
        });

        const text = response.text || "";
        return res.json({ text, provider: "gemini" });
      }
    } catch (e: any) {
      console.error("Explain endpoint error:", e);
      res.status(500).json({
        error: "Failed to fetch detailed explanation from the academic tutor.",
        details: e.message || e.toString(),
      });
    }
  });

  // Vite development integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Test Analyzer Server running on port ${PORT}`);
  });
}

startServer();
