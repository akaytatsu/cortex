import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { terminalService, TerminalServiceError } from "./terminal.service";

vi.mock("child_process");
vi.mock("./session.service");

const mockChildProcess = {
  pid: 12345,
  stdin: { write: vi.fn() },
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  on: vi.fn(),
  kill: vi.fn(),
  killed: false,
};

describe("TerminalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    terminalService.cleanup();
  });

  describe("createSession", () => {
    it("should create a terminal session with valid parameters", async () => {
      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );

      expect(session).toMatchObject({
        workspaceName: "test-workspace",
        userId: "user123",
        status: "active",
      });
      expect(session.id).toBeTruthy();
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it("should validate workspace path boundaries", async () => {
      await expect(
        terminalService.createSession(
          "test-workspace",
          "/../../../etc/passwd",
          "user123"
        )
      ).rejects.toThrow(TerminalServiceError);
    });
  });

  describe("spawnTerminal", () => {
    it("should spawn a terminal process in the correct workspace directory", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );

      const childProcess = await terminalService.spawnTerminal(session);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.objectContaining({
          cwd: session.workspacePath,
          env: expect.objectContaining({
            PWD: session.workspacePath,
            TERM: "xterm-color",
            COLORTERM: "truecolor",
          }),
        })
      );
      expect(childProcess).toBe(mockChildProcess);
    });

    it("should use appropriate shell based on platform", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true
      });

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );

      await terminalService.spawnTerminal(session);

      expect(mockSpawn).toHaveBeenCalledWith("cmd.exe", [], expect.any(Object));
      
      // Restore original platform
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true
      });
    });

    it("should throw error if process fails to spawn", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue({ ...mockChildProcess, pid: undefined } as unknown as ReturnType<typeof spawn>);

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );

      await expect(terminalService.spawnTerminal(session)).rejects.toThrow(
        TerminalServiceError
      );
    });
  });

  describe("writeToTerminal", () => {
    it("should write data to terminal stdin", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );
      
      await terminalService.spawnTerminal(session);
      
      const result = terminalService.writeToTerminal(session.id, "test command\n");
      
      expect(result).toBe(true);
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith("test command\n");
    });

    it("should return false for non-existent session", () => {
      const result = terminalService.writeToTerminal("non-existent", "data");
      expect(result).toBe(false);
    });
  });

  describe("terminateSession", () => {
    it("should terminate terminal process and clean up session", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );
      
      await terminalService.spawnTerminal(session);
      
      const result = terminalService.terminateSession(session.id);
      
      expect(result).toBe(true);
      expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should return false for non-existent session", () => {
      const result = terminalService.terminateSession("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("getActiveSessions", () => {
    it("should return active sessions for a user", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );
      
      await terminalService.spawnTerminal(session);
      
      const sessions = terminalService.getActiveSessions("user123");
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        workspaceName: "test-workspace",
        userId: "user123",
      });
    });

    it("should return empty array for user with no sessions", () => {
      const sessions = terminalService.getActiveSessions("no-sessions-user");
      expect(sessions).toHaveLength(0);
    });
  });

  describe("resizeTerminal", () => {
    it("should resize terminal and send SIGWINCH", async () => {
      const { spawn } = await import("child_process");
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);
      
      const mockProcessKill = vi.spyOn(process, "kill").mockImplementation(() => true);

      const session = await terminalService.createSession(
        "test-workspace",
        process.cwd(),
        "user123"
      );
      
      await terminalService.spawnTerminal(session);
      
      const result = terminalService.resizeTerminal(session.id);
      
      expect(result).toBe(true);
      expect(mockProcessKill).toHaveBeenCalledWith(12345, "SIGWINCH");
      
      mockProcessKill.mockRestore();
    });
  });
});