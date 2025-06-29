import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  darkMode$: Observable<boolean> = this.darkModeSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    // Check local storage preference
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedTheme) {
      this.darkModeSubject.next(savedTheme === 'true');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.darkModeSubject.next(prefersDark);
    }

    this.applyTheme(this.darkModeSubject.value);
  }

  toggleDarkMode(): void {
    this.darkModeSubject.next(!this.darkModeSubject.value);
    this.saveTheme();
    this.applyTheme(this.darkModeSubject.value);
  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  private saveTheme(): void {
    localStorage.setItem('darkMode', this.darkModeSubject.value.toString());
  }

  private applyTheme(isDark: boolean): void {
    // Apply dark mode class to body
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}
