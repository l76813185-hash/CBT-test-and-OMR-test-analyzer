/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Sparkles, 
  HelpCircle, ChevronDown, ChevronUp, FileUp, Loader2,
  Download, Import, Trash2
} from "lucide-react";
import { TestResult } from "../types";

interface NewAnalysisProps {
  onAnalysisSuccess: (result: TestResult) => void;
  savedResultsCount: number;
  previousResults: TestResult[];
  onImportPastResult: (result: TestResult) => void;
}

export default function NewAnalysis({ 
  onAnalysisSuccess, 
  savedResultsCount,
  previousResults,
  onImportPastResult
}: NewAnalysisProps) {
  const [testTitle, setTestTitle] = useState("");
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [answersFile, setAnswersFile] = useState<File | null>(null);
  const [explanationsFile, setExplanationsFile] = useState<File | null>(null);
  const [questionsText, setQuestionsText] = useState("");
  const [answersText, setAnswersText] = useState("");
  const [explanationsText, setExplanationsText] = useState("");
  
  // Custom uploaded previous analysis state
  const [comparisonFile, setComparisonFile] = useState<File | null>(null);
  const [comparisonResult, setComparisonResult] = useState<TestResult | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [isImportExpanded, setIsImportExpanded] = useState(false);

  // UI states
  const [isQuestionsPastedOpen, setIsQuestionsPastedOpen] = useState(false);
  const [isAnswersPastedOpen, setIsAnswersPastedOpen] = useState(false);
  const [isExplanationsPastedOpen, setIsExplanationsPastedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Client-side file type and size validation errors
  const [questionsFileError, setQuestionsFileError] = useState<string | null>(null);
  const [answersFileError, setAnswersFileError] = useState<string | null>(null);
  const [explanationsFileError, setExplanationsFileError] = useState<string | null>(null);

  // Drag and drop states
  const [qDragActive, setQDragActive] = useState(false);
  const [aDragActive, setADragActive] = useState(false);
  const [eDragActive, setEDragActive] = useState(false);

  // File validator for React/Vite client-side defense with comprehensive support for doc and image formats
  const validateFile = (file: File): { isValid: boolean; error: string | null } => {
    const name = (file.name || "").toLowerCase();
    const mime = (file.type || "").toLowerCase();

    // Checked combinations: PDF, DOCX, RTF, ODT, Common Text files, Common Image formats (including BMP, TIFF, HEIC, HEIF, SVG)
    const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff|tif|heic|heif|svg)$/i.test(name);
    const isText = mime.startsWith("text/") || /\.(txt|csv|tsv|json|md|xml|html)$/i.test(name);
    const isDocx = mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx");
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    const isRtf = mime === "application/rtf" || mime === "text/rtf" || name.endsWith(".rtf");
    const isOdt = mime === "application/vnd.oasis.opendocument.text" || name.endsWith(".odt");

    if (isPdf || isDocx || isImage || isText || isRtf || isOdt) {
      // Limit to 15MB for optimal network and processing performance
      if (file.size > 15 * 1024 * 1024) {
        return {
          isValid: false,
          error: `The file exceeds the size limit. Current size is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Please select a file smaller than 15MB.`
        };
      }
      return { isValid: true, error: null };
    }

    // Explicit clear warnings for common problematic files
    if (name.endsWith(".doc")) {
      return {
        isValid: false,
        error: "Legacy Word (.doc) formats are incompatible. Please save or convert your document to modern Word (.docx) or PDF first."
      };
    }
    if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".ods")) {
      return {
        isValid: false,
        error: "Spreadsheets (.xls, .xlsx, .ods) are not directly supported. Please export your columns or tables to CSV, TSV, PDF, or text format first."
      };
    }
    if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
      return {
        isValid: false,
        error: "PowerPoint presentations (.ppt, .pptx) are not directly supported. Please save or export your slides to PDF, docx, or simple text outline first."
      };
    }
    if (name.endsWith(".pages") || name.endsWith(".numbers") || name.endsWith(".key")) {
      return {
        isValid: false,
        error: "Apple document formats (.pages, .numbers, .key) are not directly supported. Please export them as standard PDF, modern Word (.docx), or plain text first."
      };
    }
    if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z") || name.endsWith(".tar") || name.endsWith(".gz")) {
      return {
        isValid: false,
        error: "Compressed archives (.zip, .rar, .7z) cannot be directly processed. Please extract your PDF, Word document, or text document first."
      };
    }
    if (name.endsWith(".db") || name.endsWith(".sql") || name.endsWith(".sqlite")) {
      return {
        isValid: false,
        error: "Database formats (.db, .sql, .sqlite) are not supported. Please export the content of your database to a text format (CSV, TSV, or TXT) first."
      };
    }

    // Default warning with educational suggestions on how to correct
    const extension = name.split(".").pop()?.toUpperCase() || "unknown";
    return {
      isValid: false,
      error: `Unsupported file type: ".${extension}". For optimal analysis, please provide a standard PDF document, Microsoft Word document (.docx), RTF (.rtf), OpenDocument text (.odt), plain text file (.txt, .csv, .tsv), or high-contrast image (PNG, JPEG, WebP, BMP, TIFF, HEIC/HEIF).`
    };
  };

  const qFileInputRef = useRef<HTMLInputElement>(null);
  const aFileInputRef = useRef<HTMLInputElement>(null);
  const eFileInputRef = useRef<HTMLInputElement>(null);
  const compFileInputRef = useRef<HTMLInputElement>(null);

  const handleComparisonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComparisonFile(file);
      setComparisonError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonText = event.target?.result as string;
          const parsed = JSON.parse(jsonText);
          
          if (parsed && typeof parsed === "object" && (parsed.score !== undefined || parsed.percentage !== undefined)) {
            setComparisonResult(parsed as TestResult);
            setComparisonError(null);
          } else {
            throw new Error("Invalid structure. The file must match a downloaded TestResult layout.");
          }
        } catch (err: any) {
          setComparisonError("Invalid file. Make sure of selection - choose a valid JSON analysis metadata file.");
          setComparisonResult(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveImportedResult = () => {
    if (comparisonResult) {
      onImportPastResult(comparisonResult);
      // Auto-clear comparison Result once saved into the main index
      setComparisonResult(null);
      setComparisonFile(null);
      setIsImportExpanded(false);
    }
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const commaIndex = base64String.indexOf(",");
        const data = commaIndex !== -1 ? base64String.substring(commaIndex + 1) : base64String;
        resolve({
          data,
          mimeType: file.type || "application/octet-stream",
        });
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleDrag = (e: React.DragEvent, type: "q" | "a" | "e", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "q") setQDragActive(active);
    else if (type === "a") setADragActive(active);
    else setEDragActive(active);
  };

  const handleDrop = (e: React.DragEvent, type: "q" | "a" | "e") => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "q") {
      setQDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const validation = validateFile(file);
        if (validation.isValid) {
          setQuestionsFile(file);
          setQuestionsFileError(null);
        } else {
          setQuestionsFile(null);
          setQuestionsFileError(validation.error);
        }
      }
    } else if (type === "a") {
      setADragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const validation = validateFile(file);
        if (validation.isValid) {
          setAnswersFile(file);
          setAnswersFileError(null);
        } else {
          setAnswersFile(null);
          setAnswersFileError(validation.error);
        }
      }
    } else {
      setEDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const validation = validateFile(file);
        if (validation.isValid) {
          setExplanationsFile(file);
          setExplanationsFileError(null);
        } else {
          setExplanationsFile(null);
          setExplanationsFileError(validation.error);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "q" | "a" | "e") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file);
      if (type === "q") {
        if (validation.isValid) {
          setQuestionsFile(file);
          setQuestionsFileError(null);
        } else {
          setQuestionsFile(null);
          setQuestionsFileError(validation.error);
        }
      } else if (type === "a") {
        if (validation.isValid) {
          setAnswersFile(file);
          setAnswersFileError(null);
        } else {
          setAnswersFile(null);
          setAnswersFileError(validation.error);
        }
      } else {
        if (validation.isValid) {
          setExplanationsFile(file);
          setExplanationsFileError(null);
        } else {
          setExplanationsFile(null);
          setExplanationsFileError(validation.error);
        }
      }
    }
  };

  const triggerQFileSelect = () => qFileInputRef.current?.click();
  const triggerAFileSelect = () => aFileInputRef.current?.click();
  const triggerEFileSelect = () => eFileInputRef.current?.click();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Dynamic title validation/fallback
    const finalTitle = testTitle.trim() || `Practice Test #${savedResultsCount + 1}`;

    try {
      let qPayload = null;
      let aPayload = null;
      let ePayload = null;

      if (questionsFile) {
        const fileInfo = await fileToBase64(questionsFile);
        qPayload = {
          data: fileInfo.data,
          mimeType: fileInfo.mimeType,
          filename: questionsFile.name,
        };
      }

      if (answersFile) {
        const fileInfo = await fileToBase64(answersFile);
        aPayload = {
          data: fileInfo.data,
          mimeType: fileInfo.mimeType,
          filename: answersFile.name,
        };
      }

      if (explanationsFile) {
        const fileInfo = await fileToBase64(explanationsFile);
        ePayload = {
          data: fileInfo.data,
          mimeType: fileInfo.mimeType,
          filename: explanationsFile.name,
        };
      }

      if (!qPayload && !questionsText.trim()) {
        throw new Error("Please provide test questions by either uploading a file or typing/pasting questions.");
      }

      if (!aPayload && !answersText.trim()) {
        throw new Error("Please provide your answers by either uploading a file or typing your answers.");
      }

      // Construct dynamic comparison summary from previousResults and/or loaded comparison JSON
      let dynamicContext = "";
      const combinedResults = [...previousResults];
      // Include uploaded comparison file if it isn't already inside list
      if (comparisonResult && !combinedResults.some((r) => r.id === comparisonResult.id)) {
        combinedResults.push(comparisonResult);
      }

      if (combinedResults.length > 0) {
        dynamicContext = "Here is the performance history context of the student. Compare carefully and notice where they have improved or stayed weak:\n";
        combinedResults.slice(0, 5).forEach((item, idx) => {
          dynamicContext += `- Test: "${item.title}" (${new Date(item.date).toLocaleDateString()}) Score: ${item.score}/${item.totalQuestions} (${Math.round(item.percentage)}%)\n  Syllabus topics mastery in this past test:\n`;
          item.topics.forEach((t) => {
            dynamicContext += `    * ${t.topic}: Score ${t.correct}/${t.total} (${Math.round(t.percentage)}%) - ${t.evaluation}\n`;
          });
        });
      }

      const response = await fetch("/api/analyze-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionsFile: qPayload,
          answersFile: aPayload,
          explanationsFile: ePayload,
          questionsText: questionsText.trim() || undefined,
          answersText: answersText.trim() || undefined,
          explanationsText: explanationsText.trim() || undefined,
          testTitle: finalTitle,
          previousAnalysisContext: dynamicContext || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze test. Please try again.");
      }

      // Add full identifier properties for localStorage mapping
      const result: TestResult = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        title: finalTitle,
        date: new Date().toISOString(),
      };

      // Reset state on successful submission
      setQuestionsFile(null);
      setAnswersFile(null);
      setExplanationsFile(null);
      setQuestionsText("");
      setAnswersText("");
      setExplanationsText("");
      setTestTitle("");
      
      onAnalysisSuccess(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during test evaluation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-[#000000] rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#654bd6]">Configure New Test Analysis</h2>
            <p className="text-sm text-gray-500">Provide the question paper and your answers to generate an in-depth score analysis offline.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Evaluation Error</h4>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
            <Sparkles className="h-5 w-5 text-indigo-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-gray-900">Grading & Analyzing Files...</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Our secure server-side AI model is currently examining your questions and answers to evaluate grading, concept linkages, and strengths.
            </p>
          </div>
          <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-full inline-block animate-pulse">
            This might take up to a minute depending on PDF size
          </div>
        </div>
      ) : (
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="p-6 bg-[#1f1818] rounded-2xl border border-gray-100 shadow-xs space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="test-title" className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Test Title (Optional)</span>
                  <span className="text-xs text-gray-400">e.g. Physics Midterm, Biology Chapter 3</span>
                </label>
                <input
                  id="test-title"
                  type="text"
                  placeholder={`Practice Test #${savedResultsCount + 1}`}
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55/50 border border-gray-200 rounded-xl text-gray-800 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400 text-sm"
                />
              </div>

              {/* Automatic comparison configuration indicator */}
              <div className="bg-[#070e0e] border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                    <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                    <span>Automatic Previous Analysis Comparison</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {previousResults.length > 0 
                      ? `We found ${previousResults.length} past test results in browser cache. We will automatically use these to compare trends!`
                      : "No past tests found yet. Future tests will automatically carry comparative analytics."}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsImportExpanded(!isImportExpanded)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline flex items-center justify-start mt-2 select-none"
                >
                  <Import className="h-3.5 w-3.5 mr-1" />
                  <span>Import/Compare Exported JSON File</span>
                </button>
              </div>
            </div>

            {/* EXPANDED IMPORT CORNER */}
            {isImportExpanded && (
              <div className="p-4 bg-indigo-55/5 border border-indigo-100/50 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-900 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-indigo-505 mr-1.5" />
                    <span>Load Exported Analysis File (.json)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setComparisonResult(null);
                      setComparisonFile(null);
                      setComparisonError(null);
                    }}
                    className="text-[11px] text-gray-400 hover:text-red-500 font-medium"
                  >
                    Clear File
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      If you previously exported a single test analysis JSON file, upload it here to include it in the comparative evaluation payload.
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleComparisonFileChange}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 file:hover:bg-indigo-100 cursor-pointer"
                    />
                    {comparisonError && <p className="text-[11px] text-red-650 font-medium font-sans">⚠️ {comparisonError}</p>}
                  </div>

                  {comparisonResult && (
                    <div className="p-3 bg-white border border-gray-150 rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block">LOADED PAST TEST</span>
                        <span className="text-xs font-semibold text-gray-800 block truncate">{comparisonResult.title}</span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">Score: {comparisonResult.score} / {comparisonResult.totalQuestions} ({Math.round(comparisonResult.percentage)}%)</span>
                      </div>
                      
                      <div className="flex space-x-2 pt-1.5">
                        <button
                          type="button"
                          onClick={handleSaveImportedResult}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md flex items-center space-x-1"
                        >
                          <Import className="h-3 w-3" />
                          <span>Save into App History</span>
                        </button>
                        <span className="px-2 py-1 bg-emerald-55/10 text-emerald-800 border border-emerald-100/50 text-[10px] font-bold rounded-md">
                          Included in Comparison
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QUESTIONS COLUMN */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  1. Questions Paper <span className="text-indigo-600">*</span>
                </label>

                {/* Drag-and-drop file uploader (Questions) */}
                <div
                  onDragOver={(e) => handleDrag(e, "q", true)}
                  onDragLeave={(e) => handleDrag(e, "q", false)}
                  onDrop={(e) => handleDrop(e, "q")}
                  className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                    questionsFile 
                      ? "border-emerald-500 bg-emerald-55/10" 
                      : qDragActive 
                        ? "border-indigo-500 bg-indigo-55/10 scale-[0.99]" 
                        : questionsFileError
                          ? "border-rose-300 bg-rose-55/5"
                          : "border-gray-200 bg-gray-55/30 hover:bg-gray-55/50"
                  }`}
                >
                  <input
                    ref={qFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "q")}
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,application/vnd.oasis.opendocument.text,image/*,text/*,.docx,.rtf,.odt,.pdf,.txt,.csv,.tsv,.json,.xml,.html"
                  />
                  {questionsFile ? (
                    <>
                      <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg mb-2">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 block truncate max-w-xs">{questionsFile.name}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{(questionsFile.size / 1024).toFixed(1)} KB • Document loaded</span>
                      <button
                        type="button"
                        onClick={() => { setQuestionsFile(null); setQuestionsFileError(null); }}
                        className="mt-2.5 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Change File
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`p-2.5 rounded-lg mb-2 ${questionsFileError ? "bg-rose-100 text-rose-600 animate-bounce" : "bg-indigo-55/50 text-indigo-505"}`}>
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-gray-700 font-medium">Drag & drop Questions Document or Click</p>
                      <p className="text-xs text-gray-400 mt-1">Supports PDF, Word (.docx), RTF, OpenDocument, Text (.txt, .csv, .tsv), or Image files</p>
                      <button
                        type="button"
                        onClick={() => { setQuestionsFileError(null); triggerQFileSelect(); }}
                        className="mt-3 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        Choose Questions File
                      </button>
                    </>
                  )}
                </div>

                {/* Granular inline descriptive error message */}
                {questionsFileError && (
                  <div className="p-3 bg-rose-55/10 border border-rose-100 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs shadow-xs animate-fade-in">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-505 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block text-rose-950">Unsupported Format Rejected</span>
                      <p className="leading-relaxed text-rose-700">{questionsFileError}</p>
                      <button 
                        type="button" 
                        onClick={() => setQuestionsFileError(null)}
                        className="text-[10px] font-bold text-rose-800 uppercase tracking-wide hover:underline hover:text-rose-950 block pt-0.5"
                      >
                        Dismiss Warning
                      </button>
                    </div>
                  </div>
                )}

                {/* Question Paste text block option */}
                <div className="border border-gray-100 rounded-xl bg-gray-55/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setIsQuestionsPastedOpen(!isQuestionsPastedOpen); setQuestionsFileError(null); }}
                    className="w-full px-4 py-2.5 text-left flex items-center justify-between text-xs font-medium text-gray-650 hover:bg-gray-100 transition-all focus:outline-hidden"
                  >
                    <span className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-450" />
                      <span>Or Paste/Type Questions Content</span>
                    </span>
                    {isQuestionsPastedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isQuestionsPastedOpen && (
                    <div className="p-3 bg-white border-t border-gray-100">
                      <textarea
                        rows={5}
                        placeholder="Paste question contents directly here description, options, or test metadata..."
                        value={questionsText}
                        onChange={(e) => setQuestionsText(e.target.value)}
                        className="w-full p-2.5 bg-gray-55/50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 min-h-[100px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ANSWERS COLUMN */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  2. Your Answers <span className="text-indigo-600">*</span>
                </label>

                {/* Drag-and-drop file uploader (Answers) */}
                <div
                  onDragOver={(e) => handleDrag(e, "a", true)}
                  onDragLeave={(e) => handleDrag(e, "a", false)}
                  onDrop={(e) => handleDrop(e, "a")}
                  className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                    answersFile 
                      ? "border-emerald-500 bg-emerald-55/10" 
                      : aDragActive 
                        ? "border-indigo-500 bg-indigo-55/10 scale-[0.99]" 
                        : answersFileError
                          ? "border-rose-300 bg-rose-55/5"
                          : "border-gray-200 bg-gray-55/30 hover:bg-gray-55/50"
                  }`}
                >
                  <input
                    ref={aFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "a")}
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,application/vnd.oasis.opendocument.text,image/*,text/*,.docx,.rtf,.odt,.pdf,.txt,.csv,.tsv,.json,.xml,.html"
                  />
                  {answersFile ? (
                    <>
                      <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg mb-2">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 block truncate max-w-xs">{answersFile.name}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{(answersFile.size / 1024).toFixed(1)} KB • Document loaded</span>
                      <button
                        type="button"
                        onClick={() => { setAnswersFile(null); setAnswersFileError(null); }}
                        className="mt-2.5 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Change File
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`p-2.5 rounded-lg mb-2 ${answersFileError ? "bg-rose-100 text-rose-600 animate-bounce" : "bg-indigo-55/50 text-indigo-505"}`}>
                        <FileUp className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-gray-700 font-medium">Drag & drop Answers sheet or Click</p>
                      <p className="text-xs text-gray-400 mt-1">Supports PDF, Word (.docx), RTF, OpenDocument, Text (.txt, .csv, .tsv), or Image files</p>
                      <button
                        type="button"
                        onClick={() => { setAnswersFileError(null); triggerAFileSelect(); }}
                        className="mt-3 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        Choose Answers File
                      </button>
                    </>
                  )}
                </div>

                {/* Granular inline descriptive error message */}
                {answersFileError && (
                  <div className="p-3 bg-rose-55/10 border border-rose-100 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs shadow-xs animate-fade-in">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-505 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block text-rose-950">Unsupported Format Rejected</span>
                      <p className="leading-relaxed text-rose-700">{answersFileError}</p>
                      <button 
                        type="button" 
                        onClick={() => setAnswersFileError(null)}
                        className="text-[10px] font-bold text-rose-800 uppercase tracking-wide hover:underline hover:text-rose-950 block pt-0.5"
                      >
                        Dismiss Warning
                      </button>
                    </div>
                  </div>
                )}

                {/* Answers Paste text block option */}
                <div className="border border-gray-100 rounded-xl bg-gray-55/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setIsAnswersPastedOpen(!isAnswersPastedOpen); setAnswersFileError(null); }}
                    className="w-full px-4 py-2.5 text-left flex items-center justify-between text-xs font-medium text-gray-650 hover:bg-gray-100 transition-all focus:outline-hidden"
                  >
                    <span className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-450" />
                      <span>Or Paste/Type Answers & Notes</span>
                    </span>
                    {isAnswersPastedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isAnswersPastedOpen && (
                    <div className="p-3 bg-white border-t border-gray-100">
                      <textarea
                        rows={5}
                        placeholder="Type answers like '1. A, 2. B, 3. True' or paste long descriptive answer texts..."
                        value={answersText}
                        onChange={(e) => setAnswersText(e.target.value)}
                        className="w-full p-2.5 bg-gray-55/50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 min-h-[100px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Optional reference explanations / solutions key section */}
            <div className="pt-5 border-t border-gray-150">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-sans">3</span>
                    <span>Solution Key & Reference Explanations <span className="text-gray-400 font-normal">(Optional)</span></span>
                  </span>
                  <span className="text-[10px] text-gray-400">Used by Gemini to align precise diagnostic explanations</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Drag and Drop */}
                  <div
                    onDragOver={(e) => handleDrag(e, "e", true)}
                    onDragLeave={(e) => handleDrag(e, "e", false)}
                    onDrop={(e) => handleDrop(e, "e")}
                    className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                      explanationsFile 
                        ? "border-emerald-500 bg-emerald-55/10" 
                        : eDragActive 
                          ? "border-indigo-500 bg-indigo-55/10 scale-[0.99]" 
                          : explanationsFileError
                            ? "border-rose-300 bg-rose-55/5"
                            : "border-gray-200 bg-gray-55/30 hover:bg-gray-55/50"
                    }`}
                  >
                    <input
                      ref={eFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "e")}
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,application/vnd.oasis.opendocument.text,image/*,text/*,.docx,.rtf,.odt,.pdf,.txt,.csv,.tsv,.json,.xml,.html"
                    />
                    {explanationsFile ? (
                      <>
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg mb-2">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-800 block truncate max-w-xs">{explanationsFile.name}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{(explanationsFile.size / 1024).toFixed(1)} KB • Solution Copy Ready</span>
                        <button
                          type="button"
                          onClick={() => { setExplanationsFile(null); setExplanationsFileError(null); }}
                          className="mt-2.5 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                        >
                          Change File
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`p-2.5 rounded-lg mb-2 ${explanationsFileError ? "bg-rose-100 text-rose-600 animate-bounce" : "bg-indigo-55/50 text-indigo-505"}`}>
                          <FileUp className="h-5 w-5" />
                        </div>
                        <p className="text-sm text-gray-700 font-medium">Drag & drop Solutions Key document or Click</p>
                        <p className="text-xs text-gray-400 mt-1">Supports PDF, Word (.docx), RTF, OpenDocument, Text (.txt, .csv, .tsv), or Image files</p>
                        <button
                          type="button"
                          onClick={() => { setExplanationsFileError(null); triggerEFileSelect(); }}
                          className="mt-3 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 active:scale-95 transition-all shadow-xs cursor-pointer"
                        >
                          Choose Solutions File
                        </button>
                      </>
                    )}
                  </div>

                  {/* Text Paste for Explanations */}
                  <div className="border border-gray-100 rounded-xl bg-gray-55/20 overflow-hidden h-full flex flex-col justify-between">
                    <button
                      type="button"
                      onClick={() => { setIsExplanationsPastedOpen(!isExplanationsPastedOpen); setExplanationsFileError(null); }}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between text-xs font-medium text-gray-650 hover:bg-gray-100 transition-all focus:outline-hidden"
                    >
                      <span className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-450" />
                        <span>Or Paste/Type Explanations & Sol Key</span>
                      </span>
                      {isExplanationsPastedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {isExplanationsPastedOpen ? (
                      <div className="p-3 bg-white border-t border-gray-100 flex-1">
                        <textarea
                          rows={4}
                          placeholder="Paste reference solutions, steps, guidelines or expert explanations content here..."
                          value={explanationsText}
                          onChange={(e) => setExplanationsText(e.target.value)}
                          className="w-full p-2.5 bg-gray-55/50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 min-h-[90px] h-full resize-none"
                        />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 italic flex-1 flex items-center justify-center">
                        Pasting text/instructions expands this drawer
                      </div>
                    )}
                  </div>
                </div>

                {explanationsFileError && (
                  <div className="p-3 bg-rose-55/10 border border-rose-100 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs shadow-xs animate-fade-in">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-505 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block text-rose-950">Unsupported Format Rejected</span>
                      <p className="leading-relaxed text-rose-700">{explanationsFileError}</p>
                      <button 
                        type="button" 
                        onClick={() => setExplanationsFileError(null)}
                        className="text-[10px] font-bold text-rose-800 uppercase tracking-wide hover:underline hover:text-rose-950 block pt-0.5"
                      >
                        Dismiss Warning
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-indigo-55/5 border border-indigo-100/50 rounded-xl text-xs text-gray-600 space-y-2 flex items-start space-x-3">
              <HelpCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#adc5e8] block">How does Evaluator mark?</span>
                <p className="mt-1 leading-relaxed text-[#69848f]">
                  Our algorithm correlates questions and your matching responses. Gemini analyzes PDF contents securely on our server. Data is handled temporarily, leaving no trail. Results are preserved entirely on your browser&apos;s <span className="underline font-medium decoration-indigo-300">localStorage</span>, keeping your records fully private and in line with zero cloud storage uploads.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center space-x-2"
              >
                <Sparkles className="h-5 w-5" />
                <span>Submit & Analyze Test</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
