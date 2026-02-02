import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})

export class ThemeService {
    private readonly THEME_KEY = 'v0x-theme';

    currentTheme = signal<Theme>(this.getStoredTheme());

    constructor() {
        this.applyTheme(this.currentTheme());

        effect( () => {
            const theme = this.currentTheme();
            this.applyTheme(theme);
            localStorage.setItem(this.THEME_KEY, theme);
        });
    }

    toggleTheme(): void {
        const newTheme: Theme = this.currentTheme() === 'light' ? 'dark' : 'light';
        this.currentTheme.set(newTheme);
    }

    setTheme(theme: Theme): void {
        this.currentTheme.set(theme);
    }

    isDarkMode(): boolean {
        return this.currentTheme() === 'dark';
    }

    private getStoredTheme(): Theme {
        const stored = localStorage.getItem(this.THEME_KEY) as Theme;

        if(stored) {
            return stored;
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    private applyTheme(theme: Theme): void {
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#293D5E' : '#F2F2F2');
        }
    }
}