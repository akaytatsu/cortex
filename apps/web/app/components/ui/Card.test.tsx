import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card data-testid="card">Card content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-card', 'shadow-md', 'p-4');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Card variant="outlined" data-testid="card">Outlined</Card>);
    expect(screen.getByTestId('card')).toHaveClass('bg-card', 'border', 'border-border');

    rerender(<Card variant="filled" data-testid="card">Filled</Card>);
    expect(screen.getByTestId('card')).toHaveClass('bg-muted');
  });

  it('renders with different padding options', () => {
    const { rerender } = render(<Card padding="none" data-testid="card">No padding</Card>);
    expect(screen.getByTestId('card')).not.toHaveClass('p-4');

    rerender(<Card padding="sm" data-testid="card">Small padding</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-3');

    rerender(<Card padding="lg" data-testid="card">Large padding</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-6');
  });

  it('accepts custom className', () => {
    render(<Card className="custom-class" data-testid="card">Custom</Card>);
    
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  describe('Card subcomponents', () => {
    it('renders CardHeader correctly', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);
      
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });

    it('renders CardTitle correctly', () => {
      render(<CardTitle data-testid="title">Card Title</CardTitle>);
      
      const title = screen.getByTestId('title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });

    it('renders CardDescription correctly', () => {
      render(<CardDescription data-testid="description">Card description</CardDescription>);
      
      const description = screen.getByTestId('description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('renders CardContent correctly', () => {
      render(<CardContent data-testid="content">Card content</CardContent>);
      
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
    });

    it('renders CardFooter correctly', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>);
      
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center');
    });
  });

  it('renders complete card structure', () => {
    render(
      <Card data-testid="complete-card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('complete-card')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Card content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});