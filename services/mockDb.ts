
import type { 
  Dress, Booking, FinanceRecord, Customer, User, SaleOrder, AuditLog
} from '../types';
import { 
  DressType, DressStatus, BookingStatus, UserRole, SaleStatus, FactoryPaymentStatus, PaymentMethod, DressCondition
} from '../types';

const daysFromNow = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// Define today's date in ISO string format (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

const generateSeedData = () => {
  const dresses: Dress[] = [
    { id: 'DR-001', name: 'سندريلا الملكي', style: 'Ball Gown', type: DressType.RENT, factoryPrice: 5000, rentalPrice: 1500, status: DressStatus.AVAILABLE, rentalCount: 5, condition: DressCondition.NEW, createdAt: today },
    { id: 'DR-002', name: 'دانتيل فرنسي', style: 'Mermaid', type: DressType.RENT, factoryPrice: 4000, rentalPrice: 1200, status: DressStatus.AVAILABLE, rentalCount: 2, condition: DressCondition.NEW, createdAt: today },
    { id: 'DR-003', name: 'ذهبي كلاسيك', style: 'A-Line', type: DressType.RENT, factoryPrice: 3500, rentalPrice: 1000, status: DressStatus.CLEANING, rentalCount: 8, condition: DressCondition.USED, createdAt: today },
  ];
  
  const users: User[] = [
    { id: 'u1', username: 'admin', password: '123', role: UserRole.ADMIN, name: 'مدير النظام', permissions: ['ALL'], firstLogin: true },
  ];

  return { dresses, users, bookings: [], sales: [], finance: [], customers: [], logs: [] };
};

export const db = {
  resetAndSeed: () => {
      localStorage.clear();
      const data = generateSeedData();
      localStorage.setItem('elaf_users', JSON.stringify(data.users));
      localStorage.setItem('elaf_dresses', JSON.stringify(data.dresses));
  }
};