import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { AdminAnalyticsData } from '../../../../models/AdminModel';
import { Extras } from '../../../../extras/extras';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-analytics.html',
})
export class AdminAnalytics {
  extras = Extras;
  token = '';
  data: AdminAnalyticsData = { data: { summary: {}, users_by_role: [], users_by_status: [], company_user_analytics: [], recent_logins: [] } };

  constructor(private userService: UserService, private encryptData: EncryptData, private cd: ChangeDetectorRef) {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
    this.load();
  }

  async load() {
    const res = await this.userService.getUser('admin/analytics', '', this.token);
    if (res.status === 200) {
      this.data = res.data;
      this.cd.detectChanges();
    }
  }
}
