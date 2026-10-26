import {
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { VendorNotificationService } from '../../core/services/vendor-notification.service';
import { SocketService } from '../../core/services/socket.service';
import { StoreProfileService } from '../../core/services/store-profile.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

const MOBILE_BREAKPOINT = 991;

@Component({
  selector: 'vnd-vendor-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './vendor-layout.component.html',
  styleUrl: './vendor-layout.component.scss',
})
export class VendorLayoutComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarCollapsed = signal(false);
  readonly mobileNavOpen = signal(false);
  readonly isMobile = signal(
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );

  constructor() {
    inject(VendorNotificationService);
    inject(SocketService);
    inject(StoreProfileService).load().subscribe();

    this.destroyRef.onDestroy(() => {
      document.body.style.overflow = '';
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeMobileNav());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncViewport();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileNavOpen()) {
      this.closeMobileNav();
    }
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileNavOpen.update((open) => !open);
      this.syncBodyScroll();
      return;
    }
    this.sidebarCollapsed.update((v) => !v);
  }

  closeMobileNav(): void {
    if (!this.mobileNavOpen()) return;
    this.mobileNavOpen.set(false);
    this.syncBodyScroll();
  }

  private syncViewport(): void {
    const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const wasMobile = this.isMobile();
    this.isMobile.set(mobile);
    if (mobile !== wasMobile) {
      this.mobileNavOpen.set(false);
      if (mobile) {
        this.sidebarCollapsed.set(false);
      }
      this.syncBodyScroll();
    }
  }

  private syncBodyScroll(): void {
    document.body.style.overflow = this.mobileNavOpen() ? 'hidden' : '';
  }
}
