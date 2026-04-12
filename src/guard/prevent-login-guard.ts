import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import {EncryptData} from '../environment/encrypt-data';
import { UserService } from '../services/services';
import { Extras } from '../extras/extras';

@Injectable({
  providedIn: 'root',
})
export class PreventLoginGuard implements CanActivate {
  extras = Extras;

  constructor(
    private router: Router,
    private encryptData: EncryptData,
    private userService: UserService
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const superAdminData = this.encryptData.decryptData('super_admin');

      if (superAdminData?.token) {
        const superAdminRes = await this.userService.postUser('admin/auth-user', '', superAdminData.token);

        if (superAdminRes?.status === 200 && superAdminRes?.data?.success) {
          this.router.navigate(['/admin/dashboard']);
          this.extras.load?.set(false);
          return false;
        }

        this.encryptData.logoutDelete('super_admin');
      }

      const data = this.encryptData.decryptData('user');

      if (!data?.token) {
        this.extras.load?.set(false);
        return true;
      }

      const token = data.token;
      const res = await this.userService.postUser('auth-user', '', token);

      if (!res || res.status !== 200) {
        this.extras.load?.set(false);
        this.encryptData.logoutDelete('user');
        return true;
      }

      this.router.navigate(['/dashboard']);
      this.extras.load?.set(false);
      return false;

    } catch (error) {
      this.extras.load?.set(false);
      this.encryptData.logoutDelete('user');
      return true;
    }
  }
}
