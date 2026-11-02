import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'vnd-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  collapsed = input(false);
  mobile = input(false);
  toggleCollapse = output<void>();
  navigate = output<void>();

  readonly navItems: NavLink[] = [
    { label: 'نظرة عامة', icon: 'pi-chart-bar', route: '/dashboard' },
    { label: 'الطلبات المباشرة', icon: 'pi-bolt', route: '/orders/live' },
    { label: 'سجل الطلبات', icon: 'pi-history', route: '/orders/history' },
    { label: 'المنتجات', icon: 'pi-tag', route: '/products' },
    // MVP is cash-only between drivers and vendors — hide Wallet until payouts exist.
    // { label: 'المحفظة', icon: 'pi-wallet', route: '/wallet' },
    { label: 'الإعدادات', icon: 'pi-cog', route: '/settings' },
  ];

  readonly exactMatch = { exact: true };
  readonly prefixMatch = { exact: false };

  onNavClick(): void {
    this.navigate.emit();
  }
}
