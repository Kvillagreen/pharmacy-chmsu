import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { AdminApprovalsData } from '../../../../models/AdminModel';
import { Extras } from '../../../../extras/extras';

@Component({
  selector: 'app-admin-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-approvals.html',
})
export class AdminApprovals {
  extras = Extras;
  token = '';
  data: AdminApprovalsData = { data: [] };
  currentPage = 1;
  pageSize = 5;

  constructor(private userService: UserService, private encryptData: EncryptData, private cd: ChangeDetectorRef) {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
    this.load();
  }

  async load() {
    const res = await this.userService.getUser('admin/approvals/admins', '', this.token);
    if (res.status === 200) {
      this.data = res.data;
      this.currentPage = 1;
      this.cd.detectChanges();
    }
  }

  get paginatedApprovals() {
    const items = this.data.data ?? [];
    const start = (this.currentPage - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  get totalApprovalPages() {
    const total = this.data.data?.length ?? 0;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get approvalPageNumbers() {
    return Array.from({ length: this.totalApprovalPages }, (_, index) => index + 1);
  }

  setApprovalPage(page: number) {
    if (page >= 1 && page <= this.totalApprovalPages) {
      this.currentPage = page;
    }
  }

  async updateStatus(id: number, status: 'approved' | 'rejected') {
    const res = await this.userService.postUser(`admin/approvals/admins/${id}/${status}`, {}, this.token);
    if (res.status === 200) {
      await this.load();
      this.extras.showToast(`Admin ${status} successfully`, 'success');
    }
  }
}
