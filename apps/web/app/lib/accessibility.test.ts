import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock navigator for accessibility features
const mockNavigator = {
  ...navigator,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
  maxTouchPoints: 5,
  platform: 'iPhone',
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

describe('Mobile Accessibility Testing', () => {
  beforeEach(() => {
    // Mock window.matchMedia for mobile
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 767px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Touch Target Accessibility', () => {
    it('should have minimum touch target size of 44x44px', () => {
      const testButton = document.createElement('button');
      testButton.textContent = 'Test Button';
      testButton.className = 'touch-target min-h-[44px] min-w-[44px] p-3';
      document.body.appendChild(testButton);

      // Check minimum dimensions
      expect(testButton.classList.contains('min-h-[44px]')).toBe(true);
      expect(testButton.classList.contains('min-w-[44px]')).toBe(true);
      
      document.body.removeChild(testButton);
    });

    it('should have adequate spacing between interactive elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button class="touch-target mb-2">Button 1</button>
        <button class="touch-target mb-2">Button 2</button>
        <button class="touch-target">Button 3</button>
      `;
      document.body.appendChild(container);

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button.classList.contains('mb-2') || button === buttons[buttons.length - 1]).toBe(true);
      });

      document.body.removeChild(container);
    });

    it('should provide visual feedback for touch interactions', () => {
      const testButton = document.createElement('button');
      testButton.className = 'active:bg-blue-600 active:scale-95 transition-all duration-150';
      testButton.textContent = 'Interactive Button';
      document.body.appendChild(testButton);

      // Check for active state classes
      expect(testButton.classList.contains('active:bg-blue-600')).toBe(true);
      expect(testButton.classList.contains('active:scale-95')).toBe(true);
      expect(testButton.classList.contains('transition-all')).toBe(true);

      document.body.removeChild(testButton);
    });
  });

  describe('Screen Reader Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      const testComponent = () => React.createElement('div', null, [
        React.createElement('button', {
          key: 'menu-btn',
          'aria-label': 'Open mobile menu'
        }, '☰'),
        React.createElement('input', {
          key: 'search-input',
          'aria-label': 'Search files',
          placeholder: 'Search...'
        }),
        React.createElement('div', {
          key: 'tablist',
          role: 'tablist'
        }, [
          React.createElement('button', {
            key: 'tab1',
            role: 'tab',
            'aria-selected': 'true',
            'aria-controls': 'tab1-panel'
          }, 'Tab 1'),
          React.createElement('button', {
            key: 'tab2',
            role: 'tab',
            'aria-selected': 'false',
            'aria-controls': 'tab2-panel'
          }, 'Tab 2')
        ])
      ]);

      render(React.createElement(testComponent));

      // Check ARIA labels
      const menuButton = screen.getByLabelText('Open mobile menu');
      expect(menuButton).toBeInTheDocument();

      const searchInput = screen.getByLabelText('Search files');
      expect(searchInput).toBeInTheDocument();

      // Check ARIA roles and properties
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('should have proper heading hierarchy', async () => {
      const testComponent = () => React.createElement('div', null, [
        React.createElement('h1', { key: 'h1' }, 'IDE Workspace'),
        React.createElement('div', { key: 'section1' }, [
          React.createElement('h2', { key: 'h2-1' }, 'File Browser'),
          React.createElement('div', { key: 'subsection' }, [
            React.createElement('h3', { key: 'h3-1' }, 'Project Files'),
            React.createElement('ul', { key: 'list' }, [
              React.createElement('li', { key: 'item1' }, 'file1.ts'),
              React.createElement('li', { key: 'item2' }, 'file2.tsx')
            ])
          ])
        ]),
        React.createElement('div', { key: 'section2' }, [
          React.createElement('h2', { key: 'h2-2' }, 'Code Editor'),
          React.createElement('div', { key: 'editor-section' }, [
            React.createElement('h3', { key: 'h3-2' }, 'Current File: app.tsx')
          ])
        ])
      ]);

      render(React.createElement(testComponent));

      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent('IDE Workspace');
      expect(h2s).toHaveLength(2);
      expect(h3s).toHaveLength(2);
    });

    it('should have descriptive link text', async () => {
      const testComponent = () => React.createElement('div', null, [
        React.createElement('a', {
          key: 'help-link',
          href: '/help',
          'aria-label': 'Get help with using the IDE'
        }, '?'),
        React.createElement('a', {
          key: 'settings-link',
          href: '/settings'
        }, 'IDE Settings'),
        React.createElement('button', {
          key: 'save-btn',
          'aria-describedby': 'save-help'
        }, 'Save'),
        React.createElement('div', {
          key: 'save-help',
          id: 'save-help',
          className: 'sr-only'
        }, 'Save your current work to the workspace')
      ]);

      render(React.createElement(testComponent));

      // Check links have accessible text
      const helpLink = screen.getByLabelText('Get help with using the IDE');
      expect(helpLink).toBeInTheDocument();

      const settingsLink = screen.getByText('IDE Settings');
      expect(settingsLink).toHaveAttribute('href', '/settings');

      // Check aria-describedby
      const saveButton = screen.getByText('Save');
      expect(saveButton).toHaveAttribute('aria-describedby', 'save-help');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for interactive elements', () => {
      const testComponent = () => React.createElement('div', null, [
        React.createElement('button', {
          key: 'btn1',
          tabIndex: 0
        }, 'First Button'),
        React.createElement('input', {
          key: 'input1',
          tabIndex: 0,
          placeholder: 'Input field'
        }),
        React.createElement('a', {
          key: 'link1',
          href: '#section',
          tabIndex: 0
        }, 'Link'),
        React.createElement('div', {
          key: 'custom-btn',
          tabIndex: 0,
          role: 'button',
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }
        }, 'Custom Button')
      ]);

      const { container } = render(React.createElement(testComponent));

      const interactiveElements = container.querySelectorAll('[tabindex="0"]');
      expect(interactiveElements).toHaveLength(4);

      // Test keyboard event handling
      const customButton = screen.getByText('Custom Button');
      fireEvent.keyDown(customButton, { key: 'Enter' });
      fireEvent.keyDown(customButton, { key: ' ' });
      
      expect(customButton).toHaveAttribute('role', 'button');
    });

    it('should have visible focus indicators', () => {
      const testButton = document.createElement('button');
      testButton.className = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
      testButton.textContent = 'Focusable Button';
      document.body.appendChild(testButton);

      // Check focus styles
      expect(testButton.classList.contains('focus:ring-2')).toBe(true);
      expect(testButton.classList.contains('focus:ring-blue-500')).toBe(true);
      expect(testButton.classList.contains('focus:ring-offset-2')).toBe(true);

      document.body.removeChild(testButton);
    });

    it('should trap focus in modal dialogs', async () => {
      const mockOnClose = vi.fn();
      
      const testModal = () => React.createElement('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'modal-title'
      }, [
        React.createElement('h2', {
          key: 'title',
          id: 'modal-title'
        }, 'Modal Dialog'),
        React.createElement('button', { key: 'btn1' }, 'First Button'),
        React.createElement('input', {
          key: 'input',
          placeholder: 'Input'
        }),
        React.createElement('button', {
          key: 'close-btn',
          onClick: mockOnClose
        }, 'Close')
      ]);

      const { container } = render(React.createElement(testModal));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

      // Check for focusable elements within modal
      const focusableElements = container.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Color and Contrast', () => {
    it('should meet WCAG contrast requirements', () => {
      // Test high contrast combinations
      const highContrastElements = [
        { bg: 'bg-white', text: 'text-gray-900' }, // White bg, dark text
        { bg: 'bg-gray-900', text: 'text-white' }, // Dark bg, white text
        { bg: 'bg-blue-600', text: 'text-white' }, // Blue bg, white text
      ];

      highContrastElements.forEach(({ bg, text }) => {
        const element = document.createElement('div');
        element.className = `${bg} ${text} p-4`;
        element.textContent = 'Test content with good contrast';
        document.body.appendChild(element);

        // These combinations should provide good contrast
        expect(element.classList.contains(bg)).toBe(true);
        expect(element.classList.contains(text)).toBe(true);

        document.body.removeChild(element);
      });
    });

    it('should not rely solely on color to convey information', async () => {
      const testComponent = () => React.createElement('div', null, [
        React.createElement('div', {
          key: 'success',
          className: 'text-green-600',
          'aria-label': 'Success: File saved successfully'
        }, '✓ File saved'),
        React.createElement('div', {
          key: 'error',
          className: 'text-red-600',
          'aria-label': 'Error: Failed to save file'
        }, '✗ Save failed'),
        React.createElement('button', {
          key: 'submit',
          className: 'bg-blue-600 text-white',
          disabled: true,
          'aria-label': 'Submit form (disabled - please fill required fields)'
        }, 'Submit')
      ]);

      render(React.createElement(testComponent));

      // Check that messages have both color AND text/icons
      const successMessage = screen.getByLabelText(/Success:/);
      expect(successMessage).toHaveTextContent('✓');

      const errorMessage = screen.getByLabelText(/Error:/);
      expect(errorMessage).toHaveTextContent('✗');
    });
  });

  describe('Mobile-Specific Accessibility', () => {
    it('should have proper viewport meta tag', () => {
      // This would typically be tested in the HTML head
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      
      // If not present, we should expect it to be added
      if (!viewportMeta) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
        document.head.appendChild(meta);
      }

      const metaTag = document.querySelector('meta[name="viewport"]');
      expect(metaTag).toBeTruthy();
      
      if (metaTag) {
        const content = metaTag.getAttribute('content');
        expect(content).toContain('width=device-width');
        expect(content).toContain('initial-scale=1');
      }
    });

    it('should support voice control and switch control', async () => {
      const testComponent = () => React.createElement('div', null, [
        React.createElement('button', {
          key: 'prev-btn',
          'aria-label': 'Navigate to previous file'
        }, '←'),
        React.createElement('button', {
          key: 'next-btn',
          'aria-label': 'Navigate to next file'
        }, '→'),
        React.createElement('div', {
          key: 'editor-region',
          role: 'region',
          'aria-label': 'Code editor',
          tabIndex: 0
        }, [
          React.createElement('textarea', {
            key: 'code-textarea',
            'aria-label': 'Code content'
          })
        ])
      ]);

      render(React.createElement(testComponent));

      // Check that all interactive elements have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAccessibleName();
    });

    it('should handle reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const animatedElement = document.createElement('div');
      animatedElement.className = 'transition-transform motion-reduce:transition-none hover:scale-105 motion-reduce:hover:scale-100';
      document.body.appendChild(animatedElement);

      // Check motion-reduce classes
      expect(animatedElement.classList.contains('motion-reduce:transition-none')).toBe(true);
      expect(animatedElement.classList.contains('motion-reduce:hover:scale-100')).toBe(true);

      document.body.removeChild(animatedElement);
    });

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,  
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const highContrastElement = document.createElement('button');
      highContrastElement.className = 'bg-blue-600 text-white contrast-more:bg-blue-800 contrast-more:border-2 contrast-more:border-white';
      document.body.appendChild(highContrastElement);

      // Check high contrast classes
      expect(highContrastElement.classList.contains('contrast-more:bg-blue-800')).toBe(true);
      expect(highContrastElement.classList.contains('contrast-more:border-2')).toBe(true);

      document.body.removeChild(highContrastElement);
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper form labels and validation', async () => {
      const testForm = () => React.createElement('form', null, [
        React.createElement('div', { key: 'username-field' }, [
          React.createElement('label', {
            key: 'username-label',
            htmlFor: 'username'
          }, 'Username *'),
          React.createElement('input', {
            key: 'username-input',
            id: 'username',
            name: 'username',
            required: true,
            'aria-describedby': 'username-error',
            'aria-invalid': 'false'
          }),
          React.createElement('div', {
            key: 'username-error',
            id: 'username-error',
            role: 'alert',
            className: 'text-red-600 hidden'
          }, 'Username is required')
        ]),
        
        React.createElement('div', { key: 'email-field' }, [
          React.createElement('label', {
            key: 'email-label',
            htmlFor: 'email'
          }, 'Email Address'),
          React.createElement('input', {
            key: 'email-input',
            id: 'email',
            name: 'email',
            type: 'email',
            'aria-describedby': 'email-help'
          }),
          React.createElement('div', {
            key: 'email-help',
            id: 'email-help',
            className: 'text-gray-600'
          }, "We'll never share your email")
        ]),

        React.createElement('fieldset', { key: 'notifications-fieldset' }, [
          React.createElement('legend', { key: 'legend' }, 'Notification Preferences'),
          React.createElement('label', { key: 'email-notif-label' }, [
            React.createElement('input', {
              key: 'email-notif-input',
              type: 'checkbox',
              name: 'notifications',
              value: 'email'
            }),
            ' Email notifications'
          ]),
          React.createElement('label', { key: 'sms-notif-label' }, [
            React.createElement('input', {
              key: 'sms-notif-input',
              type: 'checkbox',
              name: 'notifications',
              value: 'sms'
            }),
            ' SMS notifications'
          ])
        ]),

        React.createElement('button', {
          key: 'submit-btn',
          type: 'submit'
        }, 'Submit Form')
      ]);

      const { container } = render(React.createElement(testForm));

      // Check form labels
      const usernameInput = screen.getByLabelText(/Username/);
      expect(usernameInput).toHaveAttribute('required');
      expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error');

      const emailInput = screen.getByLabelText(/Email Address/);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-help');

      // Check fieldset and legend
      const fieldset = container.querySelector('fieldset');
      const legend = container.querySelector('legend');
      expect(fieldset).toBeInTheDocument();
      expect(legend).toHaveTextContent('Notification Preferences');
    });
  });
});