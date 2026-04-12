import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { EncryptData } from '../environment/encrypt-data';
import { Extras } from '../extras/extras';
import { UserService } from '../services/services';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  extras = Extras;

  constructor(
    private router: Router,
    private encryptData: EncryptData,
    private userService: UserService,
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    this.extras.load.set(true);

    try {
      const storedUser = this.encryptData.decryptData('user') ?? null;
      const storedSuperAdmin = this.encryptData.decryptData('super_admin') ?? null;

      if (!storedUser?.token && storedSuperAdmin?.token) {
        this.extras.load.set(false);
        this.router.navigate(['/admin/dashboard']);
        return false;
      }

      if (!storedUser || !storedUser.token) {
        this.handleInvalidSession();
        return false;
      }

      const token = storedUser.token;
      const requiredPermission = route.data?.['permission'] as string | undefined;

      const res = await this.userService.postUser('auth-user', {}, token);
      if (!res?.data?.success) {
        this.handleInvalidSession();
        return false;
      }

      const latestUserData = res.data.data;

      // update stored session data
      storedUser.data = latestUserData;
      this.encryptData.encryptAndStoreData('user', storedUser);

      // check permission if route requires one
      if (requiredPermission) {
        const permissions = latestUserData?.permissions ?? [];

        const hasPermission = Array.isArray(permissions)
          ? permissions.includes(requiredPermission)
          : !!permissions?.[requiredPermission];

        if (!hasPermission) {
          this.extras.load.set(false);
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }
      return true;
    } catch (error) {
      this.extras.load.set(false);
      console.log(error);
      this.handleInvalidSession();
      return false;
    }
  }

  private handleInvalidSession(): void {
    this.encryptData.logoutDelete('user');
    this.extras.load.set(false);
    this.router.navigate(['/login']);
  }
}
