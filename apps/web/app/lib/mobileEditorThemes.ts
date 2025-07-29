import type { editor } from "monaco-editor";

// Mobile-optimized theme configurations for better readability on small screens
export const mobileDarkTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Enhanced contrast for keywords
    { token: "keyword", foreground: "#FF6B9D", fontStyle: "bold" },
    { token: "keyword.control", foreground: "#FF6B9D", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "#FF6B9D" },
    
    // Brighter colors for strings with better contrast
    { token: "string", foreground: "#98E4A0" },
    { token: "string.quoted", foreground: "#98E4A0" },
    { token: "string.regexp", foreground: "#A8E6CF" },
    
    // Enhanced comment visibility
    { token: "comment", foreground: "#7A8B99", fontStyle: "italic" },
    { token: "comment.line", foreground: "#7A8B99", fontStyle: "italic" },
    { token: "comment.block", foreground: "#7A8B99", fontStyle: "italic" },
    
    // Better number visibility
    { token: "number", foreground: "#FFD93D", fontStyle: "bold" },
    { token: "number.float", foreground: "#FFD93D", fontStyle: "bold" },
    { token: "number.hex", foreground: "#FFE66D", fontStyle: "bold" },
    
    // Enhanced function names
    { token: "entity.name.function", foreground: "#6BCF7F", fontStyle: "bold" },
    { token: "support.function", foreground: "#6BCF7F" },
    
    // Better type visibility
    { token: "entity.name.type", foreground: "#4ECDC4", fontStyle: "bold" },
    { token: "support.type", foreground: "#4ECDC4" },
    { token: "storage.type", foreground: "#4ECDC4", fontStyle: "bold" },
    
    // Enhanced variable names
    { token: "variable", foreground: "#E8E8E8" },
    { token: "variable.parameter", foreground: "#FFB347" },
    { token: "variable.other", foreground: "#E8E8E8" },
    
    // Better operator visibility
    { token: "punctuation.definition", foreground: "#FF8A80" },
    { token: "punctuation.separator", foreground: "#FF8A80" },
    { token: "punctuation.terminator", foreground: "#FF8A80" },
    
    // Enhanced constants
    { token: "constant", foreground: "#FFAB91", fontStyle: "bold" },
    { token: "constant.language", foreground: "#FFAB91", fontStyle: "bold" },
    { token: "constant.numeric", foreground: "#FFD93D", fontStyle: "bold" },
    
    // Better class/tag names
    { token: "entity.name.tag", foreground: "#FF8A65", fontStyle: "bold" },
    { token: "entity.name.class", foreground: "#81C784", fontStyle: "bold" },
    
    // Enhanced attributes
    { token: "entity.other.attribute-name", foreground: "#64B5F6" },
    
    // Better error highlighting
    { token: "invalid", foreground: "#FF5252", fontStyle: "bold" },
    { token: "invalid.illegal", foreground: "#FF5252", background: "#3D1A00" },
  ],
  colors: {
    // Enhanced background contrast
    "editor.background": "#1A1A1A",
    "editor.foreground": "#E8E8E8",
    
    // Better selection colors for touch
    "editor.selectionBackground": "#264F78AA",
    "editor.selectionHighlightBackground": "#ADD6FF26",
    "editor.inactiveSelectionBackground": "#3A3D41",
    
    // Enhanced line highlighting
    "editor.lineHighlightBackground": "#2A2A2A",
    "editor.lineHighlightBorder": "#00000000",
    
    // Better cursor visibility
    "editorCursor.foreground": "#FFFFFF",
    "editorCursor.background": "#1A1A1A",
    
    // Enhanced gutter
    "editorLineNumber.foreground": "#666666",
    "editorLineNumber.activeForeground": "#FFFFFF",
    "editorGutter.background": "#1A1A1A",
    
    // Better scrollbar for touch
    "scrollbar.shadow": "#000000",
    "scrollbarSlider.background": "#79797966",
    "scrollbarSlider.hoverBackground": "#646464B3",
    "scrollbarSlider.activeBackground": "#BFBFBF66",
    
    // Enhanced find/replace
    "editor.findMatchBackground": "#515C6A",
    "editor.findMatchHighlightBackground": "#EA5C0055",
    "editor.findRangeHighlightBackground": "#3A3D4166",
    
    // Better bracket matching
    "editorBracketMatch.background": "#0064001A",
    "editorBracketMatch.border": "#888888",
    
    // Enhanced minimap (when enabled)
    "minimap.background": "#1A1A1A",
    "minimap.selectionHighlight": "#264F78",
    
    // Better widget backgrounds
    "editorWidget.background": "#252526",
    "editorWidget.border": "#454545",
    "editorWidget.foreground": "#CCCCCC",
    
    // Enhanced hover widget
    "editorHoverWidget.background": "#252526",
    "editorHoverWidget.border": "#454545",
    "editorHoverWidget.foreground": "#CCCCCC",
    
    // Better suggest widget
    "editorSuggestWidget.background": "#252526",
    "editorSuggestWidget.border": "#454545",
    "editorSuggestWidget.foreground": "#CCCCCC",
    "editorSuggestWidget.selectedBackground": "#094771",
  }
};

export const mobileLightTheme: editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    // Enhanced contrast for keywords
    { token: "keyword", foreground: "#0066CC", fontStyle: "bold" },
    { token: "keyword.control", foreground: "#0066CC", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "#0066CC" },
    
    // Better string contrast
    { token: "string", foreground: "#008000", fontStyle: "bold" },
    { token: "string.quoted", foreground: "#008000", fontStyle: "bold" },
    { token: "string.regexp", foreground: "#006600" },
    
    // Enhanced comment readability
    { token: "comment", foreground: "#666666", fontStyle: "italic" },
    { token: "comment.line", foreground: "#666666", fontStyle: "italic" },
    { token: "comment.block", foreground: "#666666", fontStyle: "italic" },
    
    // Better number visibility
    { token: "number", foreground: "#B8860B", fontStyle: "bold" },
    { token: "number.float", foreground: "#B8860B", fontStyle: "bold" },
    { token: "number.hex", foreground: "#8B4513", fontStyle: "bold" },
    
    // Enhanced function names
    { token: "entity.name.function", foreground: "#795548", fontStyle: "bold" },
    { token: "support.function", foreground: "#795548" },
    
    // Better type visibility
    { token: "entity.name.type", foreground: "#2E7D32", fontStyle: "bold" },
    { token: "support.type", foreground: "#2E7D32" },
    { token: "storage.type", foreground: "#2E7D32", fontStyle: "bold" },
    
    // Enhanced variable names
    { token: "variable", foreground: "#000000" },
    { token: "variable.parameter", foreground: "#8D6E63" },
    { token: "variable.other", foreground: "#000000" },
    
    // Better operator visibility
    { token: "punctuation.definition", foreground: "#D32F2F" },
    { token: "punctuation.separator", foreground: "#D32F2F" },
    { token: "punctuation.terminator", foreground: "#D32F2F" },
    
    // Enhanced constants
    { token: "constant", foreground: "#FF6F00", fontStyle: "bold" },
    { token: "constant.language", foreground: "#FF6F00", fontStyle: "bold" },
    { token: "constant.numeric", foreground: "#B8860B", fontStyle: "bold" },
    
    // Better class/tag names
    { token: "entity.name.tag", foreground: "#E65100", fontStyle: "bold" },
    { token: "entity.name.class", foreground: "#388E3C", fontStyle: "bold" },
    
    // Enhanced attributes
    { token: "entity.other.attribute-name", foreground: "#1976D2" },
    
    // Better error highlighting
    { token: "invalid", foreground: "#CD3131", fontStyle: "bold" },
    { token: "invalid.illegal", foreground: "#CD3131", background: "#FFE6E6" },
  ],
  colors: {
    // Enhanced background
    "editor.background": "#FFFFFF",
    "editor.foreground": "#000000",
    
    // Better selection for touch
    "editor.selectionBackground": "#ADD6FF",
    "editor.selectionHighlightBackground": "#E1F5FE",
    "editor.inactiveSelectionBackground": "#E5E5E5",
    
    // Enhanced line highlighting
    "editor.lineHighlightBackground": "#F5F5F5",
    "editor.lineHighlightBorder": "#00000000",
    
    // Better cursor visibility
    "editorCursor.foreground": "#000000",
    "editorCursor.background": "#FFFFFF",
    
    // Enhanced gutter
    "editorLineNumber.foreground": "#999999",
    "editorLineNumber.activeForeground": "#000000",
    "editorGutter.background": "#FFFFFF",
    
    // Better scrollbar for touch
    "scrollbar.shadow": "#DDDDDD",
    "scrollbarSlider.background": "#79797966",
    "scrollbarSlider.hoverBackground": "#646464B3",
    "scrollbarSlider.activeBackground": "#BFBFBF66",
    
    // Enhanced find/replace
    "editor.findMatchBackground": "#A8AC94",
    "editor.findMatchHighlightBackground": "#EA5C0055",
    "editor.findRangeHighlightBackground": "#B4B4B466",
    
    // Better bracket matching
    "editorBracketMatch.background": "#0064001A",
    "editorBracketMatch.border": "#888888",
    
    // Enhanced minimap
    "minimap.background": "#FFFFFF",
    "minimap.selectionHighlight": "#ADD6FF",
    
    // Better widget backgrounds
    "editorWidget.background": "#F3F3F3",
    "editorWidget.border": "#C8C8C8",
    "editorWidget.foreground": "#000000",
    
    // Enhanced hover widget
    "editorHoverWidget.background": "#F3F3F3",
    "editorHoverWidget.border": "#C8C8C8",
    "editorHoverWidget.foreground": "#000000",
    
    // Better suggest widget
    "editorSuggestWidget.background": "#F3F3F3",
    "editorSuggestWidget.border": "#C8C8C8",
    "editorSuggestWidget.foreground": "#000000",
    "editorSuggestWidget.selectedBackground": "#0078D4",
  }
};

// Mobile-specific editor configuration for better syntax highlighting
export const getMobileEditorConfig = (
  theme: "light" | "dark" = "dark",
  isCompact: boolean = false,
  fontSize: number = 14
): editor.IStandaloneEditorConstructionOptions => {
  return {
    // Enhanced font settings for mobile
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
    fontSize: Math.max(12, fontSize),
    fontWeight: "400",
    lineHeight: isCompact ? 1.3 : 1.5,
    letterSpacing: 0.5,
    
    // Better syntax highlighting settings
    colorDecorators: true,
    bracketPairColorization: {
      enabled: true,
    },
    matchBrackets: "always",
    
    // Enhanced selection and highlighting
    selectionHighlight: true,
    occurrencesHighlight: "singleFile",
    renderWhitespace: isCompact ? "none" : "boundary",
    renderControlCharacters: false,
    renderIndentGuides: !isCompact,
    highlightActiveIndentGuide: !isCompact,
    
    // Better line styling
    renderLineHighlight: "all",
    renderLineHighlightOnlyWhenFocus: false,
    
    // Enhanced cursor settings
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    cursorWidth: 2,
    
    // Better semantic highlighting
    "semanticHighlighting.enabled": true,
    
    // Mobile-optimized folding
    showFoldingControls: isCompact ? "never" : "mouseover",
    foldingStrategy: "indentation",
    foldingHighlight: true,
    unfoldOnClickAfterEndOfLine: true,
    
    // Enhanced error and warning display
    renderValidationDecorations: "on",
    
    // Better performance for mobile
    suggest: {
      showIcons: true,
      showStatusBar: true,
      preview: true,
      previewMode: "prefix",
    },
    
    // Mobile-friendly hover
    hover: {
      enabled: true,
      delay: 300,
      sticky: true,
    },
    
    // Better find widget
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: "never",
      seedSearchStringFromSelection: "always",
    },
    
    // Enhanced scrolling
    smoothScrolling: true,
    mouseWheelScrollSensitivity: 1,
    fastScrollSensitivity: 5,
  };
};

// Function to apply mobile theme to Monaco editor
export const applyMobileTheme = (monaco: any, theme: "light" | "dark" = "dark") => {
  if (theme === "dark") {
    monaco.editor.defineTheme("mobile-dark", mobileDarkTheme);
    monaco.editor.setTheme("mobile-dark");
  } else {
    monaco.editor.defineTheme("mobile-light", mobileLightTheme);
    monaco.editor.setTheme("mobile-light");
  }
};

// Language-specific configurations for better mobile readability
export const getMobileLanguageConfig = (language: string) => {
  const baseConfig = {
    tabSize: 2,
    insertSpaces: true,
    trimAutoWhitespace: true,
    autoIndent: "full" as const,
  };

  switch (language) {
    case "javascript":
    case "typescript":
    case "jsx":
    case "tsx":
      return {
        ...baseConfig,
        tabSize: 2,
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: "always" as const,
        autoClosingQuotes: "always" as const,
        autoSurround: "languageDefined" as const,
      };
    
    case "python":
      return {
        ...baseConfig,
        tabSize: 4,
        insertSpaces: true,
        trimAutoWhitespace: true,
      };
    
    case "css":
    case "scss":
    case "less":
      return {
        ...baseConfig,
        tabSize: 2,
        autoClosingBrackets: "always" as const,
        colorDecorators: true,
      };
    
    case "html":
      return {
        ...baseConfig,
        tabSize: 2,
        autoClosingBrackets: "always" as const,
        autoClosingQuotes: "always" as const,
        formatOnType: true,
      };
    
    case "json":
      return {
        ...baseConfig,
        tabSize: 2,
        formatOnType: true,
        autoClosingBrackets: "always" as const,
      };
    
    default:
      return baseConfig;
  }
};