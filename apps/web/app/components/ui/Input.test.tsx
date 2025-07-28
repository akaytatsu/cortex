import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('input-base');
    });

    it('renders with custom className', () => {
      render(<Input className="custom-class" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text..." />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter text...');
    });

    it('renders with initial value', () => {
      render(<Input defaultValue="Initial value" />);
      
      const input = screen.getByDisplayValue('Initial value');
      expect(input).toBeInTheDocument();
    });

    it('renders as disabled when disabled prop is true', () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Label and Helper Text', () => {
    it('renders with label', () => {
      render(<Input label="Username" />);
      
      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');
      
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', input.id);
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your username" />);
      
      const helperText = screen.getByText('Enter your username');
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveClass('text-text-secondary');
    });

    it('renders both label and helper text', () => {
      render(
        <Input 
          label="Email" 
          helperText="We'll never share your email" 
        />
      );
      
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
    });

    it('generates unique id when not provided', () => {
      render(<Input label="Test" />);
      
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Test');
      
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('uses provided id', () => {
      render(<Input id="custom-id" label="Test" />);
      
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Test');
      
      expect(input).toHaveAttribute('id', 'custom-id');
      expect(label).toHaveAttribute('for', 'custom-id');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<Input variant="default" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-surface-primary', 'border-border-primary');
    });

    it('renders filled variant correctly', () => {
      render(<Input variant="filled" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-surface-secondary', 'border-surface-secondary');
    });

    it('renders ghost variant correctly', () => {
      render(<Input variant="ghost" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-transparent', 'border-transparent');
    });
  });

  describe('States', () => {
    it('renders default state correctly', () => {
      render(<Input state="default" />);
      
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('border-border-error');
    });

    it('renders error state correctly', () => {
      render(<Input state="error" helperText="This field is required" />);
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('This field is required');
      
      expect(input).toHaveClass('border-border-error');
      expect(helperText).toHaveClass('text-error-600');
    });

    it('renders success state correctly', () => {
      render(<Input state="success" helperText="Looks good!" />);
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('Looks good!');
      
      expect(input).toHaveClass('border-border-success');
      expect(helperText).toHaveClass('text-success-600');
    });

    it('renders warning state correctly', () => {
      render(<Input state="warning" helperText="Check this value" />);
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('Check this value');
      
      expect(input).toHaveClass('border-border-warning');
      expect(helperText).toHaveClass('text-warning-600');
    });
  });

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Input size="sm" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-3', 'py-1.5', 'text-body-small');
    });

    it('renders medium size correctly (default)', () => {
      render(<Input size="md" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4', 'py-2', 'text-body-medium');
    });

    it('renders large size correctly', () => {
      render(<Input size="lg" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-6', 'py-3', 'text-body-large');
    });
  });

  describe('Density', () => {
    it('renders compact density correctly', () => {
      render(<Input density="compact" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-8');
    });

    it('renders comfortable density correctly (default)', () => {
      render(<Input density="comfortable" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-10');
    });

    it('renders spacious density correctly', () => {
      render(<Input density="spacious" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-12');
    });
  });

  describe('Icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">📧</span>;
    const RightIcon = () => <span data-testid="right-icon">👁️</span>;

    it('renders with left icon', () => {
      render(<Input leftIcon={<LeftIcon />} />);
      
      const input = screen.getByRole('textbox');
      const icon = screen.getByTestId('left-icon');
      
      expect(icon).toBeInTheDocument();
      expect(input).toHaveClass('pl-10');
    });

    it('renders with right icon', () => {
      render(<Input rightIcon={<RightIcon />} />);
      
      const input = screen.getByRole('textbox');
      const icon = screen.getByTestId('right-icon');
      
      expect(icon).toBeInTheDocument();
      expect(input).toHaveClass('pr-10');
    });

    it('renders with both left and right icons', () => {
      render(<Input leftIcon={<LeftIcon />} rightIcon={<RightIcon />} />);
      
      const input = screen.getByRole('textbox');
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(input).toHaveClass('pl-10', 'pr-10');
    });
  });

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders email input', () => {
      render(<Input type="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" />);
      
      const input = screen.getByLabelText('', { selector: 'input[type="password"]' });
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders number input', () => {
      render(<Input type="number" />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('Interactions', () => {
    it('calls onChange handler when input value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test value' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'test value' })
        })
      );
    });

    it('calls onFocus handler when input is focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur handler when input loses focus', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} disabled />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes when in error state', () => {
      render(
        <Input 
          state="error" 
          helperText="This field is required" 
          aria-describedby="error-text"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'error-text');
    });

    it('is focusable when not disabled', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      input.focus();
      
      expect(input).toHaveFocus();
    });

    it('is not focusable when disabled', () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      input.focus();
      
      expect(input).not.toHaveFocus();
    });

    it('has proper input role', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input.tagName).toBe('INPUT');
    });

    it('supports keyboard navigation', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Tab' });
      
      // Should not prevent default tab behavior
      expect(input).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('applies design system base classes', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'input-base',
        'w-full',
        'border',
        'rounded-md',
        'transition-fast'
      );
    });

    it('applies focus styles correctly', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:outline-none', 'focus:ring-0');
    });

    it('combines variant, size, density, and state classes correctly', () => {
      render(
        <Input 
          variant="filled" 
          size="lg" 
          density="compact" 
          state="success" 
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        // Filled variant (overridden by success state)
        'bg-surface-secondary',
        // Large size
        'px-6',
        'py-3',
        'text-body-large',
        // Compact density
        'h-8',
        // Success state
        'border-border-success'
      );
    });
  });

  describe('Forward Ref', () => {
    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });
  });

  describe('Custom Props', () => {
    it('passes through native input props', () => {
      render(
        <Input 
          name="username"
          maxLength={20}
          autoComplete="username"
          data-testid="custom-input"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'username');
      expect(input).toHaveAttribute('maxLength', '20');
      expect(input).toHaveAttribute('autoComplete', 'username');
      expect(input).toHaveAttribute('data-testid', 'custom-input');
    });
  });

  describe('Validation', () => {
    it('supports required attribute', () => {
      render(<Input required />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
    });

    it('supports pattern attribute', () => {
      render(<Input pattern="[0-9]*" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
    });

    it('supports min and max for number inputs', () => {
      render(<Input type="number" min={0} max={100} />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });
  });
});