import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { StoreOperationalStatus } from '../../core/models/store.model';
import { AuthService } from '../../core/services/auth.service';
import { StoreProfileService } from '../../core/services/store-profile.service';
import {
  VendorNotificationService,
  formatNotificationAge,
} from '../../core/services/vendor-notification.service';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'نظرة عامة',
  orders: 'الطلبات',
  live: 'الطلبات المباشرة',
  history: 'سجل الطلبات',
  products: 'المنتجات',
  wallet: 'المحفظة',
  profile: 'ملف المتجر',
};

function titleForUrl(url: string): string {
  const path = url.split('?')[0];
  if (/^\/products\/create\/?$/.test(path) || /^\/products\/[^/]+\/edit\/?$/.test(path)) {
    return 'المنتج';
  }
  const segments = path.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const key = segments[i];
    if (key in PAGE_TITLES) {
      return PAGE_TITLES[key];
    }
  }
  return 'لوحة المتجر';
}

@Component({
  selector: 'vnd-topbar',
  standalone: true,
  imports: [NgClass],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  toggleSidebar = output<void>();

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly store = inject(StoreProfileService);
  private readonly notices = inject(VendorNotificationService);
  private readonly userMenu = viewChild<ElementRef<HTMLElement>>('userMenu');
  private readonly noticeMenu = viewChild<ElementRef<HTMLElement>>('noticeMenu');
  private readonly statusMenu = viewChild<ElementRef<HTMLElement>>('statusMenu');

  readonly menuOpen = signal(false);
  readonly noticesOpen = signal(false);
  readonly statusOpen = signal(false);
  readonly statusUpdating = signal(false);

  readonly notifications = this.notices.notifications;
  readonly unreadCount = this.notices.unreadCount;
  readonly storeStatus = this.store.operationalStatus;

  readonly displayName = computed(() => this.auth.currentUser()?.fullName?.trim() || 'متجر');
  readonly storeName = computed(() => this.auth.currentUser()?.storeName ?? this.store.profile().name);
  readonly email = computed(() => this.auth.currentUser()?.email ?? '');
  readonly avatarInitial = computed(() => this.displayName().charAt(0) || 'م');
  readonly formatAge = formatNotificationAge;

  readonly statusOptions: ReadonlyArray<{ id: StoreOperationalStatus; label: string; class: string }> = [
    { id: 'open', label: 'مفتوح', class: 'topbar__status-pill--open' },
    { id: 'busy', label: 'مزدحم', class: 'topbar__status-pill--busy' },
    { id: 'closed', label: 'مغلق', class: 'topbar__status-pill--closed' },
  ];

  pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e: NavigationEnd) => titleForUrl(e.urlAfterRedirects)),
    ),
    { initialValue: titleForUrl(this.router.url) },
  );

  statusLabel(status: StoreOperationalStatus): string {
    return this.statusOptions.find((o) => o.id === status)?.label ?? status;
  }

  statusClass(status: StoreOperationalStatus): string {
    return this.statusOptions.find((o) => o.id === status)?.class ?? '';
  }

  toggleMenu(): void {
    this.noticesOpen.set(false);
    this.statusOpen.set(false);
    this.menuOpen.update((open) => !open);
  }

  toggleNotices(): void {
    this.menuOpen.set(false);
    this.statusOpen.set(false);
    this.noticesOpen.update((open) => !open);
    if (this.noticesOpen()) {
      this.notices.markAllRead();
    }
  }

  toggleStatusMenu(): void {
    this.menuOpen.set(false);
    this.noticesOpen.set(false);
    this.statusOpen.update((open) => !open);
  }

  setStoreStatus(status: StoreOperationalStatus): void {
    if (this.statusUpdating() || this.storeStatus() === status) {
      this.statusOpen.set(false);
      return;
    }
    this.statusUpdating.set(true);
    this.store.setOperationalStatus(status).subscribe({
      next: () => {
        this.statusUpdating.set(false);
        this.statusOpen.set(false);
      },
      error: () => this.statusUpdating.set(false),
    });
  }

  openLiveOrders(): void {
    this.noticesOpen.set(false);
    void this.router.navigateByUrl('/orders/live');
  }

  logout(): void {
    this.menuOpen.set(false);
    this.noticesOpen.set(false);
    this.statusOpen.set(false);
    this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
    this.noticesOpen.set(false);
    this.statusOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    const userRoot = this.userMenu()?.nativeElement;
    if (this.menuOpen() && userRoot && !userRoot.contains(target)) {
      this.menuOpen.set(false);
    }
    const noticeRoot = this.noticeMenu()?.nativeElement;
    if (this.noticesOpen() && noticeRoot && !noticeRoot.contains(target)) {
      this.noticesOpen.set(false);
    }
    const statusRoot = this.statusMenu()?.nativeElement;
    if (this.statusOpen() && statusRoot && !statusRoot.contains(target)) {
      this.statusOpen.set(false);
    }
  }
}
