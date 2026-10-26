# combo-vendor

Vendor-facing Angular dashboard for individual store owners and staff. UI tokens, Bootstrap 5, PrimeIcons, and SCSS design system are aligned with **combo-control** (Ops Dashboard).

## Quick start

```bash
cd combo-vendor
npm install --legacy-peer-deps
npm start
```

App runs at [http://localhost:4202](http://localhost:4202).

Mock API mode is enabled by default (`USE_MOCK_API` in `src/app/core/api-config.ts`). Log in with any email and password.

## Structure

```
src/app/
  core/          Auth, guards, interceptors, models, services (Order, Product, Wallet, Socket, …)
  shared/        Stat cards, toast container
  layout/        Vendor shell (sidebar, topbar with store status + notifications)
  features/      Lazy routes: login, dashboard, orders (live/history), products, wallet, profile
```

## Realtime (KDS)

- `SocketService` — Socket.IO to `{API_BASE_URL}/vendor` when mocks are off; mock feed + `order:created` simulation when mocks are on.
- `VendorNotificationService` — HTML5 audio (`assets/sounds/new-order.mp3`) + in-app toasts on new orders.

Add `new-order.mp3` under `src/assets/sounds/` for the alert sound (same path as combo-control).
