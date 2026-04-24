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
    },
    {
      type: 'Card',
      icon: 'card-outline',
    },
    {
      type: 'Gcash',
      icon: 'phone-portrait-outline',
    },
  ];

  transactionTypeOptions = [
    { value: 'regular', label: 'Regular', icon: 'checkbox-outline', note: 'No extra documents required.' },
    { value: 'hmo', label: 'HMO', icon: 'business-outline', note: 'Requires provider, member info, and documents.' },
    { value: 'philhealth', label: 'PhilHealth', icon: 'shield-checkmark-outline', note: 'Requires member info and documents.' },
    { value: 'yakap', label: 'Yakap', icon: 'people-outline', note: 'Only Yakap eligible medicines can be selected.' },
  ];

  hmoProviderOptions = [
    'Maxicare',
    'Medicard',
    'Intellicare',
    'Etiqa',
    'Avega',
    'Cocolife',
    'Valucare',
    'PhilHealth',
  ];

  stockMap: { [key: number]: any } = {};
  onLoad = signal(false);
  isDiscount = signal(false);
  isPay = signal(false);
  isReceiptOpen = signal(false);
  pageNumber = 1;
  sort = '';
  searchQuery = '';
  extras = Extras;
  endpoint = 'transaction';
  lastReceipt: any = null;
  prescriptionFile: File | null = null;
  memberIdImageFile: File | null = null;
  submitDocumentsLater = false;

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.loadSales();
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
      used_amount: 0,
      items: [],
      request_token: '',
      transaction_type: 'regular',
      hmo_provider: '',
      patient_name: '',
      membership_id: '',
      coverage_type: 'full',
      documents_submitted: false,
      prescription_path: '',
      member_id_image_path: '',
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

  getUniqueCategories(): string[] {
    if (!this.medicineData.data?.data) return [];

    const normalize = (str: string) => {
      if (!str) return '';
      let cleaned = str.toLowerCase().replace(/\s+/g, '');
      if (cleaned.endsWith('s')) cleaned = cleaned.slice(0, -1);
      return cleaned;
    };

    const seen = new Set<string>();
    const uniqueCategories: string[] = [];

    for (const item of this.medicineData.data.data) {
      const raw = item.category || '';
      const norm = normalize(raw);

      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueCategories.push(raw);
      }
    }

    return uniqueCategories;
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
    if (saved) {
      this.medicineData.salesData = JSON.parse(saved);
    }
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
    if ((action === 'addSale' || action === 'minusStock') && !this.canSelectMedicine(data)) {
      Extras.showToast('Only Yakap eligible medicines can be selected for Yakap transactions.', 'warning');
      return;
    }

    const sales = this.medicineData.salesData;
    const stockItem = this.stockMap[data.medicine_id];
    let salesItem = sales.find((x: any) => x.medicine_id === data.medicine_id);

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
          this.removeSale(data.medicine_id);
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
        this.removeSale(data.medicine_id);
        break;
    }

    if (salesItem) {
      this.updateTotal(salesItem);
    }

    this.syncStocksWithSales();
    this.customDiscountPrice(null);
    this.saveSales();
    this.cd.detectChanges();
  }

  getStock(medicineId: number): number {
    const stockItem = this.stockMap[medicineId];
    if (!stockItem) return 0;
    return stockItem.stocks || 0;
  }

  removeSale(medicine_id: number) {
    this.medicineData.salesData = this.medicineData.salesData.filter(
      (x: any) => x.medicine_id !== medicine_id
    );
  }

  saveSales() {
    this.encryptData.encryptAndStoreData('sales', JSON.stringify(this.medicineData.salesData));
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

  onManualQtyChange(event: any, data: any) {
    let newQty = Number(event.target.value);
    if (isNaN(newQty) || newQty < 0) newQty = 0;

    if (this.salesData.selectedTransaction === 'yakap' && !data?.is_yakap_eligible && newQty > 0) {
      Extras.showToast('Only Yakap eligible medicines can be selected for Yakap transactions.', 'warning');
      event.target.value = data.quantity || 0;
      return;
    }

    const stockItem = this.stockMap[data.medicine_id];
    if (!stockItem) return;

    const oldQty = data.quantity || 0;
    const diff = newQty - oldQty;

    if (diff > 0 && stockItem.stocks < diff) {
      newQty = oldQty + stockItem.stocks;
    }

    data.quantity = newQty;

    if (data.quantity <= 0) {
      this.removeSale(data.medicine_id);
    }

    this.syncStocksWithSales();
    this.saveSales();
  }

  async getMedicine() {
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(endpoint, null, this.userData.token);

      if (res.status === 200) {
        const apiData = res.data.data || [];

        apiData.forEach((item: any) => {
          const existing = this.stockMap[item.medicine_id];

          if (!existing) {
            this.stockMap[item.medicine_id] = {
              ...item,
              original_stock: item.stocks,
            };
          } else {
            this.stockMap[item.medicine_id] = {
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
            ...this.stockMap[item.medicine_id],
          })),
        };

        if (!this.onLoad()) {
          this.salesData.categoryData = this.getUniqueCategories();
          this.onLoad.set(true);
        }

        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
    }
  }

  syncStocksWithSales() {
    Object.values(this.stockMap).forEach((item: any) => {
      item.stocks = item.original_stock ?? 0;
    });

    this.medicineData.salesData.forEach((sale: any) => {
      const stockItem = this.stockMap[sale.medicine_id];

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

  setTransactionType(type: string) {
    if (type === this.salesData.selectedTransaction) {
      return;
    }

    if (type === 'yakap') {
      const hasInvalidMedicines = this.medicineData.salesData.some((item: any) => !item?.is_yakap_eligible);
      if (hasInvalidMedicines) {
        Extras.showToast('Remove non-Yakap medicines from the cart before switching to Yakap.', 'warning');
        return;
      }
    }

    this.salesData.selectedTransaction = type;
    this.salesModel.transaction_type = type;

    if (type === 'philhealth') {
      this.salesModel.hmo_provider = 'PhilHealth';
    } else if (type !== 'hmo') {
      this.salesModel.hmo_provider = '';
    }

    if (type === 'regular') {
      this.clearTransactionDocuments();
      this.salesModel.patient_name = '';
      this.salesModel.membership_id = '';
      this.salesModel.coverage_type = 'full';
      this.submitDocumentsLater = false;
    }

    if (type === 'yakap') {
      this.salesModel.patient_name = '';
      this.salesModel.membership_id = '';
      this.salesModel.coverage_type = '';
      this.salesModel.hmo_provider = '';
      this.submitDocumentsLater = false;
    } else {
    }

    this.updateDocumentStatus();
    this.cd.detectChanges();
  }

  isRegularTransaction(): boolean {
    return this.salesData.selectedTransaction === 'regular';
  }

  isInsuranceTransaction(): boolean {
    return this.salesData.selectedTransaction === 'hmo' || this.salesData.selectedTransaction === 'philhealth';
  }

  isYakapTransaction(): boolean {
    return this.salesData.selectedTransaction === 'yakap';
  }

  canSelectMedicine(medicine: any): boolean {
    if (this.salesData.selectedTransaction !== 'yakap') {
      return true;
    }

    return Boolean(medicine?.is_yakap_eligible);
  }

  onDocumentSelected(event: Event, type: 'prescription' | 'member_id_image') {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    if (type === 'prescription') {
      this.prescriptionFile = file;
    } else {
      this.memberIdImageFile = file;
    }

    if (file && this.isInsuranceTransaction()) {
      this.submitDocumentsLater = false;
    }

    this.updateDocumentStatus();
  }

  removeSelectedDocument(type: 'prescription' | 'member_id_image') {
    if (type === 'prescription') {
      this.prescriptionFile = null;
    } else {
      this.memberIdImageFile = null;
    }

    this.updateDocumentStatus();
  }

  clearTransactionDocuments() {
    this.prescriptionFile = null;
    this.memberIdImageFile = null;
    this.updateDocumentStatus();
  }

  updateDocumentStatus() {
    if (this.isRegularTransaction()) {
      this.salesModel.documents_submitted = false;
      return;
    }

    if (this.isInsuranceTransaction() && this.submitDocumentsLater && !this.prescriptionFile && !this.memberIdImageFile) {
      this.salesModel.documents_submitted = false;
      return;
    }

    this.salesModel.documents_submitted = Boolean(this.prescriptionFile && this.memberIdImageFile);
  }

  documentStatusLabel(): string {
    if (this.isRegularTransaction()) {
      return 'No documents required';
    }

    if (this.isInsuranceTransaction() && this.submitDocumentsLater && !this.salesModel.documents_submitted) {
      return 'Documents will be submitted later';
    }

    return this.salesModel.documents_submitted ? 'Documents submitted' : 'Pending required documents';
  }

  documentStatusClass(): string {
    if (this.isRegularTransaction()) {
      return 'bg-slate-100 text-slate-700';
    }

    if (this.isInsuranceTransaction() && this.submitDocumentsLater && !this.salesModel.documents_submitted) {
      return 'bg-sky-100 text-sky-700';
    }

    return this.salesModel.documents_submitted
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';
  }

  selectedFileName(type: 'prescription' | 'member_id_image'): string {
    const file = type === 'prescription' ? this.prescriptionFile : this.memberIdImageFile;
    return file?.name || 'No file selected';
  }

  setInsuranceDocumentMode(mode: 'now' | 'later') {
    if (!this.isInsuranceTransaction()) {
      return;
    }

    this.submitDocumentsLater = mode === 'later';

    if (this.submitDocumentsLater) {
      this.clearTransactionDocuments();
    } else {
      this.updateDocumentStatus();
    }
  }

  shouldShowDocumentUploader(): boolean {
    if (this.isYakapTransaction()) {
      return true;
    }

    if (!this.isInsuranceTransaction()) {
      return false;
    }

    return !this.submitDocumentsLater || Boolean(this.prescriptionFile || this.memberIdImageFile);
  }

  private validateTransactionDetails(): boolean {
    const transactionType = this.salesData.selectedTransaction || 'regular';
    this.salesModel.transaction_type = transactionType;

    if (transactionType === 'hmo' || transactionType === 'philhealth') {
      if (!this.salesModel.hmo_provider) {
        this.extras.showToast('Provider is required for this transaction type.', 'warning');
        return false;
      }

      if (!this.salesModel.patient_name?.trim()) {
        this.extras.showToast('Patient name is required.', 'warning');
        return false;
      }

      if (!this.salesModel.membership_id?.trim()) {
        this.extras.showToast('Membership ID is required.', 'warning');
        return false;
      }

      if (!this.salesModel.coverage_type) {
        this.extras.showToast('Coverage type is required.', 'warning');
        return false;
      }

      if ((this.prescriptionFile && !this.memberIdImageFile) || (!this.prescriptionFile && this.memberIdImageFile)) {
        this.extras.showToast('Please upload both the prescription and member ID together.', 'warning');
        return false;
      }

      if (!this.submitDocumentsLater && (!this.prescriptionFile || !this.memberIdImageFile)) {
        this.extras.showToast('Prescription and ID document are required.', 'warning');
        return false;
      }
    }

    if (transactionType === 'yakap') {
      if (!this.salesModel.patient_name?.trim()) {
        this.extras.showToast('Full name is required for Yakap transactions.', 'warning');
        return false;
      }

      if (!this.salesModel.membership_id?.trim()) {
        this.extras.showToast('ID number is required for Yakap transactions.', 'warning');
        return false;
      }

      if (!this.prescriptionFile || !this.memberIdImageFile) {
        this.extras.showToast('Prescription and ID photo are required for Yakap transactions.', 'warning');
        return false;
      }

      const hasInvalidItems = this.medicineData.salesData.some((item: any) => !item?.is_yakap_eligible);
      if (hasInvalidItems) {
        this.extras.showToast('Only Yakap eligible medicines can be checked out as Yakap.', 'warning');
        return false;
      }
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

    this.salesModel.items = items;
    this.salesModel.user_id = this.userData.data.data.user_id;
    this.salesModel.branch_id = this.getSelectedBranchId();
    this.salesModel.request_token = crypto.randomUUID();
    this.salesModel.change = this.extras.computeChange(
      Number(this.salesModel.total_amount),
      Number(this.salesModel.used_amount)
    );
    this.salesModel.transaction_type = this.salesData.selectedTransaction || 'regular';
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
      discount: this.salesModel.discount ?? 0,
      discount_type: this.salesModel.discount_type ?? '',
      scpwd_id_number: this.salesModel.scpwd_id_number ?? '',
      hmo_provider: this.salesModel.hmo_provider ?? '',
      patient_name: this.salesModel.patient_name ?? '',
      membership_id: this.salesModel.membership_id ?? '',
      coverage_type: this.salesModel.coverage_type ?? '',
      documents_submitted: this.salesModel.documents_submitted ? '1' : '0',
      request_token: this.salesModel.request_token,
    };

    Object.entries(scalarEntries).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });

    items.forEach((item: { medicine_id: number; quantity: number }, index: number) => {
      formData.append(`items[${index}][medicine_id]`, String(item.medicine_id));
      formData.append(`items[${index}][quantity]`, String(item.quantity));
    });

    if (this.prescriptionFile) {
      formData.append('prescription', this.prescriptionFile);
    }

    if (this.memberIdImageFile) {
      formData.append('member_id_image', this.memberIdImageFile);
    }

    return formData;
  }

  async pay() {
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
    this.prescriptionFile = null;
    this.memberIdImageFile = null;
    this.submitDocumentsLater = false;
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

    if (receipt?.hmo_provider) {
      lines.push(...this.buildReceiptKeyValueLines('Provider', receipt.hmo_provider, width, 18));
    }

    if (receipt?.coverage_type) {
      lines.push(...this.buildReceiptKeyValueLines('Coverage', receipt.coverage_type, width, 18));
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
    lines.push(...this.buildReceiptKeyValueLines('Cash', this.formatReceiptCurrency(receipt?.used_amount), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('Change', this.formatReceiptCurrency(receipt?.change), width, 20));

    if (receipt?.documents_submitted) {
      lines.push(...this.buildReceiptKeyValueLines('Docs', 'SUBMITTED', width, 20));
    } else if (receipt?.transaction_type === 'hmo' || receipt?.transaction_type === 'philhealth') {
      lines.push(...this.buildReceiptKeyValueLines('Docs', 'TO FOLLOW', width, 20));
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
}
