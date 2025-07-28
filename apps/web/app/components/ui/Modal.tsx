import { forwardRef, useEffect } from "react";
import { cn } from "../../lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  placement?: "center" | "top" | "bottom";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    isOpen,
    onClose,
    children,
    size = "md",
    placement = "center",
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    className,
    ...props
  }, ref) => {
    const sizes = {
      sm: "max-w-md",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      full: "max-w-full mx-4",
    };

    const placements = {
      center: "items-center justify-center",
      top: "items-start justify-center pt-12",
      bottom: "items-end justify-center pb-12",
    };

    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-background-overlay transition-opacity duration-fast"
          style={{ animation: 'var(--animation-fade-in)' }}
        />
        
        {/* Modal Container */}
        <div
          className={cn(
            "fixed inset-0 overflow-y-auto",
            "flex min-h-full p-4",
            placements[placement]
          )}
          onClick={handleOverlayClick}
        >
          {/* Modal Content */}
          <div
            ref={ref}
            className={cn(
              // Base modal styles
              "modal-base",
              "relative w-full",
              "transform transition-all duration-moderate",
              // Size
              sizes[size],
              // Animation
              "animate-scale-up",
              className
            )}
            style={{ animation: 'var(--animation-scale-up)' }}
            {...props}
          >
            {/* Close button */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  "absolute right-4 top-4 z-10",
                  "flex h-8 w-8 items-center justify-center",
                  "rounded-md text-text-secondary",
                  "transition-fast",
                  "hover:bg-surface-hover hover:text-text-primary",
                  "focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
                )}
                aria-label="Fechar modal"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {children}
          </div>
        </div>
      </div>
    );
  }
);
Modal.displayName = "Modal";

const ModalHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    density?: "compact" | "comfortable" | "spacious";
  }
>(({ className, density = "comfortable", ...props }, ref) => {
  const densityPadding = {
    compact: "p-4 pb-2",
    comfortable: "p-6 pb-4",
    spacious: "p-8 pb-6",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-component-sm",
        densityPadding[density],
        className
      )}
      {...props}
    />
  );
});
ModalHeader.displayName = "ModalHeader";

const ModalTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { 
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    size?: "sm" | "md" | "lg" | "xl";
  }
>(({ className, children, as: Component = "h2", size = "lg", ...props }, ref) => {
  const sizes = {
    sm: "text-title-small",
    md: "text-title-medium",
    lg: "text-title-large",
    xl: "text-headline-small",
  };

  return (
    <Component
      ref={ref}
      className={cn(
        "font-semibold leading-tight text-text-primary",
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
ModalTitle.displayName = "ModalTitle";

const ModalDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-body-medium text-text-secondary leading-relaxed",
      className
    )}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

const ModalContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    density?: "compact" | "comfortable" | "spacious";
  }
>(({ className, density = "comfortable", ...props }, ref) => {
  const densityPadding = {
    compact: "px-4 py-2",
    comfortable: "px-6 py-4", 
    spacious: "px-8 py-6",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 overflow-y-auto",
        densityPadding[density],
        className
      )}
      {...props}
    />
  );
});
ModalContent.displayName = "ModalContent";

const ModalFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    density?: "compact" | "comfortable" | "spacious";
    justify?: "start" | "center" | "end" | "between";
  }
>(({ className, density = "comfortable", justify = "end", ...props }, ref) => {
  const densityPadding = {
    compact: "p-4 pt-2",
    comfortable: "p-6 pt-4",
    spacious: "p-8 pt-6",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center", 
    end: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-component-sm",
        "border-t border-border-tertiary",
        densityPadding[density],
        justifyClasses[justify],
        className
      )}
      {...props}
    />
  );
});
ModalFooter.displayName = "ModalFooter";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
};