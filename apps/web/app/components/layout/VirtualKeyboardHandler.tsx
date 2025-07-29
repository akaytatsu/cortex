import { useEffect, ReactNode } from 'react';
import { useVirtualKeyboard } from '~/hooks/useVirtualKeyboard';

interface VirtualKeyboardHandlerProps {
  children: ReactNode;
  className?: string;
  adjustViewport?: boolean;
  addPaddingBottom?: boolean;
}

/**
 * Componente que gerencia o viewport quando o teclado virtual aparece/desaparece
 */
export function VirtualKeyboardHandler({
  children,
  className = '',
  adjustViewport = true,
  addPaddingBottom = true
}: VirtualKeyboardHandlerProps) {
  const { isVisible, height, overlayHeight } = useVirtualKeyboard();

  useEffect(() => {
    if (!adjustViewport) return;

    const metaViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!metaViewport) {
      console.warn('VirtualKeyboardHandler: meta viewport não encontrada');
      return;
    }

    const originalContent = metaViewport.content;

    if (isVisible) {
      // Ajusta viewport para evitar zoom quando teclado aparece
      metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      
      // Adiciona classe CSS ao body para ajustes globais
      document.body.classList.add('virtual-keyboard-visible');
      document.body.style.setProperty('--keyboard-height', `${height}px`);
      document.body.style.setProperty('--keyboard-overlay-height', `${overlayHeight}px`);
    } else {
      // Restaura viewport original
      metaViewport.content = originalContent;
      
      // Remove classe CSS do body
      document.body.classList.remove('virtual-keyboard-visible');
      document.body.style.removeProperty('--keyboard-height');
      document.body.style.removeProperty('--keyboard-overlay-height');
    }

    return () => {
      // Cleanup: sempre restaura o viewport original
      metaViewport.content = originalContent;
      document.body.classList.remove('virtual-keyboard-visible');
      document.body.style.removeProperty('--keyboard-height');
      document.body.style.removeProperty('--keyboard-overlay-height');
    };
  }, [isVisible, height, overlayHeight, adjustViewport]);

  // Estilos dinâmicos baseados no estado do teclado
  const dynamicStyles: React.CSSProperties = {};
  
  if (addPaddingBottom && isVisible) {
    dynamicStyles.paddingBottom = `${overlayHeight}px`;
  }

  const containerClasses = [
    className,
    isVisible ? 'keyboard-visible' : 'keyboard-hidden'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      style={dynamicStyles}
      data-keyboard-visible={isVisible}
      data-keyboard-height={height}
    >
      {children}
    </div>
  );
}