# Testing Documentation

## Overview

The Surgical Techniques App uses **Vitest** and **React Testing Library** for comprehensive testing.

## Setup

### Install Dependencies

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Configuration

- **vitest.config.js** - Vitest configuration
- **src/test/setup.js** - Test environment setup and mocks

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode (auto-rerun on changes)
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage report
npm run test:coverage
```

## Test Structure

### Unit Tests
Located alongside source files:
- `src/utils/*.test.js` - Utility function tests
- `src/components/**/*.test.jsx` - Component tests

### Test Files Created

1. **src/utils/helpers.test.js** - Tests for helper functions
   - `isAdmin`, `isSurgeon`, `isTrainee`
   - `canRateOrFavorite`
   - `formatDate`, `formatDuration`
   - `sortByDate`, `groupBy`

2. **src/utils/validators.test.js** - Tests for validation functions
   - `validateEmail`
   - `validateURL`
   - `validateRequired`
   - `validateMinLength`, `validateMaxLength`

3. **src/components/common/Button.test.jsx** - Button component tests
   - Rendering
   - Click handlers
   - Disabled state
   - Loading state
   - Variants and sizes

4. **src/components/resources/ResourceFilters.test.jsx** - Filter component tests
   - Search input rendering
   - Search term display
   - onChange handlers
   - Placeholder customization

## Test Coverage

### Current Coverage
- ✅ Utility functions (helpers, validators)
- ✅ Common components (Button, ResourceFilters)
- ⏳ More component tests (in progress)
- ⏳ Integration tests (in progress)

### Coverage Goals
- **Unit Tests**: 80%+ for utilities
- **Component Tests**: All common components
- **Integration Tests**: Critical user flows

## Writing New Tests

### Example: Testing a Utility Function

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should do something correctly', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Example: Testing a Component

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Mocking

### Supabase Client
Mock Supabase in tests:

```javascript
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockData,
          error: null,
        })),
      })),
    })),
  },
}));
```

### Browser APIs
Already mocked in `src/test/setup.js`:
- `window.matchMedia`
- `IntersectionObserver`

## Best Practices

1. **Test user behavior** - Test what users see and do, not implementation details
2. **Use accessible queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Keep tests isolated** - Each test should be independent
4. **Use descriptive names** - Test names should describe what is being tested
5. **Mock external dependencies** - Don't make real API calls in tests
6. **Test edge cases** - Include null, undefined, empty values
7. **Test error states** - Verify error handling works correctly

## Continuous Integration

Tests should run automatically in CI/CD:
- On every pull request
- Before merging to main
- On deployment

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
