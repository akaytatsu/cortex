import { useRef, useState, useCallback } from "react";
import Prism from "prismjs";

// Import core Prism CSS
import "prismjs/themes/prism-tomorrow.css";

// Import language components
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-php";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";

interface CodeEditorCoreProps {
  content: string;
  language: string;
  onChange: (content: string) => void;
}

interface FoldedLines {
  [key: number]: boolean;
}

export function CodeEditorCore({ content, language, onChange }: CodeEditorCoreProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [foldedLines, setFoldedLines] = useState<FoldedLines>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Highlight code using Prism.js
  const highlightCode = useCallback((code: string, lang: string) => {
    try {
      if (Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], lang);
      }
      return code;
    } catch (error) {
      console.warn("Failed to highlight code:", error);
      return code;
    }
  }, []);

  // Update highlighted code when content or language changes

  // Sync scroll between textarea and pre element
  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return;
    
    const { scrollTop: newScrollTop, scrollLeft: newScrollLeft } = textareaRef.current;
    
    if (newScrollTop !== scrollTop) {
      setScrollTop(newScrollTop);
      if (preRef.current) {
        preRef.current.scrollTop = newScrollTop;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = newScrollTop;
      }
    }
    
    if (newScrollLeft !== scrollLeft) {
      setScrollLeft(newScrollLeft);
      if (preRef.current) {
        preRef.current.scrollLeft = newScrollLeft;
      }
    }
  }, [scrollTop, scrollLeft]);

  // Handle textarea change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Handle tab key for proper indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [content, onChange]);

  // Generate line numbers
  const lines = content.split('\n');
  const lineNumbers = lines.map((_, index) => index + 1);

  // Check if a line can be folded (contains brackets or braces)
  const canFoldLine = useCallback((lineIndex: number) => {
    const line = lines[lineIndex];
    return /[{[]/.test(line) && !/[}\]]/.test(line);
  }, [lines]);

  // Toggle line folding
  const toggleFold = useCallback((lineIndex: number) => {
    setFoldedLines(prev => ({
      ...prev,
      [lineIndex]: !prev[lineIndex]
    }));
  }, []);

  // Generate visible lines (considering folded lines)
  const visibleLines = useCallback(() => {
    const result: string[] = [];
    let skip = 0;

    lines.forEach((line, index) => {
      if (skip > 0) {
        skip--;
        return;
      }

      result.push(line);

      if (foldedLines[index] && canFoldLine(index)) {
        // Find matching closing bracket/brace
        let depth = 0;
        let found = false;
        for (let i = index; i < lines.length; i++) {
          const currentLine = lines[i];
          const openCount = (currentLine.match(/[{[]/g) || []).length;
          const closeCount = (currentLine.match(/[}\]]/g) || []).length;
          
          depth += openCount - closeCount;
          
          if (depth <= 0 && i > index) {
            skip = i - index - 1;
            found = true;
            break;
          }
        }
        
        if (found) {
          result.push('...');
        }
      }
    });

    return result;
  }, [lines, foldedLines, canFoldLine]);

  const visibleContent = visibleLines().join('\n');
  const visibleHighlighted = highlightCode(visibleContent, language);

  return (
    <div className="relative h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="absolute left-0 top-0 w-16 h-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-right select-none"
        style={{ paddingTop: '1rem' }}
      >
        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 leading-relaxed">
          {lineNumbers.map((num, index) => (
            <div
              key={num}
              className="px-2 h-6 flex items-center justify-end relative group"
            >
              <span>{num}</span>
              {canFoldLine(index) && (
                <button
                  onClick={() => toggleFold(index)}
                  className="absolute left-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-opacity"
                  title={foldedLines[index] ? "Expand" : "Fold"}
                >
                  {foldedLines[index] ? '+' : '-'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Code Highlighting Layer */}
      <pre
        ref={preRef}
        className="absolute left-16 top-0 right-0 bottom-0 p-4 text-sm font-mono leading-relaxed overflow-auto pointer-events-none whitespace-pre-wrap break-words"
        style={{
          margin: 0,
          color: 'transparent',
          background: 'transparent',
        }}
        dangerouslySetInnerHTML={{ __html: visibleHighlighted }}
      />

      {/* Editable Textarea */}
      <textarea
        ref={textareaRef}
        data-testid="code-editor-textarea"
        value={content}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="absolute left-16 top-0 right-0 bottom-0 p-4 text-sm font-mono leading-relaxed bg-transparent border-none outline-none resize-none text-gray-800 dark:text-gray-200 caret-gray-800 dark:caret-gray-200 overflow-auto whitespace-pre-wrap break-words"
        style={{
          color: 'transparent',
          background: 'transparent',
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />

      {/* Cursor overlay to make cursor visible */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .code-editor-core textarea::selection {
            background-color: rgba(59, 130, 246, 0.3);
          }
          .code-editor-core textarea::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .code-editor-core textarea::-webkit-scrollbar-track {
            background: transparent;
          }
          .code-editor-core textarea::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.5);
            border-radius: 4px;
          }
          .code-editor-core textarea::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.7);
          }
          .code-editor-core pre::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
    </div>
  );
}