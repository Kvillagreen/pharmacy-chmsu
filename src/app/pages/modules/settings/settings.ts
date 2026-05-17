import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { BranchData } from '../../../../models/BranchModel';
import { Extras } from '../../../../extras/extras';
import { UserData } from '../../../../models/UserModel';
import { AppAddressField } from '../../../shared/ui/address-field/address-field';
import { BRANCH_THEMES, DEFAULT_BRANCH_THEME_KEY, normalizeBranchThemeKey } from '../../../theme/branch-theme';
import { BranchThemeService } from '../../../theme/branch-theme.service';

type SettingsTab = 'general' | 'branch' | 'notif' | 'security';

interface SettingsPayload {
  profile: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    address: string;
    branch_id: number;
    branch_name: string;
    company_id: number;
    company_name: string;
    company_email: string;
    tin_number: string;
    theme_key: string;
  };
  access: {
    role: string;
    status: string;
    permission_count: number;
    permissions: string[];
    can_manage_all_settings: boolean;
  };
  notifications: {
    notify_transactions: boolean;
    notify_user_registrations: boolean;
    notify_low_stock: boolean;
    notify_expiry_alerts: boolean;
    notify_security_alerts: boolean;
    notify_browser: boolean;
  };
  security: {
    login_at: string | null;
    registered_ip: string | null;
    last_login_ip: string | null;
    last_seen_ip: string | null;
    last_password_changed_at: string | null;
    session: {
      token_id: number | null;
      name: string | null;
      issued_at: string | null;
      expires_at: string | null;
    };
  };
}

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, IonIcon, AppAddressField],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  setSelected: SettingsTab = 'general';
  userData: UserData = { data: [] };
  branchData: BranchData = { data: [], selectedBranch: {} };
  extras = Extras;
  branchThemes = BRANCH_THEMES;
  readonly defaultThemeKey = DEFAULT_BRANCH_THEME_KEY;

  isEditBranch = signal(false);
  isSaveProfileEdit = signal(false);
  isSaveCompanyEdit = signal(false);
  isSaveBranchEdit = signal(false);
  isSaveBranchCreate = signal(false);
  isDeleteBranch = signal(false);
  isCreateBranch = signal(false);

  isLoading = false;
  isSavingNotifications = false;
  isRevokingSessions = false;

  passwordForm = {
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  };
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  settingsData: SettingsPayload = {
    profile: {
      user_id: 0,
      first_name: '',
      last_name: '',
      email: '',
      address: '',
      branch_id: 0,
      branch_name: '',
      company_id: 0,
      company_name: '',
      company_email: '',
      tin_number: '',
      theme_key: DEFAULT_BRANCH_THEME_KEY,
    },
    access: {
      role: '',
      status: '',
      permission_count: 0,
      permissions: [],
      can_manage_all_settings: false,
    },
    notifications: {
      notify_transactions: true,
      notify_user_registrations: true,
      notify_low_stock: true,
      notify_expiry_alerts: true,
      notify_security_alerts: true,
      notify_browser: true,
    },
    security: {
      login_at: null,
      registered_ip: null,
      last_login_ip: null,
      last_seen_ip: null,
      last_password_changed_at: null,
      session: {
        token_id: null,
        name: null,
        issued_at: null,
        expires_at: null,
      },
    },
  };

  constructor(
    private encryptData: EncryptData,
    private userService: UserService,
    private cd: ChangeDetectorRef,
    private branchThemeService: BranchThemeService,
  ) {}

  ngOnInit(): void {
    const storedUser = this.encryptData.decryptData('user');
    this.userData.data = storedUser?.data ?? [];
    this.userData.token = storedUser?.token ?? '';
    this.loadSettings();
  }

  async loadSettings() {
    if (!this.userData.token) {
      return;
    }

    this.isLoading = true;

    try {
      const res = await this.userService.getUser('settings', '', this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.settingsData = {
          ...this.settingsData,
          ...(res.data.data ?? {}),
          profile: {
            ...this.settingsData.profile,
            ...(res.data.data?.profile ?? {}),
          },
          access: {
            ...this.settingsData.access,
            ...(res.data.data?.access ?? {}),
            permissions: res.data.data?.access?.permissions ?? [],
          },
          notifications: {
            ...this.settingsData.notifications,
            ...(res.data.data?.notifications ?? {}),
          },
          security: {
            ...this.settingsData.security,
            ...(res.data.data?.security ?? {}),
            session: {
              ...this.settingsData.security.session,
              ...(res.data.data?.security?.session ?? {}),
            },
          },
        };

        if (this.settingsData.profile.company_id) {
          this.userData.data = {
            ...this.userData.data,
            ...this.settingsData.profile,
            permissions: this.settingsData.access.permissions,
          };

          const stored = this.encryptData.decryptData('user');
          if (stored) {
            stored.data = this.userData.data;
            this.encryptData.encryptAndStoreData('user', stored);
          }

          await this.getBranch();
        }

        if (!this.canAccessTab(this.setSelected)) {
          this.setSelected = 'general';
        }
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to load settings.', 'warning');
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  canManageAllSettings(): boolean {
    if (this.settingsData.access.can_manage_all_settings) {
      return true;
    }

    const permissions = Array.isArray(this.settingsData.access.permissions)
      ? this.settingsData.access.permissions
      : [];

    return permissions.includes('settings');
  }

  canAccessTab(tab: SettingsTab): boolean {
    if (tab === 'general' || tab === 'security') {
      return true;
    }

    return this.canManageAllSettings();
  }

  selectTab(tab: SettingsTab) {
    if (!this.canAccessTab(tab)) {
      this.setSelected = 'general';
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      return;
    }

    this.setSelected = tab;
  }

  async getBranch() {
    if (!this.canManageAllSettings()) {
      this.branchData.data = [];
      return;
    }

    try {
      const companyId = Number(this.settingsData.profile.company_id || this.userData.data?.company_id || 0);
      if (!companyId || !this.userData.token) {
        this.branchData.data = [];
        return;
      }

      const res = await this.userService.getUser(`branch/${companyId}`, '', this.userData.token);
      if (res.status === 200 && res.data?.success) {
        const branches = Array.isArray(res.data?.data?.branches) ? res.data.data.branches : [];
        const assignedBranchId = Number(this.settingsData.profile.branch_id || this.userData.data?.branch_id || 0);
        this.branchData.data = [...branches].sort((a: any, b: any) => {
          const aAssigned = Number(a?.branch_id ?? a?.branchId ?? 0) === assignedBranchId ? 1 : 0;
          const bAssigned = Number(b?.branch_id ?? b?.branchId ?? 0) === assignedBranchId ? 1 : 0;
          return bAssigned - aAssigned;
        });
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.branchData.data = [];
    }
  }

  async updateCompany() {
    if (!this.canManageAllSettings()) {
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      this.isSaveCompanyEdit.set(false);
      return;
    }

    const companyId = Number(this.settingsData.profile.company_id || this.userData.data?.company_id || 0);
    const payload = {
      company_name: this.settingsData.profile.company_name,
      company_email: this.settingsData.profile.company_email,
      tin_number: this.settingsData.profile.tin_number,
    };

    try {
      const res = await this.userService.putUser(`company/${companyId}`, payload, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        const stored = this.encryptData.decryptData('user');
        if (stored?.data) {
          stored.data.company_name = payload.company_name;
          stored.data.company_email = payload.company_email;
          stored.data.tin_number = payload.tin_number;
          this.encryptData.encryptAndStoreData('user', stored);
        }

        this.extras.showToast(res.data.message, 'success');
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to update company.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to update company.', 'warning');
    } finally {
      this.isSaveCompanyEdit.set(false);
    }
  }

  async updateProfile() {
    const userId = Number(this.settingsData.profile.user_id || this.userData.data?.user_id || 0);
    const payload = {
      first_name: (this.settingsData.profile.first_name || '').trim(),
      last_name: (this.settingsData.profile.last_name || '').trim(),
      email: (this.settingsData.profile.email || '').trim(),
      address: (this.settingsData.profile.address || '').trim(),
    };

    if (!userId) {
      this.extras.showToast('Unable to find the current user profile.', 'warning');
      this.isSaveProfileEdit.set(false);
      return;
    }

    if (!payload.first_name || !payload.last_name || !payload.email) {
      this.extras.showToast('First name, last name, and email are required.', 'warning');
      this.isSaveProfileEdit.set(false);
      return;
    }

    try {
      const res = await this.userService.putUser(`user/${userId}`, payload, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        const updatedUser = res.data?.data ?? payload;

        this.settingsData.profile = {
          ...this.settingsData.profile,
          first_name: updatedUser.first_name ?? payload.first_name,
          last_name: updatedUser.last_name ?? payload.last_name,
          email: updatedUser.email ?? payload.email,
          address: updatedUser.address ?? payload.address,
        };

        this.userData.data = {
          ...this.userData.data,
          first_name: this.settingsData.profile.first_name,
          last_name: this.settingsData.profile.last_name,
          email: this.settingsData.profile.email,
          address: this.settingsData.profile.address,
        };

        const stored = this.encryptData.decryptData('user');
        if (stored?.data) {
          stored.data = {
            ...stored.data,
            first_name: this.settingsData.profile.first_name,
            last_name: this.settingsData.profile.last_name,
            email: this.settingsData.profile.email,
            address: this.settingsData.profile.address,
          };
          this.encryptData.encryptAndStoreData('user', stored);
        }

        this.extras.showToast(res.data.message ?? 'Profile updated successfully.', 'success');
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to update profile.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to update profile.', 'warning');
    } finally {
      this.isSaveProfileEdit.set(false);
    }
  }

  async updateBranch() {
    if (!this.canManageAllSettings()) {
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      this.isSaveBranchEdit.set(false);
      return;
    }

    const payload = { ...this.branchData.selectedBranch };
    try {
      const res = await this.userService.putUser(`branch/${this.branchData.selectedBranch.branch_id}`, payload, this.userData.token);
      if (res.status === 200 && res.data?.success) {
          const updatedBranch = res.data?.data ?? payload;
          const updatedBranchId = Number(updatedBranch.branch_id ?? this.branchData.selectedBranch.branch_id ?? 0);
          const nextThemeKey = normalizeBranchThemeKey(updatedBranch.theme_key ?? this.branchData.selectedBranch.theme_key ?? DEFAULT_BRANCH_THEME_KEY);
          const assignedBranchId = Number(this.settingsData.profile.branch_id || this.userData.data?.branch_id || 0);

          if (updatedBranchId === assignedBranchId) {
            this.settingsData.profile = {
              ...this.settingsData.profile,
              branch_name: updatedBranch.branch_name ?? this.settingsData.profile.branch_name,
              theme_key: nextThemeKey,
            };

            this.userData.data = {
              ...this.userData.data,
              branch_name: updatedBranch.branch_name ?? this.userData.data?.branch_name,
              theme_key: nextThemeKey,
            };

            const stored = this.encryptData.decryptData('user');
            if (stored?.data) {
              stored.data = {
                ...stored.data,
                branch_name: updatedBranch.branch_name ?? stored.data.branch_name,
                theme_key: nextThemeKey,
              };
              this.encryptData.encryptAndStoreData('user', stored);
            }
          }

          const storedBranch = this.encryptData.decryptData('branch');
          const selectedBranchId = Number(storedBranch?.selectedBranch ?? assignedBranchId ?? 0);
          if (updatedBranchId === selectedBranchId || (!selectedBranchId && updatedBranchId === assignedBranchId)) {
            const branchPayload = {
              selectedBranch: storedBranch?.selectedBranch ?? assignedBranchId,
              selectedBranchName: updatedBranch.branch_name ?? storedBranch?.selectedBranchName ?? '',
              selectedBranchThemeKey: nextThemeKey,
            };
            this.encryptData.encryptAndStoreData('branch', branchPayload);
            this.branchThemeService.syncFromStoredState(this.encryptData.decryptData('user'), branchPayload);
          }

          this.isSaveBranchEdit.set(false);
          this.isEditBranch.set(false);
        this.extras.showToast(res.data.message, 'success');
        await this.getBranch();
      } else {
        this.isSaveBranchEdit.set(false);
        this.extras.showToast(res.data?.message ?? 'Failed to update branch.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.isSaveBranchEdit.set(false);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to update branch.', 'warning');
    }
  }

  async createBranch() {
    if (!this.canManageAllSettings()) {
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      this.isSaveBranchCreate.set(false);
      return;
    }

    if (!this.branchData.selectedBranch.branch_name) {
      this.extras.showToast('Branch name is required.', 'warning');
      this.isSaveBranchCreate.set(false);
      return;
    }
    if (!this.branchData.selectedBranch.branch_address) {
      this.extras.showToast('Branch address is required.', 'warning');
      this.isSaveBranchCreate.set(false);
      return;
    }
    if (!this.branchData.selectedBranch.branch_contact) {
      this.extras.showToast('Branch contact is required.', 'warning');
      this.isSaveBranchCreate.set(false);
      return;
    }

    this.branchData.selectedBranch.company_id = Number(this.settingsData.profile.company_id || this.userData.data?.company_id || 0);
    this.branchData.selectedBranch.status = 'active';
    this.branchData.selectedBranch.theme_key = this.branchData.selectedBranch.theme_key || this.settingsData.profile.theme_key || DEFAULT_BRANCH_THEME_KEY;

    try {
      const res = await this.userService.postUser('branch', { ...this.branchData.selectedBranch }, this.userData.token);
      if (res.status === 201 && res.data?.success) {
        this.extras.showToast(res.data.message, 'success');
        this.isSaveBranchCreate.set(false);
        this.branchData.selectedBranch = {};
        this.isCreateBranch.set(false);
        await this.getBranch();
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to create branch.', 'warning');
        this.isSaveBranchCreate.set(false);
      }
    } catch (e: any) {
      console.log(e);
      this.isSaveBranchCreate.set(false);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to create branch.', 'warning');
    }
  }

  async deleteBranch() {
    if (!this.canManageAllSettings()) {
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      this.isDeleteBranch.set(false);
      return;
    }

    try {
      const res = await this.userService.deleteUser(`branch/${this.branchData.selectedBranch.branch_id}`, '', this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.extras.showToast(res.data.message, 'success');
        this.isEditBranch.set(false);
        this.isDeleteBranch.set(false);
        await this.getBranch();
        window.location.reload();
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to delete branch.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to delete branch.', 'warning');
    }
  }

  async saveNotifications() {
    if (!this.canManageAllSettings()) {
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      return;
    }

    this.isSavingNotifications = true;

    try {
      const res = await this.userService.putUser('settings/notifications', this.settingsData.notifications, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.settingsData.notifications = {
          ...this.settingsData.notifications,
          ...(res.data.data ?? {}),
        };
        this.extras.showToast('Notification preferences updated successfully.', 'success');
        this.isSavingNotifications = false;
        this.cd.detectChanges();
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to update notification preferences.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to update notification preferences.', 'warning');
    } finally {
      this.isSavingNotifications = false;
    }
  }

  async changePassword() {
    if (!this.passwordForm.current_password || !this.passwordForm.new_password || !this.passwordForm.new_password_confirmation) {
      this.extras.showToast('All password fields are required.', 'warning');
      return;
    }

    if (this.passwordForm.new_password.length < 8) {
      this.extras.showToast('New password must be at least 8 characters.', 'warning');
      return;
    }

    if (this.passwordForm.new_password !== this.passwordForm.new_password_confirmation) {
      this.extras.showToast('Password confirmation does not match.', 'warning');
      return;
    }

    try {
      const res = await this.userService.postUser('change-password', this.passwordForm, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.passwordForm = {
          current_password: '',
          new_password: '',
          new_password_confirmation: '',
        };
        this.extras.showToast('Password changed successfully.', 'success');
        await this.loadSettings();
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to change password.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to change password.', 'warning');
    }
  }

  async revokeOtherSessions() {
    this.isRevokingSessions = true;
    try {
      const res = await this.userService.postUser('settings/revoke-other-sessions', {}, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.extras.showToast('Other sessions revoked successfully.', 'success');
      } else {
        this.extras.showToast(res.data?.message ?? 'Failed to revoke other sessions.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.response?.data?.message ?? 'Failed to revoke other sessions.', 'warning');
    } finally {
      this.isRevokingSessions = false;
    }
  }

  openBranchEditor(branch?: any) {
    if (!this.canManageAllSettings()) {
      this.extras.showToast('Only profile and security settings are available for this account.', 'warning');
      return;
    }

    this.branchData.selectedBranch = branch ? {
      ...branch,
      theme_key: normalizeBranchThemeKey(branch.theme_key || branch.themeKey || this.settingsData.profile.theme_key || DEFAULT_BRANCH_THEME_KEY),
    } : {
      branch_name: '',
      branch_address: '',
      branch_contact: '',
      theme_key: normalizeBranchThemeKey(this.settingsData.profile.theme_key || DEFAULT_BRANCH_THEME_KEY),
      status: 'active',
    };

    if (branch) {
      this.isEditBranch.set(true);
      this.isCreateBranch.set(false);
      return;
    }

    this.isCreateBranch.set(true);
    this.isEditBranch.set(false);
  }

  themeLabel(themeKey?: string | null): string {
    return this.branchThemes.find((theme) => theme.key === themeKey)?.name ?? 'Emerald';
  }

  isAssignedBranch(branch: any): boolean {
    const branchId = Number(branch?.branch_id ?? branch?.branchId ?? 0);
    return branchId === Number(this.settingsData.profile.branch_id || this.userData.data?.branch_id || 0);
  }
}
