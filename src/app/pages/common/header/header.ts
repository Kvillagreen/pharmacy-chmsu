import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, signal } from '@angular/core';
import { UserData } from '../../../../models/UserModel';
import { Extras } from '../../../../extras/extras';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [IonIcon, FormsModule, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnChanges {
  isOpen = signal(false);
  isLogout = signal(false);
  isNotificationOpen = signal(false);
  isProfileOpen = signal(false);
  extras = Extras;

  @Input() key = 0;

  branchNumber = 0;
  branchList: any[] = [];
  notifications: any[] = [];
  unreadCount = 0;
  readNotificationKeys: string[] = [];

  userData: UserData = {
    data: [],
    permissions: [],
  };

  permissionMap: Record<string, boolean> = {};

  constructor(
    public encryptData: EncryptData,
    private userService: UserService,
    private cd: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnChanges() {
    this.loadData();
  }

  ngOnInit(): void {
    this.loadData();
  }

  private getStoredUserPayload() {
    const stored = this.encryptData.decryptData('user');
    if (!stored) {
      return null;
    }

    return stored.data?.user_id ? stored.data : stored.data?.data ?? stored.data ?? null;
  }

  private getStoredCompanyId(): number {
    return Number(this.getStoredUserPayload()?.company_id ?? 0);
  }

  private getStoredBranchId(): number {
    return Number(this.getStoredUserPayload()?.branch_id ?? 0);
  }

  loadData() {
    const user = this.encryptData.decryptData('user');
    const payload = this.getStoredUserPayload();

    if (!user?.token || !payload) {
      return;
    }

    this.userData.data = payload;
    this.userData.token = user.token;

    let branch = this.encryptData.decryptData('branch');

    if (this.checker('branches')) {
      if (!branch) {
        branch = { selectedBranch: 0 };
        this.encryptData.encryptAndStoreData('branch', branch);
      }
      this.branchNumber = Number(branch.selectedBranch) || 0;
    } else {
      this.branchNumber = this.getStoredBranchId();
      branch = {
        selectedBranch: this.getStoredBranchId(),
        selectedBranchName: '',
      };
      this.encryptData.encryptAndStoreData('branch', branch);
    }

    this.getBranchList();
    this.loadReadNotifications();
    this.getNotifications();
  }

  notificationStorageKey(): string {
    return `header_read_notifications_${this.userData.data?.user_id ?? 'guest'}`;
  }

  loadReadNotifications() {
    try {
      const raw = localStorage.getItem(this.notificationStorageKey());
      this.readNotificationKeys = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.log(e);
      this.readNotificationKeys = [];
    }
  }

  persistReadNotifications() {
    localStorage.setItem(this.notificationStorageKey(), JSON.stringify(this.readNotificationKeys));
  }

  notificationKey(notification: any): string {
    return [
      notification.type ?? '',
      notification.title ?? '',
      notification.message ?? '',
      notification.created_at ?? '',
      notification.branch_name ?? '',
      notification.amount ?? '',
    ].join('|');
  }

  isNotificationRead(notification: any): boolean {
    return this.readNotificationKeys.includes(this.notificationKey(notification));
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((notification) => !this.isNotificationRead(notification)).length;
  }

  markNotificationAsRead(notification: any) {
    const key = this.notificationKey(notification);
    if (!this.readNotificationKeys.includes(key)) {
      this.readNotificationKeys = [...this.readNotificationKeys, key];
      this.persistReadNotifications();
      this.updateUnreadCount();
      this.cd.detectChanges();
    }
  }

  markNotificationAsUnread(notification: any) {
    const key = this.notificationKey(notification);
    if (this.readNotificationKeys.includes(key)) {
      this.readNotificationKeys = this.readNotificationKeys.filter((item) => item !== key);
      this.persistReadNotifications();
      this.updateUnreadCount();
      this.cd.detectChanges();
    }
  }

  toggleNotificationReadState(notification: any) {
    if (this.isNotificationRead(notification)) {
      this.markNotificationAsUnread(notification);
      return;
    }

    this.markNotificationAsRead(notification);
  }

  markAllNotificationsAsRead() {
    this.readNotificationKeys = [
      ...new Set([
        ...this.readNotificationKeys,
        ...this.notifications.map((notification) => this.notificationKey(notification)),
      ]),
    ];
    this.persistReadNotifications();
    this.updateUnreadCount();
    this.cd.detectChanges();
  }

  async logout() {
    const res = await this.userService.postUser('logout', '', this.userData.token);
    if (res.status === 200) {
      this.encryptData.logoutDelete('user');
      this.router.navigate(['/login']);
      this.isLogout.set(false);
      this.cd.detectChanges();
    }
  }

  saveBranch(event: any) {
    const selectedBranch = Number(event.value);
    const selectedBranchData = this.branchList.find((branch) => Number(branch.branchId) === selectedBranch);

    const branch = {
      selectedBranch,
      selectedBranchName: selectedBranchData?.branchName ?? '',
    };

    this.encryptData.encryptAndStoreData('branch', branch);
    window.location.reload();
  }

  async getBranchList() {
    try {
      const companyId = this.getStoredCompanyId();

      if (!companyId || !this.userData.token) {
        this.branchList = [];
        return;
      }

      const res = await this.userService.getUser('branch/' + companyId, undefined, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.branchList = Array.isArray(res.data?.data?.branches) ? res.data.data.branches : [];
      } else {
        console.log(res);
        this.branchList = [];
      }
    } catch (error) {
      console.log(error);
      this.branchList = [];
    } finally {
      this.cd.detectChanges();
    }
  }

  async getNotifications() {
    try {
      const storedBranch = this.encryptData.decryptData('branch');
      const selectedBranch = Number(storedBranch?.selectedBranch ?? this.getStoredBranchId() ?? 0);
      const companyId = this.getStoredCompanyId();

      if (!companyId || !this.userData.token) {
        this.notifications = [];
        this.unreadCount = 0;
        return;
      }

      const endpoint = `header/notifications?company_id=${companyId}&branch_id=${selectedBranch}`;
      const res = await this.userService.getUser(endpoint, '', this.userData.token);

      if (res.status === 200) {
        this.notifications = res.data.data.notifications ?? [];
        this.updateUnreadCount();
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  toggleNotifications() {
    this.isNotificationOpen.set(!this.isNotificationOpen());
    if (this.isNotificationOpen()) {
      this.isProfileOpen.set(false);
    }
    this.cd.detectChanges();
  }

  toggleProfileMenu() {
    this.isProfileOpen.set(!this.isProfileOpen());
    if (this.isProfileOpen()) {
      this.isNotificationOpen.set(false);
    }
  }

  openProfile() {
    this.isProfileOpen.set(false);
    this.isOpen.set(true);
  }

  goToSettings() {
    this.isProfileOpen.set(false);
    this.router.navigate(['/settings']);
  }

  currentBranchName(): string {
    if (this.checker('branches') && this.branchNumber === 0) {
      return 'All Branches';
    }

    const branchId = this.checker('branches') ? this.branchNumber : this.getStoredBranchId();
    return this.branchList.find((branch) => Number(branch.branchId) === Number(branchId))?.branchName || 'Assigned Branch';
  }

  checker(permission: string): boolean {
    const stored = this.encryptData.decryptData('user');
    const payload = this.getStoredUserPayload();

    if (stored?.data && payload) {
      this.userData.data = payload;

      const perms = payload.permissions || [];

      if (Array.isArray(perms)) {
        this.userData.permissions = perms;
        this.permissionMap = perms.reduce((acc: any, p: string) => {
          acc[p] = true;
          return acc;
        }, {});
      } else {
        this.permissionMap = perms;
        this.userData.permissions = Object.keys(perms);
      }
    }

    return !!this.permissionMap[permission];
  }
}
