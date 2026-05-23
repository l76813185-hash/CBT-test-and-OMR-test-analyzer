/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Award, BookOpen, Layers, Sparkles, AlertCircle, HelpCircle, Flame, CheckCircle2 
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend 
} from "recharts";
import { TestResult, QuestionAnalysis } from "../types";

interface RepeatedTopicsProps {
  results: TestResult[];
}

// Subject classifier helper based on keywords
function getSubjectForTopic(topic: string, chapter?: string): "Physics" | "Chemistry" | "Biology" | "Mathematics" | "General / Other" {
  const cleanText = `${topic} ${chapter || ""}`.toLowerCase();
  
  const physicsKeywords = [
    "kinematics", "mechanics", "gravity", "gravitation", "thermodynamics", "oscillation", "wave", "electrostatics", "magnetism", 
    "electromagnetic", "electro", "optics", "atom", "nucleus", "semiconductor", "ray", "motion", "force", "friction", 
    "rotation", "work", "energy", "power", "sound", "fluid", "heat", "radiation", "electricity", "circuit", "capacitor", 
    "induction", "light", "photo", "laser", "physics", "vector", "dimensional", "torque", "projectile"
  ];
  
  const chemistryKeywords = [
    "bonding", "structure", "mole", "periodic", "s-block", "p-block", "d-block", "f-block", "coordination", "metallurgy", 
    "equilibrium", "redox", "electrochemistry", "kinetics", "surface", "polymer", "biomolecule", "organic", "haloalkane", 
    "alcohol", "phenol", "ether", "aldehyde", "ketone", "acid", "amine", "nitrogen", "gas", "liquid", "solution", "solute", 
    "alloy", "salt", "reaction", "carbon", "compound", "chemistry", "periodic table", "atomic structure", "thermo chemistry", 
    "chemical", "mole concept", "gaseous", "solid state", "co-ordination"
  ];
  
  const biologyKeywords = [
    "photosynthesis", "cell", "plant", "animal", "human", "brain", "heart", "blood", "respiration", "digestion", "excretion", 
    "reproduction", "gene", "genetic", "evolution", "ecology", "environment", "tissue", "hormone", "enzyme", "disease", 
    "immune", "bone", "muscle", "biology", "botany", "zoology", "anatomy", "physiology", "kingdom", "bio", "organism", "genetics"
  ];
  
  const mathKeywords = [
    "quadratic", "equation", "matrix", "determinant", "relation", "function", "trigonometry", "calculus", "limit", "derivative", 
    "integral", "differential", "coordinate", "geometry", "straight line", "circle", "parabola", "hyperbola", "ellipse", 
    "probability", "statistics", "permutation", "combination", "induction", "series", "sequence", "progression", 
    "algebra", "complex number", "binomial", "theorem", "mathematics", "maths", "math", "sets", "vectors", "3d"
  ];

  if (physicsKeywords.some(k => cleanText.includes(k))) return "Physics";
  if (chemistryKeywords.some(k => cleanText.includes(k))) return "Chemistry";
  if (biologyKeywords.some(k => cleanText.includes(k))) return "Biology";
  if (mathKeywords.some(k => cleanText.includes(k))) return "Mathematics";
  
  return "General / Other";
}

interface TopicAggregate {
  topic: string;
  count: number;
  correctCount: number;
  subject: "Physics" | "Chemistry" | "Biology" | "Mathematics" | "General / Other";
  importance: "High" | "Medium" | "Low";
  occurrences: { testName: string; count: number; correct: number }[];
}

export default function RepeatedTopics({ results }: RepeatedTopicsProps) {
  const [selectedTestId, setSelectedTestId] = useState<string>("overall");

  if (results.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-xs max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No data available yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Analyze exam sheets first under this workspace to populate repeated and important topic statistics.
          </p>
        </div>
      </div>
    );
  }

  // Gather active subset of questions
  const activeQuestions: QuestionAnalysis[] = [];
  const activeSourceTests: TestResult[] = [];

  if (selectedTestId === "overall") {
    results.forEach((r) => {
      activeQuestions.push(...r.questions);
      activeSourceTests.push(r);
    });
  } else {
    const singleTest = results.find((r) => r.id === selectedTestId);
    if (singleTest) {
      activeQuestions.push(...singleTest.questions);
      activeSourceTests.push(singleTest);
    }
  }

  // Extract aggregates
  const topicStatsMap = new Map<string, TopicAggregate>();

  activeQuestions.forEach((q) => {
    const existing = topicStatsMap.get(q.topic);
    const questionSubject = getSubjectForTopic(q.topic, q.chapter);
    
    // Find what parent test this question matches
    const testResult = results.find(r => r.questions.some(qn => qn.questionNumber === q.questionNumber && qn.topic === q.topic));
    const testName = testResult ? testResult.title : "Mock Exam";

    if (existing) {
      existing.count += 1;
      if (q.isCorrect) existing.correctCount += 1;
      
      // Update occurrence
      const occIndex = existing.occurrences.findIndex(o => o.testName === testName);
      if (occIndex > -1) {
        existing.occurrences[occIndex].count += 1;
        if (q.isCorrect) existing.occurrences[occIndex].correct += 1;
      } else {
        existing.occurrences.push({
          testName,
          count: 1,
          correct: q.isCorrect ? 1 : 0
        });
      }
    } else {
      topicStatsMap.set(q.topic, {
        topic: q.topic,
        count: 1,
        correctCount: q.isCorrect ? 1 : 0,
        subject: questionSubject,
        importance: q.importance || "Medium",
        occurrences: [{
          testName,
          count: 1,
          correct: q.isCorrect ? 1 : 0
        }]
      });
    }
  });

  const aggregatesList = Array.from(topicStatsMap.values()).sort((a, b) => b.count - a.count);

  // Group by subjects
  const groupedSubjects: Record<string, TopicAggregate[]> = {
    "Physics": [],
    "Chemistry": [],
    "Biology": [],
    "Mathematics": [],
    "General / Other": []
  };

  aggregatesList.forEach((agg) => {
    groupedSubjects[agg.subject].push(agg);
  });

  // Calculate Chart data (TOP 8 high weightage topics)
  const chartData = aggregatesList.slice(0, 8).map((agg) => ({
    name: agg.topic,
    value: agg.count,
    accuracy: Math.round((agg.correctCount / agg.count) * 100),
  }));

  // Standard material colors matching the elegant styling
  const COLORS = [
    "#4F46E5", // Elegant Indigo
    "#06B6D4", // Clear Cyan
    "#10B981", // Emerald Green
    "#F59E0B", // Amber Gold
    "#EF4444", // Coral Rose
    "#8B5CF6", // Royal Purple
    "#EC4899", // Vivid Pink
    "#64748B"  // Warm Slate
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* DESCRIPTION TITLE SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Flame className="h-5.5 w-5.5 text-indigo-650" />
            <span>Repeated & Highly Weighted Topics</span>
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Identify which topics appear most recurrently in your test history and target high weightage areas.
          </p>
        </div>

        {/* OVERALL STATISTICS SUMMARY INTRO */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2 text-right">
          <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wider">Analysis Scale</span>
          <span className="text-base font-extrabold text-indigo-900 block leading-tight">
            {selectedTestId === "overall" ? "Cumulative (All Tests)" : "Selected Test Specific"}
          </span>
        </div>
      </div>

      {/* INTERACTIVE CONTROLLERS - TEST CHOOSE BUTTONS */}
      <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs space-y-3">
        <span className="text-xs font-bold text-gray-500 block uppercase tracking-wide">
          Select Exam History Boundary Option:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTestId("overall")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedTestId === "overall"
                ? "bg-indigo-600 text-white shadow-md scale-95"
                : "bg-gray-100 hover:bg-gray-150 text-gray-700"
            }`}
          >
            📊 Overall Cumulative
          </button>
          {results.map((res, idx) => (
            <button
              key={res.id}
              onClick={() => setSelectedTestId(res.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer truncate max-w-[180px] ${
                selectedTestId === res.id
                  ? "bg-indigo-600 text-white shadow-md scale-95"
                  : "bg-gray-100 hover:bg-gray-150 text-gray-700"
              }`}
            >
              📝 Test #{results.length - idx}: {res.title}
            </button>
          ))}
        </div>
      </div>

      {/* MAINFRAME GRID FOR GRAPH & TEXTUAL ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SUBJECTS BREAKDOWN (SPANS 7 COLS) */}
        <div className="lg:col-span-7 bg-white p-5 border border-gray-100 rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-base flex items-center space-x-2">
              <Layers className="h-4.5 w-4.5 text-gray-400" />
              <span>Subject-Wise Core Frequency Directory</span>
            </h3>
            <span className="text-xs text-indigo-650 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full">
              {aggregatesList.length} Unique Topics Grouped
            </span>
          </div>

          <div className="space-y-6 max-h-[580px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(groupedSubjects).map(([subj, topics]) => {
              if (topics.length === 0) return null;
              
              const totalQCount = topics.reduce((s, t) => s + t.count, 0);

              return (
                <div key={subj} className="space-y-3 p-4 bg-gray-55/20 border border-gray-150/40 rounded-xl">
                  {/* Subject Title Header */}
                  <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                    <span className="font-extrabold text-sm text-gray-900 border-l-3 border-indigo-500 pl-2">
                      {subj}
                    </span>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-extrabold">
                      {totalQCount} Total Questions
                    </span>
                  </div>

                  {/* Bulleted list of topics under this subject */}
                  <ul className="list-none space-y-4">
                    {topics.map((t) => (
                      <li key={t.topic} className="flex flex-col space-y-1.5 p-3.5 bg-white border border-gray-100 rounded-lg shadow-2xs">
                        {/* Topic Header with Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-gray-950 text-sm leading-snug">
                            {t.topic}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold shrink-0 uppercase tracking-widest ${
                            t.importance === "High" 
                              ? "bg-rose-50 text-rose-700 border border-rose-150" 
                              : t.importance === "Medium"
                                ? "bg-amber-50 text-amber-700 border border-amber-150"
                                : "bg-gray-50 text-gray-500"
                          }`}>
                            {t.importance} Weightage
                          </span>
                        </div>

                        {/* Bullets mapping dynamic statistics under each topic */}
                        <ul className="list-disc list-inside space-y-1 text-xs text-gray-650 pl-0.5">
                          <li>
                            Question volume detected: <strong className="text-gray-900 font-bold">{t.count}</strong> {t.count === 1 ? "question" : "questions"} (of which <strong className="text-emerald-700 font-bold">{t.correctCount}</strong> correctly solved)
                          </li>
                          <li>
                            Your accuracy rating: <strong className={`font-bold ${
                              (t.correctCount / t.count) >= 0.8 ? "text-emerald-600" : (t.correctCount / t.count) >= 0.5 ? "text-amber-550" : "text-rose-600"
                            }`}>{Math.round((t.correctCount / t.count) * 100)}% accuracy</strong>
                          </li>
                          
                          {selectedTestId === "overall" && (
                            <li>
                              Test distribution listing:{" "}
                              <div className="inline-flex flex-wrap gap-1 mt-1 pl-4 w-full">
                                {t.occurrences.map((o, idx) => (
                                  <span key={idx} className="bg-indigo-55/10 border border-indigo-100/50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-805 rounded-md inline-block">
                                    {o.testName} ({o.count} qty • {Math.round((o.correct / o.count) * 100)}% acc)
                                  </span>
                                ))}
                              </div>
                            </li>
                          )}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: RECHARTS PIE CHART WEIGHTAGE (SPANS 5 COLS) */}
        <div className="lg:col-span-5 bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex flex-col justify-between space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center space-x-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-650" />
              <span>Topic Weightage Distribution</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Visual share of total questions matching top categories in current parameters
            </p>
          </div>

          {/* Core Recharts component wrapper */}
          {chartData.length > 0 ? (
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div className="h-64 sm:h-72 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-lg text-xs space-y-1">
                              <p className="font-bold text-gray-900">{data.name}</p>
                              <p className="text-indigo-600 font-semibold">{data.value} items ({Math.round(data.value / activeQuestions.length * 100)}% of segment)</p>
                              <p className="text-emerald-600 font-semibold">Your accuracy: {data.accuracy}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text indicating total volume */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-900 leading-none">{activeQuestions.length}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Q&apos;s Analyzed</span>
                </div>
              </div>

              {/* Custon Legends Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                {chartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-start space-x-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-md mt-0.5 shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <div className="truncate">
                      <span className="font-bold text-gray-900 block truncate leading-tight">{entry.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {entry.value} Q ({Math.round((entry.value / activeQuestions.length) * 100)}% share • Accuracy: {entry.accuracy}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-gray-400 italic text-xs">
              <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
              There are no topics cataloged yet.
            </div>
          )}

          {/* Quick Study Advice Block */}
          <div className="p-3 bg-amber-50/50 border border-amber-100/50 rounded-xl flex items-start space-x-2.5 text-xs text-amber-805">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 block">High Yield Priority Recommendations</span>
              <p className="leading-relaxed">
                Revise high weightage items matching <span className="font-semibold text-rose-700">High Weightage</span> status first. Focus on topics showing accuracy less than 60% for optimal performance recovery.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
