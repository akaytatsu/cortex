import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileMenu } from "./MobileMenu";

describe("MobileMenu", () => {
  const defaultProps = {
    isOpen: false,
    onToggle: vi.fn(),
    onNavigate: vi.fn(),
    workspaceName: "test-workspace",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render menu button", () => {
    render(<MobileMenu {...defaultProps} />);
    
    const menuButton = screen.getByLabelText("Abrir menu");
    expect(menuButton).toBeDefined();
  });

  it("should show close icon when menu is open", () => {
    render(<MobileMenu {...defaultProps} isOpen={true} />);
    
    const closeButtons = screen.getAllByLabelText("Fechar menu");
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it("should render workspace name in header when open", () => {
    render(<MobileMenu {...defaultProps} isOpen={true} />);
    
    expect(screen.getByText("test-workspace")).toBeDefined();
  });

  it("should render all menu items when open", () => {
    render(<MobileMenu {...defaultProps} isOpen={true} />);
    
    expect(screen.getByText("Explorer")).toBeDefined();
    expect(screen.getByText("Terminal")).toBeDefined();
    expect(screen.getByText("Copilot")).toBeDefined();
    expect(screen.getByText("Configurações")).toBeDefined();
  });

  it("should call onToggle when menu button is clicked", () => {
    const onToggle = vi.fn();
    render(<MobileMenu {...defaultProps} onToggle={onToggle} />);
    
    const menuButton = screen.getByLabelText("Abrir menu");
    fireEvent.click(menuButton);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("should call onNavigate and onToggle when menu item is clicked", () => {
    const onNavigate = vi.fn();
    const onToggle = vi.fn();
    render(<MobileMenu {...defaultProps} isOpen={true} onNavigate={onNavigate} onToggle={onToggle} />);
    
    const explorerItem = screen.getByText("Explorer");
    fireEvent.click(explorerItem);
    
    expect(onNavigate).toHaveBeenCalledWith("explorer");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("should close menu when backdrop is clicked", () => {
    const onToggle = vi.fn();
    render(<MobileMenu {...defaultProps} isOpen={true} onToggle={onToggle} />);
    
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    
    fireEvent.click(backdrop!);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("should have mobile menu items with correct classes", () => {
    render(<MobileMenu {...defaultProps} isOpen={true} />);
    
    const menuItems = document.querySelectorAll('.mobile-menu-item');
    expect(menuItems.length).toBe(4);
    menuItems.forEach(item => {
      expect(item.classList.contains('mobile-menu-item')).toBe(true);
    });
  });

  it("should not render drawer backdrop when menu is closed", () => {
    render(<MobileMenu {...defaultProps} isOpen={false} />);
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).toBeNull();
  });

  it("should truncate long workspace names", () => {
    const longName = "very-long-workspace-name-that-should-be-truncated";
    render(<MobileMenu {...defaultProps} workspaceName={longName} isOpen={true} />);
    
    const header = screen.getByText(longName);
    expect(header.classList.contains("truncate")).toBe(true);
  });
});