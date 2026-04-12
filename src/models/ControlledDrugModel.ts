export interface ControlledDrugScope {
  company_id: number;
  branch_id: number;
  days: number;
  label: string;
}

export interface ControlledDrugSummary {
  total_items: number;
  dangerous_items: number;
  protected_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  expiring_30_count: number;
  expired_count: number;
  total_stock_units: number;
  inventory_value: number;
}

export interface ControlledDrugInventoryRow {
  inventory_id: number;
  branch_id: number;
  branch_name: string;
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  category: string;
  dosage: number;
  unit: string;
  type: string;
  price: number;
  stocks: number;
  reorder_level: number;
  is_dangerous: boolean;
  needs_protection: boolean;
  batch_id: number | null;
  expiry_date: string | null;
  received_date: string | null;
  location: string | null;
  updated_at: string;
}

export interface ControlledDrugAnalysis {
  headline: string;
  highlights: string[];
}

export interface ControlledDrugDataPayload {
  scope: ControlledDrugScope;
  summary: ControlledDrugSummary;
  inventory: {
    data: ControlledDrugInventoryRow[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
  analysis: ControlledDrugAnalysis;
}

export interface ControlledDrugData {
  success?: boolean;
  data: ControlledDrugDataPayload;
}
