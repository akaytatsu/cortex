import { useEffect, useRef, useState, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import { File, AlertCircle, Loader2, FileX } from "lucide-react";
import { CodeEditorCore } from "./CodeEditorCore";
import { EditorToolbar } from "./EditorToolbar";
import { Minimap } from "./Minimap";
import type {
  FileContent,
  FileSaveRequest,
  FileSaveResponse,
} from "shared-types";

interface CodeEditorProps {
  workspaceName: string;
  filePath: string | null;
}

function getLanguageFromMimeType(mimeType: string, fileName: string): string {
  // Try to get language from file extension first
  const ext = fileName.split(".").pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    html: "markup",
    py: "python",
    java: "java",
    php: "php",
    go: "go",
    rs: "rust",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    yml: "yaml",
    yaml: "yaml",
    md: "markdown",
    xml: "markup",
  };

  if (ext && extensionMap[ext]) {
    return extensionMap[ext];
  }

  // Fallback to mime type
  if (mimeType.includes("javascript")) return "javascript";
  if (mimeType.includes("typescript")) return "typescript";
  if (mimeType.includes("json")) return "json";
  if (mimeType.includes("css")) return "css";
  if (mimeType.includes("html")) return "markup";
  if (mimeType.includes("python")) return "python";
  if (mimeType.includes("java")) return "java";
  if (mimeType.includes("yaml")) return "yaml";
  if (mimeType.includes("markdown")) return "markdown";

  return "text";
}

export function CodeEditor({ workspaceName, filePath }: CodeEditorProps) {
  const fetcher = useFetcher<{ fileContent: FileContent; error?: string }>();
  const saveFetcher = useFetcher<FileSaveResponse>();
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState<boolean>(true);
  const editedContentRef = useRef<string>("");

  useEffect(() => {
    if (filePath) {
      fetcher.load(
        `/api/workspaces/${workspaceName}/file?path=${encodeURIComponent(filePath)}`
      );
    }
  }, [workspaceName, filePath]);

  useEffect(() => {
    if (fetcher.data?.fileContent) {
      setFileContent(fetcher.data.fileContent);
      setEditedContent(fetcher.data.fileContent.content);
      editedContentRef.current = fetcher.data.fileContent.content;
      setIsDirty(false);
      // Show minimap for files with more than 50 lines
      setShowMinimap(fetcher.data.fileContent.content.split("\n").length > 50);
    } else if (fetcher.data?.error) {
      setFileContent(null);
      setEditedContent("");
      editedContentRef.current = "";
      setIsDirty(false);
      setShowMinimap(false);
    }
  }, [fetcher.data]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setEditedContent(newContent);
      editedContentRef.current = newContent;
      setIsDirty(fileContent ? newContent !== fileContent.content : false);
    },
    [fileContent]
  );

  const handleSave = useCallback(async () => {
    if (!filePath || !fileContent || !isDirty) return;

    const saveRequest: FileSaveRequest = {
      path: filePath,
      content: editedContentRef.current,
    };

    saveFetcher.submit(
      { path: saveRequest.path, content: saveRequest.content },
      {
        method: "POST",
        action: `/api/workspaces/${workspaceName}/file/save`,
        encType: "application/json",
      }
    );
  }, [filePath, fileContent, isDirty, workspaceName, saveFetcher]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (saveFetcher.data?.success) {
      setIsDirty(false);
      setFileContent(currentFileContent => {
        if (currentFileContent) {
          return {
            ...currentFileContent,
            content: editedContentRef.current,
          };
        }
        return currentFileContent;
      });
    }
  }, [saveFetcher.data]);

  // No file selected
  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <File className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
            Nenhum arquivo selecionado
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Selecione um arquivo no Explorer para visualizar seu conteúdo
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (fetcher.state === "loading") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando arquivo...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (fetcher.data?.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300 dark:text-red-500" />
          <h3 className="text-lg font-medium text-red-500 dark:text-red-400 mb-2">
            Erro ao carregar arquivo
          </h3>
          <p className="text-sm text-red-400 dark:text-red-300 mb-4">
            {fetcher.data.error}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{filePath}</p>
        </div>
      </div>
    );
  }

  // No content
  if (!fileContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileX className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
            Arquivo não encontrado
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">{filePath}</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromMimeType(fileContent.mimeType, filePath);
  const fileName = filePath.split("/").pop() || "";
  const lineCount = editedContent.split("\n").length;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Enhanced Toolbar */}
      <EditorToolbar
        fileName={fileName}
        language={language}
        isDirty={isDirty}
        lineCount={lineCount}
        showMinimap={showMinimap}
        isMinimapCollapsed={isMinimapCollapsed}
        onSave={handleSave}
        onToggleMinimap={() => setIsMinimapCollapsed(!isMinimapCollapsed)}
        saveFetcher={saveFetcher}
      />

      {/* Editor Area */}
      <div className="flex-1 flex">
        {/* Main Editor */}
        <div
          className={`flex-1 ${showMinimap && !isMinimapCollapsed ? "pr-2" : ""}`}
        >
          <CodeEditorCore
            content={editedContent}
            language={language}
            onChange={handleContentChange}
          />
        </div>

        {/* Minimap */}
        {showMinimap && !isMinimapCollapsed && (
          <div className="w-32 border-l border-gray-200 dark:border-gray-700">
            <Minimap content={editedContent} language={language} />
          </div>
        )}
      </div>

      {/* Save status messages */}
      {saveFetcher.data?.message && (
        <div
          className={`px-4 py-2 text-xs border-t border-gray-200 dark:border-gray-700 ${
            saveFetcher.data.success
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          }`}
        >
          {saveFetcher.data.message}
        </div>
      )}
    </div>
  );
}
