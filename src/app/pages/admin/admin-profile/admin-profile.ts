import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { AdminProfileData } from '../../../../models/AdminModel';
import { Extras } from '../../../../extras/extras';
import { AppModal } from '../../../shared/ui/modal/modal';
import { AppAddressField } from '../../../shared/ui/address-field/address-field';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AppModal, AppAddressField],
  templateUrl: './admin-profile.html',
})
export class AdminProfile {
  extras = Extras;
  token = '';
  profile: AdminProfileData = { data: {}, super_admins: [] };
  passwordForm = { current_password: '', new_password: '', new_password_confirmation: '' };
  createSuperAdminForm = { first_name: '', last_name: '', email: '', password: '', address: '' };
  isCreateSuperAdminOpen = false;

  constructor(private userService: UserService, private encryptData: EncryptData, private cd: ChangeDetectorRef) {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
    this.load();
  }

  async load() {
    try {
      const res = await this.userService.getUser('admin/profile', '', this.token);
      if (res.status === 200) {
        this.profile = res.data;
        await this.loadSuperAdmins();
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to load super admin profile.', 'warning');
    }
  }

  async loadSuperAdmins() {
    try {
      const res = await this.userService.getUser('admin/super-admins', '', this.token);
      if (res.status === 200) {
        this.profile.super_admins = res.data.data ?? [];
      }
    } catch (e) {
      console.log(e);
    }
  }

  async saveProfile() {
    try {
      const res = await this.userService.putUser('admin/profile', this.profile.data, this.token);
      if (res.status === 200) {
        this.extras.showToast('Profile updated successfully', 'success');
        await this.load();
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to update profile.', 'warning');
    }
  }

  async changePassword() {
    try {
      const res = await this.userService.postUser('admin/change-password', this.passwordForm, this.token);
      if (res.status === 200 && res.data.success) {
        this.passwordForm = { current_password: '', new_password: '', new_password_confirmation: '' };
        this.extras.showToast('Password changed successfully', 'success');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to change password.', 'warning');
    }
  }

  async createSuperAdmin() {
    const payload = {
      ...this.createSuperAdminForm,
      first_name: this.createSuperAdminForm.first_name.trim(),
      last_name: this.createSuperAdminForm.last_name.trim(),
      email: this.createSuperAdminForm.email.trim(),
      address: this.createSuperAdminForm.address.trim(),
    };

    try {
      const res = await this.userService.postUser('admin/super-admins', payload, this.token);
      if (res.status === 201 && res.data.success) {
        this.createSuperAdminForm = { first_name: '', last_name: '', email: '', password: '', address: '' };
        this.isCreateSuperAdminOpen = false;
        this.extras.showToast('Super admin created successfully', 'success');
        await this.load();
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to create super admin.', 'warning');
    }
  }
}
