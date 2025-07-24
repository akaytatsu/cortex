/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { IDELayout } from "./IDELayout";
import type { Workspace } from "shared-types";

// Mock Remix React to use regular React Router for testing
interface MockLinkProps {
  to: string;
  children: React.ReactNode;
  [key: string]: unknown;
}

vi.mock("@remix-run/react", () => ({
  Link: ({ to, children, ...props }: MockLinkProps) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const mockWorkspace: Workspace = {
  name: "test-workspace",
  path: "/path/to/test-workspace",
};

const renderIDELayout = (
  workspace: Workspace = mockWorkspace,
  userId: string = "test-user-id"
) => {
  return render(
    <BrowserRouter>
      <IDELayout workspace={workspace} userId={userId} />
    </BrowserRouter>
  );
};

describe("IDELayout Component", () => {
  it("should render workspace name and path", () => {
    renderIDELayout();

    expect(screen.getByText("test-workspace")).toBeInTheDocument();
    expect(screen.getByText("/path/to/test-workspace")).toBeInTheDocument();
  });

  it("should render back to workspaces link", () => {
    renderIDELayout();

    const backLink = screen.getByRole("link", {
      name: /voltar para workspaces/i,
    });
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute("href")).toBe("/workspaces");
  });

  it("should render explorer section", () => {
    renderIDELayout();

    expect(screen.getByText("Explorer")).toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("index.js")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
  });

  it("should render welcome message", () => {
    renderIDELayout();

    expect(
      screen.getByText(`Bem-vindo ao ${mockWorkspace.name}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selecione um arquivo no Explorer para começar a editar")
    ).toBeInTheDocument();
  });

  it("should render status bar with workspace info", () => {
    renderIDELayout();

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(
      screen.getByText(`${mockWorkspace.name} - ${mockWorkspace.path}`)
    ).toBeInTheDocument();
  });

  it("should toggle bottom panel when Terminal button is clicked", () => {
    renderIDELayout();

    const terminalButton = screen.getByRole("button", { name: "Terminal" });

    // Initially, bottom panel should not be visible
    expect(
      screen.queryByText("$ Terminal será implementado em stories futuras")
    ).not.toBeInTheDocument();

    // Click to show terminal
    fireEvent.click(terminalButton);
    expect(
      screen.getByText("$ Terminal será implementado em stories futuras")
    ).toBeInTheDocument();

    // Click to hide terminal
    fireEvent.click(terminalButton);
    expect(
      screen.queryByText("$ Terminal será implementado em stories futuras")
    ).not.toBeInTheDocument();
  });

  it("should close bottom panel when close button is clicked", () => {
    renderIDELayout();

    // Open terminal panel
    const terminalButton = screen.getByRole("button", { name: "Terminal" });
    fireEvent.click(terminalButton);

    expect(
      screen.getByText("$ Terminal será implementado em stories futuras")
    ).toBeInTheDocument();

    // Close the panel
    const closeButton = screen.getByRole("button", { name: "✕" });
    fireEvent.click(closeButton);

    expect(
      screen.queryByText("$ Terminal será implementado em stories futuras")
    ).not.toBeInTheDocument();
  });

  it("should handle workspace names with special characters", () => {
    const specialWorkspace: Workspace = {
      name: "my-project & tests",
      path: "/path with spaces/workspace",
    };

    renderIDELayout(specialWorkspace);

    expect(screen.getByText("my-project & tests")).toBeInTheDocument();
    expect(screen.getByText("/path with spaces/workspace")).toBeInTheDocument();
    expect(
      screen.getByText("Bem-vindo ao my-project & tests")
    ).toBeInTheDocument();
  });

  it("should render all main layout areas", () => {
    renderIDELayout();

    // Header with breadcrumb
    expect(screen.getByRole("banner")).toBeInTheDocument();

    // Sidebar (Explorer)
    expect(screen.getByText("Explorer")).toBeInTheDocument();

    // Main content area
    expect(screen.getByText("Bem-vindo ao test-workspace")).toBeInTheDocument();

    // Status bar (footer)
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("should handle long workspace names gracefully", () => {
    const longNameWorkspace: Workspace = {
      name: "this-is-a-very-long-workspace-name-that-might-cause-layout-issues",
      path: "/very/long/path/to/workspace/directory/structure",
    };

    renderIDELayout(longNameWorkspace);

    expect(screen.getByText(longNameWorkspace.name)).toBeInTheDocument();
    expect(screen.getByText(longNameWorkspace.path)).toBeInTheDocument();
  });
});
