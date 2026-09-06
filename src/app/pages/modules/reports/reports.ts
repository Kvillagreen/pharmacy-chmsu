import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { Extras } from '../../../../extras/extras';
import { UserData } from '../../../../models/UserModel';
import { BirAnnualDeclarationData, ReportsData, ReportsRegulatedTransaction, ReportsTransactionRecord } from '../../../../models/ReportsModel';
import { BranchData } from '../../../../models/BranchModel';
import { IonIcon } from '@ionic/angular/standalone';
import jsPDF from 'jspdf';

type ReportExportType = 'branch_performance' | 'top_medicines' | 'inventory_watch' | 'recent_transactions' | 'prescribed_transactions' | 'dangerous_transactions' | 'stock_transfers';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit, OnDestroy {
  extras = Extras;
  selectedDays = 7;
  maxRevenuePoint = 0;
  maxTransactionPoint = 0;
  maxDiscountPoint = 0;
  maxInventoryStatusCount = 0;
  isLoading = true;
  currentHighlightIndex = 0;
  private highlightCarouselTimer: ReturnType<typeof setInterval> | null = null;
  isBirModalOpen = false;
  isReceiptOpen = false;
  isExportModalOpen = false;
  isExporting = false;
  selectedExportType: ReportExportType | null = null;
  exportDateForm = {
    startDate: '',
    endDate: '',
  };
  isTransactionRecordsModalOpen = false;
  isTransactionRecordsLoading = false;
  selectedRegulatedTransaction: ReportsRegulatedTransaction | null = null;
  selectedReceiptTransaction: any = null;
  voidingTransactionId: number | null = null;
  transactionRecords: ReportsTransactionRecord[] = [];
  transactionRecordsMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  };
  transactionRecordsFilters = {
    search: '',
    payment_method: '',
    classification: 'all',
    sort: 'newest',
  };
  branchData: BranchData = {
    data: [],
  };
  userData: UserData = {
    data: {},
    token: '',
  };
  birForm = {
    branch_id: '',
    year: new Date().getFullYear() - 1,
  };
  birReportData: BirAnnualDeclarationData | null = null;

  reportData: ReportsData = {
    data: {
      scope: {
        company_id: 0,
        branch_id: 0,
        days: 7,
        start_date: '',
        end_date: '',
        label: 'All Branches',
      },
      summary: {
        total_revenue: 0,
        previous_revenue: 0,
        revenue_change_pct: 0,
        transaction_count: 0,
        average_sale: 0,
        total_discount: 0,
        inventory_value: 0,
        low_stock_count: 0,
        expiring_30_count: 0,
      },
      charts: {
        daily_revenue: [],
        daily_transactions: [],
        daily_discounts: [],
        payment_mix: [],
        category_mix: [],
        inventory_status_mix: [],
      },
      tables: {
        branch_performance: [],
        top_medicines: [],
        inventory_watch: [],
        recent_transactions: [],
        prescribed_transactions: [],
        dangerous_transactions: [],
        stock_transfers: [],
      },
      analysis: {
        headline: '',
        highlights: [],
      },
    },
  };

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const storedUser = this.encryptData.decryptData('user');
    this.userData.data = storedUser ?? {};
    this.userData.token = storedUser?.token ?? '';
    this.getBranchList();
    this.getReports();
  }

  ngOnDestroy(): void {
    this.stopHighlightCarousel();
  }

  buildQuery(startDate = '', endDate = ''): string | null {
    const companyId = this.userData.data?.data?.company_id;
    const storedBranch = this.encryptData.decryptData('branch');
    const selectedBranch = Number(storedBranch?.selectedBranch ?? 0);

    if (!companyId || !this.userData.token) {
      return null;
    }

    const params = new URLSearchParams({
      company_id: String(companyId),
      branch_id: String(selectedBranch),
      days: String(this.selectedDays),
    });

    if (startDate && endDate) {
      params.set('start_date', startDate);
      params.set('end_date', endDate);
    }

    return `reports?${params.toString()}`;
  }

  async getReports() {
    this.isLoading = true;
    try {
      const endpoint = this.buildQuery();

      if (!endpoint) {
        this.extras.showToast('Reports session data is incomplete. Please log in again.', 'warning');
        return;
      }

      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        const payload = res.data;
        payload.data.tables.recent_transactions = (payload.data.tables.recent_transactions ?? []).map((item: any) => ({
          ...item,
          created_at_label: this.extras.timeAgo(item.created_at),
        }));

        this.reportData = payload;
        this.maxRevenuePoint = Math.max(
          ...this.reportData.data.charts.daily_revenue.map((item) => Number(item.total_revenue || 0)),
          1
        );
        this.maxTransactionPoint = Math.max(
          ...this.reportData.data.charts.daily_transactions.map((item) => Number(item.transaction_count || 0)),
          1
        );
        this.maxDiscountPoint = Math.max(
          ...this.reportData.data.charts.daily_discounts.map((item) => Number(item.total_discount || 0)),
          1
        );
        this.maxInventoryStatusCount = Math.max(
          ...this.reportData.data.charts.inventory_status_mix.map((item) => Number(item.count || 0)),
          1
        );
        this.currentHighlightIndex = 0;
        this.startHighlightCarousel();
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to load report data', 'warning');
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  async getBranchList() {
    try {
      const companyId = this.userData.data?.data?.company_id;
      if (!companyId) {
        return;
      }

      const res = await this.userService.getUser(`branch/${companyId}`, '', this.userData.token);
      if (res.status === 200) {
        this.branchData.data = res.data.data?.branches ?? [];

        const storedBranch = this.encryptData.decryptData('branch');
        const selectedBranch = Number(storedBranch?.selectedBranch ?? this.userData.data?.data?.branch_id ?? 0);
        this.birForm.branch_id = selectedBranch ? String(selectedBranch) : String(this.branchData.data?.[0]?.branchId ?? '');
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async changeDays(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedDays = Number(target.value);
    await this.getReports();
  }

  getBarHeight(value: number): number {
    if (!this.maxRevenuePoint) {
      return 8;
    }

    return Math.max((value / this.maxRevenuePoint) * 100, 8);
  }

  getTransactionBarHeight(value: number): number {
    if (!this.maxTransactionPoint) {
      return 8;
    }

    return Math.max((value / this.maxTransactionPoint) * 100, 8);
  }

  getPercentWidth(value: number, maxValue: number): number {
    if (!maxValue) {
      return 0;
    }

    return (value / maxValue) * 100;
  }

  getMaxByKey<T extends Record<string, any>>(rows: T[], key: keyof T): number {
    return Math.max(...rows.map((row) => Number(row[key] || 0)), 0);
  }

  isPositive(value: number): boolean {
    return Number(value) >= 0;
  }

  get currentInventoryHighlight(): string {
    const highlights = this.reportData.data.analysis.highlights ?? [];
    if (!highlights.length) {
      return 'No inventory insights available for the selected reporting window.';
    }

    return highlights[this.currentHighlightIndex] ?? highlights[0];
  }

  startHighlightCarousel(): void {
    this.stopHighlightCarousel();

    const highlights = this.reportData.data.analysis.highlights ?? [];
    if (highlights.length <= 1) {
      return;
    }

    this.highlightCarouselTimer = setInterval(() => {
      this.currentHighlightIndex = (this.currentHighlightIndex + 1) % highlights.length;
      this.cd.detectChanges();
    }, 3200);
  }

  stopHighlightCarousel(): void {
    if (this.highlightCarouselTimer) {
      clearInterval(this.highlightCarouselTimer);
      this.highlightCarouselTimer = null;
    }
  }

  setHighlightSlide(index: number): void {
    const highlights = this.reportData.data.analysis.highlights ?? [];
    if (!highlights.length) {
      return;
    }

    this.currentHighlightIndex = index % highlights.length;
    this.startHighlightCarousel();
  }

  getLineChartPoints(
    rows: Array<Record<string, any>>,
    key: string,
    width = 320,
    height = 160,
    padding = 18
  ): string {
    if (!rows.length) {
      return '';
    }

    const values = rows.map((row) => Number(row[key] ?? 0));
    const maxValue = Math.max(...values, 1);
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    return values
      .map((value, index) => {
        const x = rows.length === 1 ? width / 2 : padding + (index * innerWidth) / (rows.length - 1);
        const y = padding + innerHeight - (value / maxValue) * innerHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  getAreaChartPoints(
    rows: Array<Record<string, any>>,
    key: string,
    width = 320,
    height = 160,
    padding = 18
  ): string {
    const linePoints = this.getLineChartPoints(rows, key, width, height, padding);
    if (!linePoints) {
      return '';
    }

    const baseline = height - padding;
    const pointList = linePoints.split(' ');
    const firstX = pointList[0]?.split(',')[0] ?? `${padding}`;
    const lastX = pointList[pointList.length - 1]?.split(',')[0] ?? `${width - padding}`;

    return `${firstX},${baseline} ${linePoints} ${lastX},${baseline}`;
  }

  getInventoryStatusTone(status: string): string {
    switch (String(status ?? '').toLowerCase()) {
      case 'out of stock':
        return 'bg-red-100 text-red-700';
      case 'low stock':
        return 'bg-amber-100 text-amber-700';
      case 'expiring soon':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  recentTransactionTimeLabel(transaction: any): string {
    return transaction?.created_at_label || this.extras.timeAgo(transaction?.created_at);
  }

  exportCsv(type: ReportExportType) {
    this.openExportModal(type);
  }

  openExportModal(type: ReportExportType) {
    const today = new Date().toISOString().slice(0, 10);
    this.selectedExportType = type;
    this.exportDateForm = {
      startDate: this.reportData.data.scope.start_date || today,
      endDate: this.reportData.data.scope.end_date || today,
    };
    this.isExportModalOpen = true;
  }

  closeExportModal() {
    if (this.isExporting) {
      return;
    }

    this.isExportModalOpen = false;
    this.selectedExportType = null;
    this.exportDateForm = { startDate: '', endDate: '' };
  }

  async confirmExportCsv() {
    if (!this.selectedExportType) {
      return;
    }

    if (!this.exportDateForm.startDate || !this.exportDateForm.endDate) {
      this.extras.showToast('Please select both start date and end date.', 'warning');
      return;
    }

    if (this.exportDateForm.startDate > this.exportDateForm.endDate) {
      this.extras.showToast('Start date must be earlier than or equal to end date.', 'warning');
      return;
    }

    const endpoint = this.buildQuery(this.exportDateForm.startDate, this.exportDateForm.endDate);
    if (!endpoint) {
      this.extras.showToast('Reports session data is incomplete. Please log in again.', 'warning');
      return;
    }

    this.isExporting = true;
    try {
      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status !== 200) {
        this.extras.showToast('Failed to load export data.', 'warning');
        return;
      }

      const exportData = res.data?.data ?? this.reportData.data;
      const { rows, filename } = this.buildExportRows(
        this.selectedExportType,
        exportData.tables,
        this.exportDateForm.startDate,
        this.exportDateForm.endDate
      );

      this.downloadCsvRows(rows, filename);
      this.isExporting = false;
      this.closeExportModal();
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to export report CSV.', 'warning');
    } finally {
      this.isExporting = false;
      this.cd.detectChanges();
    }
  }

  exportTypeLabel(type = this.selectedExportType): string {
    switch (type) {
      case 'branch_performance':
        return 'Branch Performance';
      case 'top_medicines':
        return 'Top-Selling Medicines';
      case 'inventory_watch':
        return 'Inventory Watch';
      case 'recent_transactions':
        return 'Recent Transactions';
      case 'prescribed_transactions':
        return 'Prescription Transactions';
      case 'dangerous_transactions':
        return 'Dangerous Drug Transactions';
      case 'stock_transfers':
        return 'Stock Transfer Report';
      default:
        return 'Report';
    }
  }

  private buildExportRows(type: ReportExportType, tables: any, startDate: string, endDate: string): { rows: any[]; filename: string } {
    let rows: any[] = [];
    let filename = `${type}.csv`;

    if (type === 'branch_performance') {
      rows = tables.branch_performance.map((item: any) => ({
        Branch: item.branch_name,
        Revenue: item.total_revenue,
        Transactions: item.transaction_count,
        FirstCreatedAt: item.first_created_at ?? '',
        LastCreatedAt: item.last_created_at ?? '',
        FilterStartDate: startDate,
        FilterEndDate: endDate,
      }));
      filename = 'branch-performance-report.csv';
    } else if (type === 'top_medicines') {
      rows = tables.top_medicines.map((item: any) => ({
        Medicine: item.medicine_name,
        Generic: item.generic_name,
        Category: item.category,
        UnitsSold: item.quantity_sold,
        Orders: item.transactions_count,
        FirstCreatedAt: item.first_created_at ?? '',
        LastCreatedAt: item.last_created_at ?? '',
        FilterStartDate: startDate,
        FilterEndDate: endDate,
      }));
      filename = 'top-medicines-report.csv';
    } else if (type === 'inventory_watch') {
      rows = tables.inventory_watch.map((item: any) => ({
        Medicine: item.medicine_name,
        Generic: item.generic_name,
        Branch: item.branch_name,
        Stocks: item.stocks,
        ReorderLevel: item.reorder_level,
        Status: item.status,
        ExpiryDate: item.expiry_date ?? '',
        CreatedAt: item.created_at ?? '',
      }));
      filename = 'inventory-watch-report.csv';
    } else if (type === 'stock_transfers') {
      rows = tables.stock_transfers.map((item: any) => ({
        TransferId: item.inventory_transfer_id,
        Medicine: item.medicine_name,
        Generic: item.generic_name,
        BatchNumber: item.batch_number ?? '',
        FromBranch: item.from_branch_name,
        ToBranch: item.to_branch_name,
        Quantity: item.quantity,
        Status: item.status,
        RequestedBy: item.requested_by,
        ResolvedBy: item.resolved_by ?? '',
        CreatedAt: item.created_at,
        ResolvedAt: item.resolved_at ?? '',
      }));
      filename = 'stock-transfer-report.csv';
    } else if (type === 'recent_transactions') {
      rows = tables.recent_transactions.map((item: any) => ({
        TransactionId: item.transaction_id,
        Type: this.transactionClassificationLabel(item),
        Branch: item.branch_name,
        Cashier: item.cashier_name,
        Patient: item.patient_name ?? '',
        PaymentMethod: item.payment_method,
        ReferenceNumber: this.formatCsvTextCell(item.reference_number),
        TotalAmount: item.total_amount,
        Discount: item.discount,
        CreatedAt: item.created_at,
      }));
      filename = 'recent-transactions-report.csv';
    } else if (type === 'prescribed_transactions' || type === 'dangerous_transactions') {
      rows = tables[type].map((item: any) => ({
        TransactionId: item.transaction_id,
        Type: item.regulated_classification,
        Branch: item.branch_name,
        Cashier: item.cashier_name,
        Patient: item.patient_name,
        PaymentMethod: item.payment_method,
        ReferenceNumber: this.formatCsvTextCell(item.reference_number),
        TotalAmount: item.total_amount,
        CreatedAt: item.created_at,
      }));
      filename = `${type}.csv`;
    }

    filename = this.appendDateRangeToFilename(filename, startDate, endDate);

    return { rows, filename };
  }

  private formatCsvTextCell(value: unknown): string {
    const text = String(value ?? '').trim();
    return text ? `\t${text}` : '';
  }

  private downloadCsvRows(rows: any[], filename: string) {
    if (!rows.length) {
      this.extras.showToast('No rows available for CSV export', 'warning');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private appendDateRangeToFilename(filename: string, startDate: string, endDate: string): string {
    const extensionIndex = filename.lastIndexOf('.');
    const baseName = extensionIndex >= 0 ? filename.slice(0, extensionIndex) : filename;
    const extension = extensionIndex >= 0 ? filename.slice(extensionIndex) : '.csv';

    return `${baseName}-${startDate}-to-${endDate}${extension}`;
  }

  printReport() {
    window.print();
  }

  availableYears() {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, index) => currentYear - 1 - index);
  }

  async generateBirAnnualDeclaration() {
    const companyId = this.userData.data?.data?.company_id;
    const branchId = Number(this.birForm.branch_id);
    const year = Number(this.birForm.year);
    const currentYear = new Date().getFullYear();

    if (!companyId || !branchId || !year) {
        this.extras.showToast('Please select a branch and taxable year.', 'warning');
        return;
      }

    if (year >= currentYear) {
      this.extras.showToast('You can only generate the BIR 2306 summary for a completed taxable year.', 'warning');
      return;
    }

    try {
      const endpoint = `reports/bir-annual?company_id=${companyId}&branch_id=${branchId}&year=${year}`;
      const res = await this.userService.getUser(endpoint, '', this.userData.token);

      if (res.status === 200) {
        this.birReportData = res.data;
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'Failed to generate BIR 2306 summary', 'warning');
    }
  }

  printBirReport() {
    if (!this.birReportData?.data) {
      this.extras.showToast('Generate the BIR 2306 summary first.', 'warning');
      return;
    }

    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      this.extras.showToast('Unable to open print preview window.', 'warning');
      return;
    }

    popup.document.write(this.buildBirPrintDocument());
    popup.document.close();
    popup.focus();
    popup.print();
  }


  downloadBirPdf(): void {
    const report = this.birReportData?.data;

    if (!report) {
      this.extras.showToast('Generate the BIR 2306 summary first.', 'warning');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 14;
      const marginY = 16;
      const lineHeight = 5.25;
      const lines = this.buildBirPdfLines(80);

      let cursorY = marginY;

      const paintPage = () => {
        pdf.setFillColor(250, 245, 232);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.setDrawColor(171, 146, 95);
        pdf.rect(9, 9, pageWidth - 18, pageHeight - 18);
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(10.5);
        pdf.setTextColor(28, 25, 23);
      };

      paintPage();

      for (const line of lines) {
        if (cursorY > pageHeight - marginY) {
          pdf.addPage();
          paintPage();
          cursorY = marginY;
        }

        pdf.text(line, marginX, cursorY);
        cursorY += lineHeight;
      }

      pdf.save(this.buildBirPdfFilename());
    } catch (error) {
      console.error(error);
      this.extras.showToast('Failed to download BIR 2306 PDF report.', 'warning');
    }
  }

  openBirModal() {
    this.isBirModalOpen = true;
  }

  closeBirModal() {
    this.isBirModalOpen = false;
  }

  clearBirReport() {
    this.birReportData = null;
    this.isBirModalOpen = false;
  }

  async openRecentTransactionReceipt(record: any) {
    if (!record?.transaction_id) {
      this.extras.showToast('Receipt is not available for this transaction.', 'warning');
      return;
    }

    try {
      const res = await this.userService.getUser(`transaction/${record.transaction_id}`, '', this.userData.token);

      if (res.status === 200) {
        this.selectedReceiptTransaction = res.data?.data ?? null;
        this.isReceiptOpen = true;
        this.cd.detectChanges();
      }
    } catch (error) {
      console.error(error);
      this.extras.showToast('Failed to load receipt details.', 'warning');
    }
  }

  closeReceipt() {
    this.isReceiptOpen = false;
    this.selectedReceiptTransaction = null;
  }

  async openTransactionRecordsModal() {
    this.isTransactionRecordsModalOpen = true;
    this.transactionRecordsMeta.current_page = 1;
    await this.loadTransactionRecords();
  }

  closeTransactionRecordsModal() {
    this.isTransactionRecordsModalOpen = false;
  }

  async loadTransactionRecords(page = this.transactionRecordsMeta.current_page) {
    const companyId = this.userData.data?.data?.company_id;
    const storedBranch = this.encryptData.decryptData('branch');
    const selectedBranch = Number(storedBranch?.selectedBranch ?? 0);

    if (!companyId || !this.userData.token) {
      return;
    }

    this.isTransactionRecordsLoading = true;
    this.transactionRecordsMeta.current_page = page;

    try {
      const params = new URLSearchParams({
        company_id: String(companyId),
        per_page: String(this.transactionRecordsMeta.per_page),
        page: String(page),
        sort: this.transactionRecordsFilters.sort,
      });

      if (selectedBranch > 0) {
        params.set('branch_id', String(selectedBranch));
      }

      if (this.transactionRecordsFilters.search.trim()) {
        params.set('search', this.transactionRecordsFilters.search.trim());
      }

      if (this.transactionRecordsFilters.payment_method) {
        params.set('payment_method', this.transactionRecordsFilters.payment_method);
      }

      if (this.transactionRecordsFilters.classification && this.transactionRecordsFilters.classification !== 'all') {
        params.set('classification', this.transactionRecordsFilters.classification);
      }

      const res = await this.userService.getUser(`reports/transactions?${params.toString()}`, '', this.userData.token);

      if (res.status === 200) {
        this.transactionRecords = Array.isArray(res.data?.data) ? res.data.data : [];
        this.transactionRecordsMeta = {
          current_page: Number(res.data?.meta?.current_page ?? 1),
          last_page: Number(res.data?.meta?.last_page ?? 1),
          per_page: Number(res.data?.meta?.per_page ?? 10),
          total: Number(res.data?.meta?.total ?? 0),
        };
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to load transaction records.', 'warning');
    } finally {
      this.isTransactionRecordsLoading = false;
      this.cd.detectChanges();
    }
  }

  async applyTransactionRecordFilters() {
    this.transactionRecordsMeta.current_page = 1;
    await this.loadTransactionRecords(1);
  }

  async changeTransactionRecordSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.transactionRecordsFilters.search = target.value ?? '';
    await this.applyTransactionRecordFilters();
  }

  async changeTransactionRecordSelect(event: Event, key: 'payment_method' | 'classification' | 'sort') {
    const target = event.target as HTMLSelectElement;
    this.transactionRecordsFilters[key] = target.value;
    await this.applyTransactionRecordFilters();
  }

  async goToTransactionRecordsPage(page: number) {
    if (page < 1 || page > this.transactionRecordsMeta.last_page || page === this.transactionRecordsMeta.current_page) {
      return;
    }

    await this.loadTransactionRecords(page);
  }

  transactionRecordClassificationLabel(record: ReportsTransactionRecord): string {
    return this.transactionClassificationLabel(record);
  }

  transactionClassificationLabel(record: { regulated_classification?: string | null }): string {
    if (!record.regulated_classification) {
      return 'Regular';
    }

    switch (record.regulated_classification) {
      case 'controlled':
        return 'Prescription';
      case 'dangerous':
        return 'Dangerous Drug';
      case 'mixed':
        return 'Mixed Regulated';
      default:
        return record.regulated_classification;
    }
  }

  transactionRecordClassificationClass(record: ReportsTransactionRecord): string {
    return this.transactionClassificationClass(record);
  }

  isTransactionVoided(record: ReportsTransactionRecord): boolean {
    return String(record?.status ?? '').toLowerCase() === 'voided';
  }

  async voidTransaction(record: ReportsTransactionRecord) {
    if (!record?.transaction_id || this.isTransactionVoided(record)) {
      return;
    }

    const confirmed = confirm(`Void transaction #${record.transaction_id}? This will restore the deducted stock.`);
    if (!confirmed) {
      return;
    }

    this.voidingTransactionId = Number(record.transaction_id);

    try {
      const res = await this.userService.postUser(
        `transaction/${record.transaction_id}/void`,
        { void_reason: 'Voided from transaction records.' },
        this.userData.token
      );

      if (res.status === 200 && res.data?.success) {
        this.extras.showToast('Transaction voided successfully.', 'success');
        await this.loadTransactionRecords(this.transactionRecordsMeta.current_page);
        return;
      }

      this.extras.showToast(res.data?.message ?? 'Unable to void transaction.', 'warning');
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'Unable to void transaction.', 'warning');
    } finally {
      this.voidingTransactionId = null;
      this.cd.detectChanges();
    }
  }

  transactionClassificationClass(record: { regulated_classification?: string | null }): string {
    if (!record.regulated_classification) {
      return 'bg-slate-100 text-slate-700';
    }

    switch (record.regulated_classification) {
      case 'controlled':
        return 'bg-blue-100 text-blue-700';
      case 'dangerous':
        return 'bg-red-100 text-red-700';
      case 'mixed':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  receiptPreviewLines(): string[] {
    return this.buildReceiptTextLines(this.selectedReceiptTransaction, 40);
  }

  downloadReceipt(transaction?: any) {
    const receipt = transaction ?? this.selectedReceiptTransaction;
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

  openRegulatedTransaction(record: ReportsRegulatedTransaction) {
    this.selectedRegulatedTransaction = record;
  }

  closeRegulatedTransaction() {
    this.selectedRegulatedTransaction = null;
  }

  regulatedTransactionTimeLabel(transaction: ReportsRegulatedTransaction): string {
    return this.extras.timeAgo(transaction?.created_at);
  }

  regulatedDetailEntries(record: ReportsRegulatedTransaction | null): Array<{ label: string; value: string }> {
    if (!record?.regulated_details) {
      return [];
    }

    const details = record.regulated_details ?? {};
    const sharedDefinitions: Array<[string, any]> = [
      ['Classification', details['classification']],
      ['Patient Name', details['patient_name']],
      ['Patient Address', details['patient_address']],
      ['Contact Number', details['patient_contact_number']],
      ['Valid ID Number', details['patient_id_number']],
      ['Prescriber / Physician', details['prescriber_name']],
    ];

    const prescriptionDetails = details['prescription_details'] ?? details;
    const dangerousDetails = details['dangerous_drug_details'] ?? details;

    const prescriptionDefinitions: Array<[string, any]> = [
      ['Patient Age', prescriptionDetails['patient_age']],
      ['PRC License Number', prescriptionDetails['prescriber_prc_license_number']],
      ['Generic Name', prescriptionDetails['generic_name']],
      ['Brand Name', prescriptionDetails['brand_name']],
      ['Dosage Strength', prescriptionDetails['dosage_strength']],
      ['Dosage Form', prescriptionDetails['dosage_form']],
      ['Quantity Dispensed', prescriptionDetails['quantity_dispensed']],
      ['Dispensing Date', prescriptionDetails['dispensing_date']],
      ['Pharmacist Signature', prescriptionDetails['pharmacist_signature']],
    ];

    const dangerousDefinitions: Array<[string, any]> = [
      ['Clinic Address', dangerousDetails['prescriber_clinic_address']],
      ['S-2 License Number', dangerousDetails['prescriber_s2_license_number']],
      ['PTR Number', dangerousDetails['prescriber_ptr_number']],
      ['Yellow Prescription Serial Number', dangerousDetails['yellow_prescription_serial_number']],
      ['Quantity in Words', dangerousDetails['quantity_in_words']],
      ['Quantity in Figures', dangerousDetails['quantity_in_figures']],
      ['Total Dosage', dangerousDetails['total_dosage']],
      ['Treatment Duration', dangerousDetails['treatment_duration']],
      ['Receiver Name', dangerousDetails['receiver_name']],
      ['Receiver Signature', dangerousDetails['receiver_signature']],
    ];

    const definitions: Array<[string, any]> = [...sharedDefinitions];

    if (details['has_prescription_details']) {
      definitions.push(...prescriptionDefinitions);
    }

    if (details['has_dangerous_drug_details']) {
      definitions.push(...dangerousDefinitions);
    }

    return definitions
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(([label, value]) => ({ label: String(label), value: String(value) }));
  }

  private buildBirPrintDocument() {
    const report = this.birReportData?.data;
    if (!report) {
      return '';
    }

    const notes = report.data_notes.map((note) => `<li>${note}</li>`).join('');

    return `
      <html>
        <head>
          <title>BIR Form 2306 Payment Summary</title>
          <style>
            body { font-family: "Courier New", monospace; padding: 24px; color: #0f172a; }
            .receipt { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 24px; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #94a3b8; margin: 16px 0; }
            .row { display: flex; justify-content: space-between; gap: 16px; margin: 8px 0; }
            .label { color: #475569; }
            .value { font-weight: bold; text-align: right; }
            .total { font-size: 18px; }
            ul { padding-left: 18px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div>BIR FORM ${report.form_no}</div>
              <h2>BIR 2306 Payment Summary</h2>
              <div>Generated ${new Date(report.generated_at).toLocaleString()}</div>
            </div>
            <div class="line"></div>
            <div class="row"><span class="label">Taxpayer</span><span class="value">${report.taxpayer_name}</span></div>
            <div class="row"><span class="label">TIN</span><span class="value">${report.tin_number ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Return Period</span><span class="value">${report.return_period ? this.extras.formatDate(report.return_period) : report.taxable_year}</span></div>
            <div class="row"><span class="label">Due Date</span><span class="value">${report.due_date ? this.extras.formatDate(report.due_date) : 'N/A'}</span></div>
            <div class="row"><span class="label">Branch</span><span class="value">${report.branch_name}</span></div>
            <div class="row"><span class="label">ATC</span><span class="value">${report.atc ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Tax Type Code</span><span class="value">${report.tax_type_code ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Payment Type</span><span class="value">${report.type_of_payment ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Line of Business</span><span class="value">${report.line_of_business ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Telephone Number</span><span class="value">${report.telephone_number ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Registered Address</span><span class="value">${report.registered_address ?? 'N/A'}</span></div>
            <div class="line"></div>
            <div class="row"><span class="label">Basic Tax / Deposit / Advance Payment</span><span class="value">Php ${this.extras.formatCurrency(report.basic_tax_payment ?? report.income_tax_due)}</span></div>
            <div class="row"><span class="label">Surcharge</span><span class="value">Php ${this.extras.formatCurrency(report.surcharge ?? 0)}</span></div>
            <div class="row"><span class="label">Interest</span><span class="value">Php ${this.extras.formatCurrency(report.interest ?? 0)}</span></div>
            <div class="row"><span class="label">Compromise</span><span class="value">Php ${this.extras.formatCurrency(report.compromise ?? 0)}</span></div>
            <div class="row"><span class="label">Gross Sales / Receipts Reference</span><span class="value">Php ${this.extras.formatCurrency(report.gross_sales_receipts)}</span></div>
            <div class="row"><span class="label">Net Sales / Receipts Reference</span><span class="value">Php ${this.extras.formatCurrency(report.net_sales_receipts)}</span></div>
            <div class="row total"><span class="label">Computed Annual Tax Due Reference</span><span class="value">Php ${this.extras.formatCurrency(report.income_tax_due)}</span></div>
            <div class="row total"><span class="label">Total Amount Payable</span><span class="value">Php ${this.extras.formatCurrency(report.total_amount_payable ?? report.income_tax_due)}</span></div>
            <div class="line"></div>
            <h4>Notes</h4>
            <ul>${notes}</ul>
          </div>
        </body>
      </html>
    `;
  }

  private buildBirPdfFilename(): string {
    const report = this.birReportData?.data;
    if (!report) {
      return 'BIR-2306-Payment-Summary.pdf';
    }

    const safeName = String(report.taxpayer_name ?? 'Taxpayer')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    return `BIR-2306-${report.taxable_year}-${safeName || 'Taxpayer'}.pdf`;
  }

  private buildBirPdfLines(width: number): string[] {
    const report = this.birReportData?.data;
    if (!report) {
      return [];
    }

    const lines: string[] = [];
    const divider = '='.repeat(width);
    const sectionDivider = '-'.repeat(width);
    const valueColumn = 54;

    lines.push(this.centerBirText(`BIR FORM ${this.safeBirText(report.form_no || 'N/A')}`, width));
    lines.push(this.centerBirText('PAYMENT FORM SUMMARY', width));
    lines.push(this.centerBirText(`Generated ${this.formatBirGeneratedAt(report.generated_at)}`, width));
    lines.push(divider);
    lines.push(...this.buildBirKeyValueLines('Taxpayer', report.taxpayer_name, width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('TIN', report.tin_number || 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Return Period', report.return_period ? this.extras.formatDate(report.return_period) : report.taxable_year, width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Due Date', report.due_date ? this.extras.formatDate(report.due_date) : 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Branch', report.branch_name, width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('ATC', report.atc || 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Tax Type Code', report.tax_type_code || 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Payment Type', report.type_of_payment || 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Line of Business', report.line_of_business || 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Telephone Number', report.telephone_number || 'N/A', width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Registered Address', report.registered_address || 'N/A', width, valueColumn));
    lines.push(sectionDivider);
    lines.push(...this.buildBirKeyValueLines('Basic Tax / Deposit / Advance Payment', this.formatBirCurrency(report.basic_tax_payment ?? report.income_tax_due), width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Surcharge', this.formatBirCurrency(report.surcharge ?? 0), width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Interest', this.formatBirCurrency(report.interest ?? 0), width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Compromise', this.formatBirCurrency(report.compromise ?? 0), width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Gross Sales / Receipts Reference', this.formatBirCurrency(report.gross_sales_receipts), width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Net Sales / Receipts Reference', this.formatBirCurrency(report.net_sales_receipts), width, valueColumn));
    lines.push(sectionDivider);
    lines.push(...this.buildBirKeyValueLines('Computed Annual Tax Due Reference', this.formatBirCurrency(report.income_tax_due), width, valueColumn));
    lines.push(...this.buildBirKeyValueLines('Total Amount Payable', this.formatBirCurrency(report.total_amount_payable ?? report.income_tax_due), width, valueColumn));

    if (report.data_notes?.length) {
      lines.push(sectionDivider);
      lines.push('COMPLIANCE NOTES');

      report.data_notes.forEach((note, index) => {
        lines.push(...this.wrapBirText(`(${index + 1}) ${this.safeBirText(note)}`, width));
      });
    }

    lines.push(divider);
    lines.push(this.centerBirText('END OF REPORT', width));

    return lines;
  }

  private buildBirKeyValueLines(label: string, value: string | number, width: number, valueColumn: number): string[] {
    const normalizedLabel = `${this.safeBirText(label)}:`;
    const normalizedValue = this.safeBirText(value);
    const rightWidth = width - valueColumn;

    if (normalizedLabel.length >= valueColumn) {
      const wrapped = this.wrapBirText(normalizedValue, Math.max(width - 2, 10));
      return [
        `${normalizedLabel} ${wrapped[0] ?? ''}`.slice(0, width),
        ...wrapped.slice(1).map((line) => line.slice(0, width)),
      ];
    }

    const wrapped = this.wrapBirText(normalizedValue, Math.max(rightWidth, 10));
    return wrapped.map((line, index) => {
      if (index === 0) {
        return `${normalizedLabel.padEnd(valueColumn, ' ')}${line.padStart(rightWidth, ' ')}`;
      }

      return `${''.padEnd(valueColumn, ' ')}${line.padStart(rightWidth, ' ')}`;
    });
  }

  private wrapBirText(value: string, width: number): string[] {
    const text = this.safeBirText(value);
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

  private centerBirText(value: string, width: number): string {
    const text = this.safeBirText(value);
    if (text.length >= width) {
      return text.slice(0, width);
    }

    const leftPadding = Math.floor((width - text.length) / 2);
    return `${' '.repeat(leftPadding)}${text}`;
  }

  private safeBirText(value: string | number): string {
    return String(value ?? '')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatBirCurrency(value: number): string {
    return `PHP ${this.extras.formatCurrency(Number(value || 0))}`;
  }

  private formatBirPercent(value: number): string {
    return `${(Number(value || 0) * 100).toFixed(2)}%`;
  }

  private formatBirGeneratedAt(value: string): string {
    return value ? this.extras.formatDateWithTime(value) : 'Date Unavailable';
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
    const companyName = this.safeReceiptText(this.userData.data?.data?.company_name || 'Sto. Rosario Drug Store');
    const branchName = this.safeReceiptText(receipt?.branch?.branch_name || receipt?.branch_name || 'Assigned Branch');
    const branchAddress = this.safeReceiptText(receipt?.branch?.branch_address || this.userData.data?.data?.branch_address || '');
    const branchContact = this.safeReceiptText(receipt?.branch?.branch_contact || this.userData.data?.data?.branch_contact || '');
    const cashierName = this.safeReceiptText(
      `${receipt?.user?.first_name || ''} ${receipt?.user?.last_name || ''}`.trim() ||
      receipt?.cashier_name ||
      'Unknown Cashier'
    );
    const items = Array.isArray(receipt?.items) ? receipt.items : [];
    const transactionType = this.safeReceiptText(receipt?.transaction_type || 'regular').toUpperCase();
    const pharmacistName = this.getReceiptPharmacistName(receipt);

    lines.push(this.centerReceiptText(companyName, width));
    lines.push(this.centerReceiptText(branchName, width));
    if (branchAddress) {
      lines.push(...this.wrapReceiptText(branchAddress, width));
    }
    if (branchContact) {
      lines.push(this.centerReceiptText(`Contact: ${branchContact}`, width));
    }
    lines.push(this.centerReceiptText('OFFICIAL SALES RECEIPT', width));
    lines.push(divider);
    lines.push(...this.buildReceiptKeyValueLines('Receipt No', receipt?.transaction_id ?? 'N/A', width, 18));
    lines.push(...this.buildReceiptKeyValueLines('Date', this.formatReceiptDate(receipt?.created_at), width, 18));
    lines.push(...this.buildReceiptKeyValueLines('Cashier', cashierName, width, 18));
    if (pharmacistName) {
      lines.push(...this.buildReceiptKeyValueLines('Pharmacist', pharmacistName, width, 18));
    }
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
      const batchNumber = item?.batch_number || item?.batch?.batch_number || item?.batch_id || '';
      if (batchNumber) {
        lines.push(...this.buildReceiptKeyValueLines('Batch', batchNumber, width, 12));
      }
      const mfgDate = item?.mfg_date || item?.batch?.mfg_date;
      if (mfgDate) {
        lines.push(...this.buildReceiptKeyValueLines('Mfg', this.formatReceiptShortDate(mfgDate), width, 12));
      }
      const expiryDate = item?.expiry_date || item?.batch?.expiry_date;
      if (expiryDate) {
        lines.push(...this.buildReceiptKeyValueLines('Expiry', this.formatReceiptShortDate(expiryDate), width, 12));
      }
      lines.push(this.buildReceiptItemLine(quantity, unitPrice, lineTotal, width));
    });

    lines.push(sectionDivider);
    lines.push(...this.buildReceiptKeyValueLines('Subtotal', this.formatReceiptCurrency(receipt?.sub_total), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('Discount', this.formatReceiptCurrency(receipt?.discount), width, 20));
    lines.push(...this.buildReceiptKeyValueLines('VAT 12%', this.formatReceiptCurrency(receipt?.vat_amount), width, 20));
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

  private getReceiptPharmacistName(receipt: any): string {
    return this.safeReceiptText(
      receipt?.pharmacist_signature ||
      receipt?.regulated_details?.prescription_details?.pharmacist_signature ||
      receipt?.regulated_details?.pharmacist_signature ||
      ''
    );
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

  private formatReceiptShortDate(value: string): string {
    return value ? this.extras.formatDate(value) : 'N/A';
  }
}
