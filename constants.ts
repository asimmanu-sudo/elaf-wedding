
export const NAV_ITEMS = [
  { id: 'home', label: 'الرئيسية', icon: 'Home' },
  { id: 'dresses_rent', label: 'إدارة فساتين الإيجار', icon: 'Shirt' },
  { id: 'bookings', label: 'إدارة حجوزات الإيجار', icon: 'Calendar' },
  { id: 'dresses_sale', label: 'إدارة فساتين البيع', icon: 'ShoppingBag' },
  { id: 'factory', label: 'إدارة تعاملات المصنع', icon: 'Factory' },
  { id: 'delivery', label: 'التسليم والإرجاع', icon: 'Truck' },
  { id: 'customers', label: 'العملاء', icon: 'Users' },
  { id: 'finance', label: 'المالية', icon: 'DollarSign' },
  { id: 'logs', label: 'سجل الحركة', icon: 'FileText' },
  { id: 'settings', label: 'الإعدادات', icon: 'Settings' },
];

export const PERMISSIONS_LIST = [
    { id: 'ALL', label: 'مدير النظام (صلاحيات كاملة)' }, /* New Manager Permission */
    { id: 'home_view', label: 'الرئيسية: مشاهدة' },
    
    { id: 'dresses_rent_view', label: 'ف. إيجار: مشاهدة المخزون' },
    { id: 'dresses_rent_add', label: 'ف. إيجار: إضافة/تعديل' },
    { id: 'dresses_rent_delete', label: 'ف. إيجار: حذف/أرشيف' },
    { id: 'dresses_rent_analytics', label: 'ف. إيجار: تقارير الأداء (الأكثر طلباً)' }, // New
    
    { id: 'bookings_view', label: 'الحجوزات: مشاهدة' },
    { id: 'bookings_add', label: 'الحجوزات: إضافة/تعديل' },
    { id: 'bookings_delete', label: 'الحجوزات: حذف' },

    { id: 'dresses_sale_view', label: 'ف. بيع: مشاهدة' },
    { id: 'dresses_sale_add', label: 'ف. بيع: إضافة/تعديل' },
    { id: 'dresses_sale_deliver', label: 'ف. بيع: تسليم للعروس' },

    { id: 'factory_view', label: 'المصنع: مشاهدة' },
    { id: 'factory_pay', label: 'المصنع: سداد دفعات' },

    { id: 'delivery_view', label: 'التسليم/إرجاع: مشاهدة' },
    { id: 'delivery_action', label: 'التسليم/إرجاع: تنفيذ عمليات' },
    
    { id: 'customers_view', label: 'العملاء: مشاهدة' },
    
    { id: 'finance_ops', label: 'المالية: إدخال وعرض الجدول' },
    { id: 'finance_analytics', label: 'المالية: التحليلات العامة' },
    { id: 'finance_profit_analysis', label: 'المالية: تحليل ربحية الفساتين' }, // New
    
    { id: 'logs_view', label: 'سجل الحركة: مشاهدة' },
    { id: 'settings_view', label: 'الإعدادات: مشاهدة' },
];