import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { CommonModule } from '@angular/common';
import { MedicineData } from '../../../../models/MedicineModel';
import { signal } from '@angular/core';
import { UserData } from '../../../../models/UserModel';
import { Extras } from '../../../../extras/extras';
import { IonIcon } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-fefo',
  imports: [CommonModule, IonIcon, FormsModule],
  templateUrl: './fefo.html',
  styleUrl: './fefo.css',
})
export class Fefo implements OnInit {
  constructor(private encryptData: EncryptData, private userService: UserService, private cd: ChangeDetectorRef) { }
  medicineData: MedicineData = {

  }
  isLoading = true;
  hasLoaded = false;

  pageNumber: number = 1;
  sort: string = '';
  searchQuery: string = '';
  extras = Extras;
  isCreate = signal(false);
  isUpdate = signal(false);
  isDelete = signal(false);
  isExportModalOpen = signal(false);
  isLocationModalOpen = signal(false);
  isPullOutModalOpen = signal(false);
  userData: UserData = {
    token: '',
    data: []
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
      { key: 'batch_id', label: 'Batch Number', checked: true },
      { key: 'stocks', label: 'Stocks', checked: true },
      { key: 'location', label: 'Location', checked: true },
      { key: 'received_date', label: 'Received Date', checked: true },
      { key: 'mfg_date', label: 'Manufacturing Date', checked: true },
      { key: 'expiry_date', label: 'Expiry Date', checked: true },
      { key: 'expiry_status', label: 'FEFO Status', checked: true },
      { key: 'days_until_expiry', label: 'Days Until Expiry', checked: true },
    ],
  };
  endpoint: string = 'fefo';
  selectedBatch: any = null;
  locationForm = {
    batch_id: 0,
    location: '',
  };
  ngOnInit(): void {
    this.userData.data= this.encryptData.decryptData('user')
    this.getMedicine()
  }
  buildQuery(): string {
    let params: string[] = [];
    let selectedBranch: number = 0;
    let data = this.encryptData.decryptData('branch');
    if (data.selectedBranch) {
      selectedBranch = Number(this.encryptData.decryptData('branch').selectedBranch);
    }

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
    return this.endpoint + '?company_id=' + this.userData.data.data.company_id + '&per_page=10&' + params.join('&');
  }


  async getMedicine() {
    this.isLoading = true;
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, '', this.encryptData.decryptData('user').token);
      if (res.status === 200) {
        this.medicineData.data = res.data;
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
    } finally {
      this.isLoading = false;
      this.hasLoaded = true;
      this.cd.detectChanges();
    }
  }


  // Next page pagination
  next() {
    if (this.pageNumber < this.medicineData.data.meta.last_page) {
      this.pageNumber++;
      this.getMedicine();
    }
  }

  // Prev page pagination
  prev() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.getMedicine();
    }
  }

  filter(sortValue: string) {
    this.sort = sortValue; // "sort=price" OR "sort=-price"
    this.pageNumber = 1;   // reset page
    this.getMedicine();
  }

  getSortValue(field: string, descending = false) {
    return `sort=${descending ? '-' : ''}${field}`;
  }

  isSortActive(field: string, descending = false) {
    return this.sort === this.getSortValue(field, descending);
  }

  openExportModal() {
    this.isExportModalOpen.set(true);
  }

  closeExportModal() {
    this.isExportModalOpen.set(false);
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
      const endpoint = this.buildExportQuery();
      const res = await this.userService.getUser(endpoint, '', this.encryptData.decryptData('user').token);
      const items = res?.data?.data ?? [];

      if (!items.length) {
        Extras.showToast('No expiry records found for the selected date range.', 'warning');
        return;
      }

      const rows = items.map((item: any) => this.mapFefoExportRow(item, selectedColumns.map((column) => column.key)));
      this.downloadCsv('fefo-expiry-list.csv', rows);
      this.closeExportModal();
    } catch (e) {
      console.log(e);
      Extras.showToast('Failed to export FEFO CSV.', 'danger');
    }
  }


  changeText(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.trim();
    this.pageNumber = 1;
    this.getMedicine();
  }

  getRows() {
    if (!this.medicineData.data?.data) return Array(10).fill(null);
    const arr = [...this.medicineData.data.data]; // copy actual data

    // Fill remaining with nulls until length = 10
    while (arr.length < 10) {
      arr.push(null);
    }
    return arr;
  }

  private buildExportQuery() {
    let params: string[] = ['export=1'];
    let selectedBranch = 0;
    const data = this.encryptData.decryptData('branch');

    if (data.selectedBranch) {
      selectedBranch = Number(data.selectedBranch);
    }

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

  expiryStatus(expiryDate: string | undefined | null) {
    const days = Extras.computeDaysUntilExpiration(String(expiryDate));

    if (days <= 0) {
      return 'Expired';
    }
    if (days <= 30) {
      return 'Critical';
    }
    if (days <= 90) {
      return 'Warning';
    }
    return 'Good';
  }

  expiryDaysLabel(expiryDate: string | undefined | null) {
    const days = Extras.computeDaysUntilExpiration(String(expiryDate));

    if (days <= 0) {
      return `${Math.abs(days)} day(s) ago`;
    }

    return `${days} day(s)`;
  }

  private mapFefoExportRow(item: any, selectedKeys: string[]) {
    const fullRow: Record<string, unknown> = {
      medicine_id: item?.medicine_id ?? '',
      medicine_name: item?.medicine_name ?? '',
      generic_name: item?.generic_name ?? '',
      category: item?.category ?? '',
      type: item?.type ?? '',
      dosage: item?.dosage ?? '',
      unit: item?.unit ?? '',
      batch_id: item?.batch_id ?? '',
      stocks: item?.stocks ?? '',
      location: item?.location ?? '',
      received_date: item?.received_date ?? '',
      mfg_date: item?.mfg_date ?? '',
      expiry_date: item?.expiry_date ?? '',
      expiry_status: this.expiryStatus(item?.expiry_date),
      days_until_expiry: this.expiryDaysLabel(item?.expiry_date),
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

    Extras.showToast('FEFO expiry CSV exported successfully.', 'success');
  }

  private escapeCsvValue(value: unknown) {
    const normalized = value == null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  openLocationModal(item: any) {
    if (!item?.batch_id) {
      Extras.showToast('This batch has no location record to update.', 'warning');
      return;
    }

    this.selectedBatch = item;
    this.locationForm = {
      batch_id: Number(item.batch_id),
      location: String(item.location ?? '').trim(),
    };
    this.isLocationModalOpen.set(true);
  }

  closeLocationModal() {
    this.isLocationModalOpen.set(false);
    this.selectedBatch = null;
    this.locationForm = { batch_id: 0, location: '' };
  }

  openPullOutModal(item: any) {
    if (!item?.batch_id) {
      Extras.showToast('This batch cannot be pulled out.', 'warning');
      return;
    }

    this.selectedBatch = item;
    this.isPullOutModalOpen.set(true);
  }

  closePullOutModal() {
    this.isPullOutModalOpen.set(false);
    this.selectedBatch = null;
  }

  async submitLocationUpdate() {
    const location = this.locationForm.location.trim();
    if (!this.locationForm.batch_id || !location) {
      Extras.showToast('Please enter a valid location.', 'warning');
      return;
    }

    try {
      const res = await this.userService.postUser(
        `fefo/${this.locationForm.batch_id}/update-location`,
        { location },
        this.encryptData.decryptData('user').token
      );

      if (res.status === 200 && res.data.success) {
        Extras.showToast('Batch location updated successfully.', 'success');
        this.closeLocationModal();
        this.getMedicine();
      }
    } catch (e) {
      console.log(e);
      Extras.showToast('Failed to update batch location.', 'danger');
    }
  }

  async confirmPullOut() {
    if (!this.selectedBatch?.batch_id) {
      Extras.showToast('This batch cannot be pulled out.', 'warning');
      return;
    }

    try {
      const res = await this.userService.postUser(
        `fefo/${this.selectedBatch.batch_id}/pull-out`,
        {},
        this.encryptData.decryptData('user').token
      );

      if (res.status === 200 && res.data.success) {
        Extras.showToast('Expired batch pulled out successfully.', 'success');
        this.closePullOutModal();
        this.getMedicine();
      }
    } catch (e) {
      console.log(e);
      Extras.showToast('Failed to pull out expired batch.', 'danger');
    }
  }
}
