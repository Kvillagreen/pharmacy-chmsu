import { Component, OnInit, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { MedicineData } from '../../../../models/MedicineModel';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { ChangeDetectorRef } from '@angular/core';
import { UserData } from '../../../../models/UserModel';
import { Extras } from '../../../../extras/extras';
import { SalesModel, SalesData } from '../../../../models/SalesModel';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-sales',
  imports: [IonIcon, FormsModule, CommonModule],
  templateUrl: './sales.html',
  styleUrl: './sales.css',
})
export class Sales implements OnInit {
  medicineData: MedicineData = {
    data: [],
    selectedData: [],
    inputData: [],
    salesData: [],
  };

  salesModel: SalesModel = this.createInitialSalesModel();

  salesData: SalesData = {
    categoryData: [],
    selectedCategory: '',
    transactionData: [],
    selectedTransaction: 'regular',
    discountData: [
      {
        type: 'SCPWD',
        discount: 0.2,
      },
      {
        type: 'DISC',
        discount: 0.2,
      },
    ],
    selectedDiscount: '',
  };

  userData: UserData = {
    data: [],
  };

  paymentMethodList: any = [
    {
      type: 'Cash',
      icon: 'cash-outline',
      note: 'Accept physical cash and compute change automatically.',
    },
    {
      type: 'Card',
      icon: 'card-outline',
      note: 'Store the terminal or bank reference for the payment.',
    },
    {
      type: 'Gcash',
      icon: 'phone-portrait-outline',
      note: 'Store the GCash reference for easier verification.',
    },
  ];

  transactionTypeOptions = [
    { value: 'regular', label: 'Regular', icon: 'checkbox-outline', note: 'No extra documents required.' },
  ];

  stockMap: { [key: string]: any } = {};
  isLoading = true;
  hasLoaded = false;
  isDiscount = signal(false);
  isPay = signal(false);
  isReceiptOpen = signal(false);
  pageNumber = 1;
  sort = '';
  searchQuery = '';
  extras = Extras;
  endpoint = 'transaction';
  lastReceipt: any = null;
  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.loadSales();
    this.loadMedicineCategories();
    this.getMedicine();
  }

  createInitialSalesModel(): SalesModel {
    return {
      discount: 0,
      sub_total: 0,
      total_amount: 0,
      scpwd_id_number: '',
      discount_type: '',
      payment_method: '',
      reference_number: '',
      used_amount: 0,
      items: [],
      request_token: '',
      transaction_type: 'regular',
      patient_name: '',
      membership_id: '',
      documents_submitted: false,
      prescription_path: '',
      member_id_image_path: '',
      patient_age: null,
      prescriber_name: '',
      prescriber_prc_license_number: '',
      prescribed_generic_name: '',
      prescribed_brand_name: '',
      prescribed_dosage_strength: '',
      prescribed_dosage_form: '',
      prescribed_quantity_dispensed: null,
      dispensing_date: '',
      pharmacist_signature: '',
      customer_contact_number: '',
      customer_id_number: '',
      customer_address_line: '',
      customer_barangay: '',
      customer_city_municipality: '',
      customer_province: '',
      customer_postal_code: '',
      customer_country: 'Philippines',
      prescriber_clinic_address: '',
      prescriber_s2_license_number: '',
      prescriber_ptr_number: '',
      yellow_prescription_serial_number: '',
      dangerous_quantity_in_words: '',
      dangerous_quantity_in_figures: '',
      dangerous_total_dosage: '',
      dangerous_treatment_duration: '',
      receiver_name: '',
      receiver_signature: '',
    };
  }

  filter(sortValue: string) {
    this.sort = sortValue;
    this.pageNumber = 1;
    this.getMedicine();
  }

  prev() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.getMedicine();
    }
  }

  next() {
    if (this.pageNumber < this.medicineData.data.meta.last_page) {
      this.pageNumber++;
      this.getMedicine();
    }
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

    return `${this.endpoint}?company_id=${this.userData.data.data.company_id}&per_page=16&${params.join('&')}`;
  }

  loadSales() {
    const saved = this.encryptData.decryptData('sales');
    const branchCarts = this.normalizeSalesStorage(saved);
    const selectedBranchId = this.getSelectedBranchId();

    if (selectedBranchId > 0) {
      this.medicineData.salesData = branchCarts[String(selectedBranchId)] ?? [];
    } else {
      this.medicineData.salesData = Object.values(branchCarts).flat();
    }

    this.syncRegulatedMedicineInfo();
  }

  getSubTotalPrice(): number {
    const subTotal = this.medicineData.salesData.reduce((total: number, item: any) => {
      return total + Number(item.price) * Number(item.quantity);
    }, 0);

    this.salesModel.sub_total = subTotal;
    return subTotal;
  }

  getTotalPrice(): number {
    const subTotal = this.getSubTotalPrice();
    const discount = Number(this.salesModel.discount || 0);
    let total = subTotal - discount;

    if (total < 0) total = 0;

    this.salesModel.total_amount = total;
    return total;
  }

  customDiscountPrice(event: any): number {
    let discount = 0;

    if (this.salesData.selectedDiscount === 'DISC') {
      discount = Number(event?.target?.value || 0);
    } else if (this.salesData.selectedDiscount) {
      const found = this.salesData.discountData.find(
        (x: any) => x.type === this.salesData.selectedDiscount
      );
      const rate = found?.discount || 0;
      discount = Number(this.salesModel.sub_total) * Number(rate);
    }

    this.salesModel.discount = discount;
    return discount;
  }

  saveDiscount() {
    this.salesModel.discount_type = this.salesData.selectedDiscount;

    if (this.salesModel.discount_type === 'DISC') {
      if (Number(this.salesModel.discount) <= 0 || !this.salesModel.discount) {
        Extras.showToast('Please enter a valid discount amount!', 'warning');
        return;
      }

      this.isDiscount.set(false);
      this.salesModel.discount = Number(this.salesModel.discount);
      this.salesModel.discount_type = 'Discount';
      Extras.showToast('Discount saved successfully!', 'success');
      return;
    }

    if (this.salesModel.discount_type === 'SCPWD') {
      if (!this.salesModel.scpwd_id_number || this.salesModel.scpwd_id_number.trim() === '') {
        Extras.showToast('Please enter a valid SC/PWD ID number!', 'warning');
        return;
      }

      this.isDiscount.set(false);
      this.salesModel.discount = Number(this.salesModel.sub_total) * 0.2;
      this.salesModel.discount_type = 'SCPWD';
      Extras.showToast('SC/PWD discount applied successfully!', 'success');
    }
  }

  updateTransaction(
    data: any,
    action: 'addSale' | 'minusSale' | 'addStock' | 'minusStock' | 'trash'
  ) {
    const sales = this.medicineData.salesData;
    const itemKey = this.getCartItemKey(data);
    const stockItem = this.stockMap[itemKey];
    let salesItem = sales.find((x: any) => this.getCartItemKey(x) === itemKey);

    if (!stockItem) return;

    switch (action) {
      case 'addSale':
        if (stockItem.stocks <= 0) return;

        if (!salesItem) {
          salesItem = { ...data, quantity: 0 };
          sales.push(salesItem);
        }

        salesItem.quantity++;
        stockItem.stocks--;
        break;

      case 'minusSale':
      case 'addStock':
        if (!salesItem) return;
        salesItem.quantity--;
        stockItem.stocks++;

        if (salesItem.quantity <= 0) {
          this.removeSale(data);
        }
        break;

      case 'minusStock':
        if (stockItem.stocks <= 0) return;

        if (!salesItem) {
          salesItem = { ...data, quantity: 0 };
          sales.push(salesItem);
        }

        salesItem.quantity++;
        stockItem.stocks--;
        break;

      case 'trash':
        if (!salesItem) return;
        stockItem.stocks += salesItem.quantity;
        this.removeSale(data);
        break;
    }

    if (salesItem) {
      this.updateTotal(salesItem);
    }

    this.syncStocksWithSales();
    this.syncRegulatedMedicineInfo();
    this.customDiscountPrice(null);
    this.saveSales();
    this.cd.detectChanges();
  }

  getStock(item: any): number {
    const stockItem = this.stockMap[this.getCartItemKey(item)];
    if (!stockItem) return 0;
    return stockItem.stocks || 0;
  }

  removeSale(item: any) {
    const itemKey = this.getCartItemKey(item);
    this.medicineData.salesData = this.medicineData.salesData.filter(
      (x: any) => this.getCartItemKey(x) !== itemKey
    );
    this.syncRegulatedMedicineInfo();
  }

  saveSales() {
    const selectedBranchId = this.getSelectedBranchId();
    let branchCarts = this.normalizeSalesStorage(this.encryptData.decryptData('sales'));

    if (selectedBranchId > 0) {
      branchCarts[String(selectedBranchId)] = (this.medicineData.salesData ?? []).map((item: any) => ({ ...item }));
    } else {
      branchCarts = this.groupSalesByBranch(this.medicineData.salesData ?? []);
    }

    Object.keys(branchCarts).forEach((branchKey) => {
      if (!branchCarts[branchKey]?.length) {
        delete branchCarts[branchKey];
      }
    });

    this.encryptData.encryptAndStoreData('sales', branchCarts);
  }

  updateTotal(item: any) {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);
    item.total_price = price * qty;
  }

  getSelectedBranchId(): number {
    const storedBranch = this.encryptData.decryptData('branch');
    return Number(storedBranch?.selectedBranch ?? this.userData.data?.data?.branch_id ?? 0);
  }

  async loadMedicineCategories(forceRefresh = true) {
    const companyId = Number(this.userData.data?.data?.company_id ?? 0);
    const branchId = this.getSelectedBranchId();
    const endpoint = branchId > 0
      ? `medicine?company_id=${companyId}&branch_id=${branchId}&per_page=500&export=1`
      : `medicine?company_id=${companyId}&per_page=500&export=1`;

    try {
      const response = await this.userService.getUser(endpoint, '', this.userData.token);
      const medicines = Array.isArray(response?.data?.data) ? response.data.data : [];
      this.updateCategoryOptions(medicines, true);

      if (forceRefresh) {
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
      this.salesData.categoryData = [];
      if (forceRefresh) {
        this.cd.detectChanges();
      }
    }
  }

  onManualQtyChange(event: any, data: any) {
    let newQty = Number(event.target.value);
    if (isNaN(newQty) || newQty < 0) newQty = 0;

    const stockItem = this.stockMap[this.getCartItemKey(data)];
    if (!stockItem) return;

    const oldQty = data.quantity || 0;
    const diff = newQty - oldQty;

    if (diff > 0 && stockItem.stocks < diff) {
      newQty = oldQty + stockItem.stocks;
    }

    data.quantity = newQty;

    if (data.quantity <= 0) {
      this.removeSale(data);
    }

    this.syncStocksWithSales();
    this.syncRegulatedMedicineInfo();
    this.saveSales();
  }

  async getMedicine() {
    this.isLoading = true;
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, null, this.userData.token);

      if (res.status === 200) {
        const apiData = res.data.data || [];

        apiData.forEach((item: any) => {
          const stockKey = this.getCartItemKey(item);
          const existing = this.stockMap[stockKey];

          if (!existing) {
            this.stockMap[stockKey] = {
              ...item,
              original_stock: item.stocks,
            };
          } else {
            this.stockMap[stockKey] = {
              ...item,
              stocks: existing.stocks,
              original_stock: existing.original_stock,
            };
          }
        });

        this.syncStocksWithSales();

        this.medicineData.data = {
          ...res.data,
          data: apiData.map((item: any) => ({
            ...this.stockMap[this.getCartItemKey(item)],
          })),
        };
        this.updateCategoryOptions(apiData);

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

  syncStocksWithSales() {
    Object.values(this.stockMap).forEach((item: any) => {
      item.stocks = item.original_stock ?? 0;
    });

    this.medicineData.salesData.forEach((sale: any) => {
      const stockItem = this.stockMap[this.getCartItemKey(sale)];

      if (stockItem) {
        stockItem.stocks -= sale.quantity;

        if (stockItem.stocks < 0) {
          stockItem.stocks = 0;
        }
      }
    });
  }

  getRows() {
    if (!this.medicineData.data?.data) return Array(10).fill(null);
    const length = this.medicineData.data.data.length;
    const arr = [];
    let i = length;

    while (i < 16) {
      arr.push(null);
      i++;
    }

    return arr;
  }

  getSalesGroupsByBranch() {
    const grouped = new Map<string, { branchName: string; items: any[]; totalQuantity: number }>();

    for (const item of this.medicineData.salesData ?? []) {
      const branchName = String(item?.branch_name ?? '').trim() || 'Unassigned Branch';
      const existing = grouped.get(branchName);

      if (existing) {
        existing.items.push(item);
        existing.totalQuantity += Number(item?.quantity ?? 0);
        continue;
      }

      grouped.set(branchName, {
        branchName,
        items: [item],
        totalQuantity: Number(item?.quantity ?? 0),
      });
    }

    return Array.from(grouped.values());
  }

  isAllBranchesScope(): boolean {
    return this.getSelectedBranchId() === 0;
  }

  setTransactionType(type: string) {
    this.salesData.selectedTransaction = type;
    this.salesModel.transaction_type = type;
    this.updateDocumentStatus();
    this.cd.detectChanges();
  }

  isRegularTransaction(): boolean {
    return !this.requiresPrescriptionDetails() && !this.requiresDangerousDrugDetails();
  }

  isPrescriptionTransaction(): boolean {
    return this.requiresPrescriptionDetails();
  }

  isDangerousTransaction(): boolean {
    return this.requiresDangerousDrugDetails();
  }

  canSelectMedicine(medicine: any): boolean {
    return true;
  }

  onDocumentSelected(event: Event, type: 'prescription' | 'member_id_image') {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    this.updateDocumentStatus();
  }

  removeSelectedDocument(type: 'prescription' | 'member_id_image') {
    this.updateDocumentStatus();
  }

  clearTransactionDocuments() {
    this.updateDocumentStatus();
  }

  updateDocumentStatus() {
    if (this.isRegularTransaction()) {
      this.salesModel.documents_submitted = false;
      return;
    }

    this.salesModel.documents_submitted = false;
  }

  documentStatusLabel(): string {
    if (this.isRegularTransaction()) {
      return 'No documents required';
    }

    if (this.requiresPrescriptionDetails() && this.requiresDangerousDrugDetails()) {
      return 'Both regulated forms required';
    }

    if (this.isPrescriptionTransaction()) {
      return 'Prescription details required';
    }

    return 'Dangerous drug details required';
  }

  documentStatusClass(): string {
    if (this.isRegularTransaction()) {
      return 'bg-slate-100 text-slate-700';
    }

    if (this.requiresPrescriptionDetails() && this.requiresDangerousDrugDetails()) {
      return 'bg-amber-100 text-amber-700';
    }

    if (this.isPrescriptionTransaction()) {
      return 'bg-blue-100 text-blue-700';
    }

    return 'bg-red-100 text-red-700';
  }

  selectedFileName(type: 'prescription' | 'member_id_image'): string {
    return 'No file selected';
  }

  shouldShowDocumentUploader(): boolean {
    return false;
  }

  private validateTransactionDetails(): boolean {
    const transactionType = this.currentRegulatedClassification();
    this.salesModel.transaction_type = transactionType;

    const validators: Array<{ valid: boolean; message: string }> = [];

    if (this.requiresPrescriptionDetails() || this.requiresDangerousDrugDetails()) {
      validators.push(
        { valid: !!this.salesModel.patient_name?.trim(), message: 'Patient full name is required.' },
        { valid: !!this.salesModel.customer_address_line?.trim(), message: 'Patient address is required.' },
      );
    }

    if (this.requiresPrescriptionDetails()) {
      validators.push(
        { valid: this.salesModel.patient_age !== null && Number(this.salesModel.patient_age) >= 0, message: 'Patient age is required.' },
        { valid: !!this.salesModel.prescriber_name?.trim(), message: 'Prescriber full name is required.' },
        { valid: !!this.salesModel.prescriber_prc_license_number?.trim(), message: 'PRC license number is required.' },
        { valid: /^\d{7}$/.test(String(this.salesModel.prescriber_prc_license_number ?? '').trim()), message: 'PRC license number must be a 7-digit code.' },
        { valid: !!this.salesModel.prescribed_generic_name?.trim(), message: 'Generic name is required.' },
        { valid: !!this.salesModel.prescribed_dosage_strength?.trim(), message: 'Dosage strength is required.' },
        { valid: !!this.salesModel.prescribed_dosage_form?.trim(), message: 'Dosage form is required.' },
        { valid: Number(this.salesModel.prescribed_quantity_dispensed || 0) > 0, message: 'Quantity dispensed is required.' },
        { valid: !!this.salesModel.dispensing_date?.trim(), message: 'Dispensing date is required.' },
        { valid: !!this.salesModel.pharmacist_signature?.trim(), message: 'Pharmacist name is required.' },
      );
    }

    if (this.requiresDangerousDrugDetails()) {
      validators.push(
        { valid: !!this.salesModel.prescriber_name?.trim(), message: 'Physician full name is required.' },
        { valid: !!this.salesModel.prescriber_clinic_address?.trim(), message: 'Clinic address is required.' },
        { valid: !!this.salesModel.prescriber_s2_license_number?.trim(), message: 'S-2 license number is required.' },
        { valid: !!this.salesModel.prescriber_ptr_number?.trim(), message: 'PTR number is required.' },
        { valid: !!this.salesModel.yellow_prescription_serial_number?.trim(), message: 'Yellow prescription serial number is required.' },
        { valid: !!this.salesModel.dangerous_quantity_in_words?.trim(), message: 'Exact quantity in words is required.' },
        { valid: !!this.salesModel.dangerous_quantity_in_figures?.trim(), message: 'Exact quantity in figures is required.' },
        { valid: !!this.salesModel.dangerous_total_dosage?.trim(), message: 'Total dosage is required.' },
        { valid: !!this.salesModel.dangerous_treatment_duration?.trim(), message: 'Treatment duration is required.' },
        { valid: !!this.salesModel.receiver_name?.trim(), message: 'Receiver name is required.' },
        { valid: !!this.salesModel.receiver_signature?.trim(), message: 'Receiver signature is required.' },
        {
          valid: !!this.salesModel.customer_contact_number?.trim() || !!this.salesModel.customer_id_number?.trim(),
          message: 'Provide either a contact number or a valid ID number.',
        },
      );
    }

    const failed = validators.find((item) => !item.valid);
    if (failed) {
      this.extras.showToast(failed.message, 'warning');
      return false;
    }

    this.updateDocumentStatus();
    return true;
  }

  private buildTransactionPayload(): FormData {
    const formData = new FormData();
    const items = this.medicineData.salesData.map((item: any) => ({
      medicine_id: item.medicine_id,
      quantity: item.quantity,
    }));

    this.syncRegulatedMedicineInfo();
    this.salesModel.items = items;
    this.salesModel.user_id = this.userData.data.data.user_id;
    this.salesModel.branch_id = this.getSelectedBranchId();
    this.salesModel.request_token = crypto.randomUUID();
    this.salesModel.change = this.extras.computeChange(
      Number(this.salesModel.total_amount),
      Number(this.salesModel.used_amount)
    );
    this.salesModel.transaction_type = this.currentRegulatedClassification();
    this.salesModel.documents_submitted = Boolean(this.salesModel.documents_submitted);

    const scalarEntries: Record<string, any> = {
      user_id: this.salesModel.user_id,
      branch_id: this.salesModel.branch_id,
      transaction_type: this.salesModel.transaction_type,
      total_amount: this.salesModel.total_amount,
      sub_total: this.salesModel.sub_total,
      change: this.salesModel.change,
      used_amount: this.salesModel.used_amount,
      payment_method: this.salesModel.payment_method,
      reference_number: this.requiresReferenceNumber() ? (this.salesModel.reference_number ?? '') : '',
      discount: this.salesModel.discount ?? 0,
      discount_type: this.salesModel.discount_type ?? '',
      scpwd_id_number: this.salesModel.scpwd_id_number ?? '',
      patient_name: this.salesModel.patient_name ?? '',
      membership_id: this.salesModel.membership_id ?? '',
      documents_submitted: this.salesModel.documents_submitted ? '1' : '0',
      patient_age: this.salesModel.patient_age ?? '',
      prescriber_name: this.salesModel.prescriber_name ?? '',
      prescriber_prc_license_number: this.salesModel.prescriber_prc_license_number ?? '',
      prescribed_generic_name: this.salesModel.prescribed_generic_name ?? '',
      prescribed_brand_name: this.salesModel.prescribed_brand_name ?? '',
      prescribed_dosage_strength: this.salesModel.prescribed_dosage_strength ?? '',
      prescribed_dosage_form: this.salesModel.prescribed_dosage_form ?? '',
      prescribed_quantity_dispensed: this.salesModel.prescribed_quantity_dispensed ?? '',
      dispensing_date: this.salesModel.dispensing_date ?? '',
      pharmacist_signature: this.salesModel.pharmacist_signature ?? '',
      customer_contact_number: this.salesModel.customer_contact_number ?? '',
      customer_id_number: this.salesModel.customer_id_number ?? '',
      customer_address_line: this.salesModel.customer_address_line ?? '',
      customer_barangay: this.salesModel.customer_barangay ?? '',
      customer_city_municipality: this.salesModel.customer_city_municipality ?? '',
      customer_province: this.salesModel.customer_province ?? '',
      customer_postal_code: this.salesModel.customer_postal_code ?? '',
      customer_country: this.salesModel.customer_country ?? 'Philippines',
      prescriber_clinic_address: this.salesModel.prescriber_clinic_address ?? '',
      prescriber_s2_license_number: this.salesModel.prescriber_s2_license_number ?? '',
      prescriber_ptr_number: this.salesModel.prescriber_ptr_number ?? '',
      yellow_prescription_serial_number: this.salesModel.yellow_prescription_serial_number ?? '',
      dangerous_quantity_in_words: this.salesModel.dangerous_quantity_in_words ?? '',
      dangerous_quantity_in_figures: this.salesModel.dangerous_quantity_in_figures ?? '',
      dangerous_total_dosage: this.salesModel.dangerous_total_dosage ?? '',
      dangerous_treatment_duration: this.salesModel.dangerous_treatment_duration ?? '',
      receiver_name: this.salesModel.receiver_name ?? '',
      receiver_signature: this.salesModel.receiver_signature ?? '',
      request_token: this.salesModel.request_token,
    };

    Object.entries(scalarEntries).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });

    items.forEach((item: { medicine_id: number; quantity: number }, index: number) => {
      formData.append(`items[${index}][medicine_id]`, String(item.medicine_id));
      formData.append(`items[${index}][quantity]`, String(item.quantity));
    });

    return formData;
  }

  private syncRegulatedMedicineInfo() {
    const selectedItems = Array.isArray(this.medicineData.salesData) ? this.medicineData.salesData : [];
    const uniqueValues = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
    const joinValues = (values: string[]) => uniqueValues(values).join(', ');
    const totalQuantity = selectedItems.reduce((sum: number, item: any) => sum + Number(item?.quantity || 0), 0);

    this.salesModel.prescribed_generic_name = joinValues(
      selectedItems.map((item: any) => String(item?.generic_name ?? ''))
    );
    this.salesModel.prescribed_brand_name = joinValues(
      selectedItems.map((item: any) => String(item?.medicine_name ?? ''))
    );
    this.salesModel.prescribed_dosage_strength = joinValues(
      selectedItems.map((item: any) => this.formatMedicineStrength(item))
    );
    this.salesModel.prescribed_dosage_form = joinValues(
      selectedItems.map((item: any) => String(item?.type ?? ''))
    );
    this.salesModel.prescribed_quantity_dispensed = totalQuantity > 0 ? totalQuantity : null;
    this.salesModel.dangerous_quantity_in_figures = joinValues(
      selectedItems.map((item: any) => this.formatMedicineQuantity(item))
    );
    this.salesModel.dangerous_total_dosage = joinValues(
      selectedItems.map((item: any) => this.formatMedicineStrength(item))
    );
  }

  private formatMedicineStrength(item: any): string {
    const dosage = String(item?.dosage ?? '').trim();
    const unit = String(item?.unit ?? '').trim();
    return [dosage, unit].filter(Boolean).join(' ');
  }

  private formatMedicineQuantity(item: any): string {
    const medicineName = String(item?.medicine_name ?? '').trim();
    const quantity = Number(item?.quantity ?? 0);

    if (!medicineName && !quantity) {
      return '';
    }

    return `${medicineName}${medicineName ? ': ' : ''}${quantity}`;
  }

  currentRegulatedClassification(): 'regular' | 'controlled' | 'dangerous' | 'mixed' {
    if (this.requiresPrescriptionDetails() && this.requiresDangerousDrugDetails()) {
      return 'mixed';
    }

    if (this.requiresDangerousDrugDetails()) {
      return 'dangerous';
    }

    if (this.requiresPrescriptionDetails()) {
      return 'controlled';
    }

    return 'regular';
  }

  requiresPrescriptionDetails(): boolean {
    return this.medicineData.salesData.some((item: any) => Boolean(item?.needs_protection));
  }

  requiresDangerousDrugDetails(): boolean {
    return this.medicineData.salesData.some((item: any) => Boolean(item?.is_dangerous));
  }

  currentTransactionLabel(): string {
    if (this.requiresPrescriptionDetails() && this.requiresDangerousDrugDetails()) {
      return 'Prescription + Dangerous Drugs';
    }

    if (this.isDangerousTransaction()) {
      return 'Dangerous Drugs';
    }

    if (this.isPrescriptionTransaction()) {
      return 'Prescription';
    }

    return 'Regular';
  }

  currentTransactionNote(): string {
    if (this.requiresPrescriptionDetails() && this.requiresDangerousDrugDetails()) {
      return 'Both prescription and yellow-prescription details are required for this cart.';
    }

    if (this.isDangerousTransaction()) {
      return 'Yellow prescription fields are required before checkout.';
    }

    if (this.isPrescriptionTransaction()) {
      return 'Prescription details are required before checkout.';
    }

    return 'Standard checkout with no extra regulated-drug form.';
  }

  requiresReferenceNumber(method = this.salesModel.payment_method): boolean {
    return method === 'Card' || method === 'Gcash';
  }

  onPaymentMethodChange(method: string) {
    this.salesModel.payment_method = method;

    if (!this.requiresReferenceNumber(method)) {
      this.salesModel.reference_number = '';
    }
  }

  updateReferenceNumber(event: Event) {
    const target = event.target as HTMLInputElement;
    this.salesModel.reference_number = (target.value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '')
      .slice(0, 120);
  }

  async pay() {
    if (this.isAllBranchesScope()) {
      this.extras.showToast('Select a specific branch before checkout.', 'warning');
      return;
    }

    this.salesModel.items = this.medicineData.salesData.map((item: any) => ({
      medicine_id: item.medicine_id,
      quantity: item.quantity,
    }));

    if (!this.salesModel.items?.length || Number(this.salesModel.sub_total) <= 0 || Number(this.salesModel.used_amount) <= 0) {
      this.extras.showToast('All fields are required', 'warning');
      return;
    }

    if (this.salesModel.discount_type === 'DISC' && !this.salesModel.discount) {
      this.extras.showToast('Please input the discounted price', 'warning');
      return;
    }

    if (this.salesModel.discount_type === 'SCPWD' && !this.salesModel.scpwd_id_number) {
      this.extras.showToast('Please input SCPWD ID number', 'warning');
      return;
    }

    if (Number(this.salesModel.used_amount) < Number(this.salesModel.total_amount)) {
      this.extras.showToast('Insufficient payment amount', 'danger');
      return;
    }

    if (!this.salesModel.payment_method) {
      this.extras.showToast('Payment method is required', 'danger');
      return;
    }

    if (this.requiresReferenceNumber() && !this.salesModel.reference_number?.trim()) {
      this.extras.showToast('Reference number is required for card or Gcash payments', 'warning');
      return;
    }

    if (!this.validateTransactionDetails()) {
      return;
    }

    try {
      const payload = this.buildTransactionPayload();
      const res = await this.userService.postUser('transaction', payload, this.userData.token);

      if (res.status === 201) {
        this.lastReceipt = res.data?.data ?? null;
        this.isReceiptOpen.set(true);
        this.extras.showToast('Transaction Completed', 'success');
        this.resetSalesState();
      } else {
        this.extras.showToast(res.message, 'warning');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message || 'Transaction failed', 'danger');
    }
  }

  resetSalesState() {
    this.salesModel = this.createInitialSalesModel();
    this.salesData.selectedTransaction = 'regular';
    this.salesData.selectedDiscount = '';
    this.medicineData.salesData = [];
    this.stockMap = {};
    this.isPay.set(false);
    this.isDiscount.set(false);
    this.saveSales();
    this.getMedicine();
  }

  downloadReceipt(transaction?: any) {
    const receipt = transaction ?? this.lastReceipt;
    if (!receipt) {
      this.extras.showToast('No receipt available to download.', 'warning');
      return;
    }

    try {
      const lines = this.buildReceiptTextLines(receipt, 40);
      const paperWidth = 80;
      const marginX = 4.5;
      const marginY = 7;
      const lineHeight = 4.2;
      const paperHeight = Math.max(120, marginY * 2 + lines.length * lineHeight + 8);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [paperWidth, paperHeight],
      });

      pdf.setFillColor(255, 252, 245);
      pdf.rect(0, 0, paperWidth, paperHeight, 'F');
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(28, 25, 23);

      let cursorY = marginY;
      for (const line of lines) {
        pdf.text(line, marginX, cursorY);
        cursorY += lineHeight;
      }

      pdf.save(this.buildReceiptFilename(receipt));
    } catch (error) {
      console.error(error);
      this.extras.showToast('Failed to download receipt PDF.', 'warning');
    }
  }

  closeReceipt() {
    this.isReceiptOpen.set(false);
  }

  receiptItems() {
    return this.lastReceipt?.items ?? [];
  }

  receiptPreviewLines(): string[] {
    return this.buildReceiptTextLines(this.lastReceipt, 40);
  }

  private getCartItemKey(item: any): string {
    const branchId = Number(item?.branch_id ?? 0);
    const inventoryId = Number(item?.inventory_id ?? item?.medicine_id ?? 0);
    return `${branchId}:${inventoryId}`;
  }

  private groupSalesByBranch(items: any[]): Record<string, any[]> {
    return (items ?? []).reduce((acc: Record<string, any[]>, item: any) => {
      const branchKey = String(Number(item?.branch_id ?? 0));
      if (!acc[branchKey]) {
        acc[branchKey] = [];
      }
      acc[branchKey].push({ ...item });
      return acc;
    }, {});
  }

  private normalizeSalesStorage(saved: any): Record<string, any[]> {
    if (!saved) {
      return {};
    }

    if (typeof saved === 'string') {
      try {
        return this.normalizeSalesStorage(JSON.parse(saved));
      } catch (e) {
        console.log(e);
        return {};
      }
    }

    if (Array.isArray(saved)) {
      return this.groupSalesByBranch(
        saved.map((item: any) => ({
          ...item,
          branch_id: Number(item?.branch_id ?? this.getSelectedBranchId() ?? this.userData.data?.data?.branch_id ?? 0),
        }))
      );
    }

    return Object.entries(saved).reduce((acc: Record<string, any[]>, [branchKey, items]) => {
      acc[String(branchKey)] = Array.isArray(items)
        ? items.map((item: any) => ({
            ...item,
            branch_id: Number(item?.branch_id ?? branchKey ?? 0),
          }))
        : [];
      return acc;
    }, {});
  }

  private buildReceiptFilename(receipt: any): string {
    const receiptId = String(receipt?.transaction_id ?? 'receipt')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');

    return `Sales-Receipt-${receiptId || 'receipt'}.pdf`;
  }

  private buildReceiptTextLines(receipt: any, width: number): string[] {
    if (!receipt) {
      return [];
    }

    const lines: string[] = [];
    const divider = '='.repeat(width);
    const sectionDivider = '-'.repeat(width);
    const companyName = this.safeReceiptText(this.userData.data?.data?.company_name || 'KMV Pharmacy');
    const branchName = this.safeReceiptText(receipt?.branch?.branch_name || 'Assigned Branch');
    const cashierName = this.safeReceiptText(
      `${receipt?.user?.first_name || ''} ${receipt?.user?.last_name || ''}`.trim() || 'Unknown Cashier'
    );
    const items = Array.isArray(receipt?.items) ? receipt.items : [];
    const transactionType = this.safeReceiptText(receipt?.transaction_type || 'regular').toUpperCase();

    lines.push(this.centerReceiptText(companyName, width));
    lines.push(this.centerReceiptText(branchName, width));
    lines.push(this.centerReceiptText('OFFICIAL SALES RECEIPT', width));
    lines.push(divider);
    lines.push(...this.buildReceiptKeyValueLines('Receipt No', receipt?.transaction_id ?? 'N/A', width, 18));
    lines.push(...this.buildReceiptKeyValueLines('Date', this.formatReceiptDate(receipt?.created_at), width, 18));
    lines.push(...this.buildReceiptKeyValueLines('Cashier', cashierName, width, 18));
    lines.push(...this.buildReceiptKeyValueLines('Payment', receipt?.payment_method || 'N/A', width, 18));
    if (receipt?.reference_number) {
      lines.push(...this.buildReceiptKeyValueLines('Reference', receipt.reference_number, width, 18));
    }
    lines.push(...this.buildReceiptKeyValueLines('Type', transactionType, width, 18));

    if (receipt?.discount_type) {
      lines.push(...this.buildReceiptKeyValueLines('Discount', receipt.discount_type, width, 18));
    }

    if (receipt?.scpwd_id_number) {
      lines.push(...this.buildReceiptKeyValueLines('SC/PWD ID', receipt.scpwd_id_number, width, 18));
    }

    if (receipt?.patient_name) {
      lines.push(...this.buildReceiptKeyValueLines('Patient', receipt.patient_name, width, 18));
    }

    if (receipt?.membership_id) {
      lines.push(...this.buildReceiptKeyValueLines('Member ID', receipt.membership_id, width, 18));
    }

    lines.push(sectionDivider);
    lines.push(this.padReceiptColumns('ITEM', 'QTY', 'AMOUNT', width));
    lines.push(sectionDivider);

    if (!items.length) {
      lines.push(this.centerReceiptText('NO ITEMS', width));
    }

    items.forEach((item: any) => {
      const medicineName = this.safeReceiptText(item?.medicine?.medicine_name || `Medicine #${item?.medicine_id ?? ''}`);
      const unitPrice = Number(item?.price ?? item?.medicine?.price ?? 0);
      const quantity = Number(item?.quantity ?? 0);
      const lineTotal = quantity * unitPrice;

      lines.push(...this.wrapReceiptText(medicineName, width));
      lines.push(this.buildReceiptItemLine(quantity, unitPrice, lineTotal, width));
    });

    lines.push(sectionDivider);
    lines.push(...this.buildReceiptKeyValueLines('Subtotal', this.formatReceiptCurrency(receipt?.sub_total), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('Discount', this.formatReceiptCurrency(receipt?.discount), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('Total', this.formatReceiptCurrency(receipt?.total_amount), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('Amount Paid', this.formatReceiptCurrency(receipt?.used_amount), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('Change', this.formatReceiptCurrency(receipt?.change), width, 20));

    if (receipt?.documents_submitted) {
      lines.push(...this.buildReceiptKeyValueLines('Docs', 'SUBMITTED', width, 20));
    }

    lines.push(divider);
    lines.push(this.centerReceiptText('THANK YOU FOR YOUR PURCHASE', width));
    lines.push(this.centerReceiptText('PLEASE COME AGAIN', width));

    return lines;
  }

  private padReceiptColumns(left: string, middle: string, right: string, width: number): string {
    const safeLeft = this.safeReceiptText(left);
    const safeMiddle = this.safeReceiptText(middle);
    const safeRight = this.safeReceiptText(right);
    const rightWidth = Math.max(10, safeRight.length);
    const middleWidth = Math.max(5, safeMiddle.length);
    const leftWidth = Math.max(8, width - rightWidth - middleWidth - 2);

    return `${safeLeft.padEnd(leftWidth, ' ')} ${safeMiddle.padStart(middleWidth, ' ')} ${safeRight.padStart(rightWidth, ' ')}`.slice(0, width);
  }

  private buildReceiptItemLine(quantity: number, unitPrice: number, total: number, width: number): string {
    const left = `${quantity} x ${this.formatReceiptCurrency(unitPrice)}`;
    const right = this.formatReceiptCurrency(total);
    const available = Math.max(1, width - right.length);
    return `${this.safeReceiptText(left).slice(0, available).padEnd(available, ' ')}${right}`;
  }

  private buildReceiptKeyValueLines(label: string, value: string | number, width: number, valueColumn: number): string[] {
    const normalizedLabel = `${this.safeReceiptText(label)}:`;
    const normalizedValue = this.safeReceiptText(value);
    const rightWidth = width - valueColumn;

    if (normalizedLabel.length >= valueColumn) {
      const wrapped = this.wrapReceiptText(normalizedValue, Math.max(width - 2, 10));
      return [
        `${normalizedLabel} ${wrapped[0] ?? ''}`.slice(0, width),
        ...wrapped.slice(1).map((line) => line.slice(0, width)),
      ];
    }

    const wrapped = this.wrapReceiptText(normalizedValue, Math.max(rightWidth, 10));
    return wrapped.map((line, index) => {
      if (index === 0) {
        return `${normalizedLabel.padEnd(valueColumn, ' ')}${line.padStart(rightWidth, ' ')}`;
      }

      return `${''.padEnd(valueColumn, ' ')}${line.padStart(rightWidth, ' ')}`;
    });
  }

  private wrapReceiptText(value: string | number, width: number): string[] {
    const text = this.safeReceiptText(value);
    if (!text) {
      return [''];
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }

      if (`${current} ${word}`.length <= width) {
        current += ` ${word}`;
        continue;
      }

      lines.push(current);
      current = word;
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  private centerReceiptText(value: string | number, width: number): string {
    const text = this.safeReceiptText(value);
    if (text.length >= width) {
      return text.slice(0, width);
    }

    const leftPadding = Math.floor((width - text.length) / 2);
    return `${' '.repeat(leftPadding)}${text}`;
  }

  private safeReceiptText(value: string | number): string {
    return String(value ?? '')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatReceiptCurrency(value: number): string {
    return `PHP ${this.extras.formatCurrency(Number(value || 0))}`;
  }

  private formatReceiptDate(value: string): string {
    return value ? this.extras.formatDateWithTime(value) : 'Date Unavailable';
  }

  private updateCategoryOptions(items: any[], reset = false) {
    const categories = new Set<string>(reset ? [] : this.salesData.categoryData);

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

    this.salesData.categoryData = Array.from(categories).sort((a, b) => a.localeCompare(b));
  }

  private normalizeCategoryValues(value: string): string[] {
    return String(value ?? '')
      .split(/[,;|]+/)
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }
}
