import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "filled" | "ghost";
  size?: "sm" | "md" | "lg";
  density?: "compact" | "comfortable" | "spacious";
  state?: "default" | "error" | "success" | "warning";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  label?: string;
  touchFriendly?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = "text",
    variant = "default", 
    size = "md", 
    density = "comfortable",
    state = "default",
    disabled,
    leftIcon,
    rightIcon,
    helperText,
    label,
    id,
    touchFriendly = false,
    ...props 
  }, ref) => {
    const variants = {
      default: [
        "bg-surface-primary border-border-primary",
        "hover:border-border-secondary",
        "focus:border-border-focus focus:shadow-focus",
      ].join(" "),
      filled: [
        "bg-surface-secondary border-surface-secondary",
        "hover:bg-surface-tertiary hover:border-surface-tertiary",
        "focus:bg-surface-primary focus:border-border-focus focus:shadow-focus",
      ].join(" "),
      ghost: [
        "bg-transparent border-transparent",
        "hover:bg-surface-hover",
        "focus:bg-surface-primary focus:border-border-focus focus:shadow-focus",
      ].join(" "),
    };

    const stateStyles = {
      default: "",
      error: [
        "border-border-error",
        "focus:border-border-error focus:shadow-error",
      ].join(" "),
      success: [
        "border-border-success",
        "focus:border-border-success focus:shadow-success",
      ].join(" "),
      warning: [
        "border-border-warning",
        "focus:border-border-warning focus:shadow-warning",
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
      sm: touchFriendly ? "min-h-[44px] px-4 py-2.5" : "px-3 py-1.5",
      md: touchFriendly ? "min-h-[44px] px-5 py-3" : "px-4 py-2",
      lg: touchFriendly ? "min-h-[48px] px-6 py-3.5" : "px-6 py-3",
    };

    const helperTextColors = {
      default: "text-text-secondary",
      error: "text-error-600",
      success: "text-success-600",
      warning: "text-warning-600",
    };

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-label-medium font-medium text-text-primary mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-text-secondary" style={{ fontSize: 'var(--icon-size-comfortable)' }}>
                {leftIcon}
              </div>
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              // Base styles using design system
              "input-base",
              "w-full",
              "border",
              "rounded-md",
              "transition-fast",
              "focus:outline-none",
              "focus:ring-0",
              "placeholder:text-text-tertiary",
              // Variant styles
              variants[variant],
              // State styles (override variant for errors, etc.)
              state !== "default" && stateStyles[state],
              // Size styles - either touch-friendly or standard
              touchFriendly ? touchSizes[size] : sizes[size],
              // Text size (always apply)
              size === "sm" ? "text-body-small" : size === "md" ? "text-body-medium" : "text-body-large",
              // Density styles (only if not touch-friendly)
              !touchFriendly && densityClasses[density],
              // Touch-friendly class for additional styling
              touchFriendly && "touch-target",
              // Icon padding adjustments
              leftIcon && (touchFriendly ? "pl-12" : "pl-10"),
              rightIcon && (touchFriendly ? "pr-12" : "pr-10"),
              // Disabled state
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="text-text-secondary" style={{ fontSize: 'var(--icon-size-comfortable)' }}>
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        {helperText && (
          <p className={cn(
            "mt-1 text-label-small",
            helperTextColors[state]
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };