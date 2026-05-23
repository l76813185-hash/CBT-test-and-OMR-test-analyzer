/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp, Search, 
  Trash2, ArrowLeft, BookOpen, Clock, BarChart3, HelpCircle,
  Download, Import, FileText
} from "lucide-react";
import { TestResult, QuestionAnalysis } from "../types";
import { calculateMarkingStats, isQuestionUnattempted } from "../utils";

interface TestHistoryProps {
  results: TestResult[];
  onDeleteResult: (id: string) => void;
  selectedResult: TestResult | null;
  setSelectedResult: (result: TestResult | null) => void;
  onImportBulk: (imported: TestResult[]) => void;
}

export default function TestHistory({ 
  results, 
  onDeleteResult, 
  selectedResult, 
  setSelectedResult,
  onImportBulk
}: TestHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [questionFilter, setQuestionFilter] = useState<"all" | "correct" | "incorrect" | "unattempted">("all");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  
  // Custom non-blocking interactive modal and notification states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error") => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadJSON = (data: any, filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportSingle = (res: TestResult) => {
    const sanitizedTitle = res.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    downloadJSON(res, `${sanitizedTitle}_analysis_export.json`);
  };

  const handleExportAll = () => {
    downloadJSON(results, `test_history_bulk_backup.json`);
  };

  const handleImportBackupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonText = event.target?.result as string;
          const parsed = JSON.parse(jsonText);
          
          if (Array.isArray(parsed)) {
            const validItems = parsed.filter(item => item && typeof item === "object" && (item.score !== undefined || item.percentage !== undefined));
            if (validItems.length > 0) {
              onImportBulk(validItems);
              showToast(`Successfully imported ${validItems.length} test records into your offline library!`, "success");
            } else {
              throw new Error("No valid test object structures detected inside the file array.");
            }
          } else if (parsed && typeof parsed === "object" && (parsed.score !== undefined || parsed.percentage !== undefined)) {
            onImportBulk([parsed]);
            showToast(`Successfully imported past test "${parsed.title || "Untitled"}" to offline cache archive!`, "success");
          } else {
            throw new Error("Invalid structure. The backup file does not correspond to a valid TestResult schema.");
          }
        } catch (err: any) {
          showToast(`Import failed: ${err.message || "Could not decode JSON."}`, "error");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const renderToast = () => {
    if (!notification) return null;
    return (
      <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
        notification.type === "success" 
          ? "bg-emerald-50 text-emerald-800 border-emerald-150" 
          : "bg-rose-50 text-rose-800 border-rose-150"
      }`}>
        <span className="font-semibold text-xs">{notification.text}</span>
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (!deleteConfirmId) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-gray-950/50 backdrop-blur-xs transition-opacity"
          onClick={() => setDeleteConfirmId(null)}
        />
        {/* Dialog content panel */}
        <div className="bg-white rounded-2xl border border-gray-150 shadow-xl max-w-sm w-full p-6 relative z-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 bg-rose-50 text-rose-650 rounded-full w-12 h-12 flex items-center justify-center">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-gray-950">Delete Test Analysis?</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Are you sure you want to delete this test result from your local history? This action is permanent and cannot be undone.
            </p>
          </div>
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-150 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteResult(deleteConfirmId);
                if (selectedResult?.id === deleteConfirmId) {
                  setSelectedResult(null);
                }
                setDeleteConfirmId(null);
                showToast("Test record successfully deleted.", "success");
              }}
              className="flex-grow py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getFilteredQuestions = (questions: QuestionAnalysis[]) => {
    return questions.filter((q) => {
      // Filter by correctness
      if (questionFilter === "correct" && (!q.isCorrect || isQuestionUnattempted(q))) return false;
      if (questionFilter === "incorrect" && (q.isCorrect || isQuestionUnattempted(q))) return false;
      if (questionFilter === "unattempted" && !isQuestionUnattempted(q)) return false;

      // Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return (
          q.questionText.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          q.explanation.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  if (results.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-xs max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No Checked Tests Found</h3>
          <p className="text-sm text-gray-500 mt-1">
            Analyze a new question paper first. Your historical scores will populate here automatically.
          </p>
        </div>
      </div>
    );
  }

  // LIST VIEW
  if (!selectedResult) {
    return (
      <div className="space-y-4">
        {renderToast()}
        {renderDeleteModal()}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Test History Archives</h2>
            <p className="text-sm text-gray-500 mt-0.5">Explore your historical performances, check granular solutions, and review past feedback.</p>
          </div>

          {/* Backup & Restore controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".json" 
              onChange={handleImportBackupChange} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-xl text-xs flex items-center space-x-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Upload previous analysis export files or full bulk backup"
            >
              <Import className="h-4 w-4 text-indigo-505" />
              <span>Import Archives File</span>
            </button>
            <button
              onClick={handleExportAll}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Backup all logged tests to a single .json file"
            >
              <Download className="h-4 w-4" />
              <span>Export Bulk Backup</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {results.map((res) => {
            const dateStr = new Date(res.date).toLocaleDateString([], {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const stats = calculateMarkingStats(res.questions);

            return (
              <div
                key={res.id}
                onClick={() => setSelectedResult(res)}
                className="p-5 bg-white hover:border-indigo-200 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <h3 className="font-semibold text-gray-950 text-base group-hover:text-indigo-600 transition-colors">
                      {res.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-gray-400 font-medium">
                    <span className="flex items-center font-sans">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                      {dateStr}
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="h-3.5 w-3.5 mr-1 text-gray-400" />
                      {res.totalQuestions} Questions total
                    </span>
                    <span className="flex items-center px-1.5 py-0.5 font-bold text-[9px] bg-indigo-50 text-indigo-700 rounded-md uppercase tracking-wider">
                      Scheme: +4 / -1 / 0
                    </span>
                  </div>
                </div>

                {/* Score panel */}
                <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50 bg-transparent">
                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Performance</span>
                      <span className="text-sm font-bold text-gray-900 block">{res.score} / {res.totalQuestions} Correct</span>
                      <span className="text-xs font-bold text-indigo-605 block">{stats.marks} pts / {stats.maxPossibleMarks} max</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl font-bold text-sm ${
                      res.percentage >= 80 
                        ? "bg-emerald-50 text-emerald-700" 
                        : res.percentage >= 50 
                          ? "bg-amber-50 text-amber-700" 
                          : "bg-rose-50 text-rose-700"
                    }`}>
                      {Math.round(res.percentage)}%
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, res.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                    title="Delete record"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // DETAILED VIEW OF SPECIFIC RESULT
  const filteredQs = getFilteredQuestions(selectedResult.questions);
  const selectedStats = calculateMarkingStats(selectedResult.questions);

  return (
    <div className="space-y-6">
      {renderToast()}
      {renderDeleteModal()}
      {/* HEADER BAR */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 flex-wrap gap-2 shadow-xs">
        <button
          onClick={() => setSelectedResult(null)}
          className="px-3.5 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-lg text-xs cursor-pointer flex items-center space-x-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Archive list</span>
        </button>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExportSingle(selectedResult)}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs cursor-pointer flex items-center space-x-1.5 transition-all"
            title="Download this single test analysis as a local JSON file"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Analysis File (.json)</span>
          </button>
          <span className="text-xs text-gray-400 font-medium hidden sm:inline">ID: {selectedResult.id}</span>
        </div>
      </div>

      {/* DETAILED SCORE CONTAINER */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3 md:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900">{selectedResult.title}</h2>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
              {new Date(selectedResult.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1 text-gray-400" />
              {selectedResult.totalQuestions} Questions total
            </span>
          </div>
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Evaluation summary</h4>
            <p className="text-sm text-gray-650 leading-relaxed mt-1 whitespace-pre-line">{selectedResult.overallFeedback}</p>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-indigo-850 tracking-wider flex items-center space-x-1.5">
              <span>Marks Breakdown Summary (+4 / -1 / 0 Schema)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Correct answers (+4) */}
              <div className="bg-emerald-50/50 border border-emerald-150 p-3.5 rounded-xl flex items-center space-x-3.5 shadow-2xs">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 font-extrabold block uppercase tracking-wider leading-none mb-1">Correct (+4)</span>
                  <span className="text-base font-black text-emerald-800 leading-tight block">{selectedStats.correct} Qs</span>
                  <span className="text-[10px] font-bold text-emerald-600">+{selectedStats.correct * 4} Marks</span>
                </div>
              </div>

              {/* Incorrect answers (-1) */}
              <div className="bg-rose-50/50 border border-rose-150 p-3.5 rounded-xl flex items-center space-x-3.5 shadow-2xs">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-455 font-extrabold block uppercase tracking-wider leading-none mb-1">Incorrect (-1)</span>
                  <span className="text-base font-black text-rose-800 leading-tight block">{selectedStats.wrong} Qs</span>
                  <span className="text-[10px] font-bold text-rose-600">-{selectedStats.wrong * 1} Marks</span>
                </div>
              </div>

              {/* Unattempted (0) */}
              <div className="bg-gray-50/50 border border-gray-150 p-3.5 rounded-xl flex items-center space-x-3.5 shadow-2xs">
                <div className="p-2 bg-gray-150 text-gray-500 rounded-lg shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 font-extrabold block uppercase tracking-wider leading-none mb-1">Unattempted (0)</span>
                  <span className="text-base font-black text-gray-700 leading-tight block">{selectedStats.unattempted} Qs</span>
                  <span className="text-[10px] font-bold text-gray-500">0 Marks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-indigo-55/10 border border-indigo-150 rounded-xl flex flex-col justify-center items-center text-center space-y-2">
          <span className="text-xs font-bold text-indigo-805 uppercase tracking-wider">Exam Marks</span>
          <div className="text-4xl font-extrabold text-indigo-700">
            {selectedStats.marks} <span className="text-sm font-semibold text-gray-400">/ {selectedStats.maxPossibleMarks}</span>
          </div>
          <div className="text-xs text-gray-600 leading-normal space-y-1 font-semibold flex flex-col items-center">
            <span className="text-emerald-700 text-left w-full inline-flex items-center"><span className="w-4 inline-block text-center mr-1">⚪</span> {selectedStats.correct} Correct (+4)</span>
            <span className="text-rose-700 text-left w-full inline-flex items-center"><span className="w-4 inline-block text-center mr-1">🔴</span> {selectedStats.wrong} Wrong (-1)</span>
            <span className="text-gray-500 text-left w-full inline-flex items-center"><span className="w-4 inline-block text-center mr-1">🔘</span> {selectedStats.unattempted} Unattempted (0)</span>
          </div>
          <div className="w-full border-t border-gray-200 pt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Accuracy: {Math.round(selectedResult.percentage)}%
          </div>
        </div>
      </div>

      {/* TOPIC WISE PERFORMANCE */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 text-indigo-500 mr-2 shrink-0" />
            <span>Syllabus Topics Marked in this Test</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Performance distribution by syllabus chapters.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectedResult.topics.map((t) => (
            <div key={t.topic} className="p-4 bg-gray-55/30 border border-gray-200/40 rounded-xl space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold text-gray-800 text-sm block leading-tight">{t.topic}</span>
                  <span className="text-[10px] text-gray-400 font-medium block mt-1">Topic Weight: {t.importance} priority</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  t.evaluation === "Strong" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : t.evaluation === "Moderate" 
                      ? "bg-amber-50 text-amber-700 border border-amber-100" 
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}>
                  {t.evaluation} ({t.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all ${
                    t.evaluation === "Strong" ? "bg-emerald-500" : t.evaluation === "Moderate" ? "bg-amber-450" : "bg-rose-500"
                  }`} 
                  style={{ width: `${t.percentage}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500 italic leading-relaxed">
                👉 {t.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* QUESTION-BY-QUESTION EVALUATION */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center">
              <HelpCircle className="h-5 w-5 text-indigo-500 mr-2 shrink-0" />
              <span>Question-by-Question Grading Breakdown</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Click any question row to expand complete academic reasoning and correct answers.</p>
          </div>

          {/* Correct/Incorrect/Unattempted quick filters */}
          <div className="flex flex-wrap gap-1 border border-gray-100 rounded-lg p-1 bg-gray-55/30 shrink-0 text-xs shadow-3xs">
            <button
              type="button"
              onClick={() => setQuestionFilter("all")}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                questionFilter === "all" ? "bg-white text-gray-850 font-bold shadow-2xs" : "text-gray-405 hover:text-gray-700"
              }`}
            >
              All ({selectedResult.questions.length})
            </button>
            <button
              type="button"
              onClick={() => setQuestionFilter("correct")}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                questionFilter === "correct" ? "bg-white text-emerald-650 font-bold shadow-2xs" : "text-gray-405 hover:text-emerald-600"
              }`}
            >
              Correct ({selectedResult.questions.filter(q => q.isCorrect && !isQuestionUnattempted(q)).length})
            </button>
            <button
              type="button"
              onClick={() => setQuestionFilter("incorrect")}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                questionFilter === "incorrect" ? "bg-white text-rose-650 font-bold shadow-2xs" : "text-gray-450 hover:text-rose-600"
              }`}
            >
              Mistakes ({selectedResult.questions.filter(q => !q.isCorrect && !isQuestionUnattempted(q)).length})
            </button>
            <button
              type="button"
              onClick={() => setQuestionFilter("unattempted")}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                questionFilter === "unattempted" ? "bg-white text-indigo-700 font-bold shadow-2xs" : "text-gray-405 hover:text-gray-600"
              }`}
            >
              Unattempted ({selectedResult.questions.filter(q => isQuestionUnattempted(q)).length})
            </button>
          </div>
        </div>

        {/* Search bar inside questions list */}
        <div className="relative">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search questions, topics, or solution reasoning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-55/30 border border-gray-200 rounded-xl focus:outline-hidden focus:border-indigo-600 transition-colors text-xs"
          />
        </div>

        {/* QUESTIONS LIST */}
        <div className="space-y-2">
          {filteredQs.length === 0 ? (
            <div className="py-8 text-center text-gray-400 italic text-xs">
              No questions found matching active filters.
            </div>
          ) : (
            filteredQs.map((q) => {
              const isExpanded = expandedQuestion === q.questionNumber;

              return (
                <div
                  key={q.questionNumber}
                  className={(() => {
                    const isUnanswered = isQuestionUnattempted(q);
                    
                    if (q.isCorrect) {
                      return `border rounded-xl transition-all overflow-hidden ${isExpanded ? "border-emerald-200 bg-emerald-55/5" : "border-gray-100 hover:border-gray-200"}`;
                    } else if (isUnanswered) {
                      return `border rounded-xl transition-all overflow-hidden ${isExpanded ? "border-gray-300 bg-gray-55/10" : "border-gray-100 hover:border-gray-200"}`;
                    } else {
                      return `border rounded-xl transition-all overflow-hidden ${isExpanded ? "border-rose-200 bg-rose-55/5" : "border-gray-100 hover:border-gray-200"}`;
                    }
                  })()}
                >
                  <button
                    onClick={() => setExpandedQuestion(isExpanded ? null : q.questionNumber)}
                    className="w-full px-4 py-3 text-left flex items-start justify-between gap-4 transition-colors focus:outline-hidden"
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-400 mt-1 shrink-0">Q{q.questionNumber}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate max-w-lg md:max-w-2xl">{q.questionText}</p>
                        <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                            {q.topic}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            q.importance === "High" ? "bg-rose-50 text-rose-600 font-bold" : "bg-gray-100 text-gray-600"
                          }`}>
                            {q.importance} Importance
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 box-border">
                      {q.isCorrect ? (
                        <span className="text-xs text-emerald-750 flex items-center font-bold px-2 py-0.5 bg-emerald-55/10 border border-emerald-100 rounded-md">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          <span>+4 Marks</span>
                        </span>
                      ) : (() => {
                        const isUnanswered = isQuestionUnattempted(q);
                        return isUnanswered ? (
                          <span className="text-xs text-gray-500 flex items-center font-bold px-2 py-0.5 bg-gray-55/45 border border-gray-200 rounded-md">
                            <HelpCircle className="h-3.5 w-3.5 mr-1 text-gray-400" />
                            <span>0 Marks</span>
                          </span>
                        ) : (
                          <span className="text-xs text-rose-750 flex items-center font-bold px-2 py-0.5 bg-rose-55/10 border border-rose-100 rounded-md">
                            <XCircle className="h-3.5 w-3.5 mr-1 text-rose-500" />
                            <span>-1 Mark</span>
                          </span>
                        );
                      })()}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-100 text-xs">
                      <div className="bg-gray-55/40 p-4 rounded-xl space-y-3">
                        <p className="font-semibold text-gray-900 text-sm">Full Question: <span className="font-normal text-gray-750 text-sm">{q.questionText}</span></p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5">
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wilder leading-relaxed block">Your Answer Match:</span>
                            <span className={`font-semibold text-sm mt-0.5 block ${q.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                              {q.userAnswer}
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wilder leading-relaxed block">Ideal Correct Answer:</span>
                            <span className="font-semibold text-sm text-indigo-750 mt-0.5 block">
                              {q.correctAnswer}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!q.isCorrect ? (
                        <div className="space-y-2 bg-rose-50/25 border border-rose-100/60 p-4 rounded-xl">
                          <h4 className="font-bold text-rose-800 uppercase text-[10px] tracking-wider flex items-center">
                            <XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-500 shrink-0" />
                            <span>Detailed Diagnostic Explanation of Mistake</span>
                          </h4>
                          <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-line">
                            {q.explanation || "No explanation provided. Review syllabus concepts and practice rules to understand incorrect answer gaps."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-gray-450 uppercase text-[10px] tracking-wider flex items-center">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500 shrink-0" />
                            <span>Concept Explanation & Feedback</span>
                          </h4>
                          <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line pl-1">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
