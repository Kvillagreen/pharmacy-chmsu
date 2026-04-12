// extras.ts
import { signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

const TOAST_CLASS = 'ngx-toastr extras-toast-base';
const TOAST_TYPE_CLASSES = {
  success: 'toast-success extras-toast-success',
  danger: 'toast-error extras-toast-danger',
  warning: 'toast-warning extras-toast-warning',
  info: 'toast-info extras-toast-info',
};

export const Extras = {
  load: signal(false),
  errorMessage: '',
  successMessage: '',

  toastrService: null as ToastrService | null,

  /**
   * Initialize Extras with ToastController and AnimationController
   */
  _isSidebarOpen : signal(false),
  _isSidebarCollapsed: signal(false),

  isSidebarOpen() {
    return this._isSidebarOpen();
  },

  isSidebarCollapsed() {
    return this._isSidebarCollapsed();
  },

  toggleSidebar() {
    this._isSidebarOpen.set(!this._isSidebarOpen());
  },

  closeSidebar() {
    this._isSidebarOpen.set(false);
  },

  toggleSidebarCollapse() {
    this._isSidebarCollapsed.set(!this._isSidebarCollapsed());
  },

  init(toastrService: ToastrService) {
    this.toastrService = toastrService;
  },

  convertNumber(num: any): number {
    return Number(num);
  },

  computeChange(total: number, amountReceived: number): number {
    let change = amountReceived - total
    if (change < 0) {
      change = 0
    }
    return change;
  },
  /**
   * Show professional Tailwind/Ionic toast
   */
  async showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success') {
    try {
      if (this.toastrService) {
        this.toastrService.show(message, '', {
          toastClass: `${TOAST_CLASS} ${TOAST_TYPE_CLASSES[type]}`,
          positionClass: 'toast-bottom-right',
          timeOut: 3000,
          closeButton: false,
          tapToDismiss: true,
          progressBar: false,
          newestOnTop: true,
        });
        return;
      }

      this.showFallbackToast(message, type);
    } catch (e) {
      console.error('Extras.showToast failed', e);
      this.showFallbackToast(message, type);
    }
  },

  showFallbackToast(message: string, type: 'success' | 'danger' | 'warning' | 'info') {
    if (typeof document === 'undefined') {
      return;
    }

    const toast = document.createElement('div');
    const colorMap = {
      success: '#dcfce7',
      danger: '#fee2e2',
      warning: '#fef3c7',
      info: '#dbeafe',
    } as Record<string, string>;
    const textColorMap = {
      success: '#166534',
      danger: '#991b1b',
      warning: '#78350f',
      info: '#1d4ed8',
    } as Record<string, string>;

    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '1.5rem';
    toast.style.right = '1.5rem';
    toast.style.maxWidth = '320px';
    toast.style.padding = '1rem 1.25rem';
    toast.style.borderRadius = '0.75rem';
    toast.style.boxShadow = '0 24px 48px rgba(15, 23, 42, 0.16)';
    toast.style.background = colorMap[type] || colorMap['success'];
    toast.style.color = textColorMap[type] || textColorMap['success'];
    toast.style.fontSize = '0.95rem';
    toast.style.lineHeight = '1.4';
    toast.style.zIndex = '10000';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    toast.style.transform = 'translateY(0.75rem)';
    toast.style.pointerEvents = 'auto';

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(0.75rem)';
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3000);
  },

  // ------------------- Other existing Extras helpers -------------------
  generateTemporaryPassword(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }
    return password;
  },

  toLowerCaseSafe(value: string | undefined | null): string {
    return value ? value.toLowerCase() : '';
  },

  toUpperCaseSafe(value: string | null | undefined): string {
    return value ? value.toUpperCase() : '';
  },

  formatCurrency(value: number): string {
    if (!value) {
      return '0'
    }
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },
  timeAgo(dateTimeStr: string): string {
    if (!dateTimeStr) return '';
    const now = new Date();
    const date = new Date(dateTimeStr + '');
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'in the future';
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  },

  toTitleCaseSafe(value: string | undefined | null): string {
    if (!value) return '';
    return value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  removeHyphens(text: string): string {
    return text.replace(/-/g, '');
  },

  computeAge(birthday: string | Date): number {
    const birthDate = new Date(birthday);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear(); // ✅ FIXED

    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age < 0 ? 0 : age;
  },
  computeDaysUntilExpiration(expiryDate: string | Date): number {
    const today = new Date();
    const expiry = new Date(expiryDate);

    // Remove time for accurate day diff
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const total = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return total
  },

  formatDateWithTime(dateStr: string): string {
    const date = new Date(dateStr);

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila', // ✅ force PH time
    };

    return new Intl.DateTimeFormat('en-US', options)
      .format(date)
      .replace(',', ' at');
  },

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleString('en-US', options);
  },

  generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000);
  },

  formatID(tupvId: string): boolean {
    return /^TUPV-\d{2}-\d{4}$/.test(tupvId);
  },

  formatEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  },

  get copyRightYear(): string {
    return new Date().getFullYear().toString();
  },

  isError(message: string) {
    this.errorMessage = message;
    setTimeout(() => (this.errorMessage = ''), 5000);
  },

  isSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => (this.successMessage = ''), 5000);
  },
};
