import { Component, OnInit, HostListener, signal } from '@angular/core';
import { UserService } from '../../../../services/services';
import { ChangeDetectorRef } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserData } from '../../../../models/UserModel';
import { Extras } from '../../../../extras/extras';
import { BranchData } from '../../../../models/BranchModel';

@Component({
  selector: 'app-users',
  imports: [IonIcon, CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  userData: UserData = {
    data: {},
    userData: {},
    token: '',
  };

  branchData: BranchData = {
    data: [],
  };

  permissionData: { data: any[] } = {
    data: [],
  };

  selectedUser: any = null;
  selectedPermissionIds: number[] = [];
  createSelectedPermissionIds: number[] = [];
  editUserForm = {
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    address: '',
  };
  statusForm = {
    user_id: '',
    status: '',
  };
  createUserForm = {
    first_name: '',
    last_name: '',
    email: '',
    address: '',
    password: '',
    password_confirmation: '',
    role: 'staff',
    branch_id: '',
  };
  branchForm = {
    user_id: '',
    branch_id: '',
  };
  deleteForm = {
    user_id: '',
    full_name: '',
  };
  exportUserConfig = {
    columns: [
      { key: 'full_name', label: 'Full Name', checked: true },
      { key: 'email', label: 'Email', checked: true },
      { key: 'role', label: 'Role', checked: true },
      { key: 'status', label: 'Status', checked: true },
      { key: 'branch_name', label: 'Branch', checked: true },
      { key: 'branch_address', label: 'Branch Address', checked: false },
      { key: 'address', label: 'Address', checked: false },
      { key: 'permissions', label: 'Permissions', checked: true },
      { key: 'created_at', label: 'Created At', checked: false },
      { key: 'login_at', label: 'Last Login', checked: false },
    ],
  };

  isUpdateStatus = signal(false);
  isUpdateBranch = signal(false);
  isUpdatePermissions = signal(false);
  isUpdateUser = signal(false);
  isDeleteUser = signal(false);
  isCreateUser = signal(false);
  isExportUser = signal(false);

  extras = Extras;
  activeDropdown: any = null;
  pageNumber = 1;
  sort = '';
  searchQuery = '';

  constructor(
    private userService: UserService,
    private cd: ChangeDetectorRef,
    private encryptData: EncryptData
  ) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: any) {
    const clickedInside = event.target.closest('.relative');
    if (!clickedInside) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(item: any) {
    this.activeDropdown = this.activeDropdown === item ? null : item;
  }

  ngOnInit(): void {
    this.userData.data = this.encryptData.decryptData('user');
    this.userData.token = this.encryptData.decryptData('user').token;
    this.getUser();
  }

  buildQuery(): string {
    const params: string[] = [];
    const selectedBranch = Number(this.encryptData.decryptData('branch')?.selectedBranch ?? 0);

    if (this.pageNumber) {
      params.push(`page=${this.pageNumber}`);
    }
    if (this.sort) {
      params.push(this.sort);
    }
    if (this.searchQuery) {
      params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    }
    if (selectedBranch) {
      params.push(`branch_id=${selectedBranch}`);
    }

    const queryString = params.length ? `&${params.join('&')}` : '';
    return `user?company_id=${this.userData.data.data.company_id}&per_page=6${queryString}`;
  }

  changeText(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.trim();
    this.pageNumber = 1;
    this.getUser();
  }

  buildExportQuery(): string {
    const params: string[] = ['export=1'];
    const selectedBranch = Number(this.encryptData.decryptData('branch')?.selectedBranch ?? 0);

    if (this.sort) {
      params.push(this.sort);
    }
    if (this.searchQuery) {
      params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    }
    if (selectedBranch) {
      params.push(`branch_id=${selectedBranch}`);
    }

    return `user?company_id=${this.userData.data.data.company_id}&${params.join('&')}`;
  }

  next() {
    if (this.pageNumber < this.userData.userData.meta.last_page) {
      this.pageNumber++;
      this.getUser();
    }
  }

  prev() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.getUser();
    }
  }

  async getBranchList() {
    try {
      const res = await this.userService.getUser(`branch/${this.userData.data.data.company_id}`, '', this.userData.token);
      if (res.status === 200) {
        this.branchData.data = res.data.data.branches ?? [];
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async getPermissionOptions(userId?: string) {
    try {
      if (!this.permissionData.data.length) {
        const optionsRes = await this.userService.getUser('user/permissions/options', '', this.userData.token);
        if (optionsRes.status === 200) {
          this.permissionData.data = optionsRes.data.data ?? [];
        }
      }

      if (userId) {
        const res = await this.userService.getUser(`user/${userId}/permissions`, '', this.userData.token);
        if (res.status === 200) {
          this.selectedPermissionIds = (res.data.data.permission_ids ?? []).map((id: any) => Number(id));
          if (res.data.data.permissions?.length) {
            this.permissionData.data = res.data.data.permissions;
          }
        }
      }

      this.cd.detectChanges();
    } catch (e) {
      console.log(e);
    }
  }

  async getUser() {
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        this.userData.userData = res.data;
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  openStatusModal(item: any, status: string) {
    this.selectedUser = item;
    this.statusForm.user_id = String(item.user_id);
    this.statusForm.status = status;
    this.activeDropdown = null;
    this.isUpdateStatus.set(true);
  }

  async openBranchModal(item: any) {
    this.selectedUser = item;
    this.branchForm.user_id = String(item.user_id);
    this.branchForm.branch_id = item.branch_id ? String(item.branch_id) : '';
    this.activeDropdown = null;
    await this.getBranchList();
    this.isUpdateBranch.set(true);
  }

  async openCreateUserModal() {
    this.resetCreateUserForm();
    await this.getBranchList();
    await this.getPermissionOptions();
    this.isCreateUser.set(true);
  }

  openExportUserModal() {
    this.isExportUser.set(true);
  }

  closeExportUserModal() {
    this.isExportUser.set(false);
  }

  async openPermissionsModal(item: any) {
    this.selectedUser = item;
    this.activeDropdown = null;
    await this.getPermissionOptions(String(item.user_id));
    this.isUpdatePermissions.set(true);
  }

  openEditModal(item: any) {
    this.selectedUser = item;
    this.editUserForm = {
      user_id: String(item.user_id),
      first_name: item.first_name ?? '',
      last_name: item.last_name ?? '',
      email: item.email ?? '',
      address: item.address ?? '',
    };
    this.activeDropdown = null;
    this.isUpdateUser.set(true);
  }

  openDeleteModal(item: any) {
    this.selectedUser = item;
    this.deleteForm = {
      user_id: String(item.user_id),
      full_name: this.extras.toTitleCaseSafe(`${item.first_name ?? ''} ${item.last_name ?? ''}`.trim()),
    };
    this.activeDropdown = null;
    this.isDeleteUser.set(true);
  }

  getUserNewBranch(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.branchForm.branch_id = target.value;
    this.cd.detectChanges();
  }

  getCreateUserBranch(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.createUserForm.branch_id = target.value;
    this.cd.detectChanges();
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissionIds.includes(Number(permissionId));
  }

  togglePermission(permissionId: number) {
    const normalizedPermissionId = Number(permissionId);

    if (this.isPermissionSelected(normalizedPermissionId)) {
      this.selectedPermissionIds = this.selectedPermissionIds.filter((id) => id !== normalizedPermissionId);
    } else {
      this.selectedPermissionIds = [...this.selectedPermissionIds, normalizedPermissionId];
    }
  }

  isCreatePermissionSelected(permissionId: number): boolean {
    return this.createSelectedPermissionIds.includes(Number(permissionId));
  }

  toggleCreatePermission(permissionId: number) {
    const normalizedPermissionId = Number(permissionId);

    if (this.isCreatePermissionSelected(normalizedPermissionId)) {
      this.createSelectedPermissionIds = this.createSelectedPermissionIds.filter((id) => id !== normalizedPermissionId);
    } else {
      this.createSelectedPermissionIds = [...this.createSelectedPermissionIds, normalizedPermissionId];
    }
  }

  async updateUserStatus(id: string, status: string) {
    const endpoint = `user/update-status/${id}/${status}`;
    try {
      const res = await this.userService.postUser(endpoint, {}, this.userData.token);
      if (res.status === 200) {
        this.isUpdateStatus.set(false);
        await this.getUser();
        this.extras.showToast('User status updated successfully', 'success');
      } else {
        this.isUpdateStatus.set(false);
        this.extras.showToast('User status update failed', 'warning');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('User status update failed', 'warning');
    }
  }

  async updateUserBranch(id: string, branchId: string) {
    const endpoint = `user/update-branch/${id}/${branchId}`;
    try {
      const res = await this.userService.postUser(endpoint, {}, this.userData.token);
      if (res.status === 200) {
        this.isUpdateBranch.set(false);
        await this.getUser();
        this.extras.showToast('User branch updated successfully', 'success');
      } else {
        this.isUpdateBranch.set(false);
        this.extras.showToast('User branch update failed', 'warning');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('User branch update failed', 'warning');
    }
  }

  async updateUserPermissions() {
    try {
      const payload = {
        permission_ids: this.selectedPermissionIds.map((id) => Number(id)),
      };

      const res = await this.userService.putUser(
        `user/${this.selectedUser.user_id}/permissions`,
        payload,
        this.userData.token
      );

      if (res.status === 200) {
        this.isUpdatePermissions.set(false);
        await this.getUser();
        this.extras.showToast('User permissions updated successfully', 'success');
      } else {
        this.extras.showToast('User permissions update failed', 'warning');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('User permissions update failed', 'warning');
    }
  }

  async updateUserProfile() {
    try {
      const payload = {
        first_name: this.editUserForm.first_name.trim(),
        last_name: this.editUserForm.last_name.trim(),
        email: this.editUserForm.email.trim(),
        address: this.editUserForm.address.trim(),
      };

      const res = await this.userService.putUser(
        `user/${this.editUserForm.user_id}`,
        payload,
        this.userData.token
      );

      if (res.status === 200) {
        this.isUpdateUser.set(false);
        await this.getUser();
        this.extras.showToast('User details updated successfully', 'success');
      } else {
        this.extras.showToast('User details update failed', 'warning');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('User details update failed', 'warning');
    }
  }

  async deleteUser(userId: string) {
    try {
      const res = await this.userService.deleteUser(`user/${userId}`, '', this.userData.token);
      if (res.status === 200) {
        this.isDeleteUser.set(false);
        await this.getUser();
        this.extras.showToast('User deleted successfully', 'success');
      } else {
        this.extras.showToast('User delete failed', 'warning');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('User delete failed', 'warning');
    }
  }

  async createUser() {
    const payload = {
      first_name: this.createUserForm.first_name.trim(),
      last_name: this.createUserForm.last_name.trim(),
      email: this.createUserForm.email.trim(),
      address: this.createUserForm.address.trim(),
      password: this.createUserForm.password,
      password_confirmation: this.createUserForm.password_confirmation,
      role: this.createUserForm.role,
      branch_id: Number(this.createUserForm.branch_id),
      permission_ids: this.createSelectedPermissionIds.map((id) => Number(id)),
    };

    if (
      !payload.first_name ||
      !payload.last_name ||
      !payload.email ||
      !payload.address ||
      !payload.password ||
      !payload.password_confirmation ||
      !payload.role ||
      !payload.branch_id
    ) {
      this.extras.showToast('Please complete all required fields.', 'warning');
      return;
    }

    if (payload.password.length < 8) {
      this.extras.showToast('Password must be at least 8 characters.', 'warning');
      return;
    }

    if (payload.password !== payload.password_confirmation) {
      this.extras.showToast('Password confirmation does not match.', 'warning');
      return;
    }

    try {
      const res = await this.userService.postUser('user', payload, this.userData.token);

      if (res.status === 201 || res.status === 200) {
        this.isCreateUser.set(false);
        this.resetCreateUserForm();
        await this.getUser();
        this.extras.showToast('User created successfully', 'success');
      } else {
        this.extras.showToast(res.data?.message ?? 'User creation failed', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'User creation failed', 'warning');
    }
  }

  async exportUsersCsv() {
    const selectedColumns = this.exportUserConfig.columns.filter((column) => column.checked);

    if (!selectedColumns.length) {
      this.extras.showToast('Please select at least one field to include.', 'warning');
      return;
    }

    try {
      const res = await this.userService.getUser(this.buildExportQuery(), '', this.userData.token);
      const users = res?.data?.data ?? [];

      if (!users.length) {
        this.extras.showToast('No user records available for export.', 'warning');
        return;
      }

      const rows = users.map((item: any) => this.mapUserExportRow(item, selectedColumns.map((column) => column.key)));
      this.downloadCsv('users-report.csv', rows);
      this.closeExportUserModal();
      this.extras.showToast('User CSV exported successfully', 'success');
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to export users CSV.', 'warning');
    }
  }

  resetCreateUserForm() {
    this.createUserForm = {
      first_name: '',
      last_name: '',
      email: '',
      address: '',
      password: '',
      password_confirmation: '',
      role: 'staff',
      branch_id: '',
    };
    this.createSelectedPermissionIds = [];
  }

  private mapUserExportRow(item: any, selectedKeys: string[]) {
    const fullRow: Record<string, unknown> = {
      full_name: this.extras.toTitleCaseSafe(`${item?.first_name ?? ''} ${item?.last_name ?? ''}`.trim()),
      email: item?.email ?? '',
      role: this.extras.formatRole(item?.role ?? ''),
      status: this.extras.toTitleCaseSafe(item?.status ?? ''),
      branch_name: item?.branch_name ?? '',
      branch_address: item?.branch_address ?? '',
      address: item?.address ?? '',
      permissions: (item?.permissions ?? []).map((permission: any) => permission?.permission_name).filter(Boolean).join(', '),
      created_at: item?.created_at ? this.extras.formatDateWithTime(item.created_at) : '',
      login_at: item?.login_at ? this.extras.formatDateWithTime(item.login_at) : 'Not yet logged in',
    };

    return selectedKeys.reduce((acc, key) => {
      acc[key] = fullRow[key] ?? '';
      return acc;
    }, {} as Record<string, unknown>);
  }

  private downloadCsv(filename: string, rows: Record<string, unknown>[]) {
    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => this.escapeCsvValue(row[header])).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvValue(value: unknown) {
    const normalized = value == null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  getRows() {
    if (!this.userData.userData?.data) return Array(10).fill(null);
    const arr = [...this.userData.userData.data];

    while (arr.length < 6) {
      arr.push(null);
    }
    return arr;
  }
}
