
// src/utils/constants.ts
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings, Wallet
} from 'lucide-react';
import { CountryCode } from '../types';

// FINANCIAL DEFAULTS
export const DEFAULT_RENT_OPS_FEE = 1200; // قيمة التشغيل الثابتة (غسيل + تعديل)
export const DEFAULT_STAFF_RATIO = 5; // نسبة عمولة الموظفين %

export const NAV_ITEMS = [
  { id: 'home', label: 'الرئيسية', icon: 'Home' },
  { id: 'rent_dresses', label: 'الفساتين', icon: 'Shirt' },
  { id: 'rent_bookings', label: 'الحجوزات', icon: 'Calendar' },
  { id: 'sale_orders', label: 'التفصيل والبيع', icon: 'ShoppingBag' },
  { id: 'factory', label: 'المصنع', icon: 'Factory' },
  { id: 'delivery', label: 'الاستلام/التسليم', icon: 'Truck' },
  { id: 'customers', label: 'العملاء', icon: 'Users' },
  { id: 'finance', label: 'المالية', icon: 'DollarSign' },
  { id: 'life_budget', label: 'ميزانية البيت', icon: 'Wallet' },
  { id: 'logs', label: 'السجلات', icon: 'FileText' },
  { id: 'settings', label: 'الإعدادات', icon: 'Settings' },
];

export const PAYMENT_METHODS = [
  "Instapay",
  "تحويل بنكك (سعر اليوم مصري)",
  "Western Union",
  "كاش (جنية مصري)",
  "كاش (دولار)",
  "أخرى"
];

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+20', flag: '🇪🇬', label: 'مصر' },
  { code: '+249', flag: '🇸🇩', label: 'السودان' },
  { code: '+966', flag: '🇸🇦', label: 'السعودية' },
  { code: '+971', flag: '🇦🇪', label: 'الإمارات' },
  { code: '', flag: '🌎', label: 'دولي (يدوي)' },
];

export const FINANCE_CATEGORIES = [
  "حجز إيجار",
  "عربون تفصيل",
  "تحصيل متبقي (إيجار)",
  "تحصيل متبقي (تفصيل)",
  "بيع مباشر",
  "خصم غرامة تلف",
  "المصنع",
  "رواتب",
  "تنظيف",
  "ترزي",
  "فواتير",
  "سحب للمنزل (مسحوبات مالك)",
  "أخرى",
  "مستحقات إيجار (مستقبلية)",
  "مستحقات تفصيل (مستقبلية)"
];

export const PERSONAL_CATEGORIES = [
  "مصاريف بيت (طعام/شراب)",
  "فواتير (كهرباء/نت/غاز)",
  "إيجار سكن",
  "مواصلات/بنزين",
  "أطفال (مدارس/دروس)",
  "علاج/أدوية",
  "ترفيه/خروجات",
  "تحويلات أهل",
  "ملابس شخصية",
  "أخرى"
];

export const CURRENCIES = [
  { code: 'EGP', label: 'جنية مصري', symbol: 'ج.م' },
  { code: 'SDG', label: 'جنية سوداني', symbol: 'SDG' },
  { code: 'USD', label: 'دولار أمريكي', symbol: '$' },
];

export const MEASUREMENT_FIELDS = [
  { id: 'neck', label: 'محيط الرقبة' }, { id: 'shoulder', label: 'محيط الكتف' },
  { id: 'chest', label: 'محيط الصدر' }, { id: 'underChest', label: 'محيط تحت الصدر' },
  { id: 'chestDart', label: 'طول بنس الصدر' }, { id: 'waist', label: 'محيط الخصر' },
  { id: 'backLength', label: 'طول الظهر' }, { id: 'hips', label: 'محيط الهانش' },
  { id: 'fullLength', label: 'الطول الكامل' }, { id: 'sleeve', label: 'طول اليد' },
  { id: 'armhole', label: 'محيط الأبط' }, { id: 'arm', label: 'محيط الذراع' },
  { id: 'forearm', label: 'محيط الساعد' }, { id: 'wrist', label: 'محيط الأسوارة' },
  { id: 'legOpening', label: 'محيط فتحة الرجل' }, 
  { id: 'bustType', label: 'نوع الصدر' },
  { id: 'skirtType', label: 'نوع التنورة' }, 
  { id: 'materials', label: 'الخامة المستخدمة' },
];

export const PERMISSIONS_CATEGORIES = [
  {
    title: "إدارة الفساتين والمخزون",
    perms: [
      { id: 'view_rent_dresses', label: 'عرض الفساتين' },
      { id: 'add_rent_dress', label: 'إضافة وتعديل فستان' },
      { id: 'change_dress_status', label: 'تغيير الحالة (غسيل/صيانة)' },
      { id: 'delete_rent_dress', label: 'حذف فساتين (خطر)' },
    ]
  },
  {
    title: "الحجوزات والمبيعات",
    perms: [
      { id: 'view_rent_bookings', label: 'عرض الحجوزات' },
      { id: 'add_booking', label: 'إنشاء وتعديل حجز' },
      { id: 'view_sale_orders', label: 'عرض طلبات البيع/التفصيل' },
      { id: 'add_sale', label: 'إضافة طلب بيع جديد' },
      { id: 'view_customers', label: 'سجل العملاء' },
      { id: 'view_delivery', label: 'التسليم والاستلام' },
      { id: 'view_factory', label: 'متابعة المصنع' },
    ]
  },
  {
    title: "المالية والخزنة (حساس)",
    perms: [
      { id: 'view_finance', label: 'عرض السجلات المالية' },
      { id: 'add_finance', label: 'إضافة عملية (مصروف/إيراد)' },
      { id: 'view_profits', label: 'الاطلاع على الأرباح' },
      { id: 'view_personal_budget', label: 'ميزانية البيت (Admin)' },
      { id: 'delete_finance', label: 'حذف سجلات مالية (خطر)' },
    ]
  },
  {
    title: "النظام والإعدادات",
    perms: [
      { id: 'manage_users', label: 'إدارة الموظفين' },
      { id: 'view_logs', label: 'سجل النشاطات' },
      { id: 'view_settings', label: 'الإعدادات العامة' },
      { id: 'delete_users', label: 'حذف حسابات الموظفين (خطر)' },
      { id: 'admin_reset', label: 'تصفير النظام (دمار شامل)' },
    ]
  }
];
