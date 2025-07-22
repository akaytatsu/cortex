import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton, SkeletonList, SkeletonGrid } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders with default props', () => {
    render(<LoadingSkeleton data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse', 'bg-muted', 'rounded', 'h-4');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<LoadingSkeleton variant="avatar" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full');

    rerender(<LoadingSkeleton variant="card" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('h-32');

    rerender(<LoadingSkeleton variant="button" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('h-10');

    rerender(<LoadingSkeleton variant="image" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('h-48');
  });

  it('accepts custom width and height', () => {
    render(<LoadingSkeleton width="200px" height="50px" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      width: '200px',
      height: '50px'
    });
  });

  it('renders multiple lines for text variant', () => {
    render(<LoadingSkeleton variant="text" lines={3} data-testid="skeleton" />);
    
    const container = screen.getByTestId('skeleton');
    expect(container).toHaveClass('space-y-2');
    
    // Should render 3 line elements
    const lines = container.querySelectorAll('div');
    expect(lines).toHaveLength(3);
    
    // Last line should be 75% width
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toHaveStyle({ width: '75%' });
  });

  it('accepts custom className', () => {
    render(<LoadingSkeleton className="custom-class" data-testid="skeleton" />);
    
    expect(screen.getByTestId('skeleton')).toHaveClass('custom-class');
  });
});

describe('SkeletonList', () => {
  it('renders default number of items', () => {
    render(<SkeletonList data-testid="skeleton-list" />);
    
    const container = screen.getByTestId('skeleton-list');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('space-y-2');
    
    // Should render 3 skeleton items by default
    const items = container.querySelectorAll('div[class*="animate-pulse"]');
    expect(items).toHaveLength(3);
  });

  it('renders custom number of items', () => {
    render(<SkeletonList items={5} data-testid="skeleton-list" />);
    
    const container = screen.getByTestId('skeleton-list');
    const items = container.querySelectorAll('div[class*="animate-pulse"]');
    expect(items).toHaveLength(5);
  });

  it('applies custom item height', () => {
    render(<SkeletonList itemHeight="100px" data-testid="skeleton-list" />);
    
    const container = screen.getByTestId('skeleton-list');
    const items = container.querySelectorAll('div[class*="animate-pulse"]');
    
    items.forEach(item => {
      expect(item).toHaveStyle({ height: '100px' });
    });
  });
});

describe('SkeletonGrid', () => {
  it('renders default grid layout', () => {
    render(<SkeletonGrid data-testid="skeleton-grid" />);
    
    const container = screen.getByTestId('skeleton-grid');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('grid');
    expect(container).toHaveStyle({
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '1rem'
    });
    
    // Should render 6 skeleton items by default
    const items = container.querySelectorAll('div[class*="animate-pulse"]');
    expect(items).toHaveLength(6);
  });

  it('renders custom grid configuration', () => {
    render(<SkeletonGrid items={8} columns={4} gap="2rem" data-testid="skeleton-grid" />);
    
    const container = screen.getByTestId('skeleton-grid');
    expect(container).toHaveStyle({
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '2rem'
    });
    
    const items = container.querySelectorAll('div[class*="animate-pulse"]');
    expect(items).toHaveLength(8);
  });

  it('applies custom item height', () => {
    render(<SkeletonGrid itemHeight="150px" data-testid="skeleton-grid" />);
    
    const container = screen.getByTestId('skeleton-grid');
    const items = container.querySelectorAll('div[class*="animate-pulse"]');
    
    items.forEach(item => {
      expect(item).toHaveStyle({ height: '150px' });
    });
  });
});