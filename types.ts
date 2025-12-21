
export enum UserRole { ADMIN = 'ADMIN', EMPLOYEE = 'EMPLOYEE' }
export enum DressType { SALE = 'بيع', RENT = 'إيجار' }
export enum DressStatus { AVAILABLE = 'متاح', RENTED = 'مؤجر', CLEANING = 'يحتاج تنظيف', SOLD = 'مباع', ARCHIVED = 'مؤرشف' }
export enum BookingStatus { PENDING = 'قبل التسليم', ACTIVE = 'مع العروس', COMPLETED = 'تم الإرجاع', CANCELLED = 'ملغي', LATE = 'تأخير' }
export enum DepositType { CASH = 'مبلغ مالي', DOCUMENT = 'مستند', GOLD = 'قطعة ذهب', OTHER = 'أخرى' }
export enum SaleStatus { DESIGNING = 'قيد التصميم', READY = 'جاهز للاستلام', DELIVERED = 'تم التسليم للعروس', CANCELLED = 'ملغي' }
export enum FactoryPaymentStatus { UNPAID = 'غير مدفوع', PARTIAL = 'مدفوع جزئياً', PAID = 'خالص' }
// Add missing PaymentMethod enum
export enum PaymentMethod { CASH_EGP = 'كاش', BANK_EGP = 'تحويل بنكي' }

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
  neck: string; shoulder: string; chest: string; underChest: string;
  chestDart: string; waist: string; backLength: string; hips: string;
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
  // Add missing properties used in mock data and app
  rentalPrice?: number;
  image?: string;
  notes?: string;
  purchaseDate?: string;
  status: DressStatus;
  rentalCount: number;
  salePrice?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
}

export interface SaleOrder {
  id: string;
  factoryCode: string;
  brideName: string; bridePhone: string;
  description: string;
  // Add missing properties used in mock data and app
  dressDescription?: string;
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
  image?: string;
  notes?: string;
  createdAt?: string;
}

export interface Booking {
  id: string;
  // Add missing properties used in mock data and app
  customerId?: string;
  customerName: string; customerPhone: string; customerAddress?: string;
  dressId: string; dressName: string;
  eventDate: string; fittingDate: string; deliveryDate: string;
  bookingDate?: string;
  rentalPrice: number; 
  agreedRentalPrice?: number;
  paidDeposit: number; remainingToPay: number;
  paymentMethod?: PaymentMethod;
  notes: string;
  status: BookingStatus;
  measurements?: Measurements;
  securityDeposit?: { type: DepositType; detail: string; };
  damageFee?: number;
  staffName?: string;
  actualPickupDate?: string;
  actualReturnDate?: string;
  createdAt?: string;
}

export interface FinanceRecord {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  notes: string;
  relatedDresses?: string[];
  targetUser?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  // Add missing userId used in mock data
  userId?: string;
  username: string;
  timestamp: string;
  details: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'إيجار' | 'بيع';
  // Add missing properties used in mock data
  notes?: string;
  firstSeenDate?: string;
}
