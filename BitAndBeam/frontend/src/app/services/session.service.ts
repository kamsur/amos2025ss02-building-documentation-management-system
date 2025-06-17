import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../api'; // adjust path if needed
import jwtDecode from 'jwt-decode';

interface DecodedToken {
  exp: number;
  uid: number;
  sub: string;
  org: number;
  r: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private tokenKey = 'jwt_token';
  private token = signal<string | null>(localStorage.getItem(this.tokenKey));
  private user = signal<User | null>(null);

  isAuthenticated = computed(() => !!this.token());
  currentUser = this.user.asReadonly();

  constructor(private authApi: AuthService, private router: Router) {
    this.restoreSession();
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await this.authApi.authLogin({ email, password });
      if (result.token && result.user) {
        this.setSession(result.token, result.user);
        return true;
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
    return false;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private setSession(token: string, user: User): void {
    this.token.set(token);
    this.user.set(user);
    localStorage.setItem(this.tokenKey, token);
    this.scheduleAutoLogout(token);
  }

  private restoreSession(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return;

    const decoded: DecodedToken = jwtDecode(token);
    const now = Date.now() / 1000;

    if (decoded.exp > now) {
      this.token.set(token);
      // Optional: Fetch actual user data via API instead of decoding
      const mockUser: User = {
        id: decoded.uid,
        email: decoded.sub,
        role: decoded.r,
        organizationId: decoded.org,
      };
      this.user.set(mockUser);
      this.scheduleAutoLogout(token);
    } else {
      this.logout();
    }
  }

  private scheduleAutoLogout(token: string): void {
    const decoded: DecodedToken = jwtDecode(token);
    const expiresAt = decoded.exp * 1000;
    const timeout = expiresAt - Date.now();

    if (timeout > 0) {
      setTimeout(() => this.logout(), timeout);
    } else {
      this.logout();
    }
  }

  getToken(): string | null {
    return this.token();
  }
}
