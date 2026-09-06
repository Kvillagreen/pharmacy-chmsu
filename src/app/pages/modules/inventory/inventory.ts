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
  isLoading = true;
  hasLoaded = false;

  defaultMedicineCategoryOptions = [
    'Analgesic',
    'Anesthetic',
    'Anti-Allergy',
    'Antibiotic',
    'Antacid',
    'Anthelmintic',
    'Anti-Anginal',
    'Anti-Anxiety',
    'Antiarrhythmic',
    'Antiasthmatic',
    'Anticoagulant',
    'Anticonvulsant',
    'Antidepressant',
    'Antidiabetic',
    'Antidiarrheal',
    'Antidote',
    'Antiemetic',
    'Antifungal',
    'Anti-Gout',
    'Antihistamine',
    'Antihypertensive',
    'Anti-Inflammatory',
    'Antilipidemic',
    'Antimalarial',
    'Antimigraine',
    'Antineoplastic',
    'Antiplatelet',
    'Antipsychotic',
    'Antipyretic',
    'Antiseptic',
    'Antispasmodic',
    'Antitussive',
    'Antivertigo',
    'Antiviral',
    'Bronchodilator',
    'Cardiovascular',
    'Cold and Flu',
    'Contraceptive',
    'Corticosteroid',
    'Cough Preparation',
    'Dermatology',
    'Diagnostic Agent',
    'Diuretic',
    'Digestive',
    'Electrolyte Replacement',
    'Emergency Medicine',
    'Endocrine',
    'ENT Preparations',
    'Expectorant',
    'Eye Care',
    'Gastrointestinal',
    'Genitourinary',
    'Hematinic',
    'Hormonal Therapy',
    'Immunomodulator',
    'Immunosuppressant',
    'Infant Care',
    'Laxative',
    'Maintenance',
    'Medical Supply',
    'Mineral Supplement',
    'Mucolytic',
    'Muscle Relaxant',
    'Nasal Preparation',
    'Neurology',
    'NSAID',
    'Nutritional Supplement',
    'Obstetrics and Gynecology',
    'Ophthalmic',
    'Otic',
    'Pain Relief',
    'Pediatric',
    'Probiotic',
    'Respiratory',
    'Sedative',
    'Sleep Aid',
    'Steroid',
    'Supplement',
    'Topical Preparation',
    'Urologic',
    'Vaccines',
    'Vasodilator',
    'Vitamin',
    'Wound Care',
  ];

  medicineTypeOptions = [
    'Tablet',
    'Syrup/Liquid',
    'Capsule',
    'Lozenges',
    'Spray',
    'Drops',
    'Topical Medicine',
  ];

  medicineUnitOptions = [
    'mcg',
    'mg',
    'g',
    'kg',
    'mL',
    'L',
    'IU',
    '%',
    'mg/mL',
  ];
  stockContainerOptions = [
    { value: 'none', label: 'None' },
    { value: 'boxes', label: 'Boxes' },
    { value: 'bulk', label: 'Bulk' },
    { value: 'custom', label: 'Custom' },
  ];
  medicineCategoryOptions: string[] = [];
  minimumShelfLifeMonths = 12;

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
  isArchiveHistoryOpen = signal(false);
  isTransfer = signal(false);
  endpoint = 'medicine';

  userData: UserData = {
    token: '',
    data: [],
  };

  branchData: BranchData = {
    data: [],
  };
  archivedMedicines: any[] = [];

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
      { key: 'batch_number', label: 'Batch Number', checked: true },
      { key: 'price', label: 'Unit Price', checked: true },
      { key: 'stocks', label: 'Stocks', checked: true },
      { key: 'reorder_level', label: 'Minimum Stocks', checked: true },
      { key: 'location', label: 'Location', checked: true },
      { key: 'received_date', label: 'Received Date', checked: true },
      { key: 'expiry_date', label: 'Expiry Date', checked: true },
      { key: 'mfg_date', label: 'Manufacturing Date', checked: true },
      { key: 'needs_protection', label: 'Prescription', checked: true },
      { key: 'is_dangerous', label: 'Dangerous', checked: true },
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
      needs_protection: false,
    },
  };

  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.initializeFlags();
    this.loadMedicineCategories();
    this.getMedicine();
  }

  initializeFlags() {
    this.medicineData.data.needs_protection = Boolean(this.medicineData.data?.needs_protection) === true;
    this.medicineData.inputData.is_dangerous = Boolean(this.medicineData.inputData?.is_dangerous) === true;
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
    this.isLoading = true;
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        this.medicineData.data = res.data;
        this.updateCategoryOptions(Array.isArray(res.data?.data) ? res.data.data : []);
        await this.loadMedicineCategories(false);
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

  async loadMedicineCategories(forceRefresh = true) {
    const companyId = Number(this.userData.data?.data?.company_id ?? 0);
    const branchId = this.getSelectedBranchId();
    const endpoints = [
      `medicine/categories?company_id=${companyId}&branch_id=${branchId}`,
      `medicine/categories?company_id=${companyId}`,
      'medicine/categories',
      `medicine?company_id=${companyId}&per_page=500&export=1`,
    ];

    try {
      const responses = await Promise.allSettled(
        endpoints.map((endpoint) => this.userService.getUser(endpoint, '', this.userData.token))
      );

      const mergedSources: any[] = [...this.defaultMedicineCategoryOptions];

      for (const result of responses) {
        if (result.status !== 'fulfilled') {
          continue;
        }

        const payload = result.value?.data;
        const categoryList = Array.isArray(payload?.data) ? payload.data : [];
        mergedSources.push(...categoryList);
      }

      this.updateCategoryOptions(mergedSources);

      if (forceRefresh) {
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
      this.updateCategoryOptions(this.defaultMedicineCategoryOptions);
      if (forceRefresh) {
        this.cd.detectChanges();
      }
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

  async openArchiveHistoryModal() {
    this.archivedMedicines = [];
    this.isArchiveHistoryOpen.set(true);

    try {
      const params = [`company_id=${this.userData.data.data.company_id}`];
      const selectedBranch = this.getSelectedBranchId();
      if (selectedBranch) {
        params.push(`branch_id=${selectedBranch}`);
      }

      const res = await this.userService.getUser(`medicine/archived/list?${params.join('&')}`, '', this.userData.token);
      if (res.status === 200 && res.data?.success) {
        this.archivedMedicines = Array.isArray(res.data.data) ? res.data.data : [];
      }
    } catch (e) {
      console.log(e);
      Extras.showToast('Failed to load archived medicines.', 'warning');
    } finally {
      this.cd.detectChanges();
    }
  }

  closeArchiveHistoryModal() {
    this.isArchiveHistoryOpen.set(false);
    this.archivedMedicines = [];
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

  async delete() {
    try {
      const res = await this.userService.deleteUser(`medicine/${this.medicineData.inputData.medicine_id}`, '', this.userData.token);
      if (res.status === 200 && res.data.success) {
        Extras.showToast('Medicine archived successfully!', 'success');
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
    this.applyContainerStockCount();
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
    if (
      !this.medicineData.inputData.generic_name ||
      !this.medicineData.inputData.medicine_name ||
      !this.medicineData.inputData.category ||
      !this.medicineData.inputData.price ||
      !this.medicineData.inputData.type ||
      !this.medicineData.inputData.dosage ||
      !this.medicineData.inputData.unit ||
      !this.medicineData.inputData.batch_number ||
      !this.medicineData.inputData.received_date ||
      !this.medicineData.inputData.expiry_date ||
      !this.medicineData.inputData.mfg_date ||
      !this.medicineData.inputData.location
    ) {
      Extras.showToast('All fields are required!', 'warning');
      return;
    }

    if (!this.validateInventoryDates(received, expiry, new Date(this.medicineData.inputData.mfg_date))) {
      return;
    }

    const branchId = this.resolveInventoryBranchId();
    if (!branchId) {
      Extras.showToast('Please select a valid branch before adding inventory.', 'warning');
      return;
    }

    this.medicineData.inputData.branch_id = branchId;
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
    this.applyContainerStockCount();
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
      !this.medicineData.inputData.batch_number ||
      !this.medicineData.inputData.received_date ||
      !this.medicineData.inputData.expiry_date ||
      !this.medicineData.inputData.mfg_date ||
      !this.medicineData.inputData.location
    ) {
      Extras.showToast('All fields are required!', 'warning');
      return;
    }

    if (!this.validateInventoryDates(received, expiry, new Date(this.medicineData.inputData.mfg_date))) {
      return;
    }

    const branchId = this.resolveInventoryBranchId();
    if (!branchId) {
      Extras.showToast('Please select a valid branch before updating inventory.', 'warning');
      return;
    }

    this.medicineData.inputData.branch_id = branchId;
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
    if (!this.canTransferMedicine(item)) {
      Extras.showToast('Medicines with 2 or fewer stocks cannot be transferred.', 'warning');
      return;
    }

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
    if (!this.canTransferMedicine(this.medicineData.inputData)) {
      Extras.showToast('Medicines with 2 or fewer stocks cannot be transferred.', 'warning');
      return;
    }

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

  canTransferMedicine(item: any): boolean {
    return Number(item?.stocks ?? 0) > 2;
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
      batch_number: item?.batch_number ?? '',
      price: item?.price ?? '',
      stocks: item?.stocks ?? '',
      reorder_level: item?.reorder_level ?? '',
      location: item?.location ?? '',
      received_date: item?.received_date ?? '',
      expiry_date: item?.expiry_date ?? '',
      mfg_date: item?.mfg_date ?? '',
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

  private updateCategoryOptions(items: any[]) {
    const categories = new Set<string>(this.medicineCategoryOptions);

    for (const item of items) {
      const rawCategory = typeof item === 'string'
        ? String(item).trim()
        : String(item?.category ?? '').trim();

      if (!rawCategory) {
        continue;
      }

      for (const category of this.normalizeCategoryValues(rawCategory)) {
        if (category) {
          categories.add(category);
        }
      }
    }

    const currentCategory = String(this.medicineData.inputData?.category ?? '').trim();
    for (const category of this.normalizeCategoryValues(currentCategory)) {
      if (category) {
        categories.add(category);
      }
    }

    this.medicineCategoryOptions = Array.from(categories).sort((a, b) => a.localeCompare(b));
  }

  private normalizeCategoryValues(value: string): string[] {
    return String(value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  private resolveInventoryBranchId(): number {
    const candidateIds = [
      Number(this.medicineData.inputData?.branch_id ?? 0),
      this.getSelectedBranchId(),
      this.getAssignedBranchId(),
    ];

    return candidateIds.find((branchId) => Number.isFinite(branchId) && branchId > 0) ?? 0;
  }

  private validateInventoryDates(received: Date, expiry: Date, mfg: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minimumExpiry = new Date(today);
    minimumExpiry.setMonth(minimumExpiry.getMonth() + this.minimumShelfLifeMonths);

    received.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    mfg.setHours(0, 0, 0, 0);

    if (expiry <= today) {
      Extras.showToast('The system should not accept expired medicines.', 'warning');
      return false;
    }

    if (expiry < minimumExpiry) {
      Extras.showToast(`Stocks with less than ${this.minimumShelfLifeMonths} months of remaining shelf life are not accepted.`, 'warning');
      return false;
    }

    if (received < today) {
      Extras.showToast('Received date must be greater than or equal to the present date.', 'warning');
      return false;
    }

    if (mfg > today) {
      Extras.showToast('Manufacturing date cannot be in the future.', 'warning');
      return false;
    }

    if (mfg >= received) {
      Extras.showToast('Manufacturing date must be before the received date.', 'warning');
      return false;
    }

    if (expiry <= mfg) {
      Extras.showToast('Expiry date must be after the manufacturing date.', 'warning');
      return false;
    }

    if (received > expiry) {
      Extras.showToast('Invalid: Received date is after expiry date', 'warning');
      return false;
    }

    if (mfg > expiry) {
      Extras.showToast('Manufacturing date cannot be after the expiry date.', 'warning');
      return false;
    }

    return true;
  }

  onContainerTypeChange() {
    const type = String(this.medicineData.inputData?.container_type ?? 'none');
    if (type === 'none') {
      this.medicineData.inputData.container_name = '';
      this.medicineData.inputData.container_count = null;
      this.medicineData.inputData.pcs_per_container = null;
      return;
    }

    if (type === 'boxes') {
      this.medicineData.inputData.container_name = 'Boxes';
    } else if (type === 'bulk') {
      this.medicineData.inputData.container_name = 'Bulk';
    }
  }

  shouldShowContainerStockFields(): boolean {
    return ['boxes', 'bulk', 'custom'].includes(String(this.medicineData.inputData?.container_type ?? 'none'));
  }

  getComputedContainerStocks(): number {
    if (!this.shouldShowContainerStockFields()) {
      return Number(this.medicineData.inputData?.stocks ?? 0);
    }

    const count = Number(this.medicineData.inputData?.container_count ?? 0);
    const pcs = Number(this.medicineData.inputData?.pcs_per_container ?? 0);
    return Math.max(0, count * pcs);
  }

  applyContainerStockCount() {
    if (!this.medicineData.inputData) {
      this.medicineData.inputData = {};
    }

    this.medicineData.inputData.container_type ||= 'none';
    if (this.shouldShowContainerStockFields()) {
      this.medicineData.inputData.stocks = this.getComputedContainerStocks();
    }
  }
}
