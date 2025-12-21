
import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, 
  Settings, LogOut, Plus, Search, Edit, Trash2, Check, X, AlertTriangle, Ruler, 
  Droplets, CheckCircle, Info, Menu, ChevronRight, Save, Key, UserPlus, Database, User as UserIcon
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
  User, Dress, SaleOrder, Booking, FinanceRecord, AuditLog, Customer, Measurements 
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Shared Components & Helpers ---

const CARD_CLASS = "bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl animate-scale-in";
// Define missing BADGE_CLASS
const BADGE_CLASS = "px-3 py-1 rounded-full text-[10px] font-black uppercase";
const INPUT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all";
const BTN_PRIMARY = "bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50";
const BTN_SECONDARY = "bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95";

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
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
    <div className={`bg-slate-900 border border-white/10 rounded-[2.5rem] w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} p-8 shadow-2xl relative animate-scale-in my-auto`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Subscription
  useEffect(() => {
    const unsubDresses = cloudDb.subscribe(COLLS.DRESSES, setDresses);
    const unsubBookings = cloudDb.subscribe(COLLS.BOOKINGS, setBookings);
    const unsubSales = cloudDb.subscribe(COLLS.SALES, setSaleOrders);
    const unsubFinance = cloudDb.subscribe(COLLS.FINANCE, setFinance);
    const unsubUsers = cloudDb.subscribe(COLLS.USERS, setUsers);
    const unsubLogs = cloudDb.subscribe(COLLS.LOGS, setLogs);
    return () => {
      unsubDresses(); unsubBookings(); unsubSales(); unsubFinance(); unsubUsers(); unsubLogs();
    };
  }, []);

  const hasPerm = (perm: string) => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.ADMIN || currentUser.permissions.includes(perm);
  };

  const addLog = async (action: string, details: string) => {
    if (currentUser) {
      await cloudDb.add(COLLS.LOGS, {
        action,
        username: currentUser.name,
        timestamp: new Date().toISOString(),
        details
      });
    }
  };

  // --- Auth logic ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl text-center">
          <div className="w-24 h-24 bg-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Shirt size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">إيلاف سحابي</h1>
          <p className="text-slate-400 mb-8 font-medium">نظام إدارة فساتين الزفاف</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const user = users.find(u => u.username === fd.get('u') && u.password === fd.get('p'));
            if (user) {
              setCurrentUser(user);
              addLog('دخول', `قام الموظف ${user.name} بتسجيل الدخول`);
            } else {
              alert('بيانات الدخول غير صحيحة');
            }
          }} className="space-y-4">
            <input name="u" placeholder="اسم المستخدم" className={INPUT_CLASS} required />
            <input name="p" type="password" placeholder="كلمة المرور" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-14"}>دخول النظام</button>
          </form>
        </div>
      </div>
    );
  }

  // First Login Check
  if (currentUser.firstLogin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className={CARD_CLASS + " max-w-md w-full"}>
          <h2 className="text-2xl font-black text-white mb-6">تغيير كلمة المرور</h2>
          <p className="text-slate-400 mb-6">هذا أول دخول لك، يرجى تعيين كلمة مرور جديدة.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const pass = new FormData(e.currentTarget).get('p') as string;
            await cloudDb.update(COLLS.USERS, currentUser.id, { password: pass, firstLogin: false });
            setCurrentUser({ ...currentUser, password: pass, firstLogin: false });
          }} className="space-y-4">
            <input name="p" type="password" placeholder="كلمة المرور الجديدة" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full"}>حفظ كلمة المرور</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-slate-900 border-l border-white/5 flex-col shadow-2xl">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg"><Shirt size={28}/></div>
          <div><h1 className="font-black text-xl">إيلاف</h1><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wedding Dress</p></div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
          {NAV_ITEMS.map(item => {
            if (item.id !== 'home' && !hasPerm(`view_${item.id}`)) return null;
            const Icon = { Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings }[item.icon] as any;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(''); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-brand-600 text-white shadow-xl shadow-brand-900/20' : 'text-slate-400 hover:bg-white/5'}`}>
                <Icon size={20}/> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-6 border-t border-white/5 bg-slate-900/50">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl mb-4">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center"><UserIcon size={20}/></div>
            <div className="flex-1 truncate"><p className="font-bold text-sm truncate">{currentUser.name}</p><p className="text-[10px] text-slate-500 font-black">{currentUser.role}</p></div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 py-4 text-red-400 font-bold hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={18}/> خروج</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-slate-900/50 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-8 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-400"><Menu size={24}/></button>
            <h2 className="text-2xl font-black text-white">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h2>
          </div>
          <div className="flex-1 max-w-md mx-8 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`بحث في ${NAV_ITEMS.find(n => n.id === activeTab)?.label}...`} 
              className={INPUT_CLASS + " pr-12 h-12 text-sm"} 
            />
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 custom-scrollbar">
          {activeTab === 'home' && <HomeDashboard dresses={dresses} bookings={bookings} saleOrders={saleOrders} />}
          {activeTab === 'rent_dresses' && <RentDressesManager dresses={dresses} bookings={bookings} query={searchQuery} hasPerm={hasPerm} addLog={addLog} />}
          {activeTab === 'rent_bookings' && <RentBookingsManager dresses={dresses} bookings={bookings} query={searchQuery} hasPerm={hasPerm} addLog={addLog} />}
          {activeTab === 'sale_orders' && <SaleOrdersManager orders={saleOrders} query={searchQuery} hasPerm={hasPerm} addLog={addLog} />}
          {activeTab === 'factory' && <FactoryManager orders={saleOrders} query={searchQuery} hasPerm={hasPerm} addLog={addLog} />}
          {activeTab === 'delivery' && <DeliveryReturnManager bookings={bookings} sales={saleOrders} query={searchQuery} hasPerm={hasPerm} currentUser={currentUser} addLog={addLog} />}
          {activeTab === 'customers' && <CustomersManager bookings={bookings} sales={saleOrders} query={searchQuery} />}
          {activeTab === 'finance' && <FinanceManager finance={finance} users={users} dresses={dresses} query={searchQuery} hasPerm={hasPerm} addLog={addLog} />}
          {activeTab === 'logs' && <LogsManager logs={logs} query={searchQuery} />}
          {activeTab === 'settings' && <SettingsManager user={currentUser} users={users} hasPerm={hasPerm} addLog={addLog} onLogout={() => setCurrentUser(null)} />}
        </div>
      </main>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl lg:hidden p-8 flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-4xl font-black">القائمة</h3>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-slate-900 rounded-full"><X size={32}/></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {NAV_ITEMS.map(n => {
              if (n.id !== 'home' && !hasPerm(`view_${n.id}`)) return null;
              const Icon = { Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings }[n.icon] as any;
              return (
                <button key={n.id} onClick={() => { setActiveTab(n.id); setIsMobileMenuOpen(false); }} className={`p-8 rounded-[2.5rem] border ${activeTab === n.id ? 'bg-brand-600 border-brand-500' : 'bg-slate-900 border-white/5'} flex flex-col items-center gap-4`}>
                  <Icon size={32} /> <span className="font-bold text-xs">{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Section Components ---

function HomeDashboard({ dresses, bookings, saleOrders }: any) {
  const today = new Date().toISOString().split('T')[0];
  const weekLater = new Date(); weekLater.setDate(weekLater.getDate() + 7);
  const weekLaterStr = weekLater.toISOString().split('T')[0];

  const rentalsThisWeek = bookings.filter((b: any) => b.status === BookingStatus.PENDING && b.deliveryDate >= today && b.deliveryDate <= weekLaterStr);
  const cleaningRequired = dresses.filter((d: any) => d.status === DressStatus.CLEANING);
  const overdueSales = saleOrders.filter((s: any) => s.status !== SaleStatus.DELIVERED && s.expectedDeliveryDate < today);
  const returnsToday = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE && b.eventDate.includes(today));
  const fittingsThisWeek = bookings.filter((b: any) => b.fittingDate >= today && b.fittingDate <= weekLaterStr);

  const [activeList, setActiveList] = useState<any[]>([]);
  const [listTitle, setListTitle] = useState('');

  const stats = [
    { label: 'تسليمات الإسبوع', count: rentalsThisWeek.length, color: 'bg-blue-500', data: rentalsThisWeek, title: 'تسليمات فساتين الإيجار (أسبوع)' },
    { label: 'تحتاج غسيل', count: cleaningRequired.length, color: 'bg-orange-500', data: cleaningRequired, title: 'فساتين تحتاج تنظيف' },
    { label: 'تفصيل متأخر', count: overdueSales.length, color: 'bg-red-500', data: overdueSales, title: 'طلبات تفصيل متأخرة' },
    { label: 'مرتجعات اليوم', count: returnsToday.length, color: 'bg-emerald-500', data: returnsToday, title: 'مرتجعات اليوم المتوقعة' },
    { label: 'بروفات الإسبوع', count: fittingsThisWeek.length, color: 'bg-purple-500', data: fittingsThisWeek, title: 'بروفات الإسبوع' },
  ];

  return (
    <div className="space-y-12 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => { setActiveList(s.data); setListTitle(s.title); }} className={`${CARD_CLASS} text-center hover:scale-105 transition-all cursor-pointer border-none ${s.color} bg-opacity-20`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{s.label}</p>
            <h3 className="text-4xl font-black text-white">{s.count}</h3>
          </button>
        ))}
      </div>

      {activeList.length > 0 && (
        <div className={CARD_CLASS}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white">{listTitle}</h3>
            <button onClick={() => setActiveList([])} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="text-slate-500 text-xs uppercase border-b border-white/5">
                <tr>
                  <th className="pb-4">الاسم/الكود</th>
                  <th className="pb-4">التاريخ</th>
                  <th className="pb-4 text-left">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 font-bold">{item.customerName || item.brideName || item.name}</td>
                    <td className="py-4 text-xs font-black text-brand-400">{item.deliveryDate || item.expectedDeliveryDate || '-'}</td>
                    <td className="py-4 text-left text-xs text-slate-400">{item.dressName || item.factoryCode || item.style}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RentDressesManager({ dresses, bookings, query, hasPerm, addLog }: any) {
  const [subTab, setSubTab] = useState<'STOCK' | 'ARCHIVE' | 'EVAL'>('STOCK');
  const [modal, setModal] = useState<any>(null);

  const filtered = dresses.filter((d: any) => d.type === DressType.RENT && (d.name.includes(query) || d.style.includes(query)) && (
    subTab === 'STOCK' ? d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD :
    subTab === 'ARCHIVE' ? d.status === DressStatus.ARCHIVED || d.status === DressStatus.SOLD : true
  ));

  const sortedByEval = [...dresses].filter(d => d.type === DressType.RENT).sort((a, b) => (b.rentalCount || 0) - (a.rentalCount || 0));

  const handleSave = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('n') as string;
    if (dresses.some((d: any) => d.name === name && d.id !== modal?.id)) return alert('الاسم مكرر!');
    const data = { name, style: fd.get('s'), factoryPrice: Number(fd.get('p')), type: DressType.RENT, status: DressStatus.AVAILABLE, rentalCount: 0, createdAt: new Date().toISOString() };
    await cloudDb.add(COLLS.DRESSES, data);
    addLog('إضافة فستان', `تم إضافة فستان جديد: ${name}`);
    setModal(null);
  };

  const handleSell = async (d: Dress, e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = Number(fd.get('price'));
    await cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.SOLD, salePrice: price, customerName: fd.get('cn'), customerPhone: fd.get('cp') });
    await cloudDb.add(COLLS.FINANCE, { amount: price, type: 'INCOME', category: `بيع فستان إيجار: ${d.name}`, date: new Date().toISOString() });
    addLog('بيع فستان', `تم بيع الفستان ${d.name} للعميل ${fd.get('cn')}`);
    setModal(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex gap-2 p-1 bg-slate-900 rounded-3xl w-fit">
        <button onClick={() => setSubTab('STOCK')} className={`px-6 py-2 rounded-2xl text-xs font-bold transition-all ${subTab === 'STOCK' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>المتاحة</button>
        <button onClick={() => setSubTab('ARCHIVE')} className={`px-6 py-2 rounded-2xl text-xs font-bold transition-all ${subTab === 'ARCHIVE' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>المؤرشفة/المباعة</button>
        <button onClick={() => setSubTab('EVAL')} className={`px-6 py-2 rounded-2xl text-xs font-bold transition-all ${subTab === 'EVAL' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>التقييمات</button>
      </div>

      {subTab === 'STOCK' && hasPerm('add_rent_dress') && (
        <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY}><Plus size={20}/> إضافة فستان إيجار</button>
      )}

      {subTab === 'EVAL' ? (
        <div className={CARD_CLASS}>
          <table className="w-full text-right">
            <thead className="text-slate-500 text-[10px] uppercase"><tr><th className="pb-4">الفستان</th><th className="pb-4">عدد مرات التأجير</th></tr></thead>
            <tbody>
              {sortedByEval.map(d => (
                <tr key={d.id} className="border-b border-white/5">
                  <td className="py-4 font-bold">{d.name}</td>
                  <td className="py-4 font-black text-brand-400">{d.rentalCount || 0} مرة</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(d => (
            <div key={d.id} className={CARD_CLASS}>
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-black">{d.name}</h4>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${d.status === DressStatus.AVAILABLE ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>{d.status}</span>
              </div>
              <p className="text-xs text-slate-500 font-bold mb-6">الستايل: {d.style} • السعر: {formatCurrency(d.factoryPrice)}</p>
              <div className="flex flex-wrap gap-2">
                {d.status === DressStatus.AVAILABLE ? (
                  <button onClick={() => cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.CLEANING })} className="flex-1 py-2 bg-orange-600/10 text-orange-400 rounded-xl text-[10px] font-black">غسيل</button>
                ) : d.status === DressStatus.CLEANING ? (
                  <button onClick={() => cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.AVAILABLE })} className="flex-1 py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[10px] font-black">جاهز</button>
                ) : null}
                {subTab === 'STOCK' && (
                  <>
                    <button onClick={() => setModal({ type: 'DELETE_OPT', dress: d })} className="p-2 bg-red-500/10 text-red-400 rounded-xl"><Trash2 size={18}/></button>
                  </>
                )}
                {subTab === 'ARCHIVE' && (
                  <button onClick={() => { if(confirm('تأكيد الاستعادة؟')) cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.AVAILABLE }); }} className="flex-1 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black">استعادة كمتاح</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'ADD' && (
        <Modal title="إضافة فستان إيجار" onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <input name="n" placeholder="اسم الفستان (مميز)" className={INPUT_CLASS} required />
            <input name="s" placeholder="ستايل الفستان" className={INPUT_CLASS} required />
            <input name="p" type="number" placeholder="سعر الشراء" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-14"}>حفظ</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'DELETE_OPT' && (
        <Modal title={`خيارات الحذف: ${modal.dress.name}`} onClose={() => setModal(null)}>
          <div className="grid gap-3">
            <button onClick={() => { if(confirm('حذف نهائي؟')) { cloudDb.delete(COLLS.DRESSES, modal.dress.id); setModal(null); } }} className="p-6 bg-red-600/10 text-red-500 rounded-3xl font-black text-sm hover:bg-red-600 hover:text-white transition-all">حذف نهائي</button>
            <button onClick={() => { cloudDb.update(COLLS.DRESSES, modal.dress.id, { status: DressStatus.ARCHIVED }); setModal(null); }} className="p-6 bg-slate-800 text-white rounded-3xl font-black text-sm hover:bg-slate-700 transition-all">نقل للأرشيف</button>
            <button onClick={() => setModal({ type: 'SELL', dress: modal.dress })} className="p-6 bg-emerald-600/10 text-emerald-500 rounded-3xl font-black text-sm hover:bg-emerald-600 hover:text-white transition-all">بيع الفستان</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'SELL' && (
        <Modal title={`بيع الفستان: ${modal.dress.name}`} onClose={() => setModal(null)}>
          <form onSubmit={(e) => handleSell(modal.dress, e)} className="space-y-4">
            <input name="price" type="number" placeholder="قيمة البيع" className={INPUT_CLASS} required />
            <input name="cn" placeholder="اسم العميل" className={INPUT_CLASS} required />
            <input name="cp" placeholder="رقم هاتف العميل" className={INPUT_CLASS} required />
            <button className={BTN_PRIMARY + " w-full h-14"}>تأكيد البيع</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function RentBookingsManager({ dresses, bookings, query, hasPerm, addLog }: any) {
  const [subTab, setSubTab] = useState<'CURRENT' | 'PAST'>('CURRENT');
  const [modal, setModal] = useState<any>(null);

  const filtered = bookings.filter((b: any) => 
    (b.customerName.includes(query) || b.dressName.includes(query)) && 
    (subTab === 'CURRENT' ? b.status !== BookingStatus.COMPLETED : b.status === BookingStatus.COMPLETED)
  );

  const handleSave = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dressId = fd.get('dressId') as string;
    const eventDate = fd.get('eventDate') as string;
    const dress = dresses.find((d: any) => d.id === dressId);

    // Conflict Check
    const hasConflict = bookings.some((b: any) => {
      if (b.dressId !== dressId || b.status === BookingStatus.CANCELLED) return false;
      const bDate = new Date(b.eventDate);
      const newDate = new Date(eventDate);
      const diff = Math.abs(bDate.getTime() - newDate.getTime()) / (1000 * 3600 * 24);
      return diff <= 2;
    });

    if (hasConflict && !confirm('هذا الفستان محجوز في تاريخ قريب (أقل من يومين). هل تريد الاستمرار؟')) return;

    const price = Number(fd.get('price'));
    const deposit = Number(fd.get('deposit'));
    const data = {
      customerName: fd.get('n'), customerPhone: fd.get('ph'), customerAddress: fd.get('addr'),
      dressId, dressName: dress.name,
      eventDate, 
      deliveryDate: fd.get('deliveryDate'),
      fittingDate: fd.get('fittingDate'),
      rentalPrice: price, paidDeposit: deposit, remainingToPay: price - deposit,
      notes: fd.get('notes'),
      status: BookingStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    await cloudDb.add(COLLS.BOOKINGS, data);
    if (deposit > 0) await cloudDb.add(COLLS.FINANCE, { amount: deposit, type: 'INCOME', category: `عربون حجز: ${dress.name}`, date: new Date().toISOString() });
    addLog('حجز جديد', `تم حجز الفستان ${dress.name} للعروس ${fd.get('n')}`);
    setModal(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex gap-2 p-1 bg-slate-900 rounded-3xl w-fit">
        <button onClick={() => setSubTab('CURRENT')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'CURRENT' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>الحجوزات الحالية</button>
        <button onClick={() => setSubTab('PAST')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'PAST' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>الحجوزات السابقة</button>
      </div>

      {subTab === 'CURRENT' && hasPerm('add_booking') && (
        <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY}><Plus size={20}/> تسجيل حجز جديد</button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(b => (
          <div key={b.id} className={CARD_CLASS}>
            <div className="flex justify-between items-start mb-4">
              <div><h4 className="text-xl font-black">{b.customerName}</h4><p className="text-[10px] text-brand-400 font-black">{b.customerPhone}</p></div>
              <span className={BADGE_CLASS + " " + (b.status === BookingStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400')}>{b.status}</span>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 mb-6 space-y-2">
              <p className="text-xs text-slate-500 font-bold">الفستان: <span className="text-white">{b.dressName}</span></p>
              <p className="text-xs text-slate-500 font-bold">التسليم: <span className="text-brand-400 font-black">{b.deliveryDate}</span></p>
              <p className="text-xs text-slate-500 font-bold">البروفة: <span className="text-purple-400 font-black">{b.fittingDate}</span></p>
              <p className="text-xs text-red-400 font-black pt-2">المتبقي: {formatCurrency(b.remainingToPay)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setModal({ type: 'MEASURE', booking: b })} className="flex-1 py-3 bg-white/5 rounded-2xl text-[10px] font-black hover:bg-white/10 flex items-center justify-center gap-2"><Ruler size={14}/> المقاسات</button>
              <button onClick={() => { if(confirm('إلغاء الحجز؟')) cloudDb.update(COLLS.BOOKINGS, b.id, { status: BookingStatus.CANCELLED }); }} className="p-3 bg-red-500/10 text-red-400 rounded-2xl"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === 'ADD' && (
        <Modal title="تسجيل حجز جديد" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="n" placeholder="اسم العروس" className={INPUT_CLASS} required />
            <input name="ph" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
            <input name="addr" placeholder="العنوان (اختياري)" className={INPUT_CLASS} />
            <select name="dressId" className={INPUT_CLASS} required>
              <option value="">اختر الفستان...</option>
              {dresses.filter(d => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED).map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
              ))}
            </select>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black mr-2">تاريخ المناسبة</label>
              <input name="eventDate" type="date" className={INPUT_CLASS} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black mr-2">تاريخ التسليم</label>
              <input name="deliveryDate" type="date" className={INPUT_CLASS} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black mr-2">تاريخ البروفة</label>
              <input name="fittingDate" type="date" className={INPUT_CLASS} required />
            </div>
            <input name="price" type="number" placeholder="سعر الإيجار" className={INPUT_CLASS} required />
            <input name="deposit" type="number" placeholder="قيمة العربون" className={INPUT_CLASS} required />
            <textarea name="notes" placeholder="ملاحظات التعديلات" className={INPUT_CLASS + " md:col-span-2"} />
            <button className={BTN_PRIMARY + " md:col-span-2 h-14"}>تثبيت الحجز</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title={`المقاسات: ${modal.booking.customerName || modal.booking.brideName}`} onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {};
            MEASUREMENT_FIELDS.forEach(f => m[f.id] = fd.get(f.id));
            const coll = modal.booking ? COLLS.BOOKINGS : COLLS.SALES;
            await cloudDb.update(coll, modal.booking?.id || modal.order?.id, { measurements: m });
            addToast('تم حفظ المقاسات', 'success');
            setModal(null);
          }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MEASUREMENT_FIELDS.map(f => (
              <div key={f.id} className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black mr-1">{f.label}</label>
                {f.id === 'orderNotes' || f.id === 'materials' ? (
                  <textarea name={f.id} defaultValue={(modal.booking || modal.order)?.measurements?.[f.id]} className={INPUT_CLASS + " h-24"} />
                ) : (
                  <input name={f.id} defaultValue={(modal.booking || modal.order)?.measurements?.[f.id]} className={INPUT_CLASS} />
                )}
              </div>
            ))}
            <button className={BTN_PRIMARY + " md:col-span-3 h-14 mt-4"}>حفظ المقاسات</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SaleOrdersManager({ orders, query, hasPerm, addLog }: any) {
  const [subTab, setSubTab] = useState<'CURRENT' | 'PAST'>('CURRENT');
  const [modal, setModal] = useState<any>(null);

  const filtered = orders.filter((o: any) => 
    (o.brideName.includes(query) || o.factoryCode.includes(query)) && 
    (subTab === 'CURRENT' ? o.status !== SaleStatus.DELIVERED : o.status === SaleStatus.DELIVERED)
  );

  const handleSave = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = fd.get('code') as string;
    if (orders.some((o: any) => o.factoryCode === code && o.status !== SaleStatus.DELIVERED)) return alert('كود المصنع مكرر!');
    
    const sellPrice = Number(fd.get('sp'));
    const deposit = Number(fd.get('dep'));
    const data = {
      factoryCode: code, brideName: fd.get('n'), bridePhone: fd.get('ph'),
      description: fd.get('desc'), expectedDeliveryDate: fd.get('date'),
      sellPrice, factoryPrice: Number(fd.get('fp')), deposit, remainingFromBride: sellPrice - deposit,
      status: SaleStatus.DESIGNING, factoryStatus: FactoryPaymentStatus.UNPAID, factoryDepositPaid: 0,
      orderDate: new Date().toISOString()
    };
    await cloudDb.add(COLLS.SALES, data);
    if (deposit > 0) await cloudDb.add(COLLS.FINANCE, { amount: deposit, type: 'INCOME', category: `عربون تفصيل: ${code}`, date: new Date().toISOString() });
    addLog('طلب تفصيل', `تم تسجيل طلب تفصيل كود ${code} للعروس ${fd.get('n')}`);
    setModal(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex gap-2 p-1 bg-slate-900 rounded-3xl w-fit">
        <button onClick={() => setSubTab('CURRENT')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'CURRENT' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>الطلبات الحالية</button>
        <button onClick={() => setSubTab('PAST')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'PAST' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>الطلبات السابقة</button>
      </div>

      {subTab === 'CURRENT' && hasPerm('add_sale') && (
        <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY}><Plus size={20}/> تسجيل طلب تفصيل جديد</button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(o => (
          <div key={o.id} className={CARD_CLASS}>
            <div className="flex justify-between items-start mb-4">
              <div><h4 className="text-xl font-black">{o.brideName}</h4><p className="text-[10px] text-brand-400 font-black">{o.bridePhone}</p></div>
              <span className={BADGE_CLASS + " " + (o.status === SaleStatus.DESIGNING ? 'bg-purple-500/10 text-purple-400' : 'bg-brand-500/10 text-brand-400')}>{o.status}</span>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 mb-6 space-y-2">
              <p className="text-xs text-slate-500 font-bold">كود المصنع: <span className="text-white font-mono">{o.factoryCode}</span></p>
              <p className="text-xs text-slate-500 font-bold">الموعد: <span className="text-brand-400 font-black">{o.expectedDeliveryDate}</span></p>
              <p className="text-xs text-red-400 font-black pt-2">المتبقي: {formatCurrency(o.remainingFromBride)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setModal({ type: 'MEASURE', order: o })} className="flex-1 py-3 bg-white/5 rounded-2xl text-[10px] font-black hover:bg-white/10 flex items-center justify-center gap-2"><Ruler size={14}/> المقاسات</button>
              <button onClick={() => { if(confirm('حذف الطلب؟')) cloudDb.delete(COLLS.SALES, o.id); }} className="p-3 bg-red-500/10 text-red-400 rounded-2xl"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === 'ADD' && (
        <Modal title="طلب تفصيل جديد" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="code" placeholder="كود الفستان" className={INPUT_CLASS} required />
            <input name="n" placeholder="اسم العروس" className={INPUT_CLASS} required />
            <input name="ph" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
            <input name="date" type="date" className={INPUT_CLASS} required />
            <input name="sp" type="number" placeholder="سعر البيع" className={INPUT_CLASS} required />
            <input name="fp" type="number" placeholder="سعر المصنع" className={INPUT_CLASS} required />
            <input name="dep" type="number" placeholder="العربون" className={INPUT_CLASS} required />
            <textarea name="desc" placeholder="وصف الفستان" className={INPUT_CLASS + " md:col-span-2"} required />
            <button className={BTN_PRIMARY + " md:col-span-2 h-14"}>تثبيت الطلب</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title={`المقاسات: ${modal.order.brideName}`} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {};
            MEASUREMENT_FIELDS.forEach(f => m[f.id] = fd.get(f.id));
            await cloudDb.update(COLLS.SALES, modal.order.id, { measurements: m });
            setModal(null);
          }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MEASUREMENT_FIELDS.map(f => (
              <div key={f.id} className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black mr-1">{f.label}</label>
                {f.id === 'orderNotes' || f.id === 'materials' ? (
                  <textarea name={f.id} defaultValue={modal.order.measurements?.[f.id]} className={INPUT_CLASS + " h-24"} />
                ) : (
                  <input name={f.id} defaultValue={modal.order.measurements?.[f.id]} className={INPUT_CLASS} />
                )}
              </div>
            ))}
            <button className={BTN_PRIMARY + " md:col-span-3 h-14 mt-4"}>حفظ المقاسات</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function FactoryManager({ orders, query, hasPerm, addLog }: any) {
  const [subTab, setSubTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [modal, setModal] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = orders.filter((o: any) => 
    o.factoryCode.includes(query) && 
    (subTab === 'PENDING' ? o.factoryStatus !== FactoryPaymentStatus.PAID : o.factoryStatus === FactoryPaymentStatus.PAID)
  );

  const totalBalance = filtered.reduce((acc, curr) => acc + (curr.factoryPrice - curr.factoryDepositPaid), 0);

  const handleDepositSubmit = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let totalPaid = 0;
    for (const id of selectedIds) {
      const order = orders.find((o: any) => o.id === id);
      const amt = Number(fd.get(`amt_${id}`));
      if (amt > 0) {
        const newPaid = order.factoryDepositPaid + amt;
        await cloudDb.update(COLLS.SALES, id, { 
          factoryDepositPaid: newPaid, 
          factoryStatus: newPaid >= order.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL 
        });
        totalPaid += amt;
      }
    }
    await cloudDb.add(COLLS.FINANCE, { amount: totalPaid, type: 'EXPENSE', category: `دفع عربون مصنع لأكواد: ${selectedIds.length}`, date: new Date().toISOString() });
    addLog('دفع للمصنع', `تم دفع عربون إجمالي ${totalPaid} للمصنع`);
    setModal(null); setSelectedIds([]);
  };

  const handleFinalSubmit = async () => {
    let totalPaid = 0;
    for (const id of selectedIds) {
      const order = orders.find((o: any) => o.id === id);
      const remaining = order.factoryPrice - order.factoryDepositPaid;
      await cloudDb.update(COLLS.SALES, id, { 
        factoryDepositPaid: order.factoryPrice, 
        factoryStatus: FactoryPaymentStatus.PAID,
        factoryPaidDate: new Date().toISOString()
      });
      totalPaid += remaining;
    }
    await cloudDb.add(COLLS.FINANCE, { amount: totalPaid, type: 'EXPENSE', category: `تصفية حساب مصنع لأكواد: ${selectedIds.length}`, date: new Date().toISOString() });
    setModal(null); setSelectedIds([]);
  };

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex gap-2 p-1 bg-slate-900 rounded-3xl w-fit">
        <button onClick={() => setSubTab('PENDING')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'PENDING' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>مستحقات حالية</button>
        <button onClick={() => setSubTab('COMPLETED')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'COMPLETED' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>خالص للمصنع</button>
      </div>

      {subTab === 'PENDING' && (
        <div className="flex flex-wrap gap-4">
          <button disabled={selectedIds.length === 0} onClick={() => setModal({ type: 'DEPOSIT' })} className={BTN_PRIMARY}><DollarSign size={20}/> دفع عربون ({selectedIds.length})</button>
          <button disabled={selectedIds.length === 0} onClick={() => { if(confirm('تصفية الحساب للمختار؟')) handleFinalSubmit(); }} className={BTN_SECONDARY}><CheckCircle size={20}/> دفع تحصيل ({selectedIds.length})</button>
          <div className="bg-slate-900 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-500">إجمالي المتبقي:</span>
             <span className="text-xl font-black text-white">{formatCurrency(totalBalance)}</span>
          </div>
        </div>
      )}

      <div className={CARD_CLASS}>
        <table className="w-full text-right">
          <thead className="text-slate-500 text-[10px] uppercase border-b border-white/5">
            <tr>
              {subTab === 'PENDING' && <th className="pb-4"></th>}
              <th className="pb-4">كود المصنع</th>
              <th className="pb-4">العروس</th>
              <th className="pb-4">سعر المصنع</th>
              <th className="pb-4">المدفوع</th>
              <th className="pb-4 text-left">المتبقي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(o => (
              <tr key={o.id} className="hover:bg-white/5 cursor-pointer" onClick={() => subTab === 'PENDING' && setSelectedIds(prev => prev.includes(o.id) ? prev.filter(i => i !== o.id) : [...prev, o.id])}>
                {subTab === 'PENDING' && <td className="py-4"><div className={`w-5 h-5 rounded border ${selectedIds.includes(o.id) ? 'bg-brand-600 border-brand-500' : 'border-slate-700'}`}/></td>}
                <td className="py-4 font-mono font-bold">{o.factoryCode}</td>
                <td className="py-4 text-xs font-bold text-slate-400">{o.brideName}</td>
                <td className="py-4 text-xs">{formatCurrency(o.factoryPrice)}</td>
                <td className="py-4 text-xs text-emerald-400">{formatCurrency(o.factoryDepositPaid)}</td>
                <td className="py-4 text-xs text-red-400 font-black text-left">{formatCurrency(o.factoryPrice - o.factoryDepositPaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'DEPOSIT' && (
        <Modal title="دفع عربون للمصنع" onClose={() => setModal(null)}>
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {selectedIds.map(id => {
                const o = orders.find((x: any) => x.id === id);
                return (
                  <div key={id} className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div><p className="text-xs font-black">{o.factoryCode}</p><p className="text-[10px] text-slate-500">المتبقي: {formatCurrency(o.factoryPrice - o.factoryDepositPaid)}</p></div>
                    <input name={`amt_${id}`} type="number" placeholder="المبلغ" className={INPUT_CLASS + " w-24 h-10"} />
                  </div>
                );
              })}
            </div>
            <button className={BTN_PRIMARY + " w-full h-14"}>تأكيد الدفع</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function DeliveryReturnManager({ bookings, sales, query, hasPerm, currentUser, addLog }: any) {
  const [subTab, setSubTab] = useState<'PICKUP' | 'RETURN' | 'ARCHIVE'>('PICKUP');
  const [modal, setModal] = useState<any>(null);

  const pendingPickups = [
    ...bookings.filter((b: any) => b.status === BookingStatus.PENDING).map(b => ({ ...b, type: 'RENT' })),
    ...sales.filter((s: any) => s.status !== SaleStatus.DELIVERED).map(s => ({ ...s, type: 'SALE' }))
  ].sort((a, b) => new Date(a.eventDate || a.expectedDeliveryDate).getTime() - new Date(b.eventDate || b.expectedDeliveryDate).getTime());

  const activeReturns = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE).map(b => ({ ...b, type: 'RENT' }));

  const archiveList = [
    ...bookings.filter((b: any) => b.status === BookingStatus.COMPLETED).map(b => ({ ...b, type: 'RENT' })),
    ...sales.filter((s: any) => s.status === SaleStatus.DELIVERED).map(s => ({ ...s, type: 'SALE' }))
  ].sort((a, b) => new Date(b.actualReturnDate || b.actualDeliveryDate || 0).getTime() - new Date(a.actualReturnDate || a.actualDeliveryDate || 0).getTime());

  const handlePickup = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const balance = Number(fd.get('balance'));

    if (item.type === 'RENT') {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { 
        status: BookingStatus.ACTIVE, 
        remainingToPay: item.remainingToPay - balance,
        securityDeposit: { type: fd.get('secType') as DepositType, detail: fd.get('secDetail') as string },
        staffName: currentUser.name,
        actualPickupDate: new Date().toISOString()
      });
    } else {
      await cloudDb.update(COLLS.SALES, item.id, { 
        status: SaleStatus.DELIVERED, 
        remainingFromBride: item.remainingFromBride - balance,
        actualDeliveryDate: new Date().toISOString()
      });
    }

    if (balance > 0) await cloudDb.add(COLLS.FINANCE, { amount: balance, type: 'INCOME', category: `تحصيل عند التسليم: ${item.customerName || item.brideName}`, date: new Date().toISOString() });
    addLog('تسليم', `تم تسليم ${item.type === 'RENT' ? 'حجز' : 'طلب'} لـ ${item.customerName || item.brideName}`);
    setModal(null);
  };

  const handleReturn = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const b = modal.booking;
    const balance = Number(fd.get('balance'));
    const damageFee = Number(fd.get('damageFee') || 0);

    await cloudDb.update(COLLS.BOOKINGS, b.id, { 
      status: BookingStatus.COMPLETED, 
      remainingToPay: b.remainingToPay - balance,
      damageFee,
      actualReturnDate: new Date().toISOString()
    });

    // Update dress status to Cleaning
    const dress: any = await cloudDb.getDoc(COLLS.DRESSES, b.dressId); // added await
    await cloudDb.update(COLLS.DRESSES, b.dressId, { status: DressStatus.CLEANING, rentalCount: (dress?.rentalCount || 0) + 1 });

    if (balance > 0) await cloudDb.add(COLLS.FINANCE, { amount: balance, type: 'INCOME', category: `تحصيل عند الإرجاع: ${b.customerName}`, date: new Date().toISOString() });
    if (damageFee > 0) await cloudDb.add(COLLS.FINANCE, { amount: damageFee, type: 'INCOME', category: `غرامة تلفيات: ${b.customerName}`, date: new Date().toISOString() });
    
    addLog('استرجاع', `تم استرجاع فستان العروس ${b.customerName}`);
    setModal(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex gap-2 p-1 bg-slate-900 rounded-3xl w-fit">
        <button onClick={() => setSubTab('PICKUP')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'PICKUP' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>تسليم</button>
        <button onClick={() => setSubTab('RETURN')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'RETURN' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>إرجاع</button>
        <button onClick={() => setSubTab('ARCHIVE')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'ARCHIVE' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>الأرشيف</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(subTab === 'PICKUP' ? pendingPickups : subTab === 'RETURN' ? activeReturns : archiveList).map((item: any) => (
          <div key={item.id} className={CARD_CLASS + ` border-r-4 ${item.type === 'RENT' ? 'border-brand-500' : 'border-blue-500'}`}>
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xl font-black">{item.customerName || item.brideName}</h4>
              <span className="text-[10px] font-black uppercase text-slate-500">{item.type === 'RENT' ? 'إيجار' : 'بيع'}</span>
            </div>
            <p className="text-xs font-bold text-slate-400 mb-6">{item.dressName || item.factoryCode} • {item.eventDate || item.expectedDeliveryDate}</p>
            
            {subTab === 'PICKUP' && (
              <button onClick={() => setModal({ type: 'PICKUP', item })} className={BTN_PRIMARY + " w-full"}>تسليم للعروس</button>
            )}
            {subTab === 'RETURN' && (
              <div className="flex gap-2">
                 <button onClick={() => cloudDb.update(COLLS.BOOKINGS, item.id, { status: BookingStatus.PENDING })} className="flex-1 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black hover:bg-slate-700">تراجع عن التسليم</button>
                 <button onClick={() => setModal({ type: 'RETURN', booking: item })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black shadow-lg">استرجاع من العروس</button>
              </div>
            )}
            {subTab === 'ARCHIVE' && (
               <div className="text-[10px] text-slate-500 font-bold space-y-1">
                  <p>الموظف: {item.staffName || '-'}</p>
                  <p>تاريخ الاستلام: {item.actualPickupDate || item.actualDeliveryDate || '-'}</p>
                  <p>تاريخ الإرجاع: {item.actualReturnDate || '-'}</p>
               </div>
            )}
          </div>
        ))}
      </div>

      {modal?.type === 'PICKUP' && (
        <Modal title={`تسليم: ${modal.item.customerName || modal.item.brideName}`} onClose={() => setModal(null)}>
          <form onSubmit={handlePickup} className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 mb-4">
               <p className="text-xs text-slate-500 font-bold mb-1">المتبقي على العروس</p>
               <h3 className="text-3xl font-black text-white">{formatCurrency(modal.item.remainingToPay || modal.item.remainingFromBride)}</h3>
            </div>
            <input name="balance" type="number" placeholder="المبلغ المحصل الآن" className={INPUT_CLASS} required />
            
            {modal.item.type === 'RENT' && (
              <>
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <label className="text-[10px] text-slate-500 font-black">نوع الأمانة (الإيجار فقط)</label>
                  <select name="secType" className={INPUT_CLASS}>
                    <option value={DepositType.CASH}>مبلغ مالي</option>
                    <option value={DepositType.DOCUMENT}>مستند</option>
                    <option value={DepositType.GOLD}>قطعة ذهب</option>
                    <option value={DepositType.OTHER}>أخرى</option>
                  </select>
                  <input name="secDetail" placeholder="تفاصيل الأمانة" className={INPUT_CLASS} required />
                </div>
              </>
            )}
            <button className={BTN_PRIMARY + " w-full h-14"}>تأكيد التسليم</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'RETURN' && (
        <Modal title={`استرجاع: ${modal.booking.customerName}`} onClose={() => setModal(null)}>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold mb-1">المتبقي</p>
                  <p className="text-xl font-black text-white">{formatCurrency(modal.booking.remainingToPay)}</p>
               </div>
               <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold mb-1">الأمانة</p>
                  <p className="text-xs font-black text-brand-400">{modal.booking.securityDeposit?.detail}</p>
               </div>
            </div>
            
            <input name="balance" type="number" placeholder="تحصيل المتبقي (إن وجد)" className={INPUT_CLASS} />
            
            <div className="border-t border-white/5 pt-4">
               <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl cursor-pointer">
                  <input type="checkbox" onChange={(e) => setModal({ ...modal, hasDamage: e.target.checked })} />
                  <span className="text-xs font-black">يوجد تلف في الفستان؟</span>
               </label>
            </div>

            {modal.hasDamage && (
              <input name="damageFee" type="number" placeholder="قيمة التلفيات" className={INPUT_CLASS} required />
            )}

            <button className={BTN_PRIMARY + " w-full h-14"}>تأكيد الاسترجاع</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function FinanceManager({ finance, users, dresses, query, hasPerm, addLog }: any) {
  const [modal, setModal] = useState<any>(null);
  const [subTab, setSubTab] = useState<'LOGS' | 'ANALYTICS'>('LOGS');

  const handleSave = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get('type') as 'INCOME' | 'EXPENSE';
    const amount = Number(fd.get('amt'));
    const category = fd.get('cat') as string;

    const data: any = {
      type, amount, category, 
      notes: fd.get('notes'),
      date: fd.get('date') || new Date().toISOString(),
    };

    if (category === 'رواتب') data.targetUser = fd.get('targetUser');
    if (category === 'تنظيف' || category === 'ترزي') data.relatedDresses = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => c.value);

    await cloudDb.add(COLLS.FINANCE, data);
    addLog('حركة مالية', `تسجيل ${type === 'INCOME' ? 'وارد' : 'منصرف'}: ${category} بقيمة ${amount}`);
    setModal(null);
  };

  const totals = useMemo(() => {
    const inc = finance.filter((f: any) => f.type === 'INCOME').reduce((a: any, b: any) => a + b.amount, 0);
    const exp = finance.filter((f: any) => f.type === 'EXPENSE').reduce((a: any, b: any) => a + b.amount, 0);
    return { income: inc, expense: exp, profit: inc - exp };
  }, [finance]);

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex gap-2 p-1 bg-slate-900 rounded-3xl w-fit">
        <button onClick={() => setSubTab('LOGS')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'LOGS' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>سجل العمليات</button>
        <button onClick={() => setSubTab('ANALYTICS')} className={`px-6 py-2 rounded-2xl text-xs font-bold ${subTab === 'ANALYTICS' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>التحليل المالي</button>
      </div>

      {subTab === 'LOGS' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className={CARD_CLASS + " bg-emerald-500/10 border-emerald-500/20"}>
                <p className="text-[10px] font-black text-emerald-400 mb-2">إجمالي الإيرادات</p>
                <h3 className="text-3xl font-black">{formatCurrency(totals.income)}</h3>
             </div>
             <div className={CARD_CLASS + " bg-red-500/10 border-red-500/20"}>
                <p className="text-[10px] font-black text-red-400 mb-2">إجمالي المصروفات</p>
                <h3 className="text-3xl font-black">{formatCurrency(totals.expense)}</h3>
             </div>
             <div className={CARD_CLASS + " bg-brand-500/10 border-brand-500/20"}>
                <p className="text-[10px] font-black text-brand-400 mb-2">صافي الربح</p>
                <h3 className="text-3xl font-black">{formatCurrency(totals.profit)}</h3>
             </div>
          </div>

          {hasPerm('add_finance') && (
            <div className="flex gap-4">
               <button onClick={() => setModal({ type: 'ADD' })} className={BTN_PRIMARY}><Plus size={20}/> إضافة حركة مالية</button>
            </div>
          )}

          <div className={CARD_CLASS}>
            <table className="w-full text-right">
              <thead className="text-slate-500 text-[10px] uppercase border-b border-white/5">
                <tr><th>التاريخ</th><th>النوع</th><th>التصنيف</th><th>المبلغ</th><th className="text-left">الملاحظات</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {finance.filter((f: any) => f.category.includes(query)).map((f: any) => (
                  <tr key={f.id} className="hover:bg-white/5">
                    <td className="py-4 text-xs font-bold text-slate-400">{f.date.split('T')[0]}</td>
                    <td className="py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${f.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{f.type === 'INCOME' ? 'وارد' : 'منصرف'}</span></td>
                    <td className="py-4 font-bold text-xs">{f.category}</td>
                    <td className="py-4 text-xs font-black">{formatCurrency(f.amount)}</td>
                    <td className="py-4 text-xs text-slate-500 text-left">{f.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className={CARD_CLASS}>
              <h3 className="text-xl font-black mb-8">نظرة عامة</h3>
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'المالية', income: totals.income, expense: totals.expense }]}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                       <XAxis dataKey="name" /> <YAxis /> <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                       <Bar dataKey="income" name="إيرادات" fill="#10b981" radius={[8, 8, 0, 0]} />
                       <Bar dataKey="expense" name="مصروفات" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
           <div className={CARD_CLASS}>
              <h3 className="text-xl font-black mb-8">توزيع المصروفات</h3>
              <div className="h-64 flex items-center justify-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={[{ name: 'إيراد', value: totals.income }, { name: 'مصروف', value: totals.expense }]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          <Cell fill="#10b981" /><Cell fill="#ef4444" />
                       </Pie>
                       <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {modal?.type === 'ADD' && (
        <Modal title="إضافة حركة مالية" onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <select name="type" className={INPUT_CLASS} onChange={(e) => setModal({ ...modal, type: e.target.value })}>
              <option value="EXPENSE">منصرف</option>
              <option value="INCOME">وارد</option>
            </select>
            
            {modal.type === 'INCOME' ? (
              <input name="cat" placeholder="نوع الوارد" className={INPUT_CLASS} required />
            ) : (
              <select name="cat" className={INPUT_CLASS} onChange={(e) => setModal({ ...modal, category: e.target.value })}>
                <option value="">اختر التصنيف...</option>
                <option value="فواتير">فواتير</option>
                <option value="رواتب">رواتب</option>
                <option value="تنظيف">تنظيف</option>
                <option value="ترزي">ترزي</option>
                <option value="أخرى">أخرى</option>
              </select>
            )}

            {modal.category === 'فواتير' && (
              <select name="sub" className={INPUT_CLASS}>
                <option value="ايجار">ايجار</option>
                <option value="كهرباء">كهرباء</option>
                <option value="ماء">ماء</option>
                <option value="صيانة">صيانة</option>
                <option value="اخرى">اخرى</option>
              </select>
            )}

            {modal.category === 'رواتب' && (
              <select name="targetUser" className={INPUT_CLASS}>
                <option value="">اختر الموظف...</option>
                {users.map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            )}

            {(modal.category === 'تنظيف' || modal.category === 'ترزي') && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-slate-500 font-black mb-2">اختر الفساتين:</p>
                {dresses.filter((d: any) => d.type === DressType.RENT).map((d: any) => (
                  <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer rounded-xl transition-all">
                    <input type="checkbox" value={d.name} className="w-5 h-5 accent-brand-500" />
                    <span className="text-xs font-bold">{d.name}</span>
                  </label>
                ))}
              </div>
            )}

            <input name="amt" type="number" placeholder="المبلغ" className={INPUT_CLASS} required />
            <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className={INPUT_CLASS} />
            <textarea name="notes" placeholder="ملاحظات إضافية" className={INPUT_CLASS} />
            <button className={BTN_PRIMARY + " w-full h-14"}>تثبيت العملية</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CustomersManager({ bookings, sales, query }: any) {
  const customers = useMemo(() => {
    const list: any[] = [];
    bookings.forEach((b: any) => {
      if (!list.find(c => c.phone === b.customerPhone)) {
        list.push({ id: b.id, name: b.customerName, phone: b.customerPhone, type: 'إيجار' });
      }
    });
    sales.forEach((s: any) => {
      if (!list.find(c => c.phone === s.bridePhone)) {
        list.push({ id: s.id, name: s.brideName, phone: s.bridePhone, type: 'بيع' });
      }
    });
    return list.filter(c => c.name.includes(query) || c.phone.includes(query));
  }, [bookings, sales, query]);

  return (
    <div className={CARD_CLASS}>
      <table className="w-full text-right">
        <thead className="text-slate-500 text-[10px] uppercase border-b border-white/5">
          <tr><th>الاسم</th><th>الهاتف</th><th className="text-left">نوع التعامل</th></tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {customers.map(c => (
            <tr key={c.id}>
              <td className="py-4 font-bold">{c.name}</td>
              <td className="py-4 font-mono text-slate-400">{c.phone}</td>
              <td className="py-4 text-left"><span className="px-3 py-1 bg-brand-500/10 text-brand-400 rounded-full text-[10px] font-black">{c.type}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogsManager({ logs, query }: any) {
  return (
    <div className={CARD_CLASS}>
      <div className="space-y-4">
        {logs.filter((l: any) => l.username.includes(query) || l.action.includes(query)).reverse().slice(0, 50).map((l: any) => (
          <div key={l.id} className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
               <p className="text-sm font-bold text-brand-400">{l.action}</p>
               <p className="text-[10px] text-slate-500">{l.details}</p>
            </div>
            <div className="text-left">
               <p className="text-[10px] font-black text-white">{l.username}</p>
               <p className="text-[10px] text-slate-500">{new Date(l.timestamp).toLocaleString('ar-EG')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsManager({ user, users, hasPerm, addLog, onLogout }: any) {
  const [modal, setModal] = useState<any>(null);

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const perms = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => c.value);
    await cloudDb.add(COLLS.USERS, {
      name: fd.get('name'), username: fd.get('username'), password: '123',
      role: UserRole.EMPLOYEE, permissions: perms, firstLogin: true
    });
    addLog('إضافة موظف', `تم إضافة موظف جديد: ${fd.get('name')}`);
    setModal(null);
  };

  return (
    <div className="space-y-12 animate-fade-in">
       <div className={CARD_CLASS}>
          <h3 className="text-xl font-black mb-6">الحساب الشخصي</h3>
          <button onClick={() => setModal({ type: 'CHANGE_PASS' })} className={BTN_PRIMARY}>تغيير كلمة السر</button>
       </div>

       {hasPerm('admin_reset') && (
         <div className="space-y-8">
            <div className="flex justify-between items-center px-4">
               <h3 className="text-xl font-black">إدارة المستخدمين</h3>
               <button onClick={() => setModal({ type: 'ADD_USER' })} className={BTN_PRIMARY}><UserPlus size={20}/> إضافة موظف</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {users.map((u: any) => (
                 <div key={u.id} className={CARD_CLASS}>
                    <div className="flex justify-between items-center mb-4">
                       <div><p className="font-bold">{u.name}</p><p className="text-[10px] text-slate-500">@{u.username}</p></div>
                       <div className="flex gap-2">
                          <button onClick={() => { if(confirm('تصفير كلمة السر لـ 123؟')) cloudDb.update(COLLS.USERS, u.id, { password: '123', firstLogin: true }); }} className="p-2 text-brand-400 hover:bg-brand-500/10 rounded-xl transition-all"><Key size={18}/></button>
                          {u.id !== user.id && <button onClick={() => { if(confirm('حذف الموظف؟')) cloudDb.delete(COLLS.USERS, u.id); }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>}
                       </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                       {u.permissions.map((p: string) => <span key={p} className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{p}</span>)}
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-10 bg-red-950/20 border border-red-900 rounded-[3rem] space-y-4">
               <div className="flex items-center gap-4 text-red-500"><AlertTriangle size={32}/><h3 className="text-xl font-black">تنبيه منطقة الخطر</h3></div>
               <p className="text-sm text-slate-400 font-bold max-w-lg">خيار "ضبط المصنع" سيقوم بحذف كافة البيانات السحابية المسجلة نهائياً (فساتين، حجوزات، مالية). لا يمكن التراجع!</p>
               <button onClick={() => { if(confirm('سيتم حذف كل شيء نهائياً. هل أنت متأكد؟!')) { cloudDb.clearAll(); alert('تم تصفير النظام'); window.location.reload(); } }} className="w-full h-14 border-2 border-red-500/20 text-red-500 rounded-3xl font-black hover:bg-red-500 hover:text-white transition-all">إرجاع النظام لنقطة الصفر</button>
            </div>
         </div>
       )}

       {modal?.type === 'CHANGE_PASS' && (
         <Modal title="تغيير كلمة السر" onClose={() => setModal(null)}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const p = new FormData(e.currentTarget).get('p') as string;
              await cloudDb.update(COLLS.USERS, user.id, { password: p });
              addToast('تم التغيير بنجاح', 'success'); setModal(null);
            }} className="space-y-4">
               <input name="p" type="password" placeholder="كلمة المرور الجديدة" className={INPUT_CLASS} required />
               <button className={BTN_PRIMARY + " w-full h-14"}>حفظ</button>
            </form>
         </Modal>
       )}

       {modal?.type === 'ADD_USER' && (
         <Modal title="إضافة موظف جديد" onClose={() => setModal(null)} size="lg">
            <form onSubmit={handleAddUser} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <input name="name" placeholder="اسم الموظف" className={INPUT_CLASS} required />
                  <input name="username" placeholder="اسم المستخدم" className={INPUT_CLASS} required />
               </div>
               <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 mr-2 uppercase">الصلاحيات الممنوحة:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-950 p-4 rounded-3xl border border-white/5 max-h-60 overflow-y-auto">
                    {PERMISSIONS_LIST.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all">
                        <input type="checkbox" value={p.id} className="w-6 h-6 accent-brand-500" />
                        <span className="text-xs font-bold">{p.label}</span>
                      </label>
                    ))}
                  </div>
               </div>
               <button className={BTN_PRIMARY + " w-full h-14"}>تثبيت الموظف</button>
            </form>
         </Modal>
       )}
    </div>
  );
}

// Utility Toast (Custom Implementation)
function addToast(msg: string, type: 'success' | 'error') {
  alert(msg); // Placeholder - could be better UI
}
