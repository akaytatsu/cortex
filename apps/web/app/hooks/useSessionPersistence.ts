import { useCallback } from 'react';
import type { PersistedSession } from 'shared-types';

interface UseSessionPersistenceReturn {
  saveSession: (session: PersistedSession) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<PersistedSession[]>;
  updateSession: (sessionId: string, updates: Partial<PersistedSession>) => Promise<void>;
}

export function useSessionPersistence(): UseSessionPersistenceReturn {
  const saveSession = useCallback(async (session: PersistedSession) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        throw new Error(`Failed to save session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing session:', error);
      throw error;
    }
  }, []);

  const loadSessions = useCallback(async (): Promise<PersistedSession[]> => {
    try {
      const response = await fetch('/api/sessions');

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }, []);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<PersistedSession>) => {
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }, []);

  return {
    saveSession,
    removeSession,
    loadSessions,
    updateSession,
  };
}