import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  density?: "compact" | "comfortable" | "spacious";
  loading?: boolean;
  touchFriendly?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = "primary", 
    size = "md", 
    density = "comfortable",
    loading = false, 
    disabled,
    touchFriendly = false,
    children,
    ...props 
  }, ref) => {
    const variants = {
      primary: [
        "bg-primary-600 text-text-inverse border-primary-600",
        "hover:bg-primary-700 hover:border-primary-700",
        "active:bg-primary-800 active:border-primary-800",
        "focus:border-primary-700 focus:shadow-focus",
        "disabled:bg-primary-300 disabled:border-primary-300 disabled:text-primary-100",
      ].join(" "),
      secondary: [
        "bg-secondary-100 text-text-primary border-secondary-200",
        "hover:bg-secondary-200 hover:border-secondary-300",
        "active:bg-secondary-300 active:border-secondary-400",
        "focus:border-secondary-400 focus:shadow-focus",
        "disabled:bg-secondary-50 disabled:border-secondary-100 disabled:text-text-disabled",
      ].join(" "),
      outline: [
        "bg-surface-primary text-text-primary border-border-primary",
        "hover:bg-surface-hover hover:border-border-secondary",
        "active:bg-surface-pressed active:border-border-secondary",
        "focus:border-border-focus focus:shadow-focus",
        "disabled:bg-surface-primary disabled:border-border-tertiary disabled:text-text-disabled",
      ].join(" "),
      ghost: [
        "bg-transparent text-text-primary border-transparent",
        "hover:bg-surface-hover hover:border-transparent",
        "active:bg-surface-pressed active:border-transparent",
        "focus:bg-surface-hover focus:shadow-focus",
        "disabled:bg-transparent disabled:border-transparent disabled:text-text-disabled",
      ].join(" "),
      destructive: [
        "bg-error-600 text-text-inverse border-error-600",
        "hover:bg-error-700 hover:border-error-700",
        "active:bg-error-800 active:border-error-800",
        "focus:border-error-700 focus:shadow-focus",
        "disabled:bg-error-300 disabled:border-error-300 disabled:text-error-100",
      ].join(" "),
      success: [
        "bg-success-600 text-text-inverse border-success-600",
        "hover:bg-success-700 hover:border-success-700",
        "active:bg-success-800 active:border-success-800",
        "focus:border-success-700 focus:shadow-focus",
        "disabled:bg-success-300 disabled:border-success-300 disabled:text-success-100",
      ].join(" "),
      warning: [
        "bg-warning-600 text-text-inverse border-warning-600",
        "hover:bg-warning-700 hover:border-warning-700",
        "active:bg-warning-800 active:border-warning-800",
        "focus:border-warning-700 focus:shadow-focus",
        "disabled:bg-warning-300 disabled:border-warning-300 disabled:text-warning-100",
      ].join(" "),
    };

    const sizes = {
      sm: "px-3 py-1.5 text-body-small",
      md: "px-4 py-2 text-body-medium",
      lg: "px-6 py-3 text-body-large",
    };

    const densityClasses = {
      compact: "h-8",
      comfortable: "h-10",
      spacious: "h-12",
    };

    // Touch-friendly minimum sizes (44x44px)
    const touchSizes = {
      sm: touchFriendly ? "min-h-[44px] min-w-[44px] px-4 py-2" : "px-3 py-1.5",
      md: touchFriendly ? "min-h-[44px] min-w-[44px] px-5 py-2.5" : "px-4 py-2",
      lg: touchFriendly ? "min-h-[48px] min-w-[48px] px-6 py-3" : "px-6 py-3",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(
          // Base styles using design system
          "btn-base",
          "elevation-button",
          "font-medium",
          "border",
          "transition-fast",
          "focus:outline-none",
          "focus:ring-0",
          // Variant styles
          variants[variant],
          // Size styles - either touch-friendly or standard
          touchFriendly ? touchSizes[size] : sizes[size],
          // Text size (always apply)
          size === "sm" ? "text-body-small" : size === "md" ? "text-body-medium" : "text-body-large",
          // Density styles (only if not touch-friendly)
          !touchFriendly && densityClasses[density],
          // Touch-friendly class for additional styling
          touchFriendly && "touch-target",
          // Loading state
          loading && "cursor-wait",
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
