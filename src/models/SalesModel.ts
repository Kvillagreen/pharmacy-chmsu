export interface SalesModel {
  items?: any;
  discount?: number;
  total_amount?: number;
  sub_total?: number;
  scpwd_id_number?: string;
  discount_type?: string;
  user_id?: number;
  branch_id?: number;
  payment_method?: string;
  used_amount?: number;
  change?: number;
  request_token:string;
}

export interface SalesData {
  data?: any;
  categoryData?: any;
  selectedCategory?: string;
  transactionData?: any;
  selectedTransaction?: string;
  discountData?: any;
  selectedDiscount?: string;
}
