import React, { useState, useEffect, useRef } from "react";
import MathMarkdown from "./MathMarkdown";
import { 
  Sparkles, RefreshCw, Send, User, Maximize2, Minimize2, Trash2, Info 
} from "lucide-react";
import { QuestionAnalysis } from "../types";

interface AITutorPanelProps {
  question: QuestionAnalysis;
  testId: string;
  onClose: () => void;
  isExpandedView?: boolean;
  onToggleExpand?: () => void;
}

export default function AITutorPanel({ 
  question, 
  testId, 
  onClose, 
  isExpandedView = false, 
  onToggleExpand 
}: AITutorPanelProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  // Status state for configured keys
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  
  // Font size state: sm, md, lg
  const [tutorFontSize, setTutorFontSize] = useState<"sm" | "md" | "lg">("md");
  // Multi-model selection under Gemini
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-3.5-flash");
  const [showModelInfo, setShowModelInfo] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive the history cache key based on selected models to avoid bleed over
  const getHistoryKey = () => {
    return `tutor_chat_${testId}_${question.questionNumber}_${provider}_${provider === "gemini" ? selectedGeminiModel : "default"}`;
  };

  // Fetch API status on mount to check which keys are configured
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const resp = await fetch("/api/status");
        if (resp.ok) {
          const data = await resp.json();
          setHasGeminiKey(!!data.hasGeminiKey);
          setHasOpenAIKey(!!data.hasOpenAIKey);
          
          // Auto-select OpenAI if Gemini is missing but OpenAI is configured
          if (!data.hasGeminiKey && data.hasOpenAIKey) {
            setProvider("openai");
          }
        }
      } catch (err) {
        console.error("Failed to fetch API key activation status:", err);
      }
    };
    fetchStatus();
  }, []);

  // Auto-scroll chat area
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiLoading, chatLoading]);

  // Trigger the initial comprehensive solution walkthrough
  const triggerAiWalkthrough = async (targetProvider?: "gemini" | "openai") => {
    const activeProvider = targetProvider || provider;
    setAiLoading(true);
    setAiExplanation(null);
    setChatMessages([]);
    try {
      const resp = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: question.questionText,
          userAnswer: question.userAnswer,
          correctAnswer: question.correctAnswer,
          topic: question.topic,
          explanation: question.explanation,
          provider: activeProvider,
          model: activeProvider === "gemini" ? selectedGeminiModel : undefined,
        }),
      });
      if (!resp.ok) {
        throw new Error("Academic Solver API failed");
      }
      const data = await resp.json();
      setAiExplanation(data.text);
      setChatMessages([{ role: "model", text: data.text }]);
    } catch (err) {
      console.error(err);
      const errText = `Error: Failed to fetch the detailed step-by-step solution from the academic AI. Please ensure your backend is correctly configured with a valid ${
        activeProvider === "openai" ? "OPENAI_API_KEY value" : "GEMINI_API_KEY value"
      } in the Secrets panel.`;
      setAiExplanation(errText);
      setChatMessages([{ role: "model", text: errText }]);
    } finally {
      setAiLoading(false);
    }
  };

  // PERSISTENT CHAT HISTORY LOADER
  useEffect(() => {
    if (!testId || !question) return;
    const key = getHistoryKey();
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chatMessages && parsed.chatMessages.length > 0) {
          setAiExplanation(parsed.explanation || null);
          setChatMessages(parsed.chatMessages);
          setAiLoading(false);
          return; // Instantaneous load - Bypass walkthrough request
        }
      }
    } catch (e) {
      console.error("Failed to restore cached tutor memory logs:", e);
    }
    
    // Fallback: No cache has been initialized before
    triggerAiWalkthrough();
  }, [question, testId, provider, selectedGeminiModel]);

  // PERSISTENT CHAT HISTORY SAVER
  useEffect(() => {
    if (!testId || !question || chatMessages.length === 0) return;
    const key = getHistoryKey();
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          explanation: aiExplanation,
          chatMessages,
        })
      );
    } catch (e) {
      console.error("Failed to commit tutor memory records:", e);
    }
  }, [chatMessages, aiExplanation, testId, question, provider, selectedGeminiModel]);

  const handleProviderChange = (newProvider: "gemini" | "openai") => {
    if (newProvider === provider) return;
    setProvider(newProvider);
    // Walkthrough will be re-run inside loader's useEffect
  };

  const handleResetChat = () => {
    if (!testId || !question) return;
    const key = getHistoryKey();
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to flush session memory from storage:", e);
    }
    setChatMessages([]);
    setAiExplanation(null);
    triggerAiWalkthrough();
  };

  // Send interactive follow-up question
  const sendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || followUpInput).trim();
    if (!text || chatLoading) return;
    
    if (!textToSend) {
      setFollowUpInput("");
    }
    
    setChatLoading(true);
    const updatedMessages = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(updatedMessages);

    try {
      const resp = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: question.questionText,
          userAnswer: question.userAnswer,
          correctAnswer: question.correctAnswer,
          topic: question.topic,
          explanation: question.explanation,
          chatHistory: chatMessages,
          message: text,
          provider: provider,
          model: provider === "gemini" ? selectedGeminiModel : undefined,
        }),
      });
      if (!resp.ok) {
        throw new Error("Chat tutor API failed");
      }
      const data = await resp.json();
      setChatMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (e) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: `Tutor error: Unable to contact your academic mentor utilizing ${provider === "openai" ? "GPT" : "Gemini"}. Please double-check connection settings.` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMessageText = (text: string) => {
    const sizeClasses = 
      tutorFontSize === "sm" 
        ? "text-[11px] leading-relaxed space-y-2.5" 
        : tutorFontSize === "lg" 
          ? "text-sm md:text-base leading-relaxed space-y-5" 
          : "text-xs md:text-[13.5px] leading-relaxed space-y-3.5";

    if (text.includes("<think>") && text.includes("</think>")) {
      const thinkStart = text.indexOf("<think>");
      const thinkEnd = text.indexOf("</think>", thinkStart);
      if (thinkStart !== -1 && thinkEnd !== -1) {
        const thinkingContent = text.substring(thinkStart + 7, thinkEnd).trim();
        const actualResponse = text.substring(thinkEnd + 8).trim();

        return (
          <div className="space-y-4 select-text">
            <details open className="group bg-indigo-50/10 dark:bg-stone-900/60 border border-stone-200/45 dark:border-stone-800/80 rounded-xl p-3 animate-in fade-in duration-200">
              <summary className="font-mono text-[9px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer select-none list-none flex items-center justify-between">
                <span className="flex items-center gap-1.5 leading-normal">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span>DeepSeek-R1 Chain of Thought ({thinkingContent.length} chars)</span>
                </span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform duration-150 font-extrabold select-none">
                  ▼
                </span>
              </summary>
              <div className="mt-2 text-[10.5px] font-mono leading-relaxed text-slate-500 dark:text-slate-400 border-t border-stone-200/40 dark:border-stone-800/60 pt-2 whitespace-pre-wrap select-text max-h-[180px] overflow-y-auto w-full">
                {thinkingContent}
              </div>
            </details>
            <div className={`select-text text-stone-800 dark:text-stone-200 ${sizeClasses}`}>
              <MathMarkdown content={actualResponse} />
            </div>
          </div>
        );
      }
    }

    return (
      <div className={`select-text text-stone-800 dark:text-stone-200 ${sizeClasses}`}>
        <MathMarkdown content={text} />
      </div>
    );
  };

  return (
    <div className={`flex flex-col transition-all duration-300 min-h-0 ${
      isExpandedView 
        ? "h-full bg-transparent border-none p-4 md:p-6 pb-2" 
        : "h-[585px] sm:h-[650px] bg-white/75 dark:bg-[#151312]/80 backdrop-blur-md border border-stone-250/50 dark:border-stone-800/80 rounded-2xl shadow-xl p-4 animate-in slide-in-from-right duration-300"
    }`}>
      {/* Drawer Header */}
      <div className={`flex items-center justify-between pb-3 shrink-0 ${isExpandedView ? "px-1 border-b border-stone-200/40 dark:border-stone-800/50" : "border-b border-stone-200/40 dark:border-stone-800/50"}`}>
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#FAF7F0] dark:ring-stone-950" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <span>1-on-1 Academic AI Tutor</span>
              {testId && (
                <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none">
                  Memory Active
                </span>
              )}
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-slate-450">Ask formulas, derivations & shortcuts</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Custom Font Sizing Controls ("A-", "A", "A+") */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setTutorFontSize("sm")}
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                tutorFontSize === "sm"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                  : "text-gray-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Compact font"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setTutorFontSize("md")}
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                tutorFontSize === "md"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                  : "text-gray-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Normal size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setTutorFontSize("lg")}
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                tutorFontSize === "lg"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                  : "text-gray-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Spacious text layout"
            >
              A+
            </button>
          </div>

          {/* Reset Memory Session Button */}
          {chatMessages.length > 0 && (
            <button
              onClick={handleResetChat}
              type="button"
              className="p-1.5 text-slate-400 hover:text-rose-505 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              title="Reset Chat & Clear Session Memory"
              aria-label="Reset academic chat history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Toggle Expand Panel Button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              type="button"
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 border border-indigo-100 dark:border-indigo-900/50"
              title={isExpandedView ? "Minimize Study Desk (Zoom Out) to Split Screen" : "Maximize to Full-Screen Desk"}
              aria-label="Toggle widescreen layout workspace"
            >
              {isExpandedView ? (
                <>
                  <Minimize2 className="h-3 w-3 text-indigo-500" />
                  <span>Zoom Out</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3 text-indigo-500" />
                  <span>Full Screen</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            type="button"
            className="text-[10px] uppercase font-black text-slate-400 hover:text-slate-705 hover:text-slate-700 px-2.5 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer select-none"
          >
            {isExpandedView ? "Exit Desk" : "Hide"}
          </button>
        </div>
      </div>

      {/* Provider Selector Row */}
      {(hasGeminiKey || hasOpenAIKey) && (
        <div className={`flex items-center justify-between py-1.5 px-2.5 mt-2.5 text-[10px] shrink-0 ${
          isExpandedView 
            ? "bg-indigo-50/15 dark:bg-indigo-950/15 border border-indigo-100/30 rounded-xl" 
            : "bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/40 dark:border-indigo-900/30 rounded-xl"
        }`}>
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[8.5px]">Tutor Brain</span>
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleProviderChange("gemini")}
              className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition-all cursor-pointer ${
                provider === "gemini"
                  ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-2xs font-black"
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-800/40 text-slate-500"
              }`}
            >
              Gemini Models & Reasoners
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange("openai")}
              className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition-all cursor-pointer ${
                provider === "openai"
                  ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-2xs font-black"
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-800/40 text-slate-500"
              }`}
            >
              GPT Model
            </button>
          </div>
        </div>
      )}

      {/* Gemini Models Dropdown - Only shown when Gemini provider is active */}
      {provider === "gemini" && (
        <div className="flex flex-col shrink-0">
          <div className={`mt-2 flex items-center justify-between py-1.5 px-2.5 text-[10px] ${
            isExpandedView 
              ? "bg-[#FAF7F0]/40 dark:bg-stone-900/40 border border-[#E6E1D5]/40 dark:border-stone-800/40 rounded-xl" 
              : "bg-[#FAF7F0]/65 dark:bg-stone-900/65 border border-[#E6E1D5]/50 dark:border-stone-800/50 rounded-xl"
          }`}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-[8px]">Advanced AI Models</span>
              <button
                type="button"
                onClick={() => setShowModelInfo(!showModelInfo)}
                className={`p-1 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-850 transition-colors cursor-pointer flex items-center justify-center ${
                  showModelInfo ? "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-stone-950" : "text-stone-450 dark:text-stone-400"
                }`}
                title="Syllabus model guidelines & boundaries"
                aria-label="Toggle model details explanation grid"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <select
              value={selectedGeminiModel}
              onChange={(e) => {
                setSelectedGeminiModel(e.target.value);
                setChatMessages([]);
                setAiExplanation(null);
              }}
              className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-2 py-1 text-[9px] font-black text-indigo-650 dark:text-indigo-400 focus:outline-hidden cursor-pointer"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default - Free/Unlimited)</option>
              <option value="deepseek-r1">DeepSeek-R1 (CoT Multi-Chain Thinking)</option>
              <option value="ollama">Ollama Sandbox (Local Logic Engine)</option>
              <option value="gemini-3.1-pro">Gemini 3.1 Pro (Heavy Academic Rigor)</option>
            </select>
          </div>

          {/* Educational model guidelines and boundaries popover */}
          {showModelInfo && (
            <div className="mt-2 p-3 bg-white/70 dark:bg-[#1C1A19]/80 backdrop-blur-md border border-stone-200/50 dark:border-stone-850 rounded-xl text-[10.5px] text-stone-700 dark:text-stone-300 space-y-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 select-none">
              <div className="flex items-center justify-between border-b border-stone-150 dark:border-stone-800/50 pb-1.5">
                <span className="font-extrabold text-[#9333EA] dark:text-[#A855F7] tracking-wider uppercase text-[9px] flex items-center gap-1">
                  <span>🎓 Model Recommendations & Limits</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowModelInfo(false)}
                  className="text-[9px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-extrabold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 px-1.5 py-0.5 rounded"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 mx-0.5">
                <div className="p-2 bg-[#FDFBF7] dark:bg-stone-950/40 rounded-lg border border-[#F1EBE0] dark:border-stone-800/30">
                  <span className="font-extrabold text-stone-900 dark:text-stone-100 text-[10px]">⚡ Gemini 3.5 Flash (Default)</span>
                  <p className="text-stone-500 dark:text-stone-400 mt-0.5 text-[9.5px] leading-relaxed">
                    <strong>Best For:</strong> Instantly clearing general definitions, speed Q&A, and basic steps. Free from any rate limits.
                    <br />
                    <strong>Limits:</strong> May occasionally simplify highly intensive theoretical calculus derivations.
                  </p>
                </div>

                <div className="p-2 bg-[#FDFBF7] dark:bg-stone-950/40 rounded-lg border border-[#F1EBE0] dark:border-stone-800/30">
                  <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-[10px]">🧠 DeepSeek-R1 (CoT Multi-Chain)</span>
                  <p className="text-stone-500 dark:text-stone-400 mt-0.5 text-[9.5px] leading-relaxed">
                    <strong>Best For:</strong> Ultimate Physics derivations, rigorous Chemistry reaction proofs, and advanced coordinate Geometry equations with an extensive interactive "Thinking Trace".
                    <br />
                    <strong>Limits:</strong> Requires slightly higher draft latency (+5s) to generate its rich thinking logs.
                  </p>
                </div>

                <div className="p-2 bg-[#FDFBF7] dark:bg-stone-950/40 rounded-lg border border-[#F1EBE0] dark:border-stone-800/30">
                  <span className="font-extrabold text-[#D97706] dark:text-amber-400 text-[10px]">📚 Gemini 3.1 Pro (Heavy Rigor)</span>
                  <p className="text-stone-500 dark:text-stone-400 mt-0.5 text-[9.5px] leading-relaxed">
                    <strong>Best For:</strong> Complex multi-concept exam questions, physical chemistry stoichiometry integrations, and highly structured layout walkthroughs.
                    <br />
                    <strong>Limits:</strong> Standard output speeds; recommended for high-difficulty questions only.
                  </p>
                </div>

                <div className="p-2 bg-[#FDFBF7] dark:bg-stone-950/40 rounded-lg border border-[#F1EBE0] dark:border-stone-800/30">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[10px]">⚙️ Ollama Sandbox (Local Logic Engine)</span>
                  <p className="text-stone-500 dark:text-stone-400 mt-0.5 text-[9.5px] leading-relaxed">
                    <strong>Best For:</strong> Computer Science topics, logical math calculations, flowcharts, and offline code-compilation queries.
                    <br />
                    <strong>Limits:</strong> Expressive tone is more dry and technical; best for objective, non-narrative checks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages Scroll */}
      <div className={`flex-1 overflow-y-auto mt-3 py-2 space-y-4 pr-1 text-xs ${isExpandedView ? "px-2" : ""}`}>
        {aiLoading ? (
          <div className="space-y-4 py-6 select-none">
            <div className="flex items-center space-x-2.5 text-indigo-600 dark:text-indigo-400 text-[10.5px] font-bold animate-pulse">
              <RefreshCw className="h-4.5 w-4.5 animate-spin" />
              <span>AI Tutor is drafting complete academic response...</span>
            </div>
            <div className="space-y-2.5 mt-2">
              <div className="h-3 bg-gray-200 dark:bg-slate-850 rounded-md w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-slate-850 rounded-md w-11/12 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-slate-850 rounded-md w-5/6 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-slate-850 rounded-md w-2/3 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex space-x-2.5 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-300 flex items-center justify-center shrink-0 font-extrabold text-[10.5px] select-none border border-indigo-150/40 dark:border-indigo-900/30 shadow-3xs">
                    AI
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-3xs text-[11px] font-medium"
                      : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-2xs text-[11px] leading-relaxed select-text"
                  } ${isExpandedView ? "max-w-[90%]" : "max-w-[85%]"}`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-line font-semibold">{msg.text}</p>
                  ) : (
                    renderMessageText(msg.text)
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 flex items-center justify-center shrink-0 font-bold text-xs select-none shadow-3xs">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex space-x-2.5 items-start justify-start select-none animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-605 dark:text-indigo-300 flex items-center justify-center shrink-0 font-extrabold text-[10.5px] border border-indigo-150/40 dark:border-indigo-900/30 shadow-3xs">
                  AI
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl rounded-tl-none shadow-3xs text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-2 leading-normal">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>Tutor is formulating conceptual walkthrough...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Suggestion Shortcuts & Footer Input */}
      {!aiLoading && (
        <div className={`border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0 ${isExpandedView ? "px-1 pt-3.5 pb-2 ml-1" : "pt-3.5"}`}>
          {/* Quick Click Prompts */}
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-0.5">
            <button
              onClick={() => sendChatMessage("Derive the step-by-step formula for this question.")}
              disabled={chatLoading}
              className="px-2.5 py-1 bg-white dark:bg-slate-950 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer disabled:opacity-40"
            >
              Derive formulas
            </button>
            <button
              onClick={() => sendChatMessage("Explain the physical meaning/concepts behind this topic.")}
              disabled={chatLoading}
              className="px-2.5 py-1 bg-white dark:bg-slate-950 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer disabled:opacity-40"
            >
              Explain terms
            </button>
            <button
              onClick={() => sendChatMessage("Give me a similar practice problem to solve with answers.")}
              disabled={chatLoading}
              className="px-2.5 py-1 bg-white dark:bg-slate-950 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer disabled:opacity-40"
            >
              Practice problem
            </button>
            <button
              onClick={() => sendChatMessage("What are the potential traps or typical conceptual errors students make on this exact topic?")}
              disabled={chatLoading}
              className="px-2.5 py-1 bg-white dark:bg-slate-950 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer disabled:opacity-40"
            >
              Avoid mistakes
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask follow-up question..."
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendChatMessage();
                }
              }}
              disabled={chatLoading}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-gray-400 focus:outline-hidden focus:border-indigo-505 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => sendChatMessage()}
              disabled={!followUpInput.trim() || chatLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 active:scale-95 transition-all text-xs font-bold cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
