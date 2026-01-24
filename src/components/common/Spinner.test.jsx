/**
 * Unit Tests for Spinner Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner, { FullPageSpinner, InlineSpinner } from './Spinner';

describe('Spinner Component', () => {
  describe('Spinner', () => {
    it('should render spinner', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<Spinner label="Loading content" />);
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });

    it('should use default label', () => {
      render(<Spinner />);
      expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    });

    it('should apply size classes', () => {
      const { rerender } = render(<Spinner size="sm" />);
      let spinner = screen.getByRole('status');
      expect(spinner.querySelector('svg')).toHaveClass('h-4', 'w-4');

      rerender(<Spinner size="lg" />);
      spinner = screen.getByRole('status');
      expect(spinner.querySelector('svg')).toHaveClass('h-12', 'w-12');
    });
  });

  describe('FullPageSpinner', () => {
    it('should render full page spinner', () => {
      render(<FullPageSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(<FullPageSpinner message="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('InlineSpinner', () => {
    it('should render inline spinner', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-4', 'w-4');
    });
  });
});
