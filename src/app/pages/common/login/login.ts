import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UserModel } from '../../../../models/UserModel';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Router } from '@angular/router';
import { Extras } from '../../../../extras/extras';
import { IonIcon } from '@ionic/angular/standalone';
@Component({
  imports: [FormsModule, IonIcon],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  extras = Extras
  user: UserModel = {
    email: '',
    password: ''
  };
  showPassword = false;
  rememberMe = false;
  constructor(private userService: UserService, private encryptData: EncryptData, public router: Router, private cd: ChangeDetectorRef) {

  }
  async login() {
    this.extras.load.set(true);
    if (!this.user.email || !this.user.password) {
      this.extras.load.set(false);
      this.extras.isError('All fields are required.');
      return;
    }


    if (!this.extras.formatEmail(this.user.email)) {
      this.extras.load.set(false);
      this.extras.isError('Invalid email format.')
      return;
    }

    try {
      const credentials = {
        email: this.user.email,
        password: this.user.password
      }
      const res = await this.userService.postUser('login', credentials);
      console.log(res)
      if (res.data.success) {
        this.encryptData.encryptAndStoreData('user', res.data)
        this.cd.detectChanges()
        this.extras.isError('');
        this.router.navigate(['/dashboard']);
      } else {
        this.extras.isError(res.data.message)
        this.extras.load.set(false);
      }
    }
    catch (e: any) {
      this.extras.load.set(false);
      console.log(e)
    }
  }

  ngOnInit(): void {

  }



}
