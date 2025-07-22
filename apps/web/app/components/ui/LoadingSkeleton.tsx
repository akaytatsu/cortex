/**
 * Loading Skeleton Component - Configurable loading states for better perceived performance
 * Provides skeleton shapes for different content types
 */

import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface LoadingSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'avatar' | 'card' | 'button' | 'image';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function LoadingSkeleton({ 
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  style,
  ...props 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted rounded';

  const variantClasses = {
    text: 'h-4',
    avatar: 'rounded-full',
    card: 'h-32',
    button: 'h-10',
    image: 'h-48'
  };

  const defaultWidths = {
    text: '100%',
    avatar: '2.5rem',
    card: '100%',
    button: 'auto',
    image: '100%'
  };

  const defaultHeights = {
    text: '1rem',
    avatar: '2.5rem',
    card: '8rem',
    button: '2.5rem',
    image: '12rem'
  };

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variantClasses[variant],
              className
            )}
            style={{
              width: i === lines - 1 ? '75%' : width || defaultWidths[variant],
              height: height || defaultHeights[variant],
              ...style
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{
        width: width || defaultWidths[variant],
        height: height || defaultHeights[variant],
        ...style
      }}
      {...props}
    />
  );
}

interface SkeletonListProps {
  items?: number;
  itemHeight?: string | number;
  gap?: string;
  className?: string;
}

export function SkeletonList({ 
  items = 3, 
  itemHeight = '4rem',
  gap = '0.5rem',
  className 
}: SkeletonListProps) {
  return (
    <div 
      className={cn('space-y-2', className)}
      style={{ gap }}
    >
      {Array.from({ length: items }, (_, i) => (
        <LoadingSkeleton 
          key={i}
          variant="card" 
          height={itemHeight}
        />
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  items?: number;
  columns?: number;
  itemHeight?: string | number;
  gap?: string;
  className?: string;
}

export function SkeletonGrid({ 
  items = 6, 
  columns = 3,
  itemHeight = '8rem',
  gap = '1rem',
  className 
}: SkeletonGridProps) {
  return (
    <div 
      className={cn('grid', className)}
      style={{ 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap 
      }}
    >
      {Array.from({ length: items }, (_, i) => (
        <LoadingSkeleton 
          key={i}
          variant="card" 
          height={itemHeight}
        />
      ))}
    </div>
  );
}