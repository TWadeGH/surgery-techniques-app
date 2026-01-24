# Testing Guide

This directory contains test setup and utilities for the Surgical Techniques App.

## Test Setup

The project uses:
- **Vitest** - Fast unit test framework (Vite-native)
- **React Testing Library** - Component testing utilities
- **jsdom** - DOM environment for testing

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- helpers.test.js
```

## Test Structure

```
src/
├── test/
│   ├── setup.js          # Test configuration and mocks
│   └── README.md         # This file
├── utils/
│   ├── helpers.test.js   # Tests for utility functions
│   └── validators.test.js # Tests for validators
└── components/
    └── **/*.test.jsx     # Component tests
```

## Writing Tests

### Unit Tests
Test individual functions and utilities in isolation.

Example:
```javascript
import { describe, it, expect } from 'vitest';
import { isAdmin } from '../utils/helpers';

describe('isAdmin', () => {
  it('should return true for admin users', () => {
    expect(isAdmin({ role: 'super_admin' })).toBe(true);
  });
});
```

### Component Tests
Test React components with React Testing Library.

Example:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

it('should call onClick when clicked', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for utilities and helpers
- **Component Tests**: Critical components (Button, Modal, etc.)
- **Integration Tests**: Key user flows (auth, resource management)

## Mocking

### Supabase
Supabase client is mocked in test setup. Use `vi.mock()` for specific tests:

```javascript
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));
```

### Browser APIs
Window APIs (matchMedia, IntersectionObserver) are mocked in `setup.js`.

## Best Practices

1. **Test behavior, not implementation** - Test what users see/do
2. **Use accessible queries** - Prefer `getByRole`, `getByLabelText`
3. **Keep tests isolated** - Each test should be independent
4. **Use descriptive test names** - "should do X when Y"
5. **Mock external dependencies** - Don't make real API calls in tests
