/**
 * Unit Tests for Toast Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

  it('should show success toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /success/i }));
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('should show error toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /error/i }));
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /success/i }));
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Advance past the 4000ms auto-dismiss duration and flush React updates
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should close toast when close button clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /success/i }));
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByLabelText('Close notification'));
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });
});
