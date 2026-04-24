import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Extras } from '../../../../extras/extras';
import { UserData } from '../../../../models/UserModel';
import { UserService } from '../../../../services/services';

@Component({
  selector: 'app-hmo-philhealth',
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './hmo-philhealth.html',
  styleUrl: './hmo-philhealth.css',
})
export class HmoPhilhealth implements OnInit {
  extras = Extras;
  userData: UserData = { data: [] };

  claims: any[] = [];
  selectedClaim: any = null;
  summary: any = {
    total: 0,
    pending_documents: 0,
    documents_ready: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
  };

  pageNumber = 1;
  meta: any = null;
  searchQuery = '';
  selectedStatus = 'all';
  activeTab: 'overview' | 'documents' | 'timeline' | 'notes' = 'overview';
  isClaimModalOpen = signal(false);
  isLoading = signal(false);
  isSavingOverview = signal(false);
  isSubmittingDocuments = signal(false);
  isSavingNote = signal(false);

  claimStatusOptions = [
    { value: 'pending_documents', label: 'Pending Documents' },
    { value: 'documents_ready', label: 'Documents Ready' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
  ];

  claimTabs: Array<'overview' | 'documents' | 'timeline' | 'notes'> = ['overview', 'documents', 'timeline', 'notes'];

  overviewForm = {
    claim_status: 'pending_documents',
    claim_amount_covered: '',
    documents_submitted: false,
  };

  noteDraft = '';
  uploadFiles: { prescription: File | null; member_id_image: File | null } = {
    prescription: null,
    member_id_image: null,
  };

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.loadClaims();
  }

  async loadClaims() {
    this.isLoading.set(true);

    try {
      const endpoint = this.buildClaimsQuery();
      const res = await this.userService.getUser(endpoint, null, this.userData.token);

      if (res.status === 200) {
        this.claims = res.data?.data ?? [];
        this.summary = res.data?.summary ?? this.summary;
        this.meta = res.data?.meta ?? null;
      }
    } catch (error) {
      console.log(error);
      this.extras.showToast('Unable to load HMO and PhilHealth claims.', 'warning');
    } finally {
      this.isLoading.set(false);
      this.cd.detectChanges();
    }
  }

  buildClaimsQuery(): string {
    const params: string[] = [
      `company_id=${this.userData.data?.data?.company_id}`,
      'per_page=10',
      `page=${this.pageNumber}`,
    ];
    const branchId = this.getSelectedBranchId();

    if (branchId) {
      params.push(`branch_id=${branchId}`);
    }

    if (this.searchQuery.trim()) {
      params.push(`search=${encodeURIComponent(this.searchQuery.trim())}`);
    }

    if (this.selectedStatus && this.selectedStatus !== 'all') {
      params.push(`status=${encodeURIComponent(this.selectedStatus)}`);
    }

    return `transaction-claims?${params.join('&')}`;
  }

  getSelectedBranchId(): number {
    const storedBranch = this.encryptData.decryptData('branch');
    return Number(storedBranch?.selectedBranch ?? this.userData.data?.data?.branch_id ?? 0);
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value ?? '';
    this.pageNumber = 1;
    this.loadClaims();
  }

  onStatusChange(value: string) {
    this.selectedStatus = value;
    this.pageNumber = 1;
    this.loadClaims();
  }

  prev() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadClaims();
    }
  }

  next() {
    if (this.meta?.last_page && this.pageNumber < this.meta.last_page) {
      this.pageNumber++;
      this.loadClaims();
    }
  }

  async openClaim(claim: any) {
    this.activeTab = 'overview';
    this.isClaimModalOpen.set(true);

    try {
      const res = await this.userService.getUser(`transaction-claims/${claim.transaction_id}`, null, this.userData.token);

      if (res.status === 200) {
        this.selectedClaim = res.data?.data ?? null;
        this.syncOverviewForm();
      }
    } catch (error) {
      console.log(error);
      this.extras.showToast('Unable to load claim details.', 'warning');
    } finally {
      this.cd.detectChanges();
    }
  }

  closeClaimModal() {
    this.isClaimModalOpen.set(false);
    this.selectedClaim = null;
    this.noteDraft = '';
    this.uploadFiles = { prescription: null, member_id_image: null };
  }

  setActiveTab(tab: 'overview' | 'documents' | 'timeline' | 'notes') {
    this.activeTab = tab;
  }

  syncOverviewForm() {
    this.overviewForm = {
      claim_status: this.selectedClaim?.claim_status || 'pending_documents',
      claim_amount_covered: this.selectedClaim?.claim_amount_covered ?? '',
      documents_submitted: Boolean(this.selectedClaim?.documents_submitted),
    };
  }

  async saveOverview() {
    if (!this.selectedClaim) {
      return;
    }

    if (this.selectedClaim?.coverage_type === 'partial' && (this.overviewForm.claim_amount_covered === '' || this.overviewForm.claim_amount_covered === null)) {
      this.extras.showToast('Amount covered is required for partial coverage claims.', 'warning');
      return;
    }

    this.isSavingOverview.set(true);

    try {
      const payload = {
        claim_status: this.overviewForm.claim_status,
        claim_amount_covered: this.overviewForm.claim_amount_covered === '' ? null : Number(this.overviewForm.claim_amount_covered),
        documents_submitted: this.overviewForm.documents_submitted,
      };

      const res = await this.userService.putUser(
        `transaction-claims/${this.selectedClaim.transaction_id}/overview`,
        payload,
        this.userData.token
      );

      if (res.status === 200) {
        this.selectedClaim = res.data?.data ?? this.selectedClaim;
        this.syncClaimInList(this.selectedClaim);
        this.syncOverviewForm();
        this.loadClaims();
        this.extras.showToast('Claim overview updated.', 'success');
      }
    } catch (error: any) {
      console.log(error);
      this.extras.showToast(error?.error?.message || 'Unable to update claim overview.', 'warning');
    } finally {
      this.isSavingOverview.set(false);
      this.cd.detectChanges();
    }
  }

  onDocumentPicked(event: Event, type: 'prescription' | 'member_id_image') {
    const target = event.target as HTMLInputElement;
    this.uploadFiles[type] = target.files?.[0] ?? null;
  }

  clearPickedDocument(type: 'prescription' | 'member_id_image') {
    this.uploadFiles[type] = null;
  }

  async submitDocuments(markDone = false) {
    if (!this.selectedClaim) {
      return;
    }

    if (!this.uploadFiles.prescription && !this.uploadFiles.member_id_image && !markDone) {
      this.extras.showToast('Select a document to upload first.', 'warning');
      return;
    }

    this.isSubmittingDocuments.set(true);

    try {
      const formData = new FormData();

      if (this.uploadFiles.prescription) {
        formData.append('prescription', this.uploadFiles.prescription);
      }

      if (this.uploadFiles.member_id_image) {
        formData.append('member_id_image', this.uploadFiles.member_id_image);
      }

      if (markDone) {
        formData.append('mark_documents_done', '1');
      }

      const res = await this.userService.postUser(
        `transaction-claims/${this.selectedClaim.transaction_id}/documents`,
        formData,
        this.userData.token
      );

      if (res.status === 200) {
        this.selectedClaim = res.data?.data ?? this.selectedClaim;
        this.syncClaimInList(this.selectedClaim);
        this.syncOverviewForm();
        this.uploadFiles = { prescription: null, member_id_image: null };
        this.loadClaims();
        this.extras.showToast(markDone ? 'Claim marked as documents complete.' : 'Claim documents updated.', 'success');
      }
    } catch (error: any) {
      console.log(error);
      this.extras.showToast(error?.error?.message || 'Unable to update claim documents.', 'warning');
    } finally {
      this.isSubmittingDocuments.set(false);
      this.cd.detectChanges();
    }
  }

  async saveNote() {
    if (!this.selectedClaim || !this.noteDraft.trim()) {
      this.extras.showToast('Please enter a note first.', 'warning');
      return;
    }

    this.isSavingNote.set(true);

    try {
      const res = await this.userService.postUser(
        `transaction-claims/${this.selectedClaim.transaction_id}/notes`,
        { note: this.noteDraft.trim() },
        this.userData.token
      );

      if (res.status === 201) {
        this.selectedClaim = res.data?.data ?? this.selectedClaim;
        this.syncClaimInList(this.selectedClaim);
        this.noteDraft = '';
        this.loadClaims();
        this.extras.showToast('Claim note added.', 'success');
      }
    } catch (error: any) {
      console.log(error);
      this.extras.showToast(error?.error?.message || 'Unable to save note.', 'warning');
    } finally {
      this.isSavingNote.set(false);
      this.cd.detectChanges();
    }
  }

  syncClaimInList(updatedClaim: any) {
    this.claims = this.claims.map((claim) =>
      claim.transaction_id === updatedClaim.transaction_id ? { ...claim, ...updatedClaim } : claim
    );
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending_documents: 'bg-amber-100 text-amber-700',
      documents_ready: 'bg-sky-100 text-sky-700',
      under_review: 'bg-violet-100 text-violet-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700',
      completed: 'bg-slate-200 text-slate-700',
    };

    return map[status] || 'bg-slate-100 text-slate-700';
  }

  statusLabel(status: string): string {
    return (status || 'pending_documents')
      .split('_')
      .map((part) => this.extras.toTitleCaseSafe(part))
      .join(' ');
  }

  claimCards() {
    return [
      { label: 'Total Claims', value: this.summary.total, class: 'bg-slate-900 text-white' },
      { label: 'Pending Docs', value: this.summary.pending_documents, class: 'bg-amber-100 text-amber-700' },
      { label: 'Ready', value: this.summary.documents_ready, class: 'bg-sky-100 text-sky-700' },
      { label: 'In Review', value: this.summary.under_review, class: 'bg-violet-100 text-violet-700' },
      { label: 'Approved', value: this.summary.approved, class: 'bg-emerald-100 text-emerald-700' },
      { label: 'Completed', value: this.summary.completed, class: 'bg-slate-200 text-slate-700' },
    ];
  }

  totalCoveredAmount(): number {
    if (!this.selectedClaim) {
      return 0;
    }

    if (this.selectedClaim.coverage_type === 'full') {
      return Number(this.selectedClaim.total_amount || 0);
    }

    return Number(this.selectedClaim.claim_amount_covered || 0);
  }

  amountDueFromPatient(): number {
    if (!this.selectedClaim) {
      return 0;
    }

    const total = Number(this.selectedClaim.total_amount || 0);
    const covered = this.totalCoveredAmount();
    return Math.max(total - covered, 0);
  }

  receiptPreviewLines(): string[] {
    if (!this.selectedClaim) {
      return [];
    }

    const width = 40;
    const divider = '='.repeat(width);
    const sectionDivider = '-'.repeat(width);
    const lines: string[] = [];
    const items = Array.isArray(this.selectedClaim?.items) ? this.selectedClaim.items : [];
    const companyName = this.safeText(this.userData.data?.data?.company_name || 'KMV Pharmacy');
    const branchName = this.safeText(this.selectedClaim?.branch?.branch_name || 'Assigned Branch');

    lines.push(this.centerText(companyName, width));
    lines.push(this.centerText(branchName, width));
    lines.push(this.centerText('CLAIMS RECEIPT COPY', width));
    lines.push(divider);
    lines.push(...this.keyValueLines('Receipt No', this.selectedClaim.transaction_id, width, 18));
    lines.push(...this.keyValueLines('Date', this.extras.formatDateWithTime(this.selectedClaim.created_at), width, 18));
    lines.push(...this.keyValueLines('Patient', this.selectedClaim.patient_name || 'N/A', width, 18));
    lines.push(...this.keyValueLines('Provider', this.selectedClaim.hmo_provider || 'N/A', width, 18));
    lines.push(...this.keyValueLines('Member ID', this.selectedClaim.membership_id || 'N/A', width, 18));
    lines.push(...this.keyValueLines('Type', (this.selectedClaim.transaction_type || '').toUpperCase(), width, 18));
    lines.push(sectionDivider);
    lines.push(this.padColumns('ITEM', 'QTY', 'AMOUNT', width));
    lines.push(sectionDivider);

    items.forEach((item: any) => {
      const name = this.safeText(item?.medicine?.medicine_name || `Medicine #${item?.medicine_id ?? ''}`);
      const quantity = Number(item?.quantity || 0);
      const price = Number(item?.medicine?.price ?? item?.price ?? 0);
      lines.push(...this.wrapText(name, width));
      lines.push(this.itemLine(quantity, price, quantity * price, width));
    });

    lines.push(sectionDivider);
    lines.push(...this.keyValueLines('Subtotal', this.currency(this.selectedClaim.sub_total), width, 18));
    lines.push(...this.keyValueLines('Discount', this.currency(this.selectedClaim.discount), width, 18));
    lines.push(...this.keyValueLines('Total', this.currency(this.selectedClaim.total_amount), width, 18));
    lines.push(...this.keyValueLines('Covered', this.currency(this.totalCoveredAmount()), width, 18));
    lines.push(...this.keyValueLines('Patient Due', this.currency(this.amountDueFromPatient()), width, 18));
    lines.push(divider);

    return lines;
  }

  openFile(url: string | null | undefined) {
    if (!url) {
      this.extras.showToast('No file uploaded yet.', 'warning');
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  private keyValueLines(label: string, value: string | number, width: number, valueColumn: number): string[] {
    const normalizedLabel = `${this.safeText(label)}:`;
    const normalizedValue = this.safeText(value);
    const rightWidth = width - valueColumn;
    const wrapped = this.wrapText(normalizedValue, Math.max(rightWidth, 10));

    return wrapped.map((line, index) => {
      if (index === 0) {
        return `${normalizedLabel.padEnd(valueColumn, ' ')}${line.padStart(rightWidth, ' ')}`;
      }

      return `${''.padEnd(valueColumn, ' ')}${line.padStart(rightWidth, ' ')}`;
    });
  }

  private wrapText(value: string | number, width: number): string[] {
    const text = this.safeText(value);
    if (!text) {
      return [''];
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }

      if (`${current} ${word}`.length <= width) {
        current += ` ${word}`;
        continue;
      }

      lines.push(current);
      current = word;
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  private padColumns(left: string, middle: string, right: string, width: number): string {
    const safeLeft = this.safeText(left);
    const safeMiddle = this.safeText(middle);
    const safeRight = this.safeText(right);
    const rightWidth = Math.max(10, safeRight.length);
    const middleWidth = Math.max(5, safeMiddle.length);
    const leftWidth = Math.max(8, width - rightWidth - middleWidth - 2);

    return `${safeLeft.padEnd(leftWidth, ' ')} ${safeMiddle.padStart(middleWidth, ' ')} ${safeRight.padStart(rightWidth, ' ')}`.slice(0, width);
  }

  private itemLine(quantity: number, price: number, total: number, width: number): string {
    const left = `${quantity} x ${this.currency(price)}`;
    const right = this.currency(total);
    const available = Math.max(1, width - right.length);
    return `${this.safeText(left).slice(0, available).padEnd(available, ' ')}${right}`;
  }

  private centerText(value: string | number, width: number): string {
    const text = this.safeText(value);
    if (text.length >= width) {
      return text.slice(0, width);
    }

    const leftPadding = Math.floor((width - text.length) / 2);
    return `${' '.repeat(leftPadding)}${text}`;
  }

  private safeText(value: string | number): string {
    return String(value ?? '')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private currency(value: number): string {
    return `PHP ${this.extras.formatCurrency(Number(value || 0))}`;
  }
}
