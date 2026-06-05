# 🎨 PrintCost - Design System Specification

Welcome to the **PrintCost Design System**. This document serves as the visual and structural source of truth for both the Next.js Web application and the Flutter Mobile application.

Our primary goal is **"Nhập liệu tối giản - Tính toán chính xác - Thao tác nhanh gọn"** (Minimal data entry - Accurate calculation - Quick operation) wrapped in a premium, modern, developer-themed interface.

---

## 🌌 Visual Direction: High-Tech OLED Dark Mode

To prevent eye strain during long tracking sessions in the print workshop, PrintCost uses a premium, high-contrast dark theme optimized for OLED displays and low-light environments.

- **Theme Style**: Vibrant & Block-based / Dark Mode
- **Vibe**: Tech-focused, precise, developer console, clean geometry.

---

## 🎨 Color Palette

We maintain two harmonious palettes: a **Soft Slate Light Mode** for demos and outdoor use, and a **OLED Industrial Dark Mode** for low-light workshop environments.

### 🌤️ Light Mode (`:root` / `.light`)

| Role | Variable (CSS) | Hex Value | Notes |
| :--- | :--- | :--- | :--- |
| **Background** | `--color-bg` | `#F8FAFC` | Slate-50 — soft page background |
| **Card / Surface** | `--color-surface` | `#FFFFFF` | White — card and input surfaces |
| **Nested Surface** | `--color-surface-2` | `#F1F5F9` | Slate-100 — nested card, receipt bg |
| **Primary Accent** | `--color-primary` | `#2563EB` | Blue-600 — focus rings, active highlights |
| **CTA Accent** | `--color-cta` | `#1D4ED8` | Blue-700 — submit / confirm buttons |
| **Secondary Accent** | `--color-accent` | `#3B82F6` | Blue-500 — hover states, subtle icons |
| **Text Primary** | `--color-text` | `#0F172A` | Slate-900 — contrast ratio ~17:1 ✅ WCAG AAA |
| **Text Secondary** | `--color-text-muted` | `#475569` | Slate-600 — labels, helper text ~5.9:1 ✅ WCAG AA |
| **Borders** | `--color-border` | `#CBD5E1` | Slate-300 — card and field borders |
| **Success / Profit** | `--color-success` | `#059669` | Emerald-600 — positive margins, completed |
| **Error / Loss** | `--color-danger` | `#DC2626` | Red-600 — delete, error |
| **Warning** | `--color-warning` | `#D97706` | Amber-600 — draft, thresholds |

### 🌑 Dark Mode (`.dark` / `prefers-color-scheme: dark`)

| Role | Variable (CSS) | Hex Value | Notes |
| :--- | :--- | :--- | :--- |
| **Background** | `--color-bg` | `#0F172A` | Deep Charcoal / OLED (90% darkness) |
| **Card / Surface** | `--color-surface` | `#1E293B` | Slate-800 — containers and input cards |
| **Nested Surface** | `--color-surface-2` | `#0F172A` | Slate-900 — receipt background |
| **Primary Accent** | `--color-primary` | `#3B82F6` | Blue-500 — focus rings, active highlights |
| **CTA Accent** | `--color-cta` | `#2563EB` | Blue-600 — submit / confirm buttons |
| **Secondary Accent** | `--color-accent` | `#60A5FA` | Blue-400 — hover states, subtle icons |
| **Text Primary** | `--color-text` | `#F1F5F9` | Slate-100 — high readability |
| **Text Secondary** | `--color-text-muted` | `#94A3B8` | Slate-400 — muted labels, inactive items |
| **Borders** | `--color-border` | `#334155` | Slate-700 — card and field borders |
| **Success / Profit** | `--color-success` | `#10B981` | Emerald-500 — active printer, completed |
| **Error / Loss** | `--color-danger` | `#EF4444` | Red-500 — locked state, cancelled |
| **Warning** | `--color-warning` | `#F59E0B` | Amber-500 — warnings, draft state |

---

## 🔤 Typography

Typography must project precision, mathematical accuracy, and clarity.

*   **Heading Font**: `JetBrains Mono` (Google Font)
    *   Used for: Screen titles, dashboard metrics, prices, times (Hours:Minutes:Seconds), currency, weights.
    *   *Why*: Monospaced digits prevent layout shifts when numbers change in real-time calculations.
*   **Body Font**: `IBM Plex Sans` (Google Font)
    *   Used for: Form labels, body paragraphs, tables, options, list descriptions.
    *   *Why*: Clean, professional, highly readable sans-serif font.

### Font Hierarchy (CSS Variables)

*   `--font-size-xs`: `0.75rem` (12px) - Helper text, table caption
*   `--font-size-sm`: `0.875rem` (14px) - Form labels, standard table content
*   `--font-size-base`: `1rem` (16px) - Body copy, input fields (prevents mobile zoom-in)
*   `--font-size-lg`: `1.125rem` (18px) - Section headers, card titles
*   `--font-size-xl`: `1.25rem` (20px) - Metric labels
*   `--font-size-2xl`: `1.5rem` (24px) - Key dashboard highlights
*   `--font-size-3xl`: `1.875rem` (30px) - Page titles
*   `--font-size-4xl`: `2.25rem` (36px) - Grand total suggested price

---

## 📏 Spacing & Layout

Spacing must be consistent. We use a base-4 system (multiples of `4px` or `0.25rem`).

- **Base Padding / Margin scale**:
  - `--spacing-xs`: `0.25rem` (4px)
  - `--spacing-sm`: `0.5rem` (8px)
  - `--spacing-md`: `1rem` (16px)
  - `--spacing-lg`: `1.5rem` (24px)
  - `--spacing-xl`: `2rem` (32px)
  - `--spacing-2xl`: `3rem` (48px)
- **Border Radius**:
  - `--radius-sm`: `4px` (for small badges, checkboxes)
  - `--radius-md`: `8px` (for input fields, buttons)
  - `--radius-lg`: `12px` (for dashboard cards, modal boxes)
- **Container widths**:
  - Max page width: `1280px` (`max-w-7xl` equivalent) for desktop dashboard grid.

---

## ⚙️ Component Guidelines & Interactive States

Interactive components must feel responsive and alive. Static visual representations are not enough.

### 1. Interactive States
*   **Hover state**: Element changes background color, border color, or opacity smoothly. Transition duration must be `150ms` to `300ms` with `ease-in-out` timing function.
*   **Active/Click state**: Subtle push-down scale effect (e.g. `transform: scale(0.98)`).
*   **Focus Ring**: All focused interactive controls (inputs, buttons, select) must display a clear focus ring:
    ```css
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    ```
*   **Disabled state**: Background opacity reduced to `50%`, cursor set to `not-allowed`, interactions blocked.

### 2. Form Inputs
- Must use labels with `htmlFor`/`for` attribute for accessibility.
- Help text or validations should appear below the input field in `--color-text-muted` or `--color-danger`.
- Inputs must have standard heights (e.g. `44px` on mobile for optimal touch targets).

### 3. Real-time Calculation Display
- Live calculations must not cause content jumping. Reserve space or use placeholder skeletons.
- Transition recalculated values with a subtle glow or text color change (e.g. flashing `--color-accent` briefly) to indicate updating state.
- Suggested prices should be displayed in a large, monospaced style using `JetBrains Mono` and bold font-weight (`700`).

---

## 🛠️ Platform Implementation Specs

### 1. Web (Next.js)

#### Font Loading Optimization (`app/layout.tsx`)
We load fonts directly from Next.js dynamic servers to eliminate FOUT (Flash of Unstyled Text) and skip CSS imports:
```typescript
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-body',
  display: 'swap',
});

// Applied on the HTML root element:
// <html className={`${jetbrainsMono.variable} ${ibmPlexSans.variable}`}>
```

#### Theme Switching (Web)
Theme is controlled by the `.dark` class on `<html>`. A `ThemeToggle` component stores preference in `localStorage` and applies the class. No hardcoded colors in component files.

```typescript
// Toggling dark mode:
document.documentElement.classList.toggle('dark');
localStorage.setItem('theme', 'dark'); // or 'light'
```

#### Tailwind CSS v4 Integration (`globals.css`)
Tailwind tokens in `@theme inline` reference CSS variables from `design-system/variables.css`. This way, switching `.dark` on `<html>` automatically updates every `bg-background`, `text-foreground`, `border-border` class without changing component JSX.

```css
/* globals.css */
@import '../../../../design-system/variables.css';

@theme inline {
  --color-background: var(--color-bg);
  --color-foreground: var(--color-text);
  --color-card:       var(--color-surface);
  /* ... all Shadcn tokens map to CSS variables ... */
}
```

---

### 2. Mobile (Flutter)

#### Color constants (`theme.dart`)
Both light and dark color constants are defined, mirroring the CSS variables exactly:
```dart
class PrintCostTheme {
  // Dark Mode (mirrors .dark in variables.css)
  static const Color darkBg      = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  // ...

  // Light Mode (mirrors :root in variables.css)
  static const Color lightBg      = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  // ...

  static ThemeData get darkTheme  => _buildTheme(brightness: Brightness.dark, ...);
  static ThemeData get lightTheme => _buildTheme(brightness: Brightness.light, ...);
}
```

#### Wiring themes in `main.dart`
```dart
MaterialApp(
  theme: PrintCostTheme.lightTheme,
  darkTheme: PrintCostTheme.darkTheme,
  themeMode: ThemeMode.system, // follows device setting
  // themeMode: ThemeMode.dark,  // force dark (workshop default)
  // themeMode: ThemeMode.light, // force light (demo / outdoor)
);
```

#### Dynamic Google Fonts loading (`pubspec.yaml`)
To prevent package assets bloating, add the official google fonts package to Flutter dependency configurations:
```yaml
dependencies:
  flutter:
    sdk: flutter
  google_fonts: ^6.1.0
```

Use `GoogleFonts` helper functions to dynamically fetch or fallback to cached `JetBrains Mono` and `IBM Plex Sans` typography files.

---

## 📝 UI/UX Pre-Delivery Checklist

Before committing or releasing new UI components, pages, or features, verify them against this checklist to ensure visual and interactive quality.

### 1. Visual Quality
- [ ] **No Emoji Icons**: All UI controls must use SVG icons (Lucide/Heroicons for Web; Material Icons or Lucide Flutter for Mobile). No raw emojis.
- [ ] **Consistent Icon Sizing**: Standard dimensions for icons (typically 20x20px or 24x24px).
- [ ] **Stable Hover States**: Hovering must not cause visual layout shifts. Do not scale elements in a way that affects surrounding margins or padding.

### 2. Interaction & Motion
- [ ] **Cursor Pointer**: Ensure all clickable elements display `cursor: pointer` on Web.
- [ ] **Hover & Tap Feedback**: Interactive components must provide instant visual feedback on hover/tap (color shift, outline, shadow, or slight opacity change).
- [ ] **Smooth Transitions**: State transitions should be animated smoothly using a `150ms` to `300ms` ease transition.
- [ ] **Loading States**: Asynchronous operations (such as calculating suggested price, adding order items, loading materials) must show a loading spinner or skeleton and disable the corresponding action buttons.

### 3. Contrast & Theme Integrity
- [ ] **OLED High Contrast**: Ensure text contrast conforms to WCAG standards. Text on backgrounds must have a minimum contrast ratio of 4.5:1 (use `--color-text` `#F1F5F9` on `--color-bg` `#0F172A`).
- [ ] **Border Visibility**: Card outlines and field boundaries must remain visible in OLED layouts.

### 4. Layout & Responsiveness
- [ ] **Spacing Consistency**: All page elements must adhere to the 4px grid system spacing variables (`--spacing-sm`, `--spacing-md`, etc.).
- [ ] **Responsive Breakpoints**: Test layouts across phone (`375px`), tablet (`768px`), and desktop (`1024px`, `1440px`).
- [ ] **No Horizontal Scroll**: Page grids and tables must not cause horizontal scrolling on mobile viewports. Use responsive table horizontal scrolling wrappers where necessary.

### 5. Accessibility (WCAG)
- [ ] **Form Labels**: Every input field must have a corresponding `<label>` tag with a matching `for` / `htmlFor` attribute.
- [ ] **Focus Indicator**: Keyboard navigation must display a visible focus ring outline on active elements.


