
// src/utils/constants.ts
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings, Wallet
} from 'lucide-react';

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
  "تحويل بنكك (سعر اليوم مصري)",
  "Western Union",
  "كاش (جنية مصري)",
  "كاش (دولار)",
  "أخرى"
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

export const PERMISSIONS_LIST = [
  { id: 'view_home', label: 'مشاهدة الرئيسية' },
  { id: 'view_rent_dresses', label: 'إدارة فساتين الإيجار' },
  { id: 'add_rent_dress', label: 'إضافة فستان إيجار' },
  { id: 'edit_rent_dress', label: 'تعديل فستان إيجار' },
  { id: 'delete_rent_dress', label: 'حذف فستان إيجار' },
  { id: 'view_rent_bookings', label: 'إدارة حجوزات الإيجار' },
  { id: 'add_booking', label: 'تسجيل حجز جديد' },
  { id: 'view_sale_orders', label: 'إدارة فساتين البيع' },
  { id: 'add_sale', label: 'تسجيل طلب بيع' },
  { id: 'view_factory', label: 'تعاملات المصنع' },
  { id: 'view_delivery', label: 'التسليم والإرجاع' },
  { id: 'view_customers', label: 'سجل العملاء' },
  { id: 'view_finance', label: 'مشاهدة المالية' },
  { id: 'add_finance', label: 'إضافة عمليات مالية' },
  { id: 'view_logs', label: 'سجل الحركة' },
  { id: 'view_personal_budget', label: 'إدارة ميزانية البيت' },
  { id: 'admin_reset', label: 'تصفير النظام (Admin)' },
];
