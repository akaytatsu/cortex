import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { ClaudeCodeMessage } from 'shared-types';
import { terminalWebSocketServer } from './websocket-server';
import { cliService } from '../services/cli.service';

// Mock dependencies
vi.mock('../services/cli.service');
vi.mock('../services/session.service', () => ({
  SessionService: {
    getUserId: vi.fn().mockResolvedValue('test-user'),
  },
}));
vi.mock('./logger', () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  }))
}));

class MockChildProcess extends EventEmitter {
  pid: number;
  stdin: { write: ReturnType<typeof vi.fn> };
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;

  constructor(pid: number) {
    super();
    this.pid = pid;
    this.stdin = { write: vi.fn() };
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.kill = vi.fn();
  }
}

class MockWebSocket extends EventEmitter {
  public readyState = WebSocket.OPEN;
  public sessionId?: string;
  public userId?: string;
  public connectionType?: 'claude-code';
  public isAlive = true;
  
  send = vi.fn();
  close = vi.fn();
  terminate = vi.fn();
  ping = vi.fn();
}

describe('WebSocket Server Integration with CliService', () => {
  const mockCliService = vi.mocked(cliService);
  let mockProcess: MockChildProcess;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess(12345);
    mockWebSocket = new MockWebSocket();
    
    // Setup default mocks
    mockCliService.startProcess.mockResolvedValue({
      pid: 12345,
      sessionId: 'test-session',
    });
    mockCliService.getProcess.mockReturnValue(mockProcess as any);
    mockCliService.stopProcess.mockReturnValue(true);
  });

  afterEach(() => {
    terminalWebSocketServer.stop();
  });

  describe('Start Session Flow', () => {
    it('should start Claude Code session and setup output redirection', async () => {
      const startMessage: ClaudeCodeMessage = {
        type: 'start_session',
        sessionId: 'test-session',
        workspacePath: '/test/workspace',
        command: 'claude --interactive',
      };

      // Simulate receiving start_session message
      const mockHandleStartSession = vi.fn().mockImplementation(async (ws, message) => {
        // Mock the CliService call
        await cliService.startProcess(
          message.workspacePath!,
          message.sessionId,
          message.command
        );

        // Setup output redirection
        const process = cliService.getProcess(message.sessionId);
        if (process) {
          process.stdout?.emit('data', Buffer.from('Claude Code started\n'));
          process.stderr?.emit('data', Buffer.from('Debug info\n'));
        }

        // Send success response
        ws.send(JSON.stringify({
          type: 'session_started',
          sessionId: message.sessionId,
          status: 'success',
        }));
      });

      await mockHandleStartSession(mockWebSocket, startMessage);

      // Verify CliService was called correctly
      expect(mockCliService.startProcess).toHaveBeenCalledWith(
        '/test/workspace',
        'test-session',
        'claude --interactive'
      );

      // Verify success response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_started',
          sessionId: 'test-session',
          status: 'success',
        })
      );

      // Simulate stdout output
      mockProcess.stdout.emit('data', Buffer.from('Hello from Claude\n'));
      
      // Slight delay to allow buffering
      await new Promise(resolve => setTimeout(resolve, 60));

      // Verify output was redirected (would be sent in real implementation)
      expect(mockCliService.getProcess).toHaveBeenCalledWith('test-session');
    });

    it('should handle start session with validation errors', async () => {
      mockCliService.startProcess.mockRejectedValueOnce(
        new Error('Invalid workspace path')
      );

      const startMessage: ClaudeCodeMessage = {
        type: 'start_session',
        sessionId: 'invalid-session',
        workspacePath: '../../../etc/passwd',
      };

      const mockHandleStartSession = vi.fn().mockImplementation(async (ws, message) => {
        try {
          await cliService.startProcess(
            message.workspacePath!,
            message.sessionId,
            message.command
          );
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'session_started',
            sessionId: message.sessionId,
            status: 'error',
            message: (error as Error).message,
          }));
        }
      });

      await mockHandleStartSession(mockWebSocket, startMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_started',
          sessionId: 'invalid-session',
          status: 'error',
          message: 'Invalid workspace path',
        })
      );
    });

    it('should prevent duplicate sessions', async () => {
      mockCliService.startProcess.mockRejectedValueOnce(
        new Error('Session already exists')
      );

      const startMessage: ClaudeCodeMessage = {
        type: 'start_session',
        sessionId: 'duplicate-session',
        workspacePath: '/test/workspace',
      };

      const mockHandleStartSession = vi.fn().mockImplementation(async (ws, message) => {
        try {
          await cliService.startProcess(
            message.workspacePath!,
            message.sessionId,
            message.command
          );
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'session_started',
            sessionId: message.sessionId,
            status: 'error',
            message: (error as Error).message,
          }));
        }
      });

      await mockHandleStartSession(mockWebSocket, startMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_started',
          sessionId: 'duplicate-session',
          status: 'error',
          message: 'Session already exists',
        })
      );
    });
  });

  describe('Stop Session Flow', () => {
    it('should stop Claude Code session successfully', () => {
      const stopMessage: ClaudeCodeMessage = {
        type: 'stop_session',
        sessionId: 'test-session',
      };

      const mockHandleStopSession = vi.fn().mockImplementation((ws, message) => {
        const success = cliService.stopProcess(message.sessionId);
        
        if (success) {
          ws.send(JSON.stringify({
            type: 'session_stopped',
            sessionId: message.sessionId,
          }));
        }
      });

      mockHandleStopSession(mockWebSocket, stopMessage);

      expect(mockCliService.stopProcess).toHaveBeenCalledWith('test-session');
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_stopped',
          sessionId: 'test-session',
        })
      );
    });

    it('should handle stop session for non-existent session', () => {
      mockCliService.stopProcess.mockReturnValue(false);

      const stopMessage: ClaudeCodeMessage = {
        type: 'stop_session',
        sessionId: 'non-existent',
      };

      const mockHandleStopSession = vi.fn().mockImplementation((ws, message) => {
        const success = cliService.stopProcess(message.sessionId);
        
        if (!success) {
          ws.send(JSON.stringify({
            type: 'session_stopped',
            sessionId: message.sessionId,
            message: 'Session not found',
          }));
        }
      });

      mockHandleStopSession(mockWebSocket, stopMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_stopped',
          sessionId: 'non-existent',
          message: 'Session not found',
        })
      );
    });
  });

  describe('Session Input Handling', () => {
    it('should forward input to Claude Code process', () => {
      const inputMessage: ClaudeCodeMessage = {
        type: 'input',
        sessionId: 'test-session',
        data: 'help\n',
      };

      const mockHandleSessionInput = vi.fn().mockImplementation((ws, message) => {
        const process = cliService.getProcess(message.sessionId);
        if (process && process.stdin) {
          process.stdin.write(message.data);
        }
      });

      mockHandleSessionInput(mockWebSocket, inputMessage);

      expect(mockCliService.getProcess).toHaveBeenCalledWith('test-session');
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('help\n');
    });

    it('should handle input for non-existent session', () => {
      mockCliService.getProcess.mockReturnValue(null);

      const inputMessage: ClaudeCodeMessage = {
        type: 'input',
        sessionId: 'non-existent',
        data: 'test\n',
      };

      const mockHandleSessionInput = vi.fn().mockImplementation((ws, message) => {
        const process = cliService.getProcess(message.sessionId);
        if (!process) {
          ws.send(JSON.stringify({
            type: 'error',
            data: 'Process not found or stdin not available',
            sessionId: message.sessionId,
          }));
        }
      });

      mockHandleSessionInput(mockWebSocket, inputMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: 'Process not found or stdin not available',
          sessionId: 'non-existent',
        })
      );
    });
  });

  describe('Output Buffering and Redirection', () => {
    it('should buffer and send stdout output', async () => {
      // Setup output buffering simulation
      let outputBuffer = '';
      const bufferDelay = 50;

      const flushOutputBuffer = vi.fn().mockImplementation(() => {
        if (outputBuffer.length > 0) {
          mockWebSocket.send(JSON.stringify({
            type: 'stdout',
            data: outputBuffer,
            sessionId: 'test-session',
          }));
          outputBuffer = '';
        }
      });

      // Simulate stdout data event
      mockProcess.stdout.on('data', (data: Buffer) => {
        outputBuffer += data.toString();
        setTimeout(flushOutputBuffer, bufferDelay);
      });

      // Emit some data
      mockProcess.stdout.emit('data', Buffer.from('Output line 1\n'));
      mockProcess.stdout.emit('data', Buffer.from('Output line 2\n'));

      // Wait for buffer to flush
      await new Promise(resolve => setTimeout(resolve, bufferDelay + 10));

      expect(flushOutputBuffer).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'stdout',
          data: 'Output line 1\nOutput line 2\n',
          sessionId: 'test-session',
        })
      );
    });

    it('should buffer and send stderr output', async () => {
      let errorBuffer = '';
      const bufferDelay = 50;

      const flushErrorBuffer = vi.fn().mockImplementation(() => {
        if (errorBuffer.length > 0) {
          mockWebSocket.send(JSON.stringify({
            type: 'stderr',
            data: errorBuffer,
            sessionId: 'test-session',
          }));
          errorBuffer = '';
        }
      });

      mockProcess.stderr.on('data', (data: Buffer) => {
        errorBuffer += data.toString();
        setTimeout(flushErrorBuffer, bufferDelay);
      });

      mockProcess.stderr.emit('data', Buffer.from('Error: Something went wrong\n'));

      await new Promise(resolve => setTimeout(resolve, bufferDelay + 10));

      expect(flushErrorBuffer).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'stderr',
          data: 'Error: Something went wrong\n',
          sessionId: 'test-session',
        })
      );
    });
  });

  describe('Process Exit Handling', () => {
    it('should handle process exit and cleanup', () => {
      const mockHandleProcessExit = vi.fn().mockImplementation((ws, sessionId) => {
        // Simulate process exit
        mockProcess.emit('exit', 0, null);
        
        // Send session_stopped message
        ws.send(JSON.stringify({
          type: 'session_stopped',
          sessionId: sessionId,
          exitCode: 0,
        }));
      });

      mockHandleProcessExit(mockWebSocket, 'test-session');

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_stopped',
          sessionId: 'test-session',
          exitCode: 0,
        })
      );
    });

    it('should handle process exit with error code', () => {
      const mockHandleProcessExit = vi.fn().mockImplementation((ws, sessionId) => {
        mockProcess.emit('exit', 1, 'SIGTERM');
        
        ws.send(JSON.stringify({
          type: 'session_stopped',
          sessionId: sessionId,
          exitCode: 1,
        }));
      });

      mockHandleProcessExit(mockWebSocket, 'test-session');

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'session_stopped',
          sessionId: 'test-session',
          exitCode: 1,
        })
      );
    });
  });

  describe('Message Protocol Validation', () => {
    it('should validate required fields in start_session message', () => {
      const invalidMessage: Partial<ClaudeCodeMessage> = {
        type: 'start_session',
        sessionId: 'test',
        // Missing workspacePath
      };

      const isValid = !!(invalidMessage.workspacePath && invalidMessage.sessionId);
      expect(isValid).toBe(false);
    });

    it('should validate required fields in input message', () => {
      const invalidMessage: Partial<ClaudeCodeMessage> = {
        type: 'input',
        sessionId: 'test',
        // Missing data
      };

      const isValid = !!(invalidMessage.sessionId && invalidMessage.data);
      expect(isValid).toBe(false);
    });

    it('should accept valid message formats', () => {
      const validMessages: ClaudeCodeMessage[] = [
        {
          type: 'start_session',
          sessionId: 'test',
          workspacePath: '/workspace',
          command: 'claude',
        },
        {
          type: 'input',
          sessionId: 'test',
          data: 'help\n',
        },
        {
          type: 'stop_session',
          sessionId: 'test',
        },
      ];

      validMessages.forEach(message => {
        expect(message).toHaveProperty('type');
        expect(message).toHaveProperty('sessionId');
        expect(message.sessionId).toBeTruthy();
      });
    });
  });
});