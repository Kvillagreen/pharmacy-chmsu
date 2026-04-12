import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { Extras } from '../../../../extras/extras';
import { UserData } from '../../../../models/UserModel';
import { BirAnnualDeclarationData, ReportsData } from '../../../../models/ReportsModel';
import { BranchData } from '../../../../models/BranchModel';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  extras = Extras;
  selectedDays = 30;
  maxRevenuePoint = 0;
  isBirModalOpen = false;
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
        days: 30,
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
        payment_mix: [],
        category_mix: [],
      },
      tables: {
        branch_performance: [],
        top_medicines: [],
        inventory_watch: [],
        recent_transactions: [],
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
  ) {}

  ngOnInit(): void {
    const storedUser = this.encryptData.decryptData('user');
    this.userData.data = storedUser ?? {};
    this.userData.token = storedUser?.token ?? '';
    this.getBranchList();
    this.getReports();
  }

  buildQuery(): string | null {
    const companyId = this.userData.data?.data?.company_id;
    const storedBranch = this.encryptData.decryptData('branch');
    const selectedBranch = Number(storedBranch?.selectedBranch ?? 0);

    if (!companyId || !this.userData.token) {
      return null;
    }

    return `reports?company_id=${companyId}&branch_id=${selectedBranch}&days=${this.selectedDays}`;
  }

  async getReports() {
    try {
      const endpoint = this.buildQuery();

      if (!endpoint) {
        this.extras.showToast('Reports session data is incomplete. Please log in again.', 'warning');
        return;
      }

      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        this.reportData = res.data;
        this.maxRevenuePoint = Math.max(
          ...this.reportData.data.charts.daily_revenue.map((item) => Number(item.total_revenue || 0)),
          1
        );
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to load report data', 'warning');
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

  exportCsv(type: 'branch_performance' | 'top_medicines' | 'inventory_watch' | 'recent_transactions') {
    const tables = this.reportData.data.tables;
    let rows: any[] = [];
    let filename = `${type}.csv`;

    if (type === 'branch_performance') {
      rows = tables.branch_performance.map((item) => ({
        Branch: item.branch_name,
        Revenue: item.total_revenue,
        Transactions: item.transaction_count,
      }));
      filename = 'branch-performance-report.csv';
    } else if (type === 'top_medicines') {
      rows = tables.top_medicines.map((item) => ({
        Medicine: item.medicine_name,
        Generic: item.generic_name,
        Category: item.category,
        UnitsSold: item.quantity_sold,
        Orders: item.transactions_count,
      }));
      filename = 'top-medicines-report.csv';
    } else if (type === 'inventory_watch') {
      rows = tables.inventory_watch.map((item) => ({
        Medicine: item.medicine_name,
        Generic: item.generic_name,
        Branch: item.branch_name,
        Stocks: item.stocks,
        ReorderLevel: item.reorder_level,
        Status: item.status,
        ExpiryDate: item.expiry_date ?? '',
      }));
      filename = 'inventory-watch-report.csv';
    } else if (type === 'recent_transactions') {
      rows = tables.recent_transactions.map((item) => ({
        TransactionId: item.transaction_id,
        Branch: item.branch_name,
        Cashier: item.cashier_name,
        PaymentMethod: item.payment_method,
        TotalAmount: item.total_amount,
        Discount: item.discount,
        CreatedAt: item.created_at,
      }));
      filename = 'recent-transactions-report.csv';
    }

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
      this.extras.showToast('You can only generate the report for a completed taxable year.', 'warning');
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
      this.extras.showToast(e?.error?.message ?? 'Failed to generate BIR annual declaration', 'warning');
    }
  }

  printBirReport() {
    if (!this.birReportData?.data) {
      this.extras.showToast('Generate the BIR declaration first.', 'warning');
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

  downloadBirPdf() {
    this.printBirReport();
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

  private buildBirPrintDocument() {
    const report = this.birReportData?.data;
    if (!report) {
      return '';
    }

    const notes = report.data_notes.map((note) => `<li>${note}</li>`).join('');

    return `
      <html>
        <head>
          <title>BIR Annual Tax Declaration</title>
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
              <h2>Annual Tax Declaration Summary</h2>
              <div>Generated ${new Date(report.generated_at).toLocaleString()}</div>
            </div>
            <div class="line"></div>
            <div class="row"><span class="label">Taxpayer</span><span class="value">${report.taxpayer_name}</span></div>
            <div class="row"><span class="label">TIN</span><span class="value">${report.tin_number ?? 'N/A'}</span></div>
            <div class="row"><span class="label">Taxable Year</span><span class="value">${report.taxable_year}</span></div>
            <div class="row"><span class="label">Branch</span><span class="value">${report.branch_name}</span></div>
            <div class="line"></div>
            <div class="row"><span class="label">Gross Sales/Receipts</span><span class="value">Php ${this.extras.formatCurrency(report.gross_sales_receipts)}</span></div>
            <div class="row"><span class="label">Less: Sales Discounts</span><span class="value">Php ${this.extras.formatCurrency(report.sales_discounts)}</span></div>
            <div class="row"><span class="label">Net Sales/Receipts</span><span class="value">Php ${this.extras.formatCurrency(report.net_sales_receipts)}</span></div>
            <div class="row"><span class="label">Less: Cost of Sales</span><span class="value">Php ${this.extras.formatCurrency(report.cost_of_sales)}</span></div>
            <div class="row"><span class="label">Gross Income</span><span class="value">Php ${this.extras.formatCurrency(report.gross_income)}</span></div>
            <div class="row"><span class="label">Less: Deductions</span><span class="value">Php ${this.extras.formatCurrency(report.deductions)}</span></div>
            <div class="row total"><span class="label">Taxable Net Income</span><span class="value">Php ${this.extras.formatCurrency(report.taxable_net_income)}</span></div>
            <div class="row total"><span class="label">Income Tax Due (${(report.income_tax_rate * 100).toFixed(0)}%)</span><span class="value">Php ${this.extras.formatCurrency(report.income_tax_due)}</span></div>
            <div class="line"></div>
            <h4>Notes</h4>
            <ul>${notes}</ul>
          </div>
        </body>
      </html>
    `;
  }
}
