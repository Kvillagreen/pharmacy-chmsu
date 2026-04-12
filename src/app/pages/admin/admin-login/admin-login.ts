import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Extras } from '../../../../extras/extras';
import { UserModel } from '../../../../models/UserModel';

@Component({
  imports: [FormsModule, IonIcon],
  selector: 'app-admin-login',
  templateUrl: './admin-login.html',
})
export class AdminLogin {
  extras = Extras;
  user: UserModel = {
    email: '',
    password: ''
  };
  showPassword = false;
  rememberMe = false;

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    public router: Router,
    private cd: ChangeDetectorRef
  ) {}

  async login() {
    this.extras.load.set(true);

    if (!this.user.email || !this.user.password) {
      this.extras.load.set(false);
      this.extras.isError('Email and password are required.');
      return;
    }

    if (!this.extras.formatEmail(this.user.email)) {
      this.extras.load.set(false);
      this.extras.isError('Invalid email format.');
      return;
    }

    try {
      const res = await this.userService.postUser('admin/login', {
        email: this.user.email,
        password: this.user.password,
      });

      if (res.data.success) {
        this.encryptData.encryptAndStoreData('super_admin', res.data);
        this.cd.detectChanges();
        this.extras.isError('');
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.extras.isError(res.data.message);
        this.extras.load.set(false);
      }
    } catch (e: any) {
      console.log(e);
      this.extras.isError(e?.response?.data?.message ?? 'Unable to sign in.');
      this.extras.load.set(false);
    }
  }
}
