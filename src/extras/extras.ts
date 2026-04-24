// extras.ts
import { signal } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
    toast.style.left = 'auto';
    toast.style.width = 'min(320px, calc(100vw - 3rem))';
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

    if (window.innerWidth <= 640) {
      toast.style.left = '1rem';
      toast.style.right = '1rem';
      toast.style.bottom = '1rem';
      toast.style.width = 'auto';
      toast.style.maxWidth = 'none';
    }

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

  formatRole(value: string | undefined | null): string {
    if (!value) return '';

    const normalized = value.replace(/_/g, ' ');
    return normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  downloadTextPdf(filename: string, lines: string[]) {
    const sanitizedLines = lines.map((line) => String(line ?? '').replace(/[^\x20-\x7E]/g, ' '));
    const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const streamLines = ['BT', '/F1 12 Tf', '50 780 Td', '14 TL'];
    sanitizedLines.forEach((line, index) => {
      if (index === 0) {
        streamLines.push(`(${escapePdfText(line)}) Tj`);
      } else {
        streamLines.push('T*');
        streamLines.push(`(${escapePdfText(line)}) Tj`);
      }
    });
    streamLines.push('ET');

    const stream = streamLines.join('\n');
    const pdfObjects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    pdfObjects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });

    const xrefPosition = pdf.length;
    pdf += `xref\n0 ${pdfObjects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  async downloadElementPdfById(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" was not found.`);
    }

    const exportWrapper = this.buildPdfExportClone(element);
    document.body.appendChild(exportWrapper);

    try {
      const exportRoot = exportWrapper.firstElementChild as HTMLElement | null;
      if (!exportRoot) {
        throw new Error('Unable to prepare the selected section for PDF export.');
      }

      const canvas = await html2canvas(exportRoot, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * availableWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imageData, 'PNG', margin, position, availableWidth, imageHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, position, availableWidth, imageHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(filename);
    } finally {
      exportWrapper.remove();
    }
  },

  buildPdfExportClone(source: HTMLElement): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-100000px';
    wrapper.style.top = '0';
    wrapper.style.zIndex = '-1';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '0';

    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.style.background = '#ffffff';
    wrapper.appendChild(clone);

    this.removePdfUnsafeNodes(clone);
    this.sanitizePdfCloneStyles(source, clone);

    return wrapper;
  },

  removePdfUnsafeNodes(target: HTMLElement) {
    target
      .querySelectorAll('[data-pdf-exclude="true"], button, input, select, textarea, video, audio, iframe, ion-icon, canvas')
      .forEach((node) => node.remove());

    target.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.remove();
      }
    });
  },

  sanitizePdfCloneStyles(source: HTMLElement, target: HTMLElement) {
    const computed = window.getComputedStyle(source);
    target.removeAttribute('class');

    this.copySafeComputedStyles(computed, target);

    const sourceChildren = Array.from(source.children) as HTMLElement[];
    const targetChildren = Array.from(target.children) as HTMLElement[];

    sourceChildren.forEach((child, index) => {
      const targetChild = targetChildren[index];
      if (targetChild) {
        this.sanitizePdfCloneStyles(child, targetChild);
      }
    });
  },

  copySafeComputedStyles(computed: CSSStyleDeclaration, target: HTMLElement) {
    const safeStyles: Array<[keyof CSSStyleDeclaration, string]> = [
      ['display', computed.display],
      ['position', computed.position],
      ['flexDirection', computed.flexDirection],
      ['justifyContent', computed.justifyContent],
      ['alignItems', computed.alignItems],
      ['alignSelf', computed.alignSelf],
      ['flexWrap', computed.flexWrap],
      ['flexGrow', computed.flexGrow],
      ['flexShrink', computed.flexShrink],
      ['gap', computed.gap],
      ['rowGap', computed.rowGap],
      ['columnGap', computed.columnGap],
      ['width', computed.width],
      ['maxWidth', computed.maxWidth],
      ['minWidth', computed.minWidth],
      ['height', computed.height],
      ['maxHeight', computed.maxHeight],
      ['minHeight', computed.minHeight],
      ['paddingTop', computed.paddingTop],
      ['paddingRight', computed.paddingRight],
      ['paddingBottom', computed.paddingBottom],
      ['paddingLeft', computed.paddingLeft],
      ['marginTop', computed.marginTop],
      ['marginRight', computed.marginRight],
      ['marginBottom', computed.marginBottom],
      ['marginLeft', computed.marginLeft],
      ['borderTopWidth', computed.borderTopWidth],
      ['borderRightWidth', computed.borderRightWidth],
      ['borderBottomWidth', computed.borderBottomWidth],
      ['borderLeftWidth', computed.borderLeftWidth],
      ['borderTopStyle', computed.borderTopStyle],
      ['borderRightStyle', computed.borderRightStyle],
      ['borderBottomStyle', computed.borderBottomStyle],
      ['borderLeftStyle', computed.borderLeftStyle],
      ['borderRadius', computed.borderRadius],
      ['fontFamily', computed.fontFamily],
      ['fontSize', computed.fontSize],
      ['fontWeight', computed.fontWeight],
      ['fontStyle', computed.fontStyle],
      ['lineHeight', computed.lineHeight],
      ['letterSpacing', computed.letterSpacing],
      ['textAlign', computed.textAlign],
      ['textTransform', computed.textTransform],
      ['whiteSpace', computed.whiteSpace],
      ['wordBreak', computed.wordBreak],
      ['overflowWrap', computed.overflowWrap],
      ['opacity', computed.opacity],
      ['backgroundColor', computed.getPropertyValue('background-color')],
      ['color', computed.getPropertyValue('color')],
      ['borderTopColor', computed.getPropertyValue('border-top-color')],
      ['borderRightColor', computed.getPropertyValue('border-right-color')],
      ['borderBottomColor', computed.getPropertyValue('border-bottom-color')],
      ['borderLeftColor', computed.getPropertyValue('border-left-color')],
      ['outlineColor', computed.getPropertyValue('outline-color')],
      ['textDecorationColor', computed.getPropertyValue('text-decoration-color')],
    ];

    target.style.backgroundImage = 'none';
    target.style.boxShadow = 'none';
    target.style.filter = 'none';
    target.style.backdropFilter = 'none';
    target.style.webkitMaskImage = 'none';
    target.style.maskImage = 'none';
    target.style.transform = 'none';

    safeStyles.forEach(([property, value]) => {
      const normalizedValue = String(value ?? '').trim();
      if (!normalizedValue) {
        return;
      }

      if (String(property).toLowerCase().includes('color')) {
        this.applySafeColorStyle(target, property, normalizedValue);
        return;
      }

      (target.style[property] as string | null) = normalizedValue;
    });
  },

  applySafeColorStyle(target: HTMLElement, property: keyof CSSStyleDeclaration, value: string) {
    const safeValue = this.normalizeColorForPdf(value);
    if (safeValue) {
      (target.style[property] as string | null) = safeValue;
    }
  },

  normalizeColorForPdf(value: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized === 'initial' || normalized === 'inherit') {
      return '';
    }

    if (!/oklab|oklch/i.test(normalized)) {
      return normalized;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return '#000000';
    }

    try {
      context.fillStyle = normalized;
      const parsed = context.fillStyle;
      return typeof parsed === 'string' && parsed ? parsed : '#000000';
    } catch {
      return '#000000';
    }
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
