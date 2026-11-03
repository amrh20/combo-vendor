import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, ReplaySubject, map, switchMap, take, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorBody, VendorLoginResponse, VendorProfile, VendorTokenPair } from '../models/auth.model';
import { StoreProfileService } from './store-profile.service';

export const ACCESS_TOKEN_KEY = 'combo.vendor.accessToken';
export const REFRESH_TOKEN_KEY = 'combo.vendor.refreshToken';
export const PROFILE_KEY = 'combo.vendor.profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly storeProfile = inject(StoreProfileService);
  private readonly ready = new ReplaySubject<true>(1);

  readonly currentUser = signal<VendorProfile | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Managers only, when Ops enabled catalog editing for this shop. */
  readonly canManageCatalog = computed(() => {
    const user = this.currentUser();
    if (!user || user.role !== 'MANAGER') {
      return false;
    }
    if (user.store.canEditCatalog === true) {
      return true;
    }
    return this.storeProfile.profile().canEditCatalog === true;
  });

  constructor() {
    this.hydrateProfileFromStorage();
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

  /** `POST /v1/auth/store/login` with `{ username, password }`. */
  login(username: string, password: string): Observable<VendorProfile> {
    return this.http
      .post<VendorLoginResponse>(`${environment.apiUrl}/v1/auth/store/login`, {
        username: username.trim(),
        password,
      })
      .pipe(
        tap((response) => this.persistSession(response)),
        map((response) => response.profile),
      );
  }

  loadUserProfile(): Observable<VendorProfile> {
    const token = this.accessToken();
    return this.http
      .get<VendorProfile>(`${environment.apiUrl}/v1/auth/store/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .pipe(tap((profile) => this.rememberProfile(profile)));
  }

  /**
   * `POST /v1/auth/store/change-password` then rotates tokens via refresh (current access is revoked).
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post(`${environment.apiUrl}/v1/auth/store/change-password`, { currentPassword, newPassword })
      .pipe(
        switchMap(() => this.refreshToken()),
        map(() => undefined),
      );
  }

  refreshToken(): Observable<VendorTokenPair> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http
      .post<VendorTokenPair>(`${environment.apiUrl}/v1/auth/refresh`, { refreshToken })
      .pipe(tap((tokens) => this.persistSession(tokens)));
  }

  accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const router = this.injector.get(Router);
    const finish = (): void => {
      this.clearSession();
      if (router.url === '/login' || router.url.startsWith('/login?')) {
        return;
      }
      void router.navigateByUrl('/login', { replaceUrl: true });
    };

    if (!refreshToken) {
      finish();
      return;
    }

    this.http.post(`${environment.apiUrl}/v1/auth/logout`, { refreshToken }).subscribe({
      next: () => finish(),
      error: () => finish(),
    });
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    this.currentUser.set(null);
  }

  private persistSession(tokens: VendorTokenPair | VendorLoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    if ('profile' in tokens && tokens.profile) {
      this.rememberProfile(tokens.profile);
    }
  }

  private rememberProfile(profile: VendorProfile): void {
    const normalized = normalizeVendorProfile(profile);
    this.currentUser.set(normalized);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  }

  private hydrateProfileFromStorage(): void {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as VendorProfile;
      this.currentUser.set(normalizeVendorProfile(parsed));
    } catch {
      localStorage.removeItem(PROFILE_KEY);
    }
  }

}

function normalizeVendorProfile(profile: VendorProfile): VendorProfile {
  const role = profile.role === 'CASHIER' ? 'CASHIER' : 'MANAGER';
  return {
    ...profile,
    role,
    store: {
      ...profile.store,
      canEditCatalog: profile.store?.canEditCatalog === true,
    },
  };
}

export function isInvalidCredentials(error: unknown): boolean {
  return apiErrorCode(error) === 'INVALID_CREDENTIALS' && isStatus(error, 401);
}

export function isStoreAppDisabled(error: unknown): boolean {
  return apiErrorCode(error) === 'STORE_APP_DISABLED' && isStatus(error, 403);
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}

function apiErrorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return '';
  }
  const body = error.error as ApiErrorBody | null;
  return body?.error?.code ?? '';
}
