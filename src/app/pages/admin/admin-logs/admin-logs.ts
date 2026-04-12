import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { AdminLogsData, AdminLogsPayload } from '../../../../models/AdminModel';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-logs.html',
})
export class AdminLogs {
  token = '';
  readonly emptyLogs: AdminLogsPayload = {
    logger: {
      channel: '',
      stack: [],
      level: '',
      sources: [],
    },
    application_logs: [],
    application_log_notice: null,
    audit_logs: [],
  };
  data: AdminLogsData = {
    data: this.emptyLogs
  };

  constructor(private userService: UserService, private encryptData: EncryptData, private cd: ChangeDetectorRef) {
    this.token = this.encryptData.decryptData('super_admin')?.token ?? '';
    this.load();
  }

  async load() {
    try {
      const res = await this.userService.getUser('admin/logs', '', this.token);
      if (res.status === 200) {
        this.data = {
          ...res.data,
          data: {
            ...this.emptyLogs,
            ...(res.data?.data ?? {}),
            logger: {
              ...this.emptyLogs.logger,
              ...(res.data?.data?.logger ?? {}),
            },
          },
        };
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
    }
  }

  get logData(): AdminLogsPayload {
    return this.data.data ?? this.emptyLogs;
  }
}
