import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { BranchData } from '../../../../models/BranchModel';
import { MedicineData } from '../../../../models/MedicineModel';
import { UserData } from '../../../../models/UserModel';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Extras } from '../../../../extras/extras';
import { UserService } from '../../../../services/services';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [IonIcon, CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory implements OnInit {
  @ViewChild('clicker') clicker!: ElementRef;

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) {}

  pageNumber = 1;
  sort = '';
  searchQuery = '';
  extras = Extras;
  isCreate = signal(false);
  isUpdate = signal(false);
  isDelete = signal(false);
  isExportModalOpen = signal(false);
  isTransfer = signal(false);
  endpoint = 'medicine';

  userData: UserData = {
    token: '',
    data: [],
  };

  branchData: BranchData = {
    data: [],
  };

  exportConfig = {
    fromDate: '',
    toDate: '',
    columns: [
      { key: 'medicine_id', label: 'Product ID', checked: true },
      { key: 'medicine_name', label: 'Brand Name', checked: true },
      { key: 'generic_name', label: 'Generic Name', checked: true },
      { key: 'category', label: 'Category', checked: true },
      { key: 'type', label: 'Type', checked: true },
      { key: 'dosage', label: 'Dosage', checked: true },
      { key: 'unit', label: 'Unit', checked: true },
      { key: 'price', label: 'Unit Price', checked: true },
      { key: 'stocks', label: 'Stocks', checked: true },
      { key: 'reorder_level', label: 'Minimum Stocks', checked: true },
      { key: 'location', label: 'Location', checked: true },
      { key: 'received_date', label: 'Received Date', checked: true },
      { key: 'expiry_date', label: 'Expiry Date', checked: true },
      { key: 'mfg_date', label: 'Manufacturing Date', checked: true },
      { key: 'needs_protection', label: 'Prescription', checked: true },
      { key: 'is_dangerous', label: 'Dangerous', checked: true },
      { key: 'is_yakap_eligible', label: 'Yakap Eligible', checked: true },
    ],
  };

  transferForm = {
    inventory_id: 0,
    to_branch_id: '',
    quantity: 1,
    notes: '',
    confirmed: false,
  };

  medicineData: MedicineData = {
    data: [],
    selectedData: [],
    inputData: {
      is_dangerous: false,
      is_yakap_eligible: false,
      needs_protection: false,
    },
  };

  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.initializeFlags();
    this.getMedicine();
  }

  initializeFlags() {
    this.medicineData.data.needs_protection = Boolean(this.medicineData.data?.needs_protection) === true;
    this.medicineData.inputData.is_dangerous = Boolean(this.medicineData.inputData?.is_dangerous) === true;
    this.medicineData.inputData.is_yakap_eligible = Boolean(this.medicineData.inputData?.is_yakap_eligible) === true;
    this.cd.detectChanges();
  }

  changeText(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.trim();
    this.pageNumber = 1;
    this.getMedicine();
  }

  buildQuery(): string {
    const params: string[] = [];
    const selectedBranch = this.getSelectedBranchId();

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

    return `${this.endpoint}?company_id=${this.userData.data.data.company_id}&per_page=10&${params.join('&')}`;
  }

  getSelectedBranchId(): number {
    const storedBranch = this.encryptData.decryptData('branch');
    return Number(storedBranch?.selectedBranch ?? this.userData.data?.data?.branch_id ?? 0);
  }

  getAssignedBranchId(): number {
    return Number(this.userData.data?.data?.branch_id ?? 0);
  }

  async getMedicine() {
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        this.medicineData.data = res.data;
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
    }
  }

  async getBranchList() {
    try {
      const res = await this.userService.getUser(`branch/${this.userData.data.data.company_id}`, '', this.userData.token);
      if (res.status === 200) {
        const currentBranchId = this.getAssignedBranchId();
        this.branchData.data = (res.data.data.branches ?? []).filter((branch: any) => Number(branch.branchId) !== currentBranchId);
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  trigger() {
    this.clicker.nativeElement.click();
  }

  next() {
    if (this.pageNumber < this.medicineData.data.meta.last_page) {
      this.pageNumber++;
      this.getMedicine();
    }
  }

  prev() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.getMedicine();
    }
  }

  filter(sortValue: string) {
    this.sort = sortValue;
    this.pageNumber = 1;
    this.getMedicine();
  }

  openExportModal() {
    this.isExportModalOpen.set(true);
  }

  closeExportModal() {
    this.isExportModalOpen.set(false);
  }

  async mergeDuplicateMedicines() {
    try {
      const payload = {
        company_id: Number(this.userData.data?.data?.company_id ?? 0),
        branch_id: this.getSelectedBranchId(),
      };

      const res = await this.userService.postUser('medicine/merge-duplicates', payload, this.userData.token);
      if (res.status === 200 && res.data?.success) {
        Extras.showToast(res.data?.message ?? 'Duplicate medicines merged successfully.', 'success');
        await this.getMedicine();
        return;
      }

      Extras.showToast(res.data?.message ?? 'Failed to merge duplicate medicines.', 'warning');
    } catch (e: any) {
      console.log(e);
      Extras.showToast(e?.error?.message ?? 'Failed to merge duplicate medicines.', 'danger');
    }
  }

  async exportCsv() {
    if (!this.exportConfig.fromDate || !this.exportConfig.toDate) {
      Extras.showToast('Please select a from date and to date.', 'warning');
      return;
    }

    if (this.exportConfig.fromDate > this.exportConfig.toDate) {
      Extras.showToast('The from date must be earlier than or equal to the to date.', 'warning');
      return;
    }

    const selectedColumns = this.exportConfig.columns.filter((column) => column.checked);
    if (!selectedColumns.length) {
      Extras.showToast('Please select at least one field to include.', 'warning');
      return;
    }

    try {
      const res = await this.userService.getUser(this.buildExportQuery(), '', this.userData.token);
      const medicines = res?.data?.data ?? [];

      if (!medicines.length) {
        Extras.showToast('No inventory records found for the selected date range.', 'warning');
        return;
      }

      const rows = medicines.map((item: any) => this.mapInventoryExportRow(item, selectedColumns.map((column) => column.key)));
      this.downloadCsv('inventory-medicines.csv', rows);
      this.closeExportModal();
    } catch (e) {
      console.log(e);
      Extras.showToast('Failed to export inventory CSV.', 'danger');
    }
  }

  toggleRx() {
    if (!this.medicineData.inputData) this.medicineData.inputData = {};
    this.medicineData.inputData.needs_protection = this.medicineData.inputData.needs_protection ? 0 : 1;
    this.cd.detectChanges();
  }

  toggleDanger() {
    if (!this.medicineData.inputData) this.medicineData.inputData = {};
    this.medicineData.inputData.is_dangerous = this.medicineData.inputData.is_dangerous ? 0 : 1;
  }

  toggleYakapEligible() {
    if (!this.medicineData.inputData) this.medicineData.inputData = {};
    this.medicineData.inputData.is_yakap_eligible = this.medicineData.inputData.is_yakap_eligible ? 0 : 1;
  }

  async delete() {
    try {
      const res = await this.userService.deleteUser(`medicine/${this.medicineData.inputData.medicine_id}`, '', this.userData.token);
      if (res.status === 200 && res.data.success) {
        Extras.showToast('Medicine deleted successfully!', 'success');
        this.medicineData.inputData = [];
        this.isDelete.set(false);
        this.getMedicine();
        this.cd.detectChanges();
      } else {
        Extras.showToast(res.data.message, 'warning');
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async create() {
    const received = new Date(this.medicineData.inputData.received_date);
    const expiry = new Date(this.medicineData.inputData.expiry_date);

    if (this.medicineData.inputData.stocks < 0 || this.medicineData.inputData.reorder_level < 0) {
      Extras.showToast('All stocks and reorder level must be greater than or equal to zero', 'warning');
      return;
    }

    if (!this.medicineData.inputData.needs_protection) {
      this.medicineData.inputData.needs_protection = false;
    }
    if (!this.medicineData.inputData.is_dangerous) {
      this.medicineData.inputData.is_dangerous = false;
    }
    if (!this.medicineData.inputData.is_yakap_eligible) {
      this.medicineData.inputData.is_yakap_eligible = false;
    }

    if (
      !this.medicineData.inputData.generic_name ||
      !this.medicineData.inputData.medicine_name ||
      !this.medicineData.inputData.category ||
      !this.medicineData.inputData.price ||
      !this.medicineData.inputData.type ||
      !this.medicineData.inputData.dosage ||
      !this.medicineData.inputData.unit ||
      !this.medicineData.inputData.received_date ||
      !this.medicineData.inputData.expiry_date ||
      !this.medicineData.inputData.mfg_date ||
      !this.medicineData.inputData.location
    ) {
      Extras.showToast('All fields are required!', 'warning');
      return;
    }

    if (received > expiry) {
      Extras.showToast('Invalid: Received date is after expiry date', 'warning');
      return;
    }

    this.medicineData.inputData.branch_id = this.getAssignedBranchId();
    const payload = { ...this.medicineData.inputData };
    if (payload.received_date instanceof Date) {
      payload.received_date = payload.received_date.toISOString().split('T')[0];
    }
    if (payload.expiry_date instanceof Date) {
      payload.expiry_date = payload.expiry_date.toISOString().split('T')[0];
    }

    try {
      const res = await this.userService.postUser('medicine', payload, this.userData.token);
      if (res.status === 200 && res.data.success) {
        Extras.showToast('Medicine added successfully!', 'success');
        this.medicineData.inputData = [];
        this.isCreate.set(false);
        this.getMedicine();
        this.cd.detectChanges();
      } else {
        Extras.showToast(res.data.message, 'warning');
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async update() {
    const received = new Date(this.medicineData.inputData.received_date);
    const expiry = new Date(this.medicineData.inputData.expiry_date);

    if (this.medicineData.inputData.stocks < 0 || this.medicineData.inputData.reorder_level < 0) {
      Extras.showToast('All stocks and reorder level must be greater than or equal to zero', 'warning');
      return;
    }

    if (
      !this.medicineData.inputData.generic_name ||
      !this.medicineData.inputData.medicine_name ||
      !this.medicineData.inputData.category ||
      !this.medicineData.inputData.price ||
      !this.medicineData.inputData.type ||
      !this.medicineData.inputData.dosage ||
      !this.medicineData.inputData.unit ||
      !this.medicineData.inputData.received_date ||
      !this.medicineData.inputData.expiry_date ||
      !this.medicineData.inputData.mfg_date ||
      !this.medicineData.inputData.location
    ) {
      Extras.showToast('All fields are required!', 'warning');
      return;
    }

    if (received > expiry) {
      Extras.showToast('Invalid: Received date is after expiry date', 'warning');
      return;
    }

    this.medicineData.inputData.branch_id = this.getAssignedBranchId();
    const payload = { ...this.medicineData.inputData };
    if (payload.received_date instanceof Date) {
      payload.received_date = payload.received_date.toISOString().split('T')[0];
    }
    if (payload.expiry_date instanceof Date) {
      payload.expiry_date = payload.expiry_date.toISOString().split('T')[0];
    }

    try {
      const res = await this.userService.putUser(`medicine/${this.medicineData.inputData.medicine_id}`, payload, this.userData.token);
      if (res.status === 200 && res.data.success) {
        Extras.showToast('Medicine updated successfully!', 'success');
        this.isUpdate.set(false);
        this.getMedicine();
        this.cd.detectChanges();
      } else {
        Extras.showToast(res.data.message, 'warning');
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async openTransferModal(item: any) {
    this.medicineData.inputData = item;
    this.transferForm = {
      inventory_id: Number(item?.inventory_id ?? 0),
      to_branch_id: '',
      quantity: 1,
      notes: '',
      confirmed: false,
    };
    await this.getBranchList();
    this.isTransfer.set(true);
  }

  async submitTransfer() {
    if (!this.transferForm.inventory_id || !this.transferForm.to_branch_id || this.transferForm.quantity <= 0) {
      Extras.showToast('Please complete the transfer details.', 'warning');
      return;
    }

    if (!this.transferForm.confirmed) {
      Extras.showToast('Please confirm this transfer before sending it.', 'warning');
      return;
    }

    if (Number(this.transferForm.quantity) > Number(this.medicineData.inputData?.stocks ?? 0)) {
      Extras.showToast('Transfer quantity cannot exceed available stock.', 'warning');
      return;
    }

    try {
      const payload = {
        inventory_id: this.transferForm.inventory_id,
        to_branch_id: Number(this.transferForm.to_branch_id),
        requested_by: Number(this.userData.data.data.user_id),
        quantity: Number(this.transferForm.quantity),
        notes: this.transferForm.notes?.trim() || null,
        confirmed: this.transferForm.confirmed,
      };

      const res = await this.userService.postUser('inventory-transfer', payload, this.userData.token);
      if (res.status === 201 || res.status === 200) {
        this.isTransfer.set(false);
        Extras.showToast('Transfer request sent successfully.', 'success');
      } else {
        Extras.showToast(res.data?.message ?? 'Failed to send transfer request.', 'warning');
      }
    } catch (e: any) {
      console.log(e);
      Extras.showToast(e?.error?.message ?? 'Failed to send transfer request.', 'danger');
    }
  }

  getRows() {
    if (!this.medicineData.data?.data) return Array(10).fill(null);
    const arr = [...this.medicineData.data.data];

    while (arr.length < 10) {
      arr.push(null);
    }
    return arr;
  }

  private buildExportQuery() {
    const params: string[] = ['export=1'];
    const selectedBranch = this.getSelectedBranchId();

    params.push(`company_id=${this.userData.data.data.company_id}`);
    params.push(`from_date=${encodeURIComponent(this.exportConfig.fromDate)}`);
    params.push(`to_date=${encodeURIComponent(this.exportConfig.toDate)}`);

    if (selectedBranch) {
      params.push(`branch_id=${selectedBranch}`);
    }
    if (this.searchQuery) {
      params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    }
    if (this.sort) {
      params.push(this.sort);
    }

    return `${this.endpoint}?${params.join('&')}`;
  }

  private mapInventoryExportRow(item: any, selectedKeys: string[]) {
    const fullRow: Record<string, unknown> = {
      medicine_id: item?.medicine_id ?? '',
      medicine_name: item?.medicine_name ?? '',
      generic_name: item?.generic_name ?? '',
      category: item?.category ?? '',
      type: item?.type ?? '',
      dosage: item?.dosage ?? '',
      unit: item?.unit ?? '',
      price: item?.price ?? '',
      stocks: item?.stocks ?? '',
      reorder_level: item?.reorder_level ?? '',
      location: item?.location ?? '',
      received_date: item?.received_date ?? '',
      expiry_date: item?.expiry_date ?? '',
      mfg_date: item?.mfg_date ?? '',
      needs_protection: item?.needs_protection ? 'Yes' : 'No',
      is_dangerous: item?.is_dangerous ? 'Yes' : 'No',
      is_yakap_eligible: item?.is_yakap_eligible ? 'Yes' : 'No',
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

    Extras.showToast('Inventory CSV exported successfully.', 'success');
  }

  private escapeCsvValue(value: unknown) {
    const normalized = value == null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  }
}
