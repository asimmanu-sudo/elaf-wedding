
import type { 
  Dress, Booking, FinanceRecord, AuditLog, Customer, User, SaleOrder
} from '../types';
import { 
  DressType, DressStatus, BookingStatus, UserRole, SaleStatus, FactoryPaymentStatus, PaymentMethod
} from '../types';

// Helper to generate random ID
const uuid = () => Math.random().toString(36).substring(2, 15);

// Helper dates
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

// Seed Data Logic
const generateSeedData = () => {
  const dresses: Dress[] = [];
  const bookings: Booking[] = [];
  // Fix: Removed missing 'Delivery' type and used 'any[]' for the empty deliveries array as it's currently unused
  const deliveries: any[] = [];
  const finance: FinanceRecord[] = [];
  const customers: Customer[] = [];
  const audit: AuditLog[] = [];
  const saleOrders: SaleOrder[] = [];

  // --- 1. Users ---
  const users: User[] = [
    { id: 'u1', username: 'admin', password: '123', role: UserRole.ADMIN, name: 'المدير العام', permissions: ['ALL'] },
    { id: 'u2', username: 'employee', password: '123', role: UserRole.EMPLOYEE, name: 'سارة (مبيعات)', permissions: ['home_view', 'dresses_rent_view', 'bookings_view'] }
  ];

  // --- 2. Customers ---
  const customerNames = ['نورة أحمد', 'سارة علي', 'منى خالد', 'ريم عبدالله', 'هند محمد', 'فاطمة حسن'];
  customerNames.forEach((name, i) => {
      customers.push({
          id: `CUST-${i}`,
          name,
          phone: `050${Math.floor(Math.random()*10000000)}`,
          notes: 'عميلة مميزة',
          firstSeenDate: daysFromNow(-30)
      });
  });

  // --- 3. Inventory (Dresses) ---
  dresses.push({ id: 'DR-001', name: 'فستان سندريلا الملكي', style: 'Ball Gown', type: DressType.RENT, factoryPrice: 5000, rentalPrice: 1500, status: DressStatus.AVAILABLE, image: '', notes: '', purchaseDate: daysFromNow(-100), createdAt: daysFromNow(-100), rentalCount: 5 });
  dresses.push({ id: 'DR-002', name: 'فستان الدانتيل الأبيض', style: 'Mermaid', type: DressType.RENT, factoryPrice: 4000, rentalPrice: 1200, status: DressStatus.AVAILABLE, image: '', notes: '', purchaseDate: daysFromNow(-90), createdAt: daysFromNow(-90), rentalCount: 2 });
  dresses.push({ id: 'DR-003', name: 'فستان السهرة الذهبي', style: 'A-Line', type: DressType.RENT, factoryPrice: 3500, rentalPrice: 1000, status: DressStatus.RENTED, image: '', notes: '', purchaseDate: daysFromNow(-60), createdAt: daysFromNow(-60), rentalCount: 8 });
  dresses.push({ id: 'DR-004', name: 'فستان الزفاف الكلاسيكي', style: 'Classic', type: DressType.RENT, factoryPrice: 4500, rentalPrice: 1300, status: DressStatus.CLEANING, image: '', notes: 'يحتاج تنظيف مستعجل', purchaseDate: daysFromNow(-120), createdAt: daysFromNow(-120), rentalCount: 12 });

  // --- 4. Bookings & Deliveries ---
  const bookingPast: Booking = {
      id: 'BK-001', customerId: 'CUST-0', customerName: customerNames[0], customerPhone: '0501111111',
      dressId: 'DR-001', dressName: 'فستان سندريلا الملكي',
      eventDate: daysFromNow(-10), bookingDate: daysFromNow(-20),
      agreedRentalPrice: 1500, paidDeposit: 500, remainingToPay: 0,
      paymentMethod: PaymentMethod.CASH_EGP,
      status: BookingStatus.COMPLETED, notes: 'تم الاسترجاع بحالة جيدة', createdAt: daysFromNow(-20)
  };
  bookings.push(bookingPast);
  finance.push({ id: 'INC-001', date: daysFromNow(-20), type: 'INCOME', category: 'عربون حجز', amount: 500, notes: 'عربون BK-001' });

  const bookingActive: Booking = {
      id: 'BK-002', customerId: 'CUST-1', customerName: customerNames[1], customerPhone: '0502222222',
      dressId: 'DR-003', dressName: 'فستان السهرة الذهبي',
      eventDate: daysFromNow(0),
      bookingDate: daysFromNow(-15),
      agreedRentalPrice: 1000, paidDeposit: 500, remainingToPay: 0,
      paymentMethod: PaymentMethod.CASH_EGP,
      status: BookingStatus.ACTIVE, notes: 'العروسة استلمت الفستان أمس', createdAt: daysFromNow(-15)
  };
  bookings.push(bookingActive);

  const bookingFuture: Booking = {
      id: 'BK-003', customerId: 'CUST-2', customerName: customerNames[2], customerPhone: '0503333333',
      dressId: 'DR-002', dressName: 'فستان الدانتيل الأبيض',
      eventDate: daysFromNow(5),
      bookingDate: daysFromNow(-5),
      agreedRentalPrice: 1200, paidDeposit: 600, remainingToPay: 600,
      paymentMethod: PaymentMethod.BANK_EGP,
      status: BookingStatus.PENDING, notes: 'تجهيز الفستان قبل يومين', createdAt: daysFromNow(-5)
  };
  bookings.push(bookingFuture);

  // --- 5. Sales (Design) ---
  // Fix: Removed expectedDeliveryDate as it does not exist in the SaleOrder interface
  saleOrders.push({
      id: 'SALE-001', factoryCode: 'FAC-101', brideName: customerNames[3], bridePhone: '0505555555',
      factoryPrice: 3000, factoryDepositPaid: 1000,
      sellPrice: 5000, deposit: 2000, remainingFromBride: 3000,
      status: SaleStatus.DESIGNING, factoryStatus: FactoryPaymentStatus.PARTIAL,
      image: '', notes: 'مقاسات خاصة', dressDescription: 'فستان سواريه مطرز', orderDate: daysFromNow(-10), createdAt: daysFromNow(-10)
  });

  return { dresses, bookings, deliveries, finance, customers, audit, saleOrders, users };
};

// Local Storage Management
const KEYS = {
  DRESSES: 'elaf_dresses',
  SALE_ORDERS: 'elaf_sale_orders',
  BOOKINGS: 'elaf_bookings',
  DELIVERIES: 'elaf_deliveries',
  FINANCE: 'elaf_finance',
  CUSTOMERS: 'elaf_customers',
  AUDIT: 'elaf_audit',
  SETTINGS: 'elaf_settings',
  USERS: 'elaf_users'
};

const storage = {
  getItem: (key: string) => { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch (e) { } },
  clear: () => { try { localStorage.clear(); } catch (e) { } }
};

export const db = {
  init: () => {
    const users = storage.getItem(KEYS.USERS);
    if (!users || users === '[]') {
      db.resetAndSeed();
    }
  },
  get: <T>(key: string): T[] => {
    try {
        const data = storage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
  },
  set: (key: string, data: any) => {
    storage.setItem(key, JSON.stringify(data));
  },
  resetAndSeed: () => {
      storage.clear();
      const data = generateSeedData();
      storage.setItem(KEYS.DRESSES, JSON.stringify(data.dresses));
      storage.setItem(KEYS.SALE_ORDERS, JSON.stringify(data.saleOrders));
      storage.setItem(KEYS.BOOKINGS, JSON.stringify(data.bookings));
      storage.setItem(KEYS.DELIVERIES, JSON.stringify(data.deliveries));
      storage.setItem(KEYS.FINANCE, JSON.stringify(data.finance));
      storage.setItem(KEYS.CUSTOMERS, JSON.stringify(data.customers));
      storage.setItem(KEYS.AUDIT, JSON.stringify(data.audit));
      storage.setItem(KEYS.SETTINGS, JSON.stringify({ theme: 'dark' }));
      storage.setItem(KEYS.USERS, JSON.stringify(data.users));
  },
  clear: () => { storage.clear(); },
  addLog: (user: User, action: string, details: string) => {
    const logs = db.get<AuditLog>(KEYS.AUDIT);
    logs.unshift({
      id: uuid(), action, userId: user.id, username: user.username, timestamp: new Date().toISOString(), details
    });
    db.set(KEYS.AUDIT, logs);
  },
  KEYS
};
