import { Routes } from '@angular/router';
import { authGuard, catalogEditGuard, guestGuard } from './core/guards/auth.guard';
import { VendorLayoutComponent } from './layout/vendor-layout/vendor-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: VendorLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'orders/live',
        loadComponent: () =>
          import('./features/orders/live/live-orders.component').then((m) => m.LiveOrdersComponent),
      },
      {
        path: 'orders/history',
        loadComponent: () =>
          import('./features/orders/history/order-history.component').then((m) => m.OrderHistoryComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'products/create',
        canActivate: [catalogEditGuard],
        loadComponent: () =>
          import('./features/products/product-form/product-form.component').then(
            (m) => m.VendorProductFormComponent,
          ),
      },
      {
        path: 'products/:productId/edit',
        canActivate: [catalogEditGuard],
        loadComponent: () =>
          import('./features/products/product-form/product-form.component').then(
            (m) => m.VendorProductFormComponent,
          ),
      },
      // MVP is cash-only — Wallet stays in the codebase but is not routed.
      // {
      //   path: 'wallet',
      //   loadComponent: () =>
      //     import('./features/wallet/wallet.component').then((m) => m.WalletComponent),
      // },
      { path: 'wallet', pathMatch: 'full', redirectTo: '/dashboard' },
      { path: 'profile', pathMatch: 'full', redirectTo: '/settings' },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
