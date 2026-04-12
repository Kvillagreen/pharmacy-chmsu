export interface AdminDashboardData {
  success?: boolean;
  data?: {
    summary: {
      companies: number;
      active_branches: number;
      users: number;
      active_users: number;
      pending_admins: number;
      transactions_today: number;
    };
    recent_admins: any[];
  };
}

export interface AdminCompaniesData {
  success?: boolean;
  data?: any[];
}

export interface AdminApprovalsData {
  success?: boolean;
  data?: any[];
}

export interface AdminLogsPayload {
  logger?: {
    channel?: string;
    stack?: string[];
    level?: string;
    sources?: any[];
  };
  application_logs: string[];
  application_log_notice?: string | null;
  audit_logs: any[];
}

export interface AdminLogsData {
  success?: boolean;
  data?: AdminLogsPayload;
}

export interface AdminAnalyticsData {
  success?: boolean;
  data?: {
    summary: any;
    users_by_role: any[];
    users_by_status: any[];
    company_user_analytics: any[];
    recent_logins: any[];
  };
}

export interface AdminProfileData {
  success?: boolean;
  data?: any;
  super_admins?: any[];
}
