
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, RefreshCw, Droplets, User, Factory, 
  RotateCcw, CheckSquare, AlertCircle, ChevronLeft, TrendingUp, TrendingDown, Bell, ShoppingBag,
  Shield, Gift, AlertTriangle, Lock, UserPlus, Database, PieChart as PieChartIcon, Undo2, BarChart3, ArrowUpRight, ArrowDownRight,
  Scissors, FileCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { db } from './services/mockDb';
import { 
    User as UserType, UserRole, Dress, DressType, DressStatus, Booking, BookingStatus, 
    FinanceRecord, AuditLog, Delivery, DepositType, Customer, SaleOrder, 
    SaleStatus, FactoryPaymentStatus, Measurements, MeasurementUnit, PaymentMethod, Accessory
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Styles Constants ---
const INPUT_CLASS = "w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-slate-500 text-sm";
const LABEL_CLASS = "block text-xs mb-1.5 text-slate-400 font-bold uppercase tracking-wider";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
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

// --- Components ---

const ToastContext = React.createContext<{ addToast: (msg: string, type?: 'success'|'error'|'info') => void }>({ addToast: () => {} });

const ToastContainer = ({ toasts, removeToast }: any) => (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3">
        {toasts.map((t: any) => (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border min-w-[300px] animate-slide-in-left ${t.type === 'success' ? 'bg-green-950/90 border-green-800 text-green-200' : t.type === 'error' ? 'bg-red-950/90 border-red-800 text-red-200' : 'bg-slate-800 border-slate-600 text-white'}`}>
                {t.type === 'success' ? <Check size={18}/> : t.type === 'error' ? <AlertCircle size={18}/> : <Bell size={18}/>}
                <span className="text-sm font-medium flex-1">{t.msg}</span>
                <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100"><X size={14}/></button>
            </div>
        ))}
    </div>
);

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><div className="text-center p-8 bg-slate-900 rounded-2xl border border-red-900"><h1 className="text-2xl font-bold text-red-500 mb-2">حدث خطأ غير متوقع</h1><button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">إعادة تحميل</button></div></div>;
    return (this as any).props.children;
  }
}

const Modal = ({ title, children, onClose, size = 'md' }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto print:hidden">
        <div className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full ${size === 'lg' ? 'max-w-4xl' : size === 'xl' ? 'max-w-6xl' : 'max-w-xl'} my-auto flex flex-col animate-scale-in`}>
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-brand-300 flex items-center gap-2">{title}</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[85vh] custom-scrollbar">{children}</div>
        </div>
    </div>
);

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-900/30 text-red-500' : 'bg-blue-900/30 text-blue-500'}`}>
                    <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm">إلغاء</button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white rounded-lg font-bold text-sm ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>تأكيد</button>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
  <div className={`${CARD_CLASS} flex items-center space-x-4 space-x-reverse hover:border-slate-600 transition-all group`}>
    <div className={`p-4 rounded-xl ${color} bg-opacity-20 group-hover:scale-110 transition-transform`}><Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} /></div>
    <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  </div>
);

const DetailedFinanceCharts = ({ finance, dresses, bookings }: { finance: FinanceRecord[], dresses: Dress[], bookings: Booking[] }) => {
    const data = useMemo(() => {
        const months = Array.from({length: 6}, (_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            return { name: d.toLocaleString('ar-EG', {month: 'short'}), income: 0, expense: 0, sort: d.getTime() };
        }).reverse();

        finance.forEach(f => {
            const fDate = new Date(f.date);
            const month = months.find(m => m.name === fDate.toLocaleString('ar-EG', {month: 'short'}));
            if(month) { if(f.type === 'INCOME') month.income += f.amount; else month.expense += f.amount; }
        });
        return months;
    }, [finance]);

    const expenseData = useMemo(() => {
        const cats: any = {};
        finance.filter(f=>f.type === 'EXPENSE').forEach(f => {
            const c = f.category.split('-')[0].trim();
            cats[c] = (cats[c] || 0) + f.amount;
        });
        return Object.entries(cats).map(([name, value]) => ({name, value}));
    }, [finance]);

    const profitData = useMemo(() => {
        return dresses
            .filter(d => d.type === DressType.RENT)
            .map(d => {
                const dressBookings = bookings.filter(b => b.dressId === d.id && b.status !== BookingStatus.CANCELLED);
                const income = dressBookings.reduce((sum, b) => sum + (b.agreedRentalPrice || 0), 0);
                const initialCost = d.factoryPrice || 0;
                const maintenanceCost = finance.filter(f => f.type === 'EXPENSE' && f.notes.includes(d.name)).reduce((sum, f) => sum + f.amount, 0);
                const totalExpense = initialCost + maintenanceCost;
                return { name: d.name, income, expense: totalExpense, profit: income - totalExpense, roi: totalExpense > 0 ? ((income - totalExpense) / totalExpense) * 100 : 0 };
            })
            .sort((a,b) => b.profit - a.profit);
    }, [dresses, bookings, finance]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={CARD_CLASS}>
                    <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-green-500"/> الإيرادات والمصروفات</h3>
                    <div className="h-64 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" /><YAxis stroke="#94a3b8" tickFormatter={(v) => `${v/1000}k`} /><RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} /><Legend /><Bar dataKey="income" name="إيرادات" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="مصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className={CARD_CLASS}>
                    <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2"><PieChartIcon size={20} className="text-purple-500"/> تحليل المصروفات</h3>
                    <div className="h-64 w-full text-xs flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{(expenseData as any[]).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className={CARD_CLASS}>
                 <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-brand-500"/> تحليل ربحية الفساتين (الأعلى ربحاً)</h3>
                 <div className="h-64 w-full text-xs mb-6">
                        <ResponsiveContainer width="100%" height="100%"><BarChart data={profitData.slice(0, 10)} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} /><XAxis type="number" stroke="#94a3b8" /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} /><RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} cursor={{fill: '#334155', opacity: 0.2}} /><Bar dataKey="profit" name="صافي الربح" fill="#d946ef" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};

const Login = ({ onLogin }: { onLogin: (u: UserType) => void }) => {
    const [user, setU] = useState(''); const [pass, setP] = useState(''); const [err, setE] = useState('');
    const handle = (e: any) => {
        e.preventDefault();
        db.init(); 
        const users = db.get<UserType>(db.KEYS.USERS);
        const u = users.find(x => x.username.toLowerCase() === user.toLowerCase() && x.password === pass);
        if (u) onLogin(u); else setE('بيانات غير صحيحة');
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070')] bg-cover opacity-20 bg-center"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
            <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 w-96 shadow-2xl z-10 animate-fade-in flex flex-col items-center">
                <div className="w-32 h-32 mb-6 rounded-full bg-slate-100 p-1 flex items-center justify-center shadow-[0_0_40px_rgba(217,70,239,0.3)]">
                     <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                         <img src="/Logo.png" alt="Elaf" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-3xl font-bold text-brand-500 font-serif">Elaf</span>'; }} />
                     </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">تسجيل الدخول</h1>
                <p className="text-slate-400 text-sm mb-6">نظام إدارة فساتين الزفاف</p>
                <form onSubmit={handle} className="space-y-4 w-full">
                    <div><label className={LABEL_CLASS}>اسم المستخدم</label><input value={user} onChange={e=>setU(e.target.value)} className={INPUT_CLASS} placeholder="admin" autoFocus /></div>
                    <div><label className={LABEL_CLASS}>كلمة المرور</label><input type="password" value={pass} onChange={e=>setP(e.target.value)} className={INPUT_CLASS} placeholder="••••" /></div>
                    {err && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">{err}</div>}
                    <button className={BTN_PRIMARY}>دخول النظام</button>
                </form>
            </div>
        </div>
    );
};

const PrePrintedInvoice = ({ data, type, onClose }: {data: any, type: string, onClose: () => void}) => {
    if (type === 'ORDER_DETAILS') {
        const date = new Date();
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const dayName = days[date.getDay()];
        
        return (
            <div className="fixed inset-0 z-[200] bg-white text-black flex flex-col overflow-y-auto">
                 <div className="p-4 bg-gray-100 flex justify-between items-center print:hidden border-b">
                    <h2 className="font-bold text-lg">تفاصيل الأوردر</h2>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"><Printer size={16}/> طباعة</button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 font-bold">إغلاق</button>
                    </div>
                </div>
                <div className="p-8 max-w-[210mm] mx-auto w-full bg-white min-h-screen">
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 mx-auto mb-2 bg-black rounded-full flex items-center justify-center text-white font-serif text-2xl font-bold">ELAF</div>
                        <h1 className="text-3xl font-bold font-serif">Elaf For Wedding Dress</h1>
                    </div>
                    
                    <div className="flex justify-between border-t-2 border-b-2 border-black py-3 mb-6 font-bold text-sm">
                        <div className="text-right">
                            <p>التاريخ: {date.toLocaleDateString('ar-EG')}</p>
                            <p>اليوم: {dayName}</p>
                        </div>
                         <div className="text-left">
                            <p>العروس: {data.brideName}</p>
                            <p>كود الموديل: {data.factoryCode}</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-3 border-b border-gray-300 inline-block pb-1">جدول المقاسات (سم)</h3>
                        <div className="grid grid-cols-3 gap-y-3 gap-x-8 text-sm">
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الرقبة:</span><span className="font-bold">{data.measurements?.neck || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الكتف:</span><span className="font-bold">{data.measurements?.shoulder || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الصدر:</span><span className="font-bold">{data.measurements?.chest || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط تحت الصدر:</span><span className="font-bold">{data.measurements?.underChest || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>طول بنس الصدر:</span><span className="font-bold">{data.measurements?.chestDart || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الخصر:</span><span className="font-bold">{data.measurements?.waist || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>طول الظهر:</span><span className="font-bold">{data.measurements?.backLength || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الهانش:</span><span className="font-bold">{data.measurements?.hips || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>الطول الكامل:</span><span className="font-bold">{data.measurements?.fullLength || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>طول اليد:</span><span className="font-bold">{data.measurements?.sleeve || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الابط:</span><span className="font-bold">{data.measurements?.armhole || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الذراع:</span><span className="font-bold">{data.measurements?.arm || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الساعد:</span><span className="font-bold">{data.measurements?.forearm || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط الاسواره:</span><span className="font-bold">{data.measurements?.wrist || '-'}</span></div>
                            <div className="flex justify-between border-b border-dotted border-gray-400 pb-1"><span>محيط فتحة الرجل:</span><span className="font-bold">{data.measurements?.legOpening || '-'}</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <h3 className="font-bold text-lg mb-2 border-b border-gray-300">تفاصيل التصميم</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-bold">نوع الصدر:</span> {data.measurements?.bustType || '-'}</p>
                                <p><span className="font-bold">نوع التنورة:</span> {data.measurements?.skirtType || '-'}</p>
                            </div>
                        </div>
                        <div>
                             <h3 className="font-bold text-lg mb-2 border-b border-gray-300">الخامات</h3>
                             <p className="text-sm whitespace-pre-wrap">{data.measurements?.materials || '-'}</p>
                        </div>
                    </div>

                    <div className="border-2 border-black p-4 min-h-[150px] rounded">
                        <h3 className="font-bold mb-2 underline">الشرح المطلوب للأوردر (الملاحظات)</h3>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.measurements?.orderNotes || data.dressDescription || '-'}</p>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-white text-black flex flex-col overflow-y-auto">
            <div className="p-4 bg-gray-100 flex justify-between items-center print:hidden border-b">
                <h2 className="font-bold text-lg">معاينة الطباعة</h2>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"><Printer size={16}/> طباعة</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 font-bold">إغلاق</button>
                </div>
            </div>
            <div className="p-8 max-w-4xl mx-auto w-full bg-white min-h-screen">
                <div className="text-center border-b-2 border-black pb-6 mb-8">
                    <h1 className="text-4xl font-bold font-serif mb-2">Elaf Wedding</h1>
                    <p className="text-gray-600">{type === 'BOOKING' ? 'عقد إيجار فستان' : type === 'SALE' ? 'عقد تفصيل/بيع' : 'سند استلام'}</p>
                    <p className="text-sm mt-2">{new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                {/* Simplified generic invoice content */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold border-b border-gray-300 mb-2">بيانات العميل</h3>
                            <p><span className="font-bold">الاسم:</span> {data.customerName || data.brideName}</p>
                            <p><span className="font-bold">الهاتف:</span> {data.customerPhone || data.bridePhone}</p>
                        </div>
                        <div>
                            <h3 className="font-bold border-b border-gray-300 mb-2">بيانات الفستان</h3>
                            <p><span className="font-bold">الموديل:</span> {data.dressName || data.dressDescription}</p>
                            <p><span className="font-bold">السعر:</span> {formatCurrency(data.agreedRentalPrice || data.sellPrice)}</p>
                        </div>
                    </div>
                    {data.notes && (
                        <div>
                             <h3 className="font-bold border-b border-gray-300 mb-2">ملاحظات</h3>
                             <p className="text-sm">{data.notes}</p>
                        </div>
                    )}
                    <div className="border-t-2 border-black pt-4 mt-12 flex justify-between px-8">
                         <div className="text-center"><p className="font-bold mb-8">توقيع العميل</p><p>....................</p></div>
                         <div className="text-center"><p className="font-bold mb-8">توقيع الموظف</p><p>....................</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Application ---
const App = () => {
    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [ts, setTs] = useState(Date.now());
    const [toasts, setToasts] = useState<{id: string, msg: string, type: 'success'|'error'|'info'}[]>([]);
    const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
    const [printData, setPrintData] = useState<{data: any, type: string} | null>(null);
    const [autoOpenPass, setAutoOpenPass] = useState(false);

    const addToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
        const id = Math.random().toString();
        setToasts(prev => [...prev, {id, msg, type}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
    
    const confirmAction = (title: string, message: string, onConfirm: () => void) => {
        setConfirmState({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setConfirmState(prev => ({...prev, isOpen: false})); }});
    };

    const refresh = () => setTs(Date.now());
    useEffect(() => db.init(), []);

    // Check for default password on login
    useEffect(() => {
        if(user && user.password === '123') {
            confirmAction(
                'تنبيه أمان هام', 
                'كلمة المرور الخاصة بك هي الافتراضية (123). لأمان النظام، يرجى تغييرها الآن. هل تريد الانتقال لصفحة تغيير كلمة المرور؟',
                () => {
                    setTab('settings');
                    setAutoOpenPass(true);
                }
            );
        }
    }, [user]);

    const safe = <T,>(k: string): T[] => { try { return db.get<T>(k) || []; } catch { return []; } };
    const dresses = useMemo(() => safe<Dress>(db.KEYS.DRESSES), [ts]);
    const sales = useMemo(() => safe<SaleOrder>(db.KEYS.SALE_ORDERS), [ts]);
    const bookings = useMemo(() => safe<Booking>(db.KEYS.BOOKINGS), [ts]);
    const finance = useMemo(() => safe<FinanceRecord>(db.KEYS.FINANCE), [ts]);
    const customers = useMemo(() => safe<Customer>(db.KEYS.CUSTOMERS), [ts]);
    const logs = useMemo(() => safe<AuditLog>(db.KEYS.AUDIT), [ts]);
    const users = useMemo(() => safe<UserType>(db.KEYS.USERS), [ts]);

    const activeBookingsCount = bookings.filter(b => b.status === BookingStatus.ACTIVE).length;
    const today = toInputDate(new Date().toISOString());
    // Updated permission checker to handle logic OR
    const hasPerm = (p: string | string[]) => {
        if (user?.role === UserRole.ADMIN || user?.permissions?.includes('ALL')) return true;
        if (Array.isArray(p)) return p.some(perm => user?.permissions?.includes(perm));
        return user?.permissions?.includes(p);
    };

    // --- Sub-Managers ---

    const RentalManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [editing, setEditing] = useState<Dress|null>(null);
        const [search, setSearch] = useState('');
        const [view, setView] = useState<'CURRENT'|'ARCHIVED'|'ANALYTICS'>('CURRENT');
        
        const filteredDresses = dresses.filter(d => 
            d.type === DressType.RENT && 
            (view === 'ARCHIVED' ? d.status === DressStatus.ARCHIVED : d.status !== DressStatus.ARCHIVED) &&
            (d.name.includes(search) || d.style.includes(search))
        );

        // Calculate next rental date for each dress
        const getNextRental = (id: string) => {
            const upcoming = bookings
                .filter(b => b.dressId === id && b.status !== BookingStatus.CANCELLED && new Date(b.eventDate) >= new Date())
                .sort((a,b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
            return upcoming.length > 0 ? upcoming[0].eventDate : null;
        };

        const analyticsData = useMemo(() => {
            return dresses.filter(d => d.type === DressType.RENT).map(d => {
                const dressBookings = bookings.filter(b => b.dressId === d.id);
                // Find last rental date
                const sortedBookings = [...dressBookings].sort((a,b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
                const lastRental = sortedBookings.length > 0 ? sortedBookings[0].eventDate : null;
                const totalIncome = dressBookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((a,b) => a + (b.agreedRentalPrice || 0), 0);

                return {
                    ...d,
                    realRentalCount: dressBookings.length,
                    lastRental,
                    totalIncome
                };
            }).sort((a,b) => b.realRentalCount - a.realRentalCount); // Sort by popularity
        }, [dresses, bookings]);

        const handleSave = (e: any) => {
            e.preventDefault(); const f = e.target;
            const l = safe<Dress>(db.KEYS.DRESSES);
            const newItem: Dress = {
                id: editing ? editing.id : `DR-${Math.random().toString(36).substr(2,9)}`,
                name: f.name.value,
                style: f.style.value,
                type: DressType.RENT,
                factoryPrice: Number(f.factoryPrice.value),
                // rentalPrice removed from input, optional now
                rentalPrice: editing ? editing.rentalPrice : 0, 
                status: editing ? editing.status : DressStatus.AVAILABLE,
                image: '', notes: f.notes.value,
                purchaseDate: editing ? editing.purchaseDate : new Date().toISOString(), // Auto set to now if new
                createdAt: editing ? editing.createdAt : new Date().toISOString(),
                rentalCount: editing ? editing.rentalCount : 0
            };
            if(editing) { const idx = l.findIndex(x=>x.id===editing.id); if(idx>-1) l[idx]=newItem; }
            else l.push(newItem);
            db.set(db.KEYS.DRESSES, l); setShowModal(false); setEditing(null); refresh(); addToast('تم الحفظ', 'success');
        };

        const archiveDress = (d: Dress) => confirmAction('أرشفة الفستان', 'هل تريد نقل الفستان للأرشيف؟', () => {
             const l = safe<Dress>(db.KEYS.DRESSES); 
             l.find(x=>x.id===d.id)!.status = DressStatus.ARCHIVED;
             db.set(db.KEYS.DRESSES, l); refresh(); addToast('تمت الأرشفة', 'info');
        });

        const restoreDress = (d: Dress) => confirmAction('استرجاع الفستان', 'هل تريد استرجاع الفستان ليكون متاحاً؟', () => {
            const l = safe<Dress>(db.KEYS.DRESSES); 
            l.find(x=>x.id===d.id)!.status = DressStatus.AVAILABLE;
            db.set(db.KEYS.DRESSES, l); refresh(); addToast('تم الاسترجاع', 'success');
       });

       const deletePermanently = (d: Dress) => confirmAction('حذف نهائي', 'تحذير: سيتم حذف الفستان نهائياً ولا يمكن التراجع. هل أنت متأكد؟', () => {
            const l = safe<Dress>(db.KEYS.DRESSES).filter(x => x.id !== d.id);
            db.set(db.KEYS.DRESSES, l);
            refresh(); addToast('تم الحذف نهائياً', 'error');
       });

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit">
                        <button onClick={()=>setView('CURRENT')} className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${view==='CURRENT' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>المخزون الحالي</button>
                        <button onClick={()=>setView('ARCHIVED')} className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${view==='ARCHIVED' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الأرشيف</button>
                        {hasPerm('dresses_rent_analytics') && <button onClick={()=>setView('ANALYTICS')} className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${view==='ANALYTICS' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>تقارير الأداء</button>}
                    </div>
                    {view !== 'ANALYTICS' && (
                        <div className="flex gap-2">
                            <div className="relative"><Search className="absolute right-3 top-2.5 text-slate-500" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className={`${INPUT_CLASS} pr-10`} /></div>
                            {hasPerm('dresses_rent_add') && <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> إضافة فستان</button>}
                        </div>
                    )}
                </div>

                {view === 'ANALYTICS' && (
                    <div className={CARD_CLASS}>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-brand-300"><TrendingUp size={20}/> تحليل أداء الفساتين (الأكثر طلباً)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 font-bold text-xs uppercase">
                                        <th className="p-3">#</th>
                                        <th className="p-3">الفستان</th>
                                        <th className="p-3">عدد مرات التأجير</th>
                                        <th className="p-3">تاريخ آخر تأجير</th>
                                        <th className="p-3">إجمالي الإيراد</th>
                                        <th className="p-3">الحالة الحالية</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analyticsData.map((d, i) => (
                                        <tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-700/30">
                                            <td className="p-3 font-mono text-slate-500">{i + 1}</td>
                                            <td className="p-3 font-bold">{d.name} <span className="text-xs text-slate-500 font-normal">({d.style})</span></td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 bg-slate-700 rounded-full w-24 overflow-hidden">
                                                        <div className="h-full bg-brand-500" style={{width: `${Math.min((d.realRentalCount/20)*100, 100)}%`}}></div>
                                                    </div>
                                                    <span className="font-bold text-brand-400">{d.realRentalCount}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-slate-300">{d.lastRental ? formatDate(d.lastRental) : 'لم يؤجر بعد'}</td>
                                            <td className="p-3 text-green-400 font-mono">{formatCurrency(d.totalIncome)}</td>
                                            <td className="p-3"><span className={BADGE_CLASS}>{d.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {view === 'ARCHIVED' && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                         <table className="w-full text-right text-sm">
                            <thead>
                                <tr>
                                    <th className={TABLE_HEAD_CLASS}>اسم الفستان</th>
                                    <th className={TABLE_HEAD_CLASS}>الموديل</th>
                                    <th className={TABLE_HEAD_CLASS}>مرات التأجير</th>
                                    <th className={TABLE_HEAD_CLASS}>تاريخ الشراء</th>
                                    <th className={TABLE_HEAD_CLASS}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDresses.map(d => (
                                    <tr key={d.id} className={TABLE_ROW_CLASS}>
                                        <td className="p-4 font-bold">{d.name}</td>
                                        <td className="p-4">{d.style}</td>
                                        <td className="p-4">{d.rentalCount || 0}</td>
                                        <td className="p-4">{formatDate(d.purchaseDate)}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={()=>restoreDress(d)} className="px-3 py-1 bg-green-900/20 hover:bg-green-900/50 text-green-400 rounded text-xs font-bold flex items-center gap-1"><Undo2 size={14}/> استرجاع</button>
                                            <button onClick={()=>deletePermanently(d)} className="px-3 py-1 bg-red-900/20 hover:bg-red-900/50 text-red-400 rounded text-xs font-bold flex items-center gap-1"><Trash2 size={14}/> حذف نهائي</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {view === 'CURRENT' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDresses.map(d => {
                            const nextDate = getNextRental(d.id);
                            return (
                                <div key={d.id} className={CARD_CLASS}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg">{d.name}</h4>
                                        <span className={`${BADGE_CLASS} ${d.status===DressStatus.AVAILABLE?'bg-green-900/30 text-green-400 border-green-900': d.status===DressStatus.ARCHIVED ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-red-900/30 text-red-400 border-red-900'}`}>{d.status}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-2">الموديل: {d.style}</p>
                                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded mb-3">
                                        <span className="text-xs text-slate-500">أقرب إيجار</span>
                                        <span className={`font-bold ${nextDate ? 'text-brand-400' : 'text-slate-400'}`}>
                                            {nextDate ? formatDate(nextDate) : 'غير محجوز'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={()=>{setEditing(d); setShowModal(true)}} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-white transition-colors">تعديل</button>
                                        <button onClick={()=>archiveDress(d)} className="px-3 bg-red-900/20 hover:bg-red-900/50 text-red-400 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {showModal && (
                    <Modal title={editing ? 'تعديل فستان' : 'إضافة فستان جديد'} onClose={()=>{setShowModal(false); setEditing(null)}}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div><label className={LABEL_CLASS}>اسم الفستان</label><input name="name" defaultValue={editing?.name} required className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>القصة / الموديل</label><input name="style" defaultValue={editing?.style} className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>سعر الشراء/المصنع</label><input type="number" name="factoryPrice" defaultValue={editing?.factoryPrice} className={INPUT_CLASS}/></div>
                            {!editing && (
                                <div className="p-3 bg-slate-800 rounded border border-slate-700 text-xs text-slate-400">
                                    سيتم تسجيل تاريخ الشراء تلقائياً بتاريخ اليوم.
                                </div>
                            )}
                            <div><label className={LABEL_CLASS}>ملاحظات</label><textarea name="notes" defaultValue={editing?.notes} className={INPUT_CLASS}></textarea></div>
                            <button className={BTN_PRIMARY}>حفظ البيانات</button>
                        </form>
                    </Modal>
                )}
            </div>
        );
    };

    const BookingManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [editing, setEditing] = useState<Booking|null>(null);
        const [search, setSearch] = useState('');
        
        const handleSave = (e: any) => {
            e.preventDefault(); const f = e.target;
            const l = safe<Booking>(db.KEYS.BOOKINGS);
            
            // Basic validation
            if (!f.dressId.value) { addToast('يجب اختيار فستان', 'error'); return; }

            const price = Number(f.price.value);
            const deposit = Number(f.deposit.value);
            const dress = dresses.find(d => d.id === f.dressId.value);
            
            const newItem: Booking = {
                id: editing ? editing.id : `BK-${Math.random().toString(36).substr(2,7).toUpperCase()}`,
                customerId: editing ? editing.customerId : `CUST-${Math.random().toString(36).substr(2,7)}`, 
                customerName: f.customerName.value,
                customerPhone: f.customerPhone.value,
                dressId: f.dressId.value,
                dressName: dress ? dress.name : (editing?.dressName || ''),
                eventDate: f.eventDate.value,
                bookingDate: editing ? editing.bookingDate : new Date().toISOString(),
                agreedRentalPrice: price,
                paidDeposit: deposit,
                remainingToPay: price - deposit,
                paymentMethod: f.paymentMethod.value,
                notes: f.notes.value,
                status: editing ? editing.status : BookingStatus.PENDING,
                createdAt: editing ? editing.createdAt : new Date().toISOString(),
                deliveryDetails: editing?.deliveryDetails,
                returnDetails: editing?.returnDetails
            };

            // If new booking, record deposit income
            if (!editing && deposit > 0) {
                 const fin = safe<FinanceRecord>(db.KEYS.FINANCE);
                 fin.push({
                    id: `INC-BK-${Math.random()}`,
                    date: new Date().toISOString(),
                    type: 'INCOME',
                    category: 'عربون حجز',
                    amount: deposit,
                    notes: `حجز ${newItem.id} - ${newItem.customerName}`,
                    createdBy: user?.username
                });
                db.set(db.KEYS.FINANCE, fin);
            }

            if(editing) { const idx = l.findIndex(x=>x.id===editing.id); if(idx>-1) l[idx]=newItem; }
            else l.push(newItem);
            
            db.set(db.KEYS.BOOKINGS, l); setShowModal(false); setEditing(null); refresh(); addToast('تم حفظ الحجز', 'success');
        };

        const handleDelete = (b: Booking) => confirmAction('إلغاء الحجز', 'هل أنت متأكد من إلغاء هذا الحجز؟', () => {
             const l = safe<Booking>(db.KEYS.BOOKINGS);
             const item = l.find(x=>x.id===b.id);
             if(item) {
                 item.status = BookingStatus.CANCELLED;
                 db.set(db.KEYS.BOOKINGS, l);
                 refresh(); addToast('تم إلغاء الحجز', 'info');
             }
        });

        const filtered = bookings.filter(b => b.status !== BookingStatus.CANCELLED && (b.customerName.includes(search) || b.dressName.includes(search) || b.id.includes(search))).sort((a,b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

        return (
            <div className="space-y-4 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">إدارة الحجوزات</h3>
                    <div className="flex gap-2">
                        <div className="relative"><Search className="absolute right-3 top-2.5 text-slate-500" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className={`${INPUT_CLASS} pr-10`} /></div>
                        {hasPerm('bookings_add') && <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> حجز جديد</button>}
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-right text-sm">
                        <thead>
                            <tr>
                                <th className={TABLE_HEAD_CLASS}>رقم الحجز</th>
                                <th className={TABLE_HEAD_CLASS}>العميلة</th>
                                <th className={TABLE_HEAD_CLASS}>الفستان</th>
                                <th className={TABLE_HEAD_CLASS}>التاريخ</th>
                                <th className={TABLE_HEAD_CLASS}>الحساب</th>
                                <th className={TABLE_HEAD_CLASS}>الحالة</th>
                                <th className={TABLE_HEAD_CLASS}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(b => (
                                <tr key={b.id} className={TABLE_ROW_CLASS}>
                                    <td className="p-4 font-mono text-xs">{b.id}</td>
                                    <td className="p-4 font-bold">{b.customerName}<div className="text-[10px] font-normal text-slate-500">{b.customerPhone}</div></td>
                                    <td className="p-4">{b.dressName}</td>
                                    <td className="p-4">{formatDate(b.eventDate)}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-xs">
                                            <span>إجمالي: {formatCurrency(b.agreedRentalPrice)}</span>
                                            {b.remainingToPay > 0 ? <span className="text-red-400 font-bold">متبقي: {formatCurrency(b.remainingToPay)}</span> : <span className="text-green-400">خالص</span>}
                                        </div>
                                    </td>
                                    <td className="p-4"><span className={`${BADGE_CLASS} ${b.status===BookingStatus.ACTIVE?'bg-green-900/30 text-green-400': b.status===BookingStatus.COMPLETED?'bg-slate-700 text-slate-300':'bg-blue-900/30 text-blue-400'}`}>{b.status}</span></td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={()=>{setEditing(b); setShowModal(true)}} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><Edit size={16}/></button>
                                        <button onClick={()=>setPrintData({data: b, type: 'BOOKING'})} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><Printer size={16}/></button>
                                        {hasPerm('bookings_delete') && <button onClick={()=>handleDelete(b)} className="p-1.5 hover:bg-red-900/30 rounded text-red-400"><Trash2 size={16}/></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <Modal title={editing ? 'تعديل حجز' : 'حجز جديد'} onClose={()=>{setShowModal(false); setEditing(null)}}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={LABEL_CLASS}>اسم العروس</label><input name="customerName" defaultValue={editing?.customerName} required className={INPUT_CLASS}/></div>
                                <div><label className={LABEL_CLASS}>رقم الهاتف</label><input name="customerPhone" defaultValue={editing?.customerPhone} required className={INPUT_CLASS}/></div>
                            </div>
                            
                            <div>
                                <label className={LABEL_CLASS}>الفستان</label>
                                <select name="dressId" defaultValue={editing?.dressId} required className={INPUT_CLASS}>
                                    <option value="">اختر الفستان...</option>
                                    {dresses.filter(d => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED).map(d => (
                                        <option key={d.id} value={d.id}>{d.name} - {d.style}</option>
                                    ))}
                                </select>
                            </div>

                            <div><label className={LABEL_CLASS}>تاريخ المناسبة</label><input type="date" name="eventDate" defaultValue={toInputDate(editing?.eventDate)} required className={INPUT_CLASS}/></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={LABEL_CLASS}>سعر الإيجار</label><input type="number" name="price" defaultValue={editing?.agreedRentalPrice} required className={INPUT_CLASS}/></div>
                                <div><label className={LABEL_CLASS}>العربون</label><input type="number" name="deposit" defaultValue={editing?.paidDeposit} required className={INPUT_CLASS}/></div>
                            </div>
                            
                            <div>
                                <label className={LABEL_CLASS}>طريقة الدفع</label>
                                <select name="paymentMethod" defaultValue={editing?.paymentMethod || PaymentMethod.CASH_EGP} className={INPUT_CLASS}>
                                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div><label className={LABEL_CLASS}>ملاحظات</label><textarea name="notes" defaultValue={editing?.notes} className={INPUT_CLASS}></textarea></div>

                            <button className={BTN_PRIMARY}>حفظ الحجز</button>
                        </form>
                    </Modal>
                )}
            </div>
        );
    };

    const SalesManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [showMeasures, setShowMeasures] = useState<{show: boolean, order: SaleOrder|null}>({show: false, order: null});
        const [deliveryModal, setDeliveryModal] = useState<{show: boolean, order: SaleOrder|null}>({show: false, order: null});
        const [editing, setEditing] = useState<SaleOrder|null>(null);
        const [saleTab, setSaleTab] = useState<'DESIGN'|'DELIVERED'>('DESIGN');
        
        const handleSave = (e: any) => {
            e.preventDefault(); const f = e.target;
            const l = safe<SaleOrder>(db.KEYS.SALE_ORDERS);
            const newItem: SaleOrder = {
                id: editing ? editing.id : `SALE-${Math.random().toString(36).substr(2,7).toUpperCase()}`,
                factoryCode: f.factoryCode.value,
                brideName: f.brideName.value,
                bridePhone: f.bridePhone.value,
                dressDescription: f.desc.value,
                factoryPrice: Number(f.factoryPrice.value),
                sellPrice: Number(f.sellPrice.value),
                deposit: Number(f.deposit.value),
                remainingFromBride: Number(f.sellPrice.value) - Number(f.deposit.value),
                factoryDepositPaid: editing ? editing.factoryDepositPaid : 0,
                factoryStatus: editing ? editing.factoryStatus : FactoryPaymentStatus.UNPAID,
                status: editing ? editing.status : SaleStatus.DESIGNING,
                expectedDeliveryDate: f.date.value,
                image: '', notes: '',
                orderDate: editing ? editing.orderDate : new Date().toISOString(),
                createdAt: editing ? editing.createdAt : new Date().toISOString(),
                measurements: editing?.measurements || {} // Preserve
            };

            if(editing) { const idx = l.findIndex(x=>x.id===editing.id); l[idx] = newItem; }
            else { 
                l.push(newItem);
                const fin = safe<FinanceRecord>(db.KEYS.FINANCE);
                fin.push({id: `INC-S-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'عربون تفصيل', amount: newItem.deposit, notes: `عربون بيع ${newItem.id}`});
                db.set(db.KEYS.FINANCE, fin);
            }
            db.set(db.KEYS.SALE_ORDERS, l); setShowModal(false); setEditing(null); refresh(); addToast('تم حفظ الطلب', 'success');
        };

        const handleSaveMeasures = (e: any) => {
            e.preventDefault();
            const f = e.target;
            const order = showMeasures.order!;
            const l = safe<SaleOrder>(db.KEYS.SALE_ORDERS);
            const idx = l.findIndex(x => x.id === order.id);
            if(idx > -1) {
                l[idx].measurements = {
                    neck: f.neck.value,
                    shoulder: f.shoulder.value,
                    chest: f.chest.value,
                    underChest: f.underChest.value,
                    chestDart: f.chestDart.value,
                    waist: f.waist.value,
                    backLength: f.backLength.value,
                    hips: f.hips.value,
                    fullLength: f.fullLength.value,
                    sleeve: f.sleeve.value,
                    armhole: f.armhole.value,
                    arm: f.arm.value,
                    forearm: f.forearm.value,
                    wrist: f.wrist.value,
                    legOpening: f.legOpening.value,
                    bustType: f.bustType.value,
                    skirtType: f.skirtType.value,
                    materials: f.materials.value,
                    orderNotes: f.orderNotes.value
                };
                db.set(db.KEYS.SALE_ORDERS, l);
                setShowMeasures({show: false, order: null});
                refresh(); addToast('تم حفظ المقاسات', 'success');
            }
        };

        const handleDelivery = (e: any) => {
            e.preventDefault();
            const f = e.target;
            const paidNow = Number(f.paidNow.value);
            const order = deliveryModal.order!;
            
            const l = safe<SaleOrder>(db.KEYS.SALE_ORDERS);
            const idx = l.findIndex(x => x.id === order.id);
            
            if(idx > -1) {
                const updatedOrder = l[idx];
                updatedOrder.remainingFromBride = updatedOrder.remainingFromBride - paidNow;
                updatedOrder.status = SaleStatus.DELIVERED;
                
                // Add Income
                if (paidNow > 0) {
                     const fin = safe<FinanceRecord>(db.KEYS.FINANCE);
                     fin.push({id: `INC-S-FINAL-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'دفعة استلام (بيع)', amount: paidNow, notes: `تسليم بيع ${order.id}`});
                     db.set(db.KEYS.FINANCE, fin);
                }

                db.set(db.KEYS.SALE_ORDERS, l);
                setDeliveryModal({show: false, order: null});
                refresh();
                addToast('تم تسليم الفستان بنجاح', 'success');
            }
        };

        const designingOrders = sales.filter(s => s.status !== SaleStatus.DELIVERED && s.status !== SaleStatus.CANCELLED);
        const deliveredOrders = sales.filter(s => s.status === SaleStatus.DELIVERED);

        const MeasureInput = ({label, name, def}: any) => (
            <div><label className="block text-[10px] text-slate-400 mb-1">{label}</label><input name={name} defaultValue={def} className={`${INPUT_CLASS} py-1.5`} /></div>
        );

        return (
            <div className="space-y-4 animate-fade-in">
                 <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit">
                        <button onClick={()=>setSaleTab('DESIGN')} className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${saleTab==='DESIGN' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>قيد التصميم ({designingOrders.length})</button>
                        <button onClick={()=>setSaleTab('DELIVERED')} className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${saleTab==='DELIVERED' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>تم التسليم ({deliveredOrders.length})</button>
                    </div>
                    <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> أمر تفصيل جديد</button>
                </div>

                {saleTab === 'DESIGN' && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr>
                                    <th className={TABLE_HEAD_CLASS}>كود المصنع</th>
                                    <th className={TABLE_HEAD_CLASS}>العروس</th>
                                    <th className={TABLE_HEAD_CLASS}>الموعد</th>
                                    <th className={TABLE_HEAD_CLASS}>المتبقي</th>
                                    <th className={TABLE_HEAD_CLASS}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {designingOrders.map(s => (
                                    <tr key={s.id} className={TABLE_ROW_CLASS}>
                                        <td className="p-4 font-mono">{s.factoryCode}</td>
                                        <td className="p-4 font-bold">{s.brideName}<div className="text-[10px] font-normal text-slate-500">{s.bridePhone}</div></td>
                                        <td className="p-4">{formatDate(s.expectedDeliveryDate)}</td>
                                        <td className="p-4 text-red-400 font-bold">{formatCurrency(s.remainingFromBride)}</td>
                                        <td className="p-4 flex gap-2">
                                             <button onClick={()=>setDeliveryModal({show: true, order: s})} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-lg shadow-green-900/20"><CheckSquare size={14}/> تم التسليم</button>
                                             <button onClick={()=>{setShowMeasures({show: true, order: s})}} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300" title="تفاصيل الأوردر والمقاسات"><Scissors size={16}/></button>
                                             <button onClick={()=>{setEditing(s); setShowModal(true)}} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><Edit size={16}/></button>
                                             <button onClick={()=>setPrintData({data: s, type: 'SALE'})} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><Printer size={16}/></button>
                                             <button onClick={()=>setPrintData({data: s, type: 'ORDER_DETAILS'})} className="p-1.5 bg-brand-900/50 hover:bg-brand-900 text-brand-300 rounded" title="طباعة تفاصيل الأوردر"><FileCheck size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {designingOrders.length === 0 && <div className="text-center p-8 text-slate-500">لا توجد أوامر قيد التصميم</div>}
                    </div>
                )}

                {saleTab === 'DELIVERED' && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr>
                                    <th className={TABLE_HEAD_CLASS}>كود المصنع</th>
                                    <th className={TABLE_HEAD_CLASS}>العروس</th>
                                    <th className={TABLE_HEAD_CLASS}>تاريخ الطلب</th>
                                    <th className={TABLE_HEAD_CLASS}>المبلغ المتبقي (دين)</th>
                                    <th className={TABLE_HEAD_CLASS}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveredOrders.map(s => (
                                    <tr key={s.id} className={TABLE_ROW_CLASS}>
                                        <td className="p-4 font-mono">{s.factoryCode}</td>
                                        <td className="p-4 font-bold">{s.brideName}</td>
                                        <td className="p-4">{formatDate(s.orderDate)}</td>
                                        <td className={`p-4 font-bold ${s.remainingFromBride > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {s.remainingFromBride > 0 ? formatCurrency(s.remainingFromBride) : 'خالص'}
                                        </td>
                                        <td className="p-4 flex gap-2">
                                             <button onClick={()=>{setDeliveryModal({show: true, order: s})}} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white">تحديث الدفع</button>
                                             <button onClick={()=>{setShowMeasures({show: true, order: s})}} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><Scissors size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showModal && (
                    <Modal title={editing ? 'تعديل طلب' : 'طلب جديد'} onClose={()=>{setShowModal(false); setEditing(null)}}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={LABEL_CLASS}>كود المصنع</label><input name="factoryCode" defaultValue={editing?.factoryCode} required className={INPUT_CLASS}/></div>
                                <div><label className={LABEL_CLASS}>موعد التسليم</label><input type="date" name="date" defaultValue={toInputDate(editing?.expectedDeliveryDate)} className={INPUT_CLASS}/></div>
                            </div>
                            <div><label className={LABEL_CLASS}>اسم العروس</label><input name="brideName" defaultValue={editing?.brideName} required className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>رقم الهاتف</label><input name="bridePhone" defaultValue={editing?.bridePhone} required className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>وصف الفستان</label><input name="desc" defaultValue={editing?.dressDescription} required className={INPUT_CLASS}/></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className={LABEL_CLASS}>تكلفة المصنع</label><input type="number" name="factoryPrice" defaultValue={editing?.factoryPrice} required className={INPUT_CLASS}/></div>
                                <div><label className={LABEL_CLASS}>سعر البيع</label><input type="number" name="sellPrice" defaultValue={editing?.sellPrice} required className={INPUT_CLASS}/></div>
                                <div><label className={LABEL_CLASS}>العربون</label><input type="number" name="deposit" defaultValue={editing?.deposit} required className={INPUT_CLASS}/></div>
                            </div>
                            <button className={BTN_PRIMARY}>حفظ الطلب</button>
                        </form>
                    </Modal>
                )}

                {showMeasures.show && (
                    <Modal title={`تفاصيل الأوردر: ${showMeasures.order?.brideName}`} onClose={()=>setShowMeasures({show: false, order: null})} size="lg">
                        <form onSubmit={handleSaveMeasures} className="space-y-6">
                            <div className="border-b border-slate-700 pb-2 mb-4"><h4 className="text-brand-300 font-bold flex items-center gap-2"><Scissors size={18}/> جدول المقاسات (بالسنتيمتر)</h4></div>
                            
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                <MeasureInput label="محيط الرقبة" name="neck" def={showMeasures.order?.measurements?.neck}/>
                                <MeasureInput label="محيط الكتف" name="shoulder" def={showMeasures.order?.measurements?.shoulder}/>
                                <MeasureInput label="محيط الصدر" name="chest" def={showMeasures.order?.measurements?.chest}/>
                                <MeasureInput label="محيط تحت الصدر" name="underChest" def={showMeasures.order?.measurements?.underChest}/>
                                <MeasureInput label="طول بنس الصدر" name="chestDart" def={showMeasures.order?.measurements?.chestDart}/>
                                <MeasureInput label="محيط الخصر" name="waist" def={showMeasures.order?.measurements?.waist}/>
                                <MeasureInput label="طول الظهر" name="backLength" def={showMeasures.order?.measurements?.backLength}/>
                                <MeasureInput label="محيط الهانش" name="hips" def={showMeasures.order?.measurements?.hips}/>
                                <MeasureInput label="الطول الكامل" name="fullLength" def={showMeasures.order?.measurements?.fullLength}/>
                                <MeasureInput label="طول اليد" name="sleeve" def={showMeasures.order?.measurements?.sleeve}/>
                                <MeasureInput label="محيط الابط" name="armhole" def={showMeasures.order?.measurements?.armhole}/>
                                <MeasureInput label="محيط الذراع" name="arm" def={showMeasures.order?.measurements?.arm}/>
                                <MeasureInput label="محيط الساعد" name="forearm" def={showMeasures.order?.measurements?.forearm}/>
                                <MeasureInput label="محيط الاسواره" name="wrist" def={showMeasures.order?.measurements?.wrist}/>
                                <MeasureInput label="محيط فتحة الرجل" name="legOpening" def={showMeasures.order?.measurements?.legOpening}/>
                            </div>

                            <div className="border-t border-slate-700 pt-4">
                                <h4 className="text-brand-300 font-bold mb-3 flex items-center gap-2"><FileText size={18}/> مواصفات التصميم</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                     <div><label className={LABEL_CLASS}>نوع الصدر</label><input name="bustType" defaultValue={showMeasures.order?.measurements?.bustType} className={INPUT_CLASS}/></div>
                                     <div><label className={LABEL_CLASS}>نوع التنورة</label><input name="skirtType" defaultValue={showMeasures.order?.measurements?.skirtType} className={INPUT_CLASS}/></div>
                                </div>
                                <div><label className={LABEL_CLASS}>الخامات المستخدمة</label><textarea name="materials" defaultValue={showMeasures.order?.measurements?.materials} className={INPUT_CLASS} rows={2}></textarea></div>
                            </div>

                            <div className="border-t border-slate-700 pt-4">
                                <label className={LABEL_CLASS}>الشرح المطلوب للأوردر (الملاحظات)</label>
                                <textarea name="orderNotes" defaultValue={showMeasures.order?.measurements?.orderNotes} className={INPUT_CLASS} rows={4} placeholder="اكتب كل التفاصيل هنا..."></textarea>
                            </div>

                            <button className={BTN_PRIMARY}>حفظ التفاصيل والمقاسات</button>
                        </form>
                    </Modal>
                )}

                {deliveryModal.show && (
                    <Modal title="تسليم للعروس" onClose={()=>setDeliveryModal({show: false, order: null})}>
                        <form onSubmit={handleDelivery} className="space-y-4">
                            <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                                <p className="text-slate-400 text-xs">المبلغ المتبقي على العروس</p>
                                <h3 className="text-3xl font-bold text-red-500 mt-1">{formatCurrency(deliveryModal.order?.remainingFromBride)}</h3>
                            </div>
                            
                            <div>
                                <label className={LABEL_CLASS}>هل تم دفع أي مبلغ الآن؟</label>
                                <input type="number" name="paidNow" defaultValue={deliveryModal.order?.remainingFromBride} className={INPUT_CLASS} />
                                <p className="text-[10px] text-slate-500 mt-1">يمكنك تعديل المبلغ إذا دفعت العروس جزءاً فقط. المبلغ المتبقي سيظهر كدين.</p>
                            </div>

                            <button className={BTN_PRIMARY}>تأكيد التسليم والدفع</button>
                        </form>
                    </Modal>
                )}
            </div>
        );
    };

    const FactoryManager = () => {
        // ... existing factory code ...
        // Re-implementing to ensure full context, but strictly keeping same logic
        const [selected, setSelected] = useState<string[]>([]);
        const [payModal, setPayModal] = useState<{show: boolean, type: 'DEPOSIT'|'FINAL'}>({show: false, type: 'DEPOSIT'});

        const handlePay = (e: any) => {
            e.preventDefault();
            const l = safe<SaleOrder>(db.KEYS.SALE_ORDERS);
            const f = safe<FinanceRecord>(db.KEYS.FINANCE);
            
            selected.forEach(id => {
                const item = l.find(x => x.id === id);
                if(item) {
                    const amount = payModal.type === 'FINAL' 
                        ? (item.factoryPrice - item.factoryDepositPaid) 
                        : Number(e.target[`amt_${id}`]?.value || 0);

                    if(amount > 0) {
                        item.factoryDepositPaid += amount;
                        if (item.factoryDepositPaid >= item.factoryPrice) {
                            item.factoryStatus = FactoryPaymentStatus.PAID;
                            item.factoryPaidDate = new Date().toISOString();
                        } else {
                            item.factoryStatus = FactoryPaymentStatus.PARTIAL;
                        }

                        f.push({
                            id: `EXP-FAC-${Math.random()}`, 
                            date: new Date().toISOString(), 
                            type: 'EXPENSE', 
                            category: payModal.type === 'FINAL' ? 'سداد نهائي مصنع' : 'عربون مصنع', 
                            amount, 
                            notes: `كود ${item.factoryCode} - ${payModal.type === 'FINAL' ? 'تسليم نهائي' : 'دفعة عربون'}`, 
                            createdBy: user?.username
                        });
                    }
                }
            });
            
            db.set(db.KEYS.SALE_ORDERS, l);
            db.set(db.KEYS.FINANCE, f);
            setSelected([]); setPayModal({show: false, type: 'DEPOSIT'}); refresh(); addToast('تم تسجيل الدفعات بنجاح', 'success');
        };

        const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

        return (
            <div className="space-y-4 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">تعاملات المصنع (الدفع الجماعي)</h3>
                    {selected.length > 0 && (
                        <div className="flex gap-2">
                             <button onClick={()=>setPayModal({show: true, type: 'DEPOSIT'})} className="bg-yellow-600 px-4 py-2 rounded text-xs font-bold text-white shadow-lg animate-scale-in">دفع عربون (تصميم)</button>
                             <button onClick={()=>setPayModal({show: true, type: 'FINAL'})} className="bg-green-600 px-4 py-2 rounded text-xs font-bold text-white shadow-lg animate-scale-in">سداد نهائي (استلام)</button>
                        </div>
                    )}
                 </div>
                 <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-right text-sm">
                        <thead><tr><th className="p-4 w-10"></th><th className={TABLE_HEAD_CLASS}>كود المصنع</th><th className={TABLE_HEAD_CLASS}>وصف الفستان</th><th className={TABLE_HEAD_CLASS}>سعر المصنع</th><th className={TABLE_HEAD_CLASS}>المدفوع</th><th className={TABLE_HEAD_CLASS}>المتبقي</th><th className={TABLE_HEAD_CLASS}>الحالة</th></tr></thead>
                        <tbody>
                            {sales.filter(s => s.factoryStatus !== FactoryPaymentStatus.PAID).map(s => (
                                <tr key={s.id} className={`${TABLE_ROW_CLASS} ${selected.includes(s.id) ? 'bg-brand-900/10' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)} className="accent-brand-500 w-4 h-4 cursor-pointer"/></td>
                                    <td className="p-4 font-mono text-white font-bold">{s.factoryCode}</td>
                                    <td className="p-4">{s.dressDescription}</td>
                                    <td className="p-4">{formatCurrency(s.factoryPrice)}</td>
                                    <td className="p-4 text-green-400">{formatCurrency(s.factoryDepositPaid)}</td>
                                    <td className="p-4 text-red-400 font-bold">{formatCurrency(s.factoryPrice - s.factoryDepositPaid)}</td>
                                    <td className="p-4"><span className={`${BADGE_CLASS} ${s.factoryStatus===FactoryPaymentStatus.PAID?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{s.factoryStatus}</span></td>
                                </tr>
                            ))}
                            {sales.filter(s => s.factoryStatus !== FactoryPaymentStatus.PAID).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">لا توجد مستحقات للمصنع حالياً</td></tr>}
                        </tbody>
                    </table>
                 </div>
                 {payModal.show && (
                     <Modal title={payModal.type === 'FINAL' ? "سداد نهائي (استلام من المصنع)" : "دفع عربون (اتفاق تصميم)"} onClose={()=>setPayModal({show: false, type: 'DEPOSIT'})}>
                         <form onSubmit={handlePay} className="space-y-4">
                             <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {selected.map(id => {
                                    const item = sales.find(x => x.id === id);
                                    if(!item) return null;
                                    const remaining = item.factoryPrice - item.factoryDepositPaid;
                                    return (
                                        <div key={id} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700">
                                            <div>
                                                <p className="font-bold text-sm text-white">{item.factoryCode}</p>
                                                <p className="text-xs text-slate-400">{item.dressDescription}</p>
                                            </div>
                                            {payModal.type === 'FINAL' ? 
                                                <div className="text-left">
                                                    <span className="block text-[10px] text-slate-500">سيتم دفع المتبقي</span>
                                                    <span className="font-bold text-green-400">{formatCurrency(remaining)}</span>
                                                </div> 
                                                : 
                                                <input name={`amt_${id}`} type="number" placeholder="قيمة العربون" max={remaining} className={`${INPUT_CLASS} w-32 py-1 text-center`} autoFocus/>
                                            }
                                        </div>
                                    );
                                })}
                             </div>
                             <div className="bg-slate-800 p-3 rounded text-sm text-slate-300">
                                 <p>إجمالي الفساتين المحددة: <span className="font-bold text-white">{selected.length}</span></p>
                                 <p className="text-xs text-slate-500 mt-1">{payModal.type === 'FINAL' ? 'سيتم تحويل حالة الفساتين إلى "خالص للمصنع" وإتاحة الكود.' : 'سيتم تسجيل العربون كدفعة جزئية.'}</p>
                             </div>
                             <button className={BTN_PRIMARY}>تأكيد العملية وتسجيل الدفع</button>
                         </form>
                     </Modal>
                 )}
            </div>
        );
    };

    const CustomerManager = () => {
         const [showModal, setShowModal] = useState(false);
        const [editing, setEditing] = useState<Customer|null>(null);
        const [search, setSearch] = useState('');

        const handleSave = (e: any) => {
            e.preventDefault(); const f = e.target;
            const l = safe<Customer>(db.KEYS.CUSTOMERS);
            const newItem: Customer = {
                id: editing ? editing.id : `C-${Math.random().toString(36).substr(2,7)}`,
                name: f.name.value,
                phone: f.phone.value,
                notes: f.notes.value,
                firstSeenDate: editing ? editing.firstSeenDate : new Date().toISOString()
            };
            if(editing) { const idx = l.findIndex(x=>x.id===editing.id); l[idx] = newItem; }
            else l.push(newItem);
            db.set(db.KEYS.CUSTOMERS, l); setShowModal(false); setEditing(null); refresh(); addToast('تم حفظ العميل', 'success');
        };

        const filtered = customers.filter(c => c.name.includes(search) || c.phone.includes(search));

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">قاعدة بيانات العملاء</h3>
                    <div className="flex gap-2">
                         <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className={`${INPUT_CLASS} w-48 py-2`} />
                         <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> عميل جديد</button>
                    </div>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-right text-sm">
                        <thead><tr><th className={TABLE_HEAD_CLASS}>الاسم</th><th className={TABLE_HEAD_CLASS}>الهاتف</th><th className={TABLE_HEAD_CLASS}>تاريخ الانضمام</th><th className={TABLE_HEAD_CLASS}>ملاحظات</th><th className={TABLE_HEAD_CLASS}>إجراءات</th></tr></thead>
                        <tbody>{filtered.map(c => (
                            <tr key={c.id} className={TABLE_ROW_CLASS}>
                                <td className="p-4 font-bold">{c.name}</td>
                                <td className="p-4 font-mono text-slate-400">{c.phone}</td>
                                <td className="p-4 text-slate-500">{formatDate(c.firstSeenDate)}</td>
                                <td className="p-4 text-xs text-slate-400">{c.notes}</td>
                                <td className="p-4"><button onClick={()=>{setEditing(c); setShowModal(true)}} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><Edit size={16}/></button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
                {showModal && (
                    <Modal title={editing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'} onClose={()=>{setShowModal(false); setEditing(null)}}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div><label className={LABEL_CLASS}>اسم العميل</label><input name="name" defaultValue={editing?.name} required className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>رقم الهاتف</label><input name="phone" defaultValue={editing?.phone} required className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>ملاحظات</label><textarea name="notes" defaultValue={editing?.notes} className={INPUT_CLASS}></textarea></div>
                            <button className={BTN_PRIMARY}>حفظ</button>
                        </form>
                    </Modal>
                )}
            </div>
        );
    };

    const DeliveryManager = () => {
         const [view, setView] = useState<'PICKUP'|'RETURN'|'HISTORY'>('PICKUP');
        const [pickupModal, setPickupModal] = useState<{show: boolean, booking: Booking|null}>({show: false, booking: null});
        const [returnModal, setReturnModal] = useState<{show: boolean, booking: Booking|null}>({show: false, booking: null});
        const [search, setSearch] = useState('');

        const handlePickup = (e: any) => {
            e.preventDefault();
            const b = pickupModal.booking!;
            const form = e.target;
            
            const accNames = form.elements['accName'];
            const accPrices = form.elements['accPrice'];
            const accessories: Accessory[] = [];
            
            if(accNames instanceof RadioNodeList) {
                for(let i=0; i<accNames.length; i++) {
                    if((accNames[i] as HTMLInputElement).value) {
                         accessories.push({ name: (accNames[i] as HTMLInputElement).value, price: Number((accPrices[i] as HTMLInputElement).value) });
                    }
                }
            } else if (accNames && accNames.value) {
                accessories.push({ name: accNames.value, price: Number(accPrices.value) });
            }

            const depositType = form.depositType.value;
            const depositInfo = form.depositInfo.value;
            const confirmPayment = form.confirmPayment.checked; 
            
            const remainingPaid = confirmPayment ? b.remainingToPay : 0;
            const accessoriesTotal = accessories.reduce((a, c) => a + c.price, 0);

            const l = safe<Booking>(db.KEYS.BOOKINGS);
            const booking = l.find(x => x.id === b.id)!;
            booking.status = BookingStatus.ACTIVE;
            if(confirmPayment) booking.remainingToPay = 0; 
            
            booking.deliveryDetails = {
                date: new Date().toISOString(),
                staffName: user?.name || 'Unknown',
                remainingPaid,
                depositType,
                depositInfo,
                accessories
            };
            
            const f = safe<FinanceRecord>(db.KEYS.FINANCE);
            if (remainingPaid > 0) {
                f.push({
                    id: `INC-PICKUP-${Math.random()}`, 
                    date: new Date().toISOString(), 
                    type: 'INCOME', 
                    category: 'باقي حجز (تسليم)', 
                    amount: remainingPaid, 
                    notes: `تسليم حجز ${b.id} للعروس ${b.customerName}`,
                    createdBy: user?.username
                });
            }
            if (accessoriesTotal > 0) {
                f.push({
                    id: `INC-ACC-${Math.random()}`, 
                    date: new Date().toISOString(), 
                    type: 'INCOME', 
                    category: 'إكسسوارات إضافية', 
                    amount: accessoriesTotal, 
                    notes: `إكسسوارات حجز ${b.id}`,
                    createdBy: user?.username
                });
            }

            db.set(db.KEYS.BOOKINGS, l);
            db.set(db.KEYS.FINANCE, f);
            db.addLog(user!, 'تسليم فستان', `تم تسليم الحجز ${b.id} للعروس ${b.customerName}`);
            
            setPickupModal({show: false, booking: null});
            refresh();
            addToast('تم تسجيل التسليم بنجاح', 'success');
        };

        const handleReturn = (e: any) => {
            e.preventDefault();
            const b = returnModal.booking!;
            const form = e.target;
            const isDamage = form.isDamage.checked;
            const damageFee = Number(form.damageFee.value || 0);
            const notes = form.notes.value;

            const l = safe<Booking>(db.KEYS.BOOKINGS);
            const booking = l.find(x => x.id === b.id)!;
            booking.status = BookingStatus.COMPLETED;
            booking.returnDetails = {
                date: new Date().toISOString(),
                staffName: user?.name || 'Unknown',
                isDamage,
                damageFee,
                damageNotes: notes,
                notes
            };

            const dList = safe<Dress>(db.KEYS.DRESSES);
            const dress = dList.find(d => d.id === b.dressId);
            if(dress) {
                dress.status = DressStatus.CLEANING;
                dress.rentalCount = (dress.rentalCount || 0) + 1;
                db.set(db.KEYS.DRESSES, dList);
            }

            if (damageFee > 0) {
                const f = safe<FinanceRecord>(db.KEYS.FINANCE);
                f.push({
                    id: `INC-DMG-${Math.random()}`, 
                    date: new Date().toISOString(), 
                    type: 'INCOME', 
                    category: 'غرامة تلفيات', 
                    amount: damageFee, 
                    notes: `خصم من الأمانة - حجز ${b.id}`,
                    createdBy: user?.username
                });
                db.set(db.KEYS.FINANCE, f);
            }

            db.set(db.KEYS.BOOKINGS, l);
            db.addLog(user!, 'استرجاع فستان', `تم استرجاع الحجز ${b.id}`);
            setReturnModal({show: false, booking: null});
            refresh();
            addToast('تم تسجيل الإرجاع بنجاح', 'success');
        };
        
        const undoAction = (b: Booking) => confirmAction('تعديل العملية', 'هل أنت متأكد من التراجع عن هذه العملية وتعديل البيانات؟', () => {
             const l = safe<Booking>(db.KEYS.BOOKINGS);
             const booking = l.find(x => x.id === b.id)!;
             if (booking.status === BookingStatus.ACTIVE) {
                 booking.status = BookingStatus.PENDING; 
                 delete booking.deliveryDetails;
                 setPickupModal({show: true, booking: b});
             } else if (booking.status === BookingStatus.COMPLETED) {
                 booking.status = BookingStatus.ACTIVE;
                 delete booking.returnDetails;
                 setReturnModal({show: true, booking: b});
             }
             db.set(db.KEYS.BOOKINGS, l);
             refresh();
        });

        const activeList = bookings.filter(b => b.status === BookingStatus.ACTIVE);
        const pendingList = bookings.filter(b => b.status === BookingStatus.PENDING || b.status === BookingStatus.LATE).sort((a,b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        const historyList = bookings.filter(b => b.deliveryDetails && (b.customerName.includes(search) || b.dressName.includes(search))).sort((a,b) => new Date(b.deliveryDetails!.date).getTime() - new Date(a.deliveryDetails!.date).getTime());

        const AccessoryInput = () => (
            <div className="flex gap-2 mb-2">
                <input name="accName" placeholder="اسم القطعة (طرحة، تاج..)" className={INPUT_CLASS} />
                <input name="accPrice" type="number" placeholder="السعر" defaultValue={0} className={`${INPUT_CLASS} w-32`} />
            </div>
        );

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit mb-4">
                    <button onClick={()=>setView('PICKUP')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='PICKUP'?'bg-brand-600 text-white':'text-slate-400'}`}>تسليم للعروس ({pendingList.length})</button>
                    <button onClick={()=>setView('RETURN')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='RETURN'?'bg-brand-600 text-white':'text-slate-400'}`}>استرجاع من العروس ({activeList.length})</button>
                    <button onClick={()=>setView('HISTORY')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='HISTORY'?'bg-brand-600 text-white':'text-slate-400'}`}>سجل الحركة</button>
                </div>

                {view === 'PICKUP' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingList.map(b => (
                            <div key={b.id} className={`${CARD_CLASS} border-l-4 border-l-blue-500`}>
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-white">{b.customerName}</span>
                                    <span className="text-xs text-slate-400">{formatDate(b.eventDate)}</span>
                                </div>
                                <p className="text-sm text-slate-300 mb-2">{b.dressName}</p>
                                <div className="flex justify-between items-center text-xs bg-slate-900 p-2 rounded mb-3">
                                    <span>المتبقي:</span>
                                    <span className="font-bold text-red-400">{formatCurrency(b.remainingToPay)}</span>
                                </div>
                                <button onClick={()=>setPickupModal({show: true, booking: b})} className={BTN_PRIMARY}>تسليم الفستان</button>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'RETURN' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeList.map(b => (
                            <div key={b.id} className={`${CARD_CLASS} border-l-4 border-l-green-500`}>
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-white">{b.customerName}</span>
                                    <span className="text-xs text-slate-400">{formatDate(b.eventDate)}</span>
                                </div>
                                <p className="text-sm text-slate-300 mb-2">{b.dressName}</p>
                                <div className="text-xs text-slate-400 mb-3">
                                    <p>الأمانة: {b.deliveryDetails?.depositType}</p>
                                    <p>استلمها: {b.deliveryDetails?.staffName}</p>
                                </div>
                                {b.remainingToPay > 0 && (
                                    <div className="mb-2 p-2 bg-red-900/50 border border-red-500 rounded text-xs text-red-200 flex items-center gap-2">
                                        <AlertCircle size={14}/> <span>تنبيه: متبقي {formatCurrency(b.remainingToPay)}</span>
                                    </div>
                                )}
                                <button onClick={()=>setReturnModal({show: true, booking: b})} className={`${BTN_PRIMARY} bg-green-600 hover:bg-green-700`}>استرجاع وفحص</button>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'HISTORY' && (
                    <div className="space-y-4">
                        <div className="max-w-md"><input value={search} onChange={e=>setSearch(e.target.value)} className={INPUT_CLASS} placeholder="بحث عن عروس أو فستان..." /></div>
                        {historyList.map(b => (
                            <div key={b.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-white">{b.customerName} <span className="text-xs font-normal text-slate-400">({b.dressName})</span></h4>
                                    <div className="text-xs text-slate-500 mt-1 flex gap-4">
                                        <span>تسليم: {formatDate(b.deliveryDetails?.date || '')} بواسطة {b.deliveryDetails?.staffName}</span>
                                        {b.returnDetails && <span> | إرجاع: {formatDate(b.returnDetails.date)} بواسطة {b.returnDetails.staffName}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={()=>undoAction(b)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded text-white transition-colors">تعديل / تراجع</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {pickupModal.show && (
                    <Modal title={`تسليم فستان: ${pickupModal.booking?.customerName}`} onClose={()=>setPickupModal({show: false, booking: null})}>
                        <form onSubmit={handlePickup} className="space-y-4">
                            <div className="bg-slate-800 p-3 rounded text-sm mb-4">
                                <div className="flex justify-between mb-1"><span>المتبقي من الحجز:</span><span className="font-bold text-red-400">{formatCurrency(pickupModal.booking?.remainingToPay)}</span></div>
                                <div className="text-xs text-slate-500">يجب تحصيل هذا المبلغ لإتمام التسليم</div>
                            </div>
                            
                            <label className="flex items-center gap-3 p-4 bg-blue-900/20 border border-blue-800 rounded-lg cursor-pointer hover:bg-blue-900/30 transition-colors">
                                <input type="checkbox" name="confirmPayment" defaultChecked={true} className="w-5 h-5 accent-blue-500" />
                                <div>
                                    <p className="font-bold text-blue-200">تأكيد استلام المبلغ المتبقي ({formatCurrency(pickupModal.booking?.remainingToPay)})</p>
                                    <p className="text-xs text-blue-400">سيتم تسجيله في الخزينة كإيراد</p>
                                </div>
                            </label>

                            <div className="border-t border-slate-700 pt-4">
                                <label className={LABEL_CLASS}>الأمانة المستلمة</label>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <select name="depositType" className={INPUT_CLASS}>
                                        <option value={DepositType.ID_CARD}>بطاقة هوية</option>
                                        <option value={DepositType.PASSPORT}>جواز سفر</option>
                                        <option value={DepositType.CASH}>مبلغ مالي</option>
                                        <option value={DepositType.GOLD}>ذهب</option>
                                        <option value={DepositType.OTHER}>أخرى</option>
                                    </select>
                                    <input name="depositInfo" placeholder="تفاصيل (رقم الهوية / المبلغ / وصف الذهب)" required className={INPUT_CLASS} />
                                </div>
                            </div>

                            <div className="border-t border-slate-700 pt-4">
                                <label className={LABEL_CLASS}>الإكسسوارات والإضافات</label>
                                <div className="bg-slate-800/50 p-3 rounded-lg space-y-2" id="accessoriesList">
                                    <AccessoryInput />
                                    <AccessoryInput />
                                    <AccessoryInput />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">* ضع السعر 0 إذا كانت القطعة مجانية</p>
                            </div>

                            <button className={BTN_PRIMARY}>تأكيد التسليم واستلام الأمانة</button>
                        </form>
                    </Modal>
                )}

                {returnModal.show && (
                    <Modal title={`استرجاع فستان: ${returnModal.booking?.customerName}`} onClose={()=>setReturnModal({show: false, booking: null})}>
                         <form onSubmit={handleReturn} className="space-y-4">
                            {returnModal.booking?.remainingToPay > 0 && (
                                <div className="p-4 bg-red-600/20 border border-red-500 rounded-lg flex items-start gap-3 animate-pulse">
                                    <AlertTriangle className="text-red-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-red-200">تنبيه هام!</p>
                                        <p className="text-sm text-red-300">يوجد مبلغ متبقي على هذا الحجز بقيمة {formatCurrency(returnModal.booking?.remainingToPay)}. يرجى التحصيل قبل استرجاع الأمانة.</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-green-900/20 border border-green-900 p-4 rounded-lg mb-4 text-center">
                                <p className="text-sm text-green-300 font-bold mb-1">الأمانة المحفوظة</p>
                                <p className="text-white text-lg">{returnModal.booking?.deliveryDetails?.depositType}: {returnModal.booking?.deliveryDetails?.depositInfo}</p>
                            </div>

                            <div>
                                <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer border border-slate-700 hover:border-red-500 transition-colors">
                                    <input type="checkbox" name="isDamage" className="w-5 h-5 accent-red-500" />
                                    <span className="font-bold text-red-400">يوجد تلفيات أو تأخير؟</span>
                                </label>
                            </div>

                            <div><label className={LABEL_CLASS}>قيمة الخصم من الأمانة (إن وجد)</label><input type="number" name="damageFee" defaultValue={0} className={INPUT_CLASS} /></div>
                            <div><label className={LABEL_CLASS}>ملاحظات الاستلام</label><textarea name="notes" placeholder="حالة الفستان، الإكسسوارات المسترجعة..." className={INPUT_CLASS} rows={3}></textarea></div>
                            
                            <button className={BTN_PRIMARY}>تأكيد الإرجاع وتحويل للتنظيف</button>
                         </form>
                    </Modal>
                )}
            </div>
        );
    };

    const FinanceManager = () => {
         const [showAdd, setShowAdd] = useState(false);
        const [type, setType] = useState('EXPENSE');
        const [cat, setCat] = useState('');
        const [selectedDresses, setSelectedDresses] = useState<string[]>([]);
        const [search, setSearch] = useState('');
        const [financeView, setFinanceView] = useState<'OPS'|'ANALYTICS'>('OPS');
        
        // Ensure default view is accessible based on permissions
        useEffect(() => {
            if (hasPerm('finance_ops') && !hasPerm('finance_analytics') && !hasPerm('finance_profit_analysis')) setFinanceView('OPS');
            else if (!hasPerm('finance_ops') && (hasPerm('finance_analytics') || hasPerm('finance_profit_analysis'))) setFinanceView('ANALYTICS');
        }, [user]);

        const handleSave = (e: any) => {
            e.preventDefault(); const f = e.target;
            const l = safe<FinanceRecord>(db.KEYS.FINANCE);
            const notes = f.notes.value;
            const amount = Number(f.amount.value);
            const isDressMulti = (cat === 'ترزي' || cat === 'تنظيف') && selectedDresses.length > 0;

            if (isDressMulti) {
                const dressNames = dresses.filter(d => selectedDresses.includes(d.id)).map(d => d.name).join(', ');
                l.push({ id: `FIN-${Math.random()}`, date: f.date.value, type: 'EXPENSE', category: cat, amount: amount, notes: `${notes} - فساتين: ${dressNames}`, createdBy: user?.username });
            } else {
                l.push({ id: `FIN-${Math.random()}`, date: f.date.value, type: f.type.value, category: f.type.value === 'INCOME' ? 'إيراد عام' : `${cat} ${f.sub?.value ? '- '+f.sub.value : ''}`, amount: amount, notes: notes, createdBy: user?.username });
            }
            
            db.set(db.KEYS.FINANCE, l); setShowAdd(false); refresh(); addToast('تم تسجيل الحركة', 'success');
        };

        const list = finance.filter(f => f.category.includes(search) || f.notes.includes(search)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const toggleDress = (id: string) => setSelectedDresses(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

        return (
            <div className="space-y-6 animate-fade-in">
                 <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit mb-4">
                    {hasPerm('finance_ops') && <button onClick={()=>setFinanceView('OPS')} className={`px-4 py-2 rounded-md font-bold text-xs ${financeView==='OPS'?'bg-brand-600 text-white':'text-slate-400'}`}>الحركات اليومية</button>}
                    {(hasPerm('finance_analytics') || hasPerm('finance_profit_analysis')) && <button onClick={()=>setFinanceView('ANALYTICS')} className={`px-4 py-2 rounded-md font-bold text-xs ${financeView==='ANALYTICS'?'bg-brand-600 text-white':'text-slate-400'}`}>التحليل المالي</button>}
                 </div>

                 {financeView === 'ANALYTICS' && <DetailedFinanceCharts finance={finance} dresses={dresses} bookings={bookings} />}
                 
                 {financeView === 'OPS' && (
                    <>
                        <div className="flex justify-between items-center">
                            <div className="relative w-64"><Search className="absolute right-3 top-2.5 text-slate-500" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} className={`${INPUT_CLASS} pr-10`} placeholder="بحث في المالية..." /></div>
                            <button onClick={() => {setShowAdd(true); setType('EXPENSE'); setCat(''); setSelectedDresses([])}} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg"><Plus size={18}/> حركة جديدة</button>
                        </div>
                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            <table className="w-full text-right text-sm">
                                <thead><tr><th className={TABLE_HEAD_CLASS}>التاريخ</th><th className={TABLE_HEAD_CLASS}>بواسطة</th><th className={TABLE_HEAD_CLASS}>النوع</th><th className={TABLE_HEAD_CLASS}>البند</th><th className={TABLE_HEAD_CLASS}>المبلغ</th><th className={TABLE_HEAD_CLASS}>ملاحظات</th></tr></thead>
                                <tbody>{list.map(f => (
                                    <tr key={f.id} className={TABLE_ROW_CLASS}>
                                        <td className="p-4 font-mono text-slate-400">{formatDate(f.date)}</td>
                                        <td className="p-4 text-slate-300 font-bold">{f.createdBy || '-'}</td>
                                        <td className="p-4"><span className={`${BADGE_CLASS} ${f.type === 'INCOME' ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-red-900/30 text-red-400 border-red-900'}`}>{f.type === 'INCOME' ? 'إيراد' : 'مصروف'}</span></td>
                                        <td className="p-4">{f.category}</td><td className={`p-4 font-bold ${f.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(f.amount)}</td><td className="p-4 text-xs text-slate-500">{f.notes}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </>
                 )}

                 {showAdd && (
                    <Modal title="حركة مالية جديدة" onClose={() => setShowAdd(false)}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div><label className={LABEL_CLASS}>النوع</label><select name="type" value={type} onChange={(e)=>setType(e.target.value)} className={INPUT_CLASS}><option value="EXPENSE">مصروفات</option><option value="INCOME">إيرادات</option></select></div>
                            <div><label className={LABEL_CLASS}>التاريخ</label><input type="date" name="date" defaultValue={today} required className={INPUT_CLASS} /></div>
                            
                            {type === 'EXPENSE' && (
                                <>
                                    <div><label className={LABEL_CLASS}>التصنيف</label><select name="category" onChange={(e)=>setCat(e.target.value)} className={INPUT_CLASS}><option value="">اختر...</option><option value="فواتير">فواتير</option><option value="مرتبات">مرتبات</option><option value="ترزي">ترزي</option><option value="تنظيف">تنظيف</option><option value="أخرى">أخرى</option></select></div>
                                    {cat === 'فواتير' && <div><label className={LABEL_CLASS}>نوع الفاتورة</label><select name="sub" className={INPUT_CLASS}><option value="كهرباء">كهرباء</option><option value="ماء">ماء</option><option value="إنترنت">إنترنت</option><option value="حكومية">حكومية</option><option value="إيجار">إيجار</option></select></div>}
                                    {cat === 'مرتبات' && <div><label className={LABEL_CLASS}>الموظف</label><select name="sub" className={INPUT_CLASS}>{users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>}
                                    {(cat === 'ترزي' || cat === 'تنظيف') && (
                                        <div className="border border-slate-700 p-3 rounded-lg max-h-40 overflow-y-auto">
                                            <label className={LABEL_CLASS}>اختر الفساتين ({selectedDresses.length})</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {dresses.filter(d=>d.type===DressType.RENT).map(d => (
                                                    <label key={d.id} className={`flex items-center gap-2 text-xs p-1 rounded cursor-pointer ${selectedDresses.includes(d.id) ? 'bg-brand-900/50 text-white' : 'text-slate-400'}`}>
                                                        <input type="checkbox" checked={selectedDresses.includes(d.id)} onChange={()=>toggleDress(d.id)} className="accent-brand-500"/>
                                                        {d.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div><label className={LABEL_CLASS}>المبلغ</label><input type="number" name="amount" required className={INPUT_CLASS} /></div>
                            <div><label className={LABEL_CLASS}>ملاحظات {type === 'INCOME' && <span className="text-red-500">*</span>}</label><textarea name="notes" required={type === 'INCOME'} className={INPUT_CLASS} placeholder={type === 'INCOME' ? "مصدر الإيراد وتفاصيله..." : ""}></textarea></div>
                            <button className={BTN_PRIMARY}>حفظ</button>
                        </form>
                    </Modal>
                )}
            </div>
        );
    };

    // ... SettingsManager and HomeManager assumed to be preserved as they were ...
    const SettingsManager = () => {
         const [passModal, setPassModal] = useState(false);
        const [userModal, setUserModal] = useState(false);
        const [editingUser, setEditingUser] = useState<UserType|null>(null);
        const [usersList, setUsersList] = useState(users);
        
        // Auto open change pass modal if requested from app level (e.g. default pass check)
        useEffect(() => {
            if(autoOpenPass) setPassModal(true);
        }, [autoOpenPass]);

        const handleFactoryReset = () => {
            if(user?.role !== UserRole.ADMIN) return;
            confirmAction('ضبط المصنع', 'تحذير: سيتم مسح جميع البيانات نهائياً! هل أنت متأكد؟', () => {
                db.resetAndSeed();
                window.location.reload();
            });
        };

        const handleChangePass = (e: any) => {
            e.preventDefault();
            const u = safe<UserType>(db.KEYS.USERS);
            const me = u.find(x => x.id === user?.id);
            if(me) { 
                me.password = e.target.newPass.value; 
                db.set(db.KEYS.USERS, u); 
                addToast('تم تغيير كلمة المرور بنجاح', 'success'); 
                setPassModal(false); 
                if(autoOpenPass) setAutoOpenPass(false);
            }
        };

        const handleSaveUser = (e: any) => {
            e.preventDefault();
            const f = e.target;
            const u = safe<UserType>(db.KEYS.USERS);
            
            // Check username uniqueness if adding or changing username
            const newUsername = f.username.value;
            if(!editingUser || editingUser.username !== newUsername) {
                if(u.some(x => x.username === newUsername)) { addToast('اسم المستخدم موجود مسبقاً', 'error'); return; }
            }

            const perms = Array.from(f.elements['perms']).filter((x: any) => x.checked).map((x: any) => x.value);
            
            const userData: UserType = {
                id: editingUser ? editingUser.id : `U-${Math.random()}`,
                name: f.name.value,
                username: newUsername,
                // If editing, use existing password unless changed (input not empty), if adding use '123'
                password: editingUser ? (f.password.value || editingUser.password) : '123', 
                role: UserRole.EMPLOYEE,
                permissions: perms
            };

            if(editingUser) {
                const idx = u.findIndex(x=>x.id===editingUser.id);
                if(idx > -1) u[idx] = userData;
            } else {
                u.push(userData);
            }

            db.set(db.KEYS.USERS, u);
            setUsersList([...u]); // Create new reference to trigger render
            setUserModal(false);
            setEditingUser(null);
            addToast(editingUser ? 'تم تعديل بيانات الموظف' : 'تم إضافة الموظف (كلمة المرور: 123)', 'success');
        };

        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                <div className={CARD_CLASS}>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Lock size={20}/> الأمان</h3>
                    <div className="flex gap-4">
                        <button onClick={()=>setPassModal(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">تغيير كلمة المرور الخاصة بي</button>
                    </div>
                </div>

                {user?.role === UserRole.ADMIN && (
                    <>
                        <div className={CARD_CLASS}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users size={20}/> إدارة المستخدمين</h3>
                                <button onClick={()=>{setEditingUser(null); setUserModal(true)}} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"><UserPlus size={16}/> إضافة موظف</button>
                            </div>
                            <div className="space-y-2">
                                {usersList.map(u => (
                                    <div key={u.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                                        <div><p className="font-bold">{u.name}</p><p className="text-xs text-slate-500">@{u.username} - {u.role}</p></div>
                                        {u.role !== UserRole.ADMIN && (
                                            <div className="flex gap-2">
                                                <button onClick={()=>{setEditingUser(u); setUserModal(true)}} className="text-slate-400 hover:text-white"><Edit size={16}/></button>
                                                <button onClick={()=>{
                                                    confirmAction('حذف مستخدم', 'هل أنت متأكد من حذف هذا المستخدم؟', () => {
                                                        const n = usersList.filter(x=>x.id!==u.id); 
                                                        db.set(db.KEYS.USERS, n); 
                                                        setUsersList(n);
                                                        addToast('تم الحذف', 'info');
                                                    });
                                                }} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`${CARD_CLASS} border-red-900/50 bg-red-900/10`}>
                            <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2"><AlertTriangle size={20}/> منطقة الخطر</h3>
                            <p className="text-slate-400 text-sm mb-4">احذر: هذه الإجراءات لا يمكن التراجع عنها.</p>
                            <button onClick={handleFactoryReset} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Database size={16}/> إعادة ضبط المصنع (مسح كل شيء)</button>
                        </div>
                    </>
                )}

                {passModal && (
                    <Modal title="تغيير كلمة المرور" onClose={()=>setPassModal(false)}>
                        <form onSubmit={handleChangePass} className="space-y-4">
                            <div><label className={LABEL_CLASS}>كلمة المرور الجديدة</label><input type="password" name="newPass" required className={INPUT_CLASS} autoFocus/></div>
                            <button className={BTN_PRIMARY}>حفظ</button>
                        </form>
                    </Modal>
                )}

                {userModal && (
                    <Modal title={editingUser ? "تعديل بيانات موظف" : "إضافة مستخدم جديد"} onClose={()=>{setUserModal(false); setEditingUser(null)}}>
                         <form onSubmit={handleSaveUser} className="space-y-4">
                            <div><label className={LABEL_CLASS}>الاسم الكامل</label><input name="name" defaultValue={editingUser?.name} required className={INPUT_CLASS}/></div>
                            <div><label className={LABEL_CLASS}>اسم الدخول</label><input name="username" defaultValue={editingUser?.username} required className={INPUT_CLASS}/></div>
                            
                            {editingUser ? (
                                <div><label className={LABEL_CLASS}>تغيير كلمة المرور (اتركها فارغة للإبقاء عليها)</label><input name="password" placeholder="******" className={INPUT_CLASS}/></div>
                            ) : (
                                <div className="p-3 bg-blue-900/20 text-blue-200 text-xs rounded border border-blue-800">
                                    سيتم تعيين كلمة المرور الافتراضية: <b>123</b>
                                </div>
                            )}

                            <div className="border border-slate-700 p-3 rounded-lg max-h-40 overflow-y-auto">
                                <label className={LABEL_CLASS}>الصلاحيات</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {PERMISSIONS_LIST.map(p => (
                                        <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1 hover:bg-slate-800 rounded">
                                            <input type="checkbox" name="perms" value={p.id} defaultChecked={editingUser?.permissions.includes(p.id)} className="accent-brand-500 w-4 h-4"/> 
                                            <span className={p.id === 'ALL' ? 'text-brand-400 font-bold' : ''}>{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button className={BTN_PRIMARY}>{editingUser ? 'حفظ التعديلات' : 'حفظ المستخدم'}</button>
                        </form>
                    </Modal>
                )}
            </div>
        );
    };

    const HomeManager = () => {
         const todayPickups = bookings.filter(b => b.status === BookingStatus.PENDING && toInputDate(b.eventDate) === today);
        const todayReturns = bookings.filter(b => b.status === BookingStatus.ACTIVE); 
        const cleaningAlerts = dresses.filter(d => d.status === DressStatus.CLEANING);
        const lateReturns = bookings.filter(b => b.status === BookingStatus.ACTIVE && new Date(b.eventDate).getTime() < new Date().getTime() - 86400000);

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="تسليمات اليوم" value={todayPickups.length} icon={Truck} color="bg-blue-500" subtext="حجوزات تنتظر التسليم" />
                    <StatCard title="متوقع عودتها" value={todayReturns.length} icon={RotateCcw} color="bg-green-500" subtext="فساتين لدى العملاء" />
                    <StatCard title="تنبيهات الغسيل" value={cleaningAlerts.length} icon={Droplets} color="bg-orange-500" subtext="فساتين تحتاج تنظيف" />
                    <StatCard title="تأخيرات" value={lateReturns.length} icon={AlertTriangle} color="bg-red-500" subtext="تجاوزت موعد الإرجاع" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={CARD_CLASS}>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Gift size={18} className="text-blue-400"/> تسليمات قريبة (48 ساعة)</h3>
                        <div className="space-y-3">
                            {bookings.filter(b => b.status === BookingStatus.PENDING && Math.abs(new Date(b.eventDate).getTime() - new Date().getTime()) < 172800000).slice(0, 5).map(b => (
                                <div key={b.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border-r-2 border-blue-500">
                                    <div>
                                        <p className="text-sm font-bold">{b.customerName}</p>
                                        <p className="text-xs text-slate-500">{b.dressName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-blue-300">{formatDate(b.eventDate)}</p>
                                        <p className="text-[10px] text-red-400">متبقي: {formatCurrency(b.remainingToPay)}</p>
                                    </div>
                                </div>
                            ))}
                            {bookings.filter(b => b.status === BookingStatus.PENDING).length === 0 && <p className="text-slate-500 text-sm text-center">لا توجد تسليمات قريبة</p>}
                        </div>
                    </div>

                    <div className={CARD_CLASS}>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-400"/> تنبيهات التشغيل</h3>
                        <div className="space-y-3">
                            {cleaningAlerts.slice(0, 5).map(d => (
                                <div key={d.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border-r-2 border-orange-500">
                                    <span className="text-sm">{d.name}</span>
                                    <span className="text-[10px] bg-orange-900/30 text-orange-400 px-2 py-1 rounded">تنظيف</span>
                                </div>
                            ))}
                            {cleaningAlerts.length === 0 && <p className="text-slate-500 text-sm text-center">كل الفساتين نظيفة وجاهزة</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (!user) return <Login onLogin={(u) => { setUser(u); setTab('home'); }} />;

    // --- Render structure ---
     return (
        <ErrorBoundary>
            <ToastContext.Provider value={{ addToast }}>
                <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans" dir="rtl">
                    {/* ... Sidebar ... */}
                     <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
                        <div className="p-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 text-white"><Shirt size={24} /></div>
                            <div><h1 className="font-bold text-lg text-white tracking-wide">Elaf Wedding</h1><p className="text-[10px] text-slate-500">Premium Management</p></div>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                            {NAV_ITEMS.map(item => {
                                const Icon = {Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings}[item.icon] as any;
                                const permMap: any = { 
                                    'dresses_rent': 'dresses_rent_view', 
                                    'bookings': 'bookings_view', 
                                    'dresses_sale': 'dresses_sale_view', 
                                    'factory': 'factory_view', 
                                    'delivery': 'delivery_view', 
                                    'finance': ['finance_ops', 'finance_analytics', 'finance_profit_analysis'],
                                    'settings': 'settings_view', 
                                    'customers': 'customers_view' 
                                };
                                if(item.id !== 'home' && !hasPerm(permMap[item.id])) return null;
                                return (
                                    <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all text-sm font-medium ${tab === item.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                                        <Icon size={18} /> <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                            <div className="flex items-center gap-3 mb-4 px-2">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600"><User size={16}/></div>
                                <div><p className="text-sm font-bold text-white">{user.name}</p><p className="text-[10px] text-slate-500">{user.role}</p></div>
                            </div>
                            <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-950/30 py-2 rounded-lg transition-colors text-xs font-bold"><LogOut size={14} /> تسجيل خروج</button>
                        </div>
                    </aside>

                    <main className="flex-1 overflow-y-auto bg-slate-950 relative">
                        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800 p-4 flex justify-between items-center px-8">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">{NAV_ITEMS.find(i=>i.id===tab)?.label}</h2>
                            <div className="flex gap-4">
                                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-400 flex items-center gap-2 shadow-inner"><RotateCcw size={14} className="text-brand-500"/> قيد الاستخدام: <span className="text-white font-bold">{activeBookingsCount}</span></div>
                                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-400 flex items-center gap-2 shadow-inner"><Calendar size={14} className="text-blue-500"/> {new Date().toLocaleDateString('ar-EG')}</div>
                            </div>
                        </header>

                        <div className="p-8 pb-20 max-w-7xl mx-auto">
                            {tab === 'home' && <HomeManager />}
                            {tab === 'dresses_rent' && <RentalManager />}
                            {tab === 'bookings' && <BookingManager />}
                            {tab === 'dresses_sale' && <SalesManager />}
                            {tab === 'factory' && <FactoryManager />}
                            {tab === 'delivery' && <DeliveryManager />}
                            {tab === 'finance' && <FinanceManager />}
                            {tab === 'settings' && <SettingsManager />}
                            {tab === 'customers' && <CustomerManager />}
                            {tab === 'logs' && <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"><table className="w-full text-right text-sm"><thead><tr><th className={TABLE_HEAD_CLASS}>الوقت</th><th className={TABLE_HEAD_CLASS}>المستخدم</th><th className={TABLE_HEAD_CLASS}>الحدث</th><th className={TABLE_HEAD_CLASS}>التفاصيل</th></tr></thead><tbody>{logs.slice(0, 50).map(l => (<tr key={l.id} className={TABLE_ROW_CLASS}><td className="p-4 font-mono text-slate-500">{new Date(l.timestamp).toLocaleString('ar-EG')}</td><td className="p-4 font-bold text-brand-400">{l.username}</td><td className="p-4">{l.action}</td><td className="p-4 text-slate-400 text-xs">{l.details}</td></tr>))}</tbody></table></div>}
                        </div>
                    </main>
                    {printData && <PrePrintedInvoice data={printData.data} type={printData.type} onClose={() => setPrintData(null)} />}
                    <ToastContainer toasts={toasts} removeToast={removeToast} />
                    <ConfirmModal {...confirmState} onCancel={() => setConfirmState(prev => ({...prev, isOpen: false}))} />
                </div>
            </ToastContext.Provider>
        </ErrorBoundary>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
