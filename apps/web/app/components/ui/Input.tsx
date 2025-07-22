/**
 * Input Component - Enhanced form input with validation states and visual feedback
 * Provides consistent styling and accessibility features
 */

import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    error = false,
    success = false,
    fullWidth = false,
    disabled,
    ...props 
  }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground transition-colors',
          // Focus styles
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Default border
          'border-input',
          // Error state
          error && 'border-error ring-error/20 focus-visible:ring-error',
          // Success state
          success && 'border-success-500 ring-success-500/20 focus-visible:ring-success-500',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Full width
          !fullWidth && 'max-w-sm',
          // Custom className
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className,
    error = false,
    success = false,
    fullWidth = false,
    disabled,
    ...props 
  }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-colors resize-vertical',
          // Focus styles
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Default border
          'border-input',
          // Error state
          error && 'border-error ring-error/20 focus-visible:ring-error',
          // Success state
          success && 'border-success-500 ring-success-500/20 focus-visible:ring-success-500',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Full width
          !fullWidth && 'max-w-sm',
          // Custom className
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';