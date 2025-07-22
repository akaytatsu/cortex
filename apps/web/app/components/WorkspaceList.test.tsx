import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceList } from "./WorkspaceList";
import type { Workspace } from "shared-types";

// Mock alert for testing
const mockAlert = vi.fn();
global.alert = mockAlert;

describe("WorkspaceList", () => {
  const mockWorkspaces: Workspace[] = [
    { name: "Test Workspace", path: "/test/path" },
    { name: "Another Workspace", path: "/another/path" },
  ];

  it("should render null when workspaces array is empty", () => {
    const { container } = render(<WorkspaceList workspaces={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render workspaces list when workspaces exist", () => {
    render(<WorkspaceList workspaces={mockWorkspaces} />);

    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
    expect(screen.getByText("/test/path")).toBeInTheDocument();
    expect(screen.getByText("Another Workspace")).toBeInTheDocument();
    expect(screen.getByText("/another/path")).toBeInTheDocument();
  });

  it("should render Enter buttons for each workspace", () => {
    render(<WorkspaceList workspaces={mockWorkspaces} />);

    const enterButtons = screen.getAllByText("Enter");
    expect(enterButtons).toHaveLength(2);
  });

  it("should render Add Workspace button", () => {
    render(<WorkspaceList workspaces={mockWorkspaces} />);

    const addButton = screen.getByText("Add Workspace");
    expect(addButton).toBeInTheDocument();
    expect(addButton.getAttribute("href")).toBe("/workspaces/new");
  });

  it("should show alert when Enter button is clicked", () => {
    render(<WorkspaceList workspaces={mockWorkspaces} />);

    const enterButtons = screen.getAllByText("Enter");
    fireEvent.click(enterButtons[0]);

    expect(mockAlert).toHaveBeenCalledWith(
      "Entering workspace: Test Workspace"
    );
  });

  it("should handle workspace with special characters in name", () => {
    const specialWorkspaces: Workspace[] = [
      { name: "Test & Special Workspace", path: "/test/path" },
    ];

    render(<WorkspaceList workspaces={specialWorkspaces} />);

    expect(screen.getByText("Test & Special Workspace")).toBeInTheDocument();

    const enterButton = screen.getByText("Enter");
    fireEvent.click(enterButton);

    expect(mockAlert).toHaveBeenCalledWith(
      "Entering workspace: Test & Special Workspace"
    );
  });
});
