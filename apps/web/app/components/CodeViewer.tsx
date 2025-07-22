import { useEffect, useRef, useState, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import {
  File,
  AlertCircle,
  Loader2,
  FileX,
  Save,
  Circle,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import type {
  FileContent,
  FileSaveRequest,
  FileSaveResponse,
  FileContentMessage,
  SaveConfirmationMessage,
  ErrorMessage,
} from "shared-types";
import { useFileWebSocketContext } from "../contexts/FileWebSocketContext";
import { ConnectionStatus } from "./ConnectionStatus";
import { useDebounceCallback } from "../hooks/useDebounce";
import { useTextDelta } from "../hooks/useTextDelta";

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
  console.log("CodeViewer: Component rendered with props", {
    workspaceName,
    filePath,
  });
  const fetcher = useFetcher<{ fileContent: FileContent; error?: string }>();
  const saveFetcher = useFetcher<FileSaveResponse>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editedContentRef = useRef<string>("");
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [lastSaveMessage, setLastSaveMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [version, setVersion] = useState<number>(0);
  const [isTextChangePending, setIsTextChangePending] =
    useState<boolean>(false);
  const [lastTextChangeStatus, setLastTextChangeStatus] = useState<
    "sending" | "sent" | "error" | null
  >(null);

  // WebSocket connection
  const {
    isConnected,
    connectionStatus,
    error: connectionError,
    requestFileContent,
    saveFile,
    sendTextChanges,
    reconnect,
    registerFileContentHandler,
    registerSaveConfirmationHandler,
    registerErrorHandler,
    registerTextChangeAckHandler,
  } = useFileWebSocketContext();

  // Text delta utility
  const { generateTextDeltas } = useTextDelta();

  console.log("CodeViewer: WebSocket states", {
    isConnected,
    connectionStatus,
    connectionError,
    filePath,
  });

  // Prism disabled temporarily

  // Handle WebSocket file content response
  const handleFileContent = useCallback(
    (message: FileContentMessage) => {
      console.log("CodeViewer: Received file content message", {
        receivedPath: message.payload.path,
        currentFilePath: filePath,
        contentLength: message.payload.content?.length,
      });

      if (message.payload.path === filePath) {
        console.log(
          "CodeViewer: Setting file content for:",
          message.payload.path
        );
        const content: FileContent = {
          path: message.payload.path,
          content: message.payload.content,
          mimeType: message.payload.mimeType,
        };

        setFileContent(content);
        setEditedContent(content.content);
        editedContentRef.current = content.content;
        setIsDirty(false);
        setIsLoading(false);
        setWsError(null);
        setVersion(0); // Reset version for new file
      } else {
        console.log("CodeViewer: Ignoring file content for different path");
      }
    },
    [filePath]
  );

  // Handle WebSocket save confirmation
  const handleSaveConfirmation = useCallback(
    (message: SaveConfirmationMessage) => {
      setIsSaving(false);
      setSaveSuccess(message.payload.success);
      setLastSaveMessage(message.payload.message || null);

      if (message.payload.success) {
        setIsDirty(false);
        // Update fileContent to reflect saved state
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

      // Clear message after 3 seconds
      setTimeout(() => {
        setLastSaveMessage(null);
        setSaveSuccess(false);
      }, 3000);
    },
    []
  );

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((message: ErrorMessage) => {
    setWsError(message.payload.message);
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  // Handle text change acknowledgment
  const handleTextChangeAck = useCallback((message: any) => {
    console.log("CodeViewer: Text change acknowledged", {
      success: message.payload.success,
      version: message.payload.version,
      message: message.payload.message,
    });

    setIsTextChangePending(false);

    if (message.payload.success) {
      setVersion(message.payload.version);
      setLastTextChangeStatus("sent");
    } else {
      setLastTextChangeStatus("error");
    }

    // Clear status after a short time
    setTimeout(() => {
      setLastTextChangeStatus(null);
    }, 2000);
  }, []);

  // Register WebSocket handlers
  useEffect(() => {
    registerFileContentHandler(handleFileContent);
    registerSaveConfirmationHandler(handleSaveConfirmation);
    registerErrorHandler(handleWebSocketError);
    registerTextChangeAckHandler(handleTextChangeAck);
  }, [
    registerFileContentHandler,
    registerSaveConfirmationHandler,
    registerErrorHandler,
    registerTextChangeAckHandler,
    handleFileContent,
    handleSaveConfirmation,
    handleWebSocketError,
    handleTextChangeAck,
  ]);

  // Load file content via WebSocket when filePath changes
  useEffect(() => {
    console.log("CodeViewer: useEffect triggered", {
      filePath,
      isConnected,
      connectionStatus,
    });

    if (filePath && isConnected && connectionStatus === "connected") {
      console.log("CodeViewer: Loading file via WebSocket", { filePath });
      setIsLoading(true);
      setWsError(null);

      // Add a small delay to ensure connection is fully established
      const timeoutId = setTimeout(() => {
        console.log("CodeViewer: Calling requestFileContent for:", filePath);
        requestFileContent(filePath).catch(error => {
          console.error("Error requesting file content:", error);
          setWsError(
            error instanceof Error ? error.message : "Failed to load file"
          );
          setIsLoading(false);
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    } else if (
      filePath &&
      (!isConnected || connectionStatus === "disconnected")
    ) {
      // Fallback to HTTP if WebSocket is not connected
      console.log("CodeViewer: Loading file via HTTP fallback", {
        filePath,
        isConnected,
        connectionStatus,
      });
      setIsLoading(true);
      setWsError(null);
      fetcher.load(
        `/api/workspaces/${workspaceName}/file?path=${encodeURIComponent(filePath)}`
      );
    } else {
      console.log("CodeViewer: Conditions not met for loading file", {
        filePath,
        isConnected,
        connectionStatus,
      });
    }
  }, [
    workspaceName,
    filePath,
    isConnected,
    connectionStatus,
    requestFileContent,
  ]);

  useEffect(() => {
    if (fetcher.data?.fileContent) {
      setFileContent(fetcher.data.fileContent);
      setEditedContent(fetcher.data.fileContent.content);
      editedContentRef.current = fetcher.data.fileContent.content;
      setIsDirty(false);
      setVersion(0); // Reset version for new file
    } else if (fetcher.data?.error) {
      setFileContent(null);
      setEditedContent("");
      editedContentRef.current = "";
      setIsDirty(false);
    }
  }, [fetcher.data]);

  // Debounced content change for sending real-time text changes
  const debouncedContentChange = useDebounceCallback(
    (newContent: string, oldContent: string) => {
      console.debug("Debounced content change - sending text deltas", {
        filePath,
        newContentLength: newContent.length,
        oldContentLength: oldContent.length,
      });

      if (filePath && isConnected && oldContent !== newContent) {
        try {
          // Generate text deltas
          const deltas = generateTextDeltas(oldContent, newContent, "client");

          if (deltas.length > 0) {
            console.debug("Sending text changes via WebSocket", {
              filePath,
              deltasCount: deltas.length,
              version,
            });

            // Show sending status
            setIsTextChangePending(true);
            setLastTextChangeStatus("sending");

            sendTextChanges(filePath, deltas, version).catch(error => {
              console.error("Failed to send text changes:", error);
              setIsTextChangePending(false);
              setLastTextChangeStatus("error");

              // Clear error status after 3 seconds
              setTimeout(() => {
                setLastTextChangeStatus(null);
              }, 3000);
            });
          }
        } catch (error) {
          console.error("Failed to generate text deltas:", error);
          setLastTextChangeStatus("error");
          setTimeout(() => {
            setLastTextChangeStatus(null);
          }, 3000);
        }
      }
    },
    500
  ); // 500ms debounce for real-time changes

  const handleContentChange = useCallback(
    (newContent: string) => {
      const oldContent = editedContentRef.current;

      setEditedContent(newContent);
      editedContentRef.current = newContent;
      setIsDirty(fileContent ? newContent !== fileContent.content : false);

      // Trigger debounced callback for real-time text changes
      if (oldContent !== newContent) {
        debouncedContentChange(newContent, oldContent);
      }
    },
    [fileContent, debouncedContentChange]
  );

  const handleSave = useCallback(async () => {
    if (!filePath || !fileContent || !isDirty) return;

    try {
      if (isConnected) {
        // Save via WebSocket
        setIsSaving(true);
        setLastSaveMessage(null);
        await saveFile(filePath, editedContentRef.current);
      } else {
        // Fallback to HTTP
        const saveRequest: FileSaveRequest = {
          path: filePath,
          content: editedContentRef.current,
        };

        saveFetcher.submit(saveRequest, {
          method: "POST",
          action: `/api/workspaces/${workspaceName}/file/save`,
          encType: "application/json",
        });
      }
    } catch (error) {
      console.error("Error saving file:", error);
      setIsSaving(false);
      setWsError(
        error instanceof Error ? error.message : "Failed to save file"
      );
    }
  }, [
    filePath,
    fileContent,
    isDirty,
    isConnected,
    saveFile,
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
  if (isLoading || fetcher.state === "loading") {
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
  if (fetcher.data?.error || wsError) {
    const errorMessage = wsError || fetcher.data?.error;
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-medium text-red-500 mb-2">
            Erro ao carregar arquivo
          </h3>
          <p className="text-sm text-red-400 mb-4">{errorMessage}</p>
          <p className="text-xs text-gray-500">{filePath}</p>
          {wsError && !isConnected && (
            <button
              onClick={reconnect}
              className="mt-2 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
            >
              Tentar Reconectar
            </button>
          )}
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
          {/* Real-time sync status indicator */}
          {isConnected && (lastTextChangeStatus || isTextChangePending) && (
            <div className="flex items-center space-x-1 text-xs">
              {lastTextChangeStatus === "sending" || isTextChangePending ? (
                <>
                  <Clock className="w-3 h-3 animate-pulse text-orange-500" />
                  <span className="text-orange-600 dark:text-orange-400">
                    Sincronizando...
                  </span>
                </>
              ) : lastTextChangeStatus === "sent" ? (
                <>
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    Sincronizado
                  </span>
                </>
              ) : lastTextChangeStatus === "error" ? (
                <>
                  <WifiOff className="w-3 h-3 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    Erro de sinc
                  </span>
                </>
              ) : null}
            </div>
          )}

          {/* Connection status indicator */}
          <ConnectionStatus
            status={connectionStatus}
            error={connectionError}
            onReconnect={reconnect}
          />

          <button
            onClick={handleSave}
            disabled={
              !isDirty || isSaving || saveFetcher.state === "submitting"
            }
            className={`
              flex items-center space-x-1 px-2 py-1 rounded text-xs
              ${
                isDirty
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }
              ${isSaving || saveFetcher.state === "submitting" ? "opacity-50" : ""}
            `}
          >
            {isSaving || saveFetcher.state === "submitting" ? (
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
      {(lastSaveMessage || saveFetcher.data?.message) && (
        <div
          className={`px-4 py-2 text-xs border-t border-gray-200 dark:border-gray-700 ${
            saveSuccess || saveFetcher.data?.success
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          }`}
        >
          {lastSaveMessage || saveFetcher.data?.message}
        </div>
      )}
    </div>
  );
}
