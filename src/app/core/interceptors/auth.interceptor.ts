import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  finalize,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { ACCESS_TOKEN_KEY, AuthService } from '../services/auth.service';
import { apiErrorCode } from '../utils/api-error';

const API_ROOT = `${environment.apiUrl}/v1`;
const LOGIN_URL = `${API_ROOT}/auth/store/login`;
const REFRESH_URL = `${API_ROOT}/auth/refresh`;
const LOGOUT_URL = `${API_ROOT}/auth/logout`;

const isRefreshing = new BehaviorSubject(false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_ROOT) || isAnonymousAuth(request.url)) {
    return next(request);
  }

  const injector = inject(Injector);

  if (isRefreshing.value) {
    return afterRefresh(request, next, injector);
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const outgoing = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!shouldRefreshSession(error)) {
        return throwError(() => error);
      }
      return afterRefresh(request, next, injector);
    }),
  );
};

function isAnonymousAuth(url: string): boolean {
  return (
    isEndpoint(url, LOGIN_URL) ||
    isEndpoint(url, REFRESH_URL) ||
    isEndpoint(url, LOGOUT_URL)
  );
}

function isEndpoint(url: string, endpoint: string): boolean {
  return url === endpoint || url.startsWith(`${endpoint}?`);
}

function shouldRefreshSession(error: unknown): error is HttpErrorResponse {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 401 &&
    apiErrorCode(error) === 'UNAUTHENTICATED'
  );
}

function isUnauthorized(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === 401;
}

function afterRefresh(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  injector: Injector,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing.value) {
    isRefreshing.next(true);
    const auth = injector.get(AuthService);
    auth
      .refreshToken()
      .pipe(
        catchError((error: unknown) => {
          auth.logout();
          return throwError(() => error);
        }),
        finalize(() => isRefreshing.next(false)),
      )
      .subscribe({ error: () => undefined });
  }

  return isRefreshing.pipe(
    filter((refreshing) => !refreshing),
    take(1),
    switchMap(() => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 401,
              statusText: 'UNAUTHENTICATED',
              url: request.url,
            }),
        );
      }
      return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
        catchError((error: unknown) => {
          if (isUnauthorized(error)) {
            injector.get(AuthService).logout();
          }
          return throwError(() => error);
        }),
      );
    }),
  );
}
