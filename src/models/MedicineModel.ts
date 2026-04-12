export interface MedicineModel {
  medicineName?: string,
  genericName?: string,
  category?: string,
  price?: string,
  reorderLevel?: string,
  isDangerous?: string,
}

export interface MedicineData {
  data?: any;
  selectedData?: any
  inputData?: any
  salesData?: any
}
