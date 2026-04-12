export interface BranchModel {
  firstName?: string;
  lastName?: string;
  address?: string;
  email?: string;
  password?: string;
  confirmpassword?: string;
  branchId?: string;
  token?: string;
  role?: string;
  authorize?: any;
}


export interface BranchData {
  data: any;
  selectedBranch?: any
}
