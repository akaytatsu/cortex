import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter } from './Modal';

describe('Modal Components', () => {
  describe('Modal', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('calls onClose when escape key is pressed', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeOnOverlayClick={true}>
          <div>Modal content</div>
        </Modal>
      );
      
      const overlay = screen.getByText('Modal content').closest('.fixed');
      fireEvent.click(overlay!);
      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onClose when overlay click is disabled', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
          <div>Modal content</div>
        </Modal>
      );
      
      const overlay = screen.getByText('Modal content').closest('.fixed');
      fireEvent.click(overlay!);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('renders close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      const closeButton = screen.getByLabelText('Fechar modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('does not render close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.queryByLabelText('Fechar modal')).not.toBeInTheDocument();
    });

    it('applies correct size classes', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          <div data-testid="modal-content">Modal content</div>
        </Modal>
      );
      
      const modalContent = screen.getByTestId('modal-content').closest('.modal-base');
      expect(modalContent).toHaveClass('max-w-2xl');
    });
  });

  describe('ModalHeader', () => {
    it('renders with proper spacing', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalHeader data-testid="header">Header content</ModalHeader>
        </Modal>
      );
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col');
    });
  });

  describe('ModalTitle', () => {
    it('renders with correct heading level', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalTitle as="h1">Modal Title</ModalTitle>
        </Modal>
      );
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Modal Title');
    });

    it('applies correct size classes', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalTitle size="xl" data-testid="title">Title</ModalTitle>
        </Modal>
      );
      
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-headline-small');
    });
  });

  describe('ModalDescription', () => {
    it('renders with secondary text styling', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalDescription data-testid="desc">Description</ModalDescription>
        </Modal>
      );
      
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-text-secondary');
    });
  });

  describe('ModalContent', () => {
    it('renders with scrollable content', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalContent data-testid="content">Content</ModalContent>
        </Modal>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('overflow-y-auto');
    });
  });

  describe('ModalFooter', () => {
    it('renders with border and proper spacing', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalFooter data-testid="footer">Footer</ModalFooter>
        </Modal>
      );
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('border-t', 'border-border-tertiary');
    });

    it('applies correct justify alignment', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalFooter justify="center" data-testid="footer">Footer</ModalFooter>
        </Modal>
      );
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('justify-center');
    });
  });
});