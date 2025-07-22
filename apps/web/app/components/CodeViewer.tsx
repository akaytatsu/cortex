import { useEffect, useRef, useState, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import { File, AlertCircle, Loader2, FileX, Save, Circle } from "lucide-react";
import type {
  FileContent,
  FileSaveRequest,
  FileSaveResponse,
} from "shared-types";

// Temporarily removing Prism.js to avoid import issues

interface CodeViewerProps {
  workspaceName: string;
  filePath: string | null;
}

function getLanguageFromMimeType(mimeType: string, fileName: string): string {
  // Try to get language from file extension first
  const ext = fileName.split(".").pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    json: "json",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    html: "html",
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
    xml: "xml",
  };

  if (ext && extensionMap[ext]) {
    return extensionMap[ext];
  }

  // Fallback to mime type
  if (mimeType.includes("javascript")) return "javascript";
  if (mimeType.includes("typescript")) return "typescript";
  if (mimeType.includes("json")) return "json";
  if (mimeType.includes("css")) return "css";
  if (mimeType.includes("html")) return "html";
  if (mimeType.includes("python")) return "python";
  if (mimeType.includes("java")) return "java";
  if (mimeType.includes("yaml")) return "yaml";
  if (mimeType.includes("markdown")) return "markdown";

  return "text";
}

export function CodeViewer({ workspaceName, filePath }: CodeViewerProps) {
  const fetcher = useFetcher<{ fileContent: FileContent; error?: string }>();
  const saveFetcher = useFetcher<FileSaveResponse>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editedContentRef = useRef<string>("");
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  // Prism disabled temporarily

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
    } else if (fetcher.data?.error) {
      setFileContent(null);
      setEditedContent("");
      editedContentRef.current = "";
      setIsDirty(false);
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

    saveFetcher.submit(saveRequest, {
      method: "POST",
      action: `/api/workspaces/${workspaceName}/file/save`,
      encType: "application/json",
    });
  }, [
    filePath,
    fileContent,
    editedContent,
    isDirty,
    workspaceName,
    saveFetcher,
  ]);

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
      // Update fileContent to reflect saved state using callback to avoid dependency
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
          <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            Nenhum arquivo selecionado
          </h3>
          <p className="text-sm text-gray-400">
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
        <div className="flex items-center space-x-2 text-sm text-gray-500">
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
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-medium text-red-500 mb-2">
            Erro ao carregar arquivo
          </h3>
          <p className="text-sm text-red-400 mb-4">{fetcher.data.error}</p>
          <p className="text-xs text-gray-500">{filePath}</p>
        </div>
      </div>
    );
  }

  // No content
  if (!fileContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileX className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            Arquivo não encontrado
          </h3>
          <p className="text-xs text-gray-400">{filePath}</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromMimeType(fileContent.mimeType, filePath);
  const fileName = filePath.split("/").pop() || "";

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <File className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName}
            {isDirty && (
              <Circle className="w-2 h-2 ml-1 inline-block fill-current text-orange-500" />
            )}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {language}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={!isDirty || saveFetcher.state === "submitting"}
            className={`
              flex items-center space-x-1 px-2 py-1 rounded text-xs
              ${
                isDirty
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }
              ${saveFetcher.state === "submitting" ? "opacity-50" : ""}
            `}
          >
            {saveFetcher.state === "submitting" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>Salvar</span>
          </button>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {editedContent.split("\n").length} linhas
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={e => handleContentChange(e.target.value)}
          className="w-full h-full p-4 text-sm font-mono leading-relaxed bg-transparent border-none outline-none resize-none text-gray-800 dark:text-gray-200"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          spellCheck={false}
        />
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
