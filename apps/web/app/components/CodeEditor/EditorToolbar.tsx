import { File, Save, Circle, Minimize2, Maximize2, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import type { FetcherWithComponents } from "@remix-run/react";

interface EditorToolbarProps {
  fileName: string;
  language: string;
  isDirty: boolean;
  lineCount: number;
  showMinimap: boolean;
  isMinimapCollapsed: boolean;
  onSave: () => void;
  onToggleMinimap: () => void;
  saveFetcher: FetcherWithComponents<unknown>;
}

const getFileTypeIcon = (fileName: string, language: string) => {
  const iconColor = {
    javascript: "text-yellow-500",
    typescript: "text-blue-500",
    jsx: "text-blue-400",
    tsx: "text-blue-400",
    json: "text-green-500",
    css: "text-blue-600",
    scss: "text-pink-500",
    html: "text-orange-500",
    markup: "text-orange-500",
    python: "text-blue-600",
    java: "text-red-600",
    php: "text-purple-500",
    go: "text-cyan-500",
    rust: "text-orange-600",
    c: "text-gray-600",
    cpp: "text-blue-700",
    sql: "text-orange-400",
    bash: "text-green-600",
    yaml: "text-red-500",
    markdown: "text-gray-700 dark:text-gray-300",
  } as const;

  return iconColor[language as keyof typeof iconColor] || "text-gray-500";
};

const getLanguageLabel = (language: string) => {
  const labels = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    jsx: "JSX",
    tsx: "TSX",
    json: "JSON",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    markup: "HTML",
    python: "Python",
    java: "Java",
    php: "PHP",
    go: "Go",
    rust: "Rust",
    c: "C",
    cpp: "C++",
    sql: "SQL",
    bash: "Bash",
    yaml: "YAML",
    markdown: "Markdown",
    text: "Text",
  } as const;

  return labels[language as keyof typeof labels] || language.toUpperCase();
};

export function EditorToolbar({
  fileName,
  language,
  isDirty,
  lineCount,
  showMinimap,
  isMinimapCollapsed,
  onSave,
  onToggleMinimap,
  saveFetcher,
}: EditorToolbarProps) {
  const isLoading = saveFetcher.state === "submitting";
  const fileTypeIconColor = getFileTypeIcon(fileName, language);
  const languageLabel = getLanguageLabel(language);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* File Info Section */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <File className={`w-4 h-4 ${fileTypeIconColor}`} />
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {fileName}
            </span>
            {isDirty && (
              <>
                <Circle className="w-2 h-2 fill-current text-orange-500" />
                <span className="sr-only">Arquivo modificado</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-medium">
            {languageLabel}
          </span>
          <span>
            {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
          </span>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center space-x-2">
        {/* Minimap Toggle */}
        {showMinimap && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimap}
            className="h-8 px-2"
            title={isMinimapCollapsed ? "Mostrar Minimap" : "Ocultar Minimap"}
          >
            {isMinimapCollapsed ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </Button>
        )}

        {/* Save Button */}
        <Button
          variant={isDirty ? "primary" : "ghost"}
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isLoading}
          className="h-8"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Save className="w-3 h-3 mr-1" />
          )}
          <span className="text-xs">
            {isLoading ? "Salvando..." : "Salvar"}
          </span>
          {isDirty && !isLoading && (
            <kbd className="ml-2 px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded">
              Ctrl+S
            </kbd>
          )}
        </Button>

        {/* File Stats */}
        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center space-x-2 ml-2">
          <span>UTF-8</span>
          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
          <span>LF</span>
        </div>
      </div>
    </div>
  );
}