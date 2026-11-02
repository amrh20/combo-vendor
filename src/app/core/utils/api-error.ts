import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return '';
  }
  const body = error.error;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return '';
  }
  const nested = (body as Record<string, unknown>)['error'];
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
    return '';
  }
  const code = (nested as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : '';
}

export function isCatalogEditDisabled(error: unknown): boolean {
  return apiErrorCode(error) === 'CATALOG_EDIT_DISABLED' && isHttpStatus(error, 403);
}

export function catalogEditDisabledMessage(): string {
  return 'تعديل الكتالوج غير مفعّل لهذا المتجر. تواصل مع كومبو لتفعيله.';
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isCatalogEditDisabled(error)) {
    return catalogEditDisabledMessage();
  }
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      const direct = record['message'];
      if (typeof direct === 'string' && direct.trim()) {
        return direct;
      }
      const nested = record['error'];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const message = (nested as Record<string, unknown>)['message'];
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }
  }
  return fallback;
}

function isHttpStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}
