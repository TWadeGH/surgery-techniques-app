/**
 * Unit Tests for Toast Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

// Test component that uses toast
function TestComponent() {
  const toast = useToast();
  
  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Success</button>
      <button onClick={() => toast.error('Error message')}>Error</button>
      <button onClick={() => toast.warning('Warning message')}>Warning</button>
      <button onClick={() => toast.info('Info message')}>Info</button>
    </div>
  );
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast provider', () => {
    render(
      <ToastProvider>
        <div>Test</div>
      </ToastProvider>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should show success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /success/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('should show error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /error/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should auto-dismiss toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /success/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Fast-forward time
    vi.advanceTimersByTime(4000);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should close toast when close button clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /success/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close notification');
    closeButton.click();

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });
});
