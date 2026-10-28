import { AppTheme, ThemeOption } from '../types';

export const THEMES: ThemeOption[] = [
  {
    id: 'classic',
    name: 'Academic Slate',
    subtitle: 'Institutional Navy & Slate Neutral',
    description: 'Clean university styling with deep navy header accents, neutral slate canvas, and university indigo highlights.',
    isDark: false,
    colors: {
      primary: '#1e1b4b',
      accent: '#4338ca',
      bg: '#f4f4f5',
      surface: '#ffffff',
      border: '#e4e4e7',
      text: '#18181b',
    },
  },
  {
    id: 'dark',
    name: 'Executive Dark',
    subtitle: 'Obsidian Midnight & Slate Blue',
    description: 'Deep obsidian canvas with electric cyan/indigo accents and crisp high-contrast text for night shifts & low-light comfort.',
    isDark: true,
    colors: {
      primary: '#38bdf8',
      accent: '#6366f1',
      bg: '#090d16',
      surface: '#111827',
      border: '#1e293d',
      text: '#f8fafc',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Campus',
    subtitle: 'Forest Green & Scholar Sage',
    description: 'Distinguished university garden theme with rich forest green accents, subtle sage borders, and fresh scholarly contrast.',
    isDark: false,
    colors: {
      primary: '#065f46',
      accent: '#059669',
      bg: '#f0f7f3',
      surface: '#ffffff',
      border: '#d1fae5',
      text: '#064e3b',
    },
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    subtitle: 'Oxford Blue & Regal Sapphire',
    description: 'Collegiate prestige with royal sapphire blue, crisp cool borders, and dignified academic presence.',
    isDark: false,
    colors: {
      primary: '#312e81',
      accent: '#4f46e5',
      bg: '#f2f4f9',
      surface: '#ffffff',
      border: '#e0e7ff',
      text: '#1e1b4b',
    },
  },
  {
    id: 'sandstone',
    name: 'Sandstone Heritage',
    subtitle: 'Warm Parchment & Amber Bronze',
    description: 'Administrative heritage with warm ivory parchment canvas, mahogany headers, and golden amber accents.',
    isDark: false,
    colors: {
      primary: '#78350f',
      accent: '#d97706',
      bg: '#faf6ef',
      surface: '#fffdfa',
      border: '#e8decb',
      text: '#451a03',
    },
  },
  {
    id: 'monochrome',
    name: 'Editorial Monochrome',
    subtitle: 'High-Contrast Ink & Gazette',
    description: 'Pure stark black & white gazette styling with high-contrast sharp borders for maximum accessibility and readability.',
    isDark: false,
    colors: {
      primary: '#000000',
      accent: '#27272a',
      bg: '#f9fafb',
      surface: '#ffffff',
      border: '#18181b',
      text: '#09090b',
    },
  },
];

export const THEME_STORAGE_KEY = 'ignou_sc2033_theme';

export function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'classic';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved as AppTheme;
    }
  } catch (e) {
    console.warn('Could not read theme from localStorage:', e);
  }
  return 'classic';
}

export function applyThemeToDOM(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
