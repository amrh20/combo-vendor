import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, ReplaySubject, delay, map, of, switchMap, take, tap, throwError } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';
import { ApiErrorBody, VendorLoginResponse, VendorProfile, VendorTokenPair } from '../models/auth.model';

export const ACCESS_TOKEN_KEY = 'combo.vendor.accessToken';
export const REFRESH_TOKEN_KEY = 'combo.vendor.refreshToken';

const MOCK_PROFILE: VendorProfile = {
  id: 'staff-1',
  storeId: 'store-1',
  storeName: 'مخبز الربيع',
  email: 'vendor@combo.app',
  fullName: 'أحمد المتجر',
  role: 'owner',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly ready = new ReplaySubject<true>(1);

  readonly currentUser = signal<VendorProfile | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    if (!this.accessToken()) {
      this.ready.next(true);
      return;
    }
    this.loadUserProfile().subscribe({
      next: () => this.ready.next(true),
      error: () => {
        this.clearSession();
        this.ready.next(true);
      },
    });
  }

  whenReady(): Observable<true> {
    return this.ready.pipe(take(1));
  }

  login(email: string, password: string): Observable<VendorProfile> {
    if (USE_MOCK_API) {
      return of(this.mockLoginResponse(email)).pipe(
        delay(400),
        tap((response) => this.persistSession(response)),
        map((response) => response.profile),
        tap((profile) => this.currentUser.set(profile)),
      );
    }

    return this.http
      .post<VendorLoginResponse>(`${API_BASE_URL}/v1/auth/vendor/login`, {
        email: email.trim().toLowerCase(),
        password,
      })
      .pipe(
        tap((response) => this.persistSession(response)),
        switchMap(() => this.loadUserProfile()),
      );
  }

  loadUserProfile(): Observable<VendorProfile> {
    if (USE_MOCK_API) {
      const token = this.accessToken();
      if (!token) {
        return throwError(() => new Error('Missing token'));
      }
      return of({ ...MOCK_PROFILE, email: this.currentUser()?.email ?? MOCK_PROFILE.email }).pipe(
        tap((profile) => this.currentUser.set(profile)),
      );
    }

    const token = this.accessToken();
    return this.http
      .get<VendorProfile>(`${API_BASE_URL}/v1/auth/vendor/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .pipe(tap((profile) => this.currentUser.set(profile)));
  }

  refreshToken(): Observable<VendorTokenPair> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    if (USE_MOCK_API) {
      const pair: VendorTokenPair = {
        accessToken: `mock-access-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
      };
      return of(pair).pipe(tap((tokens) => this.persistSession(tokens)));
    }

    return this.http
      .post<VendorTokenPair>(`${API_BASE_URL}/v1/auth/refresh`, { refreshToken })
      .pipe(tap((tokens) => this.persistSession(tokens)));
  }

  accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  logout(): void {
    this.clearSession();
    const router = this.injector.get(Router);
    if (router.url === '/login' || router.url.startsWith('/login?')) {
      return;
    }
    void router.navigateByUrl('/login', { replaceUrl: true });
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUser.set(null);
  }

  private persistSession(tokens: VendorTokenPair | VendorLoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    if ('profile' in tokens) {
      this.currentUser.set(tokens.profile);
    }
  }

  private mockLoginResponse(email: string): VendorLoginResponse {
    return {
      accessToken: `mock-vendor-access-${Date.now()}`,
      refreshToken: `mock-vendor-refresh-${Date.now()}`,
      profile: {
        ...MOCK_PROFILE,
        email: email.trim().toLowerCase() || MOCK_PROFILE.email,
      },
    };
  }
}

export function isInvalidCredentials(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return false;
  }
  const body = error.error as ApiErrorBody | null;
  return body?.error?.code === 'INVALID_CREDENTIALS';
}
