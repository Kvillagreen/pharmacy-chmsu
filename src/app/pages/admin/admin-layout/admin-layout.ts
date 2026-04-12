import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IonIcon],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  adminUser: any = {};
  mobileNavOpen = signal(false);
  navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'grid-outline' },
    { label: 'Companies', path: '/admin/companies', icon: 'business-outline' },
    { label: 'Approvals', path: '/admin/approvals', icon: 'checkmark-done-outline' },
    { label: 'Logs', path: '/admin/logs', icon: 'document-text-outline' },
    { label: 'Analytics', path: '/admin/analytics', icon: 'stats-chart-outline' },
    { label: 'Profile', path: '/admin/profile', icon: 'person-outline' },
  ];

  constructor(
    private encryptData: EncryptData,
    private userService: UserService,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {
    this.adminUser = this.encryptData.decryptData('super_admin')?.data ?? {};
  }

  get isMobileNavOpen() {
    return this.mobileNavOpen();
  }

  toggleMobileNav() {
    this.mobileNavOpen.set(!this.mobileNavOpen());
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
  }

  initials(): string {
    const first = this.adminUser?.first_name?.[0] ?? '';
    const last = this.adminUser?.last_name?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'SA';
  }

  async logout(fromMobile = false) {
    if (fromMobile) {
      this.closeMobileNav();
    }

    const token = this.encryptData.decryptData('super_admin')?.token;
    if (token) {
      await this.userService.postUser('admin/logout', {}, token);
    }

    this.encryptData.logoutDelete('super_admin');
    this.router.navigate(['/admin/login']);
    this.cd.detectChanges();
  }
}
