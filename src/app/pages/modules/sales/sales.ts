import { Component, OnInit, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { MedicineData } from '../../../../models/MedicineModel';
import { UserService } from '../../../../services/services';
import { EncryptData } from '../../../../environment/encrypt-data';
import { ChangeDetectorRef } from '@angular/core';
import { UserData } from '../../../../models/UserModel';
import { Extras } from '../../../../extras/extras';
import { SalesModel, SalesData } from '../../../../models/SalesModel';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-sales',
  imports: [IonIcon, FormsModule, CommonModule],
  templateUrl: './sales.html',
  styleUrl: './sales.css',
})
export class Sales implements OnInit {
  medicineData: MedicineData = {
    data: [],
    selectedData: [],
    inputData: [],
    salesData: [],
  }

  salesModel: SalesModel = {
    discount: 0,
    sub_total: 0,
    total_amount: 0,
    scpwd_id_number: '',
    discount_type: '',
    payment_method: '',
    used_amount: 0,
    items: [],
    request_token: ''
  }

  salesData: SalesData = {
    categoryData: [],
    selectedCategory: '',
    transactionData: [],
    selectedTransaction: '',
    discountData: [
      {
        "type": "SCPWD",
        "discount": 0.20
      },
      {
        "type": "DISC",
        "discount": 0.20
      }
    ],
    selectedDiscount: '',
  }
  userData: UserData = {
    data: []
  }
  paymentMethodList: any = [
    {
      "type": "Cash",
      "icon": "cash-outline"
    },
    {
      "type": "Card",
      "icon": "card-outline"
    },
    {
      "type": "Gcash",
      "icon": "phone-portrait-outline"
    },
  ]
  stockMap: { [key: number]: any } = {};
  onLoad = signal(false);
  isDiscount = signal(false);
  isPay = signal(false);
  isSelectTransaction = signal(false);
  pageNumber: number = 1;
  sort: string = '';
  searchQuery: string = '';
  extras = Extras;
  endpoint: string = 'transaction';
  constructor(
    private userService: UserService,
    private encryptData: EncryptData,
    private cd: ChangeDetectorRef
  ) { }

  filter(sortValue: string) {
    this.sort = sortValue; // "sort=price" OR "sort=-price"
    this.pageNumber = 1;   // reset page
    this.getMedicine();
  }
  saveDiscount() {
    this.salesModel.discount_type = this.salesData.selectedDiscount
    if (this.salesModel.discount_type === 'DISC') {
      if (Number(this.salesModel.discount) <= 0 || !this.salesModel.discount) {
        Extras.showToast('Please enter a valid discount amount!', 'warning');
        return;
      } else {
        this.isDiscount.set(false)
        this.salesModel.discount = Number(this.salesModel.discount);
        Extras.showToast('Discount saved successfully!', 'success');
        this.salesModel.discount_type = 'Discount';
      }
    }
    if (this.salesModel.discount_type === 'SCPWD') {
      if (!this.salesModel.scpwd_id_number || this.salesModel.scpwd_id_number.trim() === '') {
        Extras.showToast('Please enter a valid SC/PWD ID number!', 'warning');
        return;
      } else {
        this.isDiscount.set(false)
        this.salesModel.discount = Number(this.salesModel.sub_total) * 0.20;
        Extras.showToast('SC/PWD discount applied successfully!', 'success');
        this.salesModel.discount_type = 'SCPWD';
      }
    }
  }

  getUniqueCategories(): string[] {
    if (!this.medicineData.data?.data) return [];

    const normalize = (str: string) => {
      if (!str) return '';
      // Lowercase, remove spaces, remove trailing 's'
      let cleaned = str.toLowerCase().replace(/\s+/g, '');
      if (cleaned.endsWith('s')) cleaned = cleaned.slice(0, -1);
      return cleaned;
    };

    const seen = new Set<string>();
    const uniqueCategories: string[] = [];

    for (let item of this.medicineData.data.data) {
      const raw = item.category || '';
      const norm = normalize(raw);

      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueCategories.push(raw); // Push original text for display
      }
    }

    return uniqueCategories;
  }

  buildQuery(): string {
    let params: string[] = [];
    let selectedBranch: number = 0;
    let data = this.encryptData.decryptData('branch');
    if (data.selectedBranch) {
      selectedBranch = Number(this.encryptData.decryptData('branch').selectedBranch);
    }

    if (this.pageNumber) {
      params.push(`page=${this.pageNumber}`);
    }
    if (this.sort) {
      params.push(this.sort);
    }
    if (this.searchQuery) {
      params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    }
    if (selectedBranch) {
      params.push(`branch_id=${selectedBranch}`);
    }
    return this.endpoint + '?company_id=' + this.userData.data.data.company_id + '&per_page=10&' + params.join('&');
  }


  ngOnInit(): void {
    this.userData.token = this.encryptData.decryptData('user').token;
    this.userData.data = this.encryptData.decryptData('user');
    this.loadSales(); // ✅ load first
    this.getMedicine(); // ✅ call ONCE only
  }
  prev() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.getMedicine();
    }
  }
  loadSales() {
    const saved = this.encryptData.decryptData('sales');
    if (saved) {
      this.medicineData.salesData = JSON.parse(saved);
    }
  }
  next() {
    if (this.pageNumber < this.medicineData.data.meta.last_page) {
      this.pageNumber++;
      this.getMedicine();
    }
  }

  changeText(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.trim();
    this.pageNumber = 1;
    this.getMedicine();
  }
  getSubTotalPrice(): number {
    const subTotal = this.medicineData.salesData.reduce((total: number, item: any) => {
      return total + (Number(item.price) * Number(item.quantity));
    }, 0);

    this.salesModel.sub_total = subTotal;
    return subTotal;
  }

  getTotalPrice(): number {
    const subTotal = this.getSubTotalPrice();
    const discount = Number(this.salesModel.discount || 0);

    let total = subTotal - discount;
    if (total < 0) total = 0;

    this.salesModel.total_amount = total;
    return total;
  }

  customDiscountPrice(event: any): number {
    let discount = 0;

    if (this.salesData.selectedDiscount === 'DISC') {
      discount = Number(event?.target?.value || 0);
    } else {
      const found = this.salesData.discountData.find(
        (x: any) => x.type === this.salesData.selectedDiscount
      );

      const rate = found?.discount || 0;
      discount = Number(this.salesModel.sub_total) * Number(rate);
    }

    this.salesModel.discount = discount;
    return discount;
  }

  updateTransaction(
    data: any,
    action: 'addSale' | 'minusSale' | 'addStock' | 'minusStock' | 'trash'
  ) {
    const sales = this.medicineData.salesData;
    const stockItem = this.stockMap[data.medicine_id];
    let salesItem = sales.find((x: any) => x.medicine_id === data.medicine_id);

    if (!stockItem) return;

    switch (action) {
      case 'addSale':
        if (stockItem.stocks <= 0) return;

        if (!salesItem) {
          salesItem = { ...data, quantity: 0 };
          sales.push(salesItem);
          this.cd.detectChanges();
        }

        salesItem.quantity++;
        stockItem.stocks--;
        this.cd.detectChanges();
        break;

      case 'minusSale':
        if (!salesItem) return;

        salesItem.quantity--;
        stockItem.stocks++;

        if (salesItem.quantity <= 0) {
          this.removeSale(data.medicine_id);
        }
        this.cd.detectChanges();
        break;

      case 'addStock':
        if (!salesItem) return;

        salesItem.quantity--;
        stockItem.stocks++;

        if (salesItem.quantity <= 0) {
          this.removeSale(data.medicine_id);
        }
        this.cd.detectChanges();
        break;

      case 'minusStock':
        if (stockItem.stocks <= 0) return;

        if (!salesItem) {
          salesItem = { ...data, quantity: 0 };
          sales.push(salesItem);
        }

        salesItem.quantity++;
        stockItem.stocks--;
        this.cd.detectChanges();
        break;

      case 'trash':
        if (!salesItem) return;

        stockItem.stocks += salesItem.quantity;
        this.removeSale(data.medicine_id);
        break;
    }

    if (salesItem) this.updateTotal(salesItem);

    this.syncStocksWithSales(); // 🔥 ALWAYS RESYNC
    this.customDiscountPrice(null);
    this.saveSales();
    this.cd.detectChanges();
  }
  getStock(medicineId: number): number {
    const stockItem = this.stockMap[medicineId];
    if (!stockItem) return 0; // medicine not found in the map
    return stockItem.stocks || 0; // return current stock
  }

  removeSale(medicine_id: number) {
    this.medicineData.salesData =
      this.medicineData.salesData.filter(
        (x: any) => x.medicine_id !== medicine_id
      );
  }

  saveSales() {
    this.encryptData.encryptAndStoreData('sales', JSON.stringify(this.medicineData.salesData));
  }

  updateTotal(item: any) {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);

    item.total_price = price * qty;
  }
  async pay() {

    this.salesModel.items = this.medicineData.salesData.map((item: any) => ({
      medicine_id: item.medicine_id,
      quantity: item.quantity
    }));

    if (!this.salesModel.items?.length || Number(this.salesModel.sub_total) <= 0 || Number(this.salesModel.used_amount) <= 0) {
      this.extras.showToast('All fields are required', 'warning');
      return;
    }

    if (this.salesModel.discount_type === "DISC" && !this.salesModel.discount) {
      this.extras.showToast('Please input the discounted price', 'warning');
      return;
    }

    if (this.salesModel.discount_type === "SCPWD" && !this.salesModel.scpwd_id_number) {
      this.extras.showToast('Please input SCPWD ID number', 'warning');
      return;
    }

    if (Number(this.salesModel.used_amount) < Number(this.salesModel.total_amount)) {
      this.extras.showToast('Insufficient payment amount', 'danger');
      return;
    }
    if(!this.salesModel.payment_method){
        this.extras.showToast('Payment method is required', 'danger');
      return;
    }
    try {

      this.salesModel.change = this.extras.computeChange(
        Number(this.salesModel.used_amount),
        Number(this.salesModel.total_amount)
      );

      this.salesModel.user_id = this.userData.data.data.user_id;
      this.salesModel.branch_id = this.userData.data.data.branch_id;

      // 🔐 prevent duplicate
      this.salesModel.request_token = crypto.randomUUID();

      const payload = { ...this.salesModel };
      const res = await this.userService.postUser('transaction', payload, this.userData.token);
      if (res.status === 201) {

        this.extras.showToast("Transaction Completed", "success");

        // 🧹 Reset state cleanly
        this.salesModel = {
          ...this.salesModel,
          branch_id: 0,
          change: 0,
          discount: 0,
          discount_type: '',
          sub_total: 0,
          items: [],
          payment_method: '',
          used_amount: 0
        };

        this.medicineData.salesData = [];
        this.stockMap=[];
        this.saveSales();
        this.getMedicine();
      }else{
        this.extras.showToast(res.message,"warning")
      }

    } catch (e: any) {
      console.log(e);
      this.extras.showToast(e?.error?.message || 'Transaction failed', 'danger');
    }
  }

  onManualQtyChange(event: any, data: any) {
    let newQty = Number(event.target.value);
    if (isNaN(newQty) || newQty < 0) newQty = 0;

    const stockItem = this.stockMap[data.medicine_id];
    if (!stockItem) return;

    const oldQty = data.quantity || 0;
    const diff = newQty - oldQty;

    if (diff > 0) {
      if (stockItem.stocks < diff) {
        newQty = oldQty + stockItem.stocks;
      }
    }

    data.quantity = newQty;

    if (data.quantity <= 0) {
      this.removeSale(data.medicine_id);
    }

    this.syncStocksWithSales(); // 🔥 FIX
    this.saveSales();
  }

  async getMedicine() {
    try {
      const endpoint = this.buildQuery();
      const res = await this.userService.getUser(
        endpoint,
        null,
        this.userData.token
      );

      if (res.status === 200) {
        const apiData = res.data.data || [];

        // 🔥 INIT MAP FIRST (important for first load)
        apiData.forEach((item: any) => {
          const existing = this.stockMap[item.medicine_id];

          if (!existing) {
            this.stockMap[item.medicine_id] = {
              ...item,
              original_stock: item.stocks
            };
          } else {
            this.stockMap[item.medicine_id] = {
              ...item,
              stocks: existing.stocks,
              original_stock: existing.original_stock
            };
          }
        });

        // 🔥 APPLY SALES
        this.syncStocksWithSales();

        // 🔥 REBUILD UI DATA
        this.medicineData.data = {
          ...res.data,
          data: apiData.map((item: any) => ({
            ...this.stockMap[item.medicine_id]
          }))
        };

        if (!this.onLoad()) {
          this.salesData.categoryData = this.getUniqueCategories();
          this.onLoad.set(true);
        }

        this.cd.detectChanges();
      }
    } catch (e: any) {
      console.log(e);
    }
  }

  syncStocksWithSales() {
    // RESET
    Object.values(this.stockMap).forEach((item: any) => {
      item.stocks = item.original_stock ?? 0;
    });

    // APPLY SALES
    this.medicineData.salesData.forEach((sale: any) => {
      const stockItem = this.stockMap[sale.medicine_id];

      if (stockItem) {
        stockItem.stocks -= sale.quantity;

        if (stockItem.stocks < 0) {
          stockItem.stocks = 0;
        }
      }
    });
  }
  getRows() {
    if (!this.medicineData.data?.data) return Array(10).fill(null);
    const length = this.medicineData.data.data.length;
    const arr = []; // copy actual data
    let i = length
    // Fill remaining with nulls until length = 10
    while (i < 12) {
      arr.push(null);
      i++;
    }

    return arr;
  }
}
