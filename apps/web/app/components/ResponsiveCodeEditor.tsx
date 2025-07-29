import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { 
  getMobileEditorConfig, 
  applyMobileTheme, 
  getMobileLanguageConfig 
} from "../lib/mobileEditorThemes";

interface ResponsiveCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme?: string;
  fontSize?: number;
  isCompactMode?: boolean;
  isMobile?: boolean;
  isTouch?: boolean;
  width?: number;
  readonly?: boolean;
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  wordWrap?: boolean;
}

export function ResponsiveCodeEditor({
  value,
  onChange,
  language,
  theme = "vs-dark",
  fontSize = 13,
  isCompactMode = false,
  isMobile = false,
  isTouch = false,
  width = 0,
  readonly = false,
  showLineNumbers,
  showMinimap,
  wordWrap,
}: ResponsiveCodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Calculate responsive font size
  const getResponsiveFontSize = useCallback(() => {
    let baseFontSize = fontSize;
    
    if (isMobile) {
      // Increase base font size for mobile
      baseFontSize = Math.max(14, fontSize);
      
      if (isCompactMode) {
        baseFontSize = Math.max(12, fontSize - 1);
      }
    }
    
    return Math.round(baseFontSize * zoomLevel);
  }, [fontSize, isMobile, isCompactMode, zoomLevel]);

  // Get responsive editor options
  const getEditorOptions = useCallback((): editor.IStandaloneEditorConstructionOptions => {
    // Use mobile-optimized configuration for touch devices
    if (isMobile && isTouch) {
      const mobileConfig = getMobileEditorConfig(
        theme === "vs-dark" ? "dark" : "light",
        isCompactMode,
        getResponsiveFontSize()
      );
      
      const languageConfig = getMobileLanguageConfig(language);
      
      return {
        ...mobileConfig,
        ...languageConfig,
        fontSize: getResponsiveFontSize(),
        readOnly: readonly,
        automaticLayout: true,
        wordWrap: wordWrap !== undefined ? (wordWrap ? "on" : "off") : (isCompactMode ? "on" : "off"),
        minimap: {
          enabled: showMinimap !== undefined ? showMinimap : (!isMobile && !isCompactMode && width > 1024),
        },
        lineNumbers: showLineNumbers !== undefined ? (showLineNumbers ? "on" : "off") : (isCompactMode ? "off" : "on"),
        glyphMargin: showLineNumbers !== undefined ? showLineNumbers : !isCompactMode,
        folding: showLineNumbers !== undefined ? showLineNumbers : !isCompactMode,
        scrollbar: {
          verticalScrollbarSize: 14,
          horizontalScrollbarSize: 14,
          alwaysConsumeMouseWheel: false,
        },
      };
    }
    const baseOptions: editor.IStandaloneEditorConstructionOptions = {
      fontSize: getResponsiveFontSize(),
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
      lineHeight: isMobile ? 1.4 : 1.2,
      readOnly: readonly,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      wordWrap: wordWrap !== undefined ? (wordWrap ? "on" : "off") : (isCompactMode ? "on" : "off"),
      minimap: {
        enabled: showMinimap !== undefined ? showMinimap : (!isMobile && !isCompactMode && width > 1024),
      },
      scrollbar: {
        // Larger scrollbars for touch devices
        verticalScrollbarSize: isTouch ? 14 : 10,
        horizontalScrollbarSize: isTouch ? 14 : 10,
        alwaysConsumeMouseWheel: false,
      },
      overviewRulerLanes: isMobile ? 1 : 3,
      renderLineHighlight: "line",
      selectionHighlight: true,
      occurrencesHighlight: "singleFile",
      renderWhitespace: isCompactMode ? "none" : "selection",
      glyphMargin: showLineNumbers !== undefined ? showLineNumbers : !isCompactMode,
      folding: showLineNumbers !== undefined ? showLineNumbers : !isCompactMode,
      lineNumbers: showLineNumbers !== undefined ? (showLineNumbers ? "on" : "off") : (isCompactMode ? "off" : "on"),
      lineDecorationsWidth: isCompactMode ? 0 : undefined,
      lineNumbersMinChars: isCompactMode ? 0 : 3,
    };

    // Mobile-specific options
    if (isMobile) {
      return {
        ...baseOptions,
        padding: { top: 8, bottom: 8 },
        // Better touch support
        mouseWheelZoom: true,
        fastScrollSensitivity: 2,
        scrollPredominantAxis: true,
        // Optimize for touch
        dragAndDrop: false,
        links: true,
        colorDecorators: false,
        contextmenu: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        // Reduce visual clutter on mobile
        renderValidationDecorations: "on",
        renderIndentGuides: false,
        showFoldingControls: "never",
        matchBrackets: "always",
        bracketPairColorization: {
          enabled: true,
        },
      };
    }

    // Desktop options
    return {
      ...baseOptions,
      padding: { top: 16, bottom: 16 },
      mouseWheelZoom: false,
      dragAndDrop: true,
      renderIndentGuides: true,
      showFoldingControls: "mouseover",
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      bracketPairColorization: {
        enabled: true,
      },
    };
  }, [
    getResponsiveFontSize,
    isMobile,
    isCompactMode,
    isTouch,
    width,
    readonly,
    showLineNumbers,
    showMinimap,
    wordWrap,
    theme,
    language,
  ]);

  // Handle editor mount
  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: unknown) => {
      editorRef.current = editor;
      setIsEditorReady(true);
      
      // Apply mobile theme if on touch device
      if (isMobile && isTouch) {
        applyMobileTheme(monaco as never, theme === "vs-dark" ? "dark" : "light");
      }

      // Focus editor on mobile after mount
      if (isMobile && isTouch) {
        // Small delay to ensure editor is ready
        setTimeout(() => {
          editor.focus();
        }, 100);
      }

      // Add touch-specific event handlers
      if (isTouch) {
        const editorDomNode = editor.getDomNode();
        if (editorDomNode) {
          // Prevent zoom on double tap
          editorDomNode.addEventListener(
            "touchstart",
            (e) => {
              if (e.touches.length > 1) {
                e.preventDefault();
              }
            },
            { passive: false }
          );

          // Handle pinch to zoom
          let lastTouchDistance = 0;
          editorDomNode.addEventListener(
            "touchmove",
            (e) => {
              if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.sqrt(
                  Math.pow(touch2.clientX - touch1.clientX, 2) +
                  Math.pow(touch2.clientY - touch1.clientY, 2)
                );

                if (lastTouchDistance > 0) {
                  const delta = distance - lastTouchDistance;
                  if (Math.abs(delta) > 10) {
                    const newZoom = zoomLevel + (delta > 0 ? 0.1 : -0.1);
                    setZoomLevel(Math.max(0.5, Math.min(2, newZoom)));
                  }
                }
                lastTouchDistance = distance;
              }
            },
            { passive: false }
          );

          editorDomNode.addEventListener("touchend", () => {
            lastTouchDistance = 0;
          });
        }
      }
    },
    [isMobile, isTouch, zoomLevel, theme]
  );

  // Handle value changes
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange]
  );

  // Update editor options when responsive properties change
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      const newOptions = getEditorOptions();
      editorRef.current.updateOptions(newOptions);
    }
  }, [isEditorReady, getEditorOptions]);

  // Handle zoom level changes
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: getResponsiveFontSize(),
      });
    }
  }, [isEditorReady, getResponsiveFontSize, zoomLevel]);

  // Resize editor when container changes
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      // Small delay to ensure container has updated
      const timeoutId = setTimeout(() => {
        editorRef.current?.layout();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isEditorReady, width, isMobile, isCompactMode]);

  return (
    <div className="w-full h-full relative">
      <Editor
        value={value}
        language={language}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={getEditorOptions()}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-gray-500">Carregando editor...</div>
          </div>
        }
      />
      
      {/* Mobile zoom indicator */}
      {isMobile && isTouch && zoomLevel !== 1 && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          Zoom: {Math.round(zoomLevel * 100)}%
        </div>
      )}
    </div>
  );
}