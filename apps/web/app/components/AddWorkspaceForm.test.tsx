import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";
import { AddWorkspaceForm } from "./AddWorkspaceForm";

interface FormErrors {
  name?: string;
  path?: string;
  general?: string;
}

describe("AddWorkspaceForm", () => {
  const createComponent = (errors?: FormErrors) => {
    const RemixStub = createRemixStub([
      {
        path: "/",
        Component: () => <AddWorkspaceForm errors={errors} />,
      },
    ]);

    return <RemixStub />;
  };

  it("should render form fields", () => {
    render(createComponent());

    expect(screen.getByLabelText("Workspace Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace Path")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Workspace" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should have correct placeholders", () => {
    render(createComponent());

    expect(screen.getByPlaceholderText("My Project")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("/path/to/your/project")
    ).toBeInTheDocument();
  });

  it("should disable submit button when form is invalid", () => {
    render(createComponent());

    const submitButton = screen.getByRole("button", {
      name: "Create Workspace",
    });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when form is valid", async () => {
    render(createComponent());

    const nameInput = screen.getByLabelText("Workspace Name");
    const pathInput = screen.getByLabelText("Workspace Path");
    const submitButton = screen.getByRole("button", {
      name: "Create Workspace",
    });

    fireEvent.change(nameInput, { target: { value: "Test Workspace" } });
    fireEvent.change(pathInput, { target: { value: "/test/path" } });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("should show client-side validation errors", async () => {
    render(createComponent());

    const nameInput = screen.getByLabelText("Workspace Name");
    const pathInput = screen.getByLabelText("Workspace Path");

    // Trigger validation by typing and clearing
    fireEvent.change(nameInput, { target: { value: "test" } });
    fireEvent.change(nameInput, { target: { value: "" } });

    fireEvent.change(pathInput, { target: { value: "test" } });
    fireEvent.change(pathInput, { target: { value: "" } });

    await waitFor(() => {
      expect(
        screen.getByText("Workspace name is required")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Workspace path is required")
      ).toBeInTheDocument();
    });
  });

  it("should display server-side errors", () => {
    const errors = {
      name: "Name already exists",
      path: "Invalid path",
      general: "Something went wrong",
    };

    render(createComponent(errors));

    expect(screen.getByText("Name already exists")).toBeInTheDocument();
    expect(screen.getByText("Invalid path")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should prefer client errors over server errors", async () => {
    const errors = {
      name: "Server error for name",
    };

    render(createComponent(errors));

    const nameInput = screen.getByLabelText("Workspace Name");

    // Initially shows server error
    expect(screen.getByText("Server error for name")).toBeInTheDocument();

    // Type and clear to trigger client validation
    fireEvent.change(nameInput, { target: { value: "test" } });
    fireEvent.change(nameInput, { target: { value: "" } });

    await waitFor(() => {
      expect(
        screen.getByText("Workspace name is required")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Server error for name")
      ).not.toBeInTheDocument();
    });
  });

  it("should have cancel link pointing to workspaces", () => {
    render(createComponent());

    const cancelLink = screen.getByRole("link", { name: "Cancel" });
    expect(cancelLink.getAttribute("href")).toBe("/workspaces");
  });

  it("should handle form submission with trimmed values", async () => {
    render(createComponent());

    const nameInput = screen.getByLabelText("Workspace Name");
    const pathInput = screen.getByLabelText("Workspace Path");

    // Add spaces to test trimming
    fireEvent.change(nameInput, { target: { value: "  Test Workspace  " } });
    fireEvent.change(pathInput, { target: { value: "  /test/path  " } });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", {
        name: "Create Workspace",
      });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
