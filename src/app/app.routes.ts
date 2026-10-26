import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
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
        loadComponent: () =>
          import('./features/products/product-form/product-form.component').then(
            (m) => m.VendorProductFormComponent,
          ),
      },
      {
        path: 'products/:productId/edit',
        loadComponent: () =>
          import('./features/products/product-form/product-form.component').then(
            (m) => m.VendorProductFormComponent,
          ),
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/wallet.component').then((m) => m.WalletComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
