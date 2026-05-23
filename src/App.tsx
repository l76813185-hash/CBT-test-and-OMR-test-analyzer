/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Award, BookOpen, Clock, LayoutDashboard, PlusCircle, 
  Sparkles, GraduationCap, Github, FileText, Sun, Moon 
} from "lucide-react";
import { TestResult } from "./types";
import Dashboard from "./components/Dashboard";
import NewAnalysis from "./components/NewAnalysis";
import TestHistory from "./components/TestHistory";
import TopicMastery from "./components/TopicMastery";
import RepeatedTopics from "./components/RepeatedTopics";
import DetailedSolutions from "./components/DetailedSolutions";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("test_analyzer_dark_mode");
      return saved === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("test_analyzer_dark_mode", String(darkMode));
    } catch (e) {
      console.error("Local Storage theme selection failed:", e);
    }
    
    // Toggle class inside root document
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Local persistence engine
  const [results, setResults] = useState<TestResult[]>(() => {
    try {
      const saved = localStorage.getItem("test_analyzer_results");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Local Storage reading failed:", e);
    }
    return [];
  });

  // Keep state in sync with localStorage
  useEffect(() => {
    localStorage.setItem("test_analyzer_results", JSON.stringify(results));
  }, [results]);

  const handleAnalysisSuccess = (newResult: TestResult) => {
    // Save new result at the beginning of the list (reverse chronological order)
    setResults((prev) => [newResult, ...prev]);
    // Navigate straight to history detailed review for this test
    setSelectedResult(newResult);
    setActiveTab("history");
  };

  const handleDeleteResult = (id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  const handleImportPastResult = (importedResult: TestResult) => {
    setResults((prev) => {
      if (prev.some((r) => r.id === importedResult.id)) {
        return prev;
      }
      return [importedResult, ...prev];
    });
  };

  const handleImportBulk = (importedList: TestResult[]) => {
    setResults((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const filteredNew = importedList.filter((r) => !existingIds.has(r.id));
      return [...filteredNew, ...prev];
    });
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${
      darkMode ? "bg-stone-950 text-[#F4F1EA]" : "bg-[#FAF7F0] text-stone-850"
    }`}>
      {/* MINIMALIST MASTER HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors duration-300 ${
        darkMode ? "bg-[#181615]/75 border-b border-stone-800/55 text-white" : "bg-[#FAF7F0]/75 border-b border-stone-200/55 text-stone-900"
      }`}>
        <div className="flex items-center space-x-3 select-none">
          <div className="p-2.5 bg-indigo-650/90 text-white rounded-xl shadow-xs backdrop-blur-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className={`text-lg font-extrabold leading-tight ${darkMode ? "text-stone-150" : "text-stone-900"}`}>Test Analyzer</h1>
            <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>Preparation tracker</span>
          </div>
        </div>

        {/* RECT TAB SWITCHER */}
        <nav className={`hidden md:flex items-center space-x-1.5 p-1 rounded-xl transition-colors ${
          darkMode ? "bg-stone-900/60 border border-stone-800/60" : "bg-stone-200/60"
        }`}>
          <button
            onClick={() => { setActiveTab("dashboard"); setSelectedResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "dashboard"
                ? (darkMode ? "bg-indigo-600 text-white shadow-xs font-black" : "bg-white text-indigo-700 shadow-xs font-black")
                : (darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40" : "text-stone-605 text-stone-600 hover:text-stone-900")
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Mastery Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab("new-test"); setSelectedResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "new-test"
                ? (darkMode ? "bg-indigo-600 text-white shadow-xs font-black" : "bg-white text-indigo-700 shadow-xs font-black")
                : (darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40" : "text-stone-605 text-stone-600 hover:text-stone-900")
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Analyze New Test</span>
          </button>
          <button
            onClick={() => { setActiveTab("history"); setSelectedResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "history"
                ? (darkMode ? "bg-indigo-600 text-white shadow-xs font-black" : "bg-white text-indigo-700 shadow-xs font-black")
                : (darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40" : "text-stone-605 text-stone-600 hover:text-stone-900")
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Historical Archives</span>
          </button>
          <button
            onClick={() => { setActiveTab("topics"); setSelectedResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "topics"
                ? (darkMode ? "bg-indigo-600 text-white shadow-xs font-black" : "bg-white text-indigo-700 shadow-xs font-black")
                : (darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40" : "text-stone-605 text-stone-600 hover:text-stone-900")
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Syllabus Matrix</span>
          </button>
          <button
            onClick={() => { setActiveTab("repeated"); setSelectedResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "repeated"
                ? (darkMode ? "bg-indigo-600 text-white shadow-xs font-black" : "bg-white text-indigo-700 shadow-xs font-black")
                : (darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40" : "text-stone-650 text-stone-600 hover:text-stone-900")
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Repeated & Important</span>
          </button>
          <button
            onClick={() => { setActiveTab("solutions"); setSelectedResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "solutions"
                ? (darkMode ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-indigo-700 shadow-xs")
                : (darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40" : "text-stone-650 text-stone-600 hover:text-stone-900")
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Detailed Solutions</span>
          </button>
        </nav>

        {/* SYLLABUS UNIT OVERVIEW & THEME SWITCHER */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
              darkMode 
                ? "bg-stone-800 border-stone-700 text-amber-400 hover:bg-stone-700 hover:text-amber-300" 
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-indigo-600"
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme mode"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          <div className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            darkMode 
              ? "text-stone-300 bg-stone-900 border-stone-800" 
              : "text-stone-600 bg-white border-stone-200"
          }`}>
            <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
            <span>{results.length} Tests Logged</span>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t py-2.5 px-6 flex items-center justify-around shadow-lg transition-colors duration-250 ${
        darkMode ? "bg-stone-950/95 border-stone-800 text-stone-100" : "bg-white/95 border-gray-100 text-stone-700"
      }`}>
        <button
          onClick={() => { setActiveTab("dashboard"); setSelectedResult(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === "dashboard"
              ? "text-indigo-500 font-extrabold"
              : (darkMode ? "text-slate-400" : "text-gray-400")
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>
        <button
          onClick={() => { setActiveTab("new-test"); setSelectedResult(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === "new-test"
              ? "text-indigo-500 font-extrabold"
              : (darkMode ? "text-slate-400" : "text-gray-400")
          }`}
        >
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px]">Analyze</span>
        </button>
        <button
          onClick={() => { setActiveTab("history"); setSelectedResult(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === "history"
              ? "text-indigo-500 font-extrabold"
              : (darkMode ? "text-slate-400" : "text-gray-400")
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px]">History</span>
        </button>
        <button
          onClick={() => { setActiveTab("topics"); setSelectedResult(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === "topics"
              ? "text-indigo-500 font-extrabold"
              : (darkMode ? "text-slate-400" : "text-gray-400")
          }`}
        >
          <Award className="h-5 w-5" />
          <span className="text-[10px]">Syllabus</span>
        </button>
        <button
          onClick={() => { setActiveTab("repeated"); setSelectedResult(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === "repeated"
              ? "text-indigo-500 font-extrabold"
              : (darkMode ? "text-slate-400" : "text-gray-400")
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px]">Repeated</span>
        </button>
        <button
          onClick={() => { setActiveTab("solutions"); setSelectedResult(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === "solutions"
              ? "text-indigo-500 font-extrabold"
              : (darkMode ? "text-slate-400" : "text-gray-400")
          }`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px]">Solutions</span>
        </button>
      </nav>

      {/* MAIN CONTAINER CONTENT VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 pb-24 md:pb-12 space-y-6">
        {activeTab === "dashboard" && (
          <Dashboard 
            results={results} 
            setActiveTab={setActiveTab} 
            setSelectedResult={setSelectedResult}
            darkMode={darkMode}
          />
        )}

        {activeTab === "new-test" && (
          <NewAnalysis 
            onAnalysisSuccess={handleAnalysisSuccess} 
            savedResultsCount={results.length}
            previousResults={results}
            onImportPastResult={handleImportPastResult}
          />
        )}

        {activeTab === "history" && (
          <TestHistory 
            results={results} 
            onDeleteResult={handleDeleteResult}
            selectedResult={selectedResult}
            setSelectedResult={setSelectedResult}
            onImportBulk={handleImportBulk}
          />
        )}

        {activeTab === "topics" && (
          <TopicMastery 
            results={results} 
          />
        )}

        {activeTab === "repeated" && (
          <RepeatedTopics 
            results={results} 
          />
        )}

        {activeTab === "solutions" && (
          <DetailedSolutions 
            results={results} 
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-6 text-center text-xs text-gray-400 dark:text-slate-500 font-medium">
        <p>© {new Date().getFullYear()} Test Analyzer & Prep Tracker. All performance and file records are kept securely offline inside your browser local storage.</p>
      </footer>
    </div>
  );
}
