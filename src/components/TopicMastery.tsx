/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Award, AlertTriangle, CheckCircle, HelpCircle, 
  Search, SlidersHorizontal, BookOpen, Star 
} from "lucide-react";
import { TestResult, TopicPerformance } from "../types";

const getRecommendationBullets = (text: string) => {
  if (!text) return [];
  return text
    .split(/[.;•\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 5); // Must be a meaningful sentence
};

const getTopicBullets = (name: string) => {
  if (!name) return [];
  if (name.includes(" - ")) {
    return name.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
  }
  return name.split(/[,/|]/).map(s => s.trim()).filter(Boolean);
};

interface TopicMasteryProps {
  results: TestResult[];
}

interface TopicMasteryItem {
  name: string;
  correct: number;
  total: number;
  percentage: number;
  evaluation: "Strong" | "Moderate" | "Weak";
  importance: "High" | "Medium" | "Low";
  recommendation: string;
  testCount: number;
  appearances: { testTitle: string; date: string; score: number; total: number; percentage: number; isCorrect: boolean }[];
}

export default function TopicMastery({ results }: TopicMasteryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [evaluationFilter, setEvaluationFilter] = useState<"all" | "Strong" | "Moderate" | "Weak">("all");

  if (results.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-xs max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No Syllabus Topics cataloged</h3>
          <p className="text-sm text-gray-500 mt-1">
            Analyzing your first test will map syllabus areas under this workspace.
          </p>
        </div>
      </div>
    );
  }

  // Aggregate stats across ALL tests for topics
  const topicsMap = new Map<string, TopicMasteryItem>();

  results.forEach((test) => {
    test.topics.forEach((t) => {
      const existing = topicsMap.get(t.topic);
      
      // Calculate questions details in matches
      const testQsInTopic = test.questions.filter((q) => q.topic === t.topic);
      const testCorrectInTopic = testQsInTopic.filter((q) => q.isCorrect).length;
      const testTotalInTopic = testQsInTopic.length || 1;

      const appearance = {
        testTitle: test.title,
        date: test.date,
        score: testCorrectInTopic,
        total: testTotalInTopic,
        percentage: Math.round((testCorrectInTopic / testTotalInTopic) * 100),
        isCorrect: testQsInTopic.every(q => q.isCorrect)
      };

      if (existing) {
        const updatedCorrect = existing.correct + t.correct;
        const updatedTotal = existing.total + t.total;
        const updatedPercentage = Math.round((updatedCorrect / updatedTotal) * 100);

        // Determine current status based on total average percentage (Calibrated to JEE/NEET standard)
        let updatedEval: "Strong" | "Moderate" | "Weak" = "Weak";
        if (updatedPercentage >= 70) updatedEval = "Strong";
        else if (updatedPercentage >= 40) updatedEval = "Moderate";

        topicsMap.set(t.topic, {
          name: t.topic,
          correct: updatedCorrect,
          total: updatedTotal,
          percentage: updatedPercentage,
          evaluation: updatedEval,
          importance: t.importance, // Priority doesn't change easily, so preserve
          recommendation: t.recommendation, // Preserve latest recommendation
          testCount: existing.testCount + 1,
          appearances: [...existing.appearances, appearance],
        });
      } else {
        // Calibrate single instance topic evaluation
        let itemEval: "Strong" | "Moderate" | "Weak" = "Weak";
        if (t.percentage >= 70) itemEval = "Strong";
        else if (t.percentage >= 40) itemEval = "Moderate";

        topicsMap.set(t.topic, {
          name: t.topic,
          correct: t.correct,
          total: t.total,
          percentage: t.percentage,
          evaluation: itemEval,
          importance: t.importance,
          recommendation: t.recommendation,
          testCount: 1,
          appearances: [appearance],
        });
      }
    });
  });

  const allTopics = Array.from(topicsMap.values());

  // Filter topics
  const filteredTopics = allTopics.filter((t) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.recommendation.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Importance filter
    if (importanceFilter !== "all" && t.importance !== importanceFilter) {
      return false;
    }

    // Evaluation filter
    if (evaluationFilter !== "all" && t.evaluation !== evaluationFilter) {
      return false;
    }

    return true;
  });

  // Hot warning for highly important topics that are Weak or Moderate
  const criticalReviewAlerts = allTopics.filter(
    (t) => t.importance === "High" && (t.evaluation === "Weak" || t.evaluation === "Moderate")
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-stone-900 dark:text-[#F4F1EA]">Syllabus Topics Mastery Directory</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">Understand your performance averages grouped by individual chapters and syllabus blocks.</p>
      </div>

      {/* CRITICAL WARNING BOARD */}
      {criticalReviewAlerts.length > 0 && (
        <div className="p-4 bg-amber-50/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/45 text-amber-905 dark:text-amber-200 rounded-xl space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-450 shrink-0" />
            <h4 className="font-bold text-sm text-amber-900 dark:text-[#FAF7F0]">Critical Revision Flags (Highly Important Syllabus Units)</h4>
          </div>
          <p className="text-xs text-amber-805 dark:text-amber-300 leading-relaxed font-semibold">
            The following chapters are verified as highly weighted syllabus items (&apos;High Importance&apos;) but your aggregate scores indicate incomplete mastery (&apos;Weak&apos; or &apos;Moderate&apos;). Revise these first before exams!
          </p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            {criticalReviewAlerts.map((t) => (
              <span 
                key={t.name}
                className="px-2.5 py-1 text-xs bg-amber-100/90 dark:bg-amber-950/40 font-bold border border-amber-200 dark:border-amber-850 hover:border-amber-300 rounded-lg text-amber-800 dark:text-amber-300"
              >
                ⚠️ {t.name} ({t.percentage}% - {t.evaluation})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS PANEL */}
      <div className="p-4 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-250/50 dark:border-stone-850/85 shadow-xs space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search syllabus disciplines, chapters, concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-100/50 dark:bg-stone-900/50 border border-stone-200/50 dark:border-stone-800 rounded-xl focus:outline-hidden focus:border-indigo-505 dark:text-stone-150 transition-colors text-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2 text-stone-605 dark:text-stone-400 font-bold">
            <SlidersHorizontal className="h-4 w-4 text-stone-450 shrink-0" />
            <span>Filter Directory Matrix:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Importance filters */}
            <div className="flex items-center space-x-1.5 bg-stone-100/50 dark:bg-stone-900/60 border border-stone-150/45 dark:border-stone-800 p-1 rounded-lg">
              <span className="text-[10px] text-stone-405 dark:text-stone-500 font-bold uppercase tracking-wider pl-1.5 shrink-0">Priority:</span>
              <button
                onClick={() => setImportanceFilter("all")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${importanceFilter === "all" ? "bg-white dark:bg-stone-800 text-stone-850 dark:text-stone-200 shadow-xs font-bold" : "text-stone-500 hover:text-stone-850 dark:text-stone-450"}`}
              >
                All
              </button>
              <button
                onClick={() => setImportanceFilter("High")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${importanceFilter === "High" ? "bg-white dark:bg-stone-800 text-rose-650 dark:text-rose-450 shadow-xs font-bold" : "text-stone-500 hover:text-rose-650 dark:text-stone-450"}`}
              >
                High
              </button>
              <button
                onClick={() => setImportanceFilter("Medium")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${importanceFilter === "Medium" ? "bg-white dark:bg-stone-800 text-amber-650 dark:text-amber-450 shadow-xs font-bold" : "text-stone-500 hover:text-amber-650 dark:text-stone-450"}`}
              >
                Med
              </button>
            </div>

            {/* Evaluation filters */}
            <div className="flex items-center space-x-1.5 bg-stone-100/50 dark:bg-stone-900/60 border border-stone-150/45 dark:border-stone-800 p-1 rounded-lg">
              <span className="text-[10px] text-stone-405 dark:text-stone-500 font-bold uppercase tracking-wider pl-1.5 shrink-0">Scale:</span>
              <button
                onClick={() => setEvaluationFilter("all")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${evaluationFilter === "all" ? "bg-white dark:bg-stone-800 text-stone-805 dark:text-stone-200 shadow-xs font-bold" : "text-stone-500 hover:text-stone-850 dark:text-stone-450"}`}
              >
                All
              </button>
              <button
                onClick={() => setEvaluationFilter("Strong")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${evaluationFilter === "Strong" ? "bg-white dark:bg-stone-800 text-emerald-650 dark:text-emerald-400 shadow-xs font-bold" : "text-stone-500 hover:text-emerald-600 dark:text-stone-350"}`}
              >
                Strong
              </button>
              <button
                onClick={() => setEvaluationFilter("Moderate")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${evaluationFilter === "Moderate" ? "bg-white dark:bg-stone-800 text-amber-650 dark:text-amber-450 shadow-xs font-bold" : "text-stone-500 hover:text-amber-600 dark:text-stone-350"}`}
              >
                Mod
              </button>
              <button
                onClick={() => setEvaluationFilter("Weak")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${evaluationFilter === "Weak" ? "bg-white dark:bg-stone-800 text-rose-650 dark:text-rose-455 shadow-xs font-bold" : "text-stone-500 hover:text-rose-600 dark:text-stone-350"}`}
              >
                Weak
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOPICS DISPLAY TILES / GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTopics.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-white/70 dark:bg-stone-900/40 rounded-2xl border border-stone-200/50 dark:border-stone-850/50 text-stone-400 dark:text-stone-500 italic text-sm">
            No topics align with the selected filter criteria.
          </div>
        ) : (
          filteredTopics.map((t) => {
            const topicBullets = getTopicBullets(t.name);
            const recommendationBullets = getRecommendationBullets(t.recommendation);

            return (
              <div 
                key={t.name}
                className="p-5 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md border border-stone-250/50 dark:border-stone-800/80 rounded-2xl shadow-xs hover:bg-white/95 dark:hover:bg-[#1C1A19]/90 hover:border-indigo-400/40 dark:hover:border-indigo-400/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between animate-fade-in">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-stone-450 dark:text-stone-500 font-bold uppercase tracking-wider block">Syllabus Topics</span>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        {topicBullets.map((bullet, idx) => (
                          <li key={idx} className="font-extrabold text-stone-900 dark:text-stone-100 text-base leading-tight marker:text-indigo-505">
                            {bullet}
                          </li>
                        ))}
                        {topicBullets.length === 0 && (
                          <li className="font-extrabold text-stone-900 dark:text-stone-100 text-base leading-tight marker:text-indigo-505">
                            {t.name}
                          </li>
                        )}
                      </ul>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="flex items-center text-[10px] text-yellow-500 font-bold uppercase bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-250/30 px-1.5 py-0.5 rounded-sm">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-500 mr-0.5" />
                          {t.importance} priority
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">Tested {t.testCount} {t.testCount === 1 ? "time" : "times"}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold shrink-0 ${
                      t.evaluation === "Strong" 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50" 
                        : t.evaluation === "Moderate" 
                          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50" 
                          : "bg-rose-50 dark:bg-rose-955/30 text-rose-700 dark:text-rose-450 border border-rose-100 dark:border-rose-900/50"
                    }`}>
                      {t.evaluation} ({t.percentage}%)
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-stone-450 dark:text-stone-400">
                      <span>Concept Proficiency</span>
                      <span>{t.correct} / {t.total} Questions Correct</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-850 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          t.evaluation === "Strong" ? "bg-emerald-500" : t.evaluation === "Moderate" ? "bg-amber-450" : "bg-rose-500"
                        }`} 
                        style={{ width: `${t.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-150/45 dark:border-indigo-800/40 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider">Revision Recommendation</span>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-stone-701 dark:text-stone-300 leading-relaxed pl-1">
                      {recommendationBullets.map((bullet, idx) => (
                        <li key={idx} className="marker:text-indigo-500 dark:marker:text-indigo-400 pl-0.5">
                          {bullet}
                        </li>
                      ))}
                      {recommendationBullets.length === 0 && (
                        <li className="list-none pl-0 italic">
                          💡 {t.recommendation}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200/50 dark:border-stone-800/50 mt-2">
                  <h5 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Session history log</h5>
                  <div className="mt-1.5 space-y-1 max-h-24 overflow-y-auto pr-1">
                    {t.appearances.map((app, index) => (
                      <div key={index} className="flex justify-between items-center text-xs font-semibold py-1">
                        <span className="text-stone-500 dark:text-stone-400 truncate max-w-xs">{app.testTitle}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                          app.percentage >= 80 
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" 
                            : app.percentage >= 50 
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450" 
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450"
                        }`}>
                          {app.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
