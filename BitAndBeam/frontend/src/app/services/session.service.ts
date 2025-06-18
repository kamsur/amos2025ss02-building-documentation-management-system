import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../../api';
import jwt_decode from 'jwt-decode';
import { ApiClientFactory } from './api-client.factory';

interface User {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}

interface DecodedToken {
  exp: number;
  uid: string;
  sub: string;
  org: string;
  r: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private tokenKey = 'jwt_token';
  private token = signal<string | null>(localStorage.getItem(this.tokenKey));
  private user = signal<User | null>(null);

  isAuthenticated = computed(() => !!this.token());
  currentUser = this.user.asReadonly();

  private authApi: AuthApi;

  constructor(
    private router: Router,
    private apiFactory: ApiClientFactory
  ) {
    const token = this.getToken();
    this.authApi = this.apiFactory.create(AuthApi, token);
    this.restoreSession();
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const tempAuthApi = this.apiFactory.create(AuthApi); // no token
      const response = await tempAuthApi.authLoginPost({ email, password });
      const result = response.data as unknown as { token: string; user: any };

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

    // Refresh AuthApi with new token
    this.authApi = this.apiFactory.create(AuthApi, token);

    this.scheduleAutoLogout(token);
  }

  private restoreSession(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return;

    const decoded = jwt_decode<DecodedToken>(token);
    const now = Date.now() / 1000;

    if (decoded.exp > now) {
      this.token.set(token);
      const restoredUser: User = {
        id: Number(decoded.uid),
        email: decoded.sub,
        role: decoded.r,
        organizationId: Number(decoded.org)
      };
      this.user.set(restoredUser);
      this.scheduleAutoLogout(token);
    } else {
      this.logout();
    }
  }

  private scheduleAutoLogout(token: string): void {
    const decoded = jwt_decode<DecodedToken>(token);
    const expiresAt = decoded.exp * 1000;
    const timeout = expiresAt - Date.now();

    if (timeout > 0) {
      setTimeout(() => this.logout(), timeout);
    } else {
      this.logout();
    }
  }

  getToken(): string | undefined {
    return this.token() ?? undefined;
  }
}
