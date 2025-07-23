import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusIndicator } from "./StatusIndicator";

describe("StatusIndicator", () => {
  it("renders idle status correctly", () => {
    render(<StatusIndicator status="idle" />);
    
    expect(screen.getByText("Pronto para conversar")).toBeDefined();
  });

  it("renders thinking status correctly", () => {
    render(<StatusIndicator status="thinking" />);
    
    expect(screen.getByText("Claude está pensando...")).toBeDefined();
  });

  it("renders error status correctly", () => {
    render(<StatusIndicator status="error" />);
    
    expect(screen.getByText("Erro na comunicação")).toBeDefined();
  });

  it("renders active status correctly", () => {
    render(<StatusIndicator status="active" />);
    
    expect(screen.getByText("Conversando com Claude")).toBeDefined();
  });

  it("renders custom message when provided", () => {
    render(<StatusIndicator status="thinking" message="Processando sua solicitação..." />);
    
    expect(screen.getByText("Processando sua solicitação...")).toBeDefined();
  });

  it("has correct CSS classes for different statuses", () => {
    const { rerender } = render(<StatusIndicator status="thinking" />);
    let container = screen.getByText("Claude está pensando...").parentElement;
    expect(container?.className).toContain("text-blue-600");

    rerender(<StatusIndicator status="error" />);
    container = screen.getByText("Erro na comunicação").parentElement;
    expect(container?.className).toContain("text-red-600");

    rerender(<StatusIndicator status="active" />);
    container = screen.getByText("Conversando com Claude").parentElement;
    expect(container?.className).toContain("text-green-600");
  });
});