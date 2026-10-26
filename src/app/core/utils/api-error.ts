import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const message = (body as Record<string, unknown>)['message'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }
  return fallback;
}
