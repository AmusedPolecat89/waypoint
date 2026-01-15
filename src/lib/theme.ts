/**
 * Theme management for Waypoint
 *
 * Supports light, dark, and system (auto) themes.
 * Theme preference is stored in Chrome sync storage.
 */

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'waypoint_theme';

/**
 * Get the stored theme preference
 */
export async function getTheme(): Promise<Theme> {
  const result = await chrome.storage.sync.get(THEME_KEY);
  return result[THEME_KEY] ?? 'system';
}

/**
 * Save theme preference
 */
export async function setTheme(theme: Theme): Promise<void> {
  await chrome.storage.sync.set({ [THEME_KEY]: theme });
}

/**
 * Get the effective theme (resolves 'system' to actual light/dark)
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: Theme): void {
  const effective = getEffectiveTheme(theme);

  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Initialize theme on page load
 */
export async function initTheme(): Promise<Theme> {
  const theme = await getTheme();
  applyTheme(theme);

  // Listen for system theme changes if using 'system'
  if (theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      applyTheme('system');
    });
  }

  return theme;
}
