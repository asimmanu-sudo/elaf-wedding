
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, 
  Settings, LogOut, Plus, Search, Edit, Trash2, Check, X, AlertTriangle, Ruler, 
  Droplets, CheckCircle, Eye, Video, TrendingUp, ArrowDownCircle, PieChart, 
  BarChart3, Clock, ChevronLeft, ChevronRight, Camera, Save, Key, UserPlus
} from 'lucide-react';
import { cloudDb, COLLS } from './services/firebase';
import { 
  UserRole, DressType, DressStatus, BookingStatus, SaleStatus, 
  FactoryPaymentStatus, DepositType, DressCondition 
} from './types';
import type { 
  User, Dress, SaleOrder, Booking, FinanceRecord, AuditLog, Measurements 
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Global UI Helpers ---
const today = new Date().toISOString().split('T')[0];
const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

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

// --- Adaptive Components ---

const Modal = ({ title, children, onClose, size = 'md' }: any) => (
  <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
    <div className={`bg-slate-900 border-t md:border border-white/10 rounded-t-[3rem] md:rounded-[3.5rem] w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} p-8 shadow-2xl relative animate-slide-up flex flex-col max-h-[95vh]`}>
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">{children}</div>
    </div>
  </div>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-2xl mb-4 transition-all active:scale-[0.98] ${className}`}>
    {children}
  </div>
);

const Input = ({ label, icon: Icon, ...props }: any) => (
  <div className="w-full space-y-1">
    {label && <label className="text-[11px] font-black text-slate-500 uppercase px-4 tracking-wider">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={18} />}
      <input 
        className={`w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-600 font-medium ${Icon ? 'pr-12' : ''}`}
        {...props} 
      />
    </div>
  </div>
);

const Button = ({ children, variant = "primary", className = "", ...props }: any) => {
  const base = "h-14 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg px-6 text-sm";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-900/20",
    ghost: "bg-white/5 hover:bg-white/10 text-white",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white",
    success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

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

  // --- Force Password Change for First Login ---
  if (user?.firstLogin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 animate-fade-in">
        <Card className="w-full max-w-sm">
          <h2 className="text-2xl font-black mb-4">تغيير كلمة المرور</h2>
          <p className="text-slate-400 text-sm mb-6 font-bold">هذا أول دخول لك للنظام، يرجى تعيين كلمة مرور جديدة للاستمرار.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const pass = new FormData(e.currentTarget).get('p') as string;
            await cloudDb.update(COLLS.USERS, user.id, { password: pass, firstLogin: false });
            setUser({ ...user, password: pass, firstLogin: false });
            showToast('تم تحديث كلمة المرور بنجاح');
          }} className="space-y-4">
            <Input name="p" type="password" placeholder="كلمة المرور الجديدة" required />
            <Button className="w-full h-16 shadow-xl">تفعيل الحساب والدخول</Button>
          </form>
        </Card>
      </div>
    );
  }

  // --- Login Screen ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 animate-fade-in overflow-hidden">
        <div className="w-full max-w-sm text-center mb-12 animate-slide-up">
          <img src="/Logo.png" alt="Elaf Logo" className="w-48 h-48 mx-auto object-contain drop-shadow-2xl mb-8" />
          <h1 className="text-4xl font-black text-white mb-2">إيلاف لفساتين الزفاف</h1>
          <p className="text-slate-500 font-bold tracking-tight italic">Cloud Management System</p>
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
          }} className="space-y-6">
            <Input name="u" placeholder="اسم المستخدم" required />
            <Input name="p" type="password" placeholder="كلمة المرور" required />
            <Button className="w-full h-16 text-lg mt-6 shadow-brand-500/20">دخول النظام</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden ${isIOS ? 'ios-style' : 'android-style'}`} dir="rtl">
      {/* Header with Search & Logout */}
      <header className="pt-safe shrink-0 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 z-[100]">
        <div className="px-6 h-20 flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={20}/>
            <input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={`بحث في ${NAV_ITEMS.find(i => i.id === activeTab)?.label}...`}
              className="w-full bg-slate-950/50 border-none ring-1 ring-white/5 rounded-full h-12 pr-12 pl-4 text-sm font-bold focus:ring-brand-500 outline-none transition-all"
            />
          </div>
          <button onClick={() => { if(confirm('هل تريد تسجيل الخروج؟')) setUser(null); }} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 transition-all">
            <LogOut size={22}/>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32">
        {activeTab === 'home' && <HomeView dresses={dresses} bookings={bookings} sales={sales} />}
        {activeTab === 'rent_dresses' && <RentDressesView dresses={dresses} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'rent_bookings' && <RentBookingsView dresses={dresses} bookings={bookings} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'sale_orders' && <SaleOrdersView sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'factory' && <FactoryView sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        {activeTab === 'delivery' && <DeliveryView bookings={bookings} sales={sales} dresses={dresses} query={searchQuery} user={user} showToast={showToast} addLog={addLog} />}
        {activeTab === 'customers' && <CustomersView bookings={bookings} sales={sales} query={searchQuery} />}
        {activeTab === 'finance' && <FinanceView finance={finance} dresses={dresses} users={users} bookings={bookings} query={searchQuery} hasPerm={hasPerm} showToast={showToast} />}
        {activeTab === 'logs' && <LogsView logs={logs} query={searchQuery} />}
        {activeTab === 'settings' && <SettingsView user={user} users={users} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
      </main>

      {/* Bottom Adaptive Navigation */}
      <nav className="shrink-0 pb-safe bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 fixed bottom-0 left-0 right-0 z-[200]">
        <div className="h-20 flex items-center overflow-x-auto custom-scrollbar px-2 space-x-2 space-x-reverse">
          {NAV_ITEMS.map((item: any) => (
            <button 
              key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
              className={`flex flex-col items-center justify-center min-w-[80px] transition-all ${activeTab === item.id ? 'text-brand-500 scale-105' : 'text-slate-500'}`}
            >
              <div className={`w-12 h-9 flex items-center justify-center rounded-full transition-all ${activeTab === item.id ? 'bg-brand-500/10' : ''}`}>
                <IconByName name={item.icon} size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-black mt-1 whitespace-nowrap ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Notification System */}
      <div className="fixed bottom-24 left-4 right-4 z-[2000] space-y-2 pointer-events-none">
        {toasts.map((t: any) => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border pointer-events-auto animate-slide-up mx-auto max-w-sm ${
            t.type === 'error' ? 'bg-red-950 border-red-500/50 text-red-200' : t.type === 'warning' ? 'bg-orange-950 border-orange-500/50 text-orange-200' : 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
          }`}>
            {t.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-bold text-sm">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Helper: Icon Loader ---
function IconByName({ name, ...props }: any) {
  const icons: any = { Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings };
  const Comp = icons[name] || Home;
  return <Comp {...props} />;
}

// --- View: Home Dashboard ---
function HomeView({ dresses, bookings, sales }: any) {
  const [activeList, setActiveList] = useState<any>(null);
  const weekLater = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const stats = useMemo(() => {
    const rentalsWeek = bookings.filter((b: any) => b.status === BookingStatus.PENDING && b.deliveryDate >= today && b.deliveryDate <= weekLater);
    const cleaning = dresses.filter((d: any) => d.status === DressStatus.CLEANING);
    const lateSales = sales.filter((s: any) => s.status !== SaleStatus.DELIVERED && s.expectedDeliveryDate < today);
    const returnsToday = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE && b.eventDate === today);
    const fittingsWeek = bookings.filter((b: any) => b.status === BookingStatus.PENDING && ((b.fitting1Date >= today && b.fitting1Date <= weekLater) || (b.fitting2Date >= today && b.fitting2Date <= weekLater)));
    
    return [
      { label: 'تسليمات الإيجار', count: rentalsWeek.length, data: rentalsWeek, title: 'تسليمات الإسبوع القادم', color: 'bg-blue-500/10 text-blue-400' },
      { label: 'محتاجة غسيل', count: cleaning.length, data: cleaning, title: 'فساتين تحتاج غسيل', color: 'bg-orange-500/10 text-orange-400' },
      { label: 'تفصيل متأخر', count: lateSales.length, data: lateSales, title: 'طلبات تفصيل متأخرة', color: 'bg-red-500/10 text-red-400' },
      { label: 'مرتجعات اليوم', count: returnsToday.length, data: returnsToday, title: 'مرتجعات متوقعة اليوم', color: 'bg-emerald-500/10 text-emerald-400' },
      { label: 'بروفات الإسبوع', count: fittingsWeek.length, data: fittingsWeek, title: 'بروفات الإسبوع القادم', color: 'bg-purple-500/10 text-purple-400' },
    ];
  }, [bookings, dresses, sales, weekLater]);

  return (
    <div className="grid grid-cols-2 gap-4 animate-fade-in">
      {stats.map(s => (
        <button key={s.label} onClick={() => setActiveList(s)} className={`p-8 rounded-[3.5rem] border border-white/5 shadow-xl text-center transition-all active:scale-95 ${s.color}`}>
          <span className="text-4xl font-black block mb-1">{s.count}</span>
          <span className="text-[10px] font-black uppercase opacity-60 tracking-tighter leading-none">{s.label}</span>
        </button>
      ))}
      {activeList && (
        <Modal title={activeList.title} onClose={() => setActiveList(null)} size="lg">
          <div className="space-y-3">
            {activeList.data.map((item: any) => (
              <Card key={item.id} className="!mb-2 !bg-white/5 !p-4">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-sm">{item.customerName || item.brideName || item.name}</p>
                  <p className="text-[10px] text-brand-400 font-bold">{item.deliveryDate || item.eventDate || item.expectedDeliveryDate}</p>
                </div>
                {item.dressName && <p className="text-[10px] text-slate-500 mt-1 italic leading-none">{item.dressName}</p>}
              </Card>
            ))}
            {activeList.data.length === 0 && <p className="text-center py-10 opacity-40">لا توجد بيانات حالية للعرض</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- View: Rent Dresses ---
function RentDressesView({ dresses, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'available' | 'archived' | 'ratings'>('available');
  const [modal, setModal] = useState<any>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = useMemo(() => Array.from(new Set(dresses.map((d: any) => d.style))), [dresses]);
  
  const filtered = useMemo(() => {
    return dresses.filter((d: any) => d.type === DressType.RENT && (d.name.toLowerCase().includes(query.toLowerCase()) || d.style.toLowerCase().includes(query.toLowerCase()))).filter((d: any) => {
      if (subTab === 'available') return d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD;
      if (subTab === 'archived') return d.status === DressStatus.ARCHIVED || d.status === DressStatus.SOLD;
      return true;
    }).filter((d: any) => {
      if (filters.length === 0) return true;
      const matchStyle = filters.some(f => f === d.style);
      const matchCleaning = filters.includes('CLEANING') && d.status === DressStatus.CLEANING;
      const matchAvailable = filters.includes('AVAILABLE') && d.status === DressStatus.AVAILABLE;
      return matchStyle || matchCleaning || matchAvailable;
    });
  }, [dresses, subTab, query, filters]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setModal((p: any) => ({ ...p, imageUrl: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-full border border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        {['available', 'archived', 'ratings'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-12 rounded-full text-[11px] font-black transition-all ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>
            {t === 'available' ? 'المتاحة' : t === 'archived' ? 'الأرشيف' : 'التقييمات'}
          </button>
        ))}
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2 px-1">
        <button onClick={() => setFilters(p => p.includes('CLEANING') ? p.filter(x => x !== 'CLEANING') : [...p, 'CLEANING'])} className={`px-5 py-2.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border ${filters.includes('CLEANING') ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-500'}`}>يحتاج تنظيف</button>
        <button onClick={() => setFilters(p => p.includes('AVAILABLE') ? p.filter(x => x !== 'AVAILABLE') : [...p, 'AVAILABLE'])} className={`px-5 py-2.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border ${filters.includes('AVAILABLE') ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-500'}`}>متاح الآن</button>
        {styles.map((s: any) => (
          <button key={s} onClick={() => setFilters(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} className={`px-5 py-2.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border ${filters.includes(s) ? 'bg-brand-600 border-brand-500 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-500'}`}>{s}</button>
        ))}
      </div>

      {subTab === 'available' && hasPerm('add_rent_dress') && (
        <Button onClick={() => setModal({ type: 'ADD', condition: DressCondition.NEW })} className="w-full !rounded-[2.5rem] h-16 shadow-brand-900/40"><Plus size={22}/> إضافة فستان إيجار جديد</Button>
      )}

      <div className="space-y-4">
        {subTab === 'ratings' ? (
          [...dresses].filter(d => d.type === DressType.RENT).sort((a,b) => b.rentalCount - a.rentalCount).map((d: any) => (
            <Card key={d.id} className="flex justify-between items-center !p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 font-black text-xl">#</div>
                <div><p className="font-black text-white leading-none">{d.name}</p><p className="text-[10px] text-slate-500 font-bold mt-1 uppercase italic leading-none">{d.style}</p></div>
              </div>
              <div className="text-center bg-brand-500/20 text-brand-400 px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-brand-500/10">{d.rentalCount} إيجار</div>
            </Card>
          ))
        ) : (
          filtered.map((d: any) => (
            <Card key={d.id}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                  {d.imageUrl ? (
                    <button onClick={() => setModal({ type: 'VIEW_IMAGE', url: d.imageUrl })} className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-white/10 active:scale-90 transition-transform shadow-xl">
                      <img src={d.imageUrl} className="w-full h-full object-cover" alt={d.name} />
                    </button>
                  ) : (
                    <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-600 border border-white/5 shadow-inner"><Shirt size={32}/></div>
                  )}
                  <div className="leading-tight">
                    <p className="text-xl font-black text-white">{d.name}</p>
                    <p className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-widest leading-none">{d.style} • {d.condition}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg border border-white/5 ${d.status === DressStatus.AVAILABLE ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>{d.status}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => cloudDb.update(COLLS.DRESSES, d.id, { status: d.status === DressStatus.CLEANING ? DressStatus.AVAILABLE : DressStatus.CLEANING })} className="flex-1 !h-12 !text-[10px]">
                  {d.status === DressStatus.CLEANING ? <Check size={18}/> : <Droplets size={18}/>} {d.status === DressStatus.CLEANING ? 'إعادة من الغسيل' : 'تحويل للغسيل'}
                </Button>
                {d.videoUrl && <Button variant="ghost" onClick={() => window.open(d.videoUrl, '_blank')} className="!w-12 !h-12 !p-0 text-brand-400 shadow-xl border border-white/5"><Video size={20}/></Button>}
                <Button variant="ghost" onClick={() => setModal({ ...d, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-brand-400 shadow-xl border border-white/5"><Edit size={20}/></Button>
                {subTab === 'available' ? (
                   <Button variant="danger" onClick={() => setModal({ type: 'DELETE_OPT', item: d })} className="!w-12 !h-12 !p-0 shadow-xl"><Trash2 size={20}/></Button>
                ) : (
                   <Button variant="success" onClick={() => { if(confirm('هل تريد استعادة الفستان كمتاح؟')) { cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.AVAILABLE }); showToast('تمت استعادة الفستان'); } }} className="!w-12 !h-12 !p-0 shadow-xl"><Check size={20}/></Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'إضافة فستان إيجار' : 'تعديل بيانات الفستان'} onClose={() => setModal(null)}>
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = fd.get('n') as string;
            
            if (modal.type === 'ADD' && dresses.some((d: any) => d.name.trim() === name.trim())) {
              showToast('اسم الفستان مكرر! يرجى اختيار اسم مميز.', 'error');
              return;
            }

            const data = {
              name, style: fd.get('s'), factoryPrice: Number(fd.get('p')),
              condition: fd.get('cond'), videoUrl: fd.get('v'), imageUrl: modal.imageUrl || '',
              type: DressType.RENT, status: modal.status || DressStatus.AVAILABLE, rentalCount: modal.rentalCount || 0, createdAt: today
            };
            
            if (modal.type === 'ADD') await cloudDb.add(COLLS.DRESSES, data);
            else await cloudDb.update(COLLS.DRESSES, modal.id, data);
            
            showToast('تم حفظ البيانات بنجاح'); setModal(null);
            addLog(modal.type === 'ADD' ? 'إضافة فستان' : 'تعديل فستان', `فستان: ${name}`);
          }} className="space-y-5">
            <div className="flex justify-center">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-[3.5rem] bg-slate-800 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-brand-500 transition-all shadow-inner">
                {modal.imageUrl ? (
                  <img src={modal.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <><Camera className="text-slate-500" /><span className="text-[10px] font-black text-slate-500">رفع صورة</span></>
                )}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            </div>

            <Input label="اسم الفستان (يجب أن يكون مميزاً)" name="n" defaultValue={modal.name} required />
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 uppercase px-4">استايل الفستان</label>
              <input list="styles_list" name="s" defaultValue={modal.style} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all" required />
              <datalist id="styles_list">{styles.map((s: any) => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <Input label="سعر الشراء" name="p" type="number" defaultValue={modal.factoryPrice} required />
               <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-4">الحالة</label>
                  <select name="cond" defaultValue={modal.condition || DressCondition.NEW} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all">
                    <option value={DressCondition.NEW}>{DressCondition.NEW}</option>
                    <option value={DressCondition.USED}>{DressCondition.USED}</option>
                  </select>
               </div>
            </div>
            <Input label="رابط فيديو تيكتوك" name="v" defaultValue={modal.videoUrl} placeholder="https://tiktok.com/..." />
            <Button className="w-full h-18 mt-4 text-lg shadow-brand-900/40">حفظ بيانات الفستان</Button>
          </form>
        </Modal>
      )}

      {modal?.type === 'VIEW_IMAGE' && (
        <div className="fixed inset-0 z-[2000] bg-black/98 flex flex-col p-6 animate-fade-in">
          <button onClick={() => setModal(null)} className="self-end w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-10 shadow-2xl active:scale-90 transition-transform"><X size={32}/></button>
          <img src={modal.url} className="flex-1 object-contain rounded-3xl shadow-2xl" alt="Preview" />
        </div>
      )}

      {modal?.type === 'DELETE_OPT' && (
        <Modal title="خيارات الفستان" onClose={() => setModal(null)}>
          <div className="grid gap-3">
            <Button variant="danger" onClick={() => { if(confirm('هل أنت متأكد من الحذف النهائي؟')) { cloudDb.delete(COLLS.DRESSES, modal.item.id); setModal(null); showToast('تم الحذف بنجاح'); } }} className="!rounded-[2.5rem] h-20 text-lg shadow-xl">حذف نهائي</Button>
            <Button variant="ghost" onClick={() => { cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.ARCHIVED }); setModal(null); showToast('تم النقل للأرشيف'); }} className="!rounded-[2.5rem] h-20 text-lg shadow-xl">نقل إلى الأرشيف</Button>
            <Button variant="success" onClick={() => setModal({ type: 'SELL_FORM', item: modal.item })} className="!rounded-[2.5rem] h-20 text-lg shadow-xl">بيع الفستان</Button>
          </div>
        </Modal>
      )}

      {modal?.type === 'SELL_FORM' && (
        <Modal title={`إتمام بيع: ${modal.item.name}`} onClose={() => setModal(null)}>
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const val = Number(fd.get('p'));
            await cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.SOLD, salePrice: val, customerName: fd.get('cn'), customerPhone: fd.get('cp') });
            await cloudDb.add(COLLS.FINANCE, { amount: val, type: 'INCOME', category: 'بيع فستان إيجار', notes: `بيع لـ ${fd.get('cn')}`, date: today });
            showToast('تمت عملية البيع وتسجيل الدخل'); setModal(null);
            addLog('بيع فستان', `بيع فستان ${modal.item.name} بمبلغ ${val}`);
          }} className="space-y-4">
            <Input label="اسم العميل" name="cn" required />
            <Input label="رقم الهاتف" name="cp" required />
            <Input label="قيمة البيع" name="p" type="number" required />
            <Button className="w-full h-18 mt-4 shadow-emerald-900/40 text-lg">تأكيد عملية البيع النهائية</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Rent Bookings ---
function RentBookingsView({ dresses, bookings, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past' | 'fittings'>('current');
  const [modal, setModal] = useState<any>(null);

  const filtered = useMemo(() => {
    return bookings.filter((b: any) => (b.customerName.toLowerCase().includes(query.toLowerCase()) || b.dressName.toLowerCase().includes(query.toLowerCase()))).filter((b: any) => {
      if (subTab === 'current') return b.status !== BookingStatus.COMPLETED;
      if (subTab === 'past') return b.status === BookingStatus.COMPLETED;
      if (subTab === 'fittings') return b.status === BookingStatus.PENDING && (!b.fitting1Done || !b.fitting2Done);
      return true;
    }).sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate));
  }, [bookings, subTab, query]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-full border border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        {['current', 'past', 'fittings'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-12 rounded-full text-[11px] font-black transition-all ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>
            {t === 'current' ? 'الحالية' : t === 'past' ? 'السابقة' : 'البروفات'}
          </button>
        ))}
      </div>

      {subTab === 'current' && hasPerm('add_booking') && (
        <Button onClick={() => setModal({ type: 'ADD' })} className="w-full !rounded-[2.5rem] h-16 shadow-brand-900/40"><Plus size={22}/> حجز إيجار جديد</Button>
      )}

      <div className="space-y-4">
        {filtered.map((b: any) => (
          <Card key={b.id}>
            <div className="flex justify-between items-start mb-6 leading-none">
              <div><h4 className="text-xl font-black text-white">{b.customerName}</h4><p className="text-[10px] text-slate-500 font-black tracking-widest mt-1 italic">{b.customerPhone}</p></div>
              <span className={`px-4 py-1.5 bg-white/5 rounded-full text-[9px] font-black uppercase text-brand-400 border border-brand-500/20 shadow-lg shadow-brand-500/5`}>{b.status}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-950/40 p-5 rounded-[2.5rem] border border-white/5 shadow-inner">
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase italic leading-none italic opacity-60">الفستان</p><p className="text-xs font-black text-white">{b.dressName}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase italic leading-none italic opacity-60">المناسبة</p><p className="text-xs font-black text-white">{b.eventDate}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase italic leading-none italic opacity-60">التسليم</p><p className="text-xs font-black text-white">{b.deliveryDate}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase italic leading-none italic opacity-60">المتبقي</p><p className="text-sm font-black text-red-400">{formatCurrency(b.remainingToPay)}</p></div>
            </div>

            {subTab === 'fittings' ? (
              <div className="grid gap-2">
                 <Button disabled={b.fitting1Done} onClick={() => { if(confirm('تأكيد اكتمال البروفة الأولى؟')) cloudDb.update(COLLS.BOOKINGS, b.id, { fitting1Done: true }); }} variant={b.fitting1Done ? 'success' : 'primary'} className="!h-14 !text-[11px] shadow-xl">البروفة الأولى: {b.fitting1Date} {b.fitting1Done && '(تمت)'}</Button>
                 <Button disabled={b.fitting2Done} onClick={() => { if(confirm('تأكيد اكتمال البروفة الثانية؟')) cloudDb.update(COLLS.BOOKINGS, b.id, { fitting2Done: true }); }} variant={b.fitting2Done ? 'success' : 'primary'} className="!h-14 !text-[11px] shadow-xl">البروفة الثانية: {b.fitting2Date} {b.fitting2Done && '(تمت)'}</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setModal({ ...b, type: 'MEASURE' })} className="flex-1 !h-12 !text-[11px] border border-white/5 shadow-xl"><Ruler size={18}/> المقاسات</Button>
                <Button variant="ghost" onClick={() => setModal({ ...b, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-brand-400 border border-white/5 shadow-xl"><Edit size={20}/></Button>
                <Button variant="danger" onClick={() => { if(confirm('إلغاء الحجز؟')) cloudDb.delete(COLLS.BOOKINGS, b.id); }} className="!w-12 !h-12 !p-0 shadow-xl"><Trash2 size={20}/></Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'تسجيل حجز جديد' : 'تعديل بيانات الحجز'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const drId = fd.get('dr') as string;
            const ed = fd.get('ed') as string;
            const dr = dresses.find((x:any) => x.id === drId);
            
            const conflict = bookings.some((b: any) => {
              if (b.dressId !== drId || (modal.type === 'EDIT' && b.id === modal.id)) return false;
              if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED) return false;
              const diff = Math.abs(new Date(b.eventDate).getTime() - new Date(ed).getTime()) / (86400000);
              return diff <= 2;
            });
            if (conflict && !confirm('تحذير: هذا الفستان محجوز في تاريخ قريب جداً (بيومين). هل تريد المتابعة؟')) return;

            const del = fd.get('dd') as string;
            const delObj = new Date(del);
            const f1 = new Date(delObj); f1.setDate(f1.getDate() - 10);
            const f2 = new Date(delObj); f2.setDate(f2.getDate() - 3);

            const rp = Number(fd.get('rp')); const dep = Number(fd.get('dep'));
            const data = {
              customerName: fd.get('cn'), customerPhone: fd.get('ph'), customerAddress: fd.get('ca'),
              dressId: drId, dressName: dr.name, eventDate: ed, deliveryDate: del,
              fitting1Date: f1.toISOString().split('T')[0], fitting2Date: f2.toISOString().split('T')[0],
              rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep,
              notes: fd.get('notes'), status: modal.status || BookingStatus.PENDING, createdAt: today,
              fitting1Done: modal.fitting1Done || false, fitting2Done: modal.fitting2Done || false
            };

            if (modal.type === 'ADD') {
               await cloudDb.add(COLLS.BOOKINGS, data);
               if (dep > 0) await cloudDb.add(COLLS.FINANCE, { amount: dep, type: 'INCOME', category: 'عربون حجز إيجار', notes: `عربون حجز لـ ${fd.get('cn')}`, date: today });
               if (dr.condition === DressCondition.NEW) await cloudDb.update(COLLS.DRESSES, drId, { condition: DressCondition.USED });
            } else {
               await cloudDb.update(COLLS.BOOKINGS, modal.id, data);
            }
            showToast('تم حفظ الحجز بنجاح'); setModal(null);
            addLog(modal.type === 'ADD' ? 'حجز إيجار' : 'تعديل حجز', `للعميلة: ${fd.get('cn')}`);
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="اسم العروس" name="cn" defaultValue={modal.customerName} required />
              <Input label="رقم الهاتف" name="ph" defaultValue={modal.customerPhone} required />
            </div>
            <Input label="العنوان (اختياري)" name="ca" defaultValue={modal.customerAddress} />
            
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 uppercase px-4">اختر الفستان</label>
              <select name="dr" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" defaultValue={modal.dressId} required>
                <option value="">اختر من الفساتين المتاحة...</option>
                {dresses.filter((d:any) => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED).map((d:any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.condition === DressCondition.NEW ? 'أول لبسة' : 'مستعمل'}) [{d.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="تاريخ المناسبة" name="ed" type="date" defaultValue={modal.eventDate || today} required 
                onChange={(e: any) => {
                  const val = e.target.value;
                  if (val) {
                    const d = new Date(val); d.setDate(d.getDate() - 1);
                    const ddInput = document.getElementsByName('dd')[0] as HTMLInputElement;
                    if (ddInput) ddInput.value = d.toISOString().split('T')[0];
                  }
                }}
              />
              <Input label="تاريخ التسليم" name="dd" type="date" defaultValue={modal.deliveryDate} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="سعر الإيجار" name="rp" type="number" defaultValue={modal.rentalPrice} required />
              <Input label="العربون المدفوع" name="dep" type="number" defaultValue={modal.paidDeposit} required />
            </div>
            
            <textarea name="notes" placeholder="ملاحظات التعديلات والطلبات..." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white min-h-[120px] outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" defaultValue={modal.notes} />
            <Button className="w-full h-18 mt-4 shadow-brand-900/40 text-lg">تثبيت الحجز في السحابة</Button>
          </form>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title={`مقاسات: ${modal.customerName || modal.brideName}`} onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {}; MEASUREMENT_FIELDS.forEach(f => m[f.id] = fd.get(f.id));
            const coll = modal.factoryCode ? COLLS.SALES : COLLS.BOOKINGS;
            await cloudDb.update(coll, modal.id, { measurements: m });
            showToast('تم حفظ المقاسات بنجاح'); setModal(null);
          }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MEASUREMENT_FIELDS.map(f => (
              <div key={f.id} className={f.id === 'orderNotes' ? 'md:col-span-2 lg:col-span-3' : ''}>
                {f.id === 'orderNotes' ? (
                  <textarea name={f.id} placeholder={f.label} defaultValue={modal.measurements?.[f.id]} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white min-h-[150px] outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" />
                ) : (
                  <Input label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />
                )}
              </div>
            ))}
            <Button className="md:col-span-2 lg:col-span-3 w-full h-18 mt-6 shadow-2xl text-lg"><Save size={24}/> حفظ المقاسات النهائية</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Sale Orders ---
function SaleOrdersView({ sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past'>('current');
  const [modal, setModal] = useState<any>(null);

  const filtered = useMemo(() => {
    return sales.filter((s: any) => (s.brideName.toLowerCase().includes(query.toLowerCase()) || s.factoryCode.toLowerCase().includes(query.toLowerCase()))).filter((s: any) => {
      if (subTab === 'current') return s.status !== SaleStatus.DELIVERED;
      return s.status === SaleStatus.DELIVERED;
    }).sort((a: any, b: any) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate));
  }, [sales, subTab, query]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-full border border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        {['current', 'past'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-12 rounded-full text-[11px] font-black transition-all ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>
            {t === 'current' ? 'طلبات حالية' : 'طلبات سابقة'}
          </button>
        ))}
      </div>

      {subTab === 'current' && hasPerm('add_sale') && (
        <Button onClick={() => setModal({ type: 'ADD' })} className="w-full !rounded-[2.5rem] h-16 shadow-brand-900/40"><Plus size={22}/> تسجيل طلب تفصيل جديد</Button>
      )}

      <div className="space-y-4">
        {filtered.map((s: any) => (
          <Card key={s.id}>
             <div className="flex justify-between items-start mb-6">
                <div><h4 className="text-xl font-black text-white leading-none">{s.brideName}</h4><p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mt-1 italic">{s.factoryCode}</p></div>
                <span className="px-4 py-1.5 bg-white/5 rounded-full text-[9px] font-black uppercase text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5">{s.status}</span>
             </div>
             <div className="p-5 bg-slate-950/40 rounded-[2.5rem] border border-white/5 mb-6 space-y-3 shadow-inner">
                <div className="flex justify-between items-center leading-none"><p className="text-[10px] text-slate-500 font-black italic opacity-60">المتبقي على العروس</p><p className="text-sm font-black text-red-400">{formatCurrency(s.remainingFromBride)}</p></div>
                <div className="flex justify-between items-center leading-none"><p className="text-[10px] text-slate-500 font-black italic opacity-60">التسليم المتوقع</p><p className="text-xs font-black text-white">{s.expectedDeliveryDate}</p></div>
             </div>
             <div className="flex gap-2">
               <Button variant="ghost" onClick={() => setModal({ ...s, type: 'MEASURE' })} className="flex-1 !h-12 !text-[11px] shadow-xl border border-white/5"><Ruler size={18}/> المقاسات</Button>
               <Button variant="ghost" onClick={() => setModal({ ...s, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-brand-400 shadow-xl border border-white/5"><Edit size={20}/></Button>
               <Button variant="danger" onClick={() => { if(confirm('حذف الطلب؟')) cloudDb.delete(COLLS.SALES, s.id); }} className="!w-12 !h-12 !p-0 shadow-xl"><Trash2 size={20}/></Button>
             </div>
          </Card>
        ))}
      </div>

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'تسجيل طلب تفصيل' : 'تعديل بيانات التفصيل'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = fd.get('c') as string;
            
            if (modal.type === 'ADD' && sales.some((s: any) => s.factoryCode.trim() === code.trim())) {
              showToast('كود المصنع مستخدم بالفعل!', 'error');
              return;
            }

            const sp = Number(fd.get('sp')); const dep = Number(fd.get('dep'));
            const data = {
              factoryCode: code, brideName: fd.get('n'), bridePhone: fd.get('ph'),
              expectedDeliveryDate: fd.get('ed'), sellPrice: sp, factoryPrice: Number(fd.get('fp')),
              deposit: dep, remainingFromBride: sp - dep, description: fd.get('d'),
              status: modal.status || SaleStatus.DESIGNING, factoryStatus: modal.factoryStatus || FactoryPaymentStatus.UNPAID,
              factoryDepositPaid: modal.factoryDepositPaid || 0, orderDate: today
            };

            if (modal.type === 'ADD') {
              await cloudDb.add(COLLS.SALES, data);
              if (dep > 0) await cloudDb.add(COLLS.FINANCE, { amount: dep, type: 'INCOME', category: 'عربون تفصيل', notes: `عربون كود ${code} للعروس ${fd.get('n')}`, date: today });
            } else {
              await cloudDb.update(COLLS.SALES, modal.id, data);
            }
            showToast('تم حفظ الطلب بنجاح'); setModal(null);
            addLog(modal.type === 'ADD' ? 'طلب بيع' : 'تعديل طلب بيع', `كود المصنع: ${code}`);
          }} className="space-y-4">
            <Input label="كود الفستان للمصنع (مميز)" name="c" defaultValue={modal.factoryCode} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="اسم العروس" name="n" defaultValue={modal.brideName} required />
              <Input label="رقم الهاتف" name="ph" defaultValue={modal.bridePhone} required />
            </div>
            <Input label="تاريخ التسليم المتوقع" name="ed" type="date" defaultValue={modal.expectedDeliveryDate || today} required />
            <div className="grid grid-cols-3 gap-3">
              <Input label="سعر البيع" name="sp" type="number" defaultValue={modal.sellPrice} required />
              <Input label="سعر المصنع" name="fp" type="number" defaultValue={modal.factoryPrice} required />
              <Input label="العربون" name="dep" type="number" defaultValue={modal.deposit} required />
            </div>
            <textarea name="d" placeholder="وصف الفستان المطلوب (اختياري)..." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white min-h-[100px] outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" defaultValue={modal.description} />
            <Button className="w-full h-18 mt-4 shadow-brand-900/40 text-lg">تثبيت طلب التفصيل</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Factory ---
function FactoryView({ sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'pending' | 'completed'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [depositAmts, setDepositAmts] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    return sales.filter((s: any) => s.factoryCode.toLowerCase().includes(query.toLowerCase())).filter((s: any) => {
      if (subTab === 'pending') return s.factoryStatus !== FactoryPaymentStatus.PAID;
      return s.factoryStatus === FactoryPaymentStatus.PAID;
    });
  }, [sales, subTab, query]);

  const toggleAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map((f: any) => f.id));

  const totalSelectedRemaining = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const s = sales.find((x:any) => x.id === id);
      return sum + (s ? s.factoryPrice - s.factoryDepositPaid : 0);
    }, 0);
  }, [selectedIds, sales]);

  const handleBulkClearance = async () => {
    if (!confirm(`هل تريد تصفية حساب ${selectedIds.length} فستان بمبلغ إجمالي ${formatCurrency(totalSelectedRemaining)}؟`)) return;
    let total = 0;
    for (const id of selectedIds) {
      const s = sales.find((x:any) => x.id === id);
      const rem = s.factoryPrice - s.factoryDepositPaid;
      await cloudDb.update(COLLS.SALES, id, { factoryDepositPaid: s.factoryPrice, factoryStatus: FactoryPaymentStatus.PAID });
      total += rem;
    }
    await cloudDb.add(COLLS.FINANCE, { amount: total, type: 'EXPENSE', category: 'المصنع', notes: `تصفية حساب ${selectedIds.length} فستان`, date: today });
    showToast('تمت تصفية الحسابات بنجاح'); setSelectedIds([]);
  };

  const handleBulkDeposit = async () => {
    let total = 0;
    for (const id of selectedIds) {
      const s = sales.find((x:any) => x.id === id);
      const amt = depositAmts[id] || 0;
      if (amt > 0) {
        const newPaid = s.factoryDepositPaid + amt;
        await cloudDb.update(COLLS.SALES, id, { 
          factoryDepositPaid: newPaid,
          factoryStatus: newPaid >= s.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL
        });
        total += amt;
      }
    }
    if (total > 0) await cloudDb.add(COLLS.FINANCE, { amount: total, type: 'EXPENSE', category: 'المصنع', notes: `دفع عربون لـ ${selectedIds.length} فستان`, date: today });
    showToast('تم تسجيل دفع العربون'); setModal(null); setSelectedIds([]); setDepositAmts({});
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-full border border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        <button onClick={() => { setSubTab('pending'); setSelectedIds([]); }} className={`flex-1 h-12 rounded-full text-[11px] font-black transition-all ${subTab === 'pending' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>مستحقات حالية</button>
        <button onClick={() => { setSubTab('completed'); setSelectedIds([]); }} className={`flex-1 h-12 rounded-full text-[11px] font-black transition-all ${subTab === 'completed' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>مكتملة الدفع</button>
      </div>

      <div className="flex justify-between items-center px-4 leading-none">
         <button onClick={toggleAll} className="text-[11px] font-black text-brand-400 uppercase tracking-widest italic opacity-80 underline underline-offset-4">{selectedIds.length === filtered.length ? 'إلغاء الكل' : 'تحديد الكل'}</button>
         <span className="text-[11px] font-black text-slate-500 italic opacity-60">{filtered.length} فستان</span>
      </div>

      <div className="space-y-3">
        {filtered.map((s: any) => (
          <div key={s.id} onClick={() => setSelectedIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} className={`p-6 rounded-[2.5rem] border transition-all flex justify-between items-center cursor-pointer shadow-xl ${selectedIds.includes(s.id) ? 'bg-brand-500/10 border-brand-500/50 scale-[0.98]' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
             <div><p className="text-lg font-black text-white leading-none">{s.factoryCode}</p><p className="text-[10px] text-slate-500 font-bold mt-2 tracking-wider italic leading-none">{s.brideName}</p></div>
             <div className="text-left leading-none">
                {subTab === 'completed' ? (
                   <><p className="text-[9px] font-black text-emerald-500 uppercase italic leading-none opacity-80">مكتمل الدفع</p><p className="font-black text-white mt-1">{formatCurrency(s.factoryPrice)}</p></>
                ) : (
                   <><p className="text-[9px] font-black text-red-500 uppercase italic leading-none opacity-80">المتبقي</p><p className="font-black text-red-400 mt-1">{formatCurrency(s.factoryPrice - s.factoryDepositPaid)}</p></>
                )}
             </div>
          </div>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-6 right-6 flex gap-3 animate-slide-up z-50">
           <Button onClick={() => setModal({ type: 'BULK_DEP' })} className="flex-1 shadow-2xl h-16 shadow-brand-900/40 text-xs">دفع عربون ({selectedIds.length})</Button>
           <Button variant="success" onClick={handleBulkClearance} className="flex-1 shadow-2xl h-16 shadow-emerald-900/40 text-xs">تصفية ({formatCurrency(totalSelectedRemaining)})</Button>
        </div>
      )}

      {modal?.type === 'BULK_DEP' && (
        <Modal title="دفع عربون للمصنع" onClose={() => setModal(null)}>
           <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-1 shadow-inner">
              {selectedIds.map(id => {
                const s = sales.find((x:any) => x.id === id);
                return (
                  <div key={id} className="p-4 bg-white/5 rounded-3xl border border-white/5 shadow-lg">
                     <div className="flex justify-between mb-2 text-[10px] font-black italic leading-none"><span>{s.factoryCode}</span><span className="text-red-400">المتبقي: {formatCurrency(s.factoryPrice - s.factoryDepositPaid)}</span></div>
                     <Input type="number" placeholder="المبلغ المدفوع الآن لهذا الفستان" onChange={(e:any) => setDepositAmts(p => ({...p, [id]: Number(e.target.value)}))} />
                  </div>
                );
              })}
           </div>
           <div className="mt-6 p-6 bg-slate-950/80 rounded-[3rem] border border-brand-500/20 text-center shadow-xl">
              <p className="text-[11px] font-black text-slate-500 uppercase mb-1 italic opacity-60">إجمالي المبالغ المدخلة حالياً</p>
              <h3 className="text-3xl font-black text-brand-400 leading-none">{formatCurrency(Object.values(depositAmts).reduce((a,b) => a+b, 0))}</h3>
           </div>
           <Button onClick={handleBulkDeposit} className="w-full h-18 mt-6 shadow-2xl text-lg">تأكيد دفع المبالغ للمصنع</Button>
        </Modal>
      )}
    </div>
  );
}

// --- View: Delivery & Return ---
function DeliveryView({ bookings, sales, dresses, query, user, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'delivery' | 'return' | 'archive'>('delivery');
  const [modal, setModal] = useState<any>(null);

  const deliveryItems = useMemo(() => {
    const list = [
      ...bookings.filter((b: any) => b.status === BookingStatus.PENDING).map((b:any) => ({ ...b, type: 'RENT' })),
      ...sales.filter((s: any) => s.status !== SaleStatus.DELIVERED).map((s:any) => ({ ...s, type: 'SALE' }))
    ];
    return list.filter((i: any) => (i.customerName || i.brideName).toLowerCase().includes(query.toLowerCase())).sort((a:any, b:any) => (a.deliveryDate || a.expectedDeliveryDate).localeCompare(b.deliveryDate || b.expectedDeliveryDate));
  }, [bookings, sales, query]);

  const returnItems = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE && b.customerName.toLowerCase().includes(query.toLowerCase())).sort((a:any, b:any) => a.eventDate.localeCompare(b.eventDate));

  const archiveItems = useMemo(() => {
    const list = [
      ...bookings.filter((b: any) => b.status === BookingStatus.COMPLETED).map((b:any) => ({ ...b, type: 'RENT' })),
      ...sales.filter((s: any) => s.status === SaleStatus.DELIVERED).map((s:any) => ({ ...s, type: 'SALE' }))
    ];
    return list.filter((i: any) => (i.customerName || i.brideName).toLowerCase().includes(query.toLowerCase())).sort((a:any, b:any) => (b.actualReturnDate || b.actualDeliveryDate || '').localeCompare(a.actualReturnDate || a.actualDeliveryDate || ''));
  }, [bookings, sales, query]);

  const handlePickup = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const bal = Number(fd.get('bal'));

    if (item.type === 'RENT') {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { 
        status: BookingStatus.ACTIVE, remainingToPay: item.remainingToPay - bal,
        securityDeposit: { type: fd.get('st') as DepositType, detail: fd.get('sd') as string, value: Number(fd.get('sv') || 0) },
        staffName: user.name, actualPickupDate: today
      });
    } else {
      await cloudDb.update(COLLS.SALES, item.id, { status: SaleStatus.DELIVERED, remainingFromBride: item.remainingFromBride - bal, actualDeliveryDate: today });
    }

    if (bal > 0) await cloudDb.add(COLLS.FINANCE, { amount: bal, type: 'INCOME', category: 'تحصيل تسليم', notes: `تحصيل من ${item.customerName || item.brideName}`, date: today });
    showToast('تمت عملية التسليم بنجاح'); setModal(null);
    addLog('تسليم فستان', `${item.customerName || item.brideName}`);
  };

  const handleReturn = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const bal = Number(fd.get('bal'));
    const dmg = Number(fd.get('dmg') || 0);

    await cloudDb.update(COLLS.BOOKINGS, item.id, { status: BookingStatus.COMPLETED, remainingToPay: item.remainingToPay - bal, damageFee: dmg, actualReturnDate: today });
    const dr = dresses.find((d: any) => d.id === item.dressId);
    await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.CLEANING, rentalCount: (dr?.rentalCount || 0) + 1 });

    if (bal > 0) await cloudDb.add(COLLS.FINANCE, { amount: bal, type: 'INCOME', category: 'تحصيل إرجاع', notes: `تحصيل نهائي ${item.customerName}`, date: today });
    if (dmg > 0) await cloudDb.add(COLLS.FINANCE, { amount: dmg, type: 'INCOME', category: 'تلفيات', notes: `قيمة تلف ${item.customerName}`, date: today });
    
    showToast('تم الاستلام والتحويل للتنظيف'); setModal(null);
    addLog('إرجاع فستان', `${item.customerName}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-full border border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        {['delivery', 'return', 'archive'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-12 rounded-full text-[11px] font-black transition-all ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>
            {t === 'delivery' ? 'التسليم' : t === 'return' ? 'الإرجاع' : 'الأرشيف'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(subTab === 'delivery' ? deliveryItems : subTab === 'return' ? returnItems : archiveItems).map((i: any) => (
          <Card key={i.id} className={`border-r-8 shadow-xl ${i.type === 'SALE' ? 'border-emerald-500' : 'border-brand-500'}`}>
             <div className="flex justify-between items-start mb-6 leading-none">
                <div><h4 className="text-xl font-black text-white">{i.customerName || i.brideName}</h4><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest leading-none italic">{i.dressName || i.factoryCode}</p></div>
                <span className="px-3 py-1.5 bg-white/5 rounded-full text-[8px] font-black uppercase text-brand-400 border border-white/5 shadow-inner leading-none">{i.type === 'RENT' ? 'إيجار' : 'تفصيل'}</span>
             </div>
             {subTab === 'archive' ? (
               <div className="text-[11px] font-black text-slate-500 grid grid-cols-2 gap-y-3 leading-none italic opacity-80">
                  <p>الموظف: <span className="text-white not-italic">{i.staffName || '-'}</span></p>
                  <p className="text-left">استلام: <span className="text-white not-italic">{i.actualPickupDate || i.actualDeliveryDate}</span></p>
                  {i.actualReturnDate && <p className="col-span-2 text-left">إرجاع: <span className="text-white not-italic">{i.actualReturnDate}</span></p>}
               </div>
             ) : (
               <div className="flex gap-2">
                  {subTab === 'delivery' ? (
                    <Button onClick={() => setModal({ type: 'PICKUP', item: i })} className="w-full h-14 shadow-xl">تسليم للعروس</Button>
                  ) : (
                    <>
                      <Button variant="ghost" onClick={() => { if(confirm('تراجع عن التسليم؟')) cloudDb.update(COLLS.BOOKINGS, i.id, { status: BookingStatus.PENDING }); }} className="flex-1 !h-14 !text-slate-400 border border-white/5 shadow-xl">تراجع</Button>
                      <Button variant="success" onClick={() => setModal({ type: 'RETURN', item: i })} className="flex-[2] h-14 shadow-xl">استرجاع من العروس</Button>
                    </>
                  )}
               </div>
             )}
          </Card>
        ))}
      </div>

      {modal?.type === 'PICKUP' && (
        <Modal title={`تسليم فستان: ${modal.item.customerName || modal.item.brideName}`} onClose={() => setModal(null)}>
           <form onSubmit={handlePickup} className="space-y-6">
              <div className="p-8 bg-slate-950/50 rounded-[3.5rem] border border-white/5 text-center shadow-inner">
                 <p className="text-[11px] text-slate-500 font-black mb-1 uppercase italic tracking-widest opacity-60">المتبقي على العروس</p>
                 <h3 className="text-4xl font-black text-white leading-none">{formatCurrency(modal.item.remainingToPay || modal.item.remainingFromBride)}</h3>
              </div>
              <Input label="المبلغ المحصل الآن (قابل للتعديل)" name="bal" type="number" defaultValue={modal.item.remainingToPay || modal.item.remainingFromBride} required />
              {modal.item.type === 'RENT' && (
                <div className="pt-6 border-t border-white/10 space-y-5">
                   <p className="text-[12px] font-black text-brand-400 uppercase tracking-widest italic opacity-80 underline underline-offset-8">بيانات الأمنية (الضمان)</p>
                   <select name="st" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" onChange={(e:any) => setModal({...modal, st: e.target.value})} required>
                      <option value={DepositType.CASH}>{DepositType.CASH}</option>
                      <option value={DepositType.DOCUMENT}>{DepositType.DOCUMENT}</option>
                      <option value={DepositType.GOLD}>{DepositType.GOLD}</option>
                      <option value={DepositType.OTHER}>{DepositType.OTHER}</option>
                   </select>
                   {modal.st === DepositType.CASH ? (
                      <Input label="قيمة المبلغ المالي المستلم" name="sv" type="number" required />
                   ) : (
                      <Input label="وصف الأمنية المستلمة" name="sd" placeholder="مثلاً: رقم البطاقة / وصف القطعة الذهبية..." required />
                   )}
                </div>
              )}
              <Button className="w-full h-18 mt-6 text-lg shadow-brand-900/40 shadow-2xl !rounded-[3rem]">تأكيد عملية التسليم النهائية</Button>
           </form>
        </Modal>
      )}

      {modal?.type === 'RETURN' && (
        <Modal title={`استرجاع فستان: ${modal.item.customerName}`} onClose={() => setModal(null)}>
           <form onSubmit={handleReturn} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-slate-950/50 rounded-[2.5rem] text-center border border-white/5 shadow-inner"><p className="text-[9px] font-black opacity-40 mb-1 leading-none italic uppercase">المتبقي</p><p className="font-black text-red-400 text-lg leading-none mt-2">{formatCurrency(modal.item.remainingToPay)}</p></div>
                 <div className="p-6 bg-slate-950/50 rounded-[2.5rem] text-center border border-white/5 shadow-inner"><p className="text-[9px] font-black opacity-40 mb-1 leading-none italic uppercase">الأمنية</p><p className="font-black text-brand-400 text-sm truncate leading-none mt-2">{modal.item.securityDeposit?.detail || modal.item.securityDeposit?.value || '-'}</p></div>
              </div>
              <Input label="تحصيل المتبقي (أو تعديله)" name="bal" type="number" defaultValue={modal.item.remainingToPay} />
              <div className="p-7 bg-slate-900 rounded-[3.5rem] border border-red-500/20 shadow-xl shadow-red-500/5">
                 <label className="flex items-center gap-4 cursor-pointer">
                    <input type="checkbox" onChange={(e:any) => setModal({...modal, hasD: e.target.checked})} className="w-7 h-7 accent-red-500 rounded-lg shadow-sm" />
                    <span className="text-[13px] font-black text-red-400 uppercase tracking-widest leading-none">يوجد تلفيات في الفستان</span>
                 </label>
                 {modal.hasD && <Input name="dmg" label="قيمة مبلغ خصم التلف (نقدي)" type="number" className="mt-5 !bg-slate-950 shadow-inner" required />}
              </div>
              <Button variant="success" className="w-full h-18 text-lg mt-4 shadow-emerald-900/40 shadow-2xl !rounded-[3rem]">تأكيد الإرجاع والتحويل للتنظيف</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Customers Registry ---
function CustomersView({ bookings, sales, query }: any) {
  const list = useMemo(() => {
    const m = new Map();
    bookings.forEach((b:any) => m.set(b.customerPhone, { n: b.customerName, ph: b.customerPhone, type: 'إيجار' }));
    sales.forEach((s:any) => m.set(s.bridePhone, { n: s.brideName, ph: s.bridePhone, type: 'بيع' }));
    return Array.from(m.values()).filter(x => x.n.toLowerCase().includes(query.toLowerCase()) || x.ph.includes(query)).sort((a,b) => a.n.localeCompare(b.n));
  }, [bookings, sales, query]);

  return (
    <div className="space-y-3 animate-fade-in">
       {list.map((c:any, i: number) => (
         <Card key={i} className="flex justify-between items-center !p-5 shadow-lg border border-white/5 active:bg-white/5">
            <div><p className="text-lg font-black text-white leading-none">{c.n}</p><p className="text-[11px] text-slate-500 font-bold mt-2 tracking-widest leading-none italic opacity-60">{c.ph}</p></div>
            <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-5 py-2 rounded-full border border-white/5 uppercase italic shadow-inner">{c.type}</span>
         </Card>
       ))}
       {list.length === 0 && <p className="text-center py-20 opacity-40 italic font-bold">لا يوجد عملاء مطابقين للبحث</p>}
    </div>
  );
}

// --- View: Finance ---
function FinanceView({ finance, dresses, users, bookings, query, hasPerm, showToast }: any) {
  const [subTab, setSubTab] = useState<'logs' | 'analysis' | 'performance'>('logs');
  const [modal, setModal] = useState<any>(null);

  const filtered = useMemo(() => {
    return finance.filter((f: any) => f.category.toLowerCase().includes(query.toLowerCase()) || f.notes.toLowerCase().includes(query.toLowerCase())).sort((a:any, b:any) => b.date.localeCompare(a.date));
  }, [finance, query]);

  const totals = useMemo(() => {
    const inc = finance.filter((f: any) => f.type === 'INCOME').reduce((s: any, f: any) => s + f.amount, 0);
    const exp = finance.filter((f: any) => f.type === 'EXPENSE').reduce((s: any, f: any) => s + f.amount, 0);
    return { inc, exp, profit: inc - exp };
  }, [finance]);

  const performance = useMemo(() => {
    return dresses.filter((d:any) => d.type === DressType.RENT).map((d:any) => {
      const income = finance.filter((f:any) => f.relatedDresses?.includes(d.name) || (f.notes.includes(d.name) && f.type === 'INCOME')).reduce((s,f) => s+f.amount, 0);
      const expense = d.factoryPrice + finance.filter((f:any) => f.relatedDresses?.includes(d.name) && f.type === 'EXPENSE').reduce((s,f) => s+f.amount, 0);
      return { ...d, income, expense, profit: income - expense };
    }).sort((a,b) => b.profit - a.profit);
  }, [dresses, finance]);

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-full border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-2xl">
        {['logs', 'analysis', 'performance'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-12 rounded-full text-[10px] font-black transition-all ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>
            {t === 'logs' ? 'السجل' : t === 'analysis' ? 'تحليل مالي' : 'أداء الفساتين'}
          </button>
        ))}
      </div>

      {subTab === 'logs' ? (
        <div className="space-y-4">
           <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] text-center shadow-lg"><p className="text-[9px] font-black text-emerald-500 mb-1 leading-none uppercase italic opacity-80">الوارد</p><p className="text-sm font-black text-emerald-200">{formatCurrency(totals.inc)}</p></div>
              <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-center shadow-lg"><p className="text-[9px] font-black text-red-500 mb-1 leading-none uppercase italic opacity-80">المنصرف</p><p className="text-sm font-black text-red-200">{formatCurrency(totals.exp)}</p></div>
              <div className="p-5 bg-brand-500/10 border border-brand-500/20 rounded-[2.5rem] text-center shadow-lg"><p className="text-[9px] font-black text-brand-500 mb-1 leading-none uppercase italic opacity-80">الصافي</p><p className="text-sm font-black text-brand-200">{formatCurrency(totals.profit)}</p></div>
           </div>
           {hasPerm('add_finance') && <Button onClick={() => setModal({ type: 'ADD', entry: 'INCOME' })} className="w-full !rounded-[2.5rem] h-16 shadow-brand-900/40 shadow-2xl"><Plus size={22}/> إضافة وارد / منصرف</Button>}
           {filtered.map((f: any) => (
             <Card key={f.id} className="!p-4 !mb-2 flex items-center justify-between shadow-lg border border-white/5 active:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${f.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 shadow-red-500/10 border border-red-500/20'}`}>{f.type === 'INCOME' ? <TrendingUp size={22}/> : <ArrowDownCircle size={22}/>}</div>
                   <div><h4 className="font-black text-xs text-white leading-none">{f.category}</h4><p className="text-[10px] text-slate-500 mt-2 font-bold italic opacity-60 leading-none">{f.date}</p></div>
                </div>
                <div className={`text-sm font-black shadow-inner px-4 py-2 rounded-xl border border-white/5 ${f.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>{f.type === 'INCOME' ? '+' : '-'}{formatCurrency(f.amount)}</div>
             </Card>
           ))}
        </div>
      ) : subTab === 'performance' ? (
        <div className="space-y-4">
           {performance.map((d: any) => (
             <Card key={d.id} className="shadow-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6 leading-none">
                   <h4 className="text-lg font-black text-white">{d.name}</h4>
                   <span className={`px-5 py-2 rounded-full text-[10px] font-black shadow-lg border ${d.profit >= 0 ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/10' : 'bg-red-500 border-red-400 text-white shadow-red-500/10'}`}>{formatCurrency(d.profit)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[11px] font-black text-slate-500 uppercase tracking-tighter italic leading-none opacity-80">
                   <p className="flex justify-between border-r border-white/10 px-3">الوارد: <span className="text-emerald-400 not-italic">{formatCurrency(d.income)}</span></p>
                   <p className="flex justify-between px-3">المنصرف: <span className="text-red-400 not-italic">{formatCurrency(d.expense)}</span></p>
                </div>
             </Card>
           ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 opacity-30 animate-pulse">
          <BarChart3 size={64} className="mb-4" />
          <p className="text-xl font-black">جاري معالجة البيانات السحابية للرسوم البيانية...</p>
        </div>
      )}

      {modal?.type === 'ADD' && (
        <Modal title="إضافة عملية مالية" onClose={() => setModal(null)}>
           <form onSubmit={async (e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const t = fd.get('t') as 'INCOME' | 'EXPENSE';
              const data: any = { date: fd.get('d') || today, type: t, amount: Math.abs(Number(fd.get('a'))), category: fd.get('c'), notes: fd.get('n') };
              
              if (t === 'EXPENSE') {
                if (data.category === 'رواتب') data.targetUser = fd.get('tu');
                if (['تنظيف', 'ترزي'].includes(data.category)) {
                  data.relatedDresses = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => c.value);
                }
              }
              await cloudDb.add(COLLS.FINANCE, data);
              showToast('تم حفظ العملية المالية بنجاح'); setModal(null);
           }} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[11px] font-black text-slate-500 uppercase px-4 italic leading-none">نوع العملية</label>
                 <select name="t" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" onChange={(e:any) => setModal({...modal, entry: e.target.value})}>
                    <option value="INCOME">وارد (+)</option>
                    <option value="EXPENSE">منصرف (-)</option>
                 </select>
              </div>
              
              {modal.entry === 'EXPENSE' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase px-4 italic leading-none">تصنيف المصروف</label>
                    <select name="c" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" required onChange={(e:any) => setModal({...modal, sc: e.target.value})}>
                      <option value="">اختر التصنيف...</option>
                      <option value="فواتير">فواتير</option>
                      <option value="رواتب">رواتب</option>
                      <option value="تنظيف">تنظيف</option>
                      <option value="ترزي">ترزي</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  {modal.sc === 'فواتير' && <select name="sub" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white shadow-inner outline-none focus:ring-2 focus:ring-brand-500" required><option value="ايجار">ايجار</option><option value="كهرباء">كهرباء</option><option value="ماء">ماء</option><option value="صيانة">صيانة</option><option value="اخرى">اخرى</option></select>}
                  {modal.sc === 'رواتب' && <select name="tu" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white shadow-inner outline-none focus:ring-2 focus:ring-brand-500" required><option value="">اختر الموظف...</option>{users.map((u:any) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>}
                  {(modal.sc === 'تنظيف' || modal.sc === 'ترزي') && (
                    <div className="p-7 bg-slate-950/50 rounded-[3.5rem] border border-white/5 max-h-60 overflow-y-auto custom-scrollbar space-y-3 shadow-inner">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 opacity-60 leading-none">اختر الفساتين المعنية بالعملية:</p>
                       {dresses.filter((d:any) => d.type === DressType.RENT).map((d:any) => {
                          const priority = (modal.sc === 'تنظيف' && d.status === DressStatus.CLEANING) || (modal.sc === 'ترزي' && bookings.some((b:any) => b.dressId === d.id && b.status === BookingStatus.PENDING));
                          return (
                            <label key={d.id} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border transition-all shadow-md ${priority ? 'border-brand-500/50 bg-brand-500/5' : 'border-transparent hover:bg-white/5'}`}>
                                <input type="checkbox" value={d.name} className="w-6 h-6 accent-brand-500 rounded-lg shadow-sm" />
                                <div className="flex-1 leading-none"><p className="text-sm font-black text-white">{d.name}</p>
                                {priority && <span className="text-[9px] font-black text-brand-400 uppercase italic mt-2 block leading-none underline decoration-brand-500/30 underline-offset-4">● أولوية مطلوبة (حالة نشطة)</span>}
                                </div>
                            </label>
                          );
                       })}
                    </div>
                  )}
                </>
              ) : (
                <Input label="نوع الوارد (مثلاً: دفعة العميل)" name="c" required />
              )}
              <div className="grid grid-cols-2 gap-4">
                 <Input label="المبلغ المستحق" name="a" type="number" required />
                 <Input label="تاريخ العملية" name="d" type="date" defaultValue={today} required />
              </div>
              <textarea name="n" placeholder="ملاحظات تفصيلية للعملية..." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white min-h-[120px] outline-none shadow-inner focus:ring-2 focus:ring-brand-500 transition-all" />
              <Button className="w-full h-18 mt-4 text-lg shadow-brand-900/40 shadow-2xl !rounded-[3rem]">تسجيل العملية المالية في السجلات</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}

// --- View: Activity Logs ---
function LogsView({ logs, query }: any) {
  return (
    <div className="space-y-3 animate-fade-in">
      {logs.filter((l:any) => l.action.toLowerCase().includes(query.toLowerCase()) || l.details.toLowerCase().includes(query.toLowerCase()) || l.username.toLowerCase().includes(query.toLowerCase())).reverse().slice(0, 100).map((l:any) => (
        <Card key={l.id} className="!p-6 !mb-2 border-r-4 border-r-brand-500 shadow-xl active:bg-slate-900/80 transition-all">
           <div className="flex justify-between items-center mb-3 leading-none italic">
              <span className="text-[12px] font-black text-brand-400 uppercase tracking-widest underline decoration-brand-500/30 underline-offset-4">{l.action}</span>
              <span className="text-[10px] text-slate-600 font-black opacity-60">{new Date(l.timestamp).toLocaleString('ar-EG')}</span>
           </div>
           <p className="text-xs font-bold text-slate-300 leading-relaxed italic">{l.details}</p>
           <p className="text-[9px] font-black text-slate-700 mt-4 text-left uppercase italic leading-none opacity-40">المستخدم المسؤول: <span className="text-brand-500/40 not-italic underline decoration-brand-500/10">@{l.username}</span></p>
        </Card>
      ))}
      {logs.length === 0 && <div className="flex flex-col items-center justify-center p-20 opacity-20"><FileText size={64} className="mb-4" /><p className="font-black">لا يوجد سجلات حركة للنظام حتى اللحظة</p></div>}
    </div>
  );
}

// --- View: Settings ---
function SettingsView({ user, users, hasPerm, showToast, addLog }: any) {
  const [modal, setModal] = useState<any>(null);

  const handleResetAll = async () => {
    if (confirm('تحذير شديد: سيتم مسح كافة البيانات السحابية وإرجاع النظام لنقطة الصفر. هل أنت متأكد؟')) {
       await cloudDb.clearAll();
       showToast('تم تصفير النظام بالكامل');
       setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
       <div className="text-center py-10 relative">
          <div className="w-32 h-32 bg-brand-600 rounded-[4rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_50px_-20px_rgba(192,38,211,0.6)] animate-pulse-soft border-4 border-white/5"><Users size={56} className="text-white"/></div>
          <h2 className="text-4xl font-black text-white leading-none tracking-tight">{user.name}</h2>
          <p className="text-slate-500 font-black mt-4 tracking-[0.3em] uppercase text-xs opacity-60 leading-none">@{user.username} • {user.role}</p>
          <Button variant="ghost" onClick={() => setModal({ type: 'CHANGE_PASS' })} className="mx-auto mt-10 !rounded-full px-12 h-16 border border-white/10 shadow-2xl active:bg-brand-500/10 active:border-brand-500/20"><Key size={20}/> تغيير كلمة المرور الحالية</Button>
       </div>

       {hasPerm('admin_reset') && (
         <div className="space-y-8 mt-10">
            <h3 className="text-2xl font-black px-6 flex items-center gap-4 text-slate-300 italic"><Database size={28} className="text-brand-500"/> إدارة صلاحيات الموظفين والنظام</h3>
            <div className="space-y-4">
              {users.map((u: any) => (
                <Card key={u.id} className="!p-6 shadow-2xl border border-white/5">
                   <div className="flex justify-between items-center leading-none">
                      <div className="leading-none"><p className="text-xl font-black text-white leading-none">{u.name}</p><p className="text-[11px] text-slate-500 font-bold mt-2 italic opacity-60 tracking-wider">@{u.username}</p></div>
                      <div className="flex gap-2">
                         <Button variant="ghost" onClick={() => setModal({ ...u, type: 'EDIT_USER' })} className="!w-12 !h-12 !p-0 shadow-xl border border-white/5 active:bg-brand-500/10"><Edit size={20}/></Button>
                         {u.id !== user.id && <Button variant="danger" onClick={() => { if(confirm('حذف الموظف نهائياً؟')) cloudDb.delete(COLLS.USERS, u.id); }} className="!w-12 !h-12 !p-0 shadow-xl border border-red-500/10"><Trash2 size={20}/></Button>}
                      </div>
                   </div>
                   <div className="mt-6 flex flex-wrap gap-2 shadow-inner p-3 rounded-2xl bg-black/20 border border-white/5">
                      {u.permissions.map((p: string) => <span key={p} className="text-[9px] bg-slate-900 text-slate-500 px-4 py-2 rounded-xl font-black border border-white/5 uppercase tracking-tighter opacity-80">{p}</span>)}
                   </div>
                </Card>
              ))}
            </div>
            <Button onClick={() => setModal({ type: 'ADD_USER' })} className="w-full !rounded-[3.5rem] h-20 text-lg shadow-brand-900/40 shadow-2xl"><UserPlus size={26}/> إضافة موظف جديد وتعيين صلاحيات</Button>

            <div className="p-10 bg-red-950/20 border border-red-500/20 rounded-[5rem] text-center mt-20 shadow-2xl shadow-red-950/40 relative overflow-hidden group">
               <div className="absolute inset-0 bg-red-500/5 group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
               <AlertTriangle size={56} className="mx-auto text-red-500 mb-6 animate-bounce" />
               <h4 className="text-red-500 font-black text-2xl mb-3 leading-none italic uppercase tracking-widest">منطقة الخطر السحابي</h4>
               <p className="text-[13px] text-slate-400 font-bold mb-10 italic leading-relaxed opacity-80">تحذير: زر تصفير النظام سيقوم بمسح كافة السجلات السحابية بالكامل وإعادة كلمة مرور المدير لـ "123". لا يمكن التراجع!</p>
               <Button variant="danger" onClick={handleResetAll} className="w-full h-22 text-xl shadow-red-900/60 shadow-2xl !rounded-[3.5rem] active:scale-95 group-active:animate-shake">تصفير النظام بالكامل (نقطة الصفر)</Button>
            </div>
         </div>
       )}

       {modal?.type === 'CHANGE_PASS' && (
         <Modal title="تغيير كلمة المرور الشخصية" onClose={() => setModal(null)}>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const p = new FormData(e.currentTarget).get('p') as string;
              await cloudDb.update(COLLS.USERS, user.id, { password: p });
              showToast('تم تحديث كلمة المرور بنجاح'); setModal(null);
            }} className="space-y-6">
               <Input label="أدخل كلمة المرور الجديدة" name="p" type="password" required />
               <Button className="w-full h-18 text-lg mt-4 shadow-xl !rounded-[2.5rem]">تحديث كلمة المرور</Button>
            </form>
         </Modal>
       )}

       {(modal?.type === 'ADD_USER' || modal?.type === 'EDIT_USER') && (
         <Modal title={modal.type === 'ADD_USER' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'} onClose={() => setModal(null)} size="lg">
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const perms = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => c.value);
              const data: any = { name: fd.get('n'), username: fd.get('u'), role: UserRole.EMPLOYEE, permissions: perms };
              
              if (modal.type === 'ADD_USER') {
                data.password = '123'; data.firstLogin = true;
                await cloudDb.add(COLLS.USERS, data);
              } else {
                await cloudDb.update(COLLS.USERS, modal.id, data);
              }
              showToast('تم حفظ بيانات الموظف بنجاح'); setModal(null);
              addLog(modal.type === 'ADD_USER' ? 'إضافة مستخدم' : 'تعديل مستخدم', `${fd.get('n')}`);
            }} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="الاسم الرباعي للموظف" name="n" defaultValue={modal.name} required />
                  <Input label="اسم المستخدم للولوج" name="u" defaultValue={modal.username} required />
               </div>
               {modal.type === 'EDIT_USER' && (
                  <Button type="button" variant="ghost" className="!text-brand-400 !border-brand-500/20 shadow-lg" onClick={async () => { if(confirm('هل تريد تصفير كلمة سر الموظف لـ 123؟')) { await cloudDb.update(COLLS.USERS, modal.id, { password: '123', firstLogin: true }); showToast('تم التصفير لـ 123'); } }}>تصفير كلمة السر لـ (123)</Button>
               )}
               <div className="space-y-5">
                  <div className="flex justify-between items-center px-4 leading-none italic">
                     <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-60">تخصيص صلاحيات الوصول</p>
                     <button type="button" onClick={(e:any) => {
                        const boxes = e.target.closest('form').querySelectorAll('input[type="checkbox"]');
                        boxes.forEach((b:any) => b.checked = true);
                     }} className="text-[11px] font-black text-brand-500 underline underline-offset-4 decoration-brand-500/30">تحديد كافة الصلاحيات</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-8 bg-slate-950/50 rounded-[4rem] border border-white/5 max-h-[45vh] overflow-y-auto custom-scrollbar shadow-inner">
                    {PERMISSIONS_LIST.map(p => (
                      <label key={p.id} className="flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-white/5 active:scale-95">
                        <input type="checkbox" value={p.id} defaultChecked={modal.permissions?.includes(p.id)} className="w-7 h-7 accent-brand-500 rounded-lg shadow-sm" />
                        <span className="text-[13px] font-black text-slate-300 uppercase leading-none opacity-80">{p.label}</span>
                      </label>
                    ))}
                  </div>
               </div>
               <Button className="w-full h-22 text-xl mt-4 shadow-brand-900/60 shadow-2xl !rounded-[3.5rem]">تثبيت بيانات الموظف السحابية</Button>
            </form>
         </Modal>
       )}
    </div>
  );
}

function Database({ size, ...props }: any) { return <BarChart3 size={size} {...props} />; }
