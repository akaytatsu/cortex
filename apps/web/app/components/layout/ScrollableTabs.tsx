import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Button";

interface Tab {
  id: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
}

interface ScrollableTabsProps {
  tabs: Tab[];
  onTabSelect: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  className?: string;
}

export function ScrollableTabs({ 
  tabs, 
  onTabSelect, 
  onTabClose, 
  className = "" 
}: ScrollableTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollability);
      return () => container.removeEventListener("scroll", checkScrollability);
    }
  }, [tabs]);

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -150, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 150, behavior: "smooth" });
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className={`flex items-center bg-surface-secondary border-b border-border-primary ${className}`}>
      {/* Left Scroll Arrow */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollLeft}
          className="touch-target flex-shrink-0 h-full rounded-none border-r border-border-primary"
          aria-label="Scroll tabs left"
        >
          ←
        </Button>
      )}

      {/* Scrollable Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center space-x-2 px-4 py-3 min-w-0 flex-shrink-0
                border-r border-border-primary cursor-pointer
                transition-colors duration-200
                ${tab.isActive 
                  ? "bg-surface-primary text-text-primary" 
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
                }
              `}
              onClick={() => onTabSelect(tab.id)}
              role="tab"
              aria-selected={tab.isActive}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTabSelect(tab.id);
                }
              }}
            >
              {/* Tab Title */}
              <span className="text-sm font-medium truncate max-w-32">
                {tab.title}
                {tab.isDirty && <span className="ml-1 text-warning-500">•</span>}
              </span>

              {/* Close Button */}
              {onTabClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="touch-target p-1 h-6 w-6 hover:bg-surface-pressed"
                  aria-label={`Close ${tab.title}`}
                >
                  <X size={12} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Scroll Arrow */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollRight}
          className="touch-target flex-shrink-0 h-full rounded-none border-l border-border-primary"
          aria-label="Scroll tabs right"
        >
          →
        </Button>
      )}
    </div>
  );
}