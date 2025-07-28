import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
      expect(button).toHaveClass('btn-base');
    });

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('renders as disabled when disabled prop is true', () => {
      render(<Button disabled>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('renders as disabled when loading prop is true', () => {
      render(<Button loading>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-wait');
    });
  });

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600', 'text-text-inverse');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary-100', 'text-text-primary');
    });

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-surface-primary', 'border-border-primary');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'border-transparent');
    });

    it('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Destructive</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-600', 'text-text-inverse');
    });

    it('renders success variant correctly', () => {
      render(<Button variant="success">Success</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-success-600', 'text-text-inverse');
    });

    it('renders warning variant correctly', () => {
      render(<Button variant="warning">Warning</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-warning-600', 'text-text-inverse');
    });
  });

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="sm">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-body-small');
    });

    it('renders medium size correctly (default)', () => {
      render(<Button size="md">Medium</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-body-medium');
    });

    it('renders large size correctly', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-body-large');
    });
  });

  describe('Density', () => {
    it('renders compact density correctly', () => {
      render(<Button density="compact">Compact</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8');
    });

    it('renders comfortable density correctly (default)', () => {
      render(<Button density="comfortable">Comfortable</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
    });

    it('renders spacious density correctly', () => {
      render(<Button density="spacious">Spacious</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      render(<Button loading>Loading</Button>);
      
      const button = screen.getByRole('button');
      const spinner = button.querySelector('svg');
      
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
      expect(button).toBeDisabled();
    });

    it('does not show loading spinner when loading is false', () => {
      render(<Button loading={false}>Not Loading</Button>);
      
      const button = screen.getByRole('button');
      const spinner = button.querySelector('svg');
      
      expect(spinner).not.toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} loading>
          Loading
        </Button>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles keyboard events correctly', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('is focusable when not disabled', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('is not focusable when disabled', () => {
      render(<Button disabled>Not Focusable</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).not.toHaveFocus();
    });

    it('has proper button role', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Design System Integration', () => {
    it('applies design system base classes', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'btn-base',
        'elevation-button',
        'font-medium',
        'border',
        'transition-fast'
      );
    });

    it('applies focus styles correctly', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-0');
    });

    it('combines variant, size, and density classes correctly', () => {
      render(
        <Button variant="secondary" size="lg" density="compact">
          Combined
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        // Secondary variant
        'bg-secondary-100',
        'text-text-primary',
        // Large size
        'px-6',
        'py-3',
        'text-body-large',
        // Compact density
        'h-8'
      );
    });
  });

  describe('Forward Ref', () => {
    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Button with ref</Button>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    });
  });

  describe('Custom Props', () => {
    it('passes through native button props', () => {
      render(
        <Button type="submit" form="test-form" data-testid="custom-button">
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'test-form');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
    });
  });
});