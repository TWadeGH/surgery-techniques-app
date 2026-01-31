/**
 * Unit Tests for ConfirmDialog Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
  it('should not render when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        message="Test message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        message="Test message"
        onConfirm={handleConfirm}
        onCancel={() => {}}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button clicked', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        message="Test message"
        onConfirm={() => {}}
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should use custom button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        message="Test message"
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });

  it('should apply danger variant styles', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        message="Test message"
        variant="danger"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton.className).toMatch(/red/i);
  });
});
