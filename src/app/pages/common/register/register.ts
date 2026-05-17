import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Router, RouterLink } from '@angular/router';
import { Extras } from '../../../../extras/extras';
import { IonIcon } from '@ionic/angular/standalone';
import { AppAddressField } from '../../../shared/ui/address-field/address-field';

interface RegisterPageFormState {
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  password: string;
  confirmpassword: string;
  branchId: string;
  role: string;
}

@Component({
  imports: [FormsModule, IonIcon, AppAddressField],
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  extras = Extras
  user: RegisterPageFormState = {
    firstName: '',
    lastName: '',
    address: '',
    email: '',
    password: '',
    confirmpassword: '',
    branchId: '',
    role: '',
  };
  branchList: any;
  showPassword = false;
  showConfirmPassword = false;

  rememberMe = false;
  constructor(private userService: UserService, private encryptData: EncryptData, public router: Router, private cd: ChangeDetectorRef) {

  }
  ngOnInit(): void {
    this.getBranchList();
  }

  async getBranchList() {
    const res = await this.userService.postUser('branch-public');
    if (res.status == 200) {
      this.branchList = res.data.data
      this.cd.detectChanges()
    }
  }

  async register() {
    this.extras.load.set(true);
    if (!this.user.email || !this.user.password || !this.user.firstName || !this.user.lastName || !this.user.address || !this.user.role || !this.user.branchId) {

      this.extras.isError('All fields are required');
      this.extras.load.set(false);
      return;
    }

    if (!this.extras.formatEmail(this.user.email)) {
      this.extras.load.set(false);
      this.extras.isError('Invalid email format.')
      return;
    }


    if (this.user.password.length <= 8) {
      this.extras.load.set(false);
      this.extras.isError('Password must be greater than 8 characters.')
      return;
    }


    if (this.user.password != this.user.confirmpassword) {
      this.extras.load.set(false);
      this.extras.isError('Password must be the same')
      return;
    }
    try {
      const credentials = {
        email: this.user.email,
        password: this.user.password,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        address: this.user.address,
        branchId: this.user.branchId,
        role: this.user.role,
      }
      const res = await this.userService.postUser('register', credentials);
      if (res.data.success) {
        this.encryptData.encryptAndStoreData('user', res.data)
        this.cd.detectChanges()
        this.extras.isError('');
        this.router.navigate(['dashboard']);
      } else {
        this.extras.isError(res.data.message);
        this.extras.load.set(false);
      }
    }
    catch (e: any) {
      console.log(e)
      this.extras.load.set(false);
    }
  }

}
