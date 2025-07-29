import { useState, useCallback } from "react";
import { 
  Eye, 
  EyeOff, 
  Type, 
  Maximize2, 
  Minimize2,
  Settings,
  Hash,
  WrapText,
  FileText,
} from "lucide-react";
import { useTouchClasses } from "../hooks/useTouchDevice";

interface CompactCodeViewerProps {
  isCompactMode: boolean;
  onToggleCompact: (enabled: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  wordWrap: boolean;
  onWordWrapChange: (enabled: boolean) => void;
  showLineNumbers: boolean;
  onLineNumbersChange: (enabled: boolean) => void;
  showMinimap: boolean;
  onMinimapChange: (enabled: boolean) => void;
  isMobile?: boolean;
}

export function CompactCodeViewer({
  isCompactMode,
  onToggleCompact,
  fontSize,
  onFontSizeChange,
  wordWrap,
  onWordWrapChange,
  showLineNumbers,
  onLineNumbersChange,
  showMinimap,
  onMinimapChange,
  isMobile = false,
}: CompactCodeViewerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const touchClasses = useTouchClasses();

  const handleFontSizeDecrease = useCallback(() => {
    onFontSizeChange(Math.max(8, fontSize - 1));
  }, [fontSize, onFontSizeChange]);

  const handleFontSizeIncrease = useCallback(() => {
    onFontSizeChange(Math.min(24, fontSize + 1));
  }, [fontSize, onFontSizeChange]);

  const compactModeOptions = [
    {
      key: "minimal",
      label: "Mínimo",
      description: "Apenas código, sem decorações",
      config: {
        lineNumbers: false,
        minimap: false,
        wordWrap: true,
        fontSize: isMobile ? 12 : 11,
      }
    },
    {
      key: "reading",
      label: "Leitura",
      description: "Otimizado para leitura de código",
      config: {
        lineNumbers: true,
        minimap: false,
        wordWrap: true,
        fontSize: isMobile ? 14 : 13,
      }
    },
    {
      key: "editing",
      label: "Edição",
      description: "Balanceado para edição móvel",
      config: {
        lineNumbers: true,
        minimap: false,
        wordWrap: false,
        fontSize: isMobile ? 13 : 12,
      }
    }
  ];

  const applyCompactMode = (mode: typeof compactModeOptions[0]) => {
    onLineNumbersChange(mode.config.lineNumbers);
    onMinimapChange(mode.config.minimap);
    onWordWrapChange(mode.config.wordWrap);
    onFontSizeChange(mode.config.fontSize);
    setShowSettings(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Compact Mode Toggle */}
      <button
        onClick={() => onToggleCompact(!isCompactMode)}
        className={`${touchClasses.button("sm")} px-2 py-1 rounded text-xs transition-colors ${
          isCompactMode
            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        title={isCompactMode ? "Desativar modo compacto" : "Ativar modo compacto"}
      >
        {isCompactMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        <span className="ml-1">Compacto</span>
      </button>

      {/* Quick Settings for Compact Mode */}
      {isCompactMode && (
        <>
          {/* Font Size Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleFontSizeDecrease}
              className={`${touchClasses.button("sm")} p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs`}
              title="Diminuir fonte"
              disabled={fontSize <= 8}
            >
              <Type className="w-3 h-3" />
              <span className="text-[10px]">-</span>
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[24px] text-center">
              {fontSize}
            </span>
            <button
              onClick={handleFontSizeIncrease}
              className={`${touchClasses.button("sm")} p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs`}
              title="Aumentar fonte"
              disabled={fontSize >= 24}
            >
              <Type className="w-3 h-3" />
              <span className="text-[10px]">+</span>
            </button>
          </div>

          {/* Quick Toggles */}
          <button
            onClick={() => onLineNumbersChange(!showLineNumbers)}
            className={`${touchClasses.button("sm")} p-1 rounded text-xs ${
              showLineNumbers
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
            title={showLineNumbers ? "Ocultar números de linha" : "Mostrar números de linha"}
          >
            <Hash className="w-3 h-3" />
          </button>

          <button
            onClick={() => onWordWrapChange(!wordWrap)}
            className={`${touchClasses.button("sm")} p-1 rounded text-xs ${
              wordWrap
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
            title={wordWrap ? "Desativar quebra de linha" : "Ativar quebra de linha"}
          >
            {wordWrap ? <WrapText className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          </button>

          {!isMobile && (
            <button
              onClick={() => onMinimapChange(!showMinimap)}
              className={`${touchClasses.button("sm")} p-1 rounded text-xs ${
                showMinimap
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
              title={showMinimap ? "Ocultar minimap" : "Mostrar minimap"}
            >
              {showMinimap ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          )}

          {/* Compact Mode Presets */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`${touchClasses.button("sm")} p-1 rounded text-xs ${
                showSettings
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
              title="Presets de modo compacto"
            >
              <Settings className="w-3 h-3" />
            </button>

            {showSettings && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                <div className="p-3">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Presets Compactos
                  </h3>
                  <div className="space-y-2">
                    {compactModeOptions.map((mode) => (
                      <button
                        key={mode.key}
                        onClick={() => applyCompactMode(mode)}
                        className={`${touchClasses.button("sm")} w-full text-left p-2 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700`}
                      >
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {mode.label}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-[10px] mt-1">
                          {mode.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}