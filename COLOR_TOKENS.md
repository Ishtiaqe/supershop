# Color Tokens and Usage

This project uses a centralized color system mapped from Material Design 3 concepts to Tailwind semantic tokens via CSS variables in `src/app/globals.css`.

## How to use
- Use Tailwind utility classes where possible: `bg-primary`, `text-primary`, `bg-card`, `text-muted-foreground`, `border-border` etc.
- When inline styles are necessary (React style objects), use `hsl(var(--...))` strings; for example:
  - style={{ color: "hsl(var(--primary))" }}
  - style={{ backgroundColor: "hsl(var(--card) / 0.8)" }}

## Roles and tokens
- Primary: `--primary`, helpers: `--primary-foreground`, `--primary-container`, `--primary-hover`, `--primary-active`
- Secondary: `--secondary`, `--secondary-foreground`, `--secondary-container`
- Tertiary: `--tertiary`, `--tertiary-foreground`, `--tertiary-container`
- Background / Surface: `--background`, `--surface`, `--card` (and foregrounds)
- Outline / Border: `--outline`, `--border`
- Semantic: `--success`, `--destructive`, `--warning`, `--critical`, with corresponding `-foreground` and `-container` tokens
- Focus / interaction: `--focus`, `--ring`, `--disabled`

## Example
- Buttons: Use `.btn-primary` for custom buttons, or Ant `Button` with `type="primary"`.
- Text: use `text-foreground` or `text-muted-foreground` rather than `text-gray-*` utilities.
- Backgrounds: use `bg-background`, `bg-surface`, `bg-card`.

## Dark mode
- `.light` and `.dark` classes contain theme-aware variable values. To enable dark mode in your app, add the `dark` class on a parent element (we use `darkMode: ['class']` in `tailwind.config.js`).

## Notes for developers
- Keep brand icons (Google, Firefox) colors unchanged unless replacing them is necessary for visual reasons.
- Prefer Tailwind utilities (`text-primary`, `bg-primary`) over inline colors for maintainability.

---
If you want, I can add a short lint rule or ESLint plugin to enforce usage of the semantic tokens instead of direct hex and standard Tailwind colors.