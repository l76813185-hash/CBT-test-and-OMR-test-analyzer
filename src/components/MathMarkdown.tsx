import React from "react";
import Markdown from "react-markdown";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathMarkdownProps {
  content: string;
}

export default function MathMarkdown({ content }: MathMarkdownProps) {
  if (!content) return null;

  // Split on existing math delimiters first (e.g. $$, $, \[, \], \(, \)) 
  // to avoid wrapping already wrapped formulas.
  const delimiterRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^\n$]+?\$)/g;
  const rawSegments = content.split(delimiterRegex);

  const processedSegments = rawSegments.map((segment) => {
    if (!segment) return segment;
    
    // If the segment is already a matched math block, return it as-is
    if (
      (segment.startsWith("$$") && segment.endsWith("$$")) ||
      (segment.startsWith("$") && segment.endsWith("$")) ||
      (segment.startsWith("\\[") && segment.endsWith("\\]")) ||
      (segment.startsWith("\\(") && segment.endsWith("\\)"))
    ) {
      return segment;
    }

    // Identify loose LaTeX formulas (greek letters, orbitals, equations)
    // starting with standard math backslash commands and containing math-like notation
    const looseLaTeXRegex = /\\(?:sigma|pi|alpha|beta|gamma|delta|omega|theta|phi|psi|chi|lambda|mu|nu|tau|eta|rho|zeta|xi|hbar|text|frac|sqrt|partial|nabla|int|sum|pm|mp|le|ge|neq|approx|rightarrow)(?:[a-zA-Z0-9^*_+\-=/{}()\[\]\s,\.]|\\|\\\s)*/gi;

    return segment.replace(looseLaTeXRegex, (match) => {
      let formula = match;
      let trailingPunctuation = "";

      // Exclude trailing punctuation so it doesn't render as part of math
      const punctuationMatch = formula.match(/([\.,;\?\!\s]+)$/);
      if (punctuationMatch) {
        trailingPunctuation = punctuationMatch[1];
        formula = formula.substring(0, formula.length - trailingPunctuation.length);
      }

      if (formula.length <= 1) {
        return match;
      }

      return `$${formula.trim()}$${trailingPunctuation}`;
    });
  });

  const contentWithAutoMath = processedSegments.join("");

  // Standardize multiple variations of LaTeX delimiters to standard $$ and $
  const polishedContent = contentWithAutoMath
    .replaceAll("\\\\[", "$$")
    .replaceAll("\\\\]", "$$")
    .replaceAll("\\\\(", "$")
    .replaceAll("\\\\)", "$")
    .replaceAll("\\[", "$$")
    .replaceAll("\\]", "$$")
    .replaceAll("\\(", "$")
    .replaceAll("\\)", "$");

  // Split content by $$ (block math) and $ (inline math)
  // This regex matches non-escaped $$ ... $$ and $ ... $ blocks
  const parts = polishedContent.split(/(\$\$[\s\S]*?\$\$|\$[^\n$]+?\$)/g);

  return (
    <div className="math-markdown-container select-text font-normal leading-relaxed text-[13.5px]">
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const formula = part.slice(2, -2).trim();
          if (!formula) return null;
          try {
            const html = katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
              trust: true
            });
            return (
              <div
                key={index}
                className="my-3 overflow-x-auto w-full text-center max-w-full py-1 math-block-scroll select-all"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return (
              <code key={index} className="block text-red-500 overflow-x-auto my-2 p-2 bg-rose-50/50 dark:bg-rose-950/30 rounded border border-rose-200/30 text-xs font-mono">
                {formula}
              </code>
            );
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const formula = part.slice(1, -1).trim();
          if (!formula) return null;
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
              trust: true
            });
            return (
              <span
                key={index}
                className="inline-block mx-1 align-baseline select-all"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return (
              <code key={index} className="px-1.5 py-0.5 text-rose-500 bg-rose-50/50 dark:bg-rose-950/30 rounded text-xs font-mono">
                {formula}
              </code>
            );
          }
        } else {
          // It's a text segment. We render it with react-markdown so headings, bold, standard spacing look beautiful.
          // To ensure it stays inline when adjacent to inline formulas, we render using a span wrapper for paragraphs.
          return (
            <span key={index} className="markdown-inline-range">
              <Markdown
                components={{
                  p: ({ children }) => <span className="inline leading-relaxed select-text">{children}</span>,
                  // Maintain links, lists, code styles
                  code: ({ children, className }) => (
                    <code className={`${className || ""} px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 text-[11px] font-mono font-medium text-pink-600 dark:text-pink-400`}>
                      {children}
                    </code>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 block">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 block">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed text-[13px]">{children}</li>,
                }}
              >
                {part}
              </Markdown>
            </span>
          );
        }
      })}
    </div>
  );
}
