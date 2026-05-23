/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuestionAnalysis } from "./types";

export interface MarkingStats {
  correct: number;
  wrong: number;
  unattempted: number;
  marks: number;
  maxPossibleMarks: number;
  positiveMarks: number;
  negativeMarks: number;
}

export function isQuestionUnattempted(q: QuestionAnalysis): boolean {
  if (!q) return false;
  const answer = (q.userAnswer || "").trim();
  return q.isUnattempted === true || 
    !answer || 
    /^(unanswered|unattempted|n\/a|not answered|not attempted|-|none|empty)$/i.test(answer);
}

export function getSubjectFromTopic(topic: string): "Physics" | "Chemistry" | "Mathematics" | "Biology" | "General" {
  if (!topic) return "General";
  const norm = topic.trim().toLowerCase();
  const parts = topic.split("-").map(p => p.trim().toLowerCase());
  const firstPart = parts[0] || "";
  
  if (firstPart.includes("physics") || norm.includes("physics")) return "Physics";
  if (firstPart.includes("chemistry") || norm.includes("chemistry")) return "Chemistry";
  if (firstPart.includes("math") || norm.includes("math") || norm.includes("algebra") || norm.includes("calculus") || norm.includes("geometry")) return "Mathematics";
  if (firstPart.includes("biology") || norm.includes("biology") || norm.includes("botany") || norm.includes("zoology") || norm.includes("photosynthesis") || norm.includes("mitosis") || norm.includes("cell")) return "Biology";
  
  // High-performance academic keywords mapping fallback dictionary:
  const physicsKeywords = [
    "mechanics", "kinematics", "force", "gravity", "motion", "thermodynamics", "optics",
    "electrostatics", "induction", "magnetic", "current", "circuit", "capacitor",
    "resistance", "relativity", "quantum", "wave", "fluid", "acceleration", "projectile",
    "momentum", "friction", "kinetic", "nuclear", "rotation", "gravitation", "oscillation",
    "semiconductor"
  ];
  
  const chemistryKeywords = [
    "organic", "inorganic", "reagent", "reaction", "bond", "acid", "base", "salt", "ph",
    "molecule", "atom", "element", "catalyst", "enthalpy", "entropy", "amine", "alcohol",
    "aldehyde", "ketone", "hydrocarbon", "periodic", "kinetics", "compounds", "solution",
    "polymer", "stoichiometry", "thermochemistry"
  ];
  
  const mathKeywords = [
    "calculus", "algebra", "geometry", "trigonometry", "matrix", "matrices", "determinant",
    "integration", "derivative", "probability", "statistics", "binomial", "series", "sequence",
    "ellipse", "parabola", "hyperbola", "coordinate", "logarithm", "differential"
  ];
  
  const biologyKeywords = [
    "botany", "zoology", "anatomy", "physiology", "genetics", "evolution", "ecology",
    "cell", "tissue", "photosynthesis", "mitosis", "meiosis", "chromosome", "hormone",
    "enzyme", "dna", "rna", "digestive", "nervous", "circulatory", "immune", "ecosystem"
  ];
  
  if (physicsKeywords.some(kw => norm.includes(kw))) return "Physics";
  if (chemistryKeywords.some(kw => norm.includes(kw))) return "Chemistry";
  if (mathKeywords.some(kw => norm.includes(kw))) return "Mathematics";
  if (biologyKeywords.some(kw => norm.includes(kw))) return "Biology";
  
  return "General";
}

export function expandGranularTopic(topic: string): string {
  if (!topic) return "General - Concept Analysis - Basic Theory";
  let clean = topic.trim().replace(/\s*-\s*/g, " - ");
  const parts = clean.split(" - ").map(p => p.trim());
  
  // If we already have 3 or more levels, return it
  if (parts.length >= 3) {
    return clean;
  }
  
  const subject = getSubjectFromTopic(topic);
  const norm = topic.toLowerCase();
  
  if (parts.length === 1) {
    if (subject === "Physics") {
      if (norm.includes("mechanic") || norm.includes("force") || norm.includes("laws")) {
        return "Physics - Mechanics - Newton's Laws of Motion";
      }
      if (norm.includes("kinematic") || norm.includes("speed") || norm.includes("velocity")) {
        return "Physics - Mechanics - Kinematics";
      }
      if (norm.includes("electro") || norm.includes("current") || norm.includes("charge")) {
        return "Physics - Electrodynamics - Electric Current";
      }
      if (norm.includes("optic") || norm.includes("lens") || norm.includes("light")) {
        return "Physics - Optics - Wave Theory & Ray Optics";
      }
      return `Physics - Core Area - ${parts[0]}`;
    }
    if (subject === "Chemistry") {
      if (norm.includes("organic") || norm.includes("carbon") || norm.includes("amine")) {
        return "Chemistry - Organic Chemistry - Functional Groups";
      }
      if (norm.includes("inorganic") || norm.includes("periodic") || norm.includes("element")) {
        return "Chemistry - Inorganic Chemistry - Periodic Trends";
      }
      if (norm.includes("physical") || norm.includes("equilibrium") || norm.includes("thermo")) {
        return "Chemistry - Physical Chemistry - Thermodynamics";
      }
      return `Chemistry - Core Area - ${parts[0]}`;
    }
    if (subject === "Mathematics") {
      if (norm.includes("calculus") || norm.includes("deriv") || norm.includes("integ")) {
        return "Mathematics - Calculus - Integration & Derivatives";
      }
      if (norm.includes("algebra") || norm.includes("matrix") || norm.includes("matrices")) {
        return "Mathematics - Algebra - Linear Matrices";
      }
      if (norm.includes("geometry") || norm.includes("line") || norm.includes("circle")) {
        return "Mathematics - Coordinate Geometry - Conic Sections";
      }
      return `Mathematics - Core Area - ${parts[0]}`;
    }
    if (subject === "Biology") {
      if (norm.includes("cell") || norm.includes("cytology") || norm.includes("mitosis")) {
        return "Biology - Cell Biology - Cell Division";
      }
      if (norm.includes("plant") || norm.includes("photosynthe") || norm.includes("botany")) {
        return "Biology - Plant Physiology - Photosynthesis";
      }
      if (norm.includes("human") || norm.includes("anatom") || norm.includes("heart")) {
        return "Biology - Human Physiology - Organ Systems";
      }
      return `Biology - Core Area - ${parts[0]}`;
    }
    return `General - Academic Core - ${parts[0]}`;
  }
  
  if (parts.length === 2) {
    const subtheme = parts[1];
    if (parts[0] === "Physics" || parts[0] === "Chemistry" || parts[0] === "Mathematics" || parts[0] === "Biology") {
      if (norm.includes("mechanic") || norm.includes("motion")) return `${parts[0]} - ${subtheme} - Dynamics & Kinematics`;
      if (norm.includes("electro") || norm.includes("charge")) return `${parts[0]} - ${subtheme} - Field & Current`;
      if (norm.includes("organic")) return `${parts[0]} - ${subtheme} - Structural Hydrocarbons`;
      if (norm.includes("inorganic")) return `${parts[0]} - ${subtheme} - Chemical Bonding`;
      if (norm.includes("calculus")) return `${parts[0]} - ${subtheme} - Limits & Continuity`;
      if (norm.includes("algebra")) return `${parts[0]} - ${subtheme} - Matrices & Equations`;
      if (norm.includes("physio")) return `${parts[0]} - ${subtheme} - Transport System`;
      if (norm.includes("genet")) return `${parts[0]} - ${subtheme} - Molecular Inheritances`;
      
      return `${parts[0]} - ${subtheme} - Concept Focus`;
    } else {
      return `${subject} - ${parts[0]} - ${parts[1]}`;
    }
  }
  
  return clean;
}

export interface SubjectStats {
  subject: "Physics" | "Chemistry" | "Mathematics" | "Biology" | "General";
  correct: number;
  wrong: number;
  unattempted: number;
  total: number;
  marks: number;
  maxMarks: number;
  percentage: number;
  positiveMarks: number;
  negativeMarks: number;
}

export function calculateSubjectWiseStats(questions: QuestionAnalysis[]): Record<string, SubjectStats> {
  const stats: Record<string, SubjectStats> = {
    Physics: { subject: "Physics", correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0, maxMarks: 0, percentage: 0, positiveMarks: 0, negativeMarks: 0 },
    Chemistry: { subject: "Chemistry", correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0, maxMarks: 0, percentage: 0, positiveMarks: 0, negativeMarks: 0 },
    Mathematics: { subject: "Mathematics", correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0, maxMarks: 0, percentage: 0, positiveMarks: 0, negativeMarks: 0 },
    Biology: { subject: "Biology", correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0, maxMarks: 0, percentage: 0, positiveMarks: 0, negativeMarks: 0 },
    General: { subject: "General", correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0, maxMarks: 0, percentage: 0, positiveMarks: 0, negativeMarks: 0 }
  };
  
  if (questions && Array.isArray(questions)) {
    questions.forEach((q) => {
      const sub = getSubjectFromTopic(q.topic);
      const s = stats[sub] || stats.General;
      
      s.total++;
      if (q.isCorrect) {
        s.correct++;
      } else {
        if (isQuestionUnattempted(q)) {
          s.unattempted++;
        } else {
          s.wrong++;
        }
      }
    });

    Object.keys(stats).forEach((key) => {
      const s = stats[key];
      if (s.total > 0) {
        s.positiveMarks = s.correct * 4;
        s.negativeMarks = s.wrong * -1;
        s.marks = s.positiveMarks + s.negativeMarks;
        s.maxMarks = s.total * 4;
        s.percentage = Number(((s.correct / s.total) * 100).toFixed(1));
      }
    });
  }

  return stats;
}

export function calculateMarkingStats(questions: QuestionAnalysis[]): MarkingStats {
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;

  if (!questions || !Array.isArray(questions)) {
    return { correct: 0, wrong: 0, unattempted: 0, marks: 0, maxPossibleMarks: 0, positiveMarks: 0, negativeMarks: 0 };
  }

  questions.forEach((q) => {
    if (q.isCorrect) {
      correct++;
    } else {
      if (isQuestionUnattempted(q)) {
        unattempted++;
      } else {
        wrong++;
      }
    }
  });

  const positiveMarks = correct * 4;
  const negativeMarks = wrong * -1;
  const marks = positiveMarks + negativeMarks;
  const maxPossibleMarks = questions.length * 4;

  return {
    correct,
    wrong,
    unattempted,
    marks,
    maxPossibleMarks,
    positiveMarks,
    negativeMarks,
  };
}
