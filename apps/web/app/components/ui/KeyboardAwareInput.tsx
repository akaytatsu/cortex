import { forwardRef, useRef, useImperativeHandle, useCallback, useEffect } from "react";
import { Input, InputProps } from "./Input";
import { useVirtualKeyboard } from "../../hooks/useVirtualKeyboard";
import { cn } from "../../lib/utils";

export interface KeyboardAwareInputProps extends InputProps {
  autoScroll?: boolean;
  scrollOffset?: number;
  maintainViewport?: boolean;
}

export interface KeyboardAwareInputRef extends HTMLInputElement {
  scrollIntoView: (options?: { offset?: number }) => void;
  adjustForKeyboard: () => void;
}

/**
 * Input otimizado para teclado virtual em dispositivos móveis
 * Automaticamente ajusta posição e scroll quando focado
 */
const KeyboardAwareInput = forwardRef<KeyboardAwareInputRef, KeyboardAwareInputProps>(
  ({ 
    autoScroll = true,
    scrollOffset = 20,
    maintainViewport = true,
    onFocus,
    onBlur,
    className,
    ...props 
  }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { adjustForKeyboard, scrollToElement } = useVirtualKeyboard();

    // Expose internal methods via ref
    useImperativeHandle(ref, () => ({
      ...inputRef.current!,
      scrollIntoView: (options = {}) => {
        if (inputRef.current) {
          scrollToElement(inputRef.current, options.offset || scrollOffset);
        }
      },
      adjustForKeyboard: () => {
        if (inputRef.current) {
          adjustForKeyboard(inputRef.current);
        }
      }
    }), [adjustForKeyboard, scrollToElement, scrollOffset]);

    const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      // Chama o onFocus original se fornecido
      if (onFocus) {
        onFocus(event);
      }

      if (!autoScroll) return;

      // Aguarda um pouco para o teclado aparecer e então ajusta posição
      setTimeout(() => {
        if (inputRef.current) {
          scrollToElement(inputRef.current, scrollOffset);
        }
      }, 300);
    }, [onFocus, autoScroll, scrollToElement, scrollOffset]);

    const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      // Chama o onBlur original se fornecido
      if (onBlur) {
        onBlur(event);
      }
    }, [onBlur]);

    // Adiciona suporte a intersection observer para detectar quando input sai de vista
    useEffect(() => {
      if (!autoScroll || !inputRef.current) return;

      const element = inputRef.current;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Se o input está focado mas não está visível, scroll para ele
            if (!entry.isIntersecting && document.activeElement === element) {
              setTimeout(() => {
                scrollToElement(element, scrollOffset);
              }, 100);
            }
          });
        },
        {
          threshold: 1.0, // 100% visible
          rootMargin: '0px 0px -150px 0px' // Account for keyboard height
        }
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }, [autoScroll, scrollToElement, scrollOffset]);

    return (
      <Input
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        touchFriendly={true}
        className={cn(
          'keyboard-aware-input',
          maintainViewport && 'maintain-viewport',
          className
        )}
        {...props}
      />
    );
  }
);

KeyboardAwareInput.displayName = "KeyboardAwareInput";

export { KeyboardAwareInput };