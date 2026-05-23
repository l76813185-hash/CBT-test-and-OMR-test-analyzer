/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, ReferenceLine, ReferenceDot
} from "recharts";
import { 
  TrendingUp, Award, ClipboardList, BookOpen, AlertTriangle, 
  CheckCircle, ArrowUpRight, ArrowRight, Frown, Sparkles, ShieldCheck
} from "lucide-react";
import { TestResult, TopicPerformance } from "../types";
import { calculateMarkingStats, calculateSubjectWiseStats } from "../utils";

interface DashboardProps {
  results: TestResult[];
  setActiveTab: (tab: string) => void;
  setSelectedResult: (result: TestResult | null) => void;
  darkMode?: boolean;
}

export default function Dashboard({ results, setActiveTab, setSelectedResult, darkMode = false }: DashboardProps) {
  if (results.length === 0) {
    return (
      <div className="text-center p-12 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-200/50 dark:border-stone-850/80 shadow-xs max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-indigo-55/15 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto scale-110">
          <BookOpen className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900 dark:text-[#FAF7F0]">Your Analyzer is Ready!</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed font-semibold">
            Upload your first test question paper and submitted answer sheet. We will process it, grade each question, and begin building your syllabus mastery profile.
          </p>
        </div>
        <button
          onClick={() => setActiveTab("new-test")}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm cursor-pointer"
        >
          Analyze First Test
        </button>
      </div>
    );
  }

  // Sort chronologically for charts
  const chronResults = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Basic calculations
  const totalTests = results.length;
  const averagePercentage = Number((results.reduce((acc, r) => acc + r.percentage, 0) / totalTests).toFixed(1));
  const latestResult = results[0]; // Assumed sorted reverse-chronologically in parent

  const allTestsStats = results.map(r => calculateMarkingStats(r.questions));
  const latestResultStats = allTestsStats[0];
  const averageMarks = Number((allTestsStats.reduce((acc, s) => acc + s.marks, 0) / totalTests).toFixed(1));
  const averageMaxMarks = Number((allTestsStats.reduce((acc, s) => acc + s.maxPossibleMarks, 0) / totalTests).toFixed(1));

  // Subject-wise Cumulative and Latest analysis
  const allQuestionsCombined = results.flatMap(r => r.questions);
  const aggregateSubjectStats = calculateSubjectWiseStats(allQuestionsCombined);
  const latestSubjectStats = calculateSubjectWiseStats(latestResult.questions);

  // Topic master aggregates (Most recent evaluation for each topic)
  const topicLatestMap = new Map<string, TopicPerformance & { date: string }>();
  const topicHistoryMap = new Map<string, { percentage: number; date: string; evaluation: "Strong" | "Moderate" | "Weak" }[]>();

  chronResults.forEach((test) => {
    test.topics.forEach((topicObj) => {
      // Latest topic map
      topicLatestMap.set(topicObj.topic, { ...topicObj, date: test.date });
      
      // History map
      const currentHistory = topicHistoryMap.get(topicObj.topic) || [];
      currentHistory.push({
        percentage: topicObj.percentage,
        date: test.date,
        evaluation: topicObj.evaluation
      });
      topicHistoryMap.set(topicObj.topic, currentHistory);
    });
  });

  // We calibrate topics to Competitive standard: Strong >= 70%, Moderate >= 40%, Weak < 40%
  const activeTopics = Array.from(topicLatestMap.values()).map(t => {
    let calibratedEval: "Strong" | "Moderate" | "Weak" = "Weak";
    if (t.percentage >= 70) calibratedEval = "Strong";
    else if (t.percentage >= 40) calibratedEval = "Moderate";
    return { ...t, evaluation: calibratedEval };
  });

  const strongTopics = activeTopics.filter(t => t.evaluation === "Strong");
  const moderateTopics = activeTopics.filter(t => t.evaluation === "Moderate");
  const weakTopics = activeTopics.filter(t => t.evaluation === "Weak");

  // Topic improvements tracker
  const improvements: {
    topic: string;
    before: { percentage: number; evaluation: string };
    after: { percentage: number; evaluation: string };
  }[] = [];

  topicHistoryMap.forEach((history, topic) => {
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      
      const getCalEval = (pct: number): "Strong" | "Moderate" | "Weak" => {
        if (pct >= 70) return "Strong";
        if (pct >= 40) return "Moderate";
        return "Weak";
      };

      const firstEval = getCalEval(first.percentage);
      const lastEval = getCalEval(last.percentage);

      const isPercentageImproved = last.percentage > first.percentage;
      const firstWeight = firstEval === "Strong" ? 3 : firstEval === "Moderate" ? 2 : 1;
      const lastWeight = lastEval === "Strong" ? 3 : lastEval === "Moderate" ? 2 : 1;
      const isStatusImproved = lastWeight > firstWeight;

      if (isPercentageImproved || isStatusImproved) {
        improvements.push({
          topic,
          before: { percentage: Math.round(first.percentage), evaluation: firstEval },
          after: { percentage: Math.round(last.percentage), evaluation: lastEval }
        });
      }
    }
  });

  // Recharts Line Chart Data formatting (Plotting percentage + actual marks scored!)
  const scoreTrendData = chronResults.map((test) => {
    const stats = calculateMarkingStats(test.questions);
    return {
      name: test.title.length > 15 ? test.title.substring(0, 15) + "..." : test.title,
      "Score (%)": Math.round(test.percentage),
      "Marks Scored": stats.marks,
      "Max Marks": stats.maxPossibleMarks,
      date: new Date(test.date).toLocaleDateString([], { month: "short", day: "numeric" }),
      fullTitle: test.title
    };
  });

  // Recharts Bar Chart Data for Topic Mastery counts (calibrated)
  const topicDistributionData = [
    { name: "Strong (≥70%)", count: strongTopics.length, color: "#10B981" },
    { name: "Moderate (40-69%)", count: moderateTopics.length, color: "#F59E0B" },
    { name: "Weak (<40%)", count: weakTopics.length, color: "#EF4444" },
  ];

  // Critical Focus Areas (Weak topics that are also HIGH and MEDIUM importance)
  const highPriorityGaps = activeTopics
    .filter(t => t.evaluation === "Weak" && (t.importance === "High" || t.importance === "Medium"))
    .sort((a, b) => (a.importance === "High" ? -1 : 1));

  // 1. Recency-Weighted Test Score
  const recencyWeightedScore = useMemo(() => {
    if (chronResults.length === 0) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    chronResults.forEach((test, idx) => {
      const weight = idx + 1; // Scale linearly with recency
      weightedSum += test.percentage * weight;
      totalWeight += weight;
    });
    return Math.round(weightedSum / totalWeight);
  }, [chronResults]);

  // 2. Syllabus Topic Importance-Weighted Score
  const topicWeightedValue = useMemo(() => {
    if (activeTopics.length === 0) return 0;
    let totalWeight = 0;
    let weightedSum = 0;
    activeTopics.forEach(t => {
      const weight = t.importance === "High" ? 3 : t.importance === "Medium" ? 2 : 1;
      weightedSum += t.percentage * weight;
      totalWeight += weight;
    });
    return Math.round(weightedSum / totalWeight);
  }, [activeTopics]);

  // 3. Combined Weighted Mastery Score
  const weightedMasteryScore = useMemo(() => {
    if (activeTopics.length === 0 && chronResults.length === 0) return 0;
    if (activeTopics.length > 0 && chronResults.length > 0) {
      // 60% weight to core topic coverage, 40% to recent exam recency consistency
      return Math.round(topicWeightedValue * 0.6 + recencyWeightedScore * 0.4);
    } else if (activeTopics.length > 0) {
      return Math.round(topicWeightedValue);
    } else {
      return Math.round(recencyWeightedScore);
    }
  }, [activeTopics.length, chronResults.length, topicWeightedValue, recencyWeightedScore]);

  // 4. Identify significant improvement periods (periods where score jumps >= 5%)
  const improvementPeriods = useMemo(() => {
    const periods: {
      name: string;
      percentageDiff: number;
      prevScore: number;
      currentScore: number;
    }[] = [];
    
    for (let i = 1; i < scoreTrendData.length; i++) {
      const prev = scoreTrendData[i - 1];
      const curr = scoreTrendData[i];
      const prevScore = typeof prev["Score (%)"] === "number" ? prev["Score (%)"] : 0;
      const currentScore = typeof curr["Score (%)"] === "number" ? curr["Score (%)"] : 0;
      const diff = currentScore - prevScore;
      
      if (diff >= 5) {
        periods.push({
          name: curr.name,
          percentageDiff: diff,
          prevScore,
          currentScore
        });
      }
    }
    return periods;
  }, [scoreTrendData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* MASTERY SUMMARY KEY OVERVIEW CARD */}
      <div className="p-6 bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-xl relative overflow-hidden transition-all duration-300">
        <div className="absolute inset-0 bg-radial-gradient from-indigo-900/40 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Visual SVG Circular Progress Gauge */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-indigo-400 transition-all duration-500 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - weightedMasteryScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{weightedMasteryScore}%</span>
                <span className="text-[9px] uppercase font-bold text-indigo-300 tracking-wider">Mastery</span>
              </div>
            </div>
            
            <div className="space-y-1.5 max-w-lg">
              <span className="text-[9px] uppercase font-black text-indigo-300 tracking-widest block">Core KPI Diagnostic</span>
              <h3 className="text-base font-black text-white flex items-center justify-center sm:justify-start">
                <ShieldCheck className="h-5 w-5 mr-1.5 text-indigo-400 shrink-0" />
                <span>Weighted Syllabus Mastery Summary</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold font-sans">
                A unified intelligence indicator weighing both syllabus-topic mastery according to importance priority (60%) and recent test results according to chronological recency (40%) to accurately estimate your exam-readiness.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-semibold shrink-0">
            <div className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-2xl space-y-1">
              <span className="text-[9px] uppercase text-indigo-300 font-extrabold block">Topic Mastery</span>
              <span className="text-base font-black text-white block">{topicWeightedValue}%</span>
              <p className="text-[10px] text-slate-400 leading-tight">Weighed by importance (High 3x, Mid 2x, Low 1x)</p>
            </div>

            <div className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-2xl space-y-1">
              <span className="text-[9px] uppercase text-indigo-300 font-extrabold block">Recency Score</span>
              <span className="text-base font-black text-white block">{recencyWeightedScore}%</span>
              <p className="text-[10px] text-slate-400 leading-tight">Priority weighted for chronological memory retention</p>
            </div>

            <div className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-2xl flex flex-col justify-center sm:col-span-2 lg:col-span-1">
              <span className="text-[9px] uppercase text-indigo-300 font-extrabold block mb-1">Appraisal</span>
              {weightedMasteryScore >= 75 ? (
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <Award className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-black">Elite Preparer</span>
                </div>
              ) : weightedMasteryScore >= 55 ? (
                <div className="flex items-center space-x-1.5 text-amber-400">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-black">Strong Contender</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-black">Refinement Priority</span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 leading-tight mt-1">Calibrated status level</p>
            </div>
          </div>
        </div>
      </div>

      {/* SCORES METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT 1: AVERAGE SCORE & MARKS */}
        <div className="p-5 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-250/50 dark:border-stone-850/80 shadow-xs flex items-center space-x-4 hover:bg-white/95 dark:hover:bg-[#1C1A19]/90 hover:border-indigo-400/40 dark:hover:border-indigo-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold block">Average Performance</span>
            <span className="text-2xl font-black text-stone-900 dark:text-[#FAF7F0]">{averagePercentage}%</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-450 font-bold block mt-1">Average: {averageMarks} / {averageMaxMarks} marks</span>
          </div>
        </div>

        {/* STAT 2: LATEST MARKS */}
        <div className="p-5 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-250/50 dark:border-stone-850/80 shadow-xs flex items-center space-x-4 hover:bg-white/95 dark:hover:bg-[#1C1A19]/90 hover:border-indigo-400/40 dark:hover:border-indigo-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold block">Latest Test Marks</span>
            <span className="text-2xl font-black text-stone-900 dark:text-[#FAF7F0]">{latestResultStats.marks} <span className="text-xs text-stone-450 dark:text-stone-500 font-medium">/ {latestResultStats.maxPossibleMarks} marks</span></span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold leading-tight mt-1">
              {latestResultStats.correct}C (Value: +{latestResultStats.positiveMarks}) • {latestResultStats.wrong}W (Deduct: {latestResultStats.negativeMarks}) • {latestResultStats.unattempted}U
            </span>
          </div>
        </div>

        {/* STAT 3: STRONG TOPICS (Calibrated) */}
        <div className="p-5 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-250/50 dark:border-stone-850/80 shadow-xs flex items-center space-x-4 hover:bg-white/95 dark:hover:bg-[#1C1A19]/90 hover:border-indigo-400/40 dark:hover:border-indigo-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold block">Strong Topics (≥70%)</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{strongTopics.length}</span>
            <span className="text-xs text-stone-400 dark:text-stone-500 block mt-0.5">Out of {activeTopics.length} topics mapped</span>
          </div>
        </div>

        {/* STAT 4: WEAK TOPICS (Calibrated) */}
        <div className="p-5 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-250/50 dark:border-stone-850/80 shadow-xs flex items-center space-x-4 hover:bg-white/95 dark:hover:bg-[#1C1A19]/90 hover:border-indigo-400/40 dark:hover:border-indigo-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="p-3 bg-rose-50/50 dark:bg-rose-955/45 text-rose-600 dark:text-rose-455 rounded-xl shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold block">Weak Topics (&lt;40%)</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-450">{weakTopics.length}</span>
            <span className="text-xs text-rose-600 dark:text-rose-450 font-bold block mt-0.5">Critical review priority</span>
          </div>
        </div>
      </div>

      {/* MARKING SCHEME INFO BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/10 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-900/30">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Active Test Evaluation Marking Scheme</p>
            <p className="text-[11px] text-stone-700 dark:text-stone-300">Grades are mapped as: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+4</span> for correct answers, <span className="font-extrabold text-rose-500 dark:text-rose-455">-1</span> for wrong attempts, and <span className="font-extrabold text-stone-500 dark:text-stone-400">0</span> for omitted / unattempted questions.</p>
          </div>
        </div>
        <span className="text-[10px] font-black py-1 px-2.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-805 dark:text-indigo-200 rounded-md uppercase tracking-wider shrink-0 w-max">
          JEE / NEET Standard
        </span>
      </div>

      {/* DYNAMIC DIAGNOSTIC EDUCATIONAL ADVISORY (SCORE DISCREPANCY SOLVED) */}
      <div className="p-5 bg-amber-500/5 dark:bg-amber-955/10 border border-amber-250 dark:border-amber-900/35 rounded-2xl space-y-3 shadow-3xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-450 rounded-lg">
            <AlertTriangle className="h-5 w-5 shrink-0" />
          </div>
          <h4 className="font-black text-stone-900 dark:text-[#FAF7F0] text-sm">Grading & Score Verification Decoded (+4 / -1 Competitive Guidelines)</h4>
        </div>
        <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-semibold">
          Why does your scorecard display a Net score of <span className="font-extrabold text-[#111827] dark:text-[#FAF7F0]">{latestResultStats.marks} Marks</span> while another analysis tool (such as Codex) might report <span className="font-bold text-indigo-700 dark:text-indigo-400">32 Marks</span>?
        </p>
        <div className="bg-[#FAF9F5] dark:bg-[#1C1A19]/80 border border-amber-150/40 dark:border-amber-900/30 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-450 dark:text-stone-550 font-extrabold block uppercase tracking-wider leading-none">Positive Contributor (Raw Score)</span>
            <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">+{latestResultStats.positiveMarks} Marks</span>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">Accomplished via <span className="font-bold text-emerald-600 dark:text-emerald-400">{latestResultStats.correct} Correct Answers</span> (each valued at +4 marks).</p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-200/50 dark:border-stone-850/85 pt-3 md:pt-0 md:pl-4">
            <span className="text-[10px] text-stone-450 dark:text-stone-550 font-extrabold block uppercase tracking-wider leading-none">Mistake Deductions (Neg marking)</span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-455">{latestResultStats.negativeMarks} Marks</span>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">Incurred due to <span className="font-bold text-rose-500 dark:text-rose-400">{latestResultStats.wrong} Mistake Attempts</span> (deducting -1 mark each).</p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-200/50 dark:border-stone-850/85 pt-3 md:pt-0 md:pl-4">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-extrabold block uppercase tracking-wider leading-none">Net Score (Standard Evaluation)</span>
            <span className="text-base font-extrabold text-indigo-850 dark:text-[#FAF7F0]">{latestResultStats.marks} Net Marks</span>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">Sum of raw positive potential plus negative penalties (<span className="font-bold">{latestResultStats.positiveMarks} - {Math.abs(latestResultStats.negativeMarks)} = {latestResultStats.marks} marks</span>).</p>
          </div>
        </div>
        <p className="text-[11px] text-amber-805 dark:text-amber-450 leading-normal italic font-semibold">
          💡 <strong>Tip:</strong> If an external report is showing a raw score of <strong>32</strong>, it indicates your potential raw positive correct count marks before incorporating standard exam negative deductions. The active app evaluates net markings strictly under JEE (+4/-1) code guidelines to guarantee realistic prep feedback.
        </p>
      </div>

      {/* SUBJECTS BENTO MATRIX: MARKS AND ACCURACY */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center">
          <ShieldCheck className="h-5 w-5 text-indigo-600 mr-2 shrink-0" />
          <span>Subject-wise Performance & Marks (Competitive Tracker)</span>
        </h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Track your cumulative and latest performance across individual syllabus divisions</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["Physics", "Chemistry", "Mathematics", "Biology"] as const).map((subName) => {
            const overallStat = aggregateSubjectStats[subName];
            const latestStat = latestSubjectStats[subName];
            
            // If there's no data for this subject, skip rendering
            if ((!overallStat || overallStat.total === 0) && (!latestStat || latestStat.total === 0)) {
              return null;
            }

            const cStyles = {
              Physics: { border: "border-blue-200/50 dark:border-blue-900/40", bg: "bg-blue-50/30 dark:bg-blue-950/20", title: "text-blue-800 dark:text-blue-300", text: "text-blue-900 dark:text-blue-200", progress: "bg-blue-500", label: "Physics" },
              Chemistry: { border: "border-amber-200/50 dark:border-amber-900/40", bg: "bg-amber-50/30 dark:bg-amber-950/20", title: "text-amber-800 dark:text-amber-300", text: "text-amber-900 dark:text-amber-200", progress: "bg-amber-550", label: "Chemistry" },
              Mathematics: { border: "border-purple-200/50 dark:border-purple-900/40", bg: "bg-purple-50/30 dark:bg-purple-950/20", title: "text-purple-800 dark:text-purple-300", text: "text-purple-900 dark:text-purple-200", progress: "bg-purple-500", label: "Mathematics" },
              Biology: { border: "border-emerald-200/50 dark:border-emerald-900/40", bg: "bg-emerald-50/30 dark:bg-emerald-950/20", title: "text-emerald-800 dark:text-emerald-300", text: "text-emerald-900 dark:text-emerald-200", progress: "bg-emerald-500", label: "Biology" },
              General: { border: "border-stone-200/50 dark:border-stone-850/40", bg: "bg-stone-50/30 dark:bg-stone-950/20", title: "text-stone-800 dark:text-stone-300", text: "text-stone-900 dark:text-stone-200", progress: "bg-stone-500", label: "General" }
            }[subName];

            return (
              <div key={subName} className={`p-4 rounded-2xl border ${cStyles.border} ${cStyles.bg} bg-white/70 dark:bg-[#151312]/80 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-300`}>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-black ${cStyles.title}`}>{cStyles.label}</span>
                    <span className="text-xs font-black px-2 py-0.5 bg-white/90 dark:bg-[#1C1A19] border border-stone-200 dark:border-stone-850 text-stone-900 dark:text-[#FAF7F0] rounded-md">
                      {latestStat?.total > 0 ? `${latestStat.percentage}%` : "No data"}
                    </span>
                  </div>
                  {latestStat?.total > 0 ? (
                    <div className="space-y-1.5 pt-1 font-semibold text-stone-700 dark:text-stone-300">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>Latest Marks:</span>
                        <span className="text-stone-900 dark:text-[#FAF7F0] font-black">{latestStat.marks} / {latestStat.maxMarks}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400 font-bold leading-none">
                        <span>Pos: +{latestStat.positiveMarks} | Neg: {latestStat.negativeMarks}</span>
                        <span>{latestStat.correct}C • {latestStat.wrong}W</span>
                      </div>
                      {/* Sub-Progress bar */}
                      <div className="w-full bg-stone-200/50 dark:bg-stone-850 rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-1 rounded-full ${cStyles.progress}`} 
                          style={{ width: `${latestStat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 italic block font-semibold">Not tested in latest session</span>
                  )}
                </div>

                <div className="bg-[#FAF9F6]/80 dark:bg-[#1C1A19]/80 border border-stone-200/50 dark:border-stone-850/80 p-2 rounded-xl text-[10px] space-y-1 font-semibold">
                  <span className="font-extrabold text-[#4F46E5] dark:text-[#FAF7F0] block uppercase tracking-wider leading-none">Cumulative History</span>
                  <div className="flex justify-between font-bold text-stone-600 dark:text-stone-450">
                    <span>Overall Score:</span>
                    <span className="text-stone-850 dark:text-stone-205 font-black">{overallStat.marks} / {overallStat.maxMarks} marks</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-600 dark:text-stone-450">
                    <span>Average Accuracy:</span>
                    <span className="text-stone-800 dark:text-[#FAF7F0] font-black">{overallStat.percentage}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LINE CHART: PROGRESS OVER TIME */}
        <div className="p-5 bg-white/70 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-200/50 dark:border-stone-850/80 shadow-xs col-span-2 space-y-4 hover:shadow-md transition-all duration-300">
          <div>
            <h3 className="text-base font-black text-stone-900 dark:text-[#FAF7F0]">Score & Preparation Progress Trends</h3>
            <p className="text-xs text-stone-500 dark:text-stone-405 font-semibold">Verifies performance trends over chronological testing sessions (dual plot: accuracy % and net marks obtained)</p>
          </div>
          <div className="h-[280px] w-full pr-4 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#E5E7EB"} />
                <XAxis dataKey="name" stroke="#6B7280" tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 100]} stroke="#4F46E5" tickLine={false} label={{ value: "Accuracy / Score (%)", angle: -90, position: "insideLeft", style: { fill: "#4F46E5", fontWeight: 800 } }} />
                <YAxis yAxisId="right" orientation="right" stroke="#06B6D4" tickLine={false} label={{ value: "Marks Scored", angle: 90, position: "insideRight", style: { fill: "#06B6D4", fontWeight: 800 } }} />
                <Tooltip 
                  contentStyle={{ background: darkMode ? "#1C1A19" : "#FFFFFF", border: darkMode ? "1px solid #2D2A28" : "1px solid #E5E7EB", borderRadius: "12px", color: darkMode ? "#FAF7F0" : "#1C1A19" }}
                  itemStyle={{ color: darkMode ? "#FAF7F0" : "#1C1A19", fontWeight: 600 }}
                  formatter={(value, name) => {
                    if (name === "Score (%)") return [`${value}%`, "Accuracy (%)"];
                    if (name === "Marks Scored") return [value, "Scored Marks"];
                    return [value, name];
                  }}
                />
                <Legend />
                {improvementPeriods.map((period, idx) => (
                  <ReferenceLine
                    key={`ref-line-${idx}`}
                    yAxisId="left"
                    x={period.name}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `+${Math.round(period.percentageDiff)}% Gain`,
                      position: "insideTopLeft",
                      fill: "#10B981",
                      fontSize: 10,
                      fontWeight: 800
                    }}
                  />
                ))}
                {improvementPeriods.map((period, idx) => (
                  <ReferenceDot
                    key={`ref-dot-${idx}`}
                    yAxisId="left"
                    x={period.name}
                    y={period.currentScore}
                    r={6}
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                ))}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Score (%)"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                  dot={{ r: 5, fill: "#4F46E5", stroke: "#FFFFFF", strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Marks Scored"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  dot={{ r: 4, fill: "#06B6D4", stroke: "#FFFFFF", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART: TOPIC MASTERY RATIOS */}
        <div className="p-5 bg-white/70 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-200/50 dark:border-stone-850/80 shadow-xs space-y-4 hover:shadow-md transition-all duration-300">
          <div>
            <h3 className="text-base font-black text-stone-900 dark:text-[#FAF7F0]">Concept Mastery Ratio</h3>
            <p className="text-xs text-stone-500 dark:text-stone-405 font-semibold">Mastery levels across unique exam topics (calibrated to JEE/NEET thresholds)</p>
          </div>
          <div className="h-[210px] w-full text-xs flex items-center justify-center">
            {activeTopics.length === 0 ? (
              <p className="text-stone-500 dark:text-stone-400 font-bold italic">No topics analyzed yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#F3F4F6"} />
                  <XAxis dataKey="name" tickLine={false} stroke="#6B7280" />
                  <YAxis tickLine={false} stroke="#6B7280" allowDecimals={false} />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {topicDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="pt-2 border-t border-stone-200/50 dark:border-stone-850 flex justify-between text-center select-none font-semibold">
            <div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">Strong (≥70%)</span>
              <span className="text-lg font-black text-stone-800 dark:text-stone-200">{strongTopics.length}</span>
            </div>
            <div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block">Moderate (40-69%)</span>
              <span className="text-lg font-black text-stone-800 dark:text-stone-200">{moderateTopics.length}</span>
            </div>
            <div>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-bold block">Weak (&lt;40%)</span>
              <span className="text-lg font-black text-rose-750 dark:text-rose-400">{weakTopics.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT IMPROVEMENTS TABLE & PROGRESSION TRACKER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WEAKNESS ANALYSIS & FOCUS AREAS */}
        <div className="p-5 bg-white/70 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-200/50 dark:border-stone-850/80 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-[#FAF7F0] flex items-center">
                <AlertTriangle className="h-5 w-5 text-rose-500 mr-2 shrink-0 animate-pulse" />
                <span>Critical Preparation Focus Areas</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-bold">Topics graded as &apos;Weak&apos; but hold High or Medium syllabus importance.</p>
            </div>

            {highPriorityGaps.length === 0 ? (
              <div className="py-8 text-center bg-emerald-50/10 dark:bg-[#1C1A19]/50 border border-emerald-200/50 dark:border-emerald-950 rounded-xl space-y-2">
                <Award className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-black text-emerald-805 dark:text-emerald-400">Excellent! No High-priority Weakness Gaps</p>
                <p className="text-xs text-stone-605 dark:text-stone-400 font-semibold max-w-sm mx-auto">All highly important syllabus chapters logged are currently Strong or Moderate.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {highPriorityGaps.map((item) => (
                  <div key={item.topic} className="p-3 bg-rose-50/15 dark:bg-[#1C1A19]/80 border border-rose-200/40 dark:border-stone-800/80 rounded-xl space-y-2 font-semibold">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[#111827] dark:text-[#FAF7F0] text-sm block truncate max-w-[200px]">{item.topic}</span>
                      <div className="flex space-x-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.importance === "High" ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300" : "bg-amber-100 dark:bg-amber-955/50 text-amber-700 dark:text-amber-300"
                        }`}>
                          {item.importance} Importance
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-red-100/60 dark:bg-[#341A1A] text-red-700 dark:text-red-400 text-[10px] font-black border border-red-200/30 animate-pulse">
                          Weak ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 italic leading-relaxed font-semibold">
                      💡 {item.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab("topics")}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center cursor-pointer hover:underline"
            >
              <span>View All Syllabus Topics Mastery</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* IMPROVED TOPICS COMPONENT */}
        <div className="p-5 bg-white/70 dark:bg-[#151312]/80 backdrop-blur-md rounded-2xl border border-stone-200/50 dark:border-stone-850/80 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-[#FAF7F0] flex items-center">
                <Sparkles className="h-5 w-5 text-indigo-550 mr-2 shrink-0 animate-bounce" />
                <span>My Proven Improvements</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-bold">Chapters and topics which have improved compared to older test results.</p>
            </div>

            {improvements.length === 0 ? (
              <div className="py-12 text-center bg-stone-50/10 dark:bg-[#1C1A19]/50 border border-stone-200/50 dark:border-stone-850 rounded-xl space-y-2 animate-pulse">
                <Frown className="h-8 w-8 text-stone-400 dark:text-stone-600 mx-auto" />
                <p className="text-sm font-black text-stone-700 dark:text-stone-300">No improvements logged yet.</p>
                <p className="text-xs text-stone-500 dark:text-stone-450 font-semibold max-w-xs mx-auto">Analyze multiple tests over time to track and compare improvements in your weak disciplines!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {improvements.map((imp) => (
                  <div key={imp.topic} className="p-3 bg-emerald-50/15 dark:bg-[#1C1A19]/85 border border-emerald-250/20 dark:border-[#203c20]/30 rounded-xl flex items-center justify-between gap-1 font-semibold text-stone-700 dark:text-stone-300">
                    <div>
                      <span className="font-extrabold text-[#111827] dark:text-[#FAF7F0] text-sm block truncate max-w-[200px]">{imp.topic}</span>
                      <span className="text-[10px] text-stone-450 dark:text-stone-500 block mt-0.5 font-bold">Identified & improved through training</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs shrink-0 font-bold">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 block">Previously</span>
                        <span className="font-black text-rose-605 dark:text-rose-400">{imp.before.percentage}% ({imp.before.evaluation})</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 block">Current</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end">
                          {imp.after.percentage}% ({imp.after.evaluation})
                          <ArrowUpRight className="h-3 w-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab("history")}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center cursor-pointer hover:underline"
            >
              <span>Explore Complete Test History Logs</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
