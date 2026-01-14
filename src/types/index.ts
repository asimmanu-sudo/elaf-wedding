
export enum UserRole { ADMIN = 'ADMIN', EMPLOYEE = 'EMPLOYEE' }
export enum DressType { SALE = 'بيع', RENT = 'إيجار' }
export enum DressStatus { AVAILABLE = 'متاح', RENTED = 'مؤجر', CLEANING = 'يحتاج تنظيف', SOLD = 'مباع', ARCHIVED = 'مؤرشف' }
export enum BookingStatus { PENDING = 'قبل التسليم', ACTIVE = 'مع العروس', COMPLETED = 'تم الإرجاع', CANCELLED = 'ملغي' }
export enum DepositType { CASH = 'مبلغ مالي', DOCUMENT = 'مستند', GOLD = 'قطعة ذهب', OTHER = 'أخرى' }
export enum SaleStatus { DESIGNING = 'قيد التصميم', READY = 'جاهز للاستلام', DELIVERED = 'تم التسليم للعروس', CANCELLED = 'ملغي' }
export enum FactoryPaymentStatus { UNPAID = 'غير مدفوع', PARTIAL = 'مدفوع جزئياً', PAID = 'خالص' }
export enum DressCondition { NEW = 'جديد (أول لبسة)', USED = 'مستعمل' }
export enum PaymentMethod { CASH_EGP = 'كاش (جنيه)', BANK_EGP = 'تحويل بنكي', BANKAK_SDG = 'بنكك (سوداني)', CASH_USD = 'كاش (دولار)', WU = 'Western Union' }

export interface CountryCode {
  code: string;
  flag: string;
  label: string;
}

export interface WhatsAppConfig {
  id?: string;
  booking_confirm: string;
  pickup_ready: string;
  return_thanks: string;
  payment_reminder: string;
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
  staffName?: string;
  // Multi-currency fields
  exchangeRate?: number;
  foreignAmount?: number;
  originalCurrency?: string;
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
  // Multi-currency fields
  exchangeRate?: number;
  foreignAmount?: number;
  originalCurrency?: string;
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
  type: 'INCOME' | 'EXPENSE' | 'EXCHANGE_IN' | 'EXCHANGE_OUT';
  category: string;
  subCategory?: string;
  amount: number; // The value in EGP (for accounting reports)
  currency?: 'EGP' | 'USD' | 'SDG'; // The actual currency stored in wallet
  currencyAmount?: number; // The actual amount in that currency (same as foreignAmount)
  exchangeRate?: number; // Rate used at time of transaction
  notes: string;
  relatedDresses?: string[];
  targetUser?: string;
  relatedId?: string;
  isFuture?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  username: string;
  timestamp: string;
  details: string;
}

// --- LIFE BUDGET TYPES ---

export type CurrencyCode = 'EGP' | 'SDG' | 'USD';

export interface PersonalTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'EXCHANGE';
  category?: string; 
  amount: number;
  currency: CurrencyCode;
  date: string;
  description: string;
  beneficiary?: string; 
  targetGoalId?: string; 
  exchangeRate?: number;
  toCurrency?: CurrencyCode;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  deadline?: string;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface UnifiedSettings {
  id?: string;
  docType: 'UNIFIED_CONFIG';
  // Shop Constants
  rentOpsFee: number;
  staffRatio: number;
  // Home Constants
  familyMembers: string[];
  budgetPlan: {
    category: string;
    percentage: number;
  }[];
}
