import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { AdminDashboardData } from '../../../../models/AdminModel';
import { Extras } from '../../../../extras/extras';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard implements OnInit {
  extras = Extras;
  data: AdminDashboardData = { data: { summary: { companies: 0, active_branches: 0, users: 0, active_users: 0, pending_admins: 0, transactions_today: 0 }, recent_admins: [] } };
  token = '';

  constructor(private userService: UserService, private encryptData: EncryptData, private cd: ChangeDetectorRef) {}

  async ngOnInit() {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
    await this.load();
  }

  async load() {
    const res = await this.userService.getUser('admin/dashboard', '', this.token);
    if (res.status === 200) {
      this.data = res.data;
      this.cd.detectChanges();
    }
  }
}
