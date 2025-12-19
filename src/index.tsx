
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, RefreshCw, Droplets, User, Factory, 
  RotateCcw, CheckSquare, AlertCircle, ChevronLeft, TrendingUp, TrendingDown, Bell, ShoppingBag,
  Shield, Gift, AlertTriangle, Lock, UserPlus, Database, PieChart as PieChartIcon, Undo2, BarChart3, ArrowUpRight, ArrowDownRight,
  Scissors, FileCheck, Cloud, Loader2, Tag
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import { cloudDb, isConfigured } from './services/firebase';
import { 
    User as UserType, UserRole, Dress, DressType, DressStatus, Booking, BookingStatus, 
    FinanceRecord, AuditLog, Customer, SaleOrder, 
    SaleStatus, FactoryPaymentStatus, PaymentMethod, Accessory
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Styles ---
const INPUT_CLASS = "w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-slate-500 text-sm";
const LABEL_CLASS = "block text-xs mb-1.5 text-slate-400 font-bold uppercase tracking-wider";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50";
const CARD_CLASS = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 shadow-sm";
const TABLE_HEAD_CLASS = "bg-slate-900/80 text-slate-400 font-bold text-xs uppercase tracking-wider py-4 px-4 text-right sticky top-0 backdrop-blur-md z-10";
const TABLE_ROW_CLASS = "hover:bg-slate-700/30 transition-colors border-b border-slate-800/50 last:border-0";
const BADGE_CLASS = "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border";
const COLORS = ['#d946ef', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

// --- Helpers ---
const formatDate = (iso: string) => { 
    if(!iso) return '-';
    try { return new Date(iso).toLocaleDateString('ar-EG'); } catch { return '-'; } 
};
const toInputDate = (iso: string | undefined) => { 
    if(!iso) return '';
    try { return new Date(iso).toISOString().split('T')[0]; } catch { return ''; } 
};
const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val || 0);

// --- Context & UI Components ---
const ToastContext = React.createContext<{ addToast: (msg: string, type?: 'success'|'error'|'info') => void }>({ addToast: () => {} });

const Modal = ({ title, children, onClose, size = 'md' }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full ${size === 'lg' ? 'max-w-4xl' : size === 'xl' ? 'max-w-6xl' : 'max-w-xl'} my-auto flex flex-col animate-scale-in`}>
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-brand-300 flex items-center gap-2">{title}</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[85vh]">{children}</div>
        </div>
    </div>
);

const App = () => {
    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [dresses, setDresses] = useState<Dress[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [sales, setSales] = useState<SaleOrder[]>([]);
    const [finance, setFinance] = useState<FinanceRecord[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        const unsubs = [
            cloudDb.subscribe(cloudDb.COLLS.DRESSES, setDresses),
            cloudDb.subscribe(cloudDb.COLLS.BOOKINGS, setBookings),
            cloudDb.subscribe(cloudDb.COLLS.SALES, setSales),
            cloudDb.subscribe(cloudDb.COLLS.FINANCE, setFinance),
            cloudDb.subscribe(cloudDb.COLLS.CUSTOMERS, setCustomers),
            cloudDb.subscribe(cloudDb.COLLS.USERS, setUsers),
            cloudDb.subscribe(cloudDb.COLLS.LOGS, (data) => setLogs(data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())))
        ];
        setTimeout(() => setLoading(false), 1000);
        return () => unsubs.forEach(u => u());
    }, []);

    const hasPerm = (p: string | string[]) => {
        if (user?.role === UserRole.ADMIN || user?.permissions?.includes('ALL')) return true;
        if (Array.isArray(p)) return p.some(perm => user?.permissions?.includes(perm));
        return user?.permissions?.includes(p);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><div className="text-center"><Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4"/><p className="text-brand-200">جاري الاتصال بالسحابة...</p></div></div>;
    
    // Login Screen
    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070')] bg-cover opacity-10 bg-center"></div>
            <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-2xl border border-white/10 w-96 shadow-2xl z-10 text-center">
                <div className="w-24 h-24 mb-6 rounded-full bg-slate-950 mx-auto flex items-center justify-center border-2 border-brand-500 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                    <span className="text-3xl font-bold text-brand-500 font-serif">Elaf</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-6">تسجيل الدخول</h1>
                <form onSubmit={async (e: any) => {
                    e.preventDefault();
                    const u = users.find(x => x.username.toLowerCase() === e.target.user.value.toLowerCase() && x.password === e.target.pass.value);
                    if (u) setUser(u); else if (e.target.user.value === 'admin' && e.target.pass.value === '123' && users.length === 0) {
                        const admin: UserType = { id: 'admin', username: 'admin', password: '123', role: UserRole.ADMIN, name: 'المدير', permissions: ['ALL'] };
                        await cloudDb.add(cloudDb.COLLS.USERS, admin);
                        setUser(admin);
                    } else alert('خطأ في البيانات');
                }} className="space-y-4">
                    <input name="user" className={INPUT_CLASS} placeholder="اسم المستخدم" required />
                    <input type="password" name="pass" className={INPUT_CLASS} placeholder="كلمة المرور" required />
                    <button className={BTN_PRIMARY}>دخول النظام</button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans" dir="rtl">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex w-64 bg-slate-900 border-l border-slate-800 flex-col z-20 shadow-2xl">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-white"><Shirt size={24} /></div>
                    <h1 className="font-bold text-lg">إيلاف سحابة</h1>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {NAV_ITEMS.map(item => (
                        <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${tab === item.id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                             <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-950/20 py-2 rounded-lg text-xs font-bold"><LogOut size={14} /> خروج</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative bg-slate-950">
                <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800 p-4 flex justify-between items-center lg:px-8">
                    <h2 className="text-lg font-bold">{NAV_ITEMS.find(i=>i.id===tab)?.label}</h2>
                    <div className="lg:hidden">
                        <select value={tab} onChange={(e)=>setTab(e.target.value)} className="bg-slate-900 border border-slate-700 text-xs p-2 rounded">
                            {NAV_ITEMS.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}
                        </select>
                    </div>
                    <div className="hidden lg:flex gap-2 text-xs text-slate-400"><Calendar size={14}/> {new Date().toLocaleDateString('ar-EG')}</div>
                </header>
                <div className="p-4 lg:p-8 pb-24 max-w-7xl mx-auto">
                    {tab === 'home' && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className={CARD_CLASS}>
                                <p className="text-xs text-slate-500 mb-1">فساتين الإيجار</p>
                                <h3 className="text-2xl font-bold">{dresses.filter(d=>d.type===DressType.RENT).length}</h3>
                            </div>
                            <div className={CARD_CLASS}>
                                <p className="text-xs text-slate-500 mb-1">حجوزات نشطة</p>
                                <h3 className="text-2xl font-bold text-green-500">{bookings.filter(b=>b.status===BookingStatus.ACTIVE).length}</h3>
                            </div>
                            <div className={CARD_CLASS}>
                                <p className="text-xs text-slate-500 mb-1">تسليمات اليوم</p>
                                <h3 className="text-2xl font-bold text-brand-500">{bookings.filter(b=>toInputDate(b.eventDate) === toInputDate(new Date().toISOString())).length}</h3>
                            </div>
                            <div className={CARD_CLASS}>
                                <p className="text-xs text-slate-500 mb-1">إيرادات الشهر</p>
                                <h3 className="text-2xl font-bold text-blue-500">{formatCurrency(finance.filter(f=>f.type==='INCOME' && new Date(f.date).getMonth() === new Date().getMonth()).reduce((a,b)=>a+b.amount,0))}</h3>
                            </div>
                        </div>
                    )}
                    {tab === 'dresses_rent' && <div className="text-center p-10 text-slate-500">جاري عرض الفساتين... (باقي المكونات متوفرة في كود App.tsx)</div>}
                    {/* سيتم استدعاء باقي المكونات من App.tsx بنفس المنطق */}
                </div>
                {/* Mobile Navigation Bar */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-30">
                    <button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1 ${tab==='home'?'text-brand-500':'text-slate-500'}`}><Home size={20}/><span className="text-[10px]">الرئيسية</span></button>
                    <button onClick={()=>setTab('bookings')} className={`flex flex-col items-center gap-1 ${tab==='bookings'?'text-brand-500':'text-slate-500'}`}><Calendar size={20}/><span className="text-[10px]">حجز</span></button>
                    <button onClick={()=>setTab('delivery')} className={`flex flex-col items-center gap-1 ${tab==='delivery'?'text-brand-500':'text-slate-500'}`}><Truck size={20}/><span className="text-[10px]">تسليم</span></button>
                    <button onClick={()=>setTab('finance')} className={`flex flex-col items-center gap-1 ${tab==='finance'?'text-brand-500':'text-slate-500'}`}><DollarSign size={20}/><span className="text-[10px]">خزينة</span></button>
                </nav>
            </main>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
