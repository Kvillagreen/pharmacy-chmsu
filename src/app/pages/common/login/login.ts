import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Router } from '@angular/router';
import { Extras } from '../../../../extras/extras';
import { IonIcon } from '@ionic/angular/standalone';
import { AppAddressField } from '../../../shared/ui/address-field/address-field';

interface LoginFormState {
  email: string;
  password: string;
}

interface RegisterFormState {
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
  imports: [CommonModule, FormsModule, IonIcon, AppAddressField],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  extras = Extras;
  user: LoginFormState = {
    email: '',
    password: ''
  };
  registerUser: RegisterFormState = {
    firstName: '',
    lastName: '',
    address: '',
    email: '',
    password: '',
    confirmpassword: '',
    branchId: '',
    role: 'staff',
  };
  catalogData: { data: any[]; meta: { current_page: number; last_page: number; per_page: number; total: number } } = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 9, total: 0 },
  };
  branchList: any[] = [];
  catalogFilters = {
    search: '',
    branch_id: '0',
    stock_filter: 'all',
    sort: 'name',
  };
  catalogPage = 1;
  authModalOpen = false;
  authMode: 'login' | 'register' = 'login';
  catalogFilterModalOpen = false;
  showPassword = false;
  showRegisterPassword = false;
  showRegisterConfirmPassword = false;
  rememberMe = false;
  isForgotPasswordOpen = false;
  forgotPasswordStep: 'request' | 'reset' = 'request';
  forgotPassword = {
    email: '',
    code: '',
    password: '',
    password_confirmation: '',
  };
  resendCountdown = 0;
  private resendTimerId: ReturnType<typeof setInterval> | null = null;
  readonly stockFilters = [
    { value: 'all', label: 'All stocks' },
    { value: 'in-stock', label: 'In stock' },
    { value: 'low-stock', label: 'Low stock' },
    { value: 'out-of-stock', label: 'Out of stock' },
  ];
  readonly sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'branch', label: 'Branch' },
    { value: 'stocks', label: 'Stocks' },
    { value: 'price', label: 'Price' },
  ];
  readonly roleOptions = [
    { value: 'staff', label: 'Pharmacy Staff' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'branch_manager', label: 'Branch Manager' },
    { value: 'owner', label: 'Owner / Administrator' },
    { value: 'admin', label: 'Administrator' },
  ];

  constructor(private userService: UserService, private encryptData: EncryptData, public router: Router, private cd: ChangeDetectorRef) {}

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
        password: this.user.password,
      }
      const res = await this.userService.postUser('login', credentials);
      if (res.data.success) {
        this.encryptData.encryptAndStoreData('user', res.data);
        this.authModalOpen = false;
        this.cd.detectChanges();
        this.extras.isError('');
        this.router.navigate(['/dashboard']);
      } else {
        this.extras.isError(res.data.message);
        this.extras.load.set(false);
      }
    }
    catch (e: any) {
      this.extras.load.set(false);
      this.extras.isError(e?.error?.message || 'Unable to sign in right now.');
    }
  }

  ngOnInit(): void {
    this.loadPublicBranches();
    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.stopResendCountdown();
  }

  openForgotPasswordModal() {
    this.isForgotPasswordOpen = true;
    this.forgotPasswordStep = 'request';
    this.forgotPassword = {
      email: this.user.email || '',
      code: '',
      password: '',
      password_confirmation: '',
    };
    this.stopResendCountdown();
    this.cd.detectChanges();
  }

  closeForgotPasswordModal() {
    this.isForgotPasswordOpen = false;
    this.stopResendCountdown();
    this.cd.detectChanges();
  }

  openAuthModal(mode: 'login' | 'register' = 'login') {
    this.authMode = mode;
    this.authModalOpen = true;
    this.extras.isError('');
    this.extras.isSuccess('');
    this.cd.detectChanges();
  }

  closeAuthModal() {
    this.authModalOpen = false;
    this.extras.isError('');
    this.extras.isSuccess('');
    this.cd.detectChanges();
  }

  switchAuthMode(mode: 'login' | 'register') {
    this.authMode = mode;
    this.extras.isError('');
    this.extras.isSuccess('');
    this.cd.detectChanges();
  }

  openCatalogFilterModal() {
    this.catalogFilterModalOpen = true;
    this.cd.detectChanges();
  }

  closeCatalogFilterModal() {
    this.catalogFilterModalOpen = false;
    this.cd.detectChanges();
  }

  async loadPublicBranches() {
    try {
      const res = await this.userService.postUser('branch-public');
      if (res.status === 200) {
        const payload = res.data?.data;
        this.branchList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.branchList = [];
    }
  }

  buildCatalogQuery(): string {
    const params = new URLSearchParams({
      page: String(this.catalogPage),
      per_page: '9',
      sort: this.catalogFilters.sort,
    });

    if (this.catalogFilters.search.trim()) {
      params.set('search', this.catalogFilters.search.trim());
    }

    if (Number(this.catalogFilters.branch_id) > 0) {
      params.set('branch_id', this.catalogFilters.branch_id);
    }

    if (this.catalogFilters.stock_filter !== 'all') {
      params.set('stock_filter', this.catalogFilters.stock_filter);
    }

    return `catalog?${params.toString()}`;
  }

  async loadCatalog() {
    try {
      const res = await this.userService.getUser(this.buildCatalogQuery());
      if (res.status === 200 && res.data?.success) {
        this.catalogData = {
          data: res.data?.data ?? [],
          meta: {
            current_page: Number(res.data?.meta?.current_page ?? 1),
            last_page: Number(res.data?.meta?.last_page ?? 1),
            per_page: Number(res.data?.meta?.per_page ?? 9),
            total: Number(res.data?.meta?.total ?? 0),
          },
        };
        this.cd.detectChanges();
      }
    } catch (e) {
      console.log(e);
      this.catalogData = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 9, total: 0 },
      };
    }
  }

  onCatalogSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.catalogFilters.search = target.value;
    this.catalogPage = 1;
    this.loadCatalog();
  }

  applyCatalogFilters() {
    this.catalogPage = 1;
    this.loadCatalog();
    this.catalogFilterModalOpen = false;
  }

  nextCatalogPage() {
    if (this.catalogPage < this.catalogData.meta.last_page) {
      this.catalogPage += 1;
      this.loadCatalog();
    }
  }

  prevCatalogPage() {
    if (this.catalogPage > 1) {
      this.catalogPage -= 1;
      this.loadCatalog();
    }
  }

  stockTone(item: any): string {
    const stocks = Number(item?.stocks ?? 0);
    const reorderLevel = Number(item?.reorder_level ?? 0);

    if (stocks <= 0) {
      return 'bg-rose-50 text-rose-600 border border-rose-100';
    }

    if (stocks <= reorderLevel) {
      return 'bg-amber-50 text-amber-700 border border-amber-100';
    }

    return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  }

  stockLabel(item: any): string {
    const stocks = Number(item?.stocks ?? 0);
    const reorderLevel = Number(item?.reorder_level ?? 0);

    if (stocks <= 0) {
      return 'Out of stock';
    }

    if (stocks <= reorderLevel) {
      return 'Low stock';
    }

    return 'Available';
  }

  async copyCatalogMessageTemplate(item: any) {
    const message = this.buildCatalogMessageTemplate(item);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      this.extras.showToast('Message template copied.', 'success');
    } catch (error) {
      console.error(error);
      this.extras.showToast('Unable to copy the message template.', 'warning');
    }
  }

  buildCatalogMessageTemplate(item: any): string {
    const branchName = this.normalizeMessageLabel(String(item?.branch_name ?? 'branch')) || 'branch';
    const medicineName = this.shortenMessageLabel(String(item?.medicine_name ?? 'medicine'), 24) || 'medicine';
    const format = [item?.dosage, item?.unit].filter(Boolean).join(' ').trim();
    const type = String(item?.type ?? '').trim();
    const detail = this.shortenMessageLabel([type, format].filter(Boolean).join(', '), 24);

    return `${branchName}: Order [qty] ${medicineName}${detail ? ` (${detail})` : ''}. Pls confirm stock, price, and pickup time.`;
  }

  private normalizeMessageLabel(value: string): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  private shortenMessageLabel(value: string, maxLength: number): string {
    const trimmed = this.normalizeMessageLabel(value);
    if (!trimmed) {
      return '';
    }

    if (trimmed.length <= maxLength) {
      return trimmed;
    }

    return `${trimmed.slice(0, Math.max(6, maxLength - 3)).trim()}...`;
  }

  async register() {
    this.extras.load.set(true);

    if (
      !this.registerUser.email ||
      !this.registerUser.password ||
      !this.registerUser.firstName ||
      !this.registerUser.lastName ||
      !this.registerUser.address ||
      !this.registerUser.role ||
      !this.registerUser.branchId
    ) {
      this.extras.isError('All fields are required.');
      this.extras.load.set(false);
      return;
    }

    if (!this.extras.formatEmail(this.registerUser.email)) {
      this.extras.load.set(false);
      this.extras.isError('Invalid email format.');
      return;
    }

    if ((this.registerUser.password?.length ?? 0) < 8) {
      this.extras.load.set(false);
      this.extras.isError('Password must be at least 8 characters.');
      return;
    }

    if (this.registerUser.password !== this.registerUser.confirmpassword) {
      this.extras.load.set(false);
      this.extras.isError('Passwords do not match.');
      return;
    }

    try {
      const payload = {
        email: this.registerUser.email,
        password: this.registerUser.password,
        firstName: this.registerUser.firstName,
        lastName: this.registerUser.lastName,
        address: this.registerUser.address,
        branchId: this.registerUser.branchId,
        role: this.registerUser.role,
      };

      const res = await this.userService.postUser('register', payload);
      if (res.data?.success) {
        this.user.email = this.registerUser.email;
        this.registerUser = {
          firstName: '',
          lastName: '',
          address: '',
          email: '',
          password: '',
          confirmpassword: '',
          branchId: '',
          role: 'staff',
        };
        this.switchAuthMode('login');
        this.extras.isSuccess('Registration submitted. Please sign in once your account is approved.');
      } else {
        this.extras.isError(res.data?.message || 'Unable to create your account.');
      }
    } catch (e: any) {
      console.log(e);
      this.extras.isError(e?.error?.message || 'Unable to create your account.');
    } finally {
      this.extras.load.set(false);
      this.cd.detectChanges();
    }
  }

  async requestPasswordReset() {
    if (!this.forgotPassword.email || !this.extras.formatEmail(this.forgotPassword.email)) {
      this.extras.isError('Please enter a valid email address.');
      return;
    }

    try {
      const res = await this.userService.postUser('forgot-password/request', {
        email: this.forgotPassword.email.trim(),
      });

      if (res.data?.success) {
        this.forgotPasswordStep = 'reset';
        this.startResendCountdown(Number(res.data?.resend_available_in ?? 60));
        this.extras.isSuccess('Verification code sent. Please check your email.');
        this.cd.detectChanges();
      } else {
        this.extras.isError(res.data?.message || 'Unable to send reset code.');
      }
    } catch (e: any) {
      this.extras.isError(e?.error?.message || 'Unable to send reset code.');
    }
  }

  async resendPasswordResetCode() {
    if (this.resendCountdown > 0) {
      return;
    }

    try {
      const res = await this.userService.postUser('forgot-password/resend', {
        email: this.forgotPassword.email.trim(),
      });

      if (res.data?.success) {
        this.startResendCountdown(Number(res.data?.resend_available_in ?? 60));
        this.extras.isSuccess('A new verification code has been sent.');
      } else {
        this.extras.isError(res.data?.message || 'Unable to resend the code.');
      }
    } catch (e: any) {
      const retryIn = Number(e?.error?.resend_available_in ?? 0);
      if (retryIn > 0) {
        this.startResendCountdown(retryIn);
      }
      this.extras.isError(e?.error?.message || 'Unable to resend the code.');
    }
  }

  async resetPassword() {
    if (!this.forgotPassword.code || this.forgotPassword.code.length !== 6) {
      this.extras.isError('Please enter the 6-digit verification code.');
      return;
    }

    if (!this.forgotPassword.password || this.forgotPassword.password.length < 8) {
      this.extras.isError('Password must be at least 8 characters.');
      return;
    }

    if (this.forgotPassword.password !== this.forgotPassword.password_confirmation) {
      this.extras.isError('Password confirmation does not match.');
      return;
    }

    try {
      const res = await this.userService.postUser('forgot-password/reset', {
        email: this.forgotPassword.email.trim(),
        code: this.forgotPassword.code.trim(),
        password: this.forgotPassword.password,
        password_confirmation: this.forgotPassword.password_confirmation,
      });

      if (res.data?.success) {
        this.user.email = this.forgotPassword.email.trim();
        this.closeForgotPasswordModal();
        this.extras.isSuccess('Password reset successful. You can now sign in.');
      } else {
        this.extras.isError(res.data?.message || 'Unable to reset the password.');
      }
    } catch (e: any) {
      this.extras.isError(e?.error?.message || 'Unable to reset the password.');
    }
  }

  private startResendCountdown(seconds: number) {
    this.stopResendCountdown();
    this.resendCountdown = Math.max(0, Number(seconds || 0));

    if (this.resendCountdown <= 0) {
      return;
    }

    this.resendTimerId = setInterval(() => {
      this.resendCountdown = Math.max(0, this.resendCountdown - 1);
      if (this.resendCountdown === 0) {
        this.stopResendCountdown();
      }
      this.cd.detectChanges();
    }, 1000);
  }

  private stopResendCountdown() {
    if (this.resendTimerId) {
      clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
  }

}
