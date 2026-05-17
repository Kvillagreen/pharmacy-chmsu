import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface CountryOption {
  code: string;
  name: string;
  flag?: string;
}

interface AddressOption {
  code: string;
  name: string;
  zipCode?: string;
}

@Component({
  selector: 'app-address-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">
          {{ label }}
          <span *ngIf="required" class="text-rose-500">*</span>
        </label>
        <p *ngIf="description" class="text-xs leading-5 text-slate-500">{{ description }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Country</label>
          <select
            [(ngModel)]="countryCode"
            [name]="fieldId + '-country'"
            class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            (ngModelChange)="handleCountryChange()">
            <option *ngFor="let option of countryOptions" [value]="option.code">
              {{ option.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-2 sm:col-span-2">
          <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Street Address
          </label>
          <input
            [(ngModel)]="addressLine"
            [name]="fieldId + '-line'"
            type="text"
            placeholder="House no., street, building, subdivision"
            class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            (ngModelChange)="markDirty()" />
        </div>

        <ng-container *ngIf="isPhilippines && !phApiUnavailable; else manualFields">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Region</label>
            <select
              [(ngModel)]="regionCode"
              [name]="fieldId + '-region'"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="handleRegionChange()">
              <option value="">Select region</option>
              <option *ngFor="let option of regionOptions" [value]="option.code">{{ option.name }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Province</label>
            <select
              [(ngModel)]="provinceCode"
              [name]="fieldId + '-province'"
              [disabled]="!regionCode || !provinceOptions.length"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="handleProvinceChange()">
              <option value="">{{ provinceOptions.length ? 'Select province' : 'No province required' }}</option>
              <option *ngFor="let option of provinceOptions" [value]="option.code">{{ option.name }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">City / Municipality</label>
            <select
              [(ngModel)]="cityCode"
              [name]="fieldId + '-city'"
              [disabled]="!regionCode || !cityOptions.length"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="handleCityChange()">
              <option value="">{{ cityOptions.length ? 'Select city or municipality' : 'Select region first' }}</option>
              <option *ngFor="let option of cityOptions" [value]="option.code">{{ option.name }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Barangay</label>
            <select
              [(ngModel)]="barangayCode"
              [name]="fieldId + '-barangay'"
              [disabled]="!cityCode || !barangayOptions.length"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="handleBarangayChange()">
              <option value="">{{ barangayOptions.length ? 'Select barangay' : 'Select city first' }}</option>
              <option *ngFor="let option of barangayOptions" [value]="option.code">{{ option.name }}</option>
            </select>
          </div>
        </ng-container>

        <ng-template #manualFields>
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {{ isPhilippines ? 'Region' : 'State / Region' }}
            </label>
            <input
              [(ngModel)]="regionName"
              [name]="fieldId + '-manual-region'"
              type="text"
              [placeholder]="isPhilippines ? 'Region' : 'State or region'"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="markDirty()" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {{ isPhilippines ? 'Province' : 'Province / State' }}
            </label>
            <input
              [(ngModel)]="provinceName"
              [name]="fieldId + '-manual-province'"
              type="text"
              [placeholder]="isPhilippines ? 'Province' : 'Province or state'"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="markDirty()" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {{ isPhilippines ? 'City / Municipality' : 'City / Locality' }}
            </label>
            <input
              [(ngModel)]="cityName"
              [name]="fieldId + '-manual-city'"
              type="text"
              [placeholder]="isPhilippines ? 'City or municipality' : 'City or locality'"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="markDirty()" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {{ isPhilippines ? 'Barangay' : 'District / Area' }}
            </label>
            <input
              [(ngModel)]="barangayName"
              [name]="fieldId + '-manual-barangay'"
              type="text"
              [placeholder]="isPhilippines ? 'Barangay' : 'District, suburb, or area'"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              (ngModelChange)="markDirty()" />
          </div>
        </ng-template>

        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Postal Code</label>
          <input
            [(ngModel)]="postalCode"
            [name]="fieldId + '-postal'"
            type="text"
            placeholder="Postal code"
            class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            (ngModelChange)="markDirty()" />
        </div>
      </div>

      <div *ngIf="phApiUnavailable && isPhilippines" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        Philippine location lists are temporarily unavailable, so manual address fields are shown instead.
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Formatted Address</p>
          <span class="text-xs text-slate-400">{{ (previewAddress || '').length }} characters</span>
        </div>
        <textarea
          [value]="previewAddress"
          rows="3"
          readonly
          class="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"></textarea>
      </div>
    </div>
  `,
})
export class AppAddressField implements OnInit, OnChanges {
  private static readonly countriesUrl = 'https://restcountries.com/v3.1/all?fields=name,cca2,flag';
  private static readonly psgcApiUrl = 'https://psgc.cloud/api';
  private static countriesCache: CountryOption[] | null = null;
  private static regionsCache: AddressOption[] | null = null;
  private static provincesCache = new Map<string, AddressOption[]>();
  private static localitiesCache = new Map<string, AddressOption[]>();
  private static barangaysCache = new Map<string, AddressOption[]>();

  @Input() label = 'Address';
  @Input() description = '';
  @Input() value: string | null | undefined = '';
  @Input() required = false;
  @Input() fieldId = 'address';
  @Output() valueChange = new EventEmitter<string>();

  countryOptions: CountryOption[] = [{ code: 'PH', name: 'Philippines' }];
  regionOptions: AddressOption[] = [];
  provinceOptions: AddressOption[] = [];
  cityOptions: AddressOption[] = [];
  barangayOptions: AddressOption[] = [];

  countryCode = 'PH';
  countryName = 'Philippines';
  addressLine = '';
  regionCode = '';
  regionName = '';
  provinceCode = '';
  provinceName = '';
  cityCode = '';
  cityName = '';
  barangayCode = '';
  barangayName = '';
  postalCode = '';

  phApiUnavailable = false;
  private hasUserChanges = false;

  get isPhilippines(): boolean {
    return this.countryCode === 'PH';
  }

  get previewAddress(): string {
    if (!this.hasUserChanges && this.value?.trim()) {
      return this.value.trim();
    }

    return this.compileAddress();
  }

  async ngOnInit(): Promise<void> {
    await this.loadCountries();
    this.parseExistingValue();
    await this.handleCountryChange(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !this.hasUserChanges) {
      this.value = changes['value'].currentValue ?? '';
      this.parseExistingValue();
    }
  }

  async handleCountryChange(shouldEmit = true): Promise<void> {
    this.hasUserChanges = this.hasUserChanges || shouldEmit;
    const selectedCountry = this.countryOptions.find((option) => option.code === this.countryCode);
    this.countryName = selectedCountry?.name ?? 'Philippines';
    this.resetLocationState();

    if (this.isPhilippines) {
      await this.loadRegions();
    }

    if (shouldEmit) {
      this.emitAddress();
    }
  }

  async handleRegionChange(): Promise<void> {
    this.hasUserChanges = true;
    const selectedRegion = this.regionOptions.find((option) => option.code === this.regionCode);
    this.regionName = selectedRegion?.name ?? '';
    this.provinceCode = '';
    this.provinceName = '';
    this.cityCode = '';
    this.cityName = '';
    this.barangayCode = '';
    this.barangayName = '';
    this.provinceOptions = [];
    this.cityOptions = [];
    this.barangayOptions = [];

    if (!this.regionCode) {
      this.emitAddress();
      return;
    }

    await this.loadProvinces(this.regionCode);

    if (!this.provinceOptions.length) {
      await this.loadCitiesByRegion(this.regionCode);
    }

    this.emitAddress();
  }

  async handleProvinceChange(): Promise<void> {
    this.hasUserChanges = true;
    const selectedProvince = this.provinceOptions.find((option) => option.code === this.provinceCode);
    this.provinceName = selectedProvince?.name ?? '';
    this.cityCode = '';
    this.cityName = '';
    this.barangayCode = '';
    this.barangayName = '';
    this.cityOptions = [];
    this.barangayOptions = [];

    if (this.provinceCode) {
      await this.loadCitiesByProvince(this.provinceCode);
    } else if (this.regionCode) {
      await this.loadCitiesByRegion(this.regionCode);
    }

    this.emitAddress();
  }

  async handleCityChange(): Promise<void> {
    this.hasUserChanges = true;
    const selectedCity = this.cityOptions.find((option) => option.code === this.cityCode);
    this.cityName = selectedCity?.name ?? '';
    this.postalCode = selectedCity?.zipCode ?? this.postalCode;
    this.barangayCode = '';
    this.barangayName = '';
    this.barangayOptions = [];

    if (this.cityCode) {
      await this.loadBarangays(this.cityCode);
    }

    this.emitAddress();
  }

  handleBarangayChange(): void {
    this.hasUserChanges = true;
    const selectedBarangay = this.barangayOptions.find((option) => option.code === this.barangayCode);
    this.barangayName = selectedBarangay?.name ?? '';
    this.emitAddress();
  }

  markDirty(): void {
    this.hasUserChanges = true;
    this.emitAddress();
  }

  private emitAddress(): void {
    this.valueChange.emit(this.compileAddress());
  }

  private parseExistingValue(): void {
    const existing = String(this.value ?? '').trim();
    if (!existing) {
      return;
    }

    const parts = existing.split(',').map((part) => part.trim()).filter(Boolean);
    this.addressLine = parts[0] ?? '';
    this.barangayName = parts[1] ?? '';
    this.cityName = parts[2] ?? '';
    this.provinceName = parts[3] ?? '';
    this.regionName = parts[4] ?? '';

    const trailing = parts.slice(5);
    const postalPart = trailing.find((part) => /\d{3,}/.test(part));
    if (postalPart) {
      this.postalCode = postalPart;
    }

    const countryPart = trailing.find((part) => /philippines/i.test(part));
    if (countryPart) {
      this.countryName = countryPart;
      this.countryCode = 'PH';
    }
  }

  private resetLocationState(): void {
    this.regionCode = '';
    this.regionName = '';
    this.provinceCode = '';
    this.provinceName = '';
    this.cityCode = '';
    this.cityName = '';
    this.barangayCode = '';
    this.barangayName = '';
    this.regionOptions = [];
    this.provinceOptions = [];
    this.cityOptions = [];
    this.barangayOptions = [];
  }

  private async loadCountries(): Promise<void> {
    if (AppAddressField.countriesCache?.length) {
      this.countryOptions = AppAddressField.countriesCache;
      return;
    }

    try {
      const response = await fetch(AppAddressField.countriesUrl);
      if (!response.ok) {
        throw new Error('Unable to load countries');
      }

      const data = await response.json();
      const normalized = (Array.isArray(data) ? data : [])
        .map((item: any) => ({
          code: String(item?.cca2 ?? '').toUpperCase(),
          name: String(item?.name?.common ?? '').trim(),
          flag: item?.flag,
        }))
        .filter((item: CountryOption) => item.code && item.name)
        .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));

      AppAddressField.countriesCache = normalized.length ? normalized : [{ code: 'PH', name: 'Philippines' }];
      this.countryOptions = AppAddressField.countriesCache;
    } catch {
      this.countryOptions = [{ code: 'PH', name: 'Philippines' }];
    }
  }

  private async loadRegions(): Promise<void> {
    try {
      if (AppAddressField.regionsCache?.length) {
        this.regionOptions = AppAddressField.regionsCache;
        return;
      }

      const data = await this.fetchAddressOptions(`${AppAddressField.psgcApiUrl}/regions`);
      AppAddressField.regionsCache = data;
      this.regionOptions = data;
      this.phApiUnavailable = false;
    } catch {
      this.phApiUnavailable = true;
      this.regionOptions = [];
    }
  }

  private async loadProvinces(regionCode: string): Promise<void> {
    const cacheKey = `region:${regionCode}`;

    try {
      if (AppAddressField.provincesCache.has(cacheKey)) {
        this.provinceOptions = AppAddressField.provincesCache.get(cacheKey) ?? [];
        return;
      }

      const data = await this.fetchAddressOptions(`${AppAddressField.psgcApiUrl}/regions/${regionCode}/provinces`);
      AppAddressField.provincesCache.set(cacheKey, data);
      this.provinceOptions = data;
      this.phApiUnavailable = false;
    } catch {
      this.phApiUnavailable = true;
      this.provinceOptions = [];
    }
  }

  private async loadCitiesByRegion(regionCode: string): Promise<void> {
    const cacheKey = `region-cities:${regionCode}`;

    try {
      if (AppAddressField.localitiesCache.has(cacheKey)) {
        this.cityOptions = AppAddressField.localitiesCache.get(cacheKey) ?? [];
        return;
      }

      const data = await this.fetchAddressOptions(`${AppAddressField.psgcApiUrl}/regions/${regionCode}/cities-municipalities`);
      AppAddressField.localitiesCache.set(cacheKey, data);
      this.cityOptions = data;
      this.phApiUnavailable = false;
    } catch {
      this.phApiUnavailable = true;
      this.cityOptions = [];
    }
  }

  private async loadCitiesByProvince(provinceCode: string): Promise<void> {
    const cacheKey = `province-cities:${provinceCode}`;

    try {
      if (AppAddressField.localitiesCache.has(cacheKey)) {
        this.cityOptions = AppAddressField.localitiesCache.get(cacheKey) ?? [];
        return;
      }

      const data = await this.fetchAddressOptions(`${AppAddressField.psgcApiUrl}/provinces/${provinceCode}/cities-municipalities`);
      AppAddressField.localitiesCache.set(cacheKey, data);
      this.cityOptions = data;
      this.phApiUnavailable = false;
    } catch {
      this.phApiUnavailable = true;
      this.cityOptions = [];
    }
  }

  private async loadBarangays(cityCode: string): Promise<void> {
    try {
      if (AppAddressField.barangaysCache.has(cityCode)) {
        this.barangayOptions = AppAddressField.barangaysCache.get(cityCode) ?? [];
        return;
      }

      const data = await this.fetchAddressOptions(`${AppAddressField.psgcApiUrl}/cities-municipalities/${cityCode}/barangays`);
      AppAddressField.barangaysCache.set(cityCode, data);
      this.barangayOptions = data;
      this.phApiUnavailable = false;
    } catch {
      this.phApiUnavailable = true;
      this.barangayOptions = [];
    }
  }

  private async fetchAddressOptions(url: string): Promise<AddressOption[]> {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch address options from ${url}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : [];

    return items
      .map((item: any) => ({
        code: String(item?.code ?? '').trim(),
        name: String(item?.name ?? '').trim(),
        zipCode: item?.zipCode ? String(item.zipCode).trim() : undefined,
      }))
      .filter((item: AddressOption) => item.code && item.name)
      .sort((a: AddressOption, b: AddressOption) => a.name.localeCompare(b.name));
  }

  private compileAddress(): string {
    return [
      this.addressLine,
      this.barangayName,
      this.cityName,
      this.provinceName,
      this.regionName,
      this.postalCode,
      this.countryName,
    ]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(', ');
  }
}
