import { useState } from "react";
import { Link } from "@remix-run/react";
import type { Workspace } from "shared-types";

interface IDELayoutProps {
  workspace: Workspace;
}

export function IDELayout({ workspace }: IDELayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(600, startWidth + e.clientX - startX));
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
      const newHeight = Math.max(100, Math.min(400, startHeight - (e.clientY - startY)));
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
          <div className="flex-1 overflow-auto p-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <span>📁</span>
                <span>src</span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer ml-4">
                <span>📄</span>
                <span>index.js</span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <span>📄</span>
                <span>README.md</span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <span>📄</span>
                <span>package.json</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Resize Handle */}
        <button
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-col-resize focus:outline-none focus:ring-2 focus:ring-blue-500"
          onMouseDown={handleSidebarResize}
          aria-label="Redimensionar sidebar"
        ></button>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Main Content */}
          <div
            className="flex-1 bg-white dark:bg-gray-800"
            style={{
              height: isBottomPanelVisible
                ? `calc(100% - ${bottomPanelHeight}px)`
                : "100%",
            }}
          >
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">💻</div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Bem-vindo ao {workspace.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecione um arquivo no Explorer para começar a editar
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Panel Resize Handle */}
          {isBottomPanelVisible && (
            <button
              className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-row-resize focus:outline-none focus:ring-2 focus:ring-blue-500"
              onMouseDown={handleBottomPanelResize}
              aria-label="Redimensionar painel inferior"
            ></button>
          )}

          {/* Bottom Panel (Terminal - Future) */}
          {isBottomPanelVisible && (
            <div
              className="bg-gray-900 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
              style={{ height: bottomPanelHeight }}
            >
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-700 border-b border-gray-600 dark:border-gray-600">
                <h3 className="text-sm font-medium text-gray-200 dark:text-gray-300">
                  Terminal
                </h3>
                <button
                  onClick={() => setIsBottomPanelVisible(false)}
                  className="text-gray-400 hover:text-gray-200 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 font-mono text-sm text-green-400 bg-gray-900">
                <p>$ Terminal será implementado em stories futuras</p>
                <p className="text-gray-500">Workspace: {workspace.path}</p>
              </div>
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
        </div>
        <div className="text-xs text-white">
          {workspace.name} - {workspace.path}
        </div>
      </footer>
    </div>
  );
}