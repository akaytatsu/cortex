import { useState } from "react";
import { Link } from "@remix-run/react";
import type { Workspace } from "shared-types";
import { FileBrowser } from "./FileBrowser";
import { CodeEditor } from "./CodeEditor";
import { EnhancedTerminal } from "./Terminal";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { useTheme } from "../hooks/useTheme";
import { useResponsive } from "../hooks/useResponsive";

interface IDELayoutProps {
  workspace: Workspace;
}

export function IDELayout({ workspace }: IDELayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const { isMobile } = useResponsive();

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

  const effectiveSidebarWidth = isSidebarCollapsed ? 0 : sidebarWidth;

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Modern Header with Gradient */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 shadow-lg">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? "→" : "←"}
          </Button>
          <Link to="/workspaces">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              ← Workspaces
            </Button>
          </Link>
          <div className="h-4 border-l border-white/20"></div>
          <h1 className="text-lg font-semibold text-white">
            {workspace.name}
          </h1>
          <span className="text-sm text-white/70">
            {workspace.path}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-white hover:bg-white/10"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Enhanced Sidebar - File Explorer */}
        {!isSidebarCollapsed && (
          <>
            <Card 
              variant="outlined"
              className="border-r border-border flex flex-col bg-card shadow-sm"
              style={{ width: effectiveSidebarWidth }}
            >
              <Card.Header className="px-4 py-3 border-b border-border bg-muted/50">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center">
                  📁 Explorer
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="ml-auto"
                    >
                      ✕
                    </Button>
                  )}
                </h2>
              </Card.Header>
              <Card.Content className="flex-1 p-0 overflow-hidden">
                <FileBrowser
                  workspaceName={workspace.name}
                  onFileSelect={setSelectedFile}
                />
              </Card.Content>
            </Card>

            {/* Enhanced Resize Handle */}
            {!isMobile && (
              <button 
                className="w-1 bg-border hover:bg-primary-300 cursor-col-resize transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onMouseDown={handleSidebarResize}
                aria-label="Redimensionar sidebar"
              />
            )}
          </>
        )}

        {/* Enhanced Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Main Content with Modern Card Design */}
          <Card
            variant="elevated"
            className="flex-1 bg-card shadow-sm border-none rounded-none"
            style={{
              height: isBottomPanelVisible
                ? `calc(100% - ${bottomPanelHeight}px)`
                : "100%",
            }}
          >
            <Card.Content className="p-0 h-full">
              <CodeEditor
                workspaceName={workspace.name}
                filePath={selectedFile}
              />
            </Card.Content>
          </Card>

          {/* Enhanced Bottom Panel Resize Handle */}
          {isBottomPanelVisible && (
            <button
              className="h-1 bg-border hover:bg-primary-300 cursor-row-resize transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onMouseDown={handleBottomPanelResize}
              aria-label="Redimensionar painel inferior"
            />
          )}

          {/* Enhanced Bottom Panel (Terminal) */}
          {isBottomPanelVisible && (
            <Card
              variant="elevated"
              className="bg-card border-t border-border shadow-lg rounded-none"
              style={{ height: bottomPanelHeight }}
            >
              <Card.Content className="p-0 h-full">
                <EnhancedTerminal
                  workspaceName={workspace.name}
                  workspacePath={workspace.path}
                />
              </Card.Content>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <footer className="h-8 bg-gradient-to-r from-primary-600 to-secondary-600 flex items-center justify-between px-4 shadow-inner">
        <div className="flex items-center space-x-4 text-xs text-white">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-success-400 rounded-full mr-2 animate-pulse"></span>
            Ready
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBottomPanelVisible(!isBottomPanelVisible)}
            className="text-white hover:bg-white/10 text-xs px-2 py-1 h-6"
          >
            {isBottomPanelVisible ? "🔽" : "🔼"} Terminal
          </Button>
          {selectedFile && (
            <span className="text-white/70">
              📄 {selectedFile.split('/').pop()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-white/90">
          <span>{workspace.name}</span>
          <span className="text-white/50">•</span>
          <span className="text-white/70">{workspace.path}</span>
        </div>
      </footer>
    </div>
  );
}
