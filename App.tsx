
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, Droplets, User, Factory, 
  RotateCcw, AlertCircle, TrendingUp, Bell, ShoppingBag,
  Gift, AlertTriangle, Lock, Menu, MoreHorizontal,
  Scissors, FileCheck, Cloud, Loader2, Tag, Sparkles, PieChart as PieChartIcon,
  ChevronRight, Phone, MapPin, CreditCard, Trash, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { cloudDb, isConfigured } from './services/firebase';
import { 
    UserRole, DressType, DressStatus, BookingStatus, 
    SaleStatus, FactoryPaymentStatus, PaymentMethod
} from './types';
import type { 
    User as UserType, Dress, Booking, 
    FinanceRecord, AuditLog, Customer, SaleOrder, 
    Accessory
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Styles Constants ---
const INPUT_CLASS = "w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-3.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-slate-500 text-base";
const LABEL_CLASS = "block text-[11px] mb-1.5 text-slate-400 font-bold uppercase tracking-wider px-1";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-95 transition-all text-base";
const CARD_CLASS = "bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden";
const BADGE_CLASS = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border inline-flex items-center justify-center gap-1.5";

// --- Helpers ---
const formatDate = (iso: string) => { 
    if(!iso) return '-';
    try { return new Date(iso).toLocaleDateString('ar-EG'); } catch { return '-'; } 
};
const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val || 0);

const getStatusColor = (status: string) => {
    switch(status) {
        case DressStatus.AVAILABLE: return 'bg-green-500/10 text-green-400 border-green-500/20';
        case DressStatus.RENTED: return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
        case DressStatus.CLEANING: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        case BookingStatus.PENDING: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case BookingStatus.ACTIVE: return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
        case SaleStatus.DESIGNING: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case SaleStatus.READY: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
};

const Modal = ({ title, children, onClose }: any) => (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
        <div className="bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-xl flex flex-col animate-slide-in-up max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h2 className="text-lg font-bold text-brand-300">{title}</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={22}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-12">{children}</div>
        </div>
    </div>
);

// --- Section 1: Home (Dashboard) ---
const HomeManager = ({ dresses, bookings, finance }: any) => {
    const today = new Date().toDateString();
    const stats = [
        { title: 'إيجار متاح', value: dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).length, icon: Shirt, color: 'text-green-400', bg: 'bg-green-500/10' },
        { title: 'حجوزات قادمة', value: bookings.filter((b:any)=>b.status===BookingStatus.PENDING).length, icon: Calendar, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { title: 'إيراد اليوم', value: formatCurrency(finance.filter((f:any)=>f.type==='INCOME' && new Date(f.date).toDateString() === today).reduce((a:any,b:any)=>a+b.amount,0)), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { title: 'تحت التنظيف', value: dresses.filter((d:any)=>d.status===DressStatus.CLEANING).length, icon: Droplets, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className={CARD_CLASS}>
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 ${s.color}`}>
                            <s.icon size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{s.title}</p>
                        <p className="text-lg font-bold text-white mt-1">{s.value}</p>
                    </div>
                ))}
            </div>
            <div className={CARD_CLASS}>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-brand-400"/> آخر النشاطات</h3>
                <div className="space-y-3">
                    {bookings.slice(0, 3).map((b:any) => (
                        <div key={b.id} className="p-3 bg-slate-800/30 rounded-xl border border-slate-800 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-white">{b.customerName}</p>
                                <p className="text-[10px] text-slate-500">حجز فستان: {b.dressName}</p>
                            </div>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                    ))}
                    {bookings.length === 0 && <p className="text-center py-6 text-slate-600 text-xs italic">لا توجد حركات مسجلة</p>}
                </div>
            </div>
        </div>
    );
};

// --- Section 2: Dresses (Rent) ---
const DressManager = ({ dresses, onAdd, onUpdate, onDelete }: any) => {
    const [search, setSearch] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const filtered = dresses.filter((d:any) => d.name.toLowerCase().includes(search.toLowerCase()) || d.style.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-sm" placeholder="ابحث..." value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <button onClick={()=>{setEditing(null); setModalOpen(true)}} className="bg-brand-600 w-12 h-12 rounded-xl flex items-center justify-center text-white"><Plus/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((d:any) => (
                    <div key={d.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-4">
                            <div><h4 className="font-bold text-white">{d.name}</h4><p className="text-xs text-slate-500">{d.style}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(d.status)}>{d.status}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <p className="text-brand-400 font-bold">{formatCurrency(d.rentalPrice)}</p>
                            <div className="flex gap-2">
                                <button onClick={()=>{setEditing(d); setModalOpen(true)}} className="p-2 bg-slate-800 rounded-lg text-slate-400"><Edit size={16}/></button>
                                <button onClick={()=>onDelete(d.id)} className="p-2 bg-red-950/20 rounded-lg text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <Modal title={editing ? "تعديل فستان" : "إضافة فستان"} onClose={()=>setModalOpen(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const data = {
                            name: fd.get('name'), style: fd.get('style'), rentalPrice: Number(fd.get('price')), 
                            status: fd.get('status'), type: DressType.RENT, updatedAt: new Date().toISOString()
                        };
                        editing ? await onUpdate(editing.id, data) : await onAdd(data);
                        setModalOpen(false);
                    }} className="space-y-4">
                        <input name="name" defaultValue={editing?.name} placeholder="اسم الفستان" className={INPUT_CLASS} required />
                        <input name="style" defaultValue={editing?.style} placeholder="الموديل" className={INPUT_CLASS} required />
                        <input name="price" type="number" defaultValue={editing?.rentalPrice} placeholder="سعر الإيجار" className={INPUT_CLASS} required />
                        <select name="status" defaultValue={editing?.status || DressStatus.AVAILABLE} className={INPUT_CLASS}>
                            {Object.values(DressStatus).map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className={BTN_PRIMARY}>حفظ في السحابة</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Section 3: Sale Dresses (New Custom Orders) ---
const SaleManager = ({ orders, onAdd, onUpdate }: any) => {
    const [isModalOpen, setModalOpen] = useState(false);
    return (
        <div className="space-y-6">
            <button onClick={()=>setModalOpen(true)} className={BTN_PRIMARY}><ShoppingBag size={18}/> تسجيل طلب تفصيل/بيع جديد</button>
            <div className="space-y-4">
                {orders.map((o:any)=>(
                    <div key={o.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-3">
                            <h4 className="font-bold text-white">{o.brideName}</h4>
                            <span className={BADGE_CLASS + " " + getStatusColor(o.status)}>{o.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">{o.dressDescription}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
                            <div className="text-slate-500">المتبقي: <span className="text-red-400 font-bold">{formatCurrency(o.remainingFromBride)}</span></div>
                            <div className="text-slate-500">التسليم: <span className="text-brand-400 font-bold">{formatDate(o.expectedDeliveryDate)}</span></div>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <Modal title="طلب تفصيل جديد" onClose={()=>setModalOpen(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        await onAdd({
                            brideName: fd.get('name'), bridePhone: fd.get('phone'), dressDescription: fd.get('desc'),
                            sellPrice: Number(fd.get('price')), deposit: Number(fd.get('deposit')),
                            remainingFromBride: Number(fd.get('price')) - Number(fd.get('deposit')),
                            status: SaleStatus.DESIGNING, expectedDeliveryDate: fd.get('date'), createdAt: new Date().toISOString()
                        });
                        setModalOpen(false);
                    }} className="space-y-4">
                        <input name="name" placeholder="اسم العروس" className={INPUT_CLASS} required />
                        <input name="phone" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
                        <textarea name="desc" placeholder="وصف الفستان والموديل" className={INPUT_CLASS + " h-20"} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="price" type="number" placeholder="سعر البيع" className={INPUT_CLASS} required />
                            <input name="deposit" type="number" placeholder="العربون" className={INPUT_CLASS} required />
                        </div>
                        <input name="date" type="date" className={INPUT_CLASS} required />
                        <button className={BTN_PRIMARY}>تثبيت الطلب</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Section 4: Factory Management ---
const FactoryManager = ({ orders }: any) => {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2"><Factory className="text-brand-500"/> تعاملات المصانع</h3>
            {orders.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                    <Loader2 className="mx-auto mb-4 text-slate-700 animate-spin" />
                    <p className="text-slate-500 text-sm">لا توجد طلبيات للمصنع حالياً</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((o:any)=>(
                        <div key={o.id} className={CARD_CLASS}>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">كود المصنع: {o.factoryCode || 'بدون كود'}</span>
                                <span className={BADGE_CLASS + " border-brand-500/30 text-brand-400"}>{o.factoryStatus || 'غير مدفوع'}</span>
                            </div>
                            <h4 className="font-bold text-white mb-2">{o.brideName} - طلب تفصيل</h4>
                            <div className="p-3 bg-slate-800/40 rounded-xl flex justify-between items-center">
                                <span className="text-xs text-slate-400">سعر المصنع</span>
                                <span className="font-bold text-white">{formatCurrency(o.factoryPrice)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Section 5: Delivery & Returns ---
const DeliveryManager = ({ bookings, onUpdate }: any) => {
    const activeOnes = bookings.filter((b:any) => [BookingStatus.PENDING, BookingStatus.ACTIVE].includes(b.status));
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2"><Truck className="text-brand-500"/> استلام وتسليم</h3>
            <div className="space-y-4">
                {activeOnes.map((b:any)=>(
                    <div key={b.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-3">
                            <h4 className="font-bold text-white">{b.customerName}</h4>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">فستان: {b.dressName} | التاريخ: {formatDate(b.eventDate)}</p>
                        <div className="flex gap-2">
                            {b.status === BookingStatus.PENDING ? (
                                <button onClick={()=>onUpdate(b.id, {status: BookingStatus.ACTIVE})} className="flex-1 py-3 bg-brand-600 rounded-xl font-bold text-xs">تأكيد التسليم للعروس</button>
                            ) : (
                                <button onClick={()=>onUpdate(b.id, {status: BookingStatus.COMPLETED})} className="flex-1 py-3 bg-emerald-600 rounded-xl font-bold text-xs">تأكيد الإرجاع للمحل</button>
                            )}
                        </div>
                    </div>
                ))}
                {activeOnes.length === 0 && <p className="text-center py-20 text-slate-600 italic">لا توجد عمليات استلام قريبة</p>}
            </div>
        </div>
    );
};

// --- Section 6: Customer List ---
const CustomerManager = ({ customers }: any) => {
    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-3 text-sm" placeholder="ابحث عن عميلة..." />
            </div>
            <div className="space-y-3">
                {customers.map((c:any)=>(
                    <div key={c.id} className={CARD_CLASS + " flex items-center justify-between"}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-500 font-bold">{c.name[0]}</div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{c.name}</h4>
                                <p className="text-[10px] text-slate-500">{c.phone}</p>
                            </div>
                        </div>
                        <a href={`tel:${c.phone}`} className="p-3 bg-brand-600/10 text-brand-400 rounded-full"><Phone size={18}/></a>
                    </div>
                ))}
                {customers.length === 0 && <p className="text-center py-20 text-slate-600 italic">سجل العملاء فارغ</p>}
            </div>
        </div>
    );
};

// --- Section 7: Audit Logs ---
const LogManager = ({ logs }: any) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold">سجل العمليات</h3>
            <div className="space-y-3">
                {logs.slice(0, 20).map((l:any)=>(
                    <div key={l.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex gap-4">
                        <div className="text-brand-500 pt-1"><Clock size={16}/></div>
                        <div>
                            <p className="text-sm font-bold text-white">{l.action}</p>
                            <p className="text-[10px] text-slate-500">{l.username} • {formatDate(l.timestamp)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* Defined ToastContext to fix missing reference errors in App return */
// --- Contexts ---
const ToastContext = React.createContext<{
    addToast: (msg: string, type?: 'success' | 'error') => void;
}>({
    addToast: () => {},
});

// --- Main App Component ---
const App = () => {
    if (!isConfigured) return <div className="p-8 text-center text-red-500">خطأ في إعدادات السحابة.</div>;

    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
    const [toasts, setToasts] = useState<any[]>([]);

    const [dresses, setDresses] = useState<Dress[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [finance, setFinance] = useState<FinanceRecord[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<SaleOrder[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);

    const addToast = (msg: string, type: 'success'|'error' = 'success') => {
        const id = Math.random().toString();
        setToasts(prev => [...prev, {id, msg, type}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    useEffect(() => {
        const unsubs = [
            cloudDb.subscribe(cloudDb.COLLS.DRESSES, setDresses),
            cloudDb.subscribe(cloudDb.COLLS.BOOKINGS, setBookings),
            cloudDb.subscribe(cloudDb.COLLS.FINANCE, setFinance),
            cloudDb.subscribe(cloudDb.COLLS.CUSTOMERS, setCustomers),
            cloudDb.subscribe(cloudDb.COLLS.SALES, setOrders),
            cloudDb.subscribe(cloudDb.COLLS.LOGS, setLogs),
            cloudDb.subscribe(cloudDb.COLLS.USERS, setUsers),
        ];
        setTimeout(() => setLoading(false), 1500);
        return () => unsubs.forEach(u => u());
    }, []);

    const handleWipe = async (type: string) => {
        setLoading(true);
        try {
            if (type === 'all' || type === 'bookings') for (const b of bookings) await cloudDb.delete(cloudDb.COLLS.BOOKINGS, b.id);
            if (type === 'all' || type === 'finance') for (const f of finance) await cloudDb.delete(cloudDb.COLLS.FINANCE, f.id);
            if (type === 'all') for (const d of dresses) await cloudDb.delete(cloudDb.COLLS.DRESSES, d.id);
            addToast("تم تصفير البيانات المحددة", "success");
        } catch (e) { addToast("خطأ في العملية", "error"); }
        setLoading(false);
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
            <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-xs font-bold animate-pulse">مزامنة البيانات السحابية...</p>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-brand-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white"><Shirt size={30} /></div>
                    <h1 className="text-2xl font-bold text-white">إيلاف للزفاف</h1>
                    <p className="text-slate-500 text-xs mt-2">نظام الإدارة السحابي المتكامل</p>
                </div>
                <form onSubmit={(e:any)=>{
                    e.preventDefault();
                    const u = users.find(x => x.username.toLowerCase() === e.target.user.value.toLowerCase() && x.password === e.target.pass.value);
                    if(u) setUser(u); else alert('بيانات الدخول غير صحيحة');
                }} className="space-y-4">
                    <input name="user" placeholder="اسم المستخدم" className={INPUT_CLASS} required />
                    <input name="pass" type="password" placeholder="كلمة المرور" className={INPUT_CLASS} required />
                    <button className={BTN_PRIMARY}>دخول النظام</button>
                </form>
            </div>
        </div>
    );

    return (
        <ToastContext.Provider value={{ addToast }}>
            <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
                
                {/* Header */}
                <header className="fixed top-0 inset-x-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-[60]">
                    <div className="flex items-center gap-2 font-bold"><div className="p-1.5 bg-brand-600 rounded-lg"><Shirt size={16}/></div> إيلاف</div>
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <button onClick={()=>setUser(null)} className="p-2 text-slate-400"><LogOut size={18}/></button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
                    <div className="max-w-xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold">{NAV_ITEMS.find(i=>i.id===tab)?.label}</h2>
                        </div>

                        {tab === 'home' && <HomeManager dresses={dresses} bookings={bookings} finance={finance} />}
                        {tab === 'dresses_rent' && <DressManager dresses={dresses} onAdd={(d:any)=>cloudDb.add(cloudDb.COLLS.DRESSES, d)} onUpdate={(id:string, d:any)=>cloudDb.update(cloudDb.COLLS.DRESSES, id, d)} onDelete={(id:string)=>cloudDb.delete(cloudDb.COLLS.DRESSES, id)} />}
                        {tab === 'dresses_sale' && <SaleManager orders={orders} onAdd={(o:any)=>cloudDb.add(cloudDb.COLLS.SALES, o)} onUpdate={(id:string, o:any)=>cloudDb.update(cloudDb.COLLS.SALES, id, o)} />}
                        {tab === 'factory' && <FactoryManager orders={orders} />}
                        {tab === 'delivery' && <DeliveryManager bookings={bookings} onUpdate={(id:string, d:any)=>cloudDb.update(cloudDb.COLLS.BOOKINGS, id, d)} />}
                        {tab === 'customers' && <CustomerManager customers={customers} />}
                        {tab === 'logs' && <LogManager logs={logs} />}
                        {tab === 'settings' && <div className="space-y-6">
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold mb-4">إعدادات النظام</h3>
                                <p className="text-xs text-slate-500">الإصدار 1.2.0 السحابي</p>
                            </div>
                            <button onClick={()=>handleWipe('all')} className="w-full py-4 bg-red-950/20 border border-red-900/30 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2">
                                <Trash size={18}/> مسح كل البيانات السحابية
                            </button>
                        </div>}
                    </div>
                </main>

                {/* Navigation */}
                <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-900 border-t border-slate-800 flex justify-around items-center z-[60] pb-safe">
                    <button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='home'?'text-brand-500':'text-slate-500'}`}><Home size={20}/><span className="text-[9px] font-bold">الرئيسية</span></button>
                    <button onClick={()=>setTab('dresses_rent')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='dresses_rent'?'text-brand-500':'text-slate-500'}`}><Shirt size={20}/><span className="text-[9px] font-bold">الإيجار</span></button>
                    <button onClick={()=>setTab('dresses_sale')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='dresses_sale'?'text-brand-500':'text-slate-500'}`}><ShoppingBag size={20}/><span className="text-[9px] font-bold">البيع</span></button>
                    <button onClick={()=>setTab('delivery')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='delivery'?'text-brand-500':'text-slate-500'}`}><Truck size={20}/><span className="text-[9px] font-bold">الاستلام</span></button>
                    <button onClick={()=>setMoreMenuOpen(true)} className="flex flex-col items-center gap-1 flex-1 text-slate-500"><MoreHorizontal size={20}/><span className="text-[9px] font-bold">المزيد</span></button>
                </nav>

                {/* More Menu Overlay */}
                {isMoreMenuOpen && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl p-8 animate-fade-in">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-2xl font-bold text-white">كل الأقسام</h3><button onClick={()=>setMoreMenuOpen(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center"><X size={24}/></button></div>
                        <div className="grid grid-cols-2 gap-4">
                            {NAV_ITEMS.map(item => (
                                <button key={item.id} onClick={() => {setTab(item.id); setMoreMenuOpen(false)}} className={`bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 active:bg-brand-600 transition-colors ${tab===item.id?'border-brand-500':''}`}>
                                    <span className="text-xs font-bold text-slate-300">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Toasts */}
                <div className="fixed bottom-24 inset-x-4 z-[200] flex flex-col gap-2 pointer-events-none">
                    {toasts.map(t=>(
                        <div key={t.id} className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-in-up max-w-sm mx-auto w-full ${t.type==='success'?'bg-emerald-950/90 border-emerald-500/50 text-emerald-200':'bg-red-950/90 border-red-500/50 text-red-200'}`}>
                            {t.type==='success' ? <Check size={18}/> : <AlertCircle size={18}/>}
                            <span className="text-xs font-bold">{t.msg}</span>
                        </div>
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

export default App;
