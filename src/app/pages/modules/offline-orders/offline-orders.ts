import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { EncryptData } from '../../../../environment/encrypt-data';
import { Extras } from '../../../../extras/extras';
import { MedicineData } from '../../../../models/MedicineModel';
import { SalesModel } from '../../../../models/SalesModel';
import { UserData } from '../../../../models/UserModel';
import { UserService } from '../../../../services/services';

@Component({
  selector: 'app-offline-orders',
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './offline-orders.html',
  styleUrl: './offline-orders.css',
})
export class OfflineOrders implements OnInit {
  @ViewChild('conversationScrollContainer') conversationScrollContainer?: ElementRef<HTMLDivElement>;

  extras = Extras;
  isLoading = signal(false);
  isSending = signal(false);
  isLogsLoading = signal(false);
  isLogsModalOpen = signal(false);
  isComposerModalOpen = signal(false);
  isPickupScheduleModalOpen = signal(false);
  isDeletingConversation = signal(false);
  deletingConversationMessageId = signal<number | null>(null);
  deletingLogMessageId = signal<number | null>(null);
  isDeleteModalOpen = signal(false);
  selectedMessageId = signal<string>('');
  readonly messageLimit = 161;
  readonly logsPageSize = 10;
  readonly conversationPageSize = 12;
  logsCurrentPage = 1;
  visibleConversationCount = this.conversationPageSize;
  lastAutoBuildSourceKey = '';
  deleteModalState: {
    type: 'conversation' | 'message' | 'log_message' | '';
    label: string;
    counterpartyNumber: string;
    cutoffAt: string | null;
    messageId: number | null;
  } = {
    type: '',
    label: '',
    counterpartyNumber: '',
    cutoffAt: null,
    messageId: null,
  };

  userData: UserData = {
    data: [],
    token: '',
  };

  replyData: {
    messages: any[];
    defaults: {
      sender_name: string;
      from_number: string;
    };
    summary: {
      total_messages: number;
      unique_customers: number;
    };
  } = {
    messages: [],
    defaults: {
      sender_name: '',
      from_number: '',
    },
    summary: {
      total_messages: 0,
      unique_customers: 0,
    },
  };

  messageLogs: any[] = [];

  medicineData: MedicineData = {
    data: [],
  };

  composeModel = {
    sender_name: '',
    to_number: '',
    message_body: '',
    template_name: '',
  };

  templateOptions = [
    'Medicine Order Format',
    'Order Confirmation (Pickup)',
    'Order Confirmation (Pickup Time)',
    'Payment Instructions (GCash)',
    'Out of Stock + Alternative Offered',
    'Ready for Pickup',
    'Pickup Time Reminder',
  ];

  paymentMethodOptions = ['Cash', 'GCash', 'Card'];

  orderBuilder = {
    enabled: false,
    payment_method: 'Cash',
    amount: 0,
    items: [] as any[],
  };

  pickupScheduleModel = {
    template_name: '',
    pickup_date: '',
    pickup_time: '',
  };

  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private getStoredUserPayload() {
    const stored = this.encryptData.decryptData('user');
    if (!stored) {
      return null;
    }

    return stored.data?.user_id ? stored.data : stored.data?.data ?? stored.data ?? null;
  }

  loadData() {
    const storedUser = this.encryptData.decryptData('user');
    const payload = this.getStoredUserPayload();

    if (!storedUser?.token || !payload) {
      return;
    }

    this.userData.token = storedUser.token;
    this.userData.data = payload;
    this.refreshOrderMessage();
    this.getMedicineOptions();
    this.getReplies();
  }

  private getUserField(field: string): any {
    return this.userData.data?.[field] ?? this.userData.data?.data?.[field] ?? null;
  }

  get companyId(): number {
    return Number(this.getUserField('company_id') ?? 0);
  }

  async getReplies() {
    this.isLoading.set(true);

    try {
      const res = await this.userService.getUser('sms/replies', { limit: 20 }, this.userData.token);

      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        const data = res.data?.data ?? {};
        this.replyData.messages = this.extractMessages(data);
        this.replyData.defaults = {
          sender_name: data.defaults?.sender_name ?? '',
          from_number: data.defaults?.from_number ?? '',
        };
        this.replyData.summary = {
          total_messages: Number(data.summary?.total_messages ?? this.replyData.messages.length),
          unique_customers: Number(data.summary?.unique_customers ?? this.replyData.messages.length),
        };

        if (!this.composeModel.sender_name) {
          this.composeModel.sender_name = this.replyData.defaults.sender_name;
        }

        if (!this.selectedMessage() && this.replyData.messages.length) {
          this.selectMessage(this.replyData.messages[0]);
        } else if (this.selectedMessage()) {
          this.tryAutoBuildFromSelectedMessage(false);
          this.scrollConversationToBottom();
        }

        if (!this.replyData.messages.length && data.provider_response) {
          this.extras.showToast('There are no readable messages yet.', 'warning');
        }
      } else {
        this.replyData.messages = [];
        this.replyData.summary = {
          total_messages: 0,
          unique_customers: 0,
        };
      }
    } catch (e: any) {
      console.log(e);
      this.replyData.messages = [];
      this.replyData.summary = {
        total_messages: 0,
        unique_customers: 0,
      };
      this.extras.showToast(e?.error?.message ?? 'Unable to load offline order messages.', 'warning');
    } finally {
      this.isLoading.set(false);
      this.cd.detectChanges();
    }
  }

  async openLogsModal() {
    this.isLogsModalOpen.set(true);
    this.logsCurrentPage = 1;
    await this.getMessageLogs();
  }

  closeLogsModal() {
    this.isLogsModalOpen.set(false);
  }

  async getMessageLogs() {
    this.isLogsLoading.set(true);

    try {
      const res = await this.userService.getUser('sms/logs', { limit: 100 }, this.userData.token);

      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        this.messageLogs = Array.isArray(res.data?.data?.logs) ? res.data.data.logs : [];
        this.logsCurrentPage = 1;
        return;
      }

      this.messageLogs = [];
    } catch (e: any) {
      console.log(e);
      this.messageLogs = [];
      this.extras.showToast(e?.error?.message ?? 'Unable to load SMS logs.', 'warning');
    } finally {
      this.isLogsLoading.set(false);
      this.cd.detectChanges();
    }
  }

  private extractMessages(data: any): any[] {
    if (Array.isArray(data?.messages)) {
      return data.messages.map((message: any) => ({
        id: message?.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        from_number: String(message?.from_number ?? message?.display_from_number ?? ''),
        to_number: String(message?.to_number ?? message?.display_to_number ?? ''),
        reply_to_number: String(message?.reply_to_number ?? message?.from_number ?? ''),
        message_body: String(message?.message_body ?? ''),
        sender_name: String(message?.sender_name ?? ''),
        received_at: message?.received_at ?? message?.last_received_at ?? null,
        reference_number: String(message?.reference_number ?? ''),
        template_tag: String(message?.template_tag ?? ''),
        history: Array.isArray(message?.history) ? message.history : [],
        message_count: Number(message?.message_count ?? 1),
        raw: message?.raw ?? message,
      }));
    }

    const providerMessages = data?.provider_response?.data;
    if (Array.isArray(providerMessages)) {
      return providerMessages.map((message: any) => ({
        id: message?.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        from_number: String(message?.from_number ?? message?.FromNumber ?? message?.from ?? ''),
        to_number: String(message?.to_number ?? message?.ToNumber ?? message?.to ?? ''),
        message_body: String(message?.message_body ?? message?.MessageBody ?? message?.message ?? message?.body ?? ''),
        sender_name: String(message?.sender_name ?? message?.SenderName ?? ''),
        received_at: message?.received_at ?? message?.ReceivedAt ?? message?.created_at ?? null,
        raw: message,
      }));
    }

    return [];
  }

  get totalMessages(): number {
    return this.replyData.summary.total_messages || this.replyData.messages.length;
  }

  get uniqueCustomers(): number {
    return this.replyData.summary.unique_customers || this.replyData.messages.length;
  }

  get readyToReplyCount(): number {
    return this.replyData.messages.filter((message: any) => String(message?.reply_to_number ?? message?.from_number ?? '').trim() !== '').length;
  }

  get latestReplyLabel(): string {
    const latest = this.replyData.messages[0];
    return latest?.received_at ? this.extras.formatDateWithTime(latest.received_at) : 'No messages yet';
  }

  get fixedFromNumber(): string {
    return this.replyData.defaults.from_number || 'Not configured';
  }

  get medicineOptions(): any[] {
    const medicines = Array.isArray(this.medicineData.data?.data) ? this.medicineData.data.data : [];
    return medicines.filter((medicine: any) => Number(medicine?.stocks ?? 0) > 0);
  }

  get resolvedBranchName(): string {
    const storedBranch = this.encryptData.decryptData('branch');

    return String(
      storedBranch?.selectedBranchName
      ?? storedBranch?.branch_name
      ?? this.userData.data?.branch_name
      ?? this.userData.data?.data?.branch_name
      ?? ''
    ).trim();
  }

  get pharmacyName(): string {
    return String(this.getUserField('company_name') ?? 'KMV Pharmacy').trim() || 'KMV Pharmacy';
  }

  get hasBranchName(): boolean {
    return this.resolvedBranchName !== '';
  }

  get currentMessageLength(): number {
    return this.composeModel.message_body.length;
  }

  get hasOrderItems(): boolean {
    return this.orderBuilder.enabled && this.getValidOrderItems().length > 0;
  }

  get selectedConversationNumber(): string {
    const selected = this.selectedMessage();
    return String(selected?.normalized_customer_number ?? selected?.reply_to_number ?? selected?.from_number ?? '').trim();
  }

  selectedMessage(): any | null {
    const selectedId = this.selectedMessageId();
    return this.replyData.messages.find((message: any) => String(message?.id) === selectedId) ?? null;
  }

  isSelectedMessage(message: any): boolean {
    return this.selectedMessageId() === String(message?.id ?? '');
  }

  selectMessage(message: any) {
    this.selectedMessageId.set(String(message?.id ?? ''));
    this.composeModel.to_number = String(message?.reply_to_number ?? message?.from_number ?? '');
    this.visibleConversationCount = this.conversationPageSize;
    this.refreshOrderMessage();
    this.tryAutoBuildFromSelectedMessage(true);
    this.scrollConversationToBottom();
  }

  openComposerModal() {
    const selected = this.selectedMessage();
    if (!selected) {
      this.extras.showToast('Select a conversation first before opening the message composer.', 'warning');
      return;
    }

    this.composeModel.to_number = String(selected?.reply_to_number ?? selected?.from_number ?? '');
    this.refreshOrderMessage();
    this.isComposerModalOpen.set(true);
  }

  closeComposerModal() {
    this.isComposerModalOpen.set(false);
    this.isPickupScheduleModalOpen.set(false);
  }

  getConversationTimeline(): any[] {
    const selected = this.selectedMessage();
    return Array.isArray(selected?.history) ? selected.history : [];
  }

  getVisibleConversationTimeline(): any[] {
    const timeline = this.getConversationTimeline();
    return timeline.slice(Math.max(0, timeline.length - this.visibleConversationCount));
  }

  hasMoreConversationHistory(): boolean {
    return this.getConversationTimeline().length > this.getVisibleConversationTimeline().length;
  }

  onConversationScroll(event: Event) {
    const container = event.target as HTMLDivElement | null;
    if (!container || container.scrollTop > 40 || !this.hasMoreConversationHistory()) {
      return;
    }

    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;

    this.visibleConversationCount += this.conversationPageSize;
    this.cd.detectChanges();

    setTimeout(() => {
      const currentContainer = this.conversationScrollContainer?.nativeElement;
      if (!currentContainer) {
        return;
      }

      const heightDifference = currentContainer.scrollHeight - previousHeight;
      currentContainer.scrollTop = previousTop + heightDifference;
    });
  }

  getConversationCountLabel(): string {
    const count = this.getConversationTimeline().length;
    return `${count} ${count === 1 ? 'message' : 'messages'}`;
  }

  getConversationBubbleClass(direction: string): string {
    return direction === 'outbound'
      ? 'ml-auto border-emerald-200 bg-emerald-50 text-slate-800'
      : 'mr-auto border-slate-200 bg-white text-slate-800';
  }

  getConversationMetaClass(direction: string): string {
    return direction === 'outbound'
      ? 'text-emerald-700'
      : 'text-slate-500';
  }

  getDirectionLabel(direction: string): string {
    return direction === 'outbound' ? 'Pharmacy' : 'Customer';
  }

  getLogDirectionClass(direction: string): string {
    return direction === 'outbound'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-sky-100 text-sky-700';
  }

  getLogTemplateTag(templateTag: string): string {
    return String(templateTag || 'Custom Reply').trim() || 'Custom Reply';
  }

  get totalLogPages(): number {
    return Math.max(1, Math.ceil(this.messageLogs.length / this.logsPageSize));
  }

  get paginatedMessageLogs(): any[] {
    const start = (this.logsCurrentPage - 1) * this.logsPageSize;
    return this.messageLogs.slice(start, start + this.logsPageSize);
  }

  get logsRangeLabel(): string {
    if (!this.messageLogs.length) {
      return '0 of 0';
    }

    const start = (this.logsCurrentPage - 1) * this.logsPageSize + 1;
    const end = Math.min(this.logsCurrentPage * this.logsPageSize, this.messageLogs.length);
    return `${start}-${end} of ${this.messageLogs.length}`;
  }

  previousLogsPage() {
    if (this.logsCurrentPage <= 1) {
      return;
    }

    this.logsCurrentPage -= 1;
  }

  nextLogsPage() {
    if (this.logsCurrentPage >= this.totalLogPages) {
      return;
    }

    this.logsCurrentPage += 1;
  }

  async deleteSelectedConversation() {
    const counterpartyNumber = this.selectedConversationNumber;
    if (!counterpartyNumber) {
      this.extras.showToast('No conversation selected.', 'warning');
      return;
    }

    const selected = this.selectedMessage();
    const label = String(selected?.from_number ?? counterpartyNumber).trim() || counterpartyNumber;
    this.openDeleteModal({
      type: 'conversation',
      label,
      counterpartyNumber,
      cutoffAt: this.getConversationDeleteCutoff(),
      messageId: null,
    });
  }

  async confirmDeleteAction() {
    const modalState = this.deleteModalState;
    if (!modalState.type) {
      return;
    }

    if (modalState.type === 'conversation') {
      await this.performConversationDelete(modalState.counterpartyNumber, modalState.cutoffAt);
      return;
    }

    if (modalState.messageId) {
      await this.performMessageDelete(modalState.messageId, modalState.type === 'log_message');
    }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deleteModalState = {
      type: '',
      label: '',
      counterpartyNumber: '',
      cutoffAt: null,
      messageId: null,
    };
  }

  getDeleteModalTitle(): string {
    return this.deleteModalState.type === 'conversation' ? 'Delete Conversation' : 'Delete Message';
  }

  getDeleteModalBody(): string {
    if (this.deleteModalState.type === 'conversation') {
      return 'Messages in this conversation up to the selected point will be hidden. Newer messages from this customer will still appear.';
    }

    if (this.deleteModalState.type === 'log_message') {
      return 'Only this stored SMS log entry will be hidden from the message history.';
    }

    return 'Only this selected message will be hidden. The rest of the conversation will stay visible.';
  }

  getDeleteModalLabel(): string {
    return this.deleteModalState.label;
  }

  private openDeleteModal(state: {
    type: 'conversation' | 'message' | 'log_message';
    label: string;
    counterpartyNumber: string;
    cutoffAt: string | null;
    messageId: number | null;
  }) {
    this.deleteModalState = state;
    this.isDeleteModalOpen.set(true);
  }

  private async performConversationDelete(counterpartyNumber: string, cutoffAt: string | null) {
    this.isDeletingConversation.set(true);

    try {
      const encodedNumber = encodeURIComponent(counterpartyNumber);
      const res = await this.userService.deleteUser(
        `sms/conversations/${encodedNumber}`,
        cutoffAt ? { cutoff_at: cutoffAt } : null,
        this.userData.token
      );
      this.extras.showToast(res.data?.message ?? 'Conversation deleted successfully.', 'success');
      this.selectedMessageId.set('');
      this.closeDeleteModal();
      await this.getReplies();
      await this.getMessageLogs();
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'Unable to delete the conversation.', 'warning');
    } finally {
      this.isDeletingConversation.set(false);
      this.cd.detectChanges();
    }
  }

  async deleteConversationMessage(historyItem: any) {
    const messageId = Number(historyItem?.id ?? 0);
    if (!messageId) {
      this.extras.showToast('This message cannot be deleted yet.', 'warning');
      return;
    }

    this.openDeleteModal({
      type: 'message',
      label: String(historyItem?.message_body ?? '').trim().slice(0, 80) || 'this message',
      counterpartyNumber: '',
      cutoffAt: null,
      messageId,
    });
  }

  async deleteLogMessage(log: any) {
    const messageId = Number(log?.id ?? 0);
    if (!messageId) {
      this.extras.showToast('Invalid message selected.', 'warning');
      return;
    }

    this.openDeleteModal({
      type: 'log_message',
      label: String(log?.message_body ?? '').trim().slice(0, 80) || 'this stored log',
      counterpartyNumber: '',
      cutoffAt: null,
      messageId,
    });
  }

  private async performMessageDelete(messageId: number, isLogDelete = false) {
    this.deletingConversationMessageId.set(messageId);
    if (isLogDelete) {
      this.deletingLogMessageId.set(messageId);
    }

    try {
      const res = await this.userService.deleteUser(`sms/messages/${messageId}`, null, this.userData.token);
      this.extras.showToast(res.data?.message ?? 'SMS message deleted successfully.', 'success');
      this.closeDeleteModal();
      await this.getReplies();
      await this.getMessageLogs();
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'Unable to delete the SMS message.', 'warning');
    } finally {
      this.deletingConversationMessageId.set(null);
      if (isLogDelete) {
        this.deletingLogMessageId.set(null);
      }
      this.cd.detectChanges();
    }
  }

  createOrderItem() {
    return {
      medicine_id: '',
      name: '',
      quantity: 1,
      price: 0,
      available_stock: 0,
    };
  }

  addOrderItem() {
    if (!this.orderBuilder.enabled) {
      this.orderBuilder.enabled = true;
    }

    if (!this.orderBuilder.items.length) {
      this.orderBuilder.items = [];
    }

    this.orderBuilder.items.push(this.createOrderItem());
    this.refreshOrderMessage();
  }

  removeOrderItem(index: number) {
    this.orderBuilder.items.splice(index, 1);

    if (!this.orderBuilder.items.length) {
      this.orderBuilder.amount = 0;
    }

    this.refreshOrderMessage();
  }

  updateOrderBuilder() {
    if (!this.orderBuilder.enabled) {
      this.orderBuilder.amount = 0;
      this.refreshOrderMessage();
      return;
    }

    let stockExceeded = false;

    this.orderBuilder.items = this.orderBuilder.items.map((item: any) => {
      const requested = Math.max(1, Number(item.quantity || 1));
      const stock = Math.max(0, Number(item.available_stock || 0));
      const cappedQuantity = this.getCappedQuantity(item);

      if (stock > 0 && requested > stock) {
        stockExceeded = true;
      }

      return {
        ...item,
        quantity: cappedQuantity,
        price: Math.max(0, Number(item.price || 0)),
        available_stock: stock,
      };
    });

    if (stockExceeded) {
      this.extras.showToast('Quantity cannot be greater than the available stock.', 'warning');
    }

    const computedTotal = this.getComputedOrderAmount();
    this.orderBuilder.amount = computedTotal > 0
      ? computedTotal
      : Math.max(0, Number(this.orderBuilder.amount || 0));
    this.refreshOrderMessage();
  }

  toggleOrderBuilder() {
    this.orderBuilder.enabled = !this.orderBuilder.enabled;

    if (!this.orderBuilder.enabled) {
      this.orderBuilder.items = [];
      this.orderBuilder.amount = 0;
      this.orderBuilder.payment_method = 'Cash';
    }

    this.refreshOrderMessage();
  }

  getSelectedBranchId(): number {
    const storedBranch = this.encryptData.decryptData('branch');
    return Number(storedBranch?.selectedBranch ?? this.getUserField('branch_id') ?? 0);
  }

  async getMedicineOptions() {
    try {
      const params = [
        `company_id=${this.companyId}`,
        `branch_id=${this.getSelectedBranchId()}`,
        'per_page=100',
      ];

      const res = await this.userService.getUser(`medicine?${params.join('&')}`, null, this.userData.token);
      if (res.status === 200) {
        this.medicineData.data = res.data ?? { data: [] };
      } else {
        this.medicineData.data = { data: [] };
      }
    } catch (e) {
      console.log(e);
      this.medicineData.data = { data: [] };
      this.extras.showToast('Unable to load medicine options for offline orders.', 'warning');
    } finally {
      this.tryAutoBuildFromSelectedMessage(false);
      this.cd.detectChanges();
    }
  }

  selectInventoryItem(index: number, medicineId: string | number) {
    const selectedMedicine = this.medicineOptions.find(
      (medicine: any) => String(medicine?.medicine_id) === String(medicineId)
    );

    if (!selectedMedicine) {
      this.orderBuilder.items[index] = this.createOrderItem();
      this.updateOrderBuilder();
      return;
    }

    const currentItem = this.orderBuilder.items[index] ?? this.createOrderItem();
    this.orderBuilder.items[index] = {
      ...currentItem,
      medicine_id: String(selectedMedicine.medicine_id),
      name: String(selectedMedicine.medicine_name ?? ''),
      quantity: Math.max(1, Number(currentItem.quantity || 1)),
      price: Number(selectedMedicine.price ?? 0),
      available_stock: Number(selectedMedicine.stocks ?? 0),
    };

    this.updateOrderBuilder();
  }

  isMedicineDisabledForRow(medicineId: string | number, rowIndex: number): boolean {
    return this.orderBuilder.items.some((item: any, index: number) => {
      if (index === rowIndex) {
        return false;
      }

      return String(item?.medicine_id ?? '') === String(medicineId);
    });
  }

  getComputedOrderAmount(): number {
    return this.getValidOrderItems().reduce((total: number, item: any) => {
      const qty = Math.max(0, Number(item.quantity || 0));
      const price = Math.max(0, Number(item.price || 0));
      return total + (qty * price);
    }, 0);
  }

  private getValidOrderItems(): any[] {
    if (!this.orderBuilder.enabled) {
      return [];
    }

    return this.orderBuilder.items.filter((item: any) => Number(item?.medicine_id || 0) > 0);
  }

  private getCappedQuantity(item: any): number {
    const stock = Math.max(0, Number(item?.available_stock || 0));
    const requested = Math.max(1, Number(item?.quantity || 1));

    if (stock <= 0) {
      return 1;
    }

    return Math.min(requested, stock);
  }

  selectTemplate(template: string) {
    if (this.isTemplateDisabled(template)) {
      this.extras.showToast(`This template is over the ${this.messageLimit}-character SMS limit.`, 'warning');
      return;
    }

    this.composeModel.template_name = template;
    this.syncOrderBuilderForTemplate(template);
    this.tryAutoBuildFromSelectedMessage(false);
    this.refreshOrderMessage();

    if (this.requiresPickupSchedule(template)) {
      this.openPickupScheduleModal(template);
    }
  }

  getTemplateLength(template: string): number {
    return this.buildTemplateMessage(template).length;
  }

  isTemplateDisabled(template: string): boolean {
    return this.getTemplateLength(template) > this.messageLimit;
  }

  onMessageEdited() {
    this.enforceMessageLimit();
  }

  private refreshOrderMessage() {
    const template = this.composeModel.template_name;

    if (!template) {
      if (!this.composeModel.message_body.trim()) {
        this.composeModel.message_body = this.defaultTemplateMessage();
      }

      this.enforceMessageLimit();
      return;
    }

    this.composeModel.message_body = this.buildTemplateMessage(template);
    this.enforceMessageLimit();
  }

  private defaultTemplateMessage(): string {
    if (!this.hasBranchName) {
      return `Order inquiry received. Reply with branch, item, and qty.`;
    }

    return `${this.getBranchName()}: Reply with item and qty.`;
  }

  private buildTemplateMessage(template: string): string {
    const branchLabel = this.hasBranchName ? this.getBranchName() : 'your branch';
    const itemSummary = this.orderBuilder.enabled ? this.buildItemSummary() : '';
    const amountLabel = this.orderBuilder.enabled && this.orderBuilder.amount > 0
      ? ` Total: PHP ${this.extras.formatCurrency(this.orderBuilder.amount)}.`
      : '';
    const paymentLabel = this.orderBuilder.enabled && this.orderBuilder.payment_method
      ? ` Payment: ${this.orderBuilder.payment_method}.`
      : '';

    const fallbackBranchAsk = ' Reply with branch.';
    const pickupScheduleLabel = this.getPickupScheduleText();

    const templates: Record<string, string> = {
      'Medicine Order Format': this.buildMedicineOrderFormatMessage(),
      'Order Confirmation (Pickup)': `${branchLabel}: Pickup confirmed.${itemSummary}${amountLabel} Pickup time: ${pickupScheduleLabel}.${this.hasBranchName ? '' : fallbackBranchAsk}`,
      'Order Confirmation (Pickup Time)': `${branchLabel}: Pickup confirmed.${itemSummary}${amountLabel}${paymentLabel} Pickup time: ${pickupScheduleLabel}.${this.hasBranchName ? '' : fallbackBranchAsk}`,
      'Payment Instructions (GCash)': `${branchLabel}: Send GCash.${amountLabel || ' Total to follow.'} Reply with the ref no.${this.hasBranchName ? '' : fallbackBranchAsk}`,
      'Out of Stock + Alternative Offered': `${branchLabel}: Some items are unavailable. Reply if you want alternatives.${this.hasBranchName ? '' : fallbackBranchAsk}`,
      'Ready for Pickup': `${branchLabel}: Order ready for pickup at ${pickupScheduleLabel}.${amountLabel} Bring a valid ID.`,
      'Pickup Time Reminder': `${branchLabel}: Pickup time is ${pickupScheduleLabel}.${paymentLabel}${amountLabel} Reply if you need to adjust it.`,
    };

    return templates[template] ?? this.defaultTemplateMessage();
  }

  private buildItemSummary(): string {
    const validItems = this.getValidOrderItems().filter((item: any) => String(item.name ?? '').trim() !== '');
    if (!validItems.length) {
      return '';
    }

    const summary = this.buildCompactOrderItemsSummary(validItems);
    return summary ? ` Items: ${summary}.` : '';
  }

  private buildMedicineOrderFormatMessage(): string {
    const branchLabel = this.hasBranchName ? this.getBranchName() : 'your branch';
    const validItems = this.getValidOrderItems().filter((item: any) => String(item.name ?? '').trim() !== '');
    const itemLine = this.buildCompactOrderItemsSummary(validItems) || '[qty] medicine';
    const amountLabel = this.orderBuilder.enabled && this.orderBuilder.amount > 0
      ? ` Total: PHP ${this.extras.formatCurrency(this.orderBuilder.amount)}.`
      : '';
    const paymentLabel = this.orderBuilder.enabled && this.orderBuilder.payment_method
      ? ` Payment: ${this.orderBuilder.payment_method}.`
      : '';
    const branchAsk = this.hasBranchName ? '' : ' Reply with branch.';

    return `${branchLabel}: Order ${itemLine}.${amountLabel}${paymentLabel}${branchAsk}`.replace(/\s+/g, ' ').trim();
  }

  private buildCompactOrderItemsSummary(validItems: any[]): string {
    if (!validItems.length) {
      return '';
    }

    const full = validItems
      .map((item: any) => `${item.quantity}x ${String(item.name).trim()}`)
      .join(', ');

    if (full.length <= 70) {
      return full;
    }

    const short = validItems
      .map((item: any) => `${item.quantity}x ${this.shortenMedicineName(item.name)}`)
      .join(', ');

    if (short.length <= 70) {
      return short;
    }

    const firstTwo = validItems
      .slice(0, 2)
      .map((item: any) => `${item.quantity}x ${this.shortenMedicineName(item.name)}`)
      .join(', ');

    return validItems.length > 2 ? `${firstTwo}, +${validItems.length - 2} more` : firstTwo;
  }

  private shortenMedicineName(name: string): string {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) {
      return 'item';
    }

    if (trimmed.length <= 18) {
      return trimmed;
    }

    return `${trimmed.slice(0, 15).trim()}...`;
  }

  private getBranchName(): string {
    return String(this.resolvedBranchName || 'branch').replace(/\s+/g, ' ').trim();
  }

  private shortenLabel(value: string, maxLength: number): string {
    const trimmed = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.length <= maxLength) {
      return trimmed;
    }

    return `${trimmed.slice(0, Math.max(6, maxLength - 3)).trim()}...`;
  }

  private enforceMessageLimit() {
    if (this.composeModel.message_body.length <= this.messageLimit) {
      return;
    }

    this.composeModel.message_body = this.composeModel.message_body.slice(0, this.messageLimit);
  }

  private scrollConversationToBottom() {
    setTimeout(() => {
      const container = this.conversationScrollContainer?.nativeElement;
      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
    });
  }

  private getConversationDeleteCutoff(): string | null {
    const timeline = this.getConversationTimeline();
    const latestVisible = [...timeline]
      .reverse()
      .find((item: any) => String(item?.received_at ?? '').trim() !== '');

    return latestVisible?.received_at ? String(latestVisible.received_at) : null;
  }

  private tryAutoBuildFromSelectedMessage(force: boolean) {
    const source = this.getAutoBuildSourceMessage();
    if (!source || !this.medicineOptions.length) {
      return;
    }

    const sourceKey = `${source.id}|${source.received_at ?? ''}|${source.message_body ?? ''}`;
    if (!force && this.lastAutoBuildSourceKey === sourceKey) {
      return;
    }

    if (!this.isOrderingMessageText(source.message_body)) {
      return;
    }

    const parsedItems = this.extractOrderItemsFromMessage(source.message_body);
    this.lastAutoBuildSourceKey = sourceKey;
    this.orderBuilder.enabled = true;

    if (!parsedItems.length) {
      if (!this.orderBuilder.items.length) {
        this.orderBuilder.items = [this.createOrderItem()];
      }
      this.refreshOrderMessage();
      return;
    }

    this.orderBuilder.items = parsedItems.map((item: any) => ({
      medicine_id: String(item.medicine_id),
      name: String(item.name ?? ''),
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Math.max(0, Number(item.price || 0)),
      available_stock: Math.max(0, Number(item.available_stock || 0)),
    }));

    this.updateOrderBuilder();
  }

  private getAutoBuildSourceMessage(): any | null {
    const timeline = this.getConversationTimeline();
    const latestInbound = [...timeline]
      .reverse()
      .find((item: any) => String(item?.direction ?? '').toLowerCase() !== 'outbound');

    return latestInbound ?? this.selectedMessage();
  }

  private isOrderingMessageText(messageBody: string): boolean {
    return /\border\b/.test(this.normalizeOrderText(messageBody));
  }

  private extractOrderItemsFromMessage(messageBody: string): any[] {
    const orderBody = this.extractOrderBody(messageBody);
    if (!orderBody) {
      return [];
    }

    const segments = orderBody
      .split(/[\n,;]+/)
      .map((segment: string) => segment.trim())
      .filter((segment: string) => segment !== '');

    const detected = new Map<string, any>();

    for (const rawSegment of segments) {
      const parsed = this.parseOrderSegment(rawSegment);
      if (!parsed) {
        continue;
      }

      const medicine = this.findMedicineOptionByText(parsed.label);
      if (!medicine) {
        continue;
      }

      const key = String(medicine.medicine_id);
      const quantity = Math.max(1, Number(parsed.quantity || 1));
      const previous = detected.get(key);

      detected.set(key, {
        medicine_id: medicine.medicine_id,
        name: String(medicine.medicine_name ?? ''),
        quantity: previous ? previous.quantity + quantity : quantity,
        price: Number(medicine.price ?? 0),
        available_stock: Number(medicine.stocks ?? 0),
      });
    }

    return Array.from(detected.values());
  }

  private extractOrderBody(messageBody: string): string {
    const normalized = String(messageBody ?? '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    const orderMatch = normalized.match(/\border\b[:\s-]*(.+)$/i);
    const rawBody = orderMatch?.[1] ?? normalized;

    return rawBody
      .replace(/\b(please|pls)\b.*$/i, '')
      .replace(/\b(confirm|stock|price|pickup|delivery|payment|total)\b.*$/i, '')
      .trim();
  }

  private parseOrderSegment(segment: string): { label: string; quantity: number } | null {
    const cleaned = segment
      .replace(/^\s*(and|&)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return null;
    }

    const quantityFirst = cleaned.match(/^(\d+)\s*(?:x|pcs?|pieces?|tabs?|tablets?|caps?|capsules?|bottles?|boxes?|vials?)?\s+(.+)$/i);
    if (quantityFirst) {
      return {
        quantity: Number(quantityFirst[1]),
        label: quantityFirst[2].trim(),
      };
    }

    const quantityLast = cleaned.match(/^(.+?)\s+(\d+)\s*(?:x|pcs?|pieces?|tabs?|tablets?|caps?|capsules?|bottles?|boxes?|vials?)?$/i);
    if (quantityLast) {
      return {
        quantity: Number(quantityLast[2]),
        label: quantityLast[1].trim(),
      };
    }

    const label = cleaned.replace(/^\[qty\]\s*/i, '').trim();
    return label ? { label, quantity: 1 } : null;
  }

  private findMedicineOptionByText(text: string): any | null {
    const normalizedText = this.normalizeOrderText(text);
    if (!normalizedText) {
      return null;
    }

    let bestMatch: any = null;
    let bestScore = 0;

    for (const medicine of this.medicineOptions) {
      const names = [
        this.normalizeOrderText(String(medicine?.medicine_name ?? '')),
        this.normalizeOrderText(String(medicine?.generic_name ?? '')),
      ].filter(Boolean);

      for (const name of names) {
        const exactScore = normalizedText === name ? 1000 + name.length : 0;
        const containsScore = normalizedText.includes(name) || name.includes(normalizedText)
          ? 100 + Math.min(name.length, normalizedText.length)
          : 0;
        const startsScore = normalizedText.startsWith(name) || name.startsWith(normalizedText)
          ? 50 + Math.min(name.length, normalizedText.length)
          : 0;
        const score = Math.max(exactScore, containsScore, startsScore);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = medicine;
        }
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  private normalizeOrderText(value: string): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private syncOrderBuilderForTemplate(template: string) {
    if (!this.isOrderingTemplate(template) || this.orderBuilder.enabled) {
      return;
    }

    this.orderBuilder.enabled = true;

    if (!this.orderBuilder.items.length) {
      this.orderBuilder.items = [this.createOrderItem()];
    }
  }

  private isOrderingTemplate(template: string): boolean {
    const normalized = String(template ?? '').trim().toLowerCase();

    return [
      'medicine order format',
      'order confirmation (pickup)',
      'order confirmation (pickup time)',
      'payment instructions (gcash)',
      'ready for pickup',
      'pickup time reminder',
    ].includes(normalized);
  }

  requiresPickupSchedule(template = this.composeModel.template_name): boolean {
    const normalized = String(template ?? '').trim().toLowerCase();

    return [
      'order confirmation (pickup)',
      'order confirmation (pickup time)',
      'ready for pickup',
      'pickup time reminder',
    ].includes(normalized);
  }

  openPickupScheduleModal(template = this.composeModel.template_name) {
    this.pickupScheduleModel.template_name = template;

    if (!this.pickupScheduleModel.pickup_date || !this.pickupScheduleModel.pickup_time) {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      this.pickupScheduleModel.pickup_date ||= this.toInputDate(nextHour);
      this.pickupScheduleModel.pickup_time ||= this.toInputTime(nextHour);
    }

    this.isPickupScheduleModalOpen.set(true);
  }

  closePickupScheduleModal() {
    this.isPickupScheduleModalOpen.set(false);
  }

  applyPickupSchedule() {
    if (!this.pickupScheduleModel.pickup_date || !this.pickupScheduleModel.pickup_time) {
      this.extras.showToast('Pickup date and time are required.', 'warning');
      return;
    }

    const pickupDateTime = this.getPickupScheduleDateTime();
    if (!pickupDateTime) {
      this.extras.showToast('Pickup schedule is invalid.', 'warning');
      return;
    }

    this.refreshOrderMessage();
    this.isPickupScheduleModalOpen.set(false);
  }

  getPickupScheduleText(): string {
    const pickupDateTime = this.getPickupScheduleDateTime();

    if (!pickupDateTime) {
      return 'pickup date and time to follow';
    }

    return new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(pickupDateTime);
  }

  private getPickupScheduleDateTime(): Date | null {
    const { pickup_date, pickup_time } = this.pickupScheduleModel;
    if (!pickup_date || !pickup_time) {
      return null;
    }

    const value = new Date(`${pickup_date}T${pickup_time}`);
    return Number.isNaN(value.getTime()) ? null : value;
  }

  private toInputDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toInputTime(value: Date): string {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private buildOfflineOrderTransactionPayload(): SalesModel {
    const items = this.getValidOrderItems().map((item: any) => ({
      medicine_id: Number(item.medicine_id),
      quantity: Number(item.quantity),
    }));

    const totalAmount = this.getComputedOrderAmount();

    return {
      user_id: Number(this.getUserField('user_id') ?? 0),
      branch_id: this.getSelectedBranchId(),
      transaction_type: 'regular',
      total_amount: totalAmount,
      sub_total: totalAmount,
      change: 0,
      used_amount: totalAmount,
      payment_method: this.orderBuilder.payment_method,
      discount: 0,
      discount_type: '',
      scpwd_id_number: '',
      request_token: crypto.randomUUID(),
      items,
    };
  }

  private validateOfflineOrderBuilder(): boolean {
    if (!this.hasOrderItems) {
      return true;
    }

    if (!this.orderBuilder.payment_method) {
      this.extras.showToast('Payment method is required for offline orders.', 'warning');
      return false;
    }

    const transactionPayload = this.buildOfflineOrderTransactionPayload();

    if (!transactionPayload.user_id || !transactionPayload.branch_id) {
      this.extras.showToast('User or branch details are missing for offline order processing.', 'warning');
      return false;
    }

    if (!transactionPayload.items?.length || Number(transactionPayload.total_amount || 0) <= 0) {
      this.extras.showToast('Select valid medicines before processing the offline order.', 'warning');
      return false;
    }

    return true;
  }

  private resetOrderBuilder() {
    this.orderBuilder = {
      enabled: false,
      payment_method: 'Cash',
      amount: 0,
      items: [],
    };
  }

  private async processOfflineOrderTransaction(): Promise<boolean> {
    if (!this.hasOrderItems) {
      return true;
    }

    const payload = this.buildOfflineOrderTransactionPayload();
    const res = await this.userService.postUser('transaction', payload, this.userData.token);

    if (res.status >= 200 && res.status < 300) {
      this.extras.showToast('Offline order saved as a sales transaction.', 'success');
      this.resetOrderBuilder();
      return true;
    }

    this.extras.showToast(res.data?.message ?? 'Unable to create offline order transaction.', 'warning');
    return false;
  }

  async sendReply() {
    if (!this.composeModel.to_number.trim() || !this.composeModel.message_body.trim()) {
      this.extras.showToast('Recipient number and message are required.', 'warning');
      return;
    }

    if (this.requiresPickupSchedule() && !this.getPickupScheduleDateTime()) {
      this.openPickupScheduleModal();
      this.extras.showToast('Set the pickup date and time before sending this reply.', 'warning');
      return;
    }

    if (!this.composeModel.sender_name.trim() || !this.fixedFromNumber || this.fixedFromNumber === 'Not configured') {
      this.extras.showToast('Sender name and fixed from number are required.', 'warning');
      return;
    }

    if (this.composeModel.message_body.trim().length > this.messageLimit) {
      this.extras.showToast(`Reply message must only be ${this.messageLimit} characters or less.`, 'warning');
      return;
    }

    if (!this.validateOfflineOrderBuilder()) {
      return;
    }

    this.isSending.set(true);

    try {
      const orderProcessed = await this.processOfflineOrderTransaction();
      if (!orderProcessed) {
        return;
      }

      const payload = {
        sender_name: this.composeModel.sender_name.trim(),
        to_number: this.composeModel.to_number.trim(),
        message_body: this.composeModel.message_body.trim(),
        template_tag: this.composeModel.template_name.trim() || 'Custom Reply',
      };

      const res = await this.userService.postUser('sms/messages', payload, this.userData.token);

        if (res.status >= 200 && res.status < 300 && res.data?.success) {
          const referenceNumber = res.data?.data?.reference_number ? ` Ref: ${res.data.data.reference_number}` : '';
          this.extras.showToast((res.data?.message ?? 'SMS reply sent successfully.') + referenceNumber, 'success');
          this.composeModel.message_body = '';
          this.composeModel.template_name = '';
          this.closeComposerModal();
          await this.getReplies();
          await this.getMessageLogs();
          this.scrollConversationToBottom();
          return;
        }

      this.extras.showToast(res.data?.message ?? 'Unable to send SMS reply.', 'warning');
    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message ?? 'Unable to send SMS reply.', 'warning');
    } finally {
      this.isSending.set(false);
      this.cd.detectChanges();
    }
  }
}
