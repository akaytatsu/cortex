import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useFileWebSocket } from "../hooks/useFileWebSocket";
import type {
  FileContentMessage,
  SaveConfirmationMessage,
  ErrorMessage,
  TextChangeAckMessage,
  ExternalChangeMessage,
  TextDelta,
} from "shared-types";

interface FileWebSocketContextValue {
  isConnected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  error: string | null;
  requestFileContent: (filePath: string) => Promise<void>;
  saveFile: (
    filePath: string,
    content: string,
    lastKnownModified?: Date
  ) => Promise<void>;
  sendTextChanges: (
    filePath: string,
    changes: TextDelta[],
    version: number
  ) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  registerFileContentHandler: (
    handler: (message: FileContentMessage) => void
  ) => void;
  registerSaveConfirmationHandler: (
    handler: (message: SaveConfirmationMessage) => void
  ) => void;
  registerErrorHandler: (handler: (message: ErrorMessage) => void) => void;
  registerTextChangeAckHandler: (
    handler: (message: TextChangeAckMessage) => void
  ) => void;
  registerExternalChangeHandler: (
    handler: (message: ExternalChangeMessage) => void
  ) => void;
}

const FileWebSocketContext = createContext<
  FileWebSocketContextValue | undefined
>(undefined);

interface FileWebSocketProviderProps {
  children: ReactNode;
  workspaceName: string;
  onConnectionChange?: (
    status: "connected" | "disconnected" | "reconnecting"
  ) => void;
}

export function FileWebSocketProvider({
  children,
  workspaceName,
  onConnectionChange,
}: FileWebSocketProviderProps) {
  const fileContentHandlerRef = useRef<
    ((message: FileContentMessage) => void) | null
  >(null);
  const saveConfirmationHandlerRef = useRef<
    ((message: SaveConfirmationMessage) => void) | null
  >(null);
  const errorHandlerRef = useRef<((message: ErrorMessage) => void) | null>(
    null
  );
  const textChangeAckHandlerRef = useRef<
    ((message: TextChangeAckMessage) => void) | null
  >(null);
  const externalChangeHandlerRef = useRef<
    ((message: ExternalChangeMessage) => void) | null
  >(null);

  const handleFileContent = useCallback((message: FileContentMessage) => {
    if (fileContentHandlerRef.current) {
      fileContentHandlerRef.current(message);
    }
  }, []);

  const handleSaveConfirmation = useCallback(
    (message: SaveConfirmationMessage) => {
      if (saveConfirmationHandlerRef.current) {
        saveConfirmationHandlerRef.current(message);
      }
    },
    []
  );

  const handleError = useCallback((message: ErrorMessage) => {
    if (errorHandlerRef.current) {
      errorHandlerRef.current(message);
    }
  }, []);

  const handleTextChangeAck = useCallback((message: TextChangeAckMessage) => {
    if (textChangeAckHandlerRef.current) {
      textChangeAckHandlerRef.current(message);
    }
  }, []);

  const handleExternalChange = useCallback((message: ExternalChangeMessage) => {
    if (externalChangeHandlerRef.current) {
      externalChangeHandlerRef.current(message);
    }
  }, []);

  const websocket = useFileWebSocket({
    workspaceName,
    onFileContent: handleFileContent,
    onSaveConfirmation: handleSaveConfirmation,
    onError: handleError,
    onTextChangeAck: handleTextChangeAck,
    onExternalChange: handleExternalChange,
    onConnectionChange: status => {
      console.log("FileWebSocketContext: Connection status changed", {
        status,
        workspaceName,
      });
      onConnectionChange?.(status);
    },
  });

  const registerFileContentHandler = useCallback(
    (handler: (message: FileContentMessage) => void) => {
      fileContentHandlerRef.current = handler;
    },
    []
  );

  const registerSaveConfirmationHandler = useCallback(
    (handler: (message: SaveConfirmationMessage) => void) => {
      saveConfirmationHandlerRef.current = handler;
    },
    []
  );

  const registerErrorHandler = useCallback(
    (handler: (message: ErrorMessage) => void) => {
      errorHandlerRef.current = handler;
    },
    []
  );

  const registerTextChangeAckHandler = useCallback(
    (handler: (message: TextChangeAckMessage) => void) => {
      textChangeAckHandlerRef.current = handler;
    },
    []
  );

  const registerExternalChangeHandler = useCallback(
    (handler: (message: ExternalChangeMessage) => void) => {
      externalChangeHandlerRef.current = handler;
    },
    []
  );

  const contextValue: FileWebSocketContextValue = {
    ...websocket,
    registerFileContentHandler,
    registerSaveConfirmationHandler,
    registerErrorHandler,
    registerTextChangeAckHandler,
    registerExternalChangeHandler,
  };

  return (
    <FileWebSocketContext.Provider value={contextValue}>
      {children}
    </FileWebSocketContext.Provider>
  );
}

export function useFileWebSocketContext(): FileWebSocketContextValue {
  const context = useContext(FileWebSocketContext);
  if (context === undefined) {
    throw new Error(
      "useFileWebSocketContext must be used within a FileWebSocketProvider"
    );
  }
  return context;
}
