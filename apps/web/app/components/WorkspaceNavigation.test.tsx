/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceList } from "./WorkspaceList";
import type { Workspace } from "shared-types";

interface MockLinkProps {
  to: string;
  children: React.ReactNode;
  [key: string]: unknown;
}

interface MockFormProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

// Mock Remix React to use regular React Router for testing
vi.mock("@remix-run/react", () => ({
  Link: ({ to, children, ...props }: MockLinkProps) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Form: ({ children, ...props }: MockFormProps) => (
    <form {...props}>{children}</form>
  ),
}));

const mockWorkspaces: Workspace[] = [
  { name: "project-1", path: "/path/to/project-1" },
  { name: "project-2", path: "/path/to/project-2" },
  { name: "project with spaces", path: "/path/to/project with spaces" },
];

const renderWorkspaceList = (workspaces: Workspace[] = mockWorkspaces) => {
  return render(
    <BrowserRouter>
      <WorkspaceList workspaces={workspaces} />
    </BrowserRouter>
  );
};

describe("WorkspaceList Navigation", () => {
  it("should render Enter links for each workspace", () => {
    renderWorkspaceList();

    const enterLinks = screen.getAllByRole("link", { name: "Entrar" });
    expect(enterLinks).toHaveLength(3);

    // Check that each link points to correct workspace route
    expect(enterLinks[0].getAttribute("href")).toBe("/workspaces/project-1");
    expect(enterLinks[1].getAttribute("href")).toBe("/workspaces/project-2");
    expect(enterLinks[2].getAttribute("href")).toBe(
      "/workspaces/project%20with%20spaces"
    );
  });

  it("should encode workspace names with special characters in URLs", () => {
    const specialWorkspaces: Workspace[] = [
      { name: "project & test", path: "/path" },
      { name: "project+with+plus", path: "/path" },
      { name: "project/with/slashes", path: "/path" },
    ];

    renderWorkspaceList(specialWorkspaces);

    const enterLinks = screen.getAllByRole("link", { name: "Entrar" });
    expect(enterLinks[0].getAttribute("href")).toBe(
      "/workspaces/project%20%26%20test"
    );
    expect(enterLinks[1].getAttribute("href")).toBe(
      "/workspaces/project%2Bwith%2Bplus"
    );
    expect(enterLinks[2].getAttribute("href")).toBe(
      "/workspaces/project%2Fwith%2Fslashes"
    );
  });

  it("should render Add Workspace link", () => {
    renderWorkspaceList();

    const addLink = screen.getByRole("link", { name: "Adicionar Workspace" });
    expect(addLink.getAttribute("href")).toBe("/workspaces/new");
  });

  it("should not render workspace list when no workspaces exist", () => {
    renderWorkspaceList([]);

    expect(
      screen.queryByRole("link", { name: "Entrar" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Adicionar Workspace" })
    ).not.toBeInTheDocument();
  });

  it("should render workspace names and paths correctly", () => {
    renderWorkspaceList();

    expect(screen.getByText("project-1")).toBeInTheDocument();
    expect(screen.getByText("/path/to/project-1")).toBeInTheDocument();
    expect(screen.getByText("project-2")).toBeInTheDocument();
    expect(screen.getByText("/path/to/project-2")).toBeInTheDocument();
    expect(screen.getByText("project with spaces")).toBeInTheDocument();
    expect(
      screen.getByText("/path/to/project with spaces")
    ).toBeInTheDocument();
  });

  it("should handle empty workspace names gracefully", () => {
    const edgeCaseWorkspaces: Workspace[] = [
      { name: "", path: "/empty/name" },
      { name: "normal", path: "" },
    ];

    renderWorkspaceList(edgeCaseWorkspaces);

    const enterLinks = screen.getAllByRole("link", { name: "Entrar" });
    expect(enterLinks[0].getAttribute("href")).toBe("/workspaces/");
    expect(enterLinks[1].getAttribute("href")).toBe("/workspaces/normal");
  });

  it("should render the correct number of workspaces", () => {
    renderWorkspaceList();

    // Should have 3 workspace cards
    expect(screen.getAllByText("Entrar")).toHaveLength(3);
    expect(screen.getAllByText("Remover")).toHaveLength(3);
  });

  it("should handle single workspace", () => {
    const singleWorkspace: Workspace[] = [
      { name: "only-workspace", path: "/single/path" },
    ];

    renderWorkspaceList(singleWorkspace);

    const enterLinks = screen.getAllByRole("link", { name: "Entrar" });
    expect(enterLinks).toHaveLength(1);
    expect(enterLinks[0].getAttribute("href")).toBe(
      "/workspaces/only-workspace"
    );
  });

  it("should maintain consistent styling classes for navigation links", () => {
    renderWorkspaceList();

    const enterLinks = screen.getAllByRole("link", { name: "Entrar" });
    enterLinks.forEach(link => {
      expect(link.className).toContain("inline-flex");
      expect(link.className).toContain("items-center");
      expect(link.className).toContain("border");
    });

    const addLink = screen.getByRole("link", { name: "Adicionar Workspace" });
    expect(addLink.className).toContain("inline-flex");
    expect(addLink.className).toContain("bg-indigo-600");
  });
});
