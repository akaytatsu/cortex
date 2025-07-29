import { useState, useEffect, useRef } from "react";
import { Link } from "@remix-run/react";
import type { Workspace } from "shared-types";
import { FileBrowser } from "./FileBrowser";
import { CodeViewer } from "./CodeViewer";
import { Terminal } from "./Terminal";
import { CopilotPanel } from "./CopilotPanel";
import { MobileMenu } from "./layout/MobileMenu";
import { VirtualKeyboardHandler } from "./layout/VirtualKeyboardHandler";
import { FileWebSocketProvider } from "../contexts/FileWebSocketContext";
import { useViewportSize } from "../lib/responsive";
import { useSwipeGestures } from "../hooks/useSwipeGestures";
import { useResponsiveOrientation } from "../hooks/useOrientation";
import { AdaptiveDensityProvider } from "./layout/AdaptiveDensityProvider";

interface IDELayoutProps {
  workspace: Workspace;
  userId: string;
}

export function IDELayout({ workspace, userId }: IDELayoutProps) {
  const { isMobile, isTablet, isDesktop } = useViewportSize();
  const { orientation, isMobileLandscape, isMobilePortrait } = useResponsiveOrientation();
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Mobile-first responsive state with orientation-aware defaults
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => 
    isMobileLandscape ? 160 : 200 // Smaller in landscape for vertical space
  );
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(() => 
    isMobileLandscape ? 320 : 400 // Slightly smaller in landscape
  );
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(!isMobile);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState<string>("explorer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Responsive effects with orientation awareness
  useEffect(() => {
    if (isDesktop) {
      setIsSidebarOpen(true);
      setIsRightPanelVisible(true);
      setIsMobileMenuOpen(false);
    } else if (isTablet) {
      setIsSidebarOpen(false);
      setIsRightPanelVisible(false);
    } else {
      setIsSidebarOpen(false);
      setIsRightPanelVisible(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  // Orientation-specific adjustments
  useEffect(() => {
    if (isMobileLandscape) {
      // In landscape, prioritize horizontal space
      setBottomPanelHeight(Math.min(bottomPanelHeight, 160));
      setRightPanelWidth(Math.min(rightPanelWidth, 320));
      
      // Auto-close bottom panel in landscape if it's too tall
      if (isBottomPanelVisible && bottomPanelHeight > 160) {
        setIsBottomPanelVisible(false);
      }
    } else if (isMobilePortrait) {
      // In portrait, allow more vertical space for panels
      if (bottomPanelHeight < 180) {
        setBottomPanelHeight(200);
      }
      if (rightPanelWidth < 350) {
        setRightPanelWidth(400);
      }
    }
  }, [orientation, isMobileLandscape, isMobilePortrait, bottomPanelHeight, rightPanelWidth, isBottomPanelVisible]);

  // Handle mobile navigation
  const handleMobileNavigation = (section: string) => {
    setActiveMobileSection(section);
    if (section === "explorer") {
      setIsSidebarOpen(true);
      setIsRightPanelVisible(false);
    } else if (section === "copilot") {
      setIsSidebarOpen(false);
      setIsRightPanelVisible(true);
    } else if (section === "terminal") {
      setIsBottomPanelVisible(true);
      setIsSidebarOpen(false);
      setIsRightPanelVisible(false);
    }
  };

  // Swipe gestures for sidebar control
  const { attachSwipeListeners } = useSwipeGestures({
    onSwipeRight: (distance) => {
      // Swipe right to open sidebar (only from edge)
      if (isMobile && !isSidebarOpen && distance > 50) {
        setIsSidebarOpen(true);
        setActiveMobileSection("explorer");
      }
    },
    onSwipeLeft: (distance) => {
      // Swipe left to close sidebar or navigate to next panel
      if (isMobile && distance > 50) {
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (!isRightPanelVisible) {
          setIsRightPanelVisible(true);
          setActiveMobileSection("copilot");
        }
      }
    },
    onSwipeUp: (distance) => {
      // Swipe up to show terminal
      if (isMobile && !isBottomPanelVisible && distance > 80) {
        setIsBottomPanelVisible(true);
        setActiveMobileSection("terminal");
      }
    },
    onSwipeDown: (distance) => {
      // Swipe down to hide terminal
      if (isMobile && isBottomPanelVisible && distance > 50) {
        setIsBottomPanelVisible(false);
      }
    },
    minSwipeDistance: 40,
    swipeThreshold: 20,
    enabled: isMobile,
  });

  // Attach swipe listeners to main content
  useEffect(() => {
    if (mainContentRef.current && isMobile) {
      const cleanup = attachSwipeListeners(mainContentRef.current);
      return cleanup;
    }
  }, [attachSwipeListeners, isMobile]);

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
    <AdaptiveDensityProvider className="h-screen flex flex-col bg-background-primary">
      <VirtualKeyboardHandler 
        className="h-screen flex flex-col" 
        adjustViewport={isMobile}
        addPaddingBottom={isMobile}
      >
      {/* Mobile-First Header with orientation-specific height */}
      <header className={`
        flex items-center justify-between px-4 bg-surface-primary border-b border-border-primary
        ${isMobileLandscape ? 'py-2 min-h-[50px]' : 'py-3 min-h-[60px]'}
      `}>
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          {isMobile && (
            <MobileMenu
              isOpen={isMobileMenuOpen}
              onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onNavigate={handleMobileNavigation}
              workspaceName={workspace.name}
            />
          )}
          
          {/* Back Link - Hidden on mobile */}
          <Link
            to="/workspaces"
            className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md touch-target"
          >
            ← Voltar
          </Link>
          
          {/* Workspace Info */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {!isMobile && <div className="h-4 border-l border-border-secondary"></div>}
            <h1 className="text-lg font-semibold text-text-primary truncate">
              {workspace.name}
            </h1>
            {!isMobile && (
              <span className="text-sm text-text-tertiary truncate max-w-xs">
                {workspace.path}
              </span>
            )}
          </div>
        </div>
        
        {/* Desktop Panel Toggles */}
        <div className="hidden lg:flex items-center space-x-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="touch-target px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded"
          >
            Explorer
          </button>
          <button
            onClick={() => setIsBottomPanelVisible(!isBottomPanelVisible)}
            className="touch-target px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded"
          >
            Terminal
          </button>
          <button
            onClick={() => setIsRightPanelVisible(!isRightPanelVisible)}
            className="touch-target px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded"
          >
            Copilot
          </button>
        </div>
      </header>

      {/* Main Layout - Mobile First */}
      <div ref={mainContentRef} className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {(isSidebarOpen && isMobile) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Sidebar - File Explorer with orientation-specific width */}
        <div
          className={`
            flex flex-col bg-surface-primary border-r border-border-primary
            transition-transform duration-300 ease-in-out
            ${isMobile 
              ? `fixed inset-y-0 left-0 z-40 ${isMobileLandscape ? 'w-72' : 'w-80'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
              : isDesktop && isSidebarOpen 
                ? 'relative' 
                : 'hidden'
            }
          `}
          style={isDesktop && isSidebarOpen ? { width: sidebarWidth } : {}}
        >
          <div className="p-3 border-b border-border-primary flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Explorer
            </h2>
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="touch-target p-1 text-text-secondary hover:text-text-primary"
                aria-label="Fechar explorer"
              >
                ×
              </button>
            )}
          </div>
          <FileBrowser
            workspaceName={workspace.name}
            onFileSelect={filePath => {
              console.log("IDELayout: File selected", {
                filePath,
                currentSelectedFile: selectedFile,
              });
              setSelectedFile(filePath);
              if (isMobile) {
                setIsSidebarOpen(false);
              }
            }}
          />
        </div>

        {/* Desktop Sidebar Resize Handle */}
        {isDesktop && isSidebarOpen && (
          <button
            className="w-1 bg-border-secondary hover:bg-border-primary cursor-col-resize focus:outline-none focus:ring-2 focus:ring-primary-500"
            onMouseDown={handleSidebarResize}
            aria-label="Redimensionar sidebar"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Main Content with Right Panel */}
          <div className="flex-1 flex relative">
            {/* Code Editor */}
            <div
              className={`
                flex-1 flex flex-col bg-surface-primary
                ${isMobile && isRightPanelVisible ? 'hidden' : ''}
              `}
              style={
                isDesktop && isRightPanelVisible
                  ? { width: `calc(100% - ${rightPanelWidth}px)` }
                  : {}
              }
            >
              <div
                className="flex-1"
                style={
                  isBottomPanelVisible
                    ? { height: `calc(100% - ${bottomPanelHeight}px)` }
                    : {}
                }
              >
                <FileWebSocketProvider workspaceName={workspace.name}>
                  <CodeViewer
                    workspaceName={workspace.name}
                    filePath={selectedFile}
                  />
                </FileWebSocketProvider>
              </div>
            </div>

            {/* Mobile Right Panel Overlay */}
            {isRightPanelVisible && isMobile && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-30"
                onClick={() => setIsRightPanelVisible(false)}
                aria-hidden="true"
              />
            )}

            {/* Desktop Right Panel Resize Handle */}
            {isRightPanelVisible && isDesktop && (
              <button
                className="w-1 bg-border-secondary hover:bg-border-primary cursor-col-resize focus:outline-none focus:ring-2 focus:ring-primary-500"
                onMouseDown={handleRightPanelResize}
                aria-label="Redimensionar painel do copiloto"
              />
            )}

            {/* Right Panel - Copilot with orientation-specific width */}
            {isRightPanelVisible && (
              <div
                className={`
                  bg-surface-primary border-l border-border-primary flex flex-col
                  transition-transform duration-300 ease-in-out
                  ${isMobile 
                    ? `fixed inset-y-0 right-0 z-40 ${isMobileLandscape ? 'w-72' : 'w-80'}` 
                    : 'relative'
                  }
                `}
                style={isDesktop ? { width: rightPanelWidth } : {}}
              >
                <div className="p-3 border-b border-border-primary flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                    Copilot
                  </h2>
                  {isMobile && (
                    <button
                      onClick={() => setIsRightPanelVisible(false)}
                      className="touch-target p-1 text-text-secondary hover:text-text-primary"
                      aria-label="Fechar copilot"
                    >
                      ×
                    </button>
                  )}
                </div>
                <CopilotPanel
                  workspaceName={workspace.name}
                  workspacePath={workspace.path}
                  userId={userId}
                  className="h-full"
                />
              </div>
            )}
          </div>

          {/* Bottom Panel Resize Handle */}
          {isBottomPanelVisible && isDesktop && (
            <button
              className="h-1 bg-border-secondary hover:bg-border-primary cursor-row-resize focus:outline-none focus:ring-2 focus:ring-primary-500"
              onMouseDown={handleBottomPanelResize}
              aria-label="Redimensionar painel inferior"
            />
          )}

          {/* Bottom Panel (Terminal) with orientation-specific height */}
          {isBottomPanelVisible && (
            <div
              className={`
                bg-surface-secondary border-t border-border-primary
                ${isMobile ? `fixed inset-x-0 bottom-0 z-40 ${isMobileLandscape ? 'h-64' : 'h-80'}` : ''}
              `}
              style={
                !isMobile
                  ? {
                      height: bottomPanelHeight,
                      width: isRightPanelVisible && isDesktop
                        ? `calc(100% - ${rightPanelWidth}px)`
                        : "100%",
                    }
                  : {}
              }
            >
              <div className="p-3 border-b border-border-primary flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                  Terminal
                </h2>
                <button
                  onClick={() => setIsBottomPanelVisible(false)}
                  className="touch-target p-1 text-text-secondary hover:text-text-primary"
                  aria-label="Fechar terminal"
                >
                  ×
                </button>
              </div>
              <Terminal
                workspaceName={workspace.name}
                workspacePath={workspace.path}
                onClose={() => setIsBottomPanelVisible(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation with orientation-specific layout */}
      {isMobile && (
        <div className={`
          flex items-center justify-around bg-surface-primary border-t border-border-primary safe-area-inset-bottom
          ${isMobileLandscape ? 'py-1' : 'py-2'}
        `}>
          <button
            onClick={() => handleMobileNavigation("explorer")}
            className={`touch-target flex flex-col items-center px-3 py-2 rounded-md ${
              activeMobileSection === "explorer" 
                ? "bg-primary-100 text-primary-600" 
                : "text-text-secondary"
            }`}
          >
            <span className="text-xs font-medium">Explorer</span>
          </button>
          <button
            onClick={() => handleMobileNavigation("terminal")}
            className={`touch-target flex flex-col items-center px-3 py-2 rounded-md ${
              activeMobileSection === "terminal" 
                ? "bg-primary-100 text-primary-600" 
                : "text-text-secondary"
            }`}
          >
            <span className="text-xs font-medium">Terminal</span>
          </button>
          <button
            onClick={() => handleMobileNavigation("copilot")}
            className={`touch-target flex flex-col items-center px-3 py-2 rounded-md ${
              activeMobileSection === "copilot" 
                ? "bg-primary-100 text-primary-600" 
                : "text-text-secondary"
            }`}
          >
            <span className="text-xs font-medium">Copilot</span>
          </button>
        </div>
      )}

      {/* Desktop Status Bar */}
      {!isMobile && (
        <footer className="h-6 bg-primary-600 flex items-center justify-between px-4">
          <div className="flex items-center space-x-4 text-xs text-white">
            <span>Ready</span>
            <span className="text-xs">
              {workspace.name} - {workspace.path}
            </span>
          </div>
        </footer>
      )}
      </VirtualKeyboardHandler>
    </AdaptiveDensityProvider>
  );
}
