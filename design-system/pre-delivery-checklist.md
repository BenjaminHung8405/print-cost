# 📝 UI/UX Pre-Delivery Checklist - PrintCost

Before committing or releasing new UI components, pages, or features for either the Web (Next.js) or Mobile (Flutter) applications, run through this checklist to ensure visual and interactive quality.

---

## 🎨 Visual Quality

- [ ] **No Emoji Icons**: All UI controls must use SVG icons (Lucide or Heroicons for Web; Material Icons or Lucide Flutter icons for Mobile). Do not use emojis (like 🎨, ⚙️, 🚀) as UI icons.
- [ ] **Consistent Icon Sizing**: Maintain standard dimensions for icons (typically 20x20px or 24x24px).
- [ ] **Stable Hover States**: Hovering must not cause visual layout shifts. Do not scale elements in a way that affects surrounding margins or padding.
- [ ] **Follow Design System Tokens**: Make sure colors map directly to the design system CSS variables (`var(--color-bg)`, `var(--color-primary)`) rather than hardcoded colors.

---

## ⚡ Interaction & Motion

- [ ] **Cursor Pointer**: Ensure all clickable elements (cards, tabs, buttons, links) display `cursor: pointer` on Web.
- [ ] **Hover & Tap Feedback**: Interactive components must provide instant visual feedback on hover/tap (color shift, outline, shadow, or slight opacity change).
- [ ] **Smooth Transitions**: State transitions should be animated smoothly using a `150ms` to `300ms` ease transition. No instant color jumps unless required for instant calculations.
- [ ] **Loading States**: All asynchronous operations (such as calculating suggested price, adding order items, loading materials) must show a loading spinner or skeleton and disable the corresponding action buttons.

---

## 🌗 Contrast & Theme Integrity

- [ ] **OLED High Contrast**: Ensure text contrast conforms to WCAG AAA standards for dark themes. Text on backgrounds must have a minimum contrast ratio of 4.5:1 (use `--color-text` `#F1F5F9` on `--color-bg` `#0F172A`).
- [ ] **Border Visibility**: Card outlines and field boundaries must remain visible in both OLED dark mode and standard layouts.
- [ ] **Calculators & Highlights**: Suggestions, totals, and final prices must stand out clearly from raw parameters.

---

## 📐 Layout & Responsiveness

- [ ] **Spacing Consistency**: All page elements must adhere to the 4px grid system spacing variables (`--spacing-sm`, `--spacing-md`, etc.).
- [ ] **Fixed Elements Padding**: Avoid content being cut off or hidden under sticky or floating elements (e.g. the Sidebar or the layout header).
- [ ] **Responsive Breakpoints**: Test layouts across multiple screen sizes:
  - Mobile: `375px` (Flutter views, compact phone layout)
  - Tablet: `768px` (Next.js responsive view)
  - Desktop: `1024px` and `1440px` (Full Next.js dashboard grid)
- [ ] **No Horizontal Scroll**: Page grids and tables must not cause horizontal scrolling on mobile viewports. Use responsive table horizontal scrolling wrappers where necessary.

---

## ♿ Accessibility (WCAG)

- [ ] **Form Labels**: Every input field (e.g. material weight, print time, operational config price) must have a corresponding `<label>` tag with a matching `for` / `htmlFor` attribute.
- [ ] **Focus Indicator**: Keyboard navigation must be supported on web. The active element must display a visible focus ring outline.
- [ ] **Screen Readers**: Flutter components must use `Semantics` widgets where appropriate, and web icons should have `aria-label` or `aria-hidden` attributes.
- [ ] **Reduced Motion Support**: Ensure animations obey user preferences for reduced motion (`prefers-reduced-motion` in CSS).
