
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, 
  Settings, LogOut, Plus, Search, Edit, Trash2, Check, X, AlertTriangle, Ruler, 
  Droplets, CheckCircle, Info, Menu, ChevronRight, Save, Key, UserPlus, Database,
  TrendingUp, ArrowDownCircle, PieChart as PieChartIcon, BarChart3, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { cloudDb, COLLS } from './services/firebase';
import { 
  UserRole, DressType, DressStatus, BookingStatus, SaleStatus, 
  FactoryPaymentStatus, DepositType 
} from './types';
import type { 
  User, Dress, SaleOrder, Booking, FinanceRecord, AuditLog, Measurements 
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Global UI Constants ---

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const today = new Date().toISOString().split('T')[0];

const CARD_CLASS = "bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-2xl animate-scale-in mb-4 transition-all active:scale-[0.98]";
const INPUT_CLASS = "w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-500 font-medium";
const BTN_PRIMARY = "bg-brand-600 hover:bg-brand-700 text-white h-14 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-900/20";
const BTN_GHOST = "bg-white/5 hover:bg-white/10 text-white h-14 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95";

const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val);

const MEASUREMENT_FIELDS = [
  { id: 'neck', label: 'محيط الرقبة' }, { id: 'shoulder', label: 'محيط الكتف' },
  { id: 'chest', label: 'محيط الصدر' }, { id: 'underChest', label: 'محيط تحت الصدر' },
  { id: 'chestDart', label: 'طول بنس الصدر' }, { id: 'waist', label: 'محيط الخصر' },
  { id: 'backLength', label: 'طول الظهر' }, { id: 'hips', label: 'محيط الهانش' },
  { id: 'fullLength', label: 'الطول الكامل' }, { id: 'sleeve', label: 'طول اليد' },
  { id: 'armhole', label: 'محيط الأبط' }, { id: 'arm', label: 'محيط الذراع' },
  { id: 'forearm', label: 'محيط الساعد' }, { id: 'wrist', label: 'محيط الأسوارة' },
  { id: 'legOpening', label: 'محيط فتحة الرجل' }, { id: 'bustType', label: 'نوع الصدر' },
  { id: 'skirtType', label: 'نوع التنورة' }, { id: 'materials', label: 'الخامة المستخدمة' },
  { id: 'orderNotes', label: 'الشرح المطلوب للأوردر' }
];

const Modal = ({ title, children, onClose, size = 'md' }: any) => (
  <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 overflow-hidden animate-fade-in">
    <div className={`bg-slate-900 border-t md:border border-white/10 rounded-t-[3rem] md:rounded-[3.5rem] w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} p-8 shadow-2xl relative animate-slide-up flex flex-col max-h-[95vh]`}>
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">{children}</div>
    </div>
  </div>
);

// --- Main App Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);

  // Database States
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const unsubD = cloudDb.subscribe(COLLS.DRESSES, setDresses);
    const unsubB = cloudDb.subscribe(COLLS.BOOKINGS, setBookings);
    const unsubS = cloudDb.subscribe(COLLS.SALES, setSales);
    const unsubF = cloudDb.subscribe(COLLS.FINANCE, setFinance);
    const unsubU = cloudDb.subscribe(COLLS.USERS, setUsers);
    const unsubL = cloudDb.subscribe(COLLS.LOGS, setLogs);
    return () => { unsubD(); unsubB(); unsubS(); unsubF(); unsubU(); unsubL(); };
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const addLog = (action: string, details: string) => {
    if (user) cloudDb.add(COLLS.LOGS, { action, username: user.name, timestamp: new Date().toISOString(), details });
  };

  const hasPerm = (p: string) => user?.role === UserRole.ADMIN || user?.permissions.includes(p);

  // --- Login Screen ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm text-center mb-12 animate-fade-in">
          <img src="/Logo.png" alt="Elaf Logo" className="w-48 h-48 mx-auto object-contain drop-shadow-2xl mb-8" />
          <h1 className="text-3xl font-black text-white mb-2">إيلاف لفساتين الزفاف</h1>
          <p className="text-slate-500 font-bold tracking-tight">Wedding Dress Management System</p>
        </div>
        <div className="w-full max-w-sm bg-slate-900/50 backdrop-blur-xl border border-white/5 p-10 rounded-[3.5rem] shadow-2xl">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const foundUser = users.find(x => x.username === fd.get('u') && x.password === fd.get('p'));
            if (foundUser) {
              setUser(foundUser);
              addLog('دخول', 'تسجيل دخول للمنصة');
            } else {
              showToast('بيانات الدخول غير صحيحة', 'error');
            }
          }} className="space-y-4">
            <input name="u" placeholder="اسم المستخدم" className={INPUT_CLASS} required />
            <input name="p" type="password" placeholder="كلمة المرور" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-16 text-lg mt-6"}>دخول النظام</button>
          </form>
        </div>
      </div>
    );
  }

  // --- Forced Password Change ---
  if (user.firstLogin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className={CARD_CLASS + " w-full max-w-sm"}>
          <h2 className="text-2xl font-black mb-6">تغيير كلمة المرور</h2>
          <p className="text-slate-400 text-sm mb-6">يرجى تعيين كلمة مرور جديدة عند أول دخول للنظام.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const pass = new FormData(e.currentTarget).get('p') as string;
            await cloudDb.update(COLLS.USERS, user.id, { password: pass, firstLogin: false });
            setUser({ ...user, password: pass, firstLogin: false });
            showToast('تم تحديث كلمة المرور بنجاح');
          }} className="space-y-4">
            <input name="p" type="password" placeholder="كلمة المرور الجديدة" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-16"}>حفظ وتفعيل الحساب</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden" dir="rtl">
      {/* Header with Search */}
      <header className="pt-safe shrink-0 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="px-6 h-20 flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={20}/>
            <input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={`بحث سريع في ${NAV_ITEMS.find(i => i.id === activeTab)?.label}...`}
              className={INPUT_CLASS + " !h-12 !pr-12 !bg-slate-950/50 !rounded-full text-sm border-none ring-1 ring-white/5"}
            />
          </div>
          <button onClick={() => { setUser(null); setActiveTab('home'); }} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all active:scale-90">
            <LogOut size={22}/>
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32">
        {activeTab === 'home' && <HomeView dresses={dresses} bookings={bookings} sales={sales} />}
        {activeTab === 'rent_dresses' && <RentDresses dresses={dresses} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'rent_bookings' && <RentBookings dresses={dresses} bookings={bookings} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'sale_orders' && <SaleOrders sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'factory' && <FactoryView sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'delivery' && <DeliveryReturnView bookings={bookings} sales={sales} dresses={dresses} query={searchQuery} user={user} showToast={showToast} addLog={addLog} />}
        {activeTab === 'finance' && <FinanceView finance={finance} dresses={dresses} users={users} bookings={bookings} query={searchQuery} hasPerm={hasPerm} showToast={showToast} />}
        {activeTab === 'customers' && <CustomerRegistry bookings={bookings} sales={sales} query={searchQuery} />}
        {activeTab === 'logs' && <AuditLogs logs={logs} query={searchQuery} />}
        {activeTab === 'settings' && <SettingsView user={user} users={users} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
      </main>

      {/* Bottom Adaptive Navigation - Scrollable for more items */}
      <nav className="shrink-0 pb-safe bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 fixed bottom-0 left-0 right-0 z-[100]">
        <div className="h-20 flex items-center overflow-x-auto custom-scrollbar px-2 space-x-2 space-x-reverse">
          {[
            { id: 'home', icon: Home, label: 'الرئيسية' },
            { id: 'rent_dresses', icon: Shirt, label: 'الإيجار' },
            { id: 'rent_bookings', icon: Calendar, label: 'الحجوزات' },
            { id: 'sale_orders', icon: ShoppingBag, label: 'البيع' },
            { id: 'factory', icon: Factory, label: 'المصنع' },
            { id: 'delivery', icon: Truck, label: 'التسليم' },
            { id: 'finance', icon: DollarSign, label: 'المالية' },
            { id: 'customers', icon: Users, label: 'العملاء' },
            { id: 'logs', icon: FileText, label: 'السجلات' },
            { id: 'settings', icon: Settings, label: 'الإعدادات' },
          ].map(item => (
            <button 
              key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
              className={`flex flex-col items-center justify-center min-w-[70px] transition-all ${activeTab === item.id ? 'text-brand-500 scale-105' : 'text-slate-500'}`}
            >
              <div className={`w-10 h-8 flex items-center justify-center rounded-full transition-all ${activeTab === item.id ? 'bg-brand-500/10' : ''}`}>
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-bold mt-1 whitespace-nowrap ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Adaptive Toast Notifications */}
      <div className="fixed bottom-24 left-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] shadow-2xl border pointer-events-auto animate-slide-up mx-auto max-w-sm ${
            t.type === 'error' ? 'bg-red-950 border-red-500/50 text-red-200' : 
            t.type === 'warning' ? 'bg-orange-950 border-orange-500/50 text-orange-200' :
            'bg-emerald-950 border-emerald-500/50 text-emerald-200'
          }`}>
            {t.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-bold text-sm">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- View: Home Dashboard ---

function HomeView({ dresses, bookings, sales }: any) {
  const [activeList, setActiveList] = useState<any>(null);

  const weekLater = new Date(); weekLater.setDate(weekLater.getDate() + 7);
  const weekLaterStr = weekLater.toISOString().split('T')[0];

  const rentalsWeek = bookings.filter((b: any) => b.status === BookingStatus.PENDING && b.deliveryDate >= today && b.deliveryDate <= weekLaterStr);
  const cleaning = dresses.filter((d: any) => d.status === DressStatus.CLEANING).map((d: any) => ({
    ...d, nextBooking: bookings.filter((b: any) => b.dressId === d.id && b.status === BookingStatus.PENDING).sort((a:any, b:any) => a.eventDate.localeCompare(b.eventDate))[0]
  }));
  const lateSales = sales.filter((s: any) => s.status !== SaleStatus.DELIVERED && s.expectedDeliveryDate < today);
  const returnsToday = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE && b.eventDate === today);
  const fittingsWeek = bookings.filter((b: any) => b.status === BookingStatus.PENDING).filter((b: any) => {
    const f1 = b.fitting1Date >= today && b.fitting1Date <= weekLaterStr;
    const f2 = b.fitting2Date >= today && b.fitting2Date <= weekLaterStr;
    return f1 || f2;
  }).map((b: any) => ({
    ...b, type: b.fitting1Date >= today && b.fitting1Date <= weekLaterStr ? 'أولى' : 'ثانية'
  }));

  const stats = [
    { label: 'تسليمات الإيجار', count: rentalsWeek.length, data: rentalsWeek, title: 'تسليمات الإسبوع', color: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
    { label: 'محتاجة غسيل', count: cleaning.length, data: cleaning, title: 'فساتين للغسيل', color: 'border-orange-500/20 bg-orange-500/10 text-orange-400' },
    { label: 'تفصيل متأخر', count: lateSales.length, data: lateSales, title: 'طلبات بيع متأخرة', color: 'border-red-500/20 bg-red-500/10 text-red-400' },
    { label: 'مرتجعات اليوم', count: rentalsWeek.length > 0 ? returnsToday.length : 0, data: returnsToday, title: 'مرتجعات اليوم', color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
    { label: 'بروفات الإسبوع', count: fittingsWeek.length, data: fittingsWeek, title: 'بروفات الإسبوع', color: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-4">
        {stats.map(s => (
          <button 
            key={s.label} onClick={() => setActiveList(s)}
            className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 shadow-lg transition-all active:scale-95 ${s.color}`}
          >
            <span className="text-4xl font-black mb-1">{s.count}</span>
            <span className="text-[11px] font-black uppercase tracking-tighter opacity-80">{s.label}</span>
          </button>
        ))}
      </div>

      {activeList && (
        <Modal title={activeList.title} onClose={() => setActiveList(null)} size="lg">
          <div className="space-y-3">
            {activeList.data.map((item: any, idx: number) => (
              <div key={idx} className="p-5 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-white">{item.customerName || item.brideName || item.name}</h4>
                  <span className="text-[10px] font-bold bg-brand-500/20 text-brand-400 px-3 py-1 rounded-full uppercase">{item.dressName || item.factoryCode || item.style}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mt-2">
                  <Clock size={14} className="text-brand-500" />
                  <span>{item.deliveryDate || item.expectedDeliveryDate || item.eventDate}</span>
                  {item.type && <span className="text-purple-400 font-black">• بروفة {item.type}</span>}
                </div>
              </div>
            ))}
            {activeList.data.length === 0 && <div className="text-center py-10 text-slate-500 font-bold italic">لا توجد بيانات حالية للعرض</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- View: Rent Dresses ---

function RentDresses({ dresses, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'available' | 'archived' | 'ratings'>('available');
  const [modal, setModal] = useState<any>(null);

  const filtered = dresses.filter((d: any) => d.type === DressType.RENT && (d.name.includes(query) || d.style.includes(query))).filter((d: any) => {
    if (subTab === 'available') return d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD;
    if (subTab === 'archived') return d.status === DressStatus.ARCHIVED || d.status === DressStatus.SOLD;
    return true;
  });

  const ratingsList = [...dresses].filter(d => d.type === DressType.RENT).sort((a, b) => b.rentalCount - a.rentalCount);

  return (
    <div className="space-y-6">
      <div className="flex p-1.5 bg-slate-900/60 rounded-[2rem] border border-white/5 mb-4 shrink-0 overflow-x-auto custom-scrollbar">
        {['available', 'archived', 'ratings'].map(s => (
          <button 
            key={s} onClick={() => setSubTab(s as any)}
            className={`flex-1 min-w-[100px] h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === s ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            {s === 'available' ? 'المتاحة' : s === 'archived' ? 'المؤرشفة' : 'التقييمات'}
          </button>
        ))}
      </div>

      {subTab === 'available' && hasPerm('add_rent_dress') && (
        <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY + " w-full !rounded-[2.5rem]"}>
          <Plus size={22}/> إضافة فستان إيجار
        </button>
      )}

      <div className="space-y-4">
        {subTab === 'ratings' ? (
          ratingsList.map((d: any) => (
            <div key={d.id} className={CARD_CLASS + " flex items-center justify-between !mb-2"}>
              <div><h4 className="font-black text-white">{d.name}</h4><p className="text-[10px] text-slate-500 font-bold">{d.style}</p></div>
              <div className="text-center bg-brand-500/10 text-brand-400 px-5 py-2 rounded-2xl font-black text-xs uppercase">{d.rentalCount} مرة إيجار</div>
            </div>
          ))
        ) : (
          filtered.map((d: any) => (
            <div key={d.id} className={CARD_CLASS}>
              <div className="flex justify-between items-start mb-6">
                <div><h3 className="text-xl font-black text-white mb-1">{d.name}</h3><p className="text-xs text-slate-500 font-bold">{d.style} • {formatCurrency(d.factoryPrice)}</p></div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${d.status === DressStatus.AVAILABLE ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>{d.status}</span>
              </div>
              <div className="flex gap-2">
                {subTab === 'available' ? (
                  <>
                    <button 
                      onClick={() => cloudDb.update(COLLS.DRESSES, d.id, { status: d.status === DressStatus.CLEANING ? DressStatus.AVAILABLE : DressStatus.CLEANING })}
                      className="flex-1 bg-white/5 h-12 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2"
                    >
                      {d.status === DressStatus.CLEANING ? <Check size={18}/> : <Droplets size={18}/>}
                      {d.status === DressStatus.CLEANING ? 'إعادة من الغسيل' : 'تحويل للغسيل'}
                    </button>
                    <button onClick={() => setModal({ type: 'DELETE_OPT', item: d })} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                  </>
                ) : (
                  <button onClick={() => { if(confirm('هل تريد استعادة الفستان كمتاح؟')) { cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.AVAILABLE }); showToast('تمت استعادة الفستان'); } }} className={BTN_PRIMARY + " w-full !h-12 !text-[11px]"}>استعادة كمتاح</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {modal?.type === 'ADD' && (
        <Modal title="إضافة فستان إيجار" onClose={() => setModal(null)}>
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = fd.get('n') as string;
            if (dresses.some((x: any) => x.name === name)) return showToast('هذا الاسم مستخدم مسبقاً!', 'warning');
            await cloudDb.add(COLLS.DRESSES, {
              name, style: fd.get('s'), factoryPrice: Number(fd.get('p')),
              type: DressType.RENT, status: DressStatus.AVAILABLE, rentalCount: 0, createdAt: new Date().toISOString()
            });
            addLog('إضافة فستان', `إضافة فستان إيجار: ${name}`);
            showToast('تمت إضافة الفستان بنجاح'); setModal(null);
          }} className="space-y-4">
            <input name="n" placeholder="اسم الفستان (يجب أن يكون مميزاً)" className={INPUT_CLASS} required />
            <input name="s" placeholder="ستايل الفستان (مثلاً: ملكي)" className={INPUT_CLASS} required />
            <input name="p" type="number" placeholder="سعر الشراء" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-16 text-lg mt-4"}>حفظ الفستان</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'DELETE_OPT' && (
        <Modal title="خيارات الحذف" onClose={() => setModal(null)}>
          <div className="grid gap-3">
            <button onClick={() => { if(confirm('هل أنت متأكد من الحذف النهائي؟')) { cloudDb.delete(COLLS.DRESSES, modal.item.id); setModal(null); showToast('تم الحذف بنجاح'); } }} className="p-6 bg-red-500/10 text-red-500 rounded-[2.5rem] font-black text-sm transition-all hover:bg-red-500 hover:text-white">حذف نهائي</button>
            <button onClick={() => { cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.ARCHIVED }); setModal(null); showToast('تم النقل للأرشيف'); }} className="p-6 bg-slate-800 text-white rounded-[2.5rem] font-black text-sm transition-all hover:bg-slate-700">نقل إلى الأرشيف</button>
            <button onClick={() => setModal({ type: 'SELL', item: modal.item })} className="p-6 bg-emerald-500/10 text-emerald-500 rounded-[2.5rem] font-black text-sm transition-all hover:bg-emerald-500 hover:text-white">بيع الفستان</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'SELL' && (
        <Modal title={`بيع فستان: ${modal.item.name}`} onClose={() => setModal(null)}>
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const salePrice = Number(fd.get('pr'));
            await cloudDb.update(COLLS.DRESSES, modal.item.id, { 
              status: DressStatus.SOLD, salePrice, customerName: fd.get('cn'), customerPhone: fd.get('cp') 
            });
            await cloudDb.add(COLLS.FINANCE, {
              amount: salePrice, type: 'INCOME', category: 'بيع فستان إيجار',
              notes: `بيع فستان ${modal.item.name} للعميل ${fd.get('cn')}`, date: today
            });
            addLog('بيع فستان', `بيع فستان ${modal.item.name} بقيمة ${salePrice}`);
            showToast('تمت عملية البيع وتسجيل الإيراد'); setModal(null);
          }} className="space-y-4">
            <input name="pr" type="number" placeholder="قيمة البيع" className={INPUT_CLASS} required />
            <input name="cn" placeholder="اسم العميل" className={INPUT_CLASS} required />
            <input name="cp" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-16 mt-4"}>تأكيد عملية البيع</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Rent Bookings ---

function RentBookings({ dresses, bookings, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past' | 'fittings'>('current');
  const [modal, setModal] = useState<any>(null);

  const filtered = bookings.filter((b: any) => (b.customerName.includes(query) || b.dressName.includes(query))).filter((b: any) => {
    if (subTab === 'current') return b.status !== BookingStatus.COMPLETED;
    if (subTab === 'past') return b.status === BookingStatus.COMPLETED;
    return true;
  });

  const fittingsToday = bookings.filter((b: any) => b.status === BookingStatus.PENDING && (!b.fitting1Done || !b.fitting2Done));

  return (
    <div className="space-y-6">
      <div className="flex p-1.5 bg-slate-900/60 rounded-[2rem] border border-white/5 mb-4 shrink-0 overflow-x-auto custom-scrollbar">
        {['current', 'past', 'fittings'].map(s => (
          <button 
            key={s} onClick={() => setSubTab(s as any)}
            className={`flex-1 min-w-[110px] h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === s ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            {s === 'current' ? 'الحالية' : s === 'past' ? 'السابقة' : 'البروفات'}
          </button>
        ))}
      </div>

      {subTab === 'current' && hasPerm('add_booking') && (
        <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY + " w-full !rounded-[2.5rem]"}>
          <Plus size={22}/> تسجيل حجز جديد
        </button>
      )}

      <div className="space-y-4">
        {(subTab === 'fittings' ? fittingsToday : filtered).map((b: any) => (
          <div key={b.id} className={CARD_CLASS}>
            <div className="flex justify-between items-start mb-6">
              <div><h4 className="text-xl font-black text-white">{b.customerName}</h4><p className="text-xs text-slate-500 font-bold">{b.customerPhone}</p></div>
              <span className={`px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-brand-400`}>{b.status}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-950/50 p-4 rounded-[2rem] border border-white/5">
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">الفستان</p><p className="text-xs font-black text-white">{b.dressName}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">المناسبة</p><p className="text-xs font-black text-white">{b.eventDate}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">التسليم</p><p className="text-xs font-black text-white">{b.deliveryDate}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">المتبقي</p><p className="text-sm font-black text-red-400">{formatCurrency(b.remainingToPay)}</p></div>
            </div>

            {subTab === 'fittings' ? (
              <div className="grid gap-2">
                 <button 
                  onClick={() => { if(confirm('تأكيد اكتمال البروفة الأولى؟')) cloudDb.update(COLLS.BOOKINGS, b.id, { fitting1Done: true }); }}
                  disabled={b.fitting1Done}
                  className={`w-full py-4 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 ${b.fitting1Done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-600/10 text-brand-400'}`}
                 >البروفة الأولى: {b.fitting1Date} {b.fitting1Done && '(تمت)'}</button>
                 <button 
                  onClick={() => { if(confirm('تأكيد اكتمال البروفة الثانية؟')) cloudDb.update(COLLS.BOOKINGS, b.id, { fitting2Done: true }); }}
                  disabled={b.fitting2Done}
                  className={`w-full py-4 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 ${b.fitting2Done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-600/10 text-brand-400'}`}
                 >البروفة الثانية: {b.fitting2Date} {b.fitting2Done && '(تمت)'}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setModal({ type: 'MEASURE', item: b })} className="flex-1 h-12 bg-white/5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2"><Ruler size={18}/> المقاسات</button>
                <button onClick={() => { if(confirm('إلغاء الحجز نهائياً؟')) cloudDb.delete(COLLS.BOOKINGS, b.id); }} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-400 rounded-2xl"><Trash2 size={20}/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal?.type === 'ADD' && (
        <Modal title="تسجيل حجز جديد" onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const dressId = fd.get('dr') as string;
            const eventDate = fd.get('ed') as string;
            const delDate = fd.get('dd') as string;
            const dr = dresses.find((x:any) => x.id === dressId);

            // Conflict Check
            const conflict = bookings.some((b: any) => {
              if (b.dressId !== dressId || b.status === BookingStatus.CANCELLED) return false;
              const diff = Math.abs(new Date(b.eventDate).getTime() - new Date(eventDate).getTime()) / (1000 * 3600 * 24);
              return diff <= 2;
            });

            if (conflict && !confirm('تحذير: هذا الفستان محجوز في تاريخ قريب (يومين). هل تريد المتابعة؟')) return;

            // Dates Calc
            const delObj = new Date(delDate);
            const f1Date = new Date(delObj); f1Date.setDate(f1Date.getDate() - 10);
            const f2Date = new Date(delObj); f2Date.setDate(f2Date.getDate() - 3);

            const rentPrice = Number(fd.get('rp')); const dep = Number(fd.get('dep'));

            await cloudDb.add(COLLS.BOOKINGS, {
              customerName: fd.get('cn'), customerPhone: fd.get('cp'), customerAddress: fd.get('ca'),
              dressId, dressName: dr.name, eventDate, deliveryDate: delDate,
              fitting1Date: f1Date.toISOString().split('T')[0],
              fitting2Date: f2Date.toISOString().split('T')[0],
              fitting1Done: false, fitting2Done: false,
              rentalPrice: rentPrice, paidDeposit: dep, remainingToPay: rentPrice - dep,
              notes: fd.get('notes'), status: BookingStatus.PENDING, createdAt: today
            });
            if (dep > 0) await cloudDb.add(COLLS.FINANCE, { amount: dep, type: 'INCOME', category: 'عربون حجز إيجار', notes: `عربون العروس ${fd.get('cn')}`, date: today });
            addLog('حجز جديد', `تسجيل حجز لـ ${fd.get('cn')} على فستان ${dr.name}`);
            showToast('تم تسجيل الحجز بنجاح'); setModal(null);
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="cn" placeholder="اسم العروس" className={INPUT_CLASS} required />
              <input name="cp" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
            </div>
            <input name="ca" placeholder="العنوان (اختياري)" className={INPUT_CLASS} />
            <select name="dr" className={INPUT_CLASS} required>
              <option value="">اختر الفستان المتاح...</option>
              {dresses.filter((d:any) => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED).map((d:any) => <option key={d.id} value={d.id}>{d.name} ({d.status})</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase px-2">تاريخ المناسبة</label><input name="ed" type="date" className={INPUT_CLASS} required /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase px-2">تاريخ التسليم</label><input name="dd" type="date" className={INPUT_CLASS} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input name="rp" type="number" placeholder="سعر الإيجار" className={INPUT_CLASS} required />
              <input name="dep" type="number" placeholder="العربون المدفوع" className={INPUT_CLASS} required />
            </div>
            <textarea name="notes" placeholder="ملاحظات التعديلات والطلب..." className={INPUT_CLASS + " h-32"} />
            <button className={BTN_PRIMARY + " w-full h-16 mt-4 shadow-2xl"}>تثبيت الحجز السحابي</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title={`المقاسات: ${modal.item.customerName || modal.item.brideName}`} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const m: any = {}; MEASUREMENT_FIELDS.forEach(f => m[f.id] = fd.get(f.id));
              const coll = modal.item.factoryCode ? COLLS.SALES : COLLS.BOOKINGS;
              await cloudDb.update(coll, modal.item.id, { measurements: m });
              showToast('تم حفظ المقاسات بنجاح'); setModal(null);
           }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MEASUREMENT_FIELDS.map(f => (
                <div key={f.id} className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2">{f.label}</label>
                  {f.id === 'orderNotes' ? (
                    <textarea name={f.id} defaultValue={modal.item.measurements?.[f.id]} className={INPUT_CLASS + " h-32 w-full md:col-span-2 lg:col-span-3"} />
                  ) : (
                    <input name={f.id} defaultValue={modal.item.measurements?.[f.id]} className={INPUT_CLASS} />
                  )}
                </div>
              ))}
              <button className={BTN_PRIMARY + " w-full h-16 mt-6 col-span-2 md:col-span-3 shadow-2xl"}><Save size={20}/> حفظ المقاسات</button>
           </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Sale Dress Management ---

function SaleOrders({ sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past'>('current');
  const [modal, setModal] = useState<any>(null);

  const filtered = sales.filter((o: any) => (o.brideName.includes(query) || o.factoryCode.includes(query))).filter((o: any) => {
    if (subTab === 'current') return o.status !== SaleStatus.DELIVERED;
    return o.status === SaleStatus.DELIVERED;
  });

  return (
    <div className="space-y-6">
       <div className="flex p-1.5 bg-slate-900/60 rounded-[2rem] border border-white/5 mb-4 shrink-0">
        <button onClick={() => setSubTab('current')} className={`flex-1 h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === 'current' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>طلبات حالية</button>
        <button onClick={() => setSubTab('past')} className={`flex-1 h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === 'past' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>طلبات سابقة</button>
      </div>

      {subTab === 'current' && hasPerm('add_sale') && (
        <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY + " w-full !rounded-[2.5rem]"}><Plus size={22}/> طلب تفصيل جديد</button>
      )}

      <div className="space-y-4">
        {filtered.map((o: any) => (
          <div key={o.id} className={CARD_CLASS}>
             <div className="flex justify-between items-start mb-6">
                <div><h4 className="text-xl font-black text-white mb-1">{o.brideName}</h4><p className="text-xs text-brand-500 font-black uppercase tracking-widest">{o.factoryCode}</p></div>
                <span className={`px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-purple-400`}>{o.status}</span>
             </div>
             <div className="p-5 bg-slate-950/50 rounded-[2rem] border border-white/5 mb-8 space-y-2">
                <div className="flex justify-between items-center"><p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">التسليم المتوقع</p><p className="text-xs font-black text-white">{o.expectedDeliveryDate}</p></div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center"><p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">المتبقي على العروس</p><p className="text-sm font-black text-red-400">{formatCurrency(o.remainingFromBride)}</p></div>
             </div>
             <div className="flex gap-2">
               <button onClick={() => setModal({ type: 'MEASURE', item: o })} className="flex-1 h-12 bg-white/5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2"><Ruler size={18}/> المقاسات</button>
               <button onClick={() => { if(confirm('حذف الطلب؟')) cloudDb.delete(COLLS.SALES, o.id); }} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-400 rounded-2xl"><Trash2 size={20}/></button>
             </div>
          </div>
        ))}
      </div>

      {modal?.type === 'ADD' && (
        <Modal title="تسجيل طلب تفصيل" onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = fd.get('c') as string;
            if (sales.some((x:any) => x.factoryCode === code && x.status !== SaleStatus.DELIVERED)) return showToast('كود المصنع مكرر ومستخدم حالياً!', 'warning');

            const sellPrice = Number(fd.get('sp')); const dep = Number(fd.get('dep'));
            await cloudDb.add(COLLS.SALES, {
              factoryCode: code, brideName: fd.get('n'), bridePhone: fd.get('ph'), description: fd.get('d'),
              expectedDeliveryDate: fd.get('ed'), sellPrice, factoryPrice: Number(fd.get('fp')),
              deposit: dep, remainingFromBride: sellPrice - dep, status: SaleStatus.DESIGNING,
              factoryStatus: FactoryPaymentStatus.UNPAID, factoryDepositPaid: 0, orderDate: today
            });
            if (dep > 0) await cloudDb.add(COLLS.FINANCE, { amount: dep, type: 'INCOME', category: 'عربون تفصيل', notes: `عربون كود ${code} لـ ${fd.get('n')}`, date: today });
            addLog('طلب تفصيل', `تسجيل طلب تفصيل كود ${code} لـ ${fd.get('n')}`);
            showToast('تم تسجيل الطلب بنجاح'); setModal(null);
          }} className="space-y-4">
            <input name="c" placeholder="كود الفستان للمصنع (مميز)" className={INPUT_CLASS} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="n" placeholder="اسم العروس" className={INPUT_CLASS} required />
              <input name="ph" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
            </div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase px-2">التسليم المتوقع</label><input name="ed" type="date" className={INPUT_CLASS} required /></div>
            <div className="grid grid-cols-3 gap-3">
              <input name="sp" type="number" placeholder="سعر البيع" className={INPUT_CLASS} required />
              <input name="fp" type="number" placeholder="سعر المصنع" className={INPUT_CLASS} required />
              <input name="dep" type="number" placeholder="العربون" className={INPUT_CLASS} required />
            </div>
            <textarea name="d" placeholder="وصف الفستان المطلوب بالتفصيل..." className={INPUT_CLASS + " h-32"} required />
            <button className={BTN_PRIMARY + " w-full h-16 mt-4 shadow-2xl"}>تثبيت طلب التفصيل</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Factory Management ---

function FactoryView({ sales, query, hasPerm, showToast, addLog }: any) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subTab, setSubTab] = useState<'pending' | 'completed'>('pending');
  const [modal, setModal] = useState<any>(null);
  const [depositAmounts, setDepositAmounts] = useState<Record<string, number>>({});

  const filtered = sales.filter((o: any) => o.factoryCode.includes(query)).filter((o: any) => {
    if (subTab === 'pending') return o.factoryStatus !== FactoryPaymentStatus.PAID;
    return o.factoryStatus === FactoryPaymentStatus.PAID;
  });

  const selectedTotalRemaining = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const o = sales.find((x: any) => x.id === id);
      return sum + (o ? o.factoryPrice - o.factoryDepositPaid : 0);
    }, 0);
  }, [selectedIds, sales]);

  const depositTotalSum = useMemo(() => {
    return Object.values(depositAmounts).reduce((a, b) => a + b, 0);
  }, [depositAmounts]);

  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const handleBulkDeposit = async () => {
    let total = 0;
    for (const id of selectedIds) {
      const o = sales.find((x:any) => x.id === id);
      const amt = depositAmounts[id] || 0;
      if (amt > 0) {
        const newPaid = o.factoryDepositPaid + amt;
        await cloudDb.update(COLLS.SALES, id, { 
          factoryDepositPaid: newPaid,
          factoryStatus: newPaid >= o.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL
        });
        total += amt;
      }
    }
    if (total > 0) await cloudDb.add(COLLS.FINANCE, { amount: total, type: 'EXPENSE', category: 'المصنع', notes: `دفع عربون لـ ${selectedIds.length} فستان`, date: today });
    showToast('تم تسجيل الدفعيات بنجاح'); setSelectedIds([]); setModal(null); setDepositAmounts({});
  };

  const handleBulkClearance = async () => {
    if (!confirm(`هل تريد تصفية حساب ${selectedIds.length} فستان؟`)) return;
    let total = 0;
    for (const id of selectedIds) {
      const o = sales.find((x:any) => x.id === id);
      const rem = o.factoryPrice - o.factoryDepositPaid;
      await cloudDb.update(COLLS.SALES, id, { factoryDepositPaid: o.factoryPrice, factoryStatus: FactoryPaymentStatus.PAID });
      total += rem;
    }
    if (total > 0) await cloudDb.add(COLLS.FINANCE, { amount: total, type: 'EXPENSE', category: 'المصنع', notes: `تصفية حسابات المصنع لـ ${selectedIds.length} فستان`, date: today });
    showToast('تمت تصفية الحسابات بنجاح'); setSelectedIds([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex p-1.5 bg-slate-900/60 rounded-[2rem] border border-white/5 mb-4 overflow-x-auto shrink-0">
        <button onClick={() => { setSubTab('pending'); setSelectedIds([]); }} className={`flex-1 min-w-[130px] h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === 'pending' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>مستحقات حالية</button>
        <button onClick={() => { setSubTab('completed'); setSelectedIds([]); }} className={`flex-1 min-w-[130px] h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === 'completed' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>مكتملة الدفع</button>
      </div>

      {subTab === 'pending' && selectedIds.length > 0 && (
        <div className="flex gap-2 animate-slide-up mb-4">
           <button onClick={() => setModal({ type: 'BULK_DEP' })} className={BTN_PRIMARY + " flex-1 text-[11px]"}>دفع عربون ({selectedIds.length})</button>
           <button onClick={handleBulkClearance} className={BTN_GHOST + " flex-1 !text-emerald-400 !bg-emerald-500/10 text-[11px]"}>تصفية ({formatCurrency(selectedTotalRemaining)})</button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((o: any) => (
          <div 
            key={o.id} onClick={() => subTab === 'pending' && toggleSelect(o.id)}
            className={CARD_CLASS + ` !p-5 !mb-2 cursor-pointer transition-all ${selectedIds.includes(o.id) ? 'ring-2 ring-brand-500 bg-brand-500/5' : ''}`}
          >
             <div className="flex justify-between items-center">
                <div><p className="font-black text-white">{o.factoryCode}</p><p className="text-[10px] text-slate-500">{o.brideName}</p></div>
                <div className="text-left">
                   <p className="text-[9px] font-black text-slate-500 uppercase">المتبقي للمصنع</p>
                   <p className={`text-sm font-black ${subTab === 'pending' ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(o.factoryPrice - o.factoryDepositPaid)}</p>
                </div>
             </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-10 text-slate-500 font-bold italic">لا يوجد فساتين بهذا الكود</p>}
      </div>

      {modal?.type === 'BULK_DEP' && (
        <Modal title="دفع عربون للمصنع" onClose={() => setModal(null)}>
          <div className="space-y-6">
             <div className="max-h-80 overflow-y-auto px-2 space-y-4 custom-scrollbar">
                {selectedIds.map(id => {
                  const o = sales.find((x:any) => x.id === id);
                  return (
                    <div key={id} className="p-4 bg-white/5 rounded-3xl border border-white/5">
                       <div className="flex justify-between mb-2 font-black text-xs text-brand-400"><span>{o.factoryCode}</span><span>المتبقي: {formatCurrency(o.factoryPrice - o.factoryDepositPaid)}</span></div>
                       <input 
                         type="number" 
                         placeholder="المبلغ المدفوع الآن" 
                         className={INPUT_CLASS + " !h-12 !bg-slate-950"} 
                         value={depositAmounts[id] || ''}
                         onChange={(e) => setDepositAmounts({...depositAmounts, [id]: Number(e.target.value)})}
                       />
                    </div>
                  );
                })}
             </div>
             <div className="p-4 bg-slate-950/80 rounded-3xl border border-brand-500/20 text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-1">إجمالي المبالغ المدخلة</p>
                <h4 className="text-2xl font-black text-brand-400">{formatCurrency(depositTotalSum)}</h4>
             </div>
             <button onClick={handleBulkDeposit} className={BTN_PRIMARY + " w-full h-16 text-lg mt-4 shadow-xl"}>تثبيت دفع المبالغ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- View: Delivery & Return ---

function DeliveryReturnView({ bookings, sales, dresses, query, user, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'delivery' | 'return' | 'archive'>('delivery');
  const [modal, setModal] = useState<any>(null);

  const deliveryList = useMemo(() => {
    const list = [
      ...bookings.filter((b: any) => b.status === BookingStatus.PENDING).map((b:any) => ({ ...b, type: 'RENT' })),
      ...sales.filter((s: any) => s.status !== SaleStatus.DELIVERED).map((s:any) => ({ ...s, type: 'SALE' }))
    ];
    return list.filter((i: any) => (i.customerName || i.brideName).includes(query)).sort((a:any, b:any) => (a.deliveryDate || a.expectedDeliveryDate).localeCompare(b.deliveryDate || b.expectedDeliveryDate));
  }, [bookings, sales, query]);

  const returnList = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE && b.customerName.includes(query));

  const archiveList = useMemo(() => {
    const list = [
      ...bookings.filter((b: any) => b.status === BookingStatus.COMPLETED).map((b:any) => ({ ...b, type: 'RENT' })),
      ...sales.filter((s: any) => s.status === SaleStatus.DELIVERED).map((s:any) => ({ ...s, type: 'SALE' }))
    ];
    return list.filter((i: any) => (i.customerName || i.brideName).includes(query)).sort((a:any, b:any) => (b.actualPickupDate || b.actualDeliveryDate || '').localeCompare(a.actualPickupDate || a.actualDeliveryDate || ''));
  }, [bookings, sales, query]);

  const handlePickup = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const balance = Number(fd.get('bal'));

    if (item.type === 'RENT') {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { 
        status: BookingStatus.ACTIVE, remainingToPay: item.remainingToPay - balance,
        securityDeposit: { type: fd.get('st') as DepositType, detail: fd.get('sd') as string, value: Number(fd.get('sv') || 0) },
        staffName: user.name, actualPickupDate: today
      });
    } else {
      await cloudDb.update(COLLS.SALES, item.id, { status: SaleStatus.DELIVERED, remainingFromBride: item.remainingFromBride - balance, actualDeliveryDate: today });
    }

    if (balance > 0) await cloudDb.add(COLLS.FINANCE, { amount: balance, type: 'INCOME', category: 'تحصيل تسليم', notes: `تحصيل من ${item.customerName || item.brideName}`, date: today });
    addLog('تسليم فستان', `تسليم ${item.dressName || item.factoryCode} لـ ${item.customerName || item.brideName}`);
    showToast('تمت عملية التسليم بنجاح'); setModal(null);
  };

  const handleReturn = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const b = modal.item;
    const balance = Number(fd.get('bal'));
    const damage = Number(fd.get('dmg') || 0);

    await cloudDb.update(COLLS.BOOKINGS, b.id, { status: BookingStatus.COMPLETED, remainingToPay: b.remainingToPay - balance, damageFee: damage, actualReturnDate: today });
    
    // Auto change dress status to needs cleaning
    const dr = dresses.find((d: any) => d.id === b.dressId);
    await cloudDb.update(COLLS.DRESSES, b.dressId, { status: DressStatus.CLEANING, rentalCount: (dr?.rentalCount || 0) + 1 });

    if (balance > 0) await cloudDb.add(COLLS.FINANCE, { amount: balance, type: 'INCOME', category: 'تحصيل إرجاع', notes: `تحصيل نهائي من ${b.customerName}`, date: today });
    if (damage > 0) await cloudDb.add(COLLS.FINANCE, { amount: damage, type: 'INCOME', category: 'تلفيات', notes: `قيمة تلف من العروس ${b.customerName}`, date: today });

    addLog('إرجاع فستان', `إرجاع فستان ${b.dressName} من العروس ${b.customerName} (تلف: ${damage})`);
    showToast('تم استلام الفستان وتحويله للتنظيف'); setModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex p-1.5 bg-slate-900/60 rounded-[2rem] border border-white/5 mb-4 shrink-0 overflow-x-auto">
        {['delivery', 'return', 'archive'].map(s => (
          <button 
            key={s} onClick={() => setSubTab(s as any)}
            className={`flex-1 min-w-[100px] h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === s ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            {s === 'delivery' ? 'التسليم' : s === 'return' ? 'الإرجاع' : 'الأرشيف'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(subTab === 'delivery' ? deliveryList : subTab === 'return' ? returnList : archiveList).map((item: any) => (
          <div key={item.id} className={CARD_CLASS + ` border-r-4 ${item.type === 'RENT' || !item.type ? 'border-brand-500' : 'border-emerald-500'}`}>
             <div className="flex justify-between items-start mb-6">
                <div><h4 className="text-xl font-black text-white mb-1">{item.customerName || item.brideName}</h4><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{item.dressName || item.factoryCode}</p></div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${item.status === BookingStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>{item.status}</span>
             </div>
             
             {subTab === 'archive' ? (
                <div className="text-xs text-slate-500 font-bold space-y-1">
                   <p>الموظف: {item.staffName || '-'}</p>
                   <p>تاريخ الاستلام: {item.actualPickupDate || item.actualDeliveryDate || '-'}</p>
                   {item.type === 'RENT' && <p>تاريخ الإرجاع: {item.actualReturnDate || '-'}</p>}
                </div>
             ) : (
                <div className="flex gap-2">
                   {subTab === 'delivery' ? (
                     <button onClick={() => setModal({ type: 'PICKUP', item })} className={BTN_PRIMARY + " w-full"}>تسليم للعروس</button>
                   ) : (
                     <div className="flex gap-2 w-full">
                       <button onClick={() => { if(confirm('تراجع عن التسليم؟')) cloudDb.update(COLLS.BOOKINGS, item.id, { status: BookingStatus.PENDING }); }} className="flex-1 bg-slate-800 text-white h-14 rounded-2xl font-black text-[10px] uppercase">تراجع</button>
                       <button onClick={() => setModal({ type: 'RETURN', item })} className="flex-[2] bg-emerald-600 text-white h-14 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-900/20">استرجاع من العروس</button>
                     </div>
                   )}
                </div>
             )}
          </div>
        ))}
      </div>

      {modal?.type === 'PICKUP' && (
        <Modal title={`تسليم للعروس: ${modal.item.customerName || modal.item.brideName}`} onClose={() => setModal(null)}>
           <form onSubmit={handlePickup} className="space-y-6">
              <div className="p-6 bg-slate-950/50 rounded-[2.5rem] border border-white/5 text-center">
                 <p className="text-[10px] text-slate-500 font-black uppercase mb-2 italic">المتبقي على العروس</p>
                 <h3 className="text-3xl font-black text-white">{formatCurrency(modal.item.remainingToPay || modal.item.remainingFromBride)}</h3>
              </div>
              <input name="bal" type="number" placeholder="المبلغ المحصل الآن" className={INPUT_CLASS} required />
              {modal.item.type === 'RENT' && (
                <div className="pt-6 border-t border-white/5 space-y-4">
                   <p className="text-[10px] font-black text-slate-500 uppercase px-2 italic tracking-widest">تفاصيل الأمنية (الضمان)</p>
                   <select name="st" className={INPUT_CLASS} required>
                      <option value={DepositType.CASH}>مبلغ مالي (كاش)</option>
                      <option value={DepositType.DOCUMENT}>مستند (بطاقة/جواز)</option>
                      <option value={DepositType.GOLD}>قطعة ذهب</option>
                      <option value={DepositType.OTHER}>أخرى</option>
                   </select>
                   <input name="sd" placeholder="وصف الأمنية (رقم المستند / نوع القطعة)" className={INPUT_CLASS} required />
                   <input name="sv" type="number" placeholder="القيمة التقديرية (اختياري)" className={INPUT_CLASS} />
                </div>
              )}
              <button className={BTN_PRIMARY + " w-full h-16 text-lg mt-4 shadow-2xl"}>تأكيد عملية التسليم</button>
           </form>
        </Modal>
      )}

      {modal?.type === 'RETURN' && (
        <Modal title={`استرجاع من: ${modal.item.customerName}`} onClose={() => setModal(null)}>
           <form onSubmit={handleReturn} className="space-y-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                 <div className="p-4 bg-slate-950 rounded-3xl border border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 font-black mb-1 italic">المتبقي</p>
                    <p className="text-sm font-black text-red-400">{formatCurrency(modal.item.remainingToPay)}</p>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-3xl border border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 font-black mb-1 italic">الأمنية المستلمة</p>
                    <p className="text-xs font-black text-brand-400">{modal.item.securityDeposit?.detail || 'لا يوجد'}</p>
                 </div>
              </div>
              <input name="bal" type="number" placeholder="تحصيل المبلغ المتبقي (أو 0)" className={INPUT_CLASS} />
              <div className="p-5 bg-slate-900/50 rounded-3xl border border-red-500/20">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" onChange={e => setModal({...modal, hasD: e.target.checked})} className="w-6 h-6 accent-red-500 rounded-lg" />
                    <span className="text-sm font-black text-red-400 uppercase">يوجد تلف في الفستان</span>
                 </label>
                 {modal.hasD && <input name="dmg" type="number" placeholder="قيمة التلف المطلوب خصمها" className={INPUT_CLASS + " mt-4 !bg-slate-950 shadow-inner"} required />}
              </div>
              <button className={BTN_PRIMARY + " w-full h-16 text-lg !bg-emerald-600 shadow-xl"}>تأكيد الاسترجاع والتحويل للغسيل</button>
           </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Finance Management ---

function FinanceView({ finance, dresses, users, bookings, query, hasPerm, showToast }: any) {
  const [subTab, setSubTab] = useState<'logs' | 'analytics'>('logs');
  const [modal, setModal] = useState<any>(null);

  const filtered = finance.filter((f: any) => f.category.includes(query) || f.notes.includes(query)).sort((a:any, b:any) => b.date.localeCompare(a.date));

  const totals = useMemo(() => {
    const inc = finance.filter((f: any) => f.type === 'INCOME').reduce((s: any, f: any) => s + f.amount, 0);
    const exp = finance.filter((f: any) => f.type === 'EXPENSE').reduce((s: any, f: any) => s + f.amount, 0);
    return { inc, exp, profit: inc - exp };
  }, [finance]);

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get('t') as 'INCOME' | 'EXPENSE';
    const amount = Math.abs(Number(fd.get('a')));
    const data: any = { 
      date: fd.get('d') || today, 
      type, 
      amount, 
      category: fd.get('c') as string, 
      notes: fd.get('n') 
    };

    if (data.category === 'رواتب') data.targetUser = fd.get('tu');
    if (['تنظيف', 'ترزي'].includes(data.category)) {
      data.relatedDresses = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => c.value);
    }

    await cloudDb.add(COLLS.FINANCE, data);
    showToast('تم تسجيل العملية المالية بنجاح'); 
    setModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex p-1.5 bg-slate-900/60 rounded-[2rem] border border-white/5 mb-4 shrink-0">
        <button onClick={() => setSubTab('logs')} className={`flex-1 h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === 'logs' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>سجل الحركة</button>
        <button onClick={() => setSubTab('analytics')} className={`flex-1 h-12 rounded-[1.5rem] font-black text-[11px] transition-all ${subTab === 'analytics' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>تحليلات مالية</button>
      </div>

      {hasPerm('add_finance') && (
        <button onClick={() => setModal({ type: 'ADD', entryType: 'INCOME' })} className={BTN_PRIMARY + " w-full !rounded-[2.5rem]"}><Plus size={22}/> إضافة وارد / منصرف</button>
      )}

      {subTab === 'logs' ? (
        <div className="space-y-4 animate-fade-in">
           <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center"><p className="text-[9px] font-black text-emerald-500 mb-1">الوارد</p><p className="text-xs font-black text-emerald-200">{formatCurrency(totals.inc)}</p></div>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-3xl text-center"><p className="text-[9px] font-black text-red-500 mb-1">المنصرف</p><p className="text-xs font-black text-red-200">{formatCurrency(totals.exp)}</p></div>
              <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-3xl text-center"><p className="text-[9px] font-black text-brand-500 mb-1">الصافي</p><p className="text-xs font-black text-brand-200">{formatCurrency(totals.profit)}</p></div>
           </div>
           {filtered.map((f: any) => (
             <div key={f.id} className={CARD_CLASS + " !p-4 !mb-2 flex items-center justify-between shadow-sm"}>
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${f.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {f.type === 'INCOME' ? <TrendingUp size={18}/> : <ArrowDownCircle size={18}/>}
                   </div>
                   <div><h4 className="font-black text-xs text-white">{f.category}</h4><p className="text-[10px] text-slate-500 font-bold">{f.date}</p></div>
                </div>
                <div className={`text-sm font-black ${f.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>{f.type === 'INCOME' ? '+' : '-'}{formatCurrency(f.amount)}</div>
             </div>
           ))}
        </div>
      ) : (
        <div className="space-y-6">
           <div className={CARD_CLASS + " h-[300px] flex flex-col"}>
              <h4 className="text-xs font-black mb-6 uppercase text-slate-500 text-center tracking-widest italic">تحليل توزيع الميزانية</h4>
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={[{ name: 'وارد', v: totals.inc }, { name: 'منصرف', v: totals.exp }]} innerRadius={60} outerRadius={80} dataKey="v" paddingAngle={5}>
                       <Cell fill="#10b981" /><Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem', fontWeight: 'bold'}} />
                 </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      {modal?.type === 'ADD' && (
        <Modal title="إضافة عملية مالية" onClose={() => setModal(null)}>
           <form onSubmit={handleAdd} className="space-y-4">
              <select name="t" className={INPUT_CLASS} onChange={e => setModal({...modal, entryType: e.target.value})}>
                 <option value="INCOME">وارد (+)</option>
                 <option value="EXPENSE">منصرف (-)</option>
              </select>
              {modal.entryType === 'EXPENSE' ? (
                <>
                  <select name="c" className={INPUT_CLASS} required onChange={e => setModal({...modal, sc: e.target.value})}>
                    <option value="">اختر التصنيف...</option>
                    <option value="فواتير">فواتير</option>
                    <option value="رواتب">رواتب</option>
                    <option value="تنظيف">تنظيف</option>
                    <option value="ترزي">ترزي</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  {modal.sc === 'فواتير' && <select name="sub" className={INPUT_CLASS} required><option value="ايجار">ايجار</option><option value="كهرباء">كهرباء</option><option value="ماء">ماء</option><option value="صيانة">صيانة</option><option value="اخرى">اخرى</option></select>}
                  {modal.sc === 'رواتب' && <select name="tu" className={INPUT_CLASS} required><option value="">اختر الموظف...</option>{users.map((u:any) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>}
                  {(modal.sc === 'تنظيف' || modal.sc === 'ترزي') && (
                    <div className="p-5 bg-slate-950/50 rounded-3xl border border-white/5 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                       <p className="text-[10px] font-black text-slate-500 uppercase px-2 mb-2 italic">اختر الفساتين المعنية:</p>
                       {dresses.filter((d:any) => d.type === DressType.RENT).map((d:any) => {
                         const isC = d.status === DressStatus.CLEANING;
                         const isT = bookings.some((b:any) => b.dressId === d.id && b.status === BookingStatus.PENDING);
                         return (
                           <label key={d.id} className={`flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer rounded-2xl border transition-all ${ (isC && modal.sc === 'تنظيف') || (isT && modal.sc === 'ترزي') ? 'border-brand-500/30 bg-brand-500/5' : 'border-transparent' }`}>
                              <input type="checkbox" value={d.name} className="w-6 h-6 accent-brand-500 rounded-lg" />
                              <div className="flex-1"><p className="text-xs font-bold text-white">{d.name}</p>
                              {modal.sc === 'تنظيف' && isC && <span className="text-[9px] font-black text-orange-500 uppercase tracking-tighter">● يحتاج تنظيف</span>}
                              {modal.sc === 'ترزي' && isT && <span className="text-[9px] font-black text-purple-500 uppercase tracking-tighter">● عليه بروفة</span>}
                              </div>
                           </label>
                         );
                       })}
                    </div>
                  )}
                </>
              ) : (
                <input name="c" placeholder="نوع الوارد (مثلاً: بيع فستان، دفعة عميل...)" className={INPUT_CLASS} required />
              )}
              <div className="grid grid-cols-2 gap-3">
                 <input name="a" type="number" placeholder="المبلغ" className={INPUT_CLASS} required />
                 <input name="d" type="date" defaultValue={today} className={INPUT_CLASS} required />
              </div>
              <textarea name="n" placeholder="ملاحظات تفصيلية..." className={INPUT_CLASS + " h-24"} />
              <button className={BTN_PRIMARY + " w-full h-16 text-lg mt-4 shadow-xl"}>تثبيت العملية المالية</button>
           </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Customer Registry ---

function CustomerRegistry({ bookings, sales, query }: any) {
  const clients = useMemo(() => {
    const map = new Map();
    bookings.forEach((b: any) => map.set(b.customerPhone, { name: b.customerName, phone: b.customerPhone, type: 'إيجار' }));
    sales.forEach((s: any) => map.set(s.bridePhone, { name: s.brideName, phone: s.bridePhone, type: 'بيع' }));
    return Array.from(map.values()).filter(c => c.name.includes(query) || c.phone.includes(query));
  }, [bookings, sales, query]);

  return (
    <div className="space-y-2 animate-fade-in">
       {clients.map((c, i) => (
         <div key={i} className={CARD_CLASS + " !mb-2 flex items-center justify-between !p-5"}>
            <div><h4 className="font-black text-white">{c.name}</h4><p className="text-[11px] font-bold text-slate-500 tracking-widest">{c.phone}</p></div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full font-black uppercase tracking-wider">{c.type}</span>
         </div>
       ))}
       {clients.length === 0 && <p className="text-center py-10 text-slate-500 font-bold italic">لا يوجد عملاء بهذا الاسم</p>}
    </div>
  );
}

// --- View: Audit Logs ---

function AuditLogs({ logs, query }: any) {
  return (
    <div className="space-y-2 animate-fade-in">
      {logs.filter((l: any) => l.username.includes(query) || l.action.includes(query) || l.details.includes(query)).reverse().slice(0, 50).map((l: any) => (
        <div key={l.id} className={CARD_CLASS + " !mb-2 !p-4"}>
           <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-black text-brand-400">{l.action}</span>
              <span className="text-[9px] text-slate-500 font-bold">{new Date(l.timestamp).toLocaleString('ar-EG')}</span>
           </div>
           <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{l.details}</p>
           <p className="text-[9px] text-slate-600 font-bold mt-2 italic">بواسطة: {l.username}</p>
        </div>
      ))}
    </div>
  );
}

// --- View: Settings & Admin ---

function SettingsView({ user, users, hasPerm, showToast, addLog }: any) {
  const [modal, setModal] = useState<any>(null);

  const handleReset = async () => {
    if (confirm('تنبيه خطير: سيتم حذف كافة البيانات السحابية (فساتين، حجوزات، مالية) وإرجاع النظام لنقطة الصفر. هل أنت متأكد؟')) {
       await cloudDb.clearAll();
       alert('تم تصفير النظام بالكامل. سيتم إعادة التحميل.');
       window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className={CARD_CLASS + " text-center py-12"}>
          <div className="w-28 h-28 bg-brand-600 rounded-[3rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-900/40 animate-pulse-soft"><Users size={48} className="text-white"/></div>
          <h2 className="text-2xl font-black">{user.name}</h2>
          <p className="text-slate-500 font-bold mb-10 tracking-tight">@{user.username} • {user.role}</p>
          <div className="grid grid-cols-1 gap-3 px-4">
             <button onClick={() => setModal({ type: 'CHANGE_PASS' })} className={BTN_GHOST + " w-full !rounded-3xl"}><Key size={20}/> تغيير كلمة المرور</button>
          </div>
       </div>

       {hasPerm('admin_reset') && (
         <div className="space-y-6 mt-10">
            <h3 className="text-xl font-black px-6 flex items-center gap-2"><Database size={24} className="text-brand-500"/> إدارة الموظفين والصلاحيات</h3>
            {users.map((u: any) => (
              <div key={u.id} className={CARD_CLASS + " !p-5"}>
                 <div className="flex justify-between items-center mb-4">
                    <div><p className="font-black text-white">{u.name}</p><p className="text-[10px] text-slate-500 font-bold">@{u.username}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => { if(confirm('تصفير كلمة السر لـ 123؟')) { cloudDb.update(COLLS.USERS, u.id, { password: '123', firstLogin: true }); showToast('تم التصفير لـ 123'); } }} className="p-3 text-brand-400 hover:bg-brand-500/10 rounded-2xl transition-all"><Edit size={18}/></button>
                      {u.id !== user.id && <button onClick={() => { if(confirm('حذف الموظف نهائياً؟')) cloudDb.delete(COLLS.USERS, u.id); }} className="p-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={18}/></button>}
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {u.permissions.map((p: string) => <span key={p} className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black uppercase">{p}</span>)}
                 </div>
              </div>
            ))}
            <button onClick={() => setModal({ type: 'ADD_USER' })} className={BTN_PRIMARY + " w-full !rounded-[2.5rem] mt-4"}><UserPlus size={22}/> إضافة موظف جديد</button>

            <div className="p-8 bg-red-950/20 border border-red-900/30 rounded-[3.5rem] text-center mt-12">
               <AlertTriangle size={36} className="mx-auto text-red-500 mb-4 animate-bounce" />
               <h4 className="text-red-500 font-black mb-2 text-lg">منطقة الخطر (للمدير فقط)</h4>
               <p className="text-xs text-slate-400 font-bold mb-8 leading-relaxed">تصفير النظام سيقوم بمسح كافة السجلات السحابية وإعادة كلمة مرور المدير إلى "123".</p>
               <button onClick={handleReset} className="w-full h-14 border-2 border-red-500/30 text-red-500 rounded-3xl font-black hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-lg">تصفير النظام بالكامل</button>
            </div>
         </div>
       )}

       {modal?.type === 'CHANGE_PASS' && (
         <Modal title="تغيير كلمة المرور" onClose={() => setModal(null)}>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const pass = new FormData(e.currentTarget).get('p') as string;
              await cloudDb.update(COLLS.USERS, user.id, { password: pass });
              showToast('تم تحديث كلمة المرور'); setModal(null);
            }} className="space-y-4">
               <input name="p" type="password" placeholder="أدخل كلمة المرور الجديدة" className={INPUT_CLASS} required />
               <button className={BTN_PRIMARY + " w-full h-16 mt-4 shadow-xl"}>تحديث كلمة المرور</button>
            </form>
         </Modal>
       )}

       {modal?.type === 'ADD_USER' && (
         <Modal title="إضافة موظف جديد" onClose={() => setModal(null)} size="lg">
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const perms = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => c.value);
              await cloudDb.add(COLLS.USERS, { 
                name: fd.get('n'), username: fd.get('u'), password: '123', 
                role: UserRole.EMPLOYEE, permissions: perms, firstLogin: true 
              });
              addLog('إضافة موظف', `إضافة الموظف ${fd.get('n')}`);
              showToast('تمت إضافة الموظف بنجاح (كلمة السر: 123)'); setModal(null);
            }} className="space-y-6">
               <div className="space-y-3"><input name="n" placeholder="اسم الموظف الثلاثي" className={INPUT_CLASS} required /><input name="u" placeholder="اسم المستخدم" className={INPUT_CLASS} required /></div>
               <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest italic">تخصيص صلاحيات الوصول:</p>
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto custom-scrollbar p-3 bg-slate-950/50 rounded-[2.5rem] border border-white/5 shadow-inner">
                    {PERMISSIONS_LIST.map(p => (
                      <label key={p.id} className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer rounded-2xl transition-all border border-transparent hover:border-brand-500/20">
                        <input type="checkbox" value={p.id} className="w-6 h-6 accent-brand-500 rounded-lg shadow-sm" />
                        <span className="text-xs font-black text-slate-300 uppercase tracking-tight">{p.label}</span>
                      </label>
                    ))}
                  </div>
               </div>
               <button className={BTN_PRIMARY + " w-full h-16 text-lg mt-2 shadow-2xl"}>تثبيت الموظف في النظام</button>
            </form>
         </Modal>
       )}
    </div>
  );
}
