import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultipleClaudeCodeSessions } from '../hooks/useMultipleClaudeCodeSessions';
import { SessionPersistenceService } from './session-persistence.service';
import type { PersistedSession, ClaudeAgent } from 'shared-types';

// Mock do RemixRun para evitar problemas nos testes
vi.mock('@remix-run/react', () => ({
  useFetcher: () => ({
    data: { agents: [] },
    state: 'idle',
    load: vi.fn(),
  }),
}));

// Mock do WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = MockWebSocket.CLOSED;
  
  constructor(url: string) {
    // Simular conexão bem-sucedida após um curto delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  send(data: string) {
    // Mock do envio de mensagem
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000 }));
    }
  }
}

// Mock global do WebSocket
Object.defineProperty(global, 'WebSocket', {
  writable: true,
  value: MockWebSocket,
});

// Mock do fetch para endpoints da API
global.fetch = vi.fn();

describe('SessionPersistenceService Integration Tests', () => {
  const mockSessionPersistenceService = {
    saveSession: vi.fn(),
    removeSession: vi.fn(),
    loadSessions: vi.fn(),
    updateSession: vi.fn(),
  };

  const defaultOptions = {
    workspaceName: 'test-workspace',
    workspacePath: '/test/path',
    userId: 'test-user',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock das respostas da API
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/terminal-port')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ port: 3001 }),
        });
      }
      if (url.includes('/api/current-user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            authenticated: true, 
            userId: 'test-user' 
          }),
        });
      }
      if (url.includes('/api/sessions')) {
        const method = options?.method || 'GET';
        
        if (method === 'GET') {
          // Return mock sessions for loadSessions
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ sessions: [] }),
          });
        }
        
        if (method === 'POST') {
          // Mock saveSession
          const sessionData = JSON.parse(options.body);
          const result = mockSessionPersistenceService.saveSession(sessionData);
          
          // Handle both resolved and rejected promises
          return result
            .then(() => Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            }))
            .catch((error: Error) => Promise.resolve({
              ok: false,
              status: 500,
              statusText: error.message,
              json: () => Promise.resolve({ error: error.message }),
            }));
        }
        
        if (method === 'DELETE') {
          // Mock removeSession
          const sessionId = url.split('/').pop();
          mockSessionPersistenceService.removeSession(sessionId);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
      }
      return Promise.reject(new Error(`Unhandled URL: ${url} ${options?.method || 'GET'}`));
    });
    
    // Mock do SessionPersistenceService
    mockSessionPersistenceService.loadSessions.mockResolvedValue([]);
    mockSessionPersistenceService.saveSession.mockResolvedValue(undefined);
    mockSessionPersistenceService.removeSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Subtask 2.1: Verificar call para saveSession ao criar sessão', () => {
    it('deve falhar - createSession não chama SessionPersistenceService (RED)', async () => {
      const { result } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Aguardar conexão WebSocket
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const testAgent: ClaudeAgent = {
        name: 'test-agent',
        command: 'test command',
        description: 'Test agent description',
      };

      // Criar sessão
      await act(async () => {
        await result.current.createSession(testAgent);
      });

      // DEVE FALHAR - saveSession não é chamado
      expect(mockSessionPersistenceService.saveSession).toHaveBeenCalledTimes(1);
      
      const savedSession: PersistedSession = mockSessionPersistenceService.saveSession.mock.calls[0][0];
      expect(savedSession).toMatchObject({
        workspaceName: 'test-workspace',
        workspacePath: '/test/path',
        userId: 'test-user',
        agentName: 'test-agent',
        command: 'test command',
      });
      expect(savedSession.id).toBeDefined();
      expect(savedSession.startedAt).toBeDefined();
      expect(savedSession.pid).toBeGreaterThan(0);
    });
  });

  describe('Subtask 2.2: Verificar carregamento de sessões na inicialização', () => {
    it('deve falhar - hook não carrega sessões persistidas na inicialização (RED)', async () => {
      const mockPersistedSessions: PersistedSession[] = [
        {
          id: 'session-1',
          workspaceName: 'test-workspace',
          workspacePath: '/test/path',
          userId: 'test-user',
          pid: 1234,
          startedAt: new Date().toISOString(),
          agentName: 'test-agent',
        },
        {
          id: 'session-2',
          workspaceName: 'test-workspace',
          workspacePath: '/test/path',
          userId: 'test-user',
          pid: 5678,
          startedAt: new Date().toISOString(),
        },
      ];

      mockSessionPersistenceService.loadSessions.mockResolvedValue(mockPersistedSessions);

      const { result } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Aguardar carregamento inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // DEVE FALHAR - loadSessions não é chamado na inicialização
      expect(mockSessionPersistenceService.loadSessions).toHaveBeenCalledTimes(1);
      
      // DEVE FALHAR - sessões persistidas não são carregadas
      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[0].id).toBe('session-1');
      expect(result.current.sessions[1].id).toBe('session-2');
    });
  });

  describe('Subtask 2.3: Verificar remoção de sessão via painel', () => {
    it('deve falhar - closeSession não chama removeSession (RED)', async () => {
      const { result } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Aguardar conexão WebSocket
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Criar uma sessão primeiro
      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0]?.id;
      expect(sessionId).toBeDefined();

      // Fechar sessão
      await act(async () => {
        await result.current.closeSession(sessionId);
      });

      // DEVE FALHAR - removeSession não é chamado
      expect(mockSessionPersistenceService.removeSession).toHaveBeenCalledTimes(1);
      expect(mockSessionPersistenceService.removeSession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('Subtask 2.4: Verificar tratamento de erros de persistência', () => {
    it('deve falhar - erro de saveSession não é tratado com toast (RED)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSessionPersistenceService.saveSession.mockRejectedValue(
        new Error('Failed to save session')
      );

      const { result } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Aguardar conexão WebSocket
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Tentar criar sessão
      await act(async () => {
        await result.current.createSession();
      });

      // DEVE FALHAR - erro deve ser tratado via toast
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');
      expect(result.current.toasts[0].title).toBe('Erro ao salvar sessão');
      
      consoleSpy.mockRestore();
    });

    it('deve falhar - erro de loadSessions não é tratado graciosamente (RED)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSessionPersistenceService.loadSessions.mockRejectedValue(
        new Error('Failed to load sessions')
      );

      const { result } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Aguardar tentativa de carregamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // DEVE FALHAR - deve continuar funcionando mesmo com erro de carregamento
      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull(); // Deve ser resiliente
      
      consoleSpy.mockRestore();
    });
  });

  describe('Subtask 2.5: Verificar sincronização após reload da página', () => {
    it('deve falhar - sessões não são sincronizadas corretamente após reload (RED)', async () => {
      const mockPersistedSessions: PersistedSession[] = [
        {
          id: 'persistent-session',
          workspaceName: 'test-workspace',
          workspacePath: '/test/path',
          userId: 'test-user',
          pid: 9999,
          startedAt: new Date().toISOString(),
          agentName: 'persistent-agent',
        },
      ];

      mockSessionPersistenceService.loadSessions.mockResolvedValue(mockPersistedSessions);

      // Simular primeiro carregamento da página
      const { result: firstResult, unmount } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Unmount para simular reload
      unmount();

      // Simular segundo carregamento (reload)
      const { result: secondResult } = renderHook(() => 
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // DEVE FALHAR - sessões devem ser carregadas novamente
      expect(mockSessionPersistenceService.loadSessions).toHaveBeenCalledTimes(2);
      expect(secondResult.current.sessions).toHaveLength(1);
      expect(secondResult.current.sessions[0].id).toBe('persistent-session');
      expect(secondResult.current.sessions[0].agentName).toBe('persistent-agent');
    });
  });
});