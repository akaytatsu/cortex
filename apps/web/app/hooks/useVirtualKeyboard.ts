import { useState, useEffect, useCallback } from 'react';

interface VirtualKeyboardState {
  isVisible: boolean;
  height: number;
  overlayHeight: number;
}

export interface VirtualKeyboardDetector {
  isVisible: boolean;
  height: number;
  overlayHeight: number;
  adjustForKeyboard: (element: HTMLElement) => void;
  scrollToElement: (element: HTMLElement, offset?: number) => void;
}

/**
 * Hook para detectar e gerenciar o teclado virtual em dispositivos móveis
 */
export function useVirtualKeyboard(): VirtualKeyboardDetector {
  const [keyboardState, setKeyboardState] = useState<VirtualKeyboardState>({
    isVisible: false,
    height: 0,
    overlayHeight: 0
  });

  const detectKeyboard = useCallback(() => {
    // Método 1: Visual Viewport API (mais preciso quando disponível)
    if ('visualViewport' in window && window.visualViewport) {
      const viewport = window.visualViewport;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const heightDifference = windowHeight - viewportHeight;
      
      // Considera teclado visível se a diferença for maior que 150px
      const isKeyboardVisible = heightDifference > 150;
      const keyboardHeight = isKeyboardVisible ? heightDifference : 0;
      
      setKeyboardState({
        isVisible: isKeyboardVisible,
        height: keyboardHeight,
        overlayHeight: isKeyboardVisible ? Math.max(0, keyboardHeight - 50) : 0
      });
      
      return;
    }

    // Método 2: Fallback usando window.innerHeight
    const initialHeight = window.screen.height;
    const currentHeight = window.innerHeight;
    const heightDifference = initialHeight - currentHeight;
    
    // Para dispositivos móveis, considera teclado visível se perder mais de 25% da altura
    const threshold = initialHeight * 0.25;
    const isKeyboardVisible = heightDifference > threshold;
    const keyboardHeight = isKeyboardVisible ? heightDifference : 0;
    
    setKeyboardState({
      isVisible: isKeyboardVisible,
      height: keyboardHeight,
      overlayHeight: isKeyboardVisible ? Math.max(0, keyboardHeight - 50) : 0
    });
  }, []);

  const adjustForKeyboard = useCallback((element: HTMLElement) => {
    if (!keyboardState.isVisible) return;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const elementBottom = rect.bottom;
    
    // Se o elemento está sendo coberto pelo teclado
    if (elementBottom > (viewportHeight - keyboardState.height)) {
      const scrollOffset = elementBottom - (viewportHeight - keyboardState.height) + 20;
      window.scrollBy(0, scrollOffset);
    }
  }, [keyboardState.isVisible, keyboardState.height]);

  const scrollToElement = useCallback((element: HTMLElement, offset: number = 20) => {
    const rect = element.getBoundingClientRect();
    const absoluteTop = window.pageYOffset + rect.top;
    const availableHeight = window.innerHeight - keyboardState.height;
    const targetPosition = absoluteTop - (availableHeight / 2) + offset;
    
    window.scrollTo({
      top: Math.max(0, targetPosition),
      behavior: 'smooth'
    });
  }, [keyboardState.height]);

  useEffect(() => {
    // Detecta mudanças usando Visual Viewport API
    if ('visualViewport' in window && window.visualViewport) {
      const viewport = window.visualViewport;
      viewport.addEventListener('resize', detectKeyboard);
      
      return () => {
        viewport.removeEventListener('resize', detectKeyboard);
      };
    }

    // Fallback usando resize do window
    window.addEventListener('resize', detectKeyboard);
    
    return () => {
      window.removeEventListener('resize', detectKeyboard);
    };
  }, [detectKeyboard]);

  useEffect(() => {
    // Detecta estado inicial
    detectKeyboard();
  }, [detectKeyboard]);

  // Detecta foco em inputs para ajuste automático
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      
      // Verifica se é um elemento de input
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.getAttribute('role') === 'textbox'
      )) {
        // Aguarda um pouco para o teclado aparecer
        setTimeout(() => {
          adjustForKeyboard(target);
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [adjustForKeyboard]);

  return {
    isVisible: keyboardState.isVisible,
    height: keyboardState.height,
    overlayHeight: keyboardState.overlayHeight,
    adjustForKeyboard,
    scrollToElement
  };
}