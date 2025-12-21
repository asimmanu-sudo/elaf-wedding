
export enum UserRole { ADMIN = 'ADMIN', EMPLOYEE = 'EMPLOYEE' }
export enum DressType { SALE = 'بيع', RENT = 'إيجار' }
export enum DressStatus { AVAILABLE = 'متاح', RENTED = 'مؤجر', CLEANING = 'يحتاج تنظيف', SOLD = 'مباع', ARCHIVED = 'مؤرشف' }
export enum BookingStatus { PENDING = 'قبل التسليم', ACTIVE = 'مع العروس', COMPLETED = 'تم الإرجاع', CANCELLED = 'ملغي' }
export enum DepositType { CASH = 'مبلغ مالي', DOCUMENT = 'مستند', GOLD = 'قطعة ذهب', OTHER = 'أخرى' }
export enum SaleStatus { DESIGNING = 'قيد التصميم', READY = 'جاهز للاستلام', DELIVERED = 'تم التسليم للعروس', CANCELLED = 'ملغي' }
export enum FactoryPaymentStatus { UNPAID = 'غير مدفوع', PARTIAL = 'مدفوع جزئياً', PAID = 'خالص' }

// Added missing PaymentMethod enum used in mockDb.ts
export enum PaymentMethod {
  CASH_EGP = 'كاش (جنيه)',
  BANK_EGP = 'تحويل بنكي (جنيه)'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  permissions: string[];
  firstLogin?: boolean;
}

// Added missing Customer interface used in mockDb.ts
export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  firstSeenDate: string;
}

export interface Measurements {
  neck: string; shoulder: string; chest: string; underChest: string;
  胸部飞镖: string; waist: string; backLength: string; hips: string;
  fullLength: string; sleeve: string; armhole: string; arm: string;
  forearm: string; wrist: string; legOpening: string;
  bustType: string; skirtType: string; materials: string; orderNotes: string;
}

export interface Dress {
  id: string;
  name: string;
  style: string;
  type: DressType;
  factoryPrice: number;
  status: DressStatus;
  rentalCount: number;
  salePrice?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  // Added properties to resolve "Object literal may only specify known properties" in mockDb.ts
  rentalPrice?: number;
  image?: string;
  notes?: string;
  purchaseDate?: string;
}

export interface SaleOrder {
  id: string;
  factoryCode: string;
  brideName: string;
  bridePhone: string;
  description: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  sellPrice: number;
  factoryPrice: number;
  deposit: number;
  remainingFromBride: number;
  status: SaleStatus;
  factoryStatus: FactoryPaymentStatus;
  factoryDepositPaid: number;
  measurements?: Measurements;
  orderDate: string;
  // Added properties to resolve "Object literal may only specify known properties" in mockDb.ts
  image?: string;
  notes?: string;
  dressDescription?: string;
  createdAt?: string;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  dressId: string;
  dressName: string;
  eventDate: string;
  deliveryDate: string;
  fitting1Date: string;
  fitting2Date: string;
  fitting1Done: boolean;
  fitting2Done: boolean;
  rentalPrice: number;
  paidDeposit: number;
  remainingToPay: number;
  notes: string;
  status: BookingStatus;
  measurements?: Measurements;
  securityDeposit?: {
    type: DepositType;
    detail: string;
    value?: number;
  };
  damageFee?: number;
  staffName?: string;
  actualPickupDate?: string;
  actualReturnDate?: string;
  // Added properties to resolve "Object literal may only specify known properties" in mockDb.ts
  customerId?: string;
  bookingDate?: string;
  agreedRentalPrice?: number;
  paymentMethod?: PaymentMethod;
  createdAt?: string;
}

export interface FinanceRecord {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  subCategory?: string;
  amount: number;
  notes: string;
  relatedDresses?: string[];
  targetUser?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  username: string;
  timestamp: string;
  details: string;
  // Added userId property used in mockDb.ts
  userId?: string;
}
