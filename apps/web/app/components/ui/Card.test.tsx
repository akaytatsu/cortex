import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('card-base', 'elevation-card');
    });

    it('renders different variants correctly', () => {
      const { rerender } = render(<Card variant="elevated" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('elevation-modal');

      rerender(<Card variant="outlined" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('border-2', 'border-border-primary');

      rerender(<Card variant="ghost" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('bg-transparent');
    });

    it('renders interactive card with hover effects', () => {
      render(<Card interactive data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('cursor-pointer', 'transition-fast');
    });
  });

  describe('CardHeader', () => {
    it('renders with proper spacing', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);
      
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col');
    });
  });

  describe('CardTitle', () => {
    it('renders with different sizes', () => {
      const { rerender } = render(<CardTitle size="sm" data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass('text-title-small');

      rerender(<CardTitle size="lg" data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass('text-title-large');
    });

    it('renders with correct heading element', () => {
      render(<CardTitle as="h2">Title</CardTitle>);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('renders with secondary text color', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-text-secondary');
    });
  });

  describe('CardContent', () => {
    it('renders with proper spacing', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders with different justify options', () => {
      const { rerender } = render(<CardFooter justify="center" data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveClass('justify-center');

      rerender(<CardFooter justify="between" data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveClass('justify-between');
    });
  });
});