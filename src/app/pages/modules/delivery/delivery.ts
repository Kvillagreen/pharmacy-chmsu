import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Extras } from '../../../../extras/extras';
import { UserData } from '../../../../models/UserModel';
import { UserService } from '../../../../services/services';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './delivery.html',
  styleUrl: './delivery.css',
})
export class Delivery implements OnInit {
  extras = Extras;
  isLoading = signal(false);
  isResolving = signal<number | null>(null);

  userData: UserData = {
    data: [],
    token: '',
  };

  transferData: { data: any[] } = {
    data: [],
  };

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) {}

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

  loadData() {
    const storedUser = this.encryptData.decryptData('user');
    const payload = this.getStoredUserPayload();

    if (!storedUser?.token || !payload) {
      return;
    }

    this.userData.token = storedUser.token;
    this.userData.data = payload;
    this.getTransfers();
  }

  getSelectedBranchId(): number {
    const storedBranch = this.encryptData.decryptData('branch');
    const selectedBranch = Number(storedBranch?.selectedBranch ?? 0);

    if (selectedBranch > 0) {
      return selectedBranch;
    }

    return Number(this.userData.data?.branch_id ?? 0);
  }

  async getTransfers() {
    this.isLoading.set(true);

    try {
      const companyId = Number(this.userData.data?.company_id ?? 0);
      const branchId = this.getSelectedBranchId();
      const endpoint = `inventory-transfer?company_id=${companyId}&branch_id=${branchId}`;
      const res = await this.userService.getUser(endpoint, '', this.userData.token);

      if (res.status === 200) {
        this.transferData.data = Array.isArray(res.data?.data) ? res.data.data : [];
      } else {
        this.transferData.data = [];
      }
    } catch (e) {
      console.log(e);
      this.transferData.data = [];
      this.extras.showToast('Unable to load delivery transfers.', 'warning');
    } finally {
      this.isLoading.set(false);
      this.cd.detectChanges();
    }
  }

  get incomingTransfers(): any[] {
    const branchId = this.getSelectedBranchId();

    return (this.transferData.data ?? []).filter((transfer: any) => Number(transfer?.to_branch_id) === branchId);
  }

  get pendingTransfers(): any[] {
    return this.incomingTransfers.filter((transfer: any) => String(transfer?.status ?? '').toLowerCase() === 'pending');
  }

  get resolvedTransfers(): any[] {
    return this.incomingTransfers.filter((transfer: any) => String(transfer?.status ?? '').toLowerCase() !== 'pending');
  }

  get acceptedTransfersCount(): number {
    return this.resolvedTransfers.filter((transfer: any) => String(transfer?.status ?? '').toLowerCase() === 'accepted').length;
  }

  get declinedTransfersCount(): number {
    return this.resolvedTransfers.filter((transfer: any) => String(transfer?.status ?? '').toLowerCase() === 'declined').length;
  }

  canResolveTransfer(transfer: any): boolean {
    return Number(transfer?.to_branch_id ?? 0) === this.getSelectedBranchId()
      && String(transfer?.status ?? '').toLowerCase() === 'pending';
  }

  statusClass(status: string): string {
    const normalized = String(status ?? '').toLowerCase();

    if (normalized === 'accepted') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (normalized === 'declined') {
      return 'bg-red-100 text-red-700';
    }

    return 'bg-amber-100 text-amber-700';
  }

  async resolveTransfer(transfer: any, action: 'accept' | 'decline') {
    const transferId = Number(transfer?.inventory_transfer_id ?? 0);
    if (!transferId) {
      this.extras.showToast('Transfer request details are missing.', 'warning');
      return;
    }

    this.isResolving.set(transferId);

    try {
      const payload = {
        resolved_by: Number(this.userData.data?.user_id ?? 0),
      };

      const res = await this.userService.postUser(`inventory-transfer/${transferId}/${action}`, payload, this.userData.token);
      console.log(res)
      if (res.status === 200) {
        this.extras.showToast(
          action === 'accept' ? 'Transfer accepted successfully.' : 'Transfer declined successfully.',
          'success'
        );
        await this.getTransfers();
        return;
      }

      this.extras.showToast(res.data?.message ?? 'Unable to update this transfer.', 'warning');
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'Unable to update this transfer.', 'warning');
    } finally {
      this.isResolving.set(null);
      this.cd.detectChanges();
    }
  }
}
