import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { EncryptData } from '../environment/encrypt-data';
import { UserService } from '../services/services';
import { Extras } from '../extras/extras';

@Injectable({
  providedIn: 'root',
})
export class SuperAdminGuard implements CanActivate {
  extras = Extras;

  constructor(
    private router: Router,
    private encryptData: EncryptData,
    private userService: UserService,
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    this.extras.load.set(true);

    try {
      const storedUser = this.encryptData.decryptData('super_admin') ?? null;

      if (!storedUser?.token) {
        this.encryptData.logoutDelete('super_admin');
        this.extras.load.set(false);
        this.router.navigate(['/admin/login']);
        return false;
      }

      const res = await this.userService.postUser('admin/auth-user', {}, storedUser.token);

      if (!res?.data?.success) {
        this.encryptData.logoutDelete('super_admin');
        this.extras.load.set(false);
        this.router.navigate(['/admin/login']);
        return false;
      }

      storedUser.data = res.data.data;
      this.encryptData.encryptAndStoreData('super_admin', storedUser);

      this.extras.load.set(false);
      return true;
    } catch (e) {
      console.log(e);
      this.extras.load.set(false);
      this.encryptData.logoutDelete('super_admin');
      this.router.navigate(['/admin/login']);
      return false;
    }
  }
}
