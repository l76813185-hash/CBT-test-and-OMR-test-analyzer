/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuestionAnalysis {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isUnattempted?: boolean;
  explanation: string;
  topic: string;
  chapter?: string;
  importance: "High" | "Medium" | "Low";
}

export interface TopicPerformance {
  topic: string;
  chapter?: string;
  correct: number;
  total: number;
  percentage: number;
  evaluation: "Strong" | "Moderate" | "Weak"; // Strong >= 80%, Moderate 50-79%, Weak < 50%
  recommendation: string;
  importance: "High" | "Medium" | "Low";
}

export interface TestResult {
  id: string;
  title: string;
  date: string; // ISO string
  score: number; // Correct answers
  totalQuestions: number;
  percentage: number;
  questions: QuestionAnalysis[];
  topics: TopicPerformance[];
  overallFeedback: string;
}

export interface ImprovementMetric {
  topic: string;
  pastScore: number;
  currentScore: number;
  pastEvaluation: "Strong" | "Moderate" | "Weak";
  currentEvaluation: "Strong" | "Moderate" | "Weak";
  status: "improved" | "declined" | "stable";
}

export interface DashboardStats {
  averageScore: number;
  totalTests: number;
  strongTopicsCount: number;
  weakTopicsCount: number;
  recentImprovements: ImprovementMetric[];
  topicWiseTrend: {
    topic: string;
    scores: { date: string; percentage: number }[];
  }[];
}
