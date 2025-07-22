import { useCallback } from 'react';
import type { TextDelta } from 'shared-types';

interface UseTextDeltaReturn {
  generateTextDeltas: (oldText: string, newText: string, connectionId?: string) => TextDelta[];
  applyTextDeltas: (text: string, deltas: TextDelta[]) => string;
  transformDeltas: (deltas1: TextDelta[], deltas2: TextDelta[]) => { deltas1: TextDelta[], deltas2: TextDelta[] };
}

/**
 * Hook for working with text deltas for real-time editing
 */
export function useTextDelta(): UseTextDeltaReturn {
  
  /**
   * Generate text deltas from old text to new text
   * This is a simple implementation - in production you might want to use
   * a more sophisticated diff algorithm like Myers' diff
   */
  const generateTextDeltas = useCallback((
    oldText: string, 
    newText: string, 
    connectionId: string = 'client'
  ): TextDelta[] => {
    const deltas: TextDelta[] = [];
    const timestamp = new Date();
    
    // Simple character-by-character diff
    let i = 0;
    let j = 0;
    const oldLength = oldText.length;
    const newLength = newText.length;
    
    // Find common prefix
    while (i < oldLength && i < newLength && oldText[i] === newText[i]) {
      i++;
    }
    
    // Find common suffix
    let oldEnd = oldLength - 1;
    let newEnd = newLength - 1;
    while (oldEnd >= i && newEnd >= i && oldText[oldEnd] === newText[newEnd]) {
      oldEnd--;
      newEnd--;
    }
    
    // If we need to retain the common prefix
    if (i > 0) {
      deltas.push({
        operation: 'retain',
        position: 0,
        length: i,
        timestamp,
        connectionId,
      });
    }
    
    // Delete the old text in the middle
    const deleteLength = oldEnd - i + 1;
    if (deleteLength > 0) {
      deltas.push({
        operation: 'delete',
        position: i,
        length: deleteLength,
        timestamp,
        connectionId,
      });
    }
    
    // Insert the new text in the middle
    const insertText = newText.substring(i, newEnd + 1);
    if (insertText.length > 0) {
      deltas.push({
        operation: 'insert',
        position: i,
        text: insertText,
        timestamp,
        connectionId,
      });
    }
    
    // If we need to retain the common suffix
    const suffixLength = oldLength - oldEnd - 1;
    if (suffixLength > 0) {
      deltas.push({
        operation: 'retain',
        position: i + insertText.length,
        length: suffixLength,
        timestamp,
        connectionId,
      });
    }
    
    return deltas.filter(delta => 
      delta.operation === 'retain' ? (delta.length && delta.length > 0) : true
    );
  }, []);

  /**
   * Apply text deltas to a text string
   */
  const applyTextDeltas = useCallback((text: string, deltas: TextDelta[]): string => {
    let result = text;
    let offset = 0;
    
    for (const delta of deltas) {
      switch (delta.operation) {
        case 'retain':
          // Nothing to do for retain operations in this simple implementation
          if (delta.length) {
            offset += delta.length;
          }
          break;
          
        case 'delete':
          if (delta.length) {
            const deleteStart = delta.position + offset;
            const deleteEnd = deleteStart + delta.length;
            result = result.substring(0, deleteStart) + result.substring(deleteEnd);
            offset -= delta.length; // Adjust offset because we deleted text
          }
          break;
          
        case 'insert':
          if (delta.text) {
            const insertPosition = delta.position + offset;
            result = result.substring(0, insertPosition) + delta.text + result.substring(insertPosition);
            offset += delta.text.length; // Adjust offset because we inserted text
          }
          break;
      }
    }
    
    return result;
  }, []);

  /**
   * Basic operational transform for two sets of deltas
   * This is a simplified implementation - production systems would use more sophisticated OT algorithms
   */
  const transformDeltas = useCallback((
    deltas1: TextDelta[], 
    deltas2: TextDelta[]
  ): { deltas1: TextDelta[], deltas2: TextDelta[] } => {
    // For this basic implementation, we'll just handle simple cases
    // In a real OT system, you'd use algorithms like Jupiter or differential synchronization
    
    const transformedDeltas1: TextDelta[] = [];
    const transformedDeltas2: TextDelta[] = [];
    
    let offset1 = 0;
    let offset2 = 0;
    
    // Simple conflict resolution: prioritize by timestamp
    const allDeltas = [
      ...deltas1.map(d => ({ ...d, source: '1' as const })),
      ...deltas2.map(d => ({ ...d, source: '2' as const }))
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (const delta of allDeltas) {
      if (delta.source === '1') {
        // Transform delta1 based on previously applied delta2s
        const transformedDelta = { ...delta };
        delete (transformedDelta as any).source;
        
        switch (delta.operation) {
          case 'insert':
            transformedDelta.position = delta.position + offset1;
            transformedDeltas1.push(transformedDelta as TextDelta);
            if (delta.text) offset2 += delta.text.length;
            break;
          case 'delete':
            transformedDelta.position = delta.position + offset1;
            transformedDeltas1.push(transformedDelta as TextDelta);
            if (delta.length) offset2 -= delta.length;
            break;
          case 'retain':
            transformedDeltas1.push(transformedDelta as TextDelta);
            break;
        }
      } else {
        // Transform delta2 based on previously applied delta1s
        const transformedDelta = { ...delta };
        delete (transformedDelta as any).source;
        
        switch (delta.operation) {
          case 'insert':
            transformedDelta.position = delta.position + offset2;
            transformedDeltas2.push(transformedDelta as TextDelta);
            if (delta.text) offset1 += delta.text.length;
            break;
          case 'delete':
            transformedDelta.position = delta.position + offset2;
            transformedDeltas2.push(transformedDelta as TextDelta);
            if (delta.length) offset1 -= delta.length;
            break;
          case 'retain':
            transformedDeltas2.push(transformedDelta as TextDelta);
            break;
        }
      }
    }
    
    return {
      deltas1: transformedDeltas1,
      deltas2: transformedDeltas2,
    };
  }, []);

  return {
    generateTextDeltas,
    applyTextDeltas,
    transformDeltas,
  };
}