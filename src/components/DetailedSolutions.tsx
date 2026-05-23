import React, { useState, useMemo, useEffect } from "react";
import { 
  BookOpen, CheckCircle2, XCircle, HelpCircle, Search, 
  ArrowRight, FileText, ChevronRight, Filter, Compass, AlertCircle, Info, Globe,
  Sparkles, ChevronLeft, LayoutList, Target, Lightbulb, Bookmark
} from "lucide-react";
import { TestResult, QuestionAnalysis } from "../types";
import { isQuestionUnattempted, getSubjectFromTopic, calculateSubjectWiseStats } from "../utils";
import AITutorPanel from "./AITutorPanel";
import MathMarkdown from "./MathMarkdown";

// Descriptions and educational scope for discrete competitive syllabus subtopics
const getSubtopicExplainer = (name: string): string => {
  const norm = name.trim().toLowerCase();
  
  if (norm === "physics") return "Fundamental forces, motion, thermodynamics, waves, electromagnetic behaviors, and subatomic dynamics.";
  if (norm === "chemistry") return "Chemical compounds, bonding properties, states of matter, organic mechanism transformations, and stoichiometric equations.";
  if (norm === "mathematics" || norm === "math") return "Algebraic functions, advanced calculus, coordinate geometry paths, matrix models, and probability systems.";
  if (norm === "biology") return "Cellular structures, physiological cycles, DNA Replication models, genetics, and evolutionary taxonomy.";

  if (norm.includes("quadratic")) return "Analyzing ax² + bx + c = 0. Focus on the discriminant (b² - 4ac) defining real, equal, or imaginary roots with parabolas.";
  if (norm.includes("matrices") || norm.includes("matrix")) return "Rigid system grids representing linear mappings. Focus on matrix multiplications, dimensions, or row reduction methods.";
  if (norm.includes("determinant")) return "Scalar factor of linear transformations. Determines system solvability via Cramer's Rule; zero determinant means singular/non-invertible.";
  if (norm.includes("calculus")) return "Rates of change (differentiation) and accumulation of areas (integration). Grounded in the Fundamental Theorem of Calculus.";
  if (norm.includes("derivative") || norm.includes("differentiation")) return "Instantaneous rate of change of a function, representing the exact curve tangent slope at point x.";
  if (norm.includes("integral") || norm.includes("integration")) return "Cumulative area under a function curve between limits, solved as the inverse of derivatives.";
  if (norm.includes("probability")) return "Likelihood calculation of events ranging from 0 to 1, utilizing combination/permutation partitions and independent trials.";

  if (norm.includes("kinematics")) return "Description of object mechanics: displacement (s), velocities (u, v), acceleration (a), and duration (t) without consideration of forces.";
  if (norm.includes("projectile")) return "Study of objects moving in a 2D parabolic arc solely accelerated downwards by acceleration due to gravity (g ~ 9.8m/s²).";
  if (norm.includes("newton") || norm.includes("force")) return "Study of inertia (1st Law), force equals rate of change of momentum (2nd Law: F=ma), and action-reaction pairings (3rd Law).";
  if (norm.includes("optical") || norm.includes("optics") || norm.includes("light")) return "Study of electromagnetic wave behaviors: reflection curves, refraction bends (Snell's refractive index law), or thin lens formulas.";

  if (norm.includes("amines")) return "Nitrogenous organic compounds derived from ammonia. Key traits: structural hydrogen bonding, basic strength hierarchies, and synthesis paths.";
  if (norm.includes("organic")) return "Study of carbon compounds, naming conventions, stereochemistry isomers, electrophilic/nucleophilic reaction pathways.";
  if (norm.includes("acid") || norm.includes("base") || norm.includes("ph")) return "Proton donor vs acceptor indicators. Calculation of pH (-log[H+]), buffer resistance, and neutralization titration curves.";

  if (norm.includes("photosynthesis")) return "Dual-stage cellular energy synthesis converting CO₂, H₂O, and light photons into high-energy glucose and crucial oxygen gas.";
  if (norm.includes("mitosis") || norm.includes("cell")) return "Divided cellular lifecycle mechanics (prophase, metaphase, anaphase, telophase) yielding matching diploid nuclei.";

  return `Core subconcept and exam weight topic representing specific competencies required within the standard competitive curricula.`;
};

// Related syllabus concepts database mapper
const getRelatedConcepts = (topic: string): string[] => {
  if (!topic) return ["Syllabus Core", "Conceptual Prep"];
  const t = topic.toLowerCase();
  if (t.includes("photosynthesis")) return ["Calvin Cycle", "Light Reactions", "Chlorophyll", "ATP Synthesis"];
  if (t.includes("quadratic")) return ["Discriminant", "Parabola", "Roots of Equation", "Factoring"];
  if (t.includes("matrix") || t.includes("matrices")) return ["Determinant", "Eigenvalues", "Cramer's Rule", "Inverse Matrix"];
  if (t.includes("kinematics") || t.includes("motion")) return ["Velocity-Time Graph", "Acceleration", "Trajectory Plane", "Vector Components"];
  if (t.includes("organic") || t.includes("amines") || t.includes("chemistry")) return ["Reaction Mechanisms", "Hydrogen Bonding", "Alkyl Groups", "Synthesis Path"];
  if (t.includes("force") || t.includes("newton")) return ["Inertia", "Friction Coefficient", "Vector Resolution", "Free Body Diagram"];
  if (t.includes("limit") || t.includes("calculus") || t.includes("integral")) return ["Derivative", "Riemann Sum", "Continuity", "Fundamental Theorem"];
  if (t.includes("cell") || t.includes("mitosis") || t.includes("biology")) return ["Prophase", "Anaphase", "Chromatids", "Spindle Fibers", "Cytokinesis"];
  if (t.includes("acid") || t.includes("base") || t.includes("ph")) return ["pH Calculation", "Henderson-Hasselbalch", "Buffer Solutions", "Titration Curve"];
  if (t.includes("optic") || t.includes("light") || t.includes("wave")) return ["Refractive Index", "Snell's Law", "Focal Length", "Diffraction", "Interference"];
  if (t.includes("probab") || t.includes("stats")) return ["Conditional Probability", "Bayes Theorem", "Combinations", "Standard Deviation"];
  if (t.includes("electr") || t.includes("circui") || t.includes("physics")) return ["Ohm's Law", "Kirchhoff's Rules", "Capacitor Reactance", "Impedance"];
  return ["Syllabus Integration", "Diagnostic Review", "Test Blueprint", "Conceptual Framework"];
};

// Explanations/Definitions database for general related concepts to support dynamic interactive exploration
const getRelatedConceptExplainer = (name: string): string => {
  const norm = name.trim().toLowerCase();
  
  if (norm === "calvin cycle") return "The Calvin Cycle (C3 pathway) takes place in the chloroplast stroma. It fixes atmospheric CO2 into G3P (sugars) using the ATP and NADPH generated during light reactions. Key enzyme: RuBisCO.";
  if (norm === "light reactions") return "Photochemical phase occurring in thylakoid membranes. Absorbs light to drive electron transport, splitting water (photolysis) to emit O2 and yield chemical energy carriers (ATP and NADPH).";
  if (norm === "chlorophyll") return "Primary photosynthetic green pigments situated in light-harvesting complexes. They maximize photon capture at red and blue light wavelengths while rejecting green wavelengths.";
  if (norm === "atp synthesis") return "Generated via chemiosmosis. Protons (H+) accumulate inside the thylakoid or mitochondrial lumen, forming an electrochemical gradient that drives the ATP Synthase rotor to phosphorylate ADP.";
  
  if (norm === "discriminant") return "The expression D = b² - 4ac. Determines quadratic root behavior (D > 0: two real & distinct roots; D = 0: two equal real roots; D < 0: non-real conjugate complex roots).";
  if (norm === "parabola") return "The graph of any quadratic polynomial y = ax² + bx + c. The vertex defines maximum or minimum point coordinates, with symmetric focus and directrix boundaries.";
  if (norm === "roots of equation") return "Values of x where the total polynomial equals zero; graphically representing intersections where the path crosses the horizontal x-axis.";
  if (norm === "factoring") return "Expressing a polynomial formula as a product of low-degree linear factors. Greatly simplifies root inspection and equation simplification.";
  
  if (norm === "determinant") return "A scalar property of square matrices. A non-zero determinant means the matrix mapping is non-singular and has a unique inverse; a zero determinant indicates no unique inverse.";
  if (norm === "eigenvalues") return "Scalars λ representing factor scales by which an eigenvector is stretched/compressed during structural matrix transformation: Ax = λx.";
  if (norm === "cramer's rule") return "An explicit formula solving linear systems of equations using ratios of determinants, provided the coefficient determinant is non-zero.";
  if (norm === "inverse matrix") return "A matrix A⁻¹ such that A * A⁻¹ = I (Identity grid). Exists only if det(A) ≠ 0. Solves vector linear transformations directly.";
  
  if (norm === "velocity-time graph") return "A visual plot of speed versus elapsed time. The instantaneous derivative slope equals acceleration, while the mathematical Riemann integration area bounded under the curve represents net displacement.";
  if (norm === "acceleration") return "Rate of change of velocity (a = dv/dt). Uniform acceleration translates into kinematics equations like v = u + at, s = ut + 0.5at², and v² = u² + 2as.";
  if (norm === "trajectory plane") return "The coordinate canvas charting the continuous flight curve. High utility in projectile calculations tracking independent gravity accelerations and uniform horizontal speeds.";
  if (norm === "vector components") return "Projections of a vector along orthogonal coordinate axes (e.g., Fx = F·cosθ, Fy = F·sinθ). Simplifies complex multi-directional vectors into 1D calculations.";
  
  if (norm === "reaction mechanisms") return "Step-by-step molecular elementary transitions showing how reagents convert to products; including intermediate states, organic carbocations, and arrow-pushes.";
  if (norm === "hydrogen bonding") return "Strong intermolecular electrostatic attraction when hydrogen binds directly with highly electronegative atoms (Fluourine, Oxygen, Nitrogen), elevating boiling points.";
  if (norm === "alkyl groups") return "Saturated hydrocarbon branches (e.g., methyl -CH3, ethyl -C2H5) supporting electrophilic aromatic substitutions via positive inductive (+I) electron donation effects.";
  if (norm === "synthesis path") return "A mapped order of step-wise reactions aimed at constructing complex synthetic product molecules cleanly from simple reactant precursors.";
  
  if (norm === "inertia") return "The inert property of physical matter that resists change in rest density or velocity state; directly proportional to the total mass of the body (Newton's 1st Law).";
  if (norm === "friction coefficient") return "The scalar coefficient (μ) representing sliding resistance of two surfaces under loaded friction forces (Ff = μ * Fn). Decelerates kinematic components.";
  if (norm === "vector resolution") return "Decomposing vectors into orthogonal vector components to solve static or dynamic force equilibria using free body diagrams.";
  if (norm === "free body diagram") return "A functional physics design isolating a given mass body to chart every single external force vector acted on it, proving acceleration vectors.";
  
  if (norm === "derivative") return "The mathematical limit measuring rate of change. Calculates exact tangents to curves at localized points, helping find local maxima/minima in competitive equations.";
  if (norm === "riemann sum") return "Approximating definite integrals by taking the summation of multiple tiny thin slice rectangle areas across coordinate limits.";
  if (norm === "continuity") return "Condition where limit f(x) as x approaches 'c' exists and matches the precise value f(c). Means the graph has no jumps, breaks, or singular holes.";
  if (norm === "fundamental theorem") return "The core theorem of calculus stating that integration and differentiation are inverse operations: ∫[a,b] f'(x) dx = f(b) - f(a).";
  
  if (norm === "prophase") return "The initial spindle stage of mitosis. Chromatin coils tightly into visible sister chromosomes, nuclear membrane decomposes, and centrioles migrate.";
  if (norm === "anaphase") return "The kinetic chromosome splitting stage where spindle fibers pull paired sister chromatids toward opposite cellular poles.";
  if (norm === "chromatids") return "One of the two identical replicated strands of DNA forming a chromosome, split at the centromere during mitosis.";
  if (norm === "spindle fibers") return "Microtubule structures nucleated from centrosomes during division to orchestrate equal chromosome distribution during metaphase and anaphase.";
  if (norm === "cytokinesis") return "The final physical step where the cellular cytoplasm physically pinches to divide parent cellular boundaries into two independent diploid cells.";
  
  if (norm === "ph calculation") return "Calculated as pH = -log[H3O+]. Describes proton concentration scaling quantitatively. A pH change of 1 means a 10x factor shift in hydronium density.";
  if (norm === "henderson-hasselbalch") return "An equation linking pH with weak acids/bases: pH = pKa + log([A-]/[HA]). Crucial for defining buffer efficiency thresholds.";
  if (norm === "buffer solutions") return "Mixtures of weak conjugate acids/bases that maintain consistent pH levels by neutralizing moderate added strong acids/bases.";
  if (norm === "titration curve") return "Graphical plot mapping pH progress versus added milliliter titrant. The equivalence point inflection defines precise stoichiometric neutralization.";
  
  if (norm === "refractive index") return "The speed factor ratio: n = c / v. Compares the velocity of light in vacuum against its slower speed inside a specific dielectric medium.";
  if (norm === "snell's law") return "The basic formula governening light wave path bending boundaries: n1 · sin(θ1) = n2 · sin(θ2). Defines light entry behaviors.";
  if (norm === "focal length") return "Distance from thin lens center to point focuses. Bound under the lens equation 1/f = 1/v - 1/u and magnification coefficients.";
  if (norm === "diffraction") return "Slight bending curvature of light propagation lines when brushing past sharp boundaries, or passing narrow openings of wavelength width.";
  if (norm === "interference") return "The wave overlay pattern where cohesive peaks/troughs match constructively (bright lines) or deductively (dark bands) in 2D space.";

  if (norm === "conditional probability") return "The likelihood of event A occurring given B has confirmed occurred: P(A|B) = P(A ∩ B) / P(B). Restricts the sample space.";
  if (norm === "bayes theorem") return "Mathematical inversion equation to resolve cause hypotheses: P(A|B) = [P(B|A) · P(A)] / P(B).";
  if (norm === "combinations") return "Choosing a set size 'r' out of pool size 'n' without caring about spatial arrangement sequences: n! / [r!(n - r)!].";
  if (norm === "standard deviation") return "A standard dispersion metric mapping variance scatter around mean results: σ = √[ ∑(xi - μ)² / N ].";

  if (norm === "ohm's law") return "States electrical current is directly proportional to applied potential voltage space: V = I · R.";
  if (norm === "kirchhoff's rules") return "Current Law (junction elements sum to zero) and Loop Law (potential shifts around closed paths equate to zero).";
  if (norm === "capacitor reactance") return "Alternate resistance mapping of capacitor charge storage to sinusoidal current: Xc = 1 / (2πfC).";
  if (norm === "impedance") return "Vector summation of pure ohmic resistances and dynamic reactances (Z = √[R² + (X_L - X_C)²]) in alternating circuits.";

  return `Supporting syllabus subunit for ${name}. Highlights important rules and theoretical tools needed for standard competitive performance levels.`;
};

// Highlights key academic terms inside solutions
function highlightKeywords(text: string, topic: string, importance: string): React.ReactNode {
  if (!text) return "";
  
  const terms = new Set<string>();
  if (topic) {
    topic.split(/[\s\-:\,\(\)\/]+/).forEach(word => {
      const cleanWord = word.trim().replace(/[.,;:!?()]$/, "");
      if (cleanWord.length > 2) {
        terms.add(cleanWord.toLowerCase());
      }
    });
  }
  
  if (importance) {
    terms.add(importance.toLowerCase());
  }
  
  const generalKeywords = [
    "formula", "equation", "theorem", "law", "rule", "factor", "coefficient", "constant", "variable",
    "correct", "incorrect", "wrong", "mistake", "error", "calculation", "derivation", "step", "remember",
    "gradient", "velocity", "proton", "electron", "neutron", "atom", "molecule", "reaction", "catalyst",
    "acid", "base", "ph", "mitosis", "meiosis", "chromosome", "cell", "organelle", "photosynthesis",
    "integral", "derivative", "matrix", "matrices", "determinant", "vector", "scalar", "acceleration",
    "important", "crucial", "critical", "concept", "principle", "solution", "solve", "working", "key"
  ];
  generalKeywords.forEach(kw => terms.add(kw));
  
  const validTerms = Array.from(terms)
    .filter(t => t.length > 2)
    .sort((a, b) => b.length - a.length);
    
  if (validTerms.length === 0) return text;
  
  try {
    const escapedTerms = validTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");
    const parts = text.split(pattern);
    
    return (
      <>
        {parts.map((part, index) => {
          const isMatch = validTerms.includes(part.toLowerCase());
          if (isMatch) {
            const wordLower = part.toLowerCase();
            let gradientClasses = "from-indigo-100/90 via-violet-50/50 to-indigo-50/90 text-indigo-950 border-indigo-500/50";
            let title = "Syllabus / Concept Core Term";
            
            if (["correct", "solution", "solve", "working", "key", "theorem", "law", "rule"].includes(wordLower)) {
              gradientClasses = "from-emerald-100/90 via-emerald-200/40 to-emerald-50/90 text-emerald-950 border-emerald-500/50";
              title = "Verified Methodology / Academic Standard";
            } else if (["incorrect", "wrong", "mistake", "error", "critical"].includes(wordLower)) {
              gradientClasses = "from-rose-100/90 via-rose-200/50 to-rose-50/90 text-rose-950 border-rose-400";
              title = "Diagnostic Review / Core Concept Mismatch";
            } else if (["important", "crucial", "remember", "formula", "equation"].includes(wordLower)) {
              gradientClasses = "from-amber-100/95 via-amber-200/60 to-amber-100/60 text-amber-950 border-amber-500/60";
              title = "High-Priority Crucial Instruction / Competitive Guideline";
            } else if ([
              "mitosis", "meiosis", "chromosome", "cell", "organelle", "photosynthesis",
              "proton", "electron", "neutron", "atom", "molecule", "reaction", "catalyst",
              "acid", "base", "ph", "integral", "derivative", "matrix", "matrices",
              "determinant", "vector", "scalar", "acceleration", "gradient", "velocity"
            ].includes(wordLower)) {
              gradientClasses = "from-sky-100/90 via-cyan-100/10 to-sky-100/50 text-sky-950 border-sky-400/55";
              title = "Academic Term / Curricular Focus Unit";
            }

            return (
              <mark 
                key={index} 
                className={`relative inline-block px-1.5 py-0.5 mx-0.5 font-bold rounded-md border-b bg-gradient-to-r ${gradientClasses}`}
                title={title}
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </>
    );
  } catch (e) {
    return text;
  }
}

interface TopicTaxonomyExplorerProps {
  topic: string;
  onSelectConcept?: (concept: string) => void;
}

function TopicTaxonomyExplorer({ topic, onSelectConcept }: TopicTaxonomyExplorerProps) {
  const [activeSubtopic, setActiveSubtopic] = useState<string | null>(null);
  const [activeRelated, setActiveRelated] = useState<string | null>(null);
  const subtopicsList = topic.split(/\s*-\s*/).filter(Boolean);
  const related = getRelatedConcepts(topic);

  return (
    <div className="bg-gradient-to-r from-indigo-50/15 via-violet-50/10 to-transparent border border-indigo-150/50 rounded-xl p-3.5 space-y-3 shadow-3xs">
      <div>
        <div className="flex items-center space-x-1.5 mb-2">
          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Concept Taxonomy Explorer</span>
          <span className="bg-indigo-100 text-indigo-850 text-[8px] font-bold px-1.5 py-0.5 rounded-full select-none">
            Levels
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-750">
          {subtopicsList.map((sub, idx) => {
            const isSelected = activeSubtopic === sub;
            return (
              <React.Fragment key={sub}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-indigo-300 shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubtopic(isSelected ? null : sub);
                    setActiveRelated(null);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all duration-150 flex items-center space-x-1 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : idx === subtopicsList.length - 1
                        ? "bg-indigo-50/80 text-indigo-900 font-black border border-indigo-150/45"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                  aria-label={`Explore info for ${sub}`}
                  title="Click to explore educational explanation"
                >
                  <Compass className={`h-3 w-3 ${isSelected ? "animate-spin text-white" : "text-indigo-400"}`} />
                  <span>{sub}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-indigo-100/30">
        <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider mr-1 shrink-0">Related Core Concepts:</span>
        {related.map((con) => {
          const isSelected = activeRelated === con;
          return (
            <button
              key={con}
              type="button"
              onClick={() => {
                setActiveRelated(isSelected ? null : con);
                setActiveSubtopic(null);
              }}
              className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all duration-150 flex items-center space-x-1 border cursor-pointer hover:scale-[1.02] active:scale-95 ${
                isSelected 
                  ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/50"
              }`}
              title="Click to view core facts and interactive tools"
            >
              <HelpCircle className={`h-3 w-3 ${isSelected ? "text-white" : "text-slate-400"}`} />
              <span>{con}</span>
            </button>
          );
        })}
      </div>

      {(activeSubtopic || activeRelated) && (
        <div className="bg-indigo-600/5 border border-indigo-150/45 rounded-lg p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-indigo-850 tracking-wider flex items-center space-x-1.5">
              <Compass className={`h-4 w-4 ${activeSubtopic ? "text-indigo-550 animate-spin" : "text-violet-550"}`} />
              <span>
                {activeSubtopic ? `Syllabus Chapter Level: ${activeSubtopic}` : `Supporting Concept Deepdive: ${activeRelated}`}
              </span>
            </span>
            <button 
              type="button"
              onClick={() => {
                setActiveSubtopic(null);
                setActiveRelated(null);
              }}
              className="text-[9px] text-indigo-500 hover:text-indigo-700 font-black uppercase shrink-0 px-2 py-0.5 hover:bg-indigo-100/40 rounded cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-indigo-950 font-medium leading-relaxed">
            {activeSubtopic ? getSubtopicExplainer(activeSubtopic) : (activeRelated ? getRelatedConceptExplainer(activeRelated) : "")}
          </p>

          <div className="flex items-center space-x-2 pt-1.5 border-t border-indigo-100/35">
            <span className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wider">Quick Action:</span>
            <button
              type="button"
              onClick={() => {
                const term = activeSubtopic || activeRelated || "";
                if (onSelectConcept && term) {
                  onSelectConcept(term);
                }
              }}
              className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-150 rounded-md text-[10px] font-bold text-indigo-600 flex items-center space-x-1 hover:scale-102 active:scale-95 transition-all cursor-pointer shadow-3xs"
              title="Filters the solutions list to only match this term"
            >
              <Search className="h-3 w-3 text-indigo-400" />
              <span>Search similar questions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const query = activeSubtopic || activeRelated || "";
                window.open(`https://www.google.com/search?q=JEE+preparation+concept+${encodeURIComponent(query)}`, '_blank');
              }}
              className="px-2 py-1 bg-white hover:bg-violet-50 border border-violet-150 rounded-md text-[10px] font-bold text-violet-600 flex items-center space-x-1 hover:scale-102 active:scale-95 transition-all cursor-pointer shadow-3xs"
              title="Search Google for JEE/NEET preparation notes or tips"
            >
              <Compass className="h-3 w-3 text-violet-400" />
              <span>External prep search</span>
            </button>
          </div>
        </div>
      )}

      {!activeSubtopic && !activeRelated && (
        <div className="text-[10px] text-gray-450 italic flex items-center space-x-1 select-none pt-0.5">
          <Info className="h-3 w-3 text-indigo-400 stroke-[2.5]" />
          <span>Click on any subtopic breadcrumb chapter or related concept tag above to view study summaries & run micro-actions.</span>
        </div>
      )}
    </div>
  );
}

interface DetailedSolutionsProps {
  results: TestResult[];
  setActiveTab?: (tab: string) => void;
}

export default function DetailedSolutions({ results, setActiveTab }: DetailedSolutionsProps) {
  const [selectedTestId, setSelectedTestId] = useState<string>(() => {
    return results.length > 0 ? results[0].id : "";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "correct" | "incorrect" | "unattempted" | "bookmarked">("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({});

  // Local storage bookmarks state: key format of 'testId_questionNumber' containing boolean
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("student_bookmarks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleBookmark = (testId: string, qNum: number) => {
    const key = `${testId}_${qNum}`;
    setBookmarks((prev) => {
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = true;
      }
      try {
        localStorage.setItem("student_bookmarks", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save bookmark", e);
      }
      return updated;
    });
  };

  // View Mode: focus (interactive 1-at-a-time slide) vs list (traditional standard scrolling logs)
  const [viewMode, setViewMode] = useState<"list" | "focus">("focus");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);

  // Keep test selection synchronized when results change
  const activeTest = useMemo(() => {
    return results.find((r) => r.id === selectedTestId) || results[0] || null;
  }, [results, selectedTestId]);

  const handleTestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTestId(e.target.value);
  };

  // Precalculate relative numbering of questions within their respective subjects
  const subjectNumberedQuestions = useMemo(() => {
    if (!activeTest) return [];
    const counts: Record<string, number> = {};
    return activeTest.questions.map((q) => {
      const sub = getSubjectFromTopic(q.topic);
      counts[sub] = (counts[sub] || 0) + 1;
      return {
        ...q,
        subject: sub,
        subjectIndex: counts[sub]
      };
    });
  }, [activeTest]);

  const activeSubjectStats = useMemo(() => {
    if (!activeTest) return {};
    return calculateSubjectWiseStats(activeTest.questions);
  }, [activeTest]);

  const filteredQuestions = useMemo(() => {
    return subjectNumberedQuestions.filter((q) => {
      const matchesSearch = 
        q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.topic && q.topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (filterType === "correct") {
        matchesStatus = q.isCorrect && !isQuestionUnattempted(q);
      } else if (filterType === "incorrect") {
        matchesStatus = !q.isCorrect && !isQuestionUnattempted(q);
      } else if (filterType === "unattempted") {
        matchesStatus = isQuestionUnattempted(q);
      } else if (filterType === "bookmarked") {
        matchesStatus = !!bookmarks[`${activeTest?.id}_${q.questionNumber}`];
      }

      const matchesSubject = selectedSubject === "all" || q.subject === selectedSubject;

      return matchesSearch && matchesStatus && matchesSubject;
    });
  }, [subjectNumberedQuestions, searchTerm, filterType, selectedSubject, bookmarks, activeTest?.id]);

  // Clamp focusedIndex safely if filtered length shrinks
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm, filterType, selectedSubject, selectedTestId]);

  const activeQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    const bounded = Math.max(0, Math.min(focusedIndex, filteredQuestions.length - 1));
    return filteredQuestions[bounded];
  }, [filteredQuestions, focusedIndex]);

  const groupedQuestions = useMemo(() => {
    const groups: Record<string, typeof filteredQuestions> = {};
    filteredQuestions.forEach((q) => {
      const sub = q.subject || "General";
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(q);
    });
    return groups;
  }, [filteredQuestions]);

  if (results.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <BookOpen className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-950">No Test Solutions Available</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            To view detailed, step-by-step academic solutions and conceptual explanations, please analyze a test first.
          </p>
        </div>
        <button
          onClick={() => setActiveTab?.("new-test")}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
        >
          <span>Analyze Now</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const correctCount = activeTest?.questions.filter(q => q.isCorrect && !isQuestionUnattempted(q)).length || 0;
  const incorrectCount = activeTest?.questions.filter(q => !q.isCorrect && !isQuestionUnattempted(q)).length || 0;
  const unattemptedCount = activeTest?.questions.filter(q => isQuestionUnattempted(q)).length || 0;
  const bookmarkedCount = activeTest?.questions.filter(q => !!bookmarks[`${activeTest?.id}_${q.questionNumber}`]).length || 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Dynamic View Selector Menu Ribbon */}
      <div className="bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md border border-stone-250/50 dark:border-stone-850/85 p-4 rounded-xl shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-bold text-stone-900 dark:text-[#FAF7F0] leading-normal">Academic Evaluation Library</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Filter answers sheet, run subtopical derivations, or interact with tutor</p>
          </div>
        </div>

        <div className="bg-stone-100/40 dark:bg-stone-950/60 p-1 rounded-xl flex items-center space-x-1 border border-stone-200/50 dark:border-stone-850/80">
          <button
            type="button"
            onClick={() => {
              setViewMode("focus");
              setAiPanelOpen(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              viewMode === "focus" 
                ? "bg-white dark:bg-stone-800 text-indigo-700 dark:text-indigo-300 shadow-3xs border border-[#E6E1D5]/50 dark:border-stone-700/80" 
                : "text-stone-550 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            <Target className="h-3.5 w-3.5 animate-pulse" />
            <span>Interactive Focus Mode</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setViewMode("list");
              setAiPanelOpen(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              viewMode === "list" 
                ? "bg-white dark:bg-stone-800 text-indigo-700 dark:text-indigo-300 shadow-3xs border border-[#E6E1D5]/50 dark:border-stone-700/80" 
                : "text-stone-555 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>Full List View</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar selection deck */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md border border-stone-250/50 dark:border-stone-850/85 p-4 rounded-xl shadow-xs space-y-3">
            <label className="block text-xs font-black text-stone-450 dark:text-stone-400 uppercase tracking-wider">Select Test Archive</label>
            <div className="relative">
              <select
                value={selectedTestId}
                onChange={handleTestChange}
                className="w-full pl-3 pr-10 py-2.5 bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-850 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-indigo-650 appearance-none cursor-pointer"
              >
                {results.map((r) => (
                  <option key={r.id} value={r.id} className="dark:bg-stone-950 dark:text-stone-100">
                    {r.title || new Date(r.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                <ChevronRight className="h-4 w-4 transform rotate-90" />
              </div>
            </div>
          </div>

          {activeTest && (
            <div className="bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md border border-stone-250/50 dark:border-stone-850/85 rounded-xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-stone-450 dark:text-stone-400 uppercase tracking-wider">Test Stats Summary</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/10 dark:bg-emerald-950/20 border border-emerald-150/15">
                  <span className="text-stone-600 dark:text-stone-350 font-medium">Correct Code:</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{correctCount} QR</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/10 dark:bg-rose-955/20 border border-rose-150/15">
                  <span className="text-stone-600 dark:text-stone-350 font-medium">Incorrect Code:</span>
                  <span className="font-extrabold text-rose-700 dark:text-rose-450">{incorrectCount} QR</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100/30 dark:bg-stone-950/50 border border-stone-200/15">
                  <span className="text-stone-605 dark:text-stone-350 font-medium font-medium">Unattempted:</span>
                  <span className="font-extrabold text-stone-500 dark:text-stone-400">{unattemptedCount} QR</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/50 dark:border-stone-850 flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                <span>Overall Score:</span>
                <span className="text-indigo-650 dark:text-indigo-400 font-black text-sm">{activeTest.score} / {activeTest.totalQuestions} ({activeTest.percentage}%)</span>
              </div>
            </div>
          )}

          {/* Round Circle Badge Question Navigation Map (Focus mode helper) */}
          {viewMode === "focus" && activeTest && filteredQuestions.length > 0 && (
            <div className="bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md border border-stone-250/50 dark:border-stone-850/85 rounded-xl p-4 shadow-3xs space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-450 dark:text-stone-400 uppercase tracking-widest">Question Map ({filteredQuestions.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterType("all");
                    setSelectedSubject("all");
                    setSearchTerm("");
                  }}
                  className="text-[9px] text-indigo-600 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div 
                style={{ backgroundColor: "#0b0b0b" }} 
                className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1"
              >
                {filteredQuestions.map((q, idx) => {
                  const isSelected = focusedIndex === idx;
                  const unatt = isQuestionUnattempted(q);
                  
                  let circleBg = "bg-stone-50/50 dark:bg-stone-900/50 text-stone-700 dark:text-stone-300 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 border-stone-200/50 dark:border-stone-850";
                  if (!unatt && q.isCorrect) {
                    circleBg = "bg-emerald-50/20 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100/30 dark:hover:bg-emerald-900/40 border-emerald-150/40 dark:border-emerald-900/30";
                  } else if (!unatt && !q.isCorrect) {
                    circleBg = "bg-rose-50/20 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 hover:bg-rose-100/30 dark:hover:bg-rose-900/40 border-rose-150/40 dark:border-rose-900/30";
                  }

                  if (isSelected) {
                    circleBg += " ring-2 ring-indigo-505 dark:ring-indigo-400 ring-offset-1 dark:ring-offset-stone-950 font-black";
                  }

                  return (
                    <button
                      key={q.questionNumber}
                      type="button"
                      onClick={() => {
                        setFocusedIndex(idx);
                        setAiPanelOpen(false);
                      }}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-semibold cursor-pointer transition-all border ${circleBg}`}
                      title={`Jump to Q. ${q.questionNumber}`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                })}
              </div>
              <div className="text-[9.5px] text-stone-400 dark:text-stone-500 flex flex-col gap-1 pt-1.5 border-t border-stone-200/40 dark:border-stone-800/60 select-none">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/10 dark:bg-emerald-900/30 border border-emerald-500/30 shrink-0" />
                  <span>Correct Option match</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/10 dark:bg-rose-900/30 border border-rose-500/30 shrink-0" />
                  <span>Incorrect Option match</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-stone-100/30 dark:bg-stone-900/40 border border-stone-300/30 shrink-0" />
                  <span>Skipped question</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Core solutions viewport */}
        <div className={`lg:col-span-3 space-y-6 ${viewMode === "focus" && aiPanelOpen ? "lg:col-span-3" : ""}`}>
          {activeTest && (
            <div 
              style={{ backgroundColor: "#212121" }} 
              className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs space-y-5"
            >
              <div className="md:flex md:items-center md:justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">Academic Solutions manual</span>
                  <h2 className="text-lg font-bold text-gray-950 pr-4">{activeTest.title || "Evaluation Results"}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Syllabus-wise walkthrough keys, metrics, and derivations solver</p>
                </div>

                <div className="relative mt-3 md:mt-0 max-w-xs w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search terms, formulas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ backgroundColor: "#344251" }}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-medium text-gray-850 placeholder-gray-400 focus:outline-hidden focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Filtering segmented navigation links */}
              <div className="space-y-4 pb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider mr-1">Status:</span>
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterType === "all" ? "bg-indigo-600 text-white shadow-xs animate-in fade-in" : "bg-gray-100 text-gray-650 hover:bg-gray-200"
                    }`}
                  >
                    All Qs ({activeTest.questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("correct")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      filterType === "correct" ? "bg-emerald-600 text-white shadow-xs animate-in fade-in" : "bg-emerald-55/10 text-emerald-800 hover:bg-emerald-100/50"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Correct ({correctCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("incorrect")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      filterType === "incorrect" ? "bg-rose-600 text-white shadow-xs animate-in fade-in" : "bg-rose-55/10 text-rose-800 hover:bg-rose-100/50"
                    }`}
                  >
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Incorrect ({incorrectCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("unattempted")}
                    style={{ backgroundColor: "#51518f" }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      filterType === "unattempted" ? "bg-gray-750 text-white shadow-xs animate-in" : "bg-gray-100 text-gray-750 hover:bg-gray-250"
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Skipped ({unattemptedCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("bookmarked")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      filterType === "bookmarked" ? "bg-amber-600 text-white shadow-xs animate-in" : "bg-amber-100/10 text-amber-550 hover:bg-amber-100/50"
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0" />
                    <span>Bookmarked ({bookmarkedCount})</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider mr-1">Subject:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubject("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedSubject === "all" ? "bg-slate-800 text-white shadow-xs" : "bg-gray-100 text-gray-650 hover:bg-gray-200"
                    }`}
                  >
                    All Sections
                  </button>
                  {Object.keys(activeSubjectStats).map((subjKey, index) => {
                    const s = activeSubjectStats[subjKey];
                    if (s.total === 0) return null;
                    
                    // Map background colors sequentially to subjects to align with CSS selectors 7, 9, 11, 12
                    let customBg = undefined;
                    if (index === 0) customBg = "#011d29";
                    else if (index === 1) customBg = "#194531";
                    else if (index === 2) customBg = "#242b33";
                    else if (index === 3) customBg = "#4f3600";

                    return (
                      <button
                        key={subjKey}
                        type="button"
                        onClick={() => setSelectedSubject(subjKey)}
                        style={customBg ? { backgroundColor: customBg } : undefined}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                          selectedSubject === subjKey 
                            ? "bg-indigo-600 text-white font-extrabold shadow-sm" 
                            : "bg-indigo-50/50 hover:bg-indigo-50 text-indigo-750 border border-indigo-100/40"
                        }`}
                      >
                        <span className="font-bold">{subjKey}</span>
                        <span className="text-[10px] font-black opacity-85 bg-white/20 px-1.5 py-0.5 rounded-md">
                          {s.marks}/{s.maxMarks} Marks
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RENDER BY DESIGN VIEWS */}
              {viewMode === "focus" ? (
                /* =================== 🎯 INTERACTIVE FOCUS PAGE =================== */
                filteredQuestions.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50/50 border border-gray-150 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-gray-500 block">No matching questions found</span>
                    <p className="text-[11px] text-gray-400">Refine key descriptors or filters to locate item</p>
                  </div>
                ) : (
                  (() => {
                    const q = activeQuestion;
                    if (!q) return null;

                    const isUnatt = isQuestionUnattempted(q);
                    const isTaxonomyExpanded = !!expandedTopics[q.questionNumber];
                    const hasSubtopics = !!(q.topic && q.topic.includes("-"));
                    let alertThemeClass = "border-stone-200/50 dark:border-stone-850/85 bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md shadow-3xs";
                    let badge = (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-stone-100/80 dark:bg-stone-900/40 text-stone-700 dark:text-stone-300 text-[10px] font-black uppercase rounded-full border border-stone-200/30 dark:border-stone-800">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Skipped • 0 Marks</span>
                      </span>
                    );

                    if (q.isCorrect && !isUnatt) {
                      alertThemeClass = "border-emerald-500/30 dark:border-emerald-900/45 bg-emerald-50/10 dark:bg-emerald-950/20 shadow-emerald-50";
                      badge = (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100/50 dark:bg-emerald-950/45 text-emerald-850 dark:text-emerald-400 text-[10px] font-black uppercase rounded-full border border-emerald-250/50 dark:border-emerald-900/40">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Correct • +4 Marks</span>
                        </span>
                      );
                    } else if (!q.isCorrect && !isUnatt) {
                      alertThemeClass = "border-rose-500/30 dark:border-rose-900/45 bg-rose-50/10 dark:bg-rose-955/20 shadow-rose-50";
                      badge = (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100/50 dark:bg-rose-950/45 text-rose-855 dark:text-rose-400 text-[10px] font-black uppercase rounded-full border border-rose-250/50 dark:border-rose-900/40">
                          <XCircle className="h-3.5 w-3.5 text-rose-550 dark:text-rose-455" />
                          <span>Incorrect • -1 Mark</span>
                        </span>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 font-sans">
                        
                        {/* Main focused question container body */}
                        <div className={`space-y-4 ${aiPanelOpen ? "xl:col-span-3 animate-all duration-300" : "xl:col-span-5 animate-all duration-300"}`}>
                          
                          {/* Top Pagination Control Stream */}
                          <div className="flex items-center justify-between bg-stone-100/40 dark:bg-stone-950/45 border border-stone-200/40 dark:border-stone-850/70 p-4 rounded-2xl text-xs font-semibold text-stone-750 dark:text-stone-300 backdrop-blur-md">
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedIndex(prev => Math.max(0, prev - 1));
                                setAiPanelOpen(false);
                              }}
                              disabled={focusedIndex === 0}
                              className="px-4 py-2 select-none flex items-center space-x-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-950 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed text-xs text-stone-705 dark:text-stone-300 shadow-3xs transition-all active:scale-95 duration-150"
                            >
                              <ChevronLeft className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                              <span>Previous</span>
                            </button>
                            
                            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest bg-stone-100/60 dark:bg-stone-900/40 px-3.5 py-1.5 rounded-full select-none font-sans">
                              Question <strong className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{focusedIndex + 1}</strong> of <strong className="text-stone-850 dark:text-stone-250">{filteredQuestions.length}</strong>
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1));
                                setAiPanelOpen(false);
                              }}
                              disabled={focusedIndex === filteredQuestions.length - 1}
                              className="px-4 py-2 select-none flex items-center space-x-2 border border-stone-200 dark:border-stone-805 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-955 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed text-xs text-stone-705 dark:text-stone-300 shadow-3xs transition-all active:scale-95 duration-150"
                            >
                              <span>Next</span>
                              <ChevronRight className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                            </button>
                          </div>

                          {/* Premium Reading Sheet Sheet */}
                          <div className={`border p-6 md:p-10 rounded-3xl space-y-8 shadow-xs border-stone-200/75 dark:border-stone-850/80 bg-white dark:bg-[#141211] transition-all`}>
                            
                            {/* Tags and difficulty headers */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-100/80 dark:border-stone-900/60">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="bg-indigo-600/10 dark:bg-indigo-950/70 text-indigo-705 dark:text-indigo-305 text-xs font-bold px-3 py-1 rounded-xl border border-indigo-200/15">
                                  {q.subject} • Q. {q.subjectIndex}
                                </span>
                                <span className="bg-stone-100 dark:bg-stone-900/60 text-stone-605 dark:text-stone-350 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                                  Overall Q. {q.questionNumber}
                                </span>
                                {q.topic && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedTopics(prev => ({
                                        ...prev,
                                        [q.questionNumber]: !prev[q.questionNumber]
                                      }));
                                    }}
                                    className={`text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center space-x-1 inline-flex transition-all duration-150 cursor-pointer active:scale-95 border ${
                                      isTaxonomyExpanded 
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-3xs" 
                                        : "bg-stone-50 hover:bg-stone-100 dark:bg-stone-900/40 dark:hover:bg-stone-800/65 text-stone-700 dark:text-stone-300 border-stone-200/50 dark:border-stone-800/80"
                                    }`}
                                  >
                                    <Compass className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                                    <span className="truncate max-w-[120px] md:max-w-xs">{q.topic}</span>
                                    {hasSubtopics && (
                                      <ChevronRight className={`h-3 w-3 shrink-0 transform transition-transform duration-200 ${isTaxonomyExpanded ? "rotate-90" : ""}`} />
                                    )}
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleBookmark(activeTest.id, q.questionNumber)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 duration-150 ${
                                    bookmarks[`${activeTest.id}_${q.questionNumber}`]
                                      ? "bg-amber-600 border-amber-500 text-white shadow-3xs"
                                      : "bg-stone-50 hover:bg-amber-100/30 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:text-amber-500 dark:hover:text-amber-400"
                                  }`}
                                  title={bookmarks[`${activeTest.id}_${q.questionNumber}`] ? "Remove Bookmark" : "Save for Review"}
                                >
                                  <Bookmark className={`h-4 w-4 ${bookmarks[`${activeTest.id}_${q.questionNumber}`] ? "fill-current" : ""}`} />
                                </button>
                                {q.importance && (
                                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                                    q.importance === "High" ? "bg-orange-500/10 dark:bg-orange-950/20 text-orange-700 dark:text-orange-450 border-orange-500/20" :
                                    q.importance === "Medium" ? "bg-amber-500/10 dark:bg-amber-955/20 text-amber-700 dark:text-amber-45 border-amber-500/10" : "bg-stone-100 dark:bg-stone-900/60 text-stone-605 dark:text-stone-400 border-stone-200/30"
                                  }`}>
                                    Freq: {q.importance}
                                  </span>
                                )}
                                {badge}
                              </div>
                            </div>

                            {/* Crisp, Beautiful Academic Question Statement */}
                            <div className="space-y-3">
                              <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider block">Problem Statement</span>
                              <div className="p-6 md:p-8 bg-stone-50/40 dark:bg-stone-900/25 border border-stone-200/40 dark:border-stone-850/70 rounded-2xl">
                                <p className="text-sm sm:text-base md:text-[17px] font-medium text-stone-900 dark:text-stone-50 whitespace-pre-line leading-relaxed tracking-wide font-sans">
                                  {q.questionText}
                                </p>
                              </div>
                            </div>

                            {/* Big Side-By-Side Answer Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 font-sans">
                              {/* Student Option Card */}
                              <div className={`p-5 rounded-2xl border transition-all duration-150 space-y-2 select-none ${
                                isUnatt 
                                  ? "bg-stone-50/50 dark:bg-stone-950/30 border-stone-200/60 dark:border-stone-850"
                                  : q.isCorrect 
                                    ? "bg-emerald-50/10 dark:bg-emerald-950/15 border-emerald-500/15 dark:border-emerald-900/30" 
                                    : "bg-rose-50/15 dark:bg-rose-955/15 border-rose-500/15 dark:border-rose-900/30"
                              }`}>
                                <span className="text-[10px] uppercase font-extrabold text-stone-400 dark:text-stone-500 tracking-wider block">Your Marked Answer</span>
                                <div className="flex items-center space-x-3">
                                  <span className={`text-sm font-bold flex items-center justify-center w-8 h-8 rounded-full border ${
                                    isUnatt 
                                      ? "bg-stone-100 text-stone-450 dark:bg-stone-900 dark:text-stone-500 border-stone-200/60 dark:border-stone-800"
                                      : q.isCorrect 
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" 
                                        : "bg-rose-500/10 text-rose-750 dark:text-rose-400 border-rose-500/30"
                                  }`}>
                                    {q.userAnswer ? q.userAnswer.charAt(0) : "—"}
                                  </span>
                                  <span className={`text-base font-black ${
                                    isUnatt ? "text-stone-455 dark:text-stone-500 italic font-medium text-sm" :
                                    q.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-405"
                                  }`}>
                                    {q.userAnswer || "Unanswered / Skipped"}
                                  </span>
                                </div>
                              </div>

                              {/* Correct Option Card */}
                              <div 
                                style={{ backgroundColor: "#553838" }} 
                                className="p-5 bg-stone-50/50 dark:bg-stone-955/35 border border-stone-200/60 dark:border-stone-850 rounded-2xl space-y-2 select-none"
                              >
                                <span className="text-[10px] uppercase font-extrabold text-stone-400 dark:text-stone-505 tracking-wider block">Correct Reference Answer</span>
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-bold flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-900/30">
                                    {q.correctAnswer ? q.correctAnswer.charAt(0) : "✓"}
                                  </span>
                                  <span className="text-base font-black text-stone-800 dark:text-stone-100">
                                    {q.correctAnswer || "Not Evaluated"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Eye-Comfort Diagnostic Callout Box with left vertical anchor stripe */}
                            <div className={`p-5 md:p-6 rounded-2xl border-l-[6px] border border-stone-200/50 dark:border-stone-850/90 flex items-start space-x-4 text-xs shadow-3xs transition-all duration-250 ${
                              isUnatt 
                                ? "bg-stone-50/50 text-stone-800 dark:text-stone-300 border-l-stone-400 dark:border-l-stone-600" 
                                : q.isCorrect 
                                  ? "bg-emerald-50/20 dark:bg-emerald-950/15 text-emerald-950 dark:text-emerald-300 border-l-emerald-500/80 dark:border-l-emerald-600/80" 
                                  : "bg-rose-50/20 dark:bg-rose-955/15 text-rose-950 dark:text-rose-300 border-l-rose-500/80 dark:border-l-rose-600/80"
                            }`}>
                              <div className="pt-1.5 shrink-0">
                                {isUnatt ? (
                                  <HelpCircle className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                                ) : q.isCorrect ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-405" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-rose-500 dark:text-rose-455" />
                                )}
                              </div>
                              <div className="space-y-1.5 leading-relaxed font-sans">
                                <span className="font-extrabold uppercase text-[9.5px] tracking-wider block opacity-75">
                                  Diagnostic Alignment Analysis
                                </span>
                                <p className="text-xs sm:text-[13px] leading-relaxed">
                                  {isUnatt ? (
                                    <strong className="text-stone-800 dark:text-stone-205 font-bold block mb-0.5">Question Left Unattempted:</strong>
                                  ) : q.isCorrect ? (
                                    <strong className="text-emerald-850 dark:text-emerald-400 font-bold block mb-0.5">High-Accuracy Conceptual Match:</strong>
                                  ) : (
                                    <strong className="text-rose-850 dark:text-rose-400 font-bold block mb-0.5">Conceptual Gap Detected:</strong>
                                  )}
                                  {" "}
                                  {isUnatt ? (
                                    "This question was skipped. Omitting questions prevents negative marks deductions (-1 penalty) under competitive JEE / NEET marking guidelines, but isolates this particular topic for urgent structured workbook practice."
                                  ) : q.isCorrect ? (
                                    `Your marked answer (${q.userAnswer}) aligns seamlessly with reference key (${q.correctAnswer}). This represents stellar logical precision, masterly speed, and formula application under time constraints.`
                                  ) : (
                                    `Your marked answer (${q.userAnswer || "N/A"}) deviates from the reference answer (${q.correctAnswer}). This gap usually highlights an algebraic error, integration/elimination variable mistakes, or a core misunderstanding of the fundamental laws. Audit the solved derivations below carefully.`
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Core Action Triggers */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100 dark:border-stone-900/60 font-sans">
                              <div className="flex items-center space-x-3">
                                <button
                                  type="button"
                                  onClick={() => setExpandedTopics(prev => ({
                                    ...prev,
                                    [q.questionNumber]: !prev[q.questionNumber]
                                  }))}
                                  className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-3xs active:scale-95 duration-100 ${
                                    isTaxonomyExpanded 
                                      ? "bg-stone-200 text-stone-900 border-stone-300 dark:bg-stone-800 dark:text-stone-100" 
                                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-305 dark:border-stone-800 dark:hover:bg-stone-950"
                                  }`}
                                >
                                  <Compass className="h-4 w-4 text-indigo-500 shrink-0" />
                                  <span>Study References {isTaxonomyExpanded ? "Hide" : "Expand"}</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm(q.topic);
                                    setSelectedSubject("all");
                                  }}
                                  className="px-4 py-2 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/30 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 dark:text-indigo-305 dark:border-indigo-900/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-3xs active:scale-95 duration-100 font-sans"
                                >
                                  <Search className="h-4 w-4 text-indigo-500 shrink-0" />
                                  <span>Find Subject Qs</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setAiPanelOpen(true)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer shadow-sm shadow-indigo-100/40 dark:shadow-none active:scale-95 duration-100"
                              >
                                <Sparkles className="h-4 w-4 animate-pulse text-yellow-300 shrink-0" />
                                <span>Explain with AI Tutor</span>
                              </button>
                            </div>

                            {q.topic && isTaxonomyExpanded && (
                              <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                                <TopicTaxonomyExplorer 
                                  topic={q.topic} 
                                  onSelectConcept={(concept) => setSearchTerm(concept)}
                                />

                                <div className="bg-amber-500/[0.04] dark:bg-amber-955/10 border border-amber-500/20 dark:border-amber-900/30 rounded-2xl p-6 space-y-4 animate-in fade-in duration-250">
                                  <h4 className="text-xs font-extrabold text-amber-850 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 font-sans">
                                    <Lightbulb className="h-4.5 w-4.5 text-amber-500" />
                                    <span>Curricular Blueprint Study Notes</span>
                                  </h4>
                                  <p className="text-sm text-amber-900/90 dark:text-amber-305/90 leading-relaxed font-sans">
                                    <strong>Basic Idea:</strong> {getSubtopicExplainer(q.topic)}
                                  </p>
                                  <div className="text-xs text-amber-955 dark:text-amber-400 space-y-2 leading-relaxed bg-amber-500/[0.02] dark:bg-amber-950/15 p-4 rounded-xl border border-amber-500/10">
                                    <strong className="text-[11px] uppercase tracking-wider font-extrabold text-amber-800 dark:text-amber-500 font-sans">Formula reference for {q.topic.split("-").pop() || "Concept"}:</strong>
                                    <ul className="list-disc pl-5 mt-2 font-mono text-xs text-amber-905 dark:text-amber-400/95 space-y-1.5">
                                      {q.topic.toLowerCase().includes("kinematics") && (
                                        <>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">1D Kinetics:</strong> v = u + at ; s = ut + ½at² ; v² = u² + 2as</li>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Projectile Arc:</strong> y = x·tanθ - gx² / (2u²cos²θ)</li>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Max Altitude:</strong> H = (u²sin²θ)/2g ; Range: R = u²sin2θ/g</li>
                                        </>
                                      )}
                                      {(q.topic.toLowerCase().includes("newton") || q.topic.toLowerCase().includes("force")) && (
                                        <>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Newtonian Balance:</strong> F_net = m·a = dp/dt</li>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Frictional Max:</strong> f_static_max = μ_s·N ; f_kinetic = μ_k·N</li>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Centripetal Force:</strong> F_c = m·v² / r = m·ω²·r</li>
                                        </>
                                      )}
                                      {q.topic.toLowerCase().includes("quadratic") && (
                                        <>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Quadratic Formulas:</strong> x = (-b ± √(b² - 4ac)) / (2a)</li>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Roots & Coeffs:</strong> α + β = -b/a ; α·β = c/a ; |α-β| = √D/a</li>
                                        </>
                                      )}
                                      {(q.topic.toLowerCase().includes("matrix") || q.topic.toLowerCase().includes("determinant")) && (
                                        <>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Matrix Inverse:</strong> A⁻¹ = Adj(A) / det(A) ; det(A·B) = det(A)·det(B)</li>
                                          <li className="py-0.5"><strong className="text-amber-800 dark:text-amber-500 font-bold font-sans">Eigenvalues:</strong> det(A - λ·I) = 0 ; Sum of Eigenvalues = Trace(A)</li>
                                        </>
                                      )}
                                      {(!q.topic.toLowerCase().includes("kinematics") && 
                                       !(q.topic.toLowerCase().includes("newton") || q.topic.toLowerCase().includes("force")) && 
                                       !q.topic.toLowerCase().includes("quadratic") && 
                                       !(q.topic.toLowerCase().includes("matrix") || q.topic.toLowerCase().includes("determinant"))) && (
                                        <li className="py-1 list-none text-stone-500 italic">No custom objective formulas recorded. Refer to standard curriculum derivations.</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Pristine, Super Eye-Comfort Solution Walkthrough and Derivations */}
                            <div className="pt-6 border-t border-stone-200/50 dark:border-stone-850/60 space-y-4 font-sans animate-in fade-in duration-200">
                              <h5 className="text-xs uppercase font-extrabold text-stone-400 dark:text-stone-500 tracking-wider flex items-center space-x-2 font-sans">
                                <FileText className="h-4 w-4 text-indigo-500 animate-pulse shrink-0" />
                                <span>Complete Step-By-Step Solution Walkthrough</span>
                              </h5>
                              <div className="p-6 md:p-8 rounded-2xl bg-[#FCFAF6] dark:bg-[#110F0E] border border-stone-200/50 dark:border-stone-850 shadow-3xs transition-colors duration-200">
                                <div className="text-sm sm:text-[15.5px] leading-relaxed text-stone-850 dark:text-stone-200 font-normal prose dark:prose-invert max-w-none">
                                  {q.explanation ? <MathMarkdown content={q.explanation} /> : "No concept explanation logged. Refer to your reference notes."}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Academic AI Tutor sliding sidebar */}
                        {aiPanelOpen && (
                          <div className="xl:col-span-2">
                            <AITutorPanel 
                              question={q} 
                              testId={activeTest.id}
                              onClose={() => setAiPanelOpen(false)} 
                              onToggleExpand={() => setAiPanelExpanded(true)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()
                )
              ) : (
                /* =================== 📋 LIST VIEW =================== */
                filteredQuestions.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50/50 border border-gray-150 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-gray-500 block">No matching questions found</span>
                    <p className="text-[11px] text-gray-400">Try modifying search tags or selections</p>
                  </div>
                ) : (
                  Object.keys(groupedQuestions).map((subKey) => {
                    const qs = groupedQuestions[subKey] || [];
                    if (qs.length === 0) return null;
                    const stat = activeSubjectStats[subKey];

                    return (
                      <div key={subKey} className="space-y-4 pt-1">
                        <div className="bg-gradient-to-r from-indigo-50/70 to-transparent border border-indigo-100/60 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-black text-indigo-950 uppercase tracking-widest">{subKey} Section</h3>
                              <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-full">
                                {qs.length} matched
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Attempted: {stat.total - stat.unattempted} of {stat.total} Qs • Correct: {stat.correct} • Accuracy: {stat.percentage}%
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-800 font-extrabold rounded-lg shadow-3xs">
                              Subject Marks: <span className="text-indigo-600 font-black">{stat.marks} pts / {stat.maxMarks} max</span>
                            </span>
                          </div>
                        </div>

                        <div className="space-y-5">
                          {qs.map((q) => {
                            let alertThemeClass = "border-gray-150 bg-white shadow-3xs";
                            let badge = (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase rounded-full border border-gray-200">
                                <HelpCircle className="h-3 w-3" />
                                <span>Skipped • 0 Marks</span>
                              </span>
                            );

                            const isUnattempted = isQuestionUnattempted(q);
                            const isTaxonomyExpanded = !!expandedTopics[q.questionNumber];
                            const hasSubtopics = !!(q.topic && q.topic.includes("-"));

                            if (q.isCorrect && !isUnattempted) {
                              alertThemeClass = "border-emerald-100 bg-emerald-50/5 hover:border-emerald-150 transition-all";
                              badge = (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100/50 text-emerald-850 text-[10px] font-black uppercase rounded-full border border-emerald-200/50">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>Correct • +4 Marks</span>
                                </span>
                              );
                            } else if (!q.isCorrect && !isUnattempted) {
                              alertThemeClass = "border-rose-100 bg-rose-50/5 hover:border-rose-150 transition-all";
                              badge = (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100/50 text-rose-850 text-[10px] font-black uppercase rounded-full border border-rose-200/50">
                                  <XCircle className="h-3 w-3 text-rose-500" />
                                  <span>Incorrect • -1 Mark</span>
                                </span>
                              );
                            }

                            return (
                              <div 
                                key={q.questionNumber} 
                                className={`border p-5 rounded-xl space-y-4 ${alertThemeClass}`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="bg-indigo-600 text-white text-[11px] font-black px-2.5 py-1 rounded-md">
                                      {subKey} • Q. {q.subjectIndex}
                                    </span>
                                    <span className="bg-gray-100 text-gray-650 text-[10px] font-bold px-2 py-1 rounded-md">
                                      Overall Q. {q.questionNumber}
                                    </span>
                                    {q.topic && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedTopics(prev => ({
                                            ...prev,
                                            [q.questionNumber]: !prev[q.questionNumber]
                                          }));
                                        }}
                                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all duration-150 cursor-pointer active:scale-95 ${
                                          isTaxonomyExpanded 
                                            ? "bg-indigo-600 text-white shadow-3xs" 
                                            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-850"
                                        }`}
                                      >
                                        <Compass className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate max-w-[150px] md:max-w-xs">{q.topic}</span>
                                        {hasSubtopics && (
                                          <ChevronRight className={`h-3 w-3 shrink-0 transform transition-transform duration-200 ${isTaxonomyExpanded ? "rotate-90" : ""}`} />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleBookmark(activeTest.id, q.questionNumber)}
                                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 duration-150 ${
                                        bookmarks[`${activeTest.id}_${q.questionNumber}`]
                                          ? "bg-amber-600 border-amber-500 text-white shadow-3xs"
                                          : "bg-stone-50 hover:bg-amber-100/30 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:text-amber-500 dark:hover:text-amber-400"
                                      }`}
                                      title={bookmarks[`${activeTest.id}_${q.questionNumber}`] ? "Remove Bookmark" : "Save for Review"}
                                    >
                                      <Bookmark className={`h-3.5 w-3.5 ${bookmarks[`${activeTest.id}_${q.questionNumber}`] ? "fill-current" : ""}`} />
                                    </button>
                                    {q.importance && (
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${
                                        q.importance === "High" ? "bg-orange-100 text-orange-700" :
                                        q.importance === "Medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                      }`}>
                                        Freq: {q.importance}
                                      </span>
                                    )}
                                    {badge}
                                  </div>
                                </div>

                                <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-lg">
                                  <p className="text-xs font-semibold text-gray-855 whitespace-pre-line leading-relaxed pb-0.5">
                                    {q.questionText}
                                  </p>
                                </div>

                                {q.topic && (
                                  <div className="flex flex-wrap gap-2 items-center text-xs pb-1 bg-white py-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Concept Actions:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSearchTerm(q.topic);
                                        setSelectedSubject("all");
                                      }}
                                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-150 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer active:scale-95"
                                    >
                                      <Search className="h-3.5 w-3.5" />
                                      <span>Search similar questions</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.open(`https://www.google.com/search?q=academic+study+lessons+notes+questions+on+${encodeURIComponent(q.topic)}`, '_blank');
                                      }}
                                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 hover:text-violet-900 border border-violet-150 text-violet-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer active:scale-95"
                                    >
                                      <Globe className="h-3.5 w-3.5 text-violet-500" />
                                      <span>External preparation resources</span>
                                    </button>
                                  </div>
                                )}

                                {q.topic && isTaxonomyExpanded && (
                                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <TopicTaxonomyExplorer 
                                      topic={q.topic} 
                                      onSelectConcept={(concept) => setSearchTerm(concept)}
                                    />
                                  </div>
                                )}

                                {q.topic && !isTaxonomyExpanded && hasSubtopics && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedTopics(prev => ({
                                        ...prev,
                                        [q.questionNumber]: true
                                      }));
                                    }}
                                    className="w-full text-left py-2 px-3 bg-indigo-50/25 hover:bg-indigo-50/45 border border-indigo-100/40 rounded-xl flex items-center justify-between text-[11px] font-semibold text-indigo-700 cursor-pointer transition-colors"
                                  >
                                    <span className="flex items-center space-x-1.5 font-bold">
                                      <Compass className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                                      <span>This topic has {q.topic.split("-").length} nested levels. Click to expand granular subtopics tracker.</span>
                                    </span>
                                    <span className="text-[10px] font-extrabold uppercase bg-indigo-100 px-2 py-0.5 rounded-md flex items-center space-x-0.5">
                                      <span>Expand</span>
                                      <ChevronRight className="h-3 w-3" />
                                    </span>
                                  </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Student's Marked Option</span>
                                    <span className={`text-xs font-black block ${
                                      isUnattempted ? "text-gray-400 italic" :
                                      q.isCorrect ? "text-emerald-700" : "text-rose-700"
                                    }`}>
                                      {q.userAnswer || "Unanswered"}
                                    </span>
                                  </div>

                                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Correct Syllabus Answer</span>
                                    <span className="text-xs font-black text-gray-750 block">
                                      {q.correctAnswer || "Not Evaluated"}
                                    </span>
                                  </div>
                                </div>

                                <div className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs shadow-3xs transition-all duration-250 hover:shadow-2xs ${
                                  isUnattempted 
                                    ? "bg-slate-50 border-slate-200/50 text-slate-850" 
                                    : q.isCorrect 
                                      ? "bg-emerald-50/40 border-emerald-150/40 text-emerald-950" 
                                      : "bg-rose-50/40 border-rose-150/40 text-rose-950"
                                }`}>
                                  <div className="pt-0.5">
                                    {isUnattempted ? (
                                      <HelpCircle className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                                    ) : q.isCorrect ? (
                                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                                    )}
                                  </div>
                                  <div className="space-y-1 leading-normal">
                                    <span className="font-extrabold uppercase text-[9px] tracking-wider block opacity-75">
                                      Diagnostic Answer Comparison & Visual Cues
                                    </span>
                                    <p className="text-[11px] leading-relaxed">
                                      {isUnattempted ? (
                                        <strong>Question Omitted / Left Blank:</strong>
                                      ) : q.isCorrect ? (
                                        <strong className="text-emerald-800 font-bold">Flawless Conceptual Match:</strong>
                                      ) : (
                                        <strong className="text-rose-800 font-bold">Discrepancy Detected (Attempt Error):</strong>
                                      )}
                                      {" "}
                                      {isUnattempted ? (
                                        "This question was skipped. Omitting questions prevents negative marks deductions (-0 penalty maintained), but identifies a required conceptual review in the syllabus."
                                      ) : q.isCorrect ? (
                                        `The student's answer (${q.userAnswer}) matches the reference answer (${q.correctAnswer}) perfectly. This indicates high precision, solid formulas mastery, and stable execution under standard JEE marking guidelines.`
                                      ) : (
                                        `The student marked option [${q.userAnswer || "N/A"}] while the standard key demands option [${q.correctAnswer}]. This discrepancy highlights either an elimination error, algebra mistake, or a core misunderstanding of the concept.`
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-3.5 border-t border-gray-100 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center space-x-1">
                                      <FileText className="h-3.5 w-3.5 text-indigo-505 text-indigo-500" />
                                      <span>Detailed Academic Solution & Walkthrough</span>
                                    </h4>

                                    {(() => {
                                      const explanationText = q.explanation || "";
                                      let percent = 0;
                                      let statusLabel = "Unavailable";
                                      let barColor = "bg-gray-350 bg-gray-300";
                                      let badgeStyle = "bg-gray-50 text-gray-400 border-gray-150";

                                      if (explanationText.length > 0 && !explanationText.includes("No concept explanation logged") && !explanationText.includes("No specific detailed reference")) {
                                        const len = explanationText.trim().length;
                                        if (len < 35) {
                                          percent = 45;
                                          statusLabel = "Core Concept Outline (45%)";
                                          barColor = "bg-sky-400";
                                          badgeStyle = "bg-sky-50 text-sky-700 border-sky-150";
                                        } else if (len < 80) {
                                          percent = 78;
                                          statusLabel = "Detailed Walkthrough (78%)";
                                          barColor = "bg-teal-500";
                                          badgeStyle = "bg-teal-50 text-teal-700 border-teal-150";
                                        } else {
                                          percent = 100;
                                          statusLabel = "Complete Verified Solution (100%)";
                                          barColor = "bg-emerald-500";
                                          badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-150";
                                        }
                                      } else {
                                        percent = 0;
                                        statusLabel = "Explanation Locked / Unavailable (0%)";
                                        barColor = "bg-slate-250 animate-pulse";
                                        badgeStyle = "bg-slate-50 text-slate-400 border-slate-150";
                                      }

                                      return (
                                        <div className="flex items-center space-x-2.5 shrink-0 select-none">
                                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                                            {statusLabel}
                                          </span>
                                          <div className="w-20 bg-gray-150 rounded-full h-1.5 overflow-hidden border border-gray-200/55">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                                              style={{ width: `${percent}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {!q.isCorrect && !isUnattempted ? (
                                    <div className="space-y-2 bg-rose-50/40 border border-rose-100 rounded-lg p-3.5 dark:bg-rose-950/20 dark:border-rose-900/30">
                                      <p className="text-xs font-medium text-rose-955 dark:text-rose-200 flex items-center">
                                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-450 mr-1.5 shrink-0" />
                                        <span className="font-bold">Diagnostic Concept Gap Analysis:</span>
                                      </p>
                                      <div className="text-xs text-rose-900 dark:text-rose-150 leading-relaxed">
                                        <MathMarkdown content={q.explanation || ""} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-750 dark:text-stone-300 leading-relaxed bg-gray-50/45 p-3.5 rounded-lg border border-gray-100 dark:bg-stone-900/30 dark:border-stone-850">
                                      {q.explanation ? <MathMarkdown content={q.explanation} /> : "No concept explanation logged. Ensure you input explanations metadata during grading."}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* WIDESCREEN INTERACTIVE STUDY DESK OVERLAY */}
      {aiPanelExpanded && activeQuestion && activeTest && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/85 dark:bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-300 animate-in fade-in">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-850 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Desk Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-indigo-500 tracking-widest block font-mono">Widescreen Classroom Workdesk</span>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{activeTest.title}</span>
                    <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-850 dark:text-slate-300 px-2 py-0.5 rounded font-black">
                      Q. {activeQuestion.questionNumber} ({activeQuestion.subject || getSubjectFromTopic(activeQuestion.topic)})
                    </span>
                  </h2>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setAiPanelExpanded(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-205 text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer active:scale-95"
                >
                  Exit Study Desk
                </button>
              </div>
            </div>

            {/* Desk split panes workspace container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 h-full overflow-y-auto lg:overflow-hidden">
              
              {/* LEFT COLUMN: Question & Study details */}
              <div className="lg:col-span-5 p-6 overflow-y-visible lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-150 dark:border-slate-850 space-y-5 bg-stone-50/20 dark:bg-slate-900/30">
                
                {/* Subject Indicator Badge */}
                <div className="flex items-center justify-between gap-2.5">
                  <span className="bg-indigo-600 text-white text-[11px] font-black px-2.5 py-1 rounded-md">
                    {activeQuestion.subject || getSubjectFromTopic(activeQuestion.topic)} • Q. {activeQuestion.subjectIndex || activeQuestion.questionNumber}
                  </span>
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-650 dark:text-slate-350 text-[10px] font-extrabold px-2 py-1 rounded-md">
                    Overall Syllabus Q. {activeQuestion.questionNumber}
                  </span>
                </div>

                {/* Question Card */}
                <div className="p-5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-2xl shadow-3xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-widest block mb-2">Academic Problem Statement</span>
                  <p className="text-sm font-semibold text-gray-855 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                    {activeQuestion.questionText}
                  </p>
                </div>

                {/* Answers & Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider block">Student's Marked Option</span>
                    <span className={`text-xs font-black block ${
                      isQuestionUnattempted(activeQuestion) ? "text-gray-450 italic" :
                      activeQuestion.isCorrect ? "text-emerald-700 dark:text-emerald-405" : "text-rose-700 dark:text-rose-405"
                    }`}>
                      {activeQuestion.userAnswer || "Omitted / Blank"}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-855 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider block">Correct Reference Answer</span>
                    <span className="text-xs font-black text-gray-750 dark:text-slate-300 block">
                      {activeQuestion.correctAnswer || "Not Evaluated"}
                    </span>
                  </div>
                </div>

                {/* Formula sheet guidelines */}
                {activeQuestion.topic && (
                  <div className="bg-amber-50/20 dark:bg-amber-955/10 border border-amber-300/30 dark:border-amber-900/20 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-black text-amber-850 dark:text-amber-400 uppercase tracking-widest flex items-center space-x-1.5">
                      <Lightbulb className="h-4.5 w-4.5 text-amber-500" />
                      <span>Syllabus formulas & references notes</span>
                    </h4>
                    <p className="text-xs text-amber-900/95 dark:text-amber-300 leading-normal font-medium">
                      <strong>Concept focus:</strong> {getSubtopicExplainer(activeQuestion.topic)}
                    </p>
                    <div className="text-[11px] text-amber-955 dark:text-amber-400 space-y-1 leading-relaxed">
                      <ul className="list-disc pl-4 space-y-1 mt-1 font-mono text-[10px]">
                        {activeQuestion.topic.toLowerCase().includes("kinematics") && (
                          <>
                            <li>Equations of Motion: v = u + at ; s = ut + ½at² ; v² = u² + 2as</li>
                            <li>2D Projectile Trajectory: y = x·tanθ - gx² / (2u²cos²θ)</li>
                          </>
                        )}
                        {activeQuestion.topic.toLowerCase().includes("quadratic") && (
                          <>
                            <li>Standard root finder: x = (-b ± √(b² - 4ac)) / (2a)</li>
                            <li>Symmetric relations: α + β = -b/a ; α·β = c/a</li>
                          </>
                        )}
                        {/* Default line */}
                        {(!activeQuestion.topic.toLowerCase().includes("kinematics") && !activeQuestion.topic.toLowerCase().includes("quadratic")) && (
                          <li>Apply standard scientific methodologies and double-check unit dimensions.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Brief solution walkthrough */}
                <div className="space-y-2">
                  <h5 className="text-[10px] uppercase font-extrabold text-gray-400 dark:text-slate-500 tracking-wider flex items-center space-x-1">
                    <FileText className="h-3.5 w-3.5 text-indigo-505 text-indigo-500" />
                    <span>Standard academic derivation explanation</span>
                  </h5>
                  <div className="text-xs text-gray-750 dark:text-slate-300 leading-relaxed bg-white dark:bg-stone-905/70 p-4 rounded-xl border border-gray-150 dark:border-stone-800">
                    {activeQuestion.explanation ? <MathMarkdown content={activeQuestion.explanation} /> : "No solution text registered in the offline database."}
                  </div>
                </div>
                
              </div>
              
              {/* RIGHT COLUMN: Full-Screen AI panel */}
              <div className="lg:col-span-7 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-[500px] lg:min-h-0 h-full">
                <AITutorPanel 
                  question={activeQuestion}
                  testId={activeTest.id}
                  onClose={() => {
                    setAiPanelExpanded(false);
                    setAiPanelOpen(false);
                  }}
                  isExpandedView={true}
                  onToggleExpand={() => setAiPanelExpanded(false)}
                />
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
