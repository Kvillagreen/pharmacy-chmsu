export interface DashboardMetricSummary {
  total_revenue: number;
  revenue_change_pct: number;
  transaction_count: number;
  transaction_change_pct: number;
  average_sale: number;
  inventory_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_30_count: number;
  expired_count: number;
}

export interface DashboardScope {
  company_id: number;
  branch_id: number;
  days: number;
  label: string;
}

export interface DashboardRevenuePoint {
  date: string;
  label: string;
  total_revenue: number;
  transaction_count: number;
}

export interface DashboardPaymentMix {
  payment_method: string;
  total_revenue: number;
  transaction_count: number;
}

export interface DashboardCategoryMix {
  category: string;
  quantity_sold: number;
  transaction_count: number;
}

export interface DashboardBranchComparison {
  branch_id: number;
  branch_name: string;
  total_revenue: number;
  transaction_count: number;
}

export interface DashboardTopMedicine {
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  category: string;
  price: number;
  quantity_sold: number;
  transactions_count: number;
}

export interface DashboardRecentTransaction {
  transaction_id: number;
  branch_name: string;
  cashier_name: string;
  payment_method: string;
  total_amount: number;
  discount: number;
  created_at: string;
}

export interface DashboardAnalysis {
  headline: string;
  highlights: string[];
}

export interface DashboardDataPayload {
  scope: DashboardScope;
  summary: DashboardMetricSummary;
  charts: {
    daily_revenue: DashboardRevenuePoint[];
    payment_mix: DashboardPaymentMix[];
    category_mix: DashboardCategoryMix[];
    branch_comparison: DashboardBranchComparison[];
  };
  tables: {
    top_medicines: DashboardTopMedicine[];
    recent_transactions: DashboardRecentTransaction[];
    branch_table: DashboardBranchComparison[];
  };
  analysis: DashboardAnalysis;
}

export interface DashboardData {
  data: DashboardDataPayload;
}
