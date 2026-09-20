type Theme = 'light' | 'dark' | 'system';

type ThemeListener = (isDark: boolean, theme: Theme) => void;

class ThemeManager {
  private currentTheme: Theme = 'light';
  private listeners: Set<ThemeListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('pjok_theme') as Theme) || 'light';
      this.setTheme(saved, false);

      // Listen for system changes if system
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.currentTheme === 'system') {
          this.applyDarkClass(e.matches);
          this.notify();
        }
      });
    }
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }

  public isDarkMode(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.currentTheme === 'dark') return true;
    if (this.currentTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  public setTheme(theme: Theme, persist = true) {
    this.currentTheme = theme;
    if (persist && typeof window !== 'undefined') {
      localStorage.setItem('pjok_theme', theme);
    }

    const isDark = this.isDarkMode();
    this.applyDarkClass(isDark);
    this.notify();
  }

  public toggleTheme() {
    const next = this.isDarkMode() ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyDarkClass(isDark: boolean) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    }
  }

  private notify() {
    const isDark = this.isDarkMode();
    this.listeners.forEach((l) => l(isDark, this.currentTheme));
  }

  public subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    listener(this.isDarkMode(), this.currentTheme);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const themeManager = new ThemeManager();
