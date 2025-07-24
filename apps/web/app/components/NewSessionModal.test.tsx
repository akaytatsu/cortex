import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NewSessionModal } from "./NewSessionModal";
import type { ClaudeAgent } from "shared-types";

// Mock data
const mockAgents: ClaudeAgent[] = [
  {
    name: "TestAgent1",
    description: "A test agent for testing",
    command: "/test-command",
  },
  {
    name: "TestAgent2",
    description: "Another test agent",
    command: "/another-command",
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  agents: mockAgents,
  isLoading: false,
  error: undefined,
  onCreateSession: vi.fn(),
};

describe("NewSessionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<NewSessionModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Nova Sessão")).not.toBeInTheDocument();
  });

  it("renders modal content when isOpen is true", () => {
    render(<NewSessionModal {...defaultProps} />);

    expect(screen.getByText("Nova Sessão")).toBeInTheDocument();
    expect(
      screen.getByText("Selecione um agente para iniciar a sessão:")
    ).toBeInTheDocument();
  });

  it("displays loading state correctly", () => {
    render(<NewSessionModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Carregando agentes...")).toBeInTheDocument();
  });

  it("displays error state correctly", () => {
    const errorMessage = "Failed to load agents";
    render(<NewSessionModal {...defaultProps} error={errorMessage} />);

    expect(screen.getByText("Erro:")).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("displays default session option", () => {
    render(<NewSessionModal {...defaultProps} />);

    expect(screen.getByText("Sessão Padrão")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Inicia uma sessão Claude Code padrão sem agente específico"
      )
    ).toBeInTheDocument();
  });

  it("displays agent list correctly", () => {
    render(<NewSessionModal {...defaultProps} />);

    expect(screen.getByText("TestAgent1")).toBeInTheDocument();
    expect(screen.getByText("A test agent for testing")).toBeInTheDocument();
    expect(screen.getByText("/test-command")).toBeInTheDocument();

    expect(screen.getByText("TestAgent2")).toBeInTheDocument();
    expect(screen.getByText("Another test agent")).toBeInTheDocument();
    expect(screen.getByText("/another-command")).toBeInTheDocument();
  });

  it("handles agent selection", () => {
    render(<NewSessionModal {...defaultProps} />);

    const agentCard = screen
      .getByText("TestAgent1")
      .closest("div[class*='cursor-pointer']");
    fireEvent.click(agentCard!);

    // Check if the agent is selected (visual feedback)
    expect(agentCard).toHaveClass("ring-2", "ring-blue-500");
  });

  it("handles default session selection", () => {
    render(<NewSessionModal {...defaultProps} />);

    const defaultSessionCard = screen
      .getByText("Sessão Padrão")
      .closest("div[class*='cursor-pointer']");
    fireEvent.click(defaultSessionCard!);

    // Check if default session is selected
    expect(defaultSessionCard).toHaveClass("ring-2", "ring-blue-500");
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<NewSessionModal {...defaultProps} />);

    const backdrop = document.querySelector(
      ".absolute.inset-0.bg-black.bg-opacity-50"
    );
    fireEvent.click(backdrop!);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose when X button is clicked", () => {
    render(<NewSessionModal {...defaultProps} />);

    const closeButton = screen.getByText("✕");
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel button is clicked", () => {
    render(<NewSessionModal {...defaultProps} />);

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onCreateSession with default session when no agent is selected", async () => {
    const mockOnCreateSession = vi.fn().mockResolvedValue(undefined);
    render(
      <NewSessionModal
        {...defaultProps}
        onCreateSession={mockOnCreateSession}
      />
    );

    const createButton = screen.getByText("Criar Sessão");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreateSession).toHaveBeenCalledWith(undefined);
    });
  });

  it("calls onCreateSession with selected agent", async () => {
    const mockOnCreateSession = vi.fn().mockResolvedValue(undefined);
    render(
      <NewSessionModal
        {...defaultProps}
        onCreateSession={mockOnCreateSession}
      />
    );

    // Select an agent
    const agentCard = screen.getByText("TestAgent1").closest("div");
    fireEvent.click(agentCard!);

    // Create session
    const createButton = screen.getByText("Criar Sessão");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreateSession).toHaveBeenCalledWith(mockAgents[0]);
    });
  });

  it("shows loading state during session creation", async () => {
    const mockOnCreateSession = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
    render(
      <NewSessionModal
        {...defaultProps}
        onCreateSession={mockOnCreateSession}
      />
    );

    const createButton = screen.getByText("Criar Sessão");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Criando...")).toBeInTheDocument();
    });
  });

  it("disables buttons during session creation", async () => {
    const mockOnCreateSession = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
    render(
      <NewSessionModal
        {...defaultProps}
        onCreateSession={mockOnCreateSession}
      />
    );

    const createButton = screen.getByText("Criar Sessão");
    const cancelButton = screen.getByText("Cancelar");

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  it("displays message when no agents are found", () => {
    render(<NewSessionModal {...defaultProps} agents={[]} />);

    expect(
      screen.getByText("Nenhum agente encontrado no workspace")
    ).toBeInTheDocument();
  });

  it("starts with default session selected", () => {
    render(<NewSessionModal {...defaultProps} />);

    // Default session should be selected initially (null state)
    const defaultSessionCard = screen
      .getByText("Sessão Padrão")
      .closest("div[class*='cursor-pointer']");
    expect(defaultSessionCard).toHaveClass("ring-2", "ring-blue-500");
  });
});
