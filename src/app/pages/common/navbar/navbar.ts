import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EncryptData } from '../../../../environment/encrypt-data';
import { UserData } from '../../../../models/UserModel';
import { Extras } from '../../../../extras/extras';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  extras = Extras;

  userData: UserData = {
    data: {},
    permissions: []
  };
  isSidebarOpen = false;

  permissionMap: Record<string, boolean> = {};

  constructor(private encryptData: EncryptData) { }

  ngOnInit(): void {

  }

  checker(permission: string): boolean {
    const stored = this.encryptData.decryptData('user');

    if (stored?.data) {
      this.userData.data = stored.data;

      const perms = stored.data.permissions || [];

      // ✅ handle ARRAY
      if (Array.isArray(perms)) {
        this.userData.permissions = perms;

        // convert to map (for faster checking)
        this.permissionMap = perms.reduce((acc: any, p: string) => {
          acc[p] = true;
          return acc;
        }, {});
      }
      // ✅ handle OBJECT MAP
      else {
        this.permissionMap = perms;
        this.userData.permissions = Object.keys(perms);
      }
    }
    return !!this.permissionMap[permission];
  }

  canOpenSettings(): boolean {
    return Boolean(this.userData.data);
  }
}
