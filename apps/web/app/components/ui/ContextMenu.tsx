import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  visible: boolean;
}

export function ContextMenu({ items, position, onClose, visible }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewport.width) {
      newX = viewport.width - rect.width - 8;
    }
    if (newX < 8) {
      newX = 8;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewport.height) {
      newY = position.y - rect.height;
    }
    if (newY < 8) {
      newY = 8;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position, visible]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-surface-primary border border-border-primary rounded-lg shadow-lg py-2"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          className={`
            w-full flex items-center px-4 py-2 text-sm text-left
            transition-colors duration-150
            ${item.disabled
              ? "text-text-disabled cursor-not-allowed"
              : item.destructive
              ? "text-error-600 hover:bg-error-50"
              : "text-text-primary hover:bg-surface-hover"
            }
          `}
          disabled={item.disabled}
        >
          {item.icon && (
            <span className="mr-3 w-4 h-4 flex items-center justify-center">
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>
  );

  return createPortal(menu, document.body);
}