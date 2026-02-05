# Frontend Guidelines

## Component Structure

### File Organization
```
src/
├── components/
│   ├── admin/           # Admin-only components
│   ├── common/          # Reusable UI components
│   ├── layout/          # Header, Sidebar, Footer
│   ├── legal/           # Legal page content
│   ├── modals/          # Modal dialogs
│   ├── resources/       # Resource-related components
│   └── views/           # Full-page views
├── hooks/               # Custom React hooks
├── lib/                 # External service clients
├── services/            # Business logic wrappers
└── utils/               # Constants, helpers
```

### Component Template
```jsx
/**
 * ComponentName
 * Brief description of what this component does.
 */

import React from 'react';

function ComponentName({ prop1, prop2 }) {
  // Hooks first
  // Event handlers
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default ComponentName;
```

## State Management

### Hook-Based Architecture
- No Redux or Context (except for simple cases)
- Domain logic lives in custom hooks under `src/hooks/`
- Components are thin wrappers that call hooks

### Key Hooks
- `useAuth` - Authentication state and methods
- `useResources` - Resource fetching with filters
- `useFavorites` - User favorites CRUD
- `useNotes` - User notes CRUD
- `useUpcomingCases` - Case tracking
- `useAdminMessaging` - Admin messaging system

## Styling

### Tailwind CSS
- Use Tailwind utilities, avoid custom CSS
- Follow design system tokens (see DESIGN_SYSTEM.md)
- Dark mode: use `dark:` prefix

### Class Ordering
1. Layout (flex, grid, position)
2. Sizing (w, h, p, m)
3. Typography (text, font)
4. Colors (bg, text, border)
5. Effects (shadow, opacity)
6. States (hover, focus, dark)

### Example
```jsx
<button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 dark:bg-purple-500">
```

## Props Pattern

### Destructure with Defaults
```jsx
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}) {
  // ...
}
```

### Prop Types (via JSDoc)
```jsx
/**
 * @param {Object} props
 * @param {string} props.title - The card title
 * @param {React.ReactNode} props.children - Card content
 * @param {() => void} [props.onClose] - Optional close handler
 */
function Card({ title, children, onClose }) {
  // ...
}
```

## Event Handling

### Naming Convention
- Handlers: `handleXxx` (e.g., `handleClick`, `handleSubmit`)
- Props: `onXxx` (e.g., `onClick`, `onSubmit`)

### Async Handlers
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await doSomething();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## Conditional Rendering

### Prefer Early Returns
```jsx
if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;

return <DataView data={data} />;
```

### Inline Conditions
```jsx
{isVisible && <Component />}
{items.length > 0 ? <List items={items} /> : <EmptyState />}
```

## Performance

### Memoization
- Use `memo()` for expensive components
- Use `useMemo()` for expensive computations
- Use `useCallback()` for handlers passed to memoized children

### Lazy Loading
- Use `React.lazy()` for route-level code splitting
- Already implemented for admin panels

## Accessibility

### Required
- All interactive elements keyboard accessible
- Focus states visible
- ARIA labels for icon-only buttons
- Form labels associated with inputs
- Color contrast meets WCAG AA

### Example
```jsx
<button
  onClick={handleClose}
  aria-label="Close modal"
  className="focus:outline-none focus:ring-2 focus:ring-purple-500"
>
  <X size={20} />
</button>
```
