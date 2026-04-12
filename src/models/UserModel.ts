export interface UserModel {
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


export interface UserData {
  data: any;
  userData?: any;
  token?: '';
  permissions?: any
}
