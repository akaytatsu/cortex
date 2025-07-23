import { describe, it, expect, beforeEach } from "vitest";
import { AgentService } from "./agent.service";

describe("AgentService", () => {
  let agentService: AgentService;

  beforeEach(() => {
    // Reset singleton for testing
    (AgentService as any).instance = undefined;
    agentService = AgentService.getInstance();
  });

  describe("Agent Activation", () => {
    it("should activate dev agent successfully", async () => {
      const result = await agentService.activateAgent("BMad:agents:dev");

      expect(result.success).toBe(true);
      expect(result.greeting).toContain("Olá! Sou James 💻");
      expect(result.agentConfig?.id).toBe("dev");
    });

    it("should return error for unknown agent", async () => {
      const result = await agentService.activateAgent("BMad:agents:unknown");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Agente não encontrado");
    });

    it("should track active agent", async () => {
      await agentService.activateAgent("BMad:agents:dev");
      const activeAgent = agentService.getActiveAgent();

      expect(activeAgent?.id).toBe("dev");
      expect(activeAgent?.name).toBe("James");
    });
  });

  describe("Agent Commands", () => {
    beforeEach(async () => {
      await agentService.activateAgent("BMad:agents:dev");
    });

    it("should process help command", () => {
      const response = agentService.processAgentCommand("*help");

      expect(response).toContain("Comandos disponíveis para James 💻");
      expect(response).toContain("**help**");
      expect(response).toContain("**run-tests**");
    });

    it("should process exit command", () => {
      const response = agentService.processAgentCommand("*exit");

      expect(response).toContain("Tchau! Saindo do modo James");
      expect(agentService.getActiveAgent()).toBe(null);
    });

    it("should handle unknown commands", () => {
      const response = agentService.processAgentCommand("*unknown");

      expect(response).toContain("Comando não reconhecido");
      expect(response).toContain("*help");
    });

    it("should detect agent commands correctly", () => {
      expect(agentService.isAgentCommand("*help")).toBe(true);
      expect(agentService.isAgentCommand("*run-tests")).toBe(true);
      expect(agentService.isAgentCommand("regular message")).toBe(false);
      expect(agentService.isAgentCommand("help")).toBe(false);
    });

    it("should not process agent commands when no agent is active", () => {
      agentService.deactivateAgent();
      
      expect(agentService.isAgentCommand("*help")).toBe(false);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = AgentService.getInstance();
      const instance2 = AgentService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});