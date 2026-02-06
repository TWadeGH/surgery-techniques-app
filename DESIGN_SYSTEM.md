# Design System

**App:** Surgical Techniques App  
**Philosophy:** Jobs/Ive-inspired — inevitable, effortless, minimal  
**Last Updated:** February 1, 2026

---

## Color Tokens

### Light Mode
- **Primary:** `purple-600` (#9333EA)
- **Primary Hover:** `purple-700` (#7E22CE)
- **Secondary:** `gray-200` (#E5E7EB)
- **Text Primary:** `gray-900` (#111827)
- **Text Secondary:** `gray-600` (#4B5563)
- **Background:** `gray-50` (#F9FAFB)
- **Surface:** `white` (#FFFFFF)
- **Border:** `gray-200` (#E5E7EB)
- **Error:** `red-600` (#DC2626)
- **Success:** `green-600` (#16A34A)
- **Warning:** `yellow-600` (#CA8A04)

### Dark Mode
- **Primary:** `purple-600` (#9333EA)
- **Primary Hover:** `purple-700` (#7E22CE)
- **Secondary:** `gray-700` (#374151)
- **Text Primary:** `gray-100` (#F3F4F6)
- **Text Secondary:** `gray-400` (#9CA3AF)
- **Background:** `gray-900` (#111827)
- **Surface:** `gray-800` (#1F2937)
- **Border:** `gray-700` (#374151)
- **Error:** `red-500` (#EF4444)
- **Success:** `green-500` (#22C55E)
- **Warning:** `yellow-500` (#EAB308)

---

## Typography Scale

### Headings
- **H1:** 32px / 2rem / `text-3xl` / `font-bold` / `leading-tight`
- **H2:** 24px / 1.5rem / `text-2xl` / `font-bold` / `leading-tight`
- **H3:** 20px / 1.25rem / `text-xl` / `font-semibold` / `leading-snug`

### Body
- **Body Large:** 18px / 1.125rem / `text-lg` / `font-normal` / `leading-relaxed`
- **Body:** 16px / 1rem / `text-base` / `font-normal` / `leading-normal`
- **Body Small:** 14px / 0.875rem / `text-sm` / `font-normal` / `leading-relaxed`
- **Caption:** 12px / 0.75rem / `text-xs` / `font-normal` / `leading-normal`

### Usage Guidelines
- **Titles:** Use H3 (20px) for card titles, H2 (24px) for section headers, H1 (32px) for page headers
- **Body Text:** Use Body (16px) for descriptions and main content
- **Metadata:** Use Body Small (14px) for source lines, timestamps, and secondary info
- **Labels:** Use Caption (12px) for input labels and micro-copy

---

## Spacing Scale

Use only these values for padding, margin, and gap:

- **xs:** 4px / 0.25rem / `1`
- **sm:** 8px / 0.5rem / `2`
- **md:** 12px / 0.75rem / `3`
- **lg:** 16px / 1rem / `4`
- **xl:** 24px / 1.5rem / `6`
- **2xl:** 32px / 2rem / `8`
- **3xl:** 48px / 3rem / `12`

### Common Patterns
- **Card padding:** `p-4` (16px)
- **Button padding:** `px-4 py-2` (16px horizontal, 8px vertical)
- **Button gap:** `gap-2` (8px)
- **Section spacing:** `mb-6` or `mb-8` (24px or 32px)
- **Card gap:** `gap-3` or `gap-4` (12px or 16px)

---

## Border Radius

- **Small:** 8px / `rounded-lg`
- **Medium:** 12px / `rounded-xl`
- **Large:** 16px / `rounded-2xl`
- **Full:** 9999px / `rounded-full`

### Usage Guidelines
- **Cards:** `rounded-xl` (12px)
- **Buttons:** `rounded-lg` (8px)
- **Badges:** `rounded-full`
- **Inputs:** `rounded-lg` (8px)
- **Modals:** `rounded-xl` (12px)

---

## Shadows

- **None:** No shadow (for flush elements)
- **Small:** `shadow-sm` (subtle lift)
- **Medium:** `shadow-md` (default card elevation)
- **Large:** `shadow-lg` (modal, dropdown)
- **Extra Large:** `shadow-xl` (hover state, floating elements)

### Usage Guidelines
- **Cards:** `shadow-md` (resting), `shadow-lg` (hover)
- **Modals:** `shadow-xl`
- **Dropdowns:** `shadow-lg`
- **Buttons:** No shadow (elevation through color)

---

## Component Patterns

### Buttons

#### Primary Button
```jsx
className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
```

#### Secondary Button
```jsx
className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
```

#### Tertiary Button (Icon Only)
```jsx
className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
```

---

### Cards

#### Resource Card
```jsx
className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-200 dark:border-gray-700"
```

#### Simple Card
```jsx
className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700"
```

---

### Badges

#### Info Badge (Default)
```jsx
className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-normal"
```

#### Status Badge (Sponsored, etc.)
```jsx
className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-normal"
```

---

### Inputs

#### Text Input
```jsx
className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
```

#### Textarea
```jsx
className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors resize-none"
```

---

## Design Principles

### Simplicity
- Every element must justify its existence
- Remove until it breaks, then add back the last thing
- If a user needs to think about how to use it, redesign

### Hierarchy
- One primary action per screen (most prominent)
- Secondary actions support, never compete
- Visual weight matches functional importance

### Consistency
- Same component = same appearance everywhere
- All values reference design system tokens
- No hardcoded colors, spacing, or sizes

### Whitespace
- Space is structure, not emptiness
- Breathing room feels premium
- Crowded interfaces feel cheap

### Restraint
- Use purple sparingly (primary actions only)
- Secondary elements use neutral grays
- One accent color per screen

### Accessibility
- All interactive elements have visible focus states
- Color contrast ratios meet WCAG AA standards
- Keyboard navigation works everywhere
- Screen reader support for all content

---

## Implementation Rules

1. **No Arbitrary Values:** All spacing, colors, and sizes must reference design system tokens
2. **No Inline Styles:** Use Tailwind classes only (exceptions: dynamic values from data)
3. **Consistent Dark Mode:** Every component must support dark mode with proper contrast
4. **Focus States Required:** All interactive elements must have visible focus states
5. **Responsive by Default:** Mobile-first design, test at 375px, 768px, and 1440px

---

**End of Design System**  
**All components must reference these patterns**
