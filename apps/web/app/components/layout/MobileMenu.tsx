import { useState, useEffect } from "react";
import { Menu, X, FileText, Terminal, MessageCircle, Settings } from "lucide-react";
import { Button } from "../ui/Button";

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (section: string) => void;
  workspaceName: string;
  className?: string;
}

export function MobileMenu({ 
  isOpen, 
  onToggle, 
  onNavigate, 
  workspaceName, 
  className = "" 
}: MobileMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const menuItems = [
    {
      id: "explorer",
      label: "Explorer",
      icon: FileText,
      description: "Navegar arquivos do projeto",
    },
    {
      id: "terminal",
      label: "Terminal",
      icon: Terminal,
      description: "Executar comandos",
    },
    {
      id: "copilot",
      label: "Copilot",
      icon: MessageCircle,
      description: "Assistente de código",
    },
    {
      id: "settings",
      label: "Configurações",
      icon: Settings,
      description: "Preferências do editor",
    },
  ];

  return (
    <>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={`touch-target lg:hidden ${className}`}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-80 max-w-sm
          transform transition-transform duration-300 ease-in-out
          bg-background-primary border-r border-border-primary
          shadow-lg lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <h2 
            id="mobile-menu-title" 
            className="text-lg font-semibold text-text-primary truncate mr-2"
          >
            {workspaceName}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="touch-target"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onToggle();
                }}
                className="mobile-menu-item w-full text-left flex items-center space-x-3"
              >
                <Icon size={20} className="text-text-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {item.label}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-primary">
          <div className="text-xs text-text-secondary">
            Workspace: {workspaceName}
          </div>
        </div>
      </div>
    </>
  );
}