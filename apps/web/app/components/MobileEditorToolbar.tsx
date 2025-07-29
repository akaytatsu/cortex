import { useState } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw, 
  Search, 
  Copy, 
  Clipboard,
  X,
  ChevronUp,
  ChevronDown,
  Smartphone,
  Monitor,
  Palette,
  Code,
  FileText,
  Scissors,
  RefreshCw,
} from "lucide-react";
import { useTouchClasses } from "../hooks/useTouchDevice";

interface MobileEditorToolbarProps {
  // Font and Display
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  isCompactMode: boolean;
  onToggleCompact: (enabled: boolean) => void;
  
  // Editor Actions
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  
  // Navigation
  onGoToLine?: () => void;
  onNextError?: () => void;
  onPrevError?: () => void;
  
  // View Options
  theme: "light" | "dark";
  onThemeChange?: (theme: "light" | "dark") => void;
  language: string;
  onLanguageChange?: (language: string) => void;
  
  // Toolbar Control
  isVisible: boolean;
  onClose: () => void;
  
  // Editor State
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  currentLine?: number;
  totalLines?: number;
  errorCount?: number;
}

type ToolbarTab = "main" | "edit" | "navigate" | "view";

export function MobileEditorToolbar({
  fontSize,
  onFontSizeChange,
  isCompactMode,
  onToggleCompact,
  onUndo,
  onRedo,
  onFind,
  onReplace,
  onCopy,
  onCut,
  onPaste,
  onGoToLine,
  onNextError,
  onPrevError,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  isVisible,
  onClose,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  currentLine = 1,
  totalLines = 1,
  errorCount = 0,
}: MobileEditorToolbarProps) {
  const [activeTab, setActiveTab] = useState<ToolbarTab>("main");
  const touchClasses = useTouchClasses();

  if (!isVisible) {
    return null;
  }

  const handleFontSizeDecrease = () => {
    onFontSizeChange(Math.max(8, fontSize - 1));
  };

  const handleFontSizeIncrease = () => {
    onFontSizeChange(Math.min(24, fontSize + 1));
  };

  const commonButtonClass = `${touchClasses.button("sm")} px-2 py-1 rounded text-xs transition-colors`;
  const activeButtonClass = "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
  const inactiveButtonClass = "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600";
  const disabledButtonClass = "bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed";

  const tabs = [
    { id: "main" as ToolbarTab, label: "Principal", icon: Smartphone },
    { id: "edit" as ToolbarTab, label: "Editar", icon: Code },
    { id: "navigate" as ToolbarTab, label: "Navegar", icon: Search },
    { id: "view" as ToolbarTab, label: "Exibir", icon: Monitor },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${commonButtonClass} ${
                  activeTab === tab.id ? activeButtonClass : inactiveButtonClass
                }`}
                title={tab.label}
              >
                <Icon className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        <button
          onClick={onClose}
          className={`${commonButtonClass} ${inactiveButtonClass}`}
          title="Fechar toolbar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-3">
        {activeTab === "main" && (
          <div className="flex items-center justify-between">
            {/* Font Size Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Fonte:</span>
              <button
                onClick={handleFontSizeDecrease}
                disabled={fontSize <= 8}
                className={`${commonButtonClass} ${
                  fontSize <= 8 ? disabledButtonClass : inactiveButtonClass
                }`}
                title="Diminuir fonte"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[32px] text-center font-mono">
                {fontSize}px
              </span>
              <button
                onClick={handleFontSizeIncrease}
                disabled={fontSize >= 24}
                className={`${commonButtonClass} ${
                  fontSize >= 24 ? disabledButtonClass : inactiveButtonClass
                }`}
                title="Aumentar fonte"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            {/* Compact Mode */}
            <button
              onClick={() => onToggleCompact(!isCompactMode)}
              className={`${commonButtonClass} ${
                isCompactMode ? activeButtonClass : inactiveButtonClass
              }`}
              title={isCompactMode ? "Desativar modo compacto" : "Ativar modo compacto"}
            >
              <Smartphone className="w-3 h-3" />
              <span className="ml-1">Compacto</span>
            </button>
          </div>
        )}

        {activeTab === "edit" && (
          <div className="flex items-center justify-between">
            {/* Undo/Redo */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`${commonButtonClass} ${
                  !canUndo ? disabledButtonClass : inactiveButtonClass
                }`}
                title="Desfazer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`${commonButtonClass} ${
                  !canRedo ? disabledButtonClass : inactiveButtonClass
                }`}
                title="Refazer"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>

            {/* Clipboard Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onCopy}
                disabled={!hasSelection}
                className={`${commonButtonClass} ${
                  !hasSelection ? disabledButtonClass : inactiveButtonClass
                }`}
                title="Copiar"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={onCut}
                disabled={!hasSelection}
                className={`${commonButtonClass} ${
                  !hasSelection ? disabledButtonClass : inactiveButtonClass
                }`}
                title="Cortar"
              >
                <Scissors className="w-3 h-3" />
              </button>
              <button
                onClick={onPaste}
                className={`${commonButtonClass} ${inactiveButtonClass}`}
                title="Colar"
              >
                <Clipboard className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "navigate" && (
          <div className="flex items-center justify-between">
            {/* Search and Replace */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onFind}
                className={`${commonButtonClass} ${inactiveButtonClass}`}
                title="Localizar"
              >
                <Search className="w-3 h-3" />
                <span className="ml-1">Localizar</span>
              </button>
              <button
                onClick={onReplace}
                className={`${commonButtonClass} ${inactiveButtonClass}`}
                title="Substituir"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onGoToLine}
                className={`${commonButtonClass} ${inactiveButtonClass}`}
                title="Ir para linha"
              >
                <span className="text-xs">Ln {currentLine}/{totalLines}</span>
              </button>
              {errorCount > 0 && (
                <>
                  <button
                    onClick={onPrevError}
                    className={`${commonButtonClass} ${inactiveButtonClass}`}
                    title="Erro anterior"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {errorCount} erros
                  </span>
                  <button
                    onClick={onNextError}
                    className={`${commonButtonClass} ${inactiveButtonClass}`}
                    title="Próximo erro"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "view" && (
          <div className="flex items-center justify-between">
            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Tema:</span>
              <button
                onClick={() => onThemeChange?.(theme === "dark" ? "light" : "dark")}
                className={`${commonButtonClass} ${inactiveButtonClass}`}
                title={`Alternar para tema ${theme === "dark" ? "claro" : "escuro"}`}
              >
                <Palette className="w-3 h-3" />
                <span className="ml-1 capitalize">{theme === "dark" ? "Escuro" : "Claro"}</span>
              </button>
            </div>

            {/* Language Display */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Linguagem:</span>
              <button
                onClick={() => onLanguageChange?.(language)}
                className={`${commonButtonClass} ${inactiveButtonClass}`}
                title="Alterar linguagem"
              >
                <FileText className="w-3 h-3" />
                <span className="ml-1 capitalize">{language}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}