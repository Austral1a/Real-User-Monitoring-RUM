export type Theme = "light" | "dark";

export const THEME_KEY = "monitor-theme";

export const theme = $state({ mode: readTheme() });

if (typeof document !== "undefined") applyTheme(theme.mode);

export function readTheme(): Theme {
  const stored = storedTheme();
  if (stored) return stored;
  if (typeof matchMedia === "function") {
    return matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function setTheme(mode: Theme): void {
  theme.mode = mode;
  applyTheme(mode);
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Private mode can block storage.
  }
}

export function toggleTheme(): void {
  setTheme(theme.mode === "dark" ? "light" : "dark");
}

export function applyTheme(mode: Theme): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function cssColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Ignore missing storage.
  }
  return null;
}
