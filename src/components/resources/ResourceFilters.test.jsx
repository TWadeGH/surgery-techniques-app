/**
 * Unit Tests for ResourceFilters Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResourceFilters from './ResourceFilters';

describe('ResourceFilters Component', () => {
  it('should render search input', () => {
    render(<ResourceFilters searchTerm="" onSearchChange={() => {}} />);
    expect(screen.getByLabelText(/search resources/i)).toBeInTheDocument();
  });

  it('should display search term', () => {
    render(<ResourceFilters searchTerm="test query" onSearchChange={() => {}} />);
    const input = screen.getByLabelText(/search resources/i);
    expect(input).toHaveValue('test query');
  });

  it('should call onSearchChange when input changes', () => {
    const handleSearchChange = vi.fn();
    render(<ResourceFilters searchTerm="" onSearchChange={handleSearchChange} />);
    
    const input = screen.getByLabelText(/search resources/i);
    fireEvent.change(input, { target: { value: 'new query' } });
    
    expect(handleSearchChange).toHaveBeenCalledWith('new query');
  });

  it('should use custom placeholder', () => {
    render(
      <ResourceFilters 
        searchTerm="" 
        onSearchChange={() => {}} 
        placeholder="Custom placeholder"
      />
    );
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should use default placeholder when not provided', () => {
    render(<ResourceFilters searchTerm="" onSearchChange={() => {}} />);
    expect(screen.getByPlaceholderText('Search resources...')).toBeInTheDocument();
  });
});
