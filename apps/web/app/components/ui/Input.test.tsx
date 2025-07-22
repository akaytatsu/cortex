import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, Textarea } from './Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('h-10', 'border-input', 'max-w-sm');
  });

  it('handles different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
  });

  it('shows error state', () => {
    render(<Input error data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-error', 'ring-error/20');
  });

  it('shows success state', () => {
    render(<Input success data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-success-500', 'ring-success-500/20');
  });

  it('handles full width', () => {
    render(<Input fullWidth data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).not.toHaveClass('max-w-sm');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} data-testid="input" />);
    
    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('accepts custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    
    expect(screen.getByTestId('input')).toHaveClass('custom-class');
  });
});

describe('Textarea', () => {
  it('renders with default props', () => {
    render(<Textarea placeholder="Enter text" />);
    
    const textarea = screen.getByPlaceholderText('Enter text');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveClass('min-h-[80px]', 'border-input', 'max-w-sm');
  });

  it('shows error state', () => {
    render(<Textarea error data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-error', 'ring-error/20');
  });

  it('shows success state', () => {
    render(<Textarea success data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-success-500', 'ring-success-500/20');
  });

  it('handles full width', () => {
    render(<Textarea fullWidth data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).not.toHaveClass('max-w-sm');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Textarea disabled data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('accepts custom className', () => {
    render(<Textarea className="custom-class" data-testid="textarea" />);
    
    expect(screen.getByTestId('textarea')).toHaveClass('custom-class');
  });

  it('supports resize-vertical', () => {
    render(<Textarea data-testid="textarea" />);
    
    expect(screen.getByTestId('textarea')).toHaveClass('resize-vertical');
  });
});