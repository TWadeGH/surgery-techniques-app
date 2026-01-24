/**
 * Unit Tests for Button Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Check for loading indicator (spinner or text)
    expect(button).toHaveTextContent(/loading/i);
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toMatch(/primary/i);

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button');
    expect(button.className).toMatch(/danger/i);
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toMatch(/sm/i);

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button.className).toMatch(/lg/i);
  });
});
