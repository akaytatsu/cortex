import { useEffect, useRef, useState, useCallback } from "react";
import { ResponsiveCodeEditor } from "./ResponsiveCodeEditor";
import { useEditorGestures } from "../hooks/useEditorGestures";
import { ZoomIn, ZoomOut, Move, Maximize } from "lucide-react";
import { useTouchClasses } from "../hooks/useTouchDevice";

interface GestureEnabledEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme?: string;
  fontSize?: number;
  isCompactMode?: boolean;
  isMobile?: boolean;
  isTouch?: boolean;
  width?: number;
  readonly?: boolean;
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  wordWrap?: boolean;
  enableGestures?: boolean;
  showGestureControls?: boolean;
}

export function GestureEnabledEditor({
  enableGestures = true,
  showGestureControls = true,
  fontSize: baseFontSize = 14,
  isMobile = false,
  isTouch = false,
  ...editorProps
}: GestureEnabledEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [calculatedFontSize, setCalculatedFontSize] = useState(baseFontSize);
  const touchClasses = useTouchClasses();

  // Calculate font size based on zoom and base font size
  const updateFontSize = useCallback((zoom: number) => {
    const newFontSize = Math.round(baseFontSize * zoom);
    setCalculatedFontSize(Math.max(8, Math.min(32, newFontSize)));
  }, [baseFontSize]);

  // Handle zoom changes
  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
    updateFontSize(zoom);
    
    // Show zoom indicator briefly
    setShowZoomIndicator(true);
    setTimeout(() => setShowZoomIndicator(false), 2000);
  }, [updateFontSize]);

  // Handle pan changes
  const handlePanChange = useCallback((offset: { x: number; y: number }) => {
    setPanOffset(offset);
  }, []);

  // Handle gesture start/end
  const handleGestureStart = useCallback(() => {
    setIsGestureActive(true);
  }, []);

  const handleGestureEnd = useCallback(() => {
    setIsGestureActive(false);
  }, []);

  // Initialize gesture handlers
  const {
    attachGestureListeners,
    resetGestures,
    setZoom,
    getCurrentZoom,
    getGestureState,
  } = useEditorGestures({
    onZoomChange: handleZoomChange,
    onPanChange: handlePanChange,
    onGestureStart: handleGestureStart,
    onGestureEnd: handleGestureEnd,
    minZoom: 0.5,
    maxZoom: 3,
    enablePan: isMobile && isTouch,
    enableZoom: isTouch,
    zoomSensitivity: 0.02,
    panSensitivity: 1,
  });

  // Attach gesture listeners to container
  useEffect(() => {
    if (!enableGestures || !containerRef.current) return;

    const cleanup = attachGestureListeners(containerRef.current);
    return cleanup;
  }, [enableGestures, attachGestureListeners]);

  // Update font size when base font size changes
  useEffect(() => {
    updateFontSize(currentZoom);
  }, [baseFontSize, currentZoom, updateFontSize]);

  // Manual zoom controls
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(3, getCurrentZoom() + 0.1);
    setZoom(newZoom);
  }, [setZoom, getCurrentZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.5, getCurrentZoom() - 0.1);
    setZoom(newZoom);
  }, [setZoom, getCurrentZoom]);


  const handleResetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Reset all gestures
  const handleResetAll = useCallback(() => {
    resetGestures();
    setCurrentZoom(1);
    setPanOffset({ x: 0, y: 0 });
    updateFontSize(1);
  }, [resetGestures, updateFontSize]);

  return (
    <div className="relative w-full h-full">
      {/* Gesture Controls */}
      {showGestureControls && (isMobile || isTouch) && (
        <div className="absolute top-2 right-2 z-10 flex flex-col space-y-1 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-2">
          <button
            onClick={handleZoomIn}
            disabled={currentZoom >= 3}
            className={`${touchClasses.button("sm")} p-1 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleZoomOut}
            disabled={currentZoom <= 0.5}
            className={`${touchClasses.button("sm")} p-1 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          {isMobile && (
            <button
              onClick={handleResetPan}
              disabled={panOffset.x === 0 && panOffset.y === 0}
              className={`${touchClasses.button("sm")} p-1 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Centralizar posição"
            >
              <Move className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleResetAll}
            className={`${touchClasses.button("sm")} p-1 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30`}
            title="Resetar zoom e posição"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zoom Indicator */}
      {showZoomIndicator && (
        <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-mono">
          {Math.round(currentZoom * 100)}%
        </div>
      )}

      {/* Pan Indicator */}
      {isMobile && (panOffset.x !== 0 || panOffset.y !== 0) && (
        <div className="absolute bottom-2 left-2 z-10 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-mono">
          Pan: {Math.round(panOffset.x)}, {Math.round(panOffset.y)}
        </div>
      )}

      {/* Gesture Active Indicator */}
      {isGestureActive && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-blue-500 bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
          {getGestureState().isZooming ? "Zoom ativo" : "Pan ativo"}
        </div>
      )}

      {/* Editor Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          transform: isMobile 
            ? `scale(${currentZoom}) translate(${panOffset.x / currentZoom}px, ${panOffset.y / currentZoom}px)`
            : `scale(${currentZoom})`,
          transformOrigin: "center center",
          transition: isGestureActive ? "none" : "transform 0.2s ease-out",
          touchAction: enableGestures ? "none" : "auto",
        }}
      >
        <ResponsiveCodeEditor
          {...editorProps}
          fontSize={calculatedFontSize}
          isMobile={isMobile}
          isTouch={isTouch}
        />
      </div>

      {/* Usage Instructions (only on first use) */}
      {isMobile && isTouch && enableGestures && (
        <div className="absolute bottom-2 right-2 z-10 max-w-xs">
          <div className="bg-gray-900 bg-opacity-90 text-white p-3 rounded-lg text-xs">
            <p className="mb-1">
              <strong>Gestos:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Pinça para zoom</li>
              <li>Arraste com um dedo para mover</li>
              <li>Ctrl+roda para zoom (desktop)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}