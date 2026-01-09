export enum UserRole { ADMIN = 'ADMIN', EMPLOYEE = 'EMPLOYEE' }
export enum DressType { SALE = 'بيع', RENT = 'إيجار' }
export enum DressStatus { AVAILABLE = 'متاح', RENTED = 'مؤجر', CLEANING = 'يحتاج تنظيف', SOLD = 'مباع', ARCHIVED = 'مؤرشف' }
export enum BookingStatus { PENDING = 'قبل التسليم', ACTIVE = 'مع العروس', COMPLETED = 'تم الإرجاع', CANCELLED = 'ملغي' }
export enum DepositType { CASH = 'مبلغ مالي', DOCUMENT = 'مستند', GOLD = 'قطعة ذهب', OTHER = 'أخرى' }
export enum SaleStatus { DESIGNING = 'قيد التصميم', READY = 'جاهز للاستلام', DELIVERED = 'تم التسليم للعروس', CANCELLED = 'ملغي' }
export enum FactoryPaymentStatus { UNPAID = 'غير مدفوع', PARTIAL = 'مدفوع جزئياً', PAID = 'خالص' }
export enum DressCondition { NEW = 'جديد (أول لبسة)', USED = 'مستعمل' }
export enum PaymentMethod { CASH_EGP = 'كاش (جنيه)', BANK_EGP = 'تحويل بنكي' }

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  permissions: string[];
  firstLogin?: boolean;
}

export interface Measurements {
  unit?: 'cm' | 'inch';
  neck?: string; shoulder?: string; chest?: string; underChest?: string;
  chestDart?: string; waist?: string; backLength?: string; hips?: string;
  fullLength?: string; sleeve?: string; armhole?: string; arm?: string;
  forearm?: string; wrist?: string; legOpening?: string;
  bustType?: string; skirtType?: string; materials?: string; orderNotes?: string;
}

export interface Dress {
  id: string;
  name: string;
  style: string;
  type: DressType;
  factoryPrice: number;
  rentalPrice?: number;
  status: DressStatus;
  rentalCount: number;
  condition: DressCondition;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  salePrice?: number;
  customerName?: string;
  customerPhone?: string;
}

export interface SaleOrder {
  id: string;
  factoryCode: string;
  brideName: string;
  bridePhone: string;
  brideAddress: string;
  description: string;
  expectedDeliveryDate: string;
  sellPrice: number;
  factoryPrice: number;
  deposit: number;
  remainingFromBride: number;
  status: SaleStatus;
  factoryStatus: FactoryPaymentStatus;
  factoryDepositPaid: number;
  measurements?: Measurements;
  orderDate: string;
  paymentMethod?: string;
  otherPaymentMethod?: string;
  actualDeliveryDate?: string;
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
  extras?: string;
  damageFee?: number;
  actualPickupDate?: string;
  actualReturnDate?: string;
  staffName?: string;
  createdAt: string;
  paymentMethod?: string;
  otherPaymentMethod?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  firstSeenDate: string;
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
  relatedId?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  username: string;
  timestamp: string;
  details: string;
}