import { Login } from './pages/common/login/login';
import { Register } from './pages/common/register/register';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { Dashboard } from './pages/modules/dashboard/dashboard';
import { Sales } from './pages/modules/sales/sales';
import { OfflineOrders } from './pages/modules/offline-orders/offline-orders';
import { HmoPhilhealth } from './pages/modules/hmo-philhealth/hmo-philhealth';
import { Inventory } from './pages/modules/inventory/inventory';
import { Fefo } from './pages/modules/fefo/fefo';
import { ControlledDrugs } from './pages/modules/controlled-drugs/controlled-drugs';
import { Delivery } from './pages/modules/delivery/delivery';
import { Users } from './pages/modules/users/users';
import { Settings } from './pages/modules/settings/settings';
import { Reports } from './pages/modules/reports/reports';
import { AuthGuard } from '../guard/auth-guard';
import { PreventLoginGuard } from '../guard/prevent-login-guard';
import { SuperAdminGuard } from '../guard/super-admin-guard';
import { AdminLogin } from './pages/admin/admin-login/admin-login';
import { AdminLayout } from './pages/admin/admin-layout/admin-layout';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { AdminCompanies } from './pages/admin/admin-companies/admin-companies';
import { AdminApprovals } from './pages/admin/admin-approvals/admin-approvals';
import { AdminLogs } from './pages/admin/admin-logs/admin-logs';
import { AdminAnalytics } from './pages/admin/admin-analytics/admin-analytics';
import { AdminProfile } from './pages/admin/admin-profile/admin-profile';

export const routes: Routes = [
  /**
   * Public routes
   */
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [PreventLoginGuard] },
  { path: 'register', component: Register, canActivate: [PreventLoginGuard] },
  { path: 'admin/login', component: AdminLogin, canActivate: [PreventLoginGuard] },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [SuperAdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'companies', component: AdminCompanies },
      { path: 'approvals', component: AdminApprovals },
      { path: 'logs', component: AdminLogs },
      { path: 'analytics', component: AdminAnalytics },
      { path: 'profile', component: AdminProfile },
    ]
  },

  /**
   * Protected routes
   */
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [AuthGuard],
    data: { permission: 'dashboard' }
  },
  {
    path: 'sales',
    component: Sales,
    canActivate: [AuthGuard],
    data: { permission: 'sales' }
  },
  {
    path: 'offline-orders',
    component: OfflineOrders,
    canActivate: [AuthGuard],
    data: { permission: 'sms' }
  },
  {
    path: 'hmo-philhealth',
    component: HmoPhilhealth,
    canActivate: [AuthGuard],
    data: { permission: 'claims' }
  },
  {
    path: 'inventory',
    component: Inventory,
    canActivate: [AuthGuard],
    data: { permission: 'inventory' }
  },
  {
    path: 'fefo',
    component: Fefo,
    canActivate: [AuthGuard],
    data: { permission: 'fefo' }
  },
  {
    path: 'controlled-drugs',
    component: ControlledDrugs,
    canActivate: [AuthGuard],
    data: { permission: 'drugs' }
  },
  {
    path: 'delivery',
    component: Delivery,
    canActivate: [AuthGuard],
    data: { permission: 'delivery' }
  },
  {
    path: 'reports',
    component: Reports,
    canActivate: [AuthGuard],
    data: { permission: 'reports' }
  },
  {
    path: 'users',
    component: Users,
    canActivate: [AuthGuard],
    data: { permission: 'users' }
  },
  {
    path: 'settings',
    component: Settings,
    canActivate: [AuthGuard],
    data: { permission: 'settings' }
  },

  /**
   * Wildcard route
   */
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
