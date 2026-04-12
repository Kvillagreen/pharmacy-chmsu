import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Extras } from '../../../../extras/extras';
import { AdminCompaniesData } from '../../../../models/AdminModel';
import { AppButton } from '../../../shared/ui/button/button';
import { AppModal } from '../../../shared/ui/modal/modal';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, AppButton, AppModal],
  templateUrl: './admin-companies.html',
})
export class AdminCompanies implements OnInit {
  extras = Extras;
  token = '';
  isLoading = false;
  loadError = '';
  isCreateCompany = signal(false);
  isCreateBranch = signal(false);
  isDeleteCompany = signal(false);
  isDeleteBranch = signal(false);
  companies: AdminCompaniesData = { data: [] };
  companyForm = { company_name: '', company_email: '', tin_number: '' };
  branchForm = { company_id: '', branch_name: '', branch_address: '', branch_contact: '', status: 'active' };
  deleteCompanyValidation: any = null;
  deleteBranchValidation: any = null;
  deleteCompanyForm = { company_id: 0, confirmation_name: '' };
  deleteBranchForm = { branch_id: 0, confirmation_name: '' };
  currentPage = 1;
  pageSize = 6;

  constructor(private userService: UserService, private encryptData: EncryptData, private cd: ChangeDetectorRef) {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
  }
  ngOnInit(): void {
    this.load();
  }
  async load() {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
    this.isLoading = true;
    this.loadError = '';

    if (!this.token) {
      this.companies = { data: [] };
      this.isLoading = false;
      this.loadError = 'Your super admin session was not found. Please sign in again.';
      this.extras.showToast(this.loadError, 'warning');
      return;
    }

    try {
      const res = await this.userService.getUser('admin/companies', '', this.token);
      if (res.status === 200 && res.data?.success !== false) {
        this.companies = {
          ...res.data,
          data: this.normalizeCompanies(res.data?.data),
        };
        this.loadError = '';
        this.currentPage = 1;
        this.cd.detectChanges();
      } else {
        this.companies = { data: [] };
        this.loadError = res.data?.message ?? 'Failed to load companies.';
        this.extras.showToast(this.loadError, 'warning');
      }
    } catch (e) {
      console.log(e);
      this.companies = { data: [] };
      this.loadError = this.extractErrorMessage(e, 'Failed to load companies.');
      this.extras.showToast(this.loadError, 'warning');
    } finally {
      this.isLoading = false;
    }
  }

  private normalizeCompanies(data: unknown): any[] {
    if (!Array.isArray(data) && !Array.isArray((data as any)?.data)) {
      return [];
    }

    const items = Array.isArray(data) ? data : (data as any).data;

    return items
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        company_id: Number(item.company_id ?? 0),
        company_name: item.company_name ?? '',
        company_email: item.company_email ?? '',
        tin_number: item.tin_number ?? '',
        branches_count: Number(item.branches_count ?? 0),
        admins_count: Number(item.admins_count ?? 0),
        branches: this.normalizeBranches(item.branches),
      }));
  }

  private normalizeBranches(data: unknown): any[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        branch_id: Number(item.branch_id ?? 0),
        branch_name: item.branch_name ?? '',
        branch_address: item.branch_address ?? '',
        branch_contact: item.branch_contact ?? '',
        status: item.status ?? '',
      }));
  }

  private extractErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.message
      ?? error?.message
      ?? fallback;
  }

  get companyItems() {
    return this.normalizeCompanies(this.companies?.data);
  }

  get paginatedCompanies() {
    const items = this.companyItems;
    const start = (this.currentPage - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  get totalCompanyPages() {
    const total = this.companyItems.length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get companyPageNumbers() {
    return Array.from({ length: this.totalCompanyPages }, (_, index) => index + 1);
  }

  setCompanyPage(page: number) {
    if (page >= 1 && page <= this.totalCompanyPages) {
      this.currentPage = page;
    }
  }

  async createCompany() {
    try {
      const res = await this.userService.postUser('admin/companies', this.companyForm, this.token);
      if (res.status === 201 || res.status === 200) {
        this.companyForm = { company_name: '', company_email: '', tin_number: '' };
        this.isCreateCompany.set(false);
        await this.load();
        this.extras.showToast('Company created successfully', 'success');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to create company.', 'warning');
    }
  }

  openBranchModal(companyId?: number) {
    this.branchForm = { company_id: companyId ? String(companyId) : '', branch_name: '', branch_address: '', branch_contact: '', status: 'active' };
    this.isCreateBranch.set(true);
  }

  async createBranch() {
    try {
      const payload = { ...this.branchForm, company_id: Number(this.branchForm.company_id) };
      const res = await this.userService.postUser('admin/branches', payload, this.token);
      if (res.status === 201 || res.status === 200) {
        this.isCreateBranch.set(false);
        await this.load();
        this.extras.showToast('Branch created successfully', 'success');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to create branch.', 'warning');
    }
  }

  async openDeleteCompanyModal(company: any) {
    try {
      this.deleteCompanyForm = { company_id: Number(company.company_id), confirmation_name: '' };
      const res = await this.userService.getUser(`admin/companies/${company.company_id}/validate-delete`, '', this.token);
      if (res.status === 200) {
        this.deleteCompanyValidation = res.data.data;
        this.isDeleteCompany.set(true);
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to validate company deletion.', 'warning');
    }
  }

  async openDeleteBranchModal(branch: any) {
    try {
      this.deleteBranchForm = { branch_id: Number(branch.branch_id), confirmation_name: '' };
      const res = await this.userService.getUser(`admin/branches/${branch.branch_id}/validate-delete`, '', this.token);
      if (res.status === 200) {
        this.deleteBranchValidation = res.data.data;
        this.isDeleteBranch.set(true);
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to validate branch deletion.', 'warning');
    }
  }

  canDeleteCompany() {
    return this.deleteCompanyValidation?.company_name === this.deleteCompanyForm.confirmation_name.trim();
  }

  canDeleteBranch() {
    return this.deleteBranchValidation?.branch_name === this.deleteBranchForm.confirmation_name.trim();
  }

  closeDeleteCompanyModal() {
    this.isDeleteCompany.set(false);
    this.deleteCompanyValidation = null;
    this.deleteCompanyForm = { company_id: 0, confirmation_name: '' };
  }

  closeDeleteBranchModal() {
    this.isDeleteBranch.set(false);
    this.deleteBranchValidation = null;
    this.deleteBranchForm = { branch_id: 0, confirmation_name: '' };
  }

  async deleteCompany() {
    if (!this.canDeleteCompany()) {
      this.extras.showToast('Type the exact company name before deleting.', 'warning');
      return;
    }

    try {
      const res = await this.userService.postUser(
        `admin/companies/${this.deleteCompanyForm.company_id}/delete`,
        { confirmation_name: this.deleteCompanyForm.confirmation_name.trim() },
        this.token
      );

      if (res.status === 200 && res.data.success) {
        this.closeDeleteCompanyModal();
        await this.load();
        this.extras.showToast('Company deleted successfully.', 'success');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to delete company.', 'warning');
    }
  }

  async deleteBranch() {
    if (!this.canDeleteBranch()) {
      this.extras.showToast('Type the exact branch name before deleting.', 'warning');
      return;
    }

    try {
      const res = await this.userService.postUser(
        `admin/branches/${this.deleteBranchForm.branch_id}/delete`,
        { confirmation_name: this.deleteBranchForm.confirmation_name.trim() },
        this.token
      );

      if (res.status === 200 && res.data.success) {
        this.closeDeleteBranchModal();
        await this.load();
        this.extras.showToast('Branch deleted successfully.', 'success');
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to delete branch.', 'warning');
    }
  }
}
