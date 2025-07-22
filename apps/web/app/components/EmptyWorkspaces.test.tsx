import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyWorkspaces } from "./EmptyWorkspaces";

describe("EmptyWorkspaces", () => {
  it("should render empty state message", () => {
    render(<EmptyWorkspaces />);

    expect(screen.getByText("No workspaces found. Create your first workspace to get started.")).toBeInTheDocument();
  });

  it("should render Add Workspace button with correct link", () => {
    render(<EmptyWorkspaces />);

    const addButton = screen.getByText("Add Workspace");
    expect(addButton).toBeInTheDocument();
    expect(addButton.getAttribute("href")).toBe("/workspaces/new");
  });

  it("should have correct styling classes", () => {
    render(<EmptyWorkspaces />);

    const container = screen.getByText("No workspaces found. Create your first workspace to get started.").closest("div");
    expect(container).toHaveClass("text-center", "py-12");
  });
});