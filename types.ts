
export enum UserRole { ADMIN = 'ADMIN', EMPLOYEE = 'EMPLOYEE' }
export enum DressType { SALE = 'بيع', RENT = 'إيجار' }
export enum DressStatus { AVAILABLE = 'متاح', RENTED = 'مؤجر', CLEANING = 'يحتاج تنظيف', SOLD = 'مباع', ARCHIVED = 'مؤرشف' }
export enum BookingStatus { PENDING = 'قبل التسليم', ACTIVE = 'مع العروس', COMPLETED = 'تم الإرجاع', CANCELLED = 'ملغي', LATE = 'تأخير' }
export enum DepositType { ID_CARD = 'بطاقة هوية', CASH = 'مبلغ مالي', PASSPORT = 'جواز سفر', GOLD = 'ذهب', OTHER = 'أخرى' }
export enum SaleStatus { DESIGNING = 'قيد التصميم', READY = 'جاهز للاستلام', DELIVERED = 'تم التسليم للعروس', CANCELLED = 'ملغي' }
export enum FactoryPaymentStatus { UNPAID = 'غير مدفوع للمصنع', PARTIAL = 'مدفوع عربون', PAID = 'خالص للمصنع' }
export enum MeasurementUnit { CM = 'سم', INCH = 'إنش' }

export enum PaymentMethod {
    BANK_EGP = 'تحويل بنكك (سعر اليوم مصري)',
    BANK_USD = 'تحويل بنكك (سعر اليوم دولار)',
    WESTERN = 'Western Union',
    CASH_EGP = 'كاش (جنية مصري)',
    CASH_USD = 'كاش (دولار)',
    OTHER = 'أخرى'
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

export interface SaleOrder {
  id: string; factoryCode: string; brideName: string; bridePhone: string;
  factoryPrice: number; factoryDepositPaid: number; factoryPaidDate?: string;
  sellPrice: number; deposit: number; remainingFromBride: number;
  status: SaleStatus; factoryStatus: FactoryPaymentStatus;
  image: string; notes: string; dressDescription: string;
  orderDate: string; createdAt: string;
  measurements?: Measurements;
}

export interface Accessory {
    name: string;
    price: number;
}

export interface Booking {
  id: string; customerId: string; customerName: string; customerPhone: string;
  dressId: string; dressName: string;
  eventDate: string; bookingDate: string;
  agreedRentalPrice: number; paidDeposit: number;
  remainingToPay: number; 
  paymentMethod: PaymentMethod;
  notes: string; status: BookingStatus; createdAt: string;
  measurements?: Measurements;
  deliveryDetails?: any;
  returnDetails?: any;
}

export interface FinanceRecord {
  id: string; date: string; type: 'INCOME' | 'EXPENSE';
  category: string; subCategory?: string; amount: number; notes: string; relatedId?: string;
  createdBy?: string; targetName?: string; 
}

export interface AuditLog {
  id: string; action: string; userId: string; username: string; timestamp: string; details: string;
}

export interface Customer {
  id: string; name: string; phone: string; notes: string; firstSeenDate: string;
}
