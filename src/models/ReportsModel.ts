export interface ReportsScope {
  company_id: number;
  branch_id: number;
  days: number;
  start_date?: string;
  end_date?: string;
  label: string;
}

export interface ReportsSummary {
  total_revenue: number;
  previous_revenue: number;
  revenue_change_pct: number;
  transaction_count: number;
  average_sale: number;
  total_discount: number;
  inventory_value: number;
  low_stock_count: number;
  expiring_30_count: number;
}

export interface ReportsRevenuePoint {
  date: string;
  label: string;
  total_revenue: number;
  transaction_count: number;
}

export interface ReportsDailyTransactionPoint {
  date: string;
  label: string;
  transaction_count: number;
}

export interface ReportsDailyDiscountPoint {
  date: string;
  label: string;
  total_discount: number;
}

export interface ReportsPaymentMix {
  payment_method: string;
  total_revenue: number;
  transaction_count: number;
}

export interface ReportsCategoryMix {
  category: string;
  quantity_sold: number;
  transaction_count: number;
}

export interface ReportsInventoryStatusMix {
  status: string;
  count: number;
}

export interface ReportsBranchPerformance {
  branch_id: number;
  branch_name: string;
  total_revenue: number;
  transaction_count: number;
  first_created_at?: string | null;
  last_created_at?: string | null;
}

export interface ReportsTopMedicine {
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  category: string;
  quantity_sold: number;
  transactions_count: number;
  first_created_at?: string | null;
  last_created_at?: string | null;
}

export interface ReportsInventoryWatch {
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  branch_name: string;
  stocks: number;
  reorder_level: number;
  price: number;
  expiry_date: string | null;
  created_at?: string | null;
  status: string;
}

export interface ReportsStockTransfer {
  inventory_transfer_id: number;
  medicine_name: string;
  generic_name: string;
  batch_number: string | number;
  expiry_date: string | null;
  mfg_date: string | null;
  from_branch_name: string;
  to_branch_name: string;
  quantity: number;
  status: string;
  requested_by: string;
  resolved_by?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface ReportsRecentTransaction {
  transaction_id: number;
  branch_name: string;
  cashier_name: string;
  payment_method: string;
  reference_number?: string | null;
  transaction_type?: string | null;
  regulated_classification?: string | null;
  patient_name?: string | null;
  total_amount: number;
  discount: number;
  created_at: string;
}

export interface ReportsRegulatedTransaction {
  transaction_id: number;
  regulated_classification: string;
  branch_name: string;
  cashier_name: string;
  payment_method: string;
  reference_number?: string | null;
  total_amount: number;
  discount: number;
  patient_name: string;
  created_at: string;
  prescription_url?: string | null;
  member_id_image_url?: string | null;
  documents_submitted?: boolean;
  regulated_details: Record<string, any> | null;
}

export interface ReportsAnalysis {
  headline: string;
  highlights: string[];
}

export interface ReportsDataPayload {
  scope: ReportsScope;
  summary: ReportsSummary;
  charts: {
    daily_revenue: ReportsRevenuePoint[];
    daily_transactions: ReportsDailyTransactionPoint[];
    daily_discounts: ReportsDailyDiscountPoint[];
    payment_mix: ReportsPaymentMix[];
    category_mix: ReportsCategoryMix[];
    inventory_status_mix: ReportsInventoryStatusMix[];
  };
  tables: {
    branch_performance: ReportsBranchPerformance[];
    top_medicines: ReportsTopMedicine[];
    inventory_watch: ReportsInventoryWatch[];
    recent_transactions: ReportsRecentTransaction[];
    prescribed_transactions: ReportsRegulatedTransaction[];
    dangerous_transactions: ReportsRegulatedTransaction[];
    stock_transfers: ReportsStockTransfer[];
  };
  analysis: ReportsAnalysis;
}

export interface ReportsData {
  success?: boolean;
  data: ReportsDataPayload;
}

export interface BirAnnualDeclarationDataPayload {
  form_no: string;
  generated_at: string;
  branch_id: number;
  branch_name: string;
  company_id: number;
  taxpayer_name: string;
  tin_number: string;
  taxable_year: number;
  return_period?: string;
  due_date?: string;
  tax_type_code?: string;
  tax_type_description?: string;
  atc?: string;
  atc_description?: string;
  manner_of_payment?: string;
  type_of_payment?: string;
  line_of_business?: string;
  registered_address?: string;
  telephone_number?: string;
  basic_tax_payment?: number;
  surcharge?: number;
  interest?: number;
  compromise?: number;
  total_amount_payable?: number;
  transaction_count: number;
  gross_sales_receipts: number;
  sales_discounts: number;
  net_sales_receipts: number;
  cost_of_sales: number;
  gross_income: number;
  deductions: number;
  taxable_net_income: number;
  income_tax_rate: number;
  income_tax_due: number;
  is_ready_to_file: boolean;
  data_notes: string[];
}

export interface BirAnnualDeclarationData {
  success?: boolean;
  data: BirAnnualDeclarationDataPayload;
}

export interface ReportsTransactionRecord {
  transaction_id: number;
  branch_name: string;
  cashier_name: string;
  payment_method: string;
  reference_number?: string | null;
  transaction_type: string;
  regulated_classification: string | null;
  patient_name: string | null;
  sub_total: number;
  discount: number;
  vat_amount?: number;
  total_amount: number;
  used_amount: number;
  change: number;
  status?: string;
  voided_at?: string;
  void_reason?: string;
  created_at: string;
}
