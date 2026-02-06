# Design System

## Colors

### Brand Colors
```css
--color-primary: #9333ea        /* Purple 600 */
--color-primary-hover: #7c3aed  /* Purple 500 */
--color-primary-light: #f3e8ff  /* Purple 100 */
--color-secondary: #ec4899      /* Pink 500 */
--color-gradient: linear-gradient(to right, #9333ea, #ec4899)
```

### Semantic Colors
```css
--color-success: #22c55e   /* Green 500 */
--color-warning: #f59e0b   /* Amber 500 */
--color-danger: #ef4444    /* Red 500 */
--color-info: #3b82f6      /* Blue 500 */
```

### Neutral Colors (Light Mode)
```css
--color-bg: #ffffff
--color-surface: #f9fafb       /* Gray 50 */
--color-border: #e5e7eb        /* Gray 200 */
--color-text: #111827          /* Gray 900 */
--color-text-muted: #6b7280    /* Gray 500 */
```

### Neutral Colors (Dark Mode)
```css
--color-bg-dark: #111827       /* Gray 900 */
--color-surface-dark: #1f2937  /* Gray 800 */
--color-border-dark: #374151   /* Gray 700 */
--color-text-dark: #f9fafb     /* Gray 50 */
--color-text-muted-dark: #9ca3af /* Gray 400 */
```

## Typography

### Font Family
```css
font-family: system-ui, -apple-system, sans-serif
```

### Font Sizes
```css
--text-xs: 0.75rem     /* 12px */
--text-sm: 0.875rem    /* 14px */
--text-base: 1rem      /* 16px */
--text-lg: 1.125rem    /* 18px */
--text-xl: 1.25rem     /* 20px */
--text-2xl: 1.5rem     /* 24px */
--text-3xl: 1.875rem   /* 30px */
```

### Font Weights
```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

## Spacing

```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
```

## Border Radius

```css
--radius-sm: 0.25rem   /* 4px */
--radius-md: 0.5rem    /* 8px */
--radius-lg: 0.75rem   /* 12px */
--radius-xl: 1rem      /* 16px */
--radius-2xl: 1.5rem   /* 24px */
--radius-full: 9999px  /* Pill shape */
```

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

## Breakpoints

```css
--breakpoint-sm: 640px   /* Mobile landscape */
--breakpoint-md: 768px   /* Tablet */
--breakpoint-lg: 1024px  /* Desktop */
--breakpoint-xl: 1280px  /* Large desktop */
```

## Component Patterns

### Buttons
- Primary: Gradient background, white text, rounded-lg
- Secondary: Border, transparent bg, primary text color
- Danger: Red background for destructive actions

### Cards
- White/dark surface background
- Rounded-2xl corners
- Shadow-lg
- Padding: space-4 to space-6

### Inputs
- Rounded-xl
- Border with focus ring (purple)
- Padding: space-3 horizontal, space-2 vertical

### Modals
- Centered overlay with backdrop blur
- Rounded-2xl container
- Max-width based on content type

## Glass Effect

```css
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-dark {
  background: rgba(31, 41, 55, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(55, 65, 81, 0.5);
}
```
