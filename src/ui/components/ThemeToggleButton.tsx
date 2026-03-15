import { Monitor, Moon, Sun } from 'lucide-react';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeToggleButtonProps = {
  themePreference: ThemePreference;
  cycleTheme: () => void;
  className?: string;
};

export function ThemeToggleButton({
  themePreference,
  cycleTheme,
  className = '',
}: ThemeToggleButtonProps) {
  const ThemeIcon =
    themePreference === 'system' ? Monitor : themePreference === 'light' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] text-[var(--duck-muted)] transition-all duration-200 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Theme: ${themePreference}. Click to change.`}
      title={`Theme: ${themePreference}`}
    >
      <ThemeIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
