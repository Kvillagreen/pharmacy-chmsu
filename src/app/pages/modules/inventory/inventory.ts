import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { UserService } from '../../../../services/services';
import { UserData } from '../../../../models/UserModel';
import { EncryptData } from '../../../../environment/encrypt-data';
import { CommonModule } from '@angular/common';
import { MedicineData } from '../../../../models/MedicineModel';
import { Extras } from '../../../../extras/extras';
import { FormsModule } from "@angular/forms";
import { ViewChild, ElementRef } from '@angular/core';

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
  ) { }

  pageNumber: number = 1;
  sort: string = '';
  searchQuery: string = '';
  extras = Extras;
  isCreate = signal(false);
  isUpdate = signal(false);
  isDelete = signal(false);
  isExportModalOpen = signal(false);
  endpoint: string = 'medicine';
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
      { key: 'price', label: 'Unit Price', checked: true },
      { key: 'stocks', label: 'Stocks', checked: true },
      { key: 'reorder_level', label: 'Minimum Stocks', checked: true },
      { key: 'location', label: 'Location', checked: true },
      { key: 'received_date', label: 'Received Date', checked: true },
      { key: 'expiry_date', label: 'Expiry Date', checked: true },
      { key: 'mfg_date', label: 'Manufacturing Date', checked: true },
      { key: 'supplier_name', label: 'Supplier Company', checked: true },
      { key: 'supplier_contact', label: 'Supplier Contact Person', checked: true },
      { key: 'contact_number', label: 'Contact Number', checked: true },
      { key: 'address', label: 'Supplier Address', checked: true },
      { key: 'needs_protection', label: 'Prescription', checked: true },
      { key: 'is_dangerous', label: 'Dangerous', checked: true },
    ],
  };

  medicineData: MedicineData = {
    data: [],
    selectedData: [],
    inputData: {
      'is_dangerous': false,
      'needs_protection': false,
    }
  }

  changeText(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.trim();
    this.pageNumber = 1;
    this.getMedicine();
  }

  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.initializeFlags();
    this.getMedicine();
  }

  initializeFlags() {
    // Ensure values are always 0 or 1 (number)
    this.medicineData.data.needs_protection =
      Boolean(this.medicineData.data?.needs_protection) == true ? true : false;

    this.medicineData.inputData.is_dangerous =
      Boolean(this.medicineData.inputData?.is_dangerous) == true ? true : false;
    this.cd.detectChanges()
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
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, '', this.encryptData.decryptData('user').token);
      if (res.status === 200) {
        this.medicineData.data = res.data;
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
    }
  }

  trigger() {
    this.clicker.nativeElement.click();
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
      const res = await this.userService.getUser(endpoint, '', this.userData.token);
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
    // Toggle 0/1 for needs_protection inside inputData
    if (!this.medicineData.inputData) this.medicineData.inputData = {};
    this.medicineData.inputData.needs_protection =
      this.medicineData.inputData.needs_protection ? 0 : 1;
    this.cd.detectChanges()
  }

  toggleDanger() {
    if (!this.medicineData.inputData) this.medicineData.inputData = {};
    this.medicineData.inputData.is_dangerous =
      this.medicineData.inputData.is_dangerous ? 0 : 1;
  }

  // Deleting Medicine
  async delete() {
    try {
      const res = await this.userService.deleteUser('medicine/' + this.medicineData.inputData.medicine_id, '', this.userData.token)
      if (res.status == 200 && res.data.success) {
        Extras.showToast('Medicine deleted successfully!', 'success');
        this.medicineData.inputData = []
        this.isDelete.set(false);
        this.getMedicine();
        this.cd.detectChanges();
      } else {
        Extras.showToast(res.data.message, 'warning');
        this.cd.detectChanges();
        return;
      }
    } catch (e) {
    }
  }
  // Creating Medicine
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
    if (!this.medicineData.inputData.generic_name || !this.medicineData.inputData.medicine_name || !this.medicineData.inputData.category
      || !this.medicineData.inputData.price || !this.medicineData.inputData.type || !this.medicineData.inputData.dosage ||
      !this.medicineData.inputData.unit
      || !this.medicineData.inputData.received_date || !this.medicineData.inputData.expiry_date || !this.medicineData.inputData.supplier_first_name ||
      !this.medicineData.inputData.supplier_last_name || !this.medicineData.inputData.supplier_name || !this.medicineData.inputData.contact_number || !this.medicineData.inputData.address || !this.medicineData.inputData.mfg_date || !this.medicineData.inputData.location
    ) {
      Extras.showToast('All fields are reuquired!', 'warning');
      return;
    }

    if (received > expiry) {
      Extras.showToast('Invalid: Received date is after expiry date', 'warning');
      return;
    }

    this.medicineData.inputData.branch_id = this.userData.data.data.branch_id
    const payload = { ...this.medicineData.inputData };
    if (payload.received_date instanceof Date) {
      payload.received_date = payload.received_date.toISOString().split('T')[0];
    }
    if (payload.expiry_date instanceof Date) {
      payload.expiry_date = payload.expiry_date.toISOString().split('T')[0];
    }
    try {
      const res = await this.userService.postUser('medicine', payload, this.userData.token)
      if (res.status == 200 && res.data.success) {
        Extras.showToast('Medicine added successfully!', 'success');
        this.medicineData.inputData = [];
        this.getMedicine();
        this.cd.detectChanges();
      } else {
        Extras.showToast(res.data.message, 'warning');
        this.cd.detectChanges();
        return;
      }
    } catch (e) {
      console.log(e)
    }
  }

  async update() {
    const received = new Date(this.medicineData.inputData.received_date);
    const expiry = new Date(this.medicineData.inputData.expiry_date);
    if (this.medicineData.inputData.stocks < 0 || this.medicineData.inputData.reorder_level < 0) {
      Extras.showToast('All stocks and reorder level must be greater than or equal to zero', 'warning');
      return;
    }
    if (!this.medicineData.inputData.generic_name || !this.medicineData.inputData.medicine_name || !this.medicineData.inputData.category
      || !this.medicineData.inputData.price || !this.medicineData.inputData.type || !this.medicineData.inputData.dosage ||
      !this.medicineData.inputData.unit
      || !this.medicineData.inputData.received_date || !this.medicineData.inputData.expiry_date || !this.medicineData.inputData.supplier_first_name ||
      !this.medicineData.inputData.supplier_last_name || !this.medicineData.inputData.supplier_name || !this.medicineData.inputData.contact_number || !this.medicineData.inputData.address
    ) {
      Extras.showToast('All fields are reuquired!', 'warning');
      return;
    }

    if (received > expiry) {
      Extras.showToast('Invalid: Received date is after expiry date', 'warning');
      return;
    }
    this.medicineData.inputData.branch_id = this.userData.data.data.branch_id

    const payload = { ...this.medicineData.inputData };
    if (payload.received_date instanceof Date) {
      payload.received_date = payload.received_date.toISOString().split('T')[0];
    }
    if (payload.expiry_date instanceof Date) {
      payload.expiry_date = payload.expiry_date.toISOString().split('T')[0];
    }
    try {
      const res = await this.userService.putUser('medicine/' + this.medicineData.inputData.medicine_id, payload, this.userData.token)
      if (res.status == 200 && res.data.success) {
        Extras.showToast('Medicine Updated Succesfully!', 'success');
        this.getMedicine();
        this.cd.detectChanges();
      } else {
        Extras.showToast(res.data.message, 'warning');
        this.cd.detectChanges();
        return;
      }
    } catch (e) {
    }
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
      supplier_name: item?.supplier_name ?? '',
      supplier_contact: [item?.supplier_first_name ?? '', item?.supplier_last_name ?? ''].filter(Boolean).join(' '),
      contact_number: item?.contact_number ?? '',
      address: item?.address ?? '',
      needs_protection: item?.needs_protection ? 'Yes' : 'No',
      is_dangerous: item?.is_dangerous ? 'Yes' : 'No',
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
