import { describe, it, expect } from "vitest";
import { 
  mobileDarkTheme, 
  mobileLightTheme, 
  getMobileEditorConfig, 
  getMobileLanguageConfig 
} from "./mobileEditorThemes";

describe("mobileEditorThemes", () => {
  describe("mobileDarkTheme", () => {
    it("should have correct base theme", () => {
      expect(mobileDarkTheme.base).toBe("vs-dark");
      expect(mobileDarkTheme.inherit).toBe(true);
    });

    it("should have enhanced syntax highlighting rules", () => {
      expect(mobileDarkTheme.rules).toBeDefined();
      expect(Array.isArray(mobileDarkTheme.rules)).toBe(true);
      expect(mobileDarkTheme.rules.length).toBeGreaterThan(0);
      
      // Check for key syntax elements
      const keywordRule = mobileDarkTheme.rules.find(rule => rule.token === "keyword");
      expect(keywordRule).toBeDefined();
      expect(keywordRule?.fontStyle).toBe("bold");
      
      const stringRule = mobileDarkTheme.rules.find(rule => rule.token === "string");
      expect(stringRule).toBeDefined();
      expect(stringRule?.foreground).toBeDefined();
    });

    it("should have mobile-optimized colors", () => {
      expect(mobileDarkTheme.colors).toBeDefined();
      expect(mobileDarkTheme.colors["editor.background"]).toBe("#1A1A1A");
      expect(mobileDarkTheme.colors["editor.foreground"]).toBe("#E8E8E8");
      expect(mobileDarkTheme.colors["editorCursor.foreground"]).toBe("#FFFFFF");
    });
  });

  describe("mobileLightTheme", () => {
    it("should have correct base theme", () => {
      expect(mobileLightTheme.base).toBe("vs");
      expect(mobileLightTheme.inherit).toBe(true);
    });

    it("should have enhanced syntax highlighting rules", () => {
      expect(mobileLightTheme.rules).toBeDefined();
      expect(Array.isArray(mobileLightTheme.rules)).toBe(true);
      expect(mobileLightTheme.rules.length).toBeGreaterThan(0);
      
      // Check for key syntax elements with good contrast
      const keywordRule = mobileLightTheme.rules.find(rule => rule.token === "keyword");
      expect(keywordRule).toBeDefined();
      expect(keywordRule?.foreground).toBe("#0066CC");
      
      const stringRule = mobileLightTheme.rules.find(rule => rule.token === "string");
      expect(stringRule).toBeDefined();
      expect(stringRule?.foreground).toBe("#008000");
    });

    it("should have mobile-optimized colors for light theme", () => {
      expect(mobileLightTheme.colors).toBeDefined();
      expect(mobileLightTheme.colors["editor.background"]).toBe("#FFFFFF");
      expect(mobileLightTheme.colors["editor.foreground"]).toBe("#000000");
      expect(mobileLightTheme.colors["editorCursor.foreground"]).toBe("#000000");
    });
  });

  describe("getMobileEditorConfig", () => {
    it("should return mobile-optimized configuration", () => {
      const config = getMobileEditorConfig("dark", false, 14);
      
      expect(config.fontSize).toBe(14);
      expect(config.lineHeight).toBe(1.5);
      expect(config.letterSpacing).toBe(0.5);
      expect(config.colorDecorators).toBe(true);
      expect(config.bracketPairColorization?.enabled).toBe(true);
      expect(config.cursorBlinking).toBe("smooth");
      expect(config.smoothScrolling).toBe(true);
    });

    it("should handle compact mode", () => {
      const compactConfig = getMobileEditorConfig("dark", true, 12);
      const normalConfig = getMobileEditorConfig("dark", false, 12);
      
      expect(compactConfig.lineHeight).toBe(1.3);
      expect(normalConfig.lineHeight).toBe(1.5);
      
      expect(compactConfig.renderWhitespace).toBe("none");
      expect(normalConfig.renderWhitespace).toBe("boundary");
      
      expect(compactConfig.showFoldingControls).toBe("never");
      expect(normalConfig.showFoldingControls).toBe("mouseover");
    });

    it("should enforce minimum font size", () => {
      const config = getMobileEditorConfig("dark", false, 8);
      expect(config.fontSize).toBe(12); // Should be clamped to minimum
    });

    it("should have semantic highlighting enabled", () => {
      const config = getMobileEditorConfig("dark", false, 14);
      expect(config["semanticHighlighting.enabled"]).toBe(true);
    });

    it("should have touch-friendly hover settings", () => {
      const config = getMobileEditorConfig("dark", false, 14);
      expect(config.hover?.enabled).toBe(true);
      expect(config.hover?.delay).toBe(300);
      expect(config.hover?.sticky).toBe(true);
    });
  });

  describe("getMobileLanguageConfig", () => {
    it("should return JavaScript/TypeScript specific config", () => {
      const jsConfig = getMobileLanguageConfig("javascript");
      expect(jsConfig.tabSize).toBe(2);
      expect(jsConfig.bracketPairColorization?.enabled).toBe(true);
      expect(jsConfig.autoClosingBrackets).toBe("always");
      
      const tsConfig = getMobileLanguageConfig("typescript");
      expect(tsConfig.tabSize).toBe(2);
      expect(tsConfig.autoClosingQuotes).toBe("always");
    });

    it("should return Python specific config", () => {
      const pythonConfig = getMobileLanguageConfig("python");
      expect(pythonConfig.tabSize).toBe(4);
      expect(pythonConfig.insertSpaces).toBe(true);
    });

    it("should return CSS specific config", () => {
      const cssConfig = getMobileLanguageConfig("css");
      expect(cssConfig.tabSize).toBe(2);
      expect(cssConfig.autoClosingBrackets).toBe("always");
      expect(cssConfig.colorDecorators).toBe(true);
    });

    it("should return HTML specific config", () => {
      const htmlConfig = getMobileLanguageConfig("html");
      expect(htmlConfig.tabSize).toBe(2);
      expect(htmlConfig.formatOnType).toBe(true);
      expect(htmlConfig.autoClosingQuotes).toBe("always");
    });

    it("should return JSON specific config", () => {
      const jsonConfig = getMobileLanguageConfig("json");
      expect(jsonConfig.tabSize).toBe(2);
      expect(jsonConfig.formatOnType).toBe(true);
      expect(jsonConfig.autoClosingBrackets).toBe("always");
    });

    it("should return base config for unknown languages", () => {
      const unknownConfig = getMobileLanguageConfig("unknown-language");
      expect(unknownConfig.tabSize).toBe(2);
      expect(unknownConfig.insertSpaces).toBe(true);
      expect(unknownConfig.trimAutoWhitespace).toBe(true);
    });

    it("should handle all supported languages", () => {
      const languages = [
        "javascript", "typescript", "jsx", "tsx",
        "python", "css", "scss", "less", 
        "html", "json"
      ];
      
      languages.forEach(lang => {
        const config = getMobileLanguageConfig(lang);
        expect(config).toBeDefined();
        expect(typeof config.tabSize).toBe("number");
        expect(typeof config.insertSpaces).toBe("boolean");
      });
    });
  });

  describe("theme contrast and readability", () => {
    it("should have sufficient contrast in dark theme", () => {
      // Check that important elements have distinct colors
      const keywordRule = mobileDarkTheme.rules.find(rule => rule.token === "keyword");
      const stringRule = mobileDarkTheme.rules.find(rule => rule.token === "string");
      const commentRule = mobileDarkTheme.rules.find(rule => rule.token === "comment");
      
      expect(keywordRule?.foreground).not.toBe(stringRule?.foreground);
      expect(stringRule?.foreground).not.toBe(commentRule?.foreground);
      expect(keywordRule?.foreground).not.toBe(commentRule?.foreground);
    });

    it("should have sufficient contrast in light theme", () => {
      // Check that important elements have distinct colors
      const keywordRule = mobileLightTheme.rules.find(rule => rule.token === "keyword");
      const stringRule = mobileLightTheme.rules.find(rule => rule.token === "string");
      const commentRule = mobileLightTheme.rules.find(rule => rule.token === "comment");
      
      expect(keywordRule?.foreground).not.toBe(stringRule?.foreground);
      expect(stringRule?.foreground).not.toBe(commentRule?.foreground);
      expect(keywordRule?.foreground).not.toBe(commentRule?.foreground);
    });

    it("should use bold fonts for important elements", () => {
      const darkKeywordRule = mobileDarkTheme.rules.find(rule => rule.token === "keyword");
      const lightKeywordRule = mobileLightTheme.rules.find(rule => rule.token === "keyword");
      
      expect(darkKeywordRule?.fontStyle).toBe("bold");
      expect(lightKeywordRule?.fontStyle).toBe("bold");
    });
  });
});