import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserService } from '../../../../services/services';
import { Extras } from '../../../../extras/extras';
import { UserData } from '../../../../models/UserModel';
import { ControlledDrugData, ControlledDrugInventoryRow } from '../../../../models/ControlledDrugModel';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-controlled-drugs',
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './controlled-drugs.html',
  styleUrl: './controlled-drugs.css',
})
export class ControlledDrugs implements OnInit {
  extras = Extras;
  search = '';
  selectedDays = 30;
  perPage = 10;
  pageNumber = 1;
  userData: UserData = {
    data: {},
    token: '',
  };

  controlledDrugData: ControlledDrugData = {
    data: {
      scope: {
        company_id: 0,
        branch_id: 0,
        days: 30,
        label: 'All Branches',
      },
      summary: {
        total_items: 0,
        dangerous_items: 0,
        protected_items: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        expiring_30_count: 0,
        expired_count: 0,
        total_stock_units: 0,
        inventory_value: 0,
      },
      inventory: {
        data: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
        },
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
    this.getControlledDrugs();
  }

  changeText(event: Event) {
    const target = event.target as HTMLInputElement;
    this.search = target.value.trim();
    this.pageNumber = 1;
    this.getControlledDrugs();
  }

  buildQuery(page = this.pageNumber): string | null {
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
      per_page: String(this.perPage),
      page: String(page),
    });

    if (this.search.trim()) {
      params.set('search', this.search.trim());
    }

    return `controlled-drugs?${params.toString()}`;
  }

  async getControlledDrugs(page = 1) {
    try {
      const endpoint = this.buildQuery(page);

      if (!endpoint) {
        this.extras.showToast('Controlled-drugs session data is incomplete. Please log in again.', 'warning');
        return;
      }

      const res = await this.userService.getUser(endpoint, '', this.userData.token);
      if (res.status === 200) {
        this.controlledDrugData = res.data;
        this.pageNumber = this.controlledDrugData.data.inventory.meta.current_page || page;
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.extras.showToast('Failed to load controlled-drug data', 'warning');
    }
  }

  async applyFilters() {
    this.pageNumber = 1;
    await this.getControlledDrugs(1);
  }

  async changePage(page: number) {
    if (page < 1 || page > this.controlledDrugData.data.inventory.meta.last_page) {
      return;
    }

    await this.getControlledDrugs(page);
  }

  next() {
    this.changePage(this.controlledDrugData.data.inventory.meta.current_page + 1);
  }

  prev() {
    this.changePage(this.controlledDrugData.data.inventory.meta.current_page - 1);
  }

  stockStatus(row: ControlledDrugInventoryRow | null | undefined): string {
    if (!row) {
      return '';
    }

    if (Number(row.stocks) <= 0) {
      return 'Out of Stock';
    }

    if (Number(row.stocks) <= Number(row.reorder_level)) {
      return 'Low Stock';
    }

    if (row.expiry_date && this.extras.computeDaysUntilExpiration(row.expiry_date) <= 30) {
      return 'Expiring Soon';
    }

    return 'Stable';
  }

  stockStatusClass(row: ControlledDrugInventoryRow | null | undefined): string {
    if (!row) {
      return '';
    }

    const status = this.stockStatus(row);

    if (status === 'Out of Stock') {
      return 'bg-red-100 text-red-700';
    }

    if (status === 'Low Stock') {
      return 'bg-amber-100 text-amber-700';
    }

    if (status === 'Expiring Soon') {
      return 'bg-orange-100 text-orange-700';
    }

    return 'bg-emerald-100 text-emerald-700';
  }

  classification(row: ControlledDrugInventoryRow | null | undefined): string {
    if (!row) {
      return '';
    }

    if (row?.is_dangerous && row?.needs_protection) {
      return 'Dangerous / Protected';
    }

    if (row?.is_dangerous) {
      return 'Dangerous';
    }

    if (row?.needs_protection) {
      return 'Protected';
    }

    return 'Controlled';
  }

  getRows(): Array<ControlledDrugInventoryRow | null> {
    const rows = this.controlledDrugData.data.inventory?.data ?? [];
    const padded: Array<ControlledDrugInventoryRow | null> = [...rows];

    while (padded.length < this.perPage) {
      padded.push(null);
    }

    return padded;
  }

  rowControlId(row: ControlledDrugInventoryRow | null | undefined): string {
    return row?.medicine_id ? `CD-${row.medicine_id}` : '';
  }

  rowDetails(row: ControlledDrugInventoryRow | null | undefined): string {
    if (!row) {
      return '';
    }

    return `${this.extras.toTitleCaseSafe(row.type || '')} ${row.dosage || ''} ${this.extras.toLowerCaseSafe(row.unit || '')}`.trim();
  }

  rowBranch(row: ControlledDrugInventoryRow | null | undefined): string {
    return row?.branch_name || '';
  }

  rowLocation(row: ControlledDrugInventoryRow | null | undefined): string {
    return row?.location || 'No location';
  }

  rowStock(row: ControlledDrugInventoryRow | null | undefined): string | number {
    if (!row || row.stocks == null || row.stocks < 0) {
      return '';
    }

    return row.stocks;
  }

  rowMinStock(row: ControlledDrugInventoryRow | null | undefined): string {
    if (!row || row.reorder_level == null || row.reorder_level < 0) {
      return '';
    }

    return `Min: ${row.reorder_level}`;
  }

  rowBatch(row: ControlledDrugInventoryRow | null | undefined): string {
    return row?.batch_id ? `BT-${row.batch_id}` : 'No batch';
  }

  rowExpiry(row: ControlledDrugInventoryRow | null | undefined): string {
    if (!row?.expiry_date) {
      return 'No expiry';
    }

    return this.extras.formatDate(row.expiry_date);
  }
}
