import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { Extras } from '../../../../extras/extras';
import { DashboardData } from '../../../../models/DashboardModel';
import { UserData } from '../../../../models/UserModel';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  extras = Extras;
  selectedDays = 7;
  maxRevenuePoint = 0;
  isLoading = true;
  userData: UserData = {
    data: {},
    token: '',
  };

  dashboardData: DashboardData = {
    data: {
      scope: {
        company_id: 0,
        branch_id: 0,
        days: 7,
        label: 'All Branches',
      },
      summary: {
        total_revenue: 0,
        revenue_change_pct: 0,
        transaction_count: 0,
        transaction_change_pct: 0,
        average_sale: 0,
        inventory_value: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        expiring_30_count: 0,
        expired_count: 0,
      },
      charts: {
        daily_revenue: [],
        payment_mix: [],
        category_mix: [],
        branch_comparison: [],
      },
      tables: {
        top_medicines: [],
        recent_transactions: [],
        branch_table: [],
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
    this.getDashboard();
  }

  buildQuery(): string | null {
    const companyId = this.userData.data?.data?.company_id;
    const storedBranch = this.encryptData.decryptData('branch');
    const selectedBranch = Number(storedBranch?.selectedBranch ?? 0);

    if (!companyId || !this.userData.token) {
      return null;
    }

    return `dashboard?company_id=${companyId}&branch_id=${selectedBranch}&days=${this.selectedDays}`;
  }

  async getDashboard() {
    this.isLoading = true;
    this.cd.detectChanges();

    try {
      const endpoint = this.buildQuery();

      if (!endpoint) {
        this.extras.showToast('Dashboard session data is incomplete. Please log in again.', 'warning');
        this.isLoading = false;
        return;
      }

      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        this.dashboardData = this.normalizeDashboardResponse(res.data);
        this.maxRevenuePoint = Math.max(
          ...this.dashboardData.data.charts.daily_revenue.map((item) => Number(item.total_revenue || 0)),
          1
        );
        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
      this.extras.showToast('Failed to load dashboard data', 'warning');
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  async changeDays(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedDays = Number(target.value);
    await this.getDashboard();
  }

  getBarHeight(value: number): number {
    if (!this.maxRevenuePoint) {
      return 18;
    }

    return Math.max((value / this.maxRevenuePoint) * 180, 18);
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

  private normalizeDashboardResponse(response: any): DashboardData {
    const payload = response?.data?.charts ? response.data : response;

    return {
      data: {
        ...this.dashboardData.data,
        ...payload,
        charts: {
          ...this.dashboardData.data.charts,
          ...(payload?.charts ?? {}),
          daily_revenue: this.ensureArray(payload?.charts?.daily_revenue),
          payment_mix: this.ensureArray(payload?.charts?.payment_mix),
          category_mix: this.ensureArray(payload?.charts?.category_mix),
          branch_comparison: this.ensureArray(payload?.charts?.branch_comparison),
        },
        tables: {
          ...this.dashboardData.data.tables,
          ...(payload?.tables ?? {}),
          top_medicines: this.ensureArray(payload?.tables?.top_medicines),
          recent_transactions: this.ensureArray(payload?.tables?.recent_transactions),
          branch_table: this.ensureArray(payload?.tables?.branch_table),
        },
        analysis: {
          ...this.dashboardData.data.analysis,
          ...(payload?.analysis ?? {}),
          highlights: this.ensureArray(payload?.analysis?.highlights),
        },
      },
    };
  }

  private ensureArray<T>(value: T[] | Record<string, T> | null | undefined): T[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === 'object') {
      return Object.values(value);
    }

    return [];
  }
}
