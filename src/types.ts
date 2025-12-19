
export const UserRole = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE'
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const DressType = {
  SALE: 'بيع',
  RENT: 'إيجار'
} as const;
export type DressType = typeof DressType[keyof typeof DressType];

export const DressStatus = {
  AVAILABLE: 'متاح',
  RENTED: 'مؤجر',
  CLEANING: 'يحتاج تنظيف',
  SOLD: 'مباع',
  ARCHIVED: 'مؤرشف'
} as const;
export type DressStatus = typeof DressStatus[keyof typeof DressStatus];

export const BookingStatus = {
  PENDING: 'قبل التسليم',
  ACTIVE: 'مع العروس',
  COMPLETED: 'تم الإرجاع',
  CANCELLED: 'ملغي',
  LATE: 'تأخير'
} as const;
export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export const DepositType = {
  ID_CARD: 'بطاقة هوية',
  CASH: 'مبلغ مالي',
  PASSPORT: 'جواز سفر',
  GOLD: 'ذهب',
  OTHER: 'أخرى'
} as const;
export type DepositType = typeof DepositType[keyof typeof DepositType];

export const SaleStatus = {
  DESIGNING: 'قيد التصميم',
  READY: 'جاهز للاستلام',
  DELIVERED: 'تم التسليم للعروس',
  CANCELLED: 'ملغي'
} as const;
export type SaleStatus = typeof SaleStatus[keyof typeof SaleStatus];

export const FactoryPaymentStatus = {
  UNPAID: 'غير مدفوع للمصنع',
  PARTIAL: 'مدفوع عربون',
  PAID: 'خالص للمصنع'
} as const;
export type FactoryPaymentStatus = typeof FactoryPaymentStatus[keyof typeof FactoryPaymentStatus];

export const MeasurementUnit = {
  CM: 'سم',
  INCH: 'إنش'
} as const;
export type MeasurementUnit = typeof MeasurementUnit[keyof typeof MeasurementUnit];

export const PaymentMethod = {
    BANK_EGP: 'تحويل بنكك (سعر اليوم مصري)',
    BANK_USD: 'تحويل بنكك (سعر اليوم دولار)',
    WESTERN: 'Western Union',
    CASH_EGP: 'كاش (جنية مصري)',
    CASH_USD: 'كاش (دولار)',
    OTHER: 'أخرى'
} as const;
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export interface User {
  id: string; username: string; password?: string; role: UserRole; name: string; permissions: string[];
}

export interface Measurements {
  neck?: string;
  shoulder?: string;
  chest?: string;
  underChest?: string;
  chestDart?: string;
  waist?: string;
  backLength?: string;
  hips?: string;
  fullLength?: string;
  sleeve?: string;
  armhole?: string;
  arm?: string;
  forearm?: string;
  wrist?: string;
  legOpening?: string;
  bustType?: string;
  skirtType?: string;
  materials?: string;
  orderNotes?: string;
}

export interface Dress {
  id: string; name: string; style: string; type: DressType;
  factoryPrice: number; rentalPrice?: number; sellPrice?: number;
  status: DressStatus; image: string; notes: string;
  purchaseDate: string; createdAt: string;
  rentalCount?: number; 
}

export interface Accessory {
    name: string;
    price: number;
}

export interface DeliveryDetails {
    date: string;
    staffName: string;
    remainingPaid: number;
    depositType: DepositType;
    depositInfo: string;
    accessories: Accessory[];
    notes?: string;
}

export interface ReturnDetails {
    date: string;
    staffName: string;
    isDamage: boolean;
    damageFee: number;
    damageNotes: string;
    notes?: string;
}

export interface Booking {
  id: string; customerId: string; customerName: string; customerPhone: string;
  dressId: string; dressName: string;
  eventDate: string; bookingDate: string;
  agreedRentalPrice: number; paidDeposit: number;
  remainingToPay: number; 
  paymentMethod: PaymentMethod;
  paymentMethodDetails?: string; 
  notes: string; status: BookingStatus; createdAt: string;
  measurements?: Measurements;
  deliveryDetails?: DeliveryDetails;
  returnDetails?: ReturnDetails;
}

export interface Delivery {
  id: string; bookingId: string; deliveryDate: string;
}

export interface FinanceRecord {
  id: string; date: string; type: 'INCOME' | 'EXPENSE';
  category: string; amount: number; notes: string; relatedId?: string;
  createdBy?: string; 
}

export interface AuditLog {
  id: string; action: string; userId: string; username: string; timestamp: string; details: string;
}

export interface Customer {
  id: string; name: string; phone: string; notes: string; firstSeenDate: string;
  lastTransactionType?: string; 
}

// SaleOrder interface added to fix missing export errors
export interface SaleOrder {
  id: string;
  factoryCode: string;
  brideName: string;
  bridePhone: string;
  dressDescription: string;
  factoryPrice: number;
  sellPrice: number;
  deposit: number;
  remainingFromBride: number;
  status: SaleStatus;
  factoryStatus: FactoryPaymentStatus;
  factoryDepositPaid: number;
  expectedDeliveryDate: string;
  orderDate: string;
  createdAt: string;
  image: string;
  notes: string;
  measurements?: Measurements;
}
