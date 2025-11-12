# A2A Platform Color Management Guide

## Overview
This document outlines the color management strategy for the A2A Agent Platform, including custom colors for different modes and dark mode support.

## Color System Architecture

### 1. Technology Stack
- **Tailwind CSS v4.1.16**: Using inline `@theme` directive
- **CSS Variables**: Defined in `frontend/src/index.css`
- **Dark Mode**: Using `data-theme="dark"` attribute on HTML element

### 2. Mode-Specific Colors

#### Workbench Mode (Development)
- **Primary Color**: `#EA2831` (Custom Red)
- **Light Background**: `#f8f6f6`
- **Dark Background**: `#211111`
- **Purpose**: Indicates development/testing environment

#### Hub Mode (Production)
- **Primary Color**: `#359EFF` (Custom Blue)
- **Accent Color**: `#0284c7`
- **Light Background**: `#f5f7f8`
- **Dark Background**: `#0f1923`
- **Purpose**: Production-ready agent marketplace

#### Flow Mode (Orchestration)
- **Primary Color**: `#FAC638` (Custom Yellow)
- **Light Background**: `#f8f8f5`
- **Dark Background**: `#231e0f`
- **Purpose**: Multi-agent conversation flow

### 3. Implementation Strategy

#### Current Approach (Inline Styles with CSS Variables)
Due to Tailwind v4 limitations with custom color classes, we use:

```javascript
// Example from Sidebar.tsx
const getModeColors = (mode: string, isActive: boolean) => {
  if (!isActive) {
    return {
      className: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      style: {}
    };
  }

  switch (mode) {
    case 'workbench':
      return {
        className: 'transition-colors',
        style: {
          backgroundColor: 'var(--color-workbench-bg-light)',
          color: 'var(--color-workbench-primary)',
          ...(document.documentElement.getAttribute('data-theme') === 'dark' && {
            backgroundColor: 'rgba(234, 40, 49, 0.1)', // workbench-primary with opacity
            color: '#EA2831'
          })
        }
      };
    // ... other modes
  }
};
```

### 4. Dark Mode Management

#### Detection Method
```javascript
const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
```

#### Color Variable Structure
```css
/* Light mode (default) */
@theme {
  --color-primary: #607AFB;
  --color-background-light: #f5f6f8;
  --color-panel-light: #ffffff;
  --color-text-light-primary: #111827;
  /* ... */
}

/* Dark mode overrides */
[data-theme="dark"] {
  --color-primary: #8A9BFF;
  --color-background-dark: #0f1323;
  --color-panel-dark: #1f2937;
  --color-text-dark-primary: #f9fafb;
  /* ... */
}
```

### 5. Component Color Usage

#### Text Colors
- **Primary Text**:
  - Light: `text-text-light-primary` → `#111827`
  - Dark: `text-text-dark-primary` → `#f9fafb`

#### Background Colors
- **Panel Background**:
  - Light: `bg-panel-light` → `#ffffff`
  - Dark: `bg-panel-dark` → `#1f2937`

#### Border Colors
- **Standard Border**:
  - Light: `border-border-light` → `#e5e7eb`
  - Dark: `border-border-dark` → `#2d2938`

### 6. Trace Event Colors

| Event Type | Icon | Light Mode | Dark Mode | Color Code |
|------------|------|------------|-----------|------------|
| LLM Call | Send | Blue | Light Blue | `#359EFF` |
| LLM Response | Phone | Purple | Light Purple | `#9333ea` |
| Tool Call | Wrench | Green | Light Green | `#16a34a` |
| Tool Response | CheckCircle | Teal | Light Teal | `#14b8a6` |
| Agent Transfer | ArrowRightLeft | Pink | Light Pink | `#ec4899` |

### 7. Known Issues & Workarounds

#### Issue: Tailwind v4 @theme Limitations
**Problem**: Custom color classes defined in `@theme` aren't recognized as valid Tailwind utilities.

**Solution**: Use inline styles with CSS variables:
```javascript
// Instead of: className="bg-workbench-primary"
// Use: style={{ backgroundColor: 'var(--color-workbench-primary)' }}
```

#### Issue: Dynamic Color Classes
**Problem**: Tailwind doesn't generate classes for dynamically constructed names.

**Solution**: Define complete class names or use style objects:
```javascript
// Bad: `bg-${color}-100`
// Good: Define all possible combinations or use inline styles
```

### 8. Best Practices

1. **Always test in both light and dark modes**
2. **Use CSS variables for consistency**
3. **Maintain sufficient contrast ratios (WCAG AA minimum)**
4. **Document any color changes in this guide**
5. **Use semantic color names (primary, accent) rather than literal colors**

### 9. Testing Checklist

- [ ] Sidebar navigation colors in all three modes
- [ ] Active state highlighting
- [ ] Dark mode toggle functionality
- [ ] Text readability in both themes
- [ ] Trace event color differentiation
- [ ] Hover states and transitions
- [ ] Focus states for accessibility

### 10. Future Improvements

1. **Migrate to Tailwind CSS config when v4 stabilizes**
2. **Create a centralized color token system**
3. **Add color accessibility testing automation**
4. **Implement user-customizable themes**

## Maintenance

This guide should be updated whenever:
- New color schemes are added
- Mode-specific colors are modified
- Dark mode implementation changes
- New components requiring color coordination are added

Last Updated: November 2024