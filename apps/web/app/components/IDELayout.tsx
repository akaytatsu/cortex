import { useState } from "react";
import { Link } from "@remix-run/react";
import type { Workspace } from "shared-types";
import { FileBrowser } from "./FileBrowser";
import { CodeViewer } from "./CodeViewer";
import { Terminal } from "./Terminal";
import { CopilotPanel } from "./CopilotPanel";
import { FileWebSocketProvider } from "../contexts/FileWebSocketContext";

interface IDELayoutProps {
  workspace: Workspace;
}

export function IDELayout({ workspace }: IDELayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(
        200,
        Math.min(600, startWidth + e.clientX - startX)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleBottomPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(
        100,
        Math.min(400, startHeight - (e.clientY - startY))
      );
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  const handleRightPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const minWidth = window.innerWidth < 768 ? 250 : 200;
      const maxWidth = Math.min(600, window.innerWidth * 0.5);
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startWidth - (e.clientX - startX))
      );
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header/Breadcrumb */}
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Link
            to="/workspaces"
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            ← Voltar para Workspaces
          </Link>
          <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {workspace.name}
          </h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {workspace.path}
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Explorer */}
        <div
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
          style={{ width: sidebarWidth }}
        >
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Explorer
            </h2>
          </div>
          <FileBrowser
            workspaceName={workspace.name}
            onFileSelect={filePath => {
              console.log("IDELayout: File selected", {
                filePath,
                currentSelectedFile: selectedFile,
              });
              setSelectedFile(filePath);
            }}
          />
        </div>

        {/* Sidebar Resize Handle */}
        <button
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-col-resize focus:outline-none focus:ring-2 focus:ring-blue-500"
          onMouseDown={handleSidebarResize}
          aria-label="Redimensionar sidebar"
        ></button>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Main Content with Right Panel */}
          <div className="flex-1 flex">
            {/* Code Editor */}
            <div
              className="flex-1 flex flex-col bg-white dark:bg-gray-800"
              style={{
                width: isRightPanelVisible
                  ? `calc(100% - ${rightPanelWidth}px)`
                  : "100%",
              }}
            >
              <div
                className="flex-1"
                style={{
                  height: isBottomPanelVisible
                    ? `calc(100% - ${bottomPanelHeight}px)`
                    : "100%",
                }}
              >
                <FileWebSocketProvider workspaceName={workspace.name}>
                  <CodeViewer
                    workspaceName={workspace.name}
                    filePath={selectedFile}
                  />
                </FileWebSocketProvider>
              </div>
            </div>

            {/* Right Panel Resize Handle */}
            {isRightPanelVisible && (
              <button
                className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-col-resize focus:outline-none focus:ring-2 focus:ring-blue-500"
                onMouseDown={handleRightPanelResize}
                aria-label="Redimensionar painel do copiloto"
              ></button>
            )}

            {/* Right Panel - Copilot */}
            {isRightPanelVisible && (
              <div
                className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col"
                style={{ width: rightPanelWidth }}
              >
                <CopilotPanel className="h-full" />
              </div>
            )}
          </div>

          {/* Bottom Panel Resize Handle */}
          {isBottomPanelVisible && (
            <button
              className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-row-resize focus:outline-none focus:ring-2 focus:ring-blue-500"
              onMouseDown={handleBottomPanelResize}
              aria-label="Redimensionar painel inferior"
            ></button>
          )}

          {/* Bottom Panel (Terminal) */}
          {isBottomPanelVisible && (
            <div
              className="bg-gray-900 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
              style={{ 
                height: bottomPanelHeight,
                width: isRightPanelVisible 
                  ? `calc(100% - ${rightPanelWidth}px)` 
                  : "100%" 
              }}
            >
              <Terminal
                workspaceName={workspace.name}
                workspacePath={workspace.path}
                onClose={() => setIsBottomPanelVisible(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-blue-600 dark:bg-blue-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4 text-xs text-white">
          <span>Ready</span>
          <button
            onClick={() => setIsBottomPanelVisible(!isBottomPanelVisible)}
            className="hover:bg-blue-500 dark:hover:bg-blue-600 px-2 py-0.5 rounded"
          >
            Terminal
          </button>
          <button
            onClick={() => setIsRightPanelVisible(!isRightPanelVisible)}
            className="hover:bg-blue-500 dark:hover:bg-blue-600 px-2 py-0.5 rounded"
          >
            Copilot
          </button>
        </div>
        <div className="text-xs text-white">
          {workspace.name} - {workspace.path}
        </div>
      </footer>
    </div>
  );
}
