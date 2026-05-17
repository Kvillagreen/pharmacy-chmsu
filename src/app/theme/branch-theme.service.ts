import { Injectable } from '@angular/core';
import { DEFAULT_BRANCH_THEME_KEY, findBranchTheme } from './branch-theme';

@Injectable({
  providedIn: 'root',
})
export class BranchThemeService {
  private appliedThemeKey = '';

  applyTheme(themeKey?: string | null): void {
    if (typeof document === 'undefined') {
      return;
    }

    const resolvedTheme = findBranchTheme(themeKey || DEFAULT_BRANCH_THEME_KEY);
    if (this.appliedThemeKey === resolvedTheme.key) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;

    Object.entries(resolvedTheme.values).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });

    root.setAttribute('data-branch-theme', resolvedTheme.key);
    body?.setAttribute('data-branch-theme', resolvedTheme.key);
    this.appliedThemeKey = resolvedTheme.key;
  }

  clearTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const fallbackTheme = findBranchTheme(DEFAULT_BRANCH_THEME_KEY);

    Object.entries(fallbackTheme.values).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });

    root.removeAttribute('data-branch-theme');
    document.body?.removeAttribute('data-branch-theme');
    this.appliedThemeKey = '';
  }

  syncFromStoredUser(stored: any): void {
    const payload = stored?.data?.user_id ? stored.data : stored?.data?.data ?? stored?.data ?? null;
    const themeKey = payload?.theme_key ?? DEFAULT_BRANCH_THEME_KEY;
    this.applyTheme(themeKey);
  }

  syncFromStoredState(storedUser: any, storedBranch: any): void {
    const payload = storedUser?.data?.user_id ? storedUser.data : storedUser?.data?.data ?? storedUser?.data ?? null;
    const branchThemeKey = storedBranch?.selectedBranchThemeKey ?? null;
    const themeKey = branchThemeKey || payload?.theme_key || DEFAULT_BRANCH_THEME_KEY;
    this.applyTheme(themeKey);
  }
}
