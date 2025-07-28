import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  density?: "compact" | "comfortable" | "spacious";
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", density = "comfortable", interactive = false, ...props }, ref) => {
    const variants = {
      default: [
        "card-base",
        "elevation-card",
      ].join(" "),
      elevated: [
        "card-base",
        "elevation-modal",
        "border-0",
      ].join(" "),
      outlined: [
        "bg-surface-primary",
        "border-2 border-border-primary",
        "rounded-lg",
        "shadow-none",
      ].join(" "),
      ghost: [
        "bg-transparent",
        "border-0",
        "shadow-none",
        "rounded-lg",
      ].join(" "),
    };

    const densityPadding = {
      compact: "p-4",
      comfortable: "p-6",
      spacious: "p-8",
    };

    const interactiveClasses = interactive ? [
      "transition-fast",
      "cursor-pointer",
      "hover:elevation-dropdown",
      "hover:transform hover:scale-[1.02]",
      "active:transform active:scale-[0.98]",
    ].join(" ") : "";

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          densityPadding[density],
          interactive && interactiveClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { density?: "compact" | "comfortable" | "spacious" }
>(({ className, density = "comfortable", ...props }, ref) => {
  const densitySpacing = {
    compact: "gap-component-xs",
    comfortable: "gap-component-sm",
    spacious: "gap-component-md",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col",
        densitySpacing[density],
        className
      )}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { 
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    size?: "sm" | "md" | "lg" | "xl";
  }
>(({ className, children, as: Component = "h3", size = "md", ...props }, ref) => {
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
        "font-semibold leading-tight tracking-tight text-text-primary",
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { size?: "sm" | "md" }
>(({ className, size = "md", ...props }, ref) => {
  const sizes = {
    sm: "text-body-small",
    md: "text-body-medium",
  };

  return (
    <p
      ref={ref}
      className={cn(
        "text-text-secondary leading-relaxed",
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { density?: "compact" | "comfortable" | "spacious" }
>(({ className, density = "comfortable", ...props }, ref) => {
  const densitySpacing = {
    compact: "mt-3",
    comfortable: "mt-4",
    spacious: "mt-6",
  };

  return (
    <div 
      ref={ref} 
      className={cn(
        densitySpacing[density],
        className
      )} 
      {...props} 
    />
  );
});
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    density?: "compact" | "comfortable" | "spacious";
    justify?: "start" | "center" | "end" | "between";
  }
>(({ className, density = "comfortable", justify = "start", ...props }, ref) => {
  const densitySpacing = {
    compact: "mt-4 gap-component-xs",
    comfortable: "mt-6 gap-component-sm",
    spacious: "mt-8 gap-component-md",
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
        "flex items-center",
        densitySpacing[density],
        justifyClasses[justify],
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
