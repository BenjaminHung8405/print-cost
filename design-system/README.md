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

We use a curated, harmonious palette based on deep slates and electric blues to give a premium feel. Avoid basic, uncalibrated primary colors.

| Role | Variable (CSS) | Hex Value | Visual Swatch / Description |
| :--- | :--- | :--- | :--- |
| **Background** | `--color-bg` | `#0F172A` | Deep Charcoal Black / Dark Slate (90% darkness) |
| **Card / Surface** | `--color-surface` | `#1E293B` | Lighter Slate for containers and input cards |
| **Primary Accent** | `--color-primary` | `#3B82F6` | Electric Blue for active highlights, focus rings |
| **CTA Accent** | `--color-cta` | `#2563EB` | Deep Royal Blue for submit and confirmation buttons |
| **Secondary Accent** | `--color-accent` | `#60A5FA` | Neon Blue for hover states and subtle icons |
| **Text Primary** | `--color-text` | `#F1F5F9` | Cool Off-White for high readability |
| **Text Secondary** | `--color-text-muted` | `#94A3B8` | Muted Gray for labels, helper text, inactive items |
| **Borders** | `--color-border` | `#334155` | Defined borders for cards and tables |
| **Success / Profit** | `--color-success` | `#10B981` | Emerald Green for positive margins, active printer, completed orders |
| **Error / Loss** | `--color-danger` | `#EF4444` | Crimson Red for locked state, waste, cancelled orders |
| **Warning** | `--color-warning` | `#F59E0B` | Amber Yellow for warnings, warning thresholds, draft state |

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

#### Tailwind CSS Integration mapping (Optional)
If incorporating Tailwind CSS (v3 or v4) later, map the CSS tokens into your config:

##### Tailwind v3 (`tailwind.config.js`):
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          primary: 'var(--color-primary)',
          cta: 'var(--color-cta)',
          accent: 'var(--color-accent)',
          text: 'var(--color-text)',
          'text-muted': 'var(--color-text-muted)',
          border: 'var(--color-border)',
          success: 'var(--color-success)',
          danger: 'var(--color-danger)',
          warning: 'var(--color-warning)',
        }
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
      }
    }
  }
}
```

##### Tailwind v4 (`globals.css`):
```css
@theme {
  --color-brand-bg: var(--color-bg);
  --color-brand-surface: var(--color-surface);
  --color-brand-primary: var(--color-primary);
  --color-brand-cta: var(--color-cta);
  --color-brand-accent: var(--color-accent);
  --color-brand-text: var(--color-text);
  --color-brand-text-muted: var(--color-text-muted);
  --color-brand-border: var(--color-border);
  --color-brand-success: var(--color-success);
  --color-brand-danger: var(--color-danger);
  --color-brand-warning: var(--color-warning);
  --font-heading: var(--font-heading), monospace;
  --font-body: var(--font-body), sans-serif;
}
```

---

### 2. Mobile (Flutter)

#### Color constants (`theme.dart`)
Dart color tokens are configured as 32-bit integer colors containing the alpha transparency prefix (`0xFF` for 100% opacity):
```dart
class PrintCostTheme {
  static const Color colorBg = Color(0xFF0F172A);
  static const Color colorSurface = Color(0xFF1E293B);
  static const Color colorPrimary = Color(0xFF3B82F6);
  // ... maps perfectly to hex colors
}
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

