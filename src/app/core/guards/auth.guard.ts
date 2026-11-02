import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.whenReady().pipe(
    map(() => auth.isAuthenticated() || router.createUrlTree(['/login'])),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.whenReady().pipe(
    map(() => !auth.isAuthenticated() || router.createUrlTree(['/dashboard'])),
  );
};

/** Block cashiers and shops without catalog edit permission from product create/edit routes. */
export const catalogEditGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.whenReady().pipe(
    map(() => auth.canManageCatalog() || router.createUrlTree(['/products'])),
  );
};
