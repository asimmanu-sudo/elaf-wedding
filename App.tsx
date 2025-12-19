
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, Droplets, User, Factory, 
  RotateCcw, AlertCircle, TrendingUp, Bell, ShoppingBag,
  Gift, AlertTriangle, Lock, 
  Scissors, FileCheck, Cloud, Loader2, Tag, Sparkles, PieChart as PieChartIcon
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

// --- AI Service ---
const generateDressDescription = async (dressName: string, style: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `أنت خبير مبيعات وتسويق لفساتين الزفاف الراقية. اكتب وصفاً تسويقياً جذاباً وشاعرياً باللغة العربية لفستان زفاف اسمه "${dressName}" وتصميمه من نوع "${style}". الوصف يجب أن يكون قصيراً (حوالي 30 كلمة) ويجذب العرائس في "إيلاف لفساتين الزفاف".`,
        });
        return response.text?.trim() || "وصف جميل لفستان زفاف فاخر.";
    } catch (error) {
        console.error("AI Generation Error:", error);
        return "حدث خطأ أثناء توليد الوصف. يرجى المحاولة لاحقاً.";
    }
};

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
                const maintenanceCost = finance.filter(f => f.type === 'EXPENSE' && (f.notes?.includes(d.name) || f.notes?.includes(d.id))).reduce((sum, f) => sum + f.amount, 0);
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
                    {/* Fixed missing PieChartIcon by importing from lucide-react */}
                    <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2"><PieChartIcon size={20} className="text-purple-500"/> تحليل المصروفات</h3>
                    <div className="h-64 w-full text-xs flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{expenseData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className={CARD_CLASS}>
                 <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2"><FileText size={20} className="text-brand-500"/> ربحية الفساتين</h3>
                 <div className="h-64 w-full text-xs mb-6">
                        <ResponsiveContainer width="100%" height="100%"><BarChart data={profitData.slice(0, 10)} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} /><XAxis type="number" stroke="#94a3b8" /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} /><RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} cursor={{fill: '#334155', opacity: 0.2}} /><Bar dataKey="profit" name="صافي الربح" fill="#d946ef" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};

const ConfigWarning = () => (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white p-8">
        <div className="bg-slate-900 border border-red-500 rounded-xl p-8 max-w-lg text-center shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">النظام غير متصل</h1>
            <p className="text-slate-400 mb-6">يجب إعداد <b>Firebase</b> في ملف <code>services/firebase.ts</code> ببيانات مشروعك الحقيقية لكي يعمل النظام أونلاين.</p>
            <p className="text-xs text-slate-500 mb-6 font-mono">تأكد أيضاً من تشغيل الأمر: npm install firebase</p>
            <button onClick={()=>window.location.reload()} className={BTN_PRIMARY}>تحديث</button>
        </div>
    </div>
);

const Login = ({ users, onLogin }: { users: UserType[], onLogin: (u: UserType) => void }) => {
    const [user, setU] = useState(''); const [pass, setP] = useState(''); const [err, setE] = useState('');
    const [isInit, setIsInit] = useState(false);

    const handle = async (e: any) => {
        e.preventDefault(); setE('');
        let u = users.find(x => x.username.toLowerCase() === user.toLowerCase() && x.password === pass);
        // AUTO-CREATE ADMIN FOR FIRST RUN
        if (!u && users.length === 0 && user.toLowerCase() === 'admin' && pass === '123') {
            setIsInit(true);
            try {
                const newAdmin: UserType = { id: 'admin-init', username: 'admin', password: '123', role: UserRole.ADMIN, name: 'المدير العام', permissions: ['ALL'] };
                await cloudDb.add(cloudDb.COLLS.USERS, newAdmin);
                u = newAdmin;
            } catch (error) { setE('حدث خطأ أثناء تهيئة النظام'); setIsInit(false); return; }
        }
        if (u) onLogin(u); else { setE('بيانات غير صحيحة'); setIsInit(false); }
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
                <p className="text-slate-400 text-sm mb-6 flex items-center gap-1 justify-center"><Cloud size={12}/> نظام سحابي متصل</p>
                <form onSubmit={handle} className="space-y-4 w-full">
                    <div><label className={LABEL_CLASS}>اسم المستخدم</label><input value={user} onChange={e=>setU(e.target.value)} className={INPUT_CLASS} placeholder="admin" autoFocus /></div>
                    <div><label className={LABEL_CLASS}>كلمة المرور</label><input type="password" value={pass} onChange={e=>setP(e.target.value)} className={INPUT_CLASS} placeholder="••••" /></div>
                    {err && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">{err}</div>}
                    {users.length === 0 && <div className="p-2 bg-blue-900/20 border border-blue-900/30 rounded text-blue-300 text-[10px] text-center">النظام جديد! استخدم <b>admin</b> و <b>123</b> للبدء.</div>}
                    <button disabled={isInit} className={BTN_PRIMARY}>{isInit ? <><Loader2 className="animate-spin" size={18}/> جاري الاتصال...</> : 'دخول النظام'}</button>
                </form>
            </div>
        </div>
    );
};

const PrePrintedInvoice = ({ data, type, onClose }: {data: any, type: string, onClose: () => void}) => {
    const date = new Date();
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = days[date.getDay()];
    if (type === 'ORDER_DETAILS') {
        return (
            <div className="fixed inset-0 z-[200] bg-white text-black flex flex-col overflow-y-auto">
                 <div className="p-4 bg-gray-100 flex justify-between items-center print:hidden border-b">
                    <h2 className="font-bold text-lg">تفاصيل الأوردر (للخياط)</h2>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"><Printer size={16}/> طباعة</button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 font-bold">إغلاق</button>
                    </div>
                </div>
                <div className="p-8 max-w-[210mm] mx-auto w-full bg-white min-h-screen">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 mx-auto mb-2 bg-black rounded-full flex items-center justify-center text-white font-serif text-xl font-bold">ELAF</div>
                        <h1 className="text-3xl font-bold font-serif">Elaf For Wedding Dress</h1>
                    </div>
                    <div className="flex justify-between border-t-2 border-b-2 border-black py-3 mb-6 font-bold text-sm">
                        <div className="text-right"><p>التاريخ: {date.toLocaleDateString('ar-EG')}</p><p>اليوم: {dayName}</p></div>
                        <div className="text-left"><p>العروس: {data.brideName || data.customerName}</p><p>الكود: {data.factoryCode || data.id}</p></div>
                    </div>
                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-3 border-b border-gray-300 inline-block pb-1 text-blue-800">جدول المقاسات (سم)</h3>
                        <div className="grid grid-cols-3 gap-y-3 gap-x-8 text-sm">
                            {['neck','shoulder','chest','underChest','chestDart','waist','backLength','hips','fullLength','sleeve','armhole','arm','forearm','wrist','legOpening'].map(k => (
                                <div key={k} className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                                    <span className="capitalize">{k}:</span><span className="font-bold">{(data.measurements as any)?.[k] || '-'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div><h3 className="font-bold text-lg mb-2 border-b border-gray-300 text-blue-800">تفاصيل التصميم</h3><div className="space-y-2 text-sm"><p><span className="font-bold">نوع الصدر:</span> {data.measurements?.bustType || '-'}</p><p><span className="font-bold">نوع التنورة:</span> {data.measurements?.skirtType || '-'}</p></div></div>
                        <div><h3 className="font-bold text-lg mb-2 border-b border-gray-300 text-blue-800">الخامات</h3><p className="text-sm whitespace-pre-wrap">{data.measurements?.materials || '-'}</p></div>
                    </div>
                    <div className="border-2 border-black p-4 min-h-[150px] rounded"><h3 className="font-bold mb-2 underline">الشرح المطلوب للأوردر (الملاحظات)</h3><p className="text-sm whitespace-pre-wrap leading-relaxed">{data.measurements?.orderNotes || data.dressDescription || data.notes || '-'}</p></div>
                </div>
            </div>
        );
    }
    return (
        <div className="fixed inset-0 z-[200] bg-white text-black flex flex-col overflow-y-auto">
            <div className="p-4 bg-gray-100 flex justify-between items-center print:hidden border-b">
                <h2 className="font-bold text-lg">معاينة الفاتورة</h2>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"><Printer size={16}/> طباعة</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 font-bold">إغلاق</button>
                </div>
            </div>
            <div className="p-8 max-w-4xl mx-auto w-full bg-white min-h-screen">
                <div className="text-center border-b-2 border-black pb-6 mb-8"><h1 className="text-4xl font-bold font-serif mb-2">Elaf Wedding</h1><p className="text-gray-600">{type === 'BOOKING' ? 'عقد إيجار فستان' : type === 'SALE' ? 'عقد تفصيل/بيع' : 'سند استلام'}</p><p className="text-sm mt-2">{new Date().toLocaleDateString('ar-EG')}</p></div>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <div><h3 className="font-bold border-b border-gray-300 mb-2">بيانات العميل</h3><p><span className="font-bold">الاسم:</span> {data.customerName || data.brideName}</p><p><span className="font-bold">الهاتف:</span> {data.customerPhone || data.bridePhone}</p></div>
                        <div><h3 className="font-bold border-b border-gray-300 mb-2">بيانات الفستان</h3><p><span className="font-bold">الموديل:</span> {data.dressName || data.dressDescription}</p><p><span className="font-bold">السعر:</span> {formatCurrency(data.agreedRentalPrice || data.sellPrice)}</p></div>
                    </div>
                    {data.notes && <div><h3 className="font-bold border-b border-gray-300 mb-2">ملاحظات</h3><p className="text-sm">{data.notes}</p></div>}
                    <div className="border-t-2 border-black pt-4 mt-12 flex justify-between px-8"><div className="text-center"><p className="font-bold mb-8">توقيع العميل</p><p>....................</p></div><div className="text-center"><p className="font-bold mb-8">توقيع الموظف</p><p>....................</p></div></div>
                </div>
            </div>
        </div>
    );
};

// --- Main Application ---
const App = () => {
    if (!isConfigured) return <ConfigWarning />;

    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [toasts, setToasts] = useState<{id: string, msg: string, type: 'success'|'error'|'info'}[]>([]);
    const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
    const [printData, setPrintData] = useState<{data: any, type: string} | null>(null);
    const [loading, setLoading] = useState(true);

    // Data States
    const [dresses, setDresses] = useState<Dress[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [sales, setSales] = useState<SaleOrder[]>([]);
    const [finance, setFinance] = useState<FinanceRecord[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);

    const addToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
        const id = Math.random().toString();
        setToasts(prev => [...prev, {id, msg, type}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
    
    const confirmAction = (title: string, message: string, onConfirm: () => void) => {
        setConfirmState({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setConfirmState(prev => ({...prev, isOpen: false})); }});
    };

    // Firebase Subscriptions (Mismatched realtime sync)
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
        setTimeout(() => setLoading(false), 1200); 
        return () => unsubs.forEach(u => u());
    }, []);

    const activeBookingsCount = bookings.filter(b => b.status === BookingStatus.ACTIVE).length;
    const hasPerm = (p: string | string[]) => {
        if (user?.role === UserRole.ADMIN || user?.permissions?.includes('ALL')) return true;
        if (Array.isArray(p)) return p.some(perm => user?.permissions?.includes(perm));
        return user?.permissions?.includes(p);
    };

    const MeasureInput = ({label, name, def}: any) => (
        <div><label className="block text-[10px] text-slate-400 mb-1">{label}</label><input name={name} defaultValue={def} className={`${INPUT_CLASS} py-1.5`} /></div>
    );

    // --- Sub-Managers ---

    const RentalManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [editing, setEditing] = useState<Dress|null>(null);
        const [search, setSearch] = useState('');
        const [view, setView] = useState<'CURRENT'|'ARCHIVED'|'ANALYTICS'>('CURRENT');
        const [isAiLoading, setIsAiLoading] = useState(false);

        const handleAiDescription = async () => {
            const nameEl = document.getElementById('dress_name') as HTMLInputElement;
            const styleEl = document.getElementById('dress_style') as HTMLInputElement;
            const name = nameEl?.value;
            const style = styleEl?.value;
            if(!name) { addToast("يرجى كتابة اسم الفستان أولاً لتمكين الذكاء الاصطناعي", "info"); return; }
            setIsAiLoading(true);
            const desc = await generateDressDescription(name, style || "");
            const noteEl = document.getElementById('dress_notes') as HTMLTextAreaElement;
            if(noteEl) noteEl.value = desc;
            setIsAiLoading(false);
            addToast("تم توليد الوصف بنجاح ✨", "success");
        };

        const filteredDresses = dresses.filter(d => d.type === DressType.RENT && (view === 'ARCHIVED' ? d.status === DressStatus.ARCHIVED : d.status !== DressStatus.ARCHIVED) && (d.name.includes(search) || d.style.includes(search)));
        const analyticsData = useMemo(() => {
            return dresses.filter(d => d.type === DressType.RENT).map(d => {
                const dressBookings = bookings.filter(b => b.dressId === d.id);
                const sortedBookings = [...dressBookings].sort((a,b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
                const lastRental = sortedBookings.length > 0 ? sortedBookings[0].eventDate : null;
                const totalIncome = dressBookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((a,b) => a + (b.agreedRentalPrice || 0), 0);
                return { ...d, realRentalCount: dressBookings.length, lastRental, totalIncome };
            }).sort((a,b) => b.realRentalCount - a.realRentalCount);
        }, [dresses, bookings]);

        const handleSave = async (e: any) => {
            e.preventDefault(); const f = e.target;
            const newItem: any = {
                id: editing ? editing.id : `DR-${Math.random().toString(36).substr(2,9)}`,
                name: f.name.value, style: f.style.value, type: DressType.RENT,
                factoryPrice: Number(f.factoryPrice.value), rentalPrice: Number(f.rentalPrice.value || 0),
                status: editing ? editing.status : DressStatus.AVAILABLE, image: '', notes: f.notes.value,
                purchaseDate: editing ? editing.purchaseDate : new Date().toISOString(),
                createdAt: editing ? editing.createdAt : new Date().toISOString(), rentalCount: editing ? editing.rentalCount : 0
            };
            await cloudDb.add(cloudDb.COLLS.DRESSES, newItem);
            await cloudDb.log(user!, editing ? 'تعديل فستان' : 'إضافة فستان', newItem.name);
            setShowModal(false); setEditing(null); addToast('تم الحفظ سحابياً', 'success');
        };

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit">
                        <button onClick={()=>setView('CURRENT')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='CURRENT' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>المخزون</button>
                        <button onClick={()=>setView('ARCHIVED')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='ARCHIVED' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>الأرشيف</button>
                        {hasPerm('dresses_rent_analytics') && <button onClick={()=>setView('ANALYTICS')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='ANALYTICS' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>الأكثر طلباً</button>}
                    </div>
                    {view !== 'ANALYTICS' && (
                        <div className="flex gap-2">
                            <div className="relative"><Search className="absolute right-3 top-2.5 text-slate-500" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className={`${INPUT_CLASS} pr-10`} /></div>
                            {hasPerm('dresses_rent_add') && <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> جديد</button>}
                        </div>
                    )}
                </div>
                {view === 'ANALYTICS' ? (
                     <div className={CARD_CLASS}><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b border-slate-700 text-slate-400"><th className="p-3">#</th><th className="p-3">الفستان</th><th className="p-3">مرات التأجير</th><th className="p-3">آخر تأجير</th><th className="p-3">الإيراد</th></tr></thead><tbody>{analyticsData.map((d, i) => (<tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-700/30"><td className="p-3 text-slate-500 font-mono">{i+1}</td><td className="p-3 font-bold">{d.name}</td><td className="p-3 text-brand-400 font-bold">{d.realRentalCount}</td><td className="p-3 text-slate-400">{d.lastRental ? formatDate(d.lastRental) : '-'}</td><td className="p-3 text-green-400 font-mono">{formatCurrency(d.totalIncome)}</td></tr>))}</tbody></table></div></div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredDresses.map(d => (<div key={d.id} className={CARD_CLASS}><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg">{d.name}</h4><span className={`text-[10px] px-2 py-0.5 rounded border ${d.status===DressStatus.AVAILABLE?'border-green-500 text-green-500':d.status===DressStatus.RENTED?'border-blue-500 text-blue-500':'border-red-500 text-red-500'}`}>{d.status}</span></div><p className="text-sm text-slate-400 mb-2">{d.style}</p><div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">{hasPerm('dresses_rent_add') && <button onClick={()=>{setEditing(d); setShowModal(true)}} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-white">تعديل</button>}{hasPerm('dresses_rent_delete') && <button onClick={()=>confirmAction('أرشفة','هل تريد أرشفة الفستان؟',async()=>{await cloudDb.update(cloudDb.COLLS.DRESSES,d.id,{status:DressStatus.ARCHIVED}); addToast('تمت الأرشفة')})} className="px-3 bg-red-900/20 text-red-400 rounded"><Trash2 size={16}/></button>}</div></div>))}</div>
                )}
                {showModal && <Modal title={editing ? 'تعديل' : 'جديد'} onClose={()=>{setShowModal(false); setEditing(null)}}><form onSubmit={handleSave} className="space-y-4"><input id="dress_name" name="name" defaultValue={editing?.name} placeholder="اسم الفستان" className={INPUT_CLASS} required /><input id="dress_style" name="style" defaultValue={editing?.style} placeholder="الموديل" className={INPUT_CLASS} /><div className="grid grid-cols-2 gap-4"><input name="factoryPrice" type="number" defaultValue={editing?.factoryPrice} placeholder="سعر الشراء" className={INPUT_CLASS} /><input name="rentalPrice" type="number" defaultValue={editing?.rentalPrice} placeholder="سعر الإيجار" className={INPUT_CLASS} /></div><div className="relative"><textarea id="dress_notes" name="notes" defaultValue={editing?.notes} placeholder="ملاحظات أو وصف تسويقي" className={`${INPUT_CLASS} min-h-[100px]`} /><button type="button" onClick={handleAiDescription} disabled={isAiLoading} className="absolute left-2 bottom-2 bg-brand-600/20 hover:bg-brand-600 text-brand-400 hover:text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 border border-brand-600/30 transition-all">{isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {isAiLoading ? 'جاري التوليد...' : 'توليد وصف ذكي'}</button></div><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}
            </div>
        );
    };

    const BookingManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [showMeasures, setShowMeasures] = useState<{show: boolean, booking: Booking|null}>({show: false, booking: null});
        const [editing, setEditing] = useState<Booking|null>(null);
        const [search, setSearch] = useState('');
        
        const handleSave = async (e: any) => {
            e.preventDefault(); const f = e.target;
            const price = Number(f.price.value); const deposit = Number(f.deposit.value);
            const dress = dresses.find(d => d.id === f.dressId.value);
            const newItem: any = {
                id: editing ? editing.id : `BK-${Math.random().toString(36).substr(2,7).toUpperCase()}`,
                customerId: 'C-NEW', customerName: f.customerName.value, customerPhone: f.customerPhone.value,
                dressId: f.dressId.value, dressName: dress?.name || '',
                eventDate: f.eventDate.value, bookingDate: editing?.bookingDate || new Date().toISOString(),
                agreedRentalPrice: price, paidDeposit: deposit, remainingToPay: price - deposit,
                paymentMethod: f.paymentMethod.value, status: editing ? editing.status : BookingStatus.PENDING,
                notes: f.notes.value, deliveryDetails: editing?.deliveryDetails, returnDetails: editing?.returnDetails, createdAt: editing?.createdAt || new Date().toISOString(),
                measurements: editing?.measurements || {}
            };
            await cloudDb.add(cloudDb.COLLS.BOOKINGS, newItem);
            if (!editing && deposit > 0) await cloudDb.add(cloudDb.COLLS.FINANCE, { id: `INC-BK-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'عربون حجز', amount: deposit, notes: `حجز ${newItem.id} - ${newItem.customerName}`, createdBy: user?.username });
            setShowModal(false); setEditing(null); addToast('تم الحفظ', 'success');
        };

        const handleSaveMeasures = async (e: any) => {
            e.preventDefault(); const f = e.target; const b = showMeasures.booking!;
            const meas: any = {};
            ['neck','shoulder','chest','underChest','chestDart','waist','backLength','hips','fullLength','sleeve','armhole','arm','forearm','wrist','legOpening'].forEach(k => meas[k] = f[`meas_${k}`]?.value);
            meas.orderNotes = f.orderNotes.value;
            await cloudDb.update(cloudDb.COLLS.BOOKINGS, b.id, {measurements: meas});
            setShowMeasures({show: false, booking: null}); addToast('تم حفظ المقاسات');
        };

        const filtered = bookings.filter(b => b.status !== BookingStatus.CANCELLED && (b.customerName.includes(search) || b.dressName.includes(search))).sort((a,b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

        return (
            <div className="space-y-4 animate-fade-in">
                 <div className="flex justify-between items-center"><h3 className="text-xl font-bold text-white">الحجوزات</h3><div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className={`${INPUT_CLASS} w-40 py-2`} />{hasPerm('bookings_add') && <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 px-3 py-2 rounded text-white font-bold"><Plus/></button>}</div></div>
                 <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"><table className="w-full text-right text-sm"><thead><tr><th className={TABLE_HEAD_CLASS}>رقم الحجز</th><th className={TABLE_HEAD_CLASS}>العميلة</th><th className={TABLE_HEAD_CLASS}>الفستان</th><th className={TABLE_HEAD_CLASS}>التاريخ</th><th className={TABLE_HEAD_CLASS}>الحساب</th><th className={TABLE_HEAD_CLASS}>الحالة</th><th className={TABLE_HEAD_CLASS}>إجراءات</th></tr></thead><tbody>{filtered.map(b => (<tr key={b.id} className={TABLE_ROW_CLASS}><td className="p-4 font-mono text-xs">{b.id}</td><td className="p-4 font-bold">{b.customerName}</td><td className="p-4">{b.dressName}</td><td className="p-4">{formatDate(b.eventDate)}</td><td className="p-4">{b.remainingToPay > 0 ? <span className="text-red-400">متبقي: {formatCurrency(b.remainingToPay)}</span> : <span className="text-green-400">خالص</span>}</td><td className="p-4"><span className={BADGE_CLASS}>{b.status}</span></td><td className="p-4 flex gap-1"><button onClick={()=>{setShowMeasures({show: true, booking: b})}} className="p-1.5 hover:bg-slate-600 rounded text-brand-300" title="مقاسات التعديل"><Scissors size={16}/></button><button onClick={()=>{setEditing(b); setShowModal(true)}} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><Edit size={16}/></button><button onClick={()=>setPrintData({data: b, type: 'BOOKING'})} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><Printer size={16}/></button>{hasPerm('bookings_delete') && <button onClick={()=>confirmAction('إلغاء','إلغاء الحجز؟',async ()=>await cloudDb.update(cloudDb.COLLS.BOOKINGS,b.id,{status:BookingStatus.CANCELLED}))} className="p-1.5 hover:bg-red-900/30 rounded text-red-400"><Trash2 size={16}/></button>}</td></tr>))}</tbody></table></div>
                 {showModal && <Modal title={editing ? 'تعديل' : 'حجز جديد'} onClose={()=>{setShowModal(false); setEditing(null)}}><form onSubmit={handleSave} className="space-y-4"><div className="grid grid-cols-2 gap-4"><input name="customerName" defaultValue={editing?.customerName} placeholder="العروس" className={INPUT_CLASS}/><input name="customerPhone" defaultValue={editing?.customerPhone} placeholder="الهاتف" className={INPUT_CLASS}/></div><select name="dressId" defaultValue={editing?.dressId} className={INPUT_CLASS} required><option value="">اختر فستاناً...</option>{dresses.filter(d => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select><input type="date" name="eventDate" defaultValue={toInputDate(editing?.eventDate)} className={INPUT_CLASS} required/><div className="grid grid-cols-2 gap-4"><input type="number" name="price" defaultValue={editing?.agreedRentalPrice} placeholder="سعر الإيجار" className={INPUT_CLASS}/><input type="number" name="deposit" defaultValue={editing?.paidDeposit} placeholder="العربون" className={INPUT_CLASS}/></div><select name="paymentMethod" defaultValue={editing?.paymentMethod} className={INPUT_CLASS}>{Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}</select><textarea name="notes" defaultValue={editing?.notes} placeholder="ملاحظات" className={INPUT_CLASS}/><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}
                 {showMeasures.show && <Modal title="مقاسات التعديل (للخياط)" onClose={()=>setShowMeasures({show: false, booking: null})} size="lg"><form onSubmit={handleSaveMeasures} className="space-y-4"><div className="grid grid-cols-4 gap-3">{['neck','shoulder','chest','underChest','chestDart','waist','backLength','hips','fullLength','sleeve','armhole','arm','forearm','wrist','legOpening'].map(k => (<MeasureInput key={k} label={k} name={`meas_${k}`} def={(showMeasures.booking?.measurements as any)?.[k]} />))}</div><textarea name="orderNotes" defaultValue={showMeasures.booking?.measurements?.orderNotes} placeholder="ملاحظات التعديل" className={INPUT_CLASS} rows={3}/><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}
            </div>
        );
    };

    const SalesManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [showMeasures, setShowMeasures] = useState<{show: boolean, order: SaleOrder|null}>({show: false, order: null});
        const [deliveryModal, setDeliveryModal] = useState<{show: boolean, order: SaleOrder|null}>({show: false, order: null});
        const [editing, setEditing] = useState<SaleOrder|null>(null);
        const [saleTab, setSaleTab] = useState<'DESIGN'|'DELIVERED'>('DESIGN');
        const [isAiLoading, setIsAiLoading] = useState(false);

        const handleAiDescription = async () => {
            const descInput = document.getElementById('sale_desc') as HTMLInputElement;
            const currentDesc = descInput?.value;
            if(!currentDesc) { addToast("يرجى كتابة وصف بسيط للفستان أولاً لتمكين الذكاء الاصطناعي", "info"); return; }
            setIsAiLoading(true);
            const richDesc = await generateDressDescription(currentDesc, "تفصيل حسب الطلب");
            if(descInput) descInput.value = richDesc;
            setIsAiLoading(false);
            addToast("تم توليد وصف إبداعي ✨", "success");
        };

        const handleSave = async (e: any) => {
            e.preventDefault(); const f = e.target;
            const newItem: any = {
                id: editing ? editing.id : `S-${Math.random().toString(36).substr(2,8)}`,
                factoryCode: f.factoryCode.value, brideName: f.brideName.value, bridePhone: f.bridePhone.value, dressDescription: f.desc.value,
                factoryPrice: Number(f.factoryPrice.value), sellPrice: Number(f.sellPrice.value), deposit: Number(f.deposit.value),
                remainingFromBride: Number(f.sellPrice.value) - Number(f.deposit.value), status: editing ? editing.status : SaleStatus.DESIGNING,
                factoryStatus: editing ? editing.factoryStatus : FactoryPaymentStatus.UNPAID, factoryDepositPaid: editing ? editing.factoryDepositPaid : 0,
                expectedDeliveryDate: f.date.value, orderDate: editing?.orderDate || new Date().toISOString(), createdAt: new Date().toISOString(),
                measurements: editing?.measurements || {}
            };
            await cloudDb.add(cloudDb.COLLS.SALES, newItem);
            setShowModal(false); setEditing(null); addToast('تم حفظ طلب التفصيل');
        };
        const handleSaveMeasures = async (e: any) => {
            e.preventDefault(); const f = e.target; const order = showMeasures.order!;
            const meas: any = {};
            ['neck','shoulder','chest','underChest','chestDart','waist','backLength','hips','fullLength','sleeve','armhole','arm','forearm','wrist','legOpening'].forEach(k => meas[k] = f[`meas_${k}`]?.value);
            meas.orderNotes = f.orderNotes.value; meas.bustType = f.bustType.value; meas.skirtType = f.skirtType.value; meas.materials = f.materials.value;
            await cloudDb.update(cloudDb.COLLS.SALES, order.id, {measurements: meas});
            setShowMeasures({show: false, order: null}); addToast('تم حفظ المقاسات');
        };
        const handleDelivery = async (e: any) => {
            e.preventDefault(); const paidNow = Number(e.target.paidNow.value); const order = deliveryModal.order!;
            const newRemaining = order.remainingFromBride - paidNow;
            await cloudDb.update(cloudDb.COLLS.SALES, order.id, {status: SaleStatus.DELIVERED, remainingFromBride: newRemaining});
            if (paidNow > 0) await cloudDb.add(cloudDb.COLLS.FINANCE, {id: `INC-S-FINAL-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'دفعة استلام بيع', amount: paidNow, notes: `تسليم بيع ${order.id}`});
            setDeliveryModal({show: false, order: null}); addToast('تم التسليم');
        };
        const designingOrders = sales.filter(s => s.status !== SaleStatus.DELIVERED && s.status !== SaleStatus.CANCELLED);
        const deliveredOrders = sales.filter(s => s.status === SaleStatus.DELIVERED);
        return (
            <div className="space-y-4 animate-fade-in">
                 <div className="flex flex-col md:flex-row justify-between gap-4"><div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit"><button onClick={()=>setSaleTab('DESIGN')} className={`px-4 py-2 rounded-md font-bold text-xs ${saleTab==='DESIGN' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>تحت التنفيذ</button><button onClick={()=>setSaleTab('DELIVERED')} className={`px-4 py-2 rounded-md font-bold text-xs ${saleTab==='DELIVERED' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>تم التسليم</button></div>{hasPerm('dresses_sale_add') && <button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> أمر تفصيل</button>}</div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"><table className="w-full text-right text-sm"><thead><tr><th className={TABLE_HEAD_CLASS}>الكود</th><th className={TABLE_HEAD_CLASS}>العروس</th><th className={TABLE_HEAD_CLASS}>الموعد</th><th className={TABLE_HEAD_CLASS}>المتبقي</th><th className={TABLE_HEAD_CLASS}>إجراءات</th></tr></thead><tbody>{(saleTab==='DESIGN' ? designingOrders : deliveredOrders).map(s => (<tr key={s.id} className={TABLE_ROW_CLASS}><td className="p-4 font-mono">{s.factoryCode}</td><td className="p-4 font-bold">{s.brideName}</td><td className="p-4">{formatDate(s.expectedDeliveryDate)}</td><td className="p-4 text-red-400 font-bold">{formatCurrency(s.remainingFromBride)}</td><td className="p-4 flex gap-1">{saleTab==='DESIGN' && hasPerm('dresses_sale_deliver') && <button onClick={()=>setDeliveryModal({show: true, order: s})} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold shadow-lg">تم التسليم</button>}<button onClick={()=>{setShowMeasures({show: true, order: s})}} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-brand-300" title="المقاسات"><Scissors size={16}/></button>{hasPerm('dresses_sale_add') && <button onClick={()=>{setEditing(s); setShowModal(true)}} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><Edit size={16}/></button>}<button onClick={()=>setPrintData({data: s, type: 'SALE'})} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><Printer size={16}/></button><button onClick={()=>setPrintData({data: s, type: 'ORDER_DETAILS'})} className="p-1.5 bg-brand-900/50 hover:bg-brand-900 rounded text-brand-300" title="طباعة للخياط"><FileCheck size={16}/></button></td></tr>))}</tbody></table></div>
                {showModal && <Modal title="طلب تفصيل" onClose={()=>{setShowModal(false); setEditing(null)}} size="lg"><form onSubmit={handleSave} className="space-y-4"><div className="grid grid-cols-2 gap-4"><input name="factoryCode" defaultValue={editing?.factoryCode} placeholder="كود المصنع" className={INPUT_CLASS}/><input name="date" type="date" defaultValue={toInputDate(editing?.expectedDeliveryDate)} className={INPUT_CLASS}/></div><div className="grid grid-cols-2 gap-4"><input name="brideName" defaultValue={editing?.brideName} placeholder="اسم العروس" className={INPUT_CLASS}/><input name="bridePhone" defaultValue={editing?.bridePhone} placeholder="الهاتف" className={INPUT_CLASS}/></div><div className="relative"><input id="sale_desc" name="desc" defaultValue={editing?.dressDescription} placeholder="وصف الفستان" className={INPUT_CLASS}/><button type="button" onClick={handleAiDescription} disabled={isAiLoading} className="absolute left-2 top-1.5 bg-brand-600/20 hover:bg-brand-600 text-brand-400 hover:text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 border border-brand-600/30 transition-all">{isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {isAiLoading ? 'جاري التوليد...' : 'ذكاء اصطناعي'}</button></div><div className="grid grid-cols-3 gap-3"><input name="factoryPrice" type="number" defaultValue={editing?.factoryPrice} placeholder="سعر المصنع" className={INPUT_CLASS}/><input name="sellPrice" type="number" defaultValue={editing?.sellPrice} placeholder="سعر البيع" className={INPUT_CLASS}/><input name="deposit" type="number" defaultValue={editing?.deposit} placeholder="العربون" className={INPUT_CLASS}/></div><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}
                {showMeasures.show && <Modal title="المقاسات والتصميم" onClose={()=>setShowMeasures({show: false, order: null})} size="lg"><form onSubmit={handleSaveMeasures} className="space-y-6"><div className="grid grid-cols-4 gap-3">{['neck','shoulder','chest','underChest','chestDart','waist','backLength','hips','fullLength','sleeve','armhole','arm','forearm','wrist','legOpening'].map(k => (<MeasureInput key={k} label={k} name={`meas_${k}`} def={(showMeasures.order?.measurements as any)?.[k]} />))}</div><div className="grid grid-cols-2 gap-4"><MeasureInput label="نوع الصدر" name="bustType" def={showMeasures.order?.measurements?.bustType}/><MeasureInput label="نوع التنورة" name="skirtType" def={showMeasures.order?.measurements?.skirtType}/></div><div><label className={LABEL_CLASS}>الخامات المستخدمة</label><textarea name="materials" defaultValue={showMeasures.order?.measurements?.materials} className={INPUT_CLASS} rows={2}></textarea></div><div><label className={LABEL_CLASS}>ملاحظات التصميم</label><textarea name="orderNotes" defaultValue={showMeasures.order?.measurements?.orderNotes} className={INPUT_CLASS} rows={3}></textarea></div><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}
                {deliveryModal.show && <Modal title="تسليم للعروس" onClose={()=>setDeliveryModal({show: false, order: null})}><form onSubmit={handleDelivery} className="space-y-4"><div className="p-4 bg-slate-800 rounded border border-slate-700 text-center"><p className="text-xs text-slate-500">المبلغ المتبقي</p><h3 className="text-2xl font-bold text-red-500">{formatCurrency(deliveryModal.order?.remainingFromBride)}</h3></div><div><label className={LABEL_CLASS}>المبلغ المدفوع الآن</label><input type="number" name="paidNow" defaultValue={deliveryModal.order?.remainingFromBride} className={INPUT_CLASS}/></div><button className={BTN_PRIMARY}>تأكيد</button></form></Modal>}
            </div>
        );
    }

    const FactoryManager = () => {
        const [selected, setSelected] = useState<string[]>([]);
        const [payModal, setPayModal] = useState<{show: boolean, type: 'DEPOSIT'|'FINAL'}>({show: false, type: 'DEPOSIT'});
        const handlePay = async (e: any) => {
            e.preventDefault();
            const promises = selected.map(async id => {
                const item = sales.find(x => x.id === id);
                if(item) {
                    const amount = payModal.type === 'FINAL' ? (item.factoryPrice - item.factoryDepositPaid) : Number(e.target[`amt_${id}`]?.value || 0);
                    if(amount > 0) {
                        const newPaid = item.factoryDepositPaid + amount;
                        const status = newPaid >= item.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL;
                        await cloudDb.update(cloudDb.COLLS.SALES, id, {factoryDepositPaid: newPaid, factoryStatus: status});
                        await cloudDb.add(cloudDb.COLLS.FINANCE, {id: `EXP-FAC-${Math.random()}`, date: new Date().toISOString(), type: 'EXPENSE', category: 'دفعة مصنع', amount, notes: `كود ${item.factoryCode}`, createdBy: user?.username});
                    }
                }
            });
            await Promise.all(promises);
            setSelected([]); setPayModal({show: false, type: 'DEPOSIT'}); addToast('تم سداد الدفعات');
        };
        const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
        return (
            <div className="space-y-4 animate-fade-in"><div className="flex justify-between items-center"><h3 className="text-xl font-bold text-white">حسابات المصنع</h3>{selected.length > 0 && hasPerm('factory_pay') && <div className="flex gap-2"><button onClick={()=>setPayModal({show: true, type: 'DEPOSIT'})} className="bg-yellow-600 px-3 py-1 rounded text-xs text-white">عربون</button><button onClick={()=>setPayModal({show: true, type: 'FINAL'})} className="bg-green-600 px-3 py-1 rounded text-xs text-white">سداد نهائي</button></div>}</div><div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"><table className="w-full text-right text-sm"><thead><tr><th className="p-4 w-10"></th><th className={TABLE_HEAD_CLASS}>كود</th><th className={TABLE_HEAD_CLASS}>وصف</th><th className={TABLE_HEAD_CLASS}>السعر</th><th className={TABLE_HEAD_CLASS}>مدفوع</th><th className={TABLE_HEAD_CLASS}>متبقي</th><th className={TABLE_HEAD_CLASS}>الحالة</th></tr></thead><tbody>{sales.filter(s => s.factoryStatus !== FactoryPaymentStatus.PAID).map(s => (<tr key={s.id} className={`${TABLE_ROW_CLASS} ${selected.includes(s.id) ? 'bg-brand-900/10' : ''}`}><td className="p-4"><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)} className="accent-brand-500 w-4 h-4 cursor-pointer"/></td><td className="p-4 font-mono">{s.factoryCode}</td><td className="p-4">{s.dressDescription}</td><td className="p-4">{formatCurrency(s.factoryPrice)}</td><td className="p-4 text-green-400">{formatCurrency(s.factoryDepositPaid)}</td><td className="p-4 text-red-400 font-bold">{formatCurrency(s.factoryPrice - s.factoryDepositPaid)}</td><td className="p-4"><span className={BADGE_CLASS}>{s.factoryStatus}</span></td></tr>))}</tbody></table></div>{payModal.show && <Modal title="سداد دفعات" onClose={()=>setPayModal({show: false, type: 'DEPOSIT'})}><form onSubmit={handlePay} className="space-y-4">{selected.map(id => {const item = sales.find(x => x.id === id); if(!item) return null; return <div key={id} className="flex justify-between items-center border-b border-slate-700 pb-2"><span>{item.factoryCode}</span>{payModal.type==='DEPOSIT' && <input name={`amt_${id}`} type="number" placeholder="المبلغ" className={INPUT_CLASS + " w-32 py-1"}/>}</div>})}<button className={BTN_PRIMARY}>تأكيد</button></form></Modal>}</div>
        );
    };

    const DeliveryManager = () => {
        const [view, setView] = useState<'PICKUP'|'RETURN'|'HISTORY'>('PICKUP');
        const [pickupModal, setPickupModal] = useState<{show: boolean, booking: Booking|null}>({show: false, booking: null});
        const [returnModal, setReturnModal] = useState<{show: boolean, booking: Booking|null}>({show: false, booking: null});
        const [search, setSearch] = useState('');
        const [accs, setAccs] = useState<Accessory[]>([]);
        const addAcc = (name: string, price: number) => { setAccs(p => [...p, {name, price}]); };
        const removeAcc = (idx: number) => { setAccs(p => p.filter((_, i) => i !== idx)); };
        const handlePickup = async (e: any) => {
            e.preventDefault(); const b = pickupModal.booking!; const f = e.target;
            const remainingPaid = f.confirmPayment.checked ? b.remainingToPay : 0;
            const accessoriesTotal = accs.reduce((sum, a) => sum + a.price, 0);
            await cloudDb.update(cloudDb.COLLS.BOOKINGS, b.id, {status: BookingStatus.ACTIVE, remainingToPay: b.remainingToPay - remainingPaid, deliveryDetails: { date: new Date().toISOString(), staffName: user?.name, remainingPaid, depositType: f.depositType.value, depositInfo: f.depositInfo.value, accessories: accs }});
            if(remainingPaid > 0) await cloudDb.add(cloudDb.COLLS.FINANCE, {id: `INC-PICKUP-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'استلام فستان', amount: remainingPaid, notes: `باقي حجز ${b.id}`});
            if(accessoriesTotal > 0) await cloudDb.add(cloudDb.COLLS.FINANCE, {id: `INC-ACC-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'إكسسوارات', amount: accessoriesTotal, notes: `إضافات حجز ${b.id}`});
            setPickupModal({show: false, booking: null}); setAccs([]); addToast('تم التسليم للعروس');
        };
        const handleReturn = async (e: any) => {
            e.preventDefault(); const b = returnModal.booking!; const f = e.target;
            const damageFee = Number(f.damageFee.value);
            await cloudDb.update(cloudDb.COLLS.BOOKINGS, b.id, {status: BookingStatus.COMPLETED, returnDetails: { date: new Date().toISOString(), staffName: user?.name, isDamage: f.isDamage.checked, damageFee, damageNotes: f.notes.value }});
            if(damageFee > 0) await cloudDb.add(cloudDb.COLLS.FINANCE, {id: `INC-DMG-${Math.random()}`, date: new Date().toISOString(), type: 'INCOME', category: 'غرامة تلفيات', amount: damageFee, notes: `تلفيات حجز ${b.id}`});
            await cloudDb.update(cloudDb.COLLS.DRESSES, b.dressId, {status: DressStatus.CLEANING, rentalCount: (dresses.find(d=>d.id===b.dressId)?.rentalCount||0)+1});
            setReturnModal({show: false, booking: null}); addToast('تم الإرجاع للمحل');
        };
        const undoAction = async (b: Booking) => confirmAction('تراجع/تعديل', 'هل تريد إلغاء هذه العملية وإعادة الحجز لحالته السابقة؟', async () => {
             if (b.status === BookingStatus.ACTIVE) { await cloudDb.update(cloudDb.COLLS.BOOKINGS, b.id, {status: BookingStatus.PENDING, deliveryDetails: null}); addToast('تم التراجع'); }
             else if (b.status === BookingStatus.COMPLETED) { await cloudDb.update(cloudDb.COLLS.BOOKINGS, b.id, {status: BookingStatus.ACTIVE, returnDetails: null}); await cloudDb.update(cloudDb.COLLS.DRESSES, b.dressId, {status: DressStatus.RENTED}); addToast('تم التراجع'); }
        });
        const pendingList = bookings.filter(b => b.status === BookingStatus.PENDING).sort((a,b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        const activeList = bookings.filter(b => b.status === BookingStatus.ACTIVE);
        const historyList = bookings.filter(b => (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.ACTIVE) && (b.customerName.includes(search) || b.dressName.includes(search)));
        return (
            <div className="space-y-6 animate-fade-in"><div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit"><button onClick={()=>setView('PICKUP')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='PICKUP'?'bg-brand-600 text-white':'text-slate-400'}`}>تسليم</button><button onClick={()=>setView('RETURN')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='RETURN'?'bg-brand-600 text-white':'text-slate-400'}`}>استرجاع</button><button onClick={()=>setView('HISTORY')} className={`px-4 py-2 rounded-md font-bold text-xs ${view==='HISTORY'?'bg-brand-600 text-white':'text-slate-400'}`}>سجل العمليات</button></div>
                {view === 'PICKUP' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{pendingList.map(b => (<div key={b.id} className={CARD_CLASS + " border-l-4 border-l-blue-500"}><div className="flex justify-between"><strong>{b.customerName}</strong><span className="text-xs text-slate-400">{formatDate(b.eventDate)}</span></div><p className="text-xs text-slate-500 mb-2">{b.dressName}</p><div className="flex justify-between items-center text-xs bg-slate-900 p-2 rounded mb-3"><span>متبقي:</span><span className="text-red-400 font-bold">{formatCurrency(b.remainingToPay)}</span></div>{hasPerm('delivery_action') && <button onClick={()=>{setPickupModal({show: true, booking: b}); setAccs([])}} className={BTN_PRIMARY + " py-2"}>تسليم الفستان</button>}</div>))}</div>}
                {view === 'RETURN' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{activeList.map(b => (<div key={b.id} className={CARD_CLASS + " border-l-4 border-l-green-500"}><div className="flex justify-between"><strong>{b.customerName}</strong><span className="text-xs text-slate-400">{formatDate(b.eventDate)}</span></div><p className="text-xs text-slate-500 mb-2">{b.dressName}</p><div className="text-xs text-slate-400 mb-3"><p>الأمانة: {b.deliveryDetails?.depositType}</p></div>{hasPerm('delivery_action') && <button onClick={()=>setReturnModal({show: true, booking: b})} className={BTN_PRIMARY + " py-2 bg-green-600 hover:bg-green-700"}>استرجاع وفحص</button>}</div>))}</div>}
                {view === 'HISTORY' && <div className="space-y-4"><div className="max-w-md"><input value={search} onChange={e=>setSearch(e.target.value)} className={INPUT_CLASS} placeholder="بحث عن عروس..." /></div>{historyList.map(b => (<div key={b.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center"><div><h4 className="font-bold">{b.customerName}</h4><p className="text-xs text-slate-500">الحالة: {b.status}</p></div><button onClick={()=>undoAction(b)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded flex gap-1 items-center"><RotateCcw size={12}/> تراجع</button></div>))}</div>}
                {pickupModal.show && <Modal title="تسليم الفستان" onClose={()=>setPickupModal({show: false, booking: null})}><form onSubmit={handlePickup} className="space-y-4"><label className="flex items-center gap-3 p-4 bg-slate-800 rounded border border-slate-700 cursor-pointer"><input type="checkbox" name="confirmPayment" defaultChecked className="w-5 h-5 accent-blue-500"/><div><p className="font-bold">استلام المبلغ المتبقي ({formatCurrency(pickupModal.booking?.remainingToPay)})</p></div></label><div className="border border-slate-700 p-3 rounded"><p className="text-xs font-bold mb-2 flex items-center gap-2"><Tag size={12}/> إكسسوارات إضافية</p><div className="flex gap-2 mb-2"><input id="accName" placeholder="الصنف" className={INPUT_CLASS + " py-1"}/><input id="accPrice" type="number" placeholder="السعر" className={INPUT_CLASS + " py-1 w-24"}/><button type="button" onClick={()=>{const n=(document.getElementById('accName') as any).value; const p=Number((document.getElementById('accPrice') as any).value); if(n) {addAcc(n,p); (document.getElementById('accName') as any).value='';}}} className="bg-slate-700 px-3 rounded"><Plus size={16}/></button></div><div className="space-y-1">{accs.map((a,i)=><div key={i} className="flex justify-between text-xs bg-slate-900 p-1.5 rounded"><span>{a.name} ({formatCurrency(a.price)})</span><button type="button" onClick={()=>removeAcc(i)} className="text-red-400"><X size={12}/></button></div>)}</div></div><div className="grid grid-cols-2 gap-2"><select name="depositType" className={INPUT_CLASS}><option value="ID_CARD">بطاقة هوية</option><option value="CASH">مبلغ تأمين</option><option value="GOLD">ذهب</option><option value="OTHER">أخرى</option></select><input name="depositInfo" placeholder="تفاصيل الأمانة" className={INPUT_CLASS} required/></div><button className={BTN_PRIMARY}>تأكيد التسليم</button></form></Modal>}
                {returnModal.show && <Modal title="استرجاع الفستان" onClose={()=>setReturnModal({show: false, booking: null})}><form onSubmit={handleReturn} className="space-y-4"><div className="p-3 bg-slate-800 rounded text-center mb-2"><p className="text-xs text-slate-400">الأمانة المستلمة</p><p className="font-bold">{returnModal.booking?.deliveryDetails?.depositInfo}</p></div><label className="flex items-center gap-2"><input type="checkbox" name="isDamage" className="accent-red-500"/> <span className="text-red-400">يوجد تلفيات؟</span></label><input name="damageFee" type="number" placeholder="قيمة الخصم من الأمانة" className={INPUT_CLASS}/><textarea name="notes" placeholder="ملاحظات الاسترجاع" className={INPUT_CLASS} rows={3}/><button className={BTN_PRIMARY}>تأكيد الإرجاع</button></form></Modal>}
            </div>
        );
    }
    
    const FinanceManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [selectedDresses, setSelectedDresses] = useState<string[]>([]);
        const [financeView, setFinanceView] = useState<'OPS'|'ANALYTICS'>('OPS');
        const handleSave = async (e: any) => {
            e.preventDefault(); const f = e.target;
            const amount = Number(f.amount.value);
            const notes = f.notes.value + (selectedDresses.length ? ` - فساتين: ${dresses.filter(d=>selectedDresses.includes(d.id)).map(d=>d.name).join(',')}` : '');
            await cloudDb.add(cloudDb.COLLS.FINANCE, {id: `FIN-${Math.random()}`, date: f.date.value, type: f.type.value, category: f.category.value, amount, notes, createdBy: user?.username});
            setShowModal(false); setSelectedDresses([]); addToast('تم تسجيل الحركة');
        };
        return (
            <div className="space-y-6 animate-fade-in"><div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit mb-4">{hasPerm('finance_ops') && <button onClick={()=>setFinanceView('OPS')} className={`px-4 py-2 rounded-md font-bold text-xs ${financeView==='OPS'?'bg-brand-600 text-white':'text-slate-400'}`}>الحركات اليومية</button>}{(hasPerm('finance_analytics') || hasPerm('finance_profit_analysis')) && <button onClick={()=>setFinanceView('ANALYTICS')} className={`px-4 py-2 rounded-md font-bold text-xs ${financeView==='ANALYTICS'?'bg-brand-600 text-white':'text-slate-400'}`}>التحليل المالي</button>}</div>
                {financeView === 'ANALYTICS' && <DetailedFinanceCharts finance={finance} dresses={dresses} bookings={bookings} />}
                {financeView === 'OPS' && (<><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">الخزينة</h3><button onClick={()=>setShowModal(true)} className="bg-slate-700 px-4 py-2 rounded text-white text-sm font-bold flex gap-2 items-center"><Plus size={16}/> جديد</button></div><div className="bg-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto"><table className="w-full text-right text-xs"><thead><tr className="sticky top-0 bg-slate-900 border-b border-slate-700 text-slate-400"><th className="p-3">التاريخ</th><th className="p-3">النوع</th><th className="p-3">البند</th><th className="p-3">المبلغ</th><th className="p-3">ملاحظات</th></tr></thead><tbody>{finance.slice().reverse().map(f=>(<tr key={f.id} className="border-b border-slate-700 hover:bg-slate-700/50"><td className="p-3">{formatDate(f.date)}</td><td className={`p-3 font-bold ${f.type==='INCOME'?'text-green-500':'text-red-500'}`}>{f.type==='INCOME'?'إيراد':'مصروف'}</td><td className="p-3">{f.category}</td><td className="p-3 font-mono font-bold">{formatCurrency(f.amount)}</td><td className="p-3 text-slate-400">{f.notes}</td></tr>))}</tbody></table></div></>)}
                {showModal && <Modal title="حركة مالية" onClose={()=>setShowModal(false)}><form onSubmit={handleSave} className="space-y-4"><div className="grid grid-cols-2 gap-4"><select name="type" className={INPUT_CLASS}><option value="EXPENSE">مصروفات</option><option value="INCOME">إيرادات</option></select><input type="date" name="date" defaultValue={toInputDate(new Date().toISOString())} className={INPUT_CLASS}/></div><select name="category" className={INPUT_CLASS} required><option value="">التصنيف...</option><option value="فواتير">فواتير</option><option value="مرتبات">مرتبات</option><option value="ترزي">خياطة</option><option value="تنظيف">مغسلة</option><option value="مشتريات">خامات</option><option value="أخرى">أخرى</option></select><input name="amount" type="number" placeholder="المبلغ" className={INPUT_CLASS} required/><div className="border border-slate-700 p-2 rounded max-h-32 overflow-y-auto"><label className="text-xs text-slate-400 block mb-2">ربط بفساتين</label><div className="grid grid-cols-2 gap-2">{dresses.filter(d=>d.type===DressType.RENT).map(d=><label key={d.id} className="text-xs flex gap-2 items-center"><input type="checkbox" onChange={(e)=>setSelectedDresses(p=>e.target.checked?[...p,d.id]:p.filter(x=>x!==d.id))} className="accent-brand-500"/> {d.name}</label>)}</div></div><textarea name="notes" placeholder="ملاحظات" className={INPUT_CLASS}/><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}
            </div>
        );
    }

    const CustomerManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [editing, setEditing] = useState<Customer|null>(null);
        const [search, setSearch] = useState('');
        const handleSave = async (e: any) => {
            e.preventDefault(); const f = e.target;
            await cloudDb.add(cloudDb.COLLS.CUSTOMERS, { id: editing ? editing.id : `C-${Math.random()}`, name: f.name.value, phone: f.phone.value, notes: f.notes.value, firstSeenDate: editing ? editing.firstSeenDate : new Date().toISOString() });
            setShowModal(false); setEditing(null); addToast('تم الحفظ');
        };
        const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
        return (
            <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center"><h3 className="font-bold text-xl text-white">العملاء</h3><div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className={INPUT_CLASS+" w-40 py-1"}/><button onClick={()=>{setEditing(null); setShowModal(true)}} className="bg-brand-600 px-3 py-1 rounded text-white"><Plus/></button></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => (<div key={c.id} className={CARD_CLASS}><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400"><User size={20}/></div><div><h4 className="font-bold text-white">{c.name}</h4><p className="text-xs text-slate-400 font-mono">{c.phone}</p></div></div><button onClick={()=>{setEditing(c); setShowModal(true)}} className="text-slate-500 hover:text-white"><Edit size={14}/></button></div>{c.notes && <p className="text-sm text-slate-500 bg-slate-900/50 p-3 rounded mb-3">{c.notes}</p>}</div>))}</div>{showModal && <Modal title="عميل" onClose={()=>{setShowModal(false); setEditing(null)}}><form onSubmit={handleSave} className="space-y-4"><input name="name" defaultValue={editing?.name} placeholder="الاسم" className={INPUT_CLASS}/><input name="phone" defaultValue={editing?.phone} placeholder="الهاتف" className={INPUT_CLASS}/><textarea name="notes" defaultValue={editing?.notes} placeholder="ملاحظات" className={INPUT_CLASS}/><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}</div>
        );
    };

    const SettingsManager = () => {
        const [showModal, setShowModal] = useState(false);
        const [passModal, setPassModal] = useState(false);
        const handleSaveUser = async (e: any) => {
            e.preventDefault();
            const perms = Array.from(e.target.perms).filter((x:any)=>x.checked).map((x:any)=>x.value);
            await cloudDb.add(cloudDb.COLLS.USERS, {id: `U-${Math.random()}`, name: e.target.name.value, username: e.target.username.value, password: e.target.password.value || '123', role: UserRole.EMPLOYEE, permissions: perms});
            setShowModal(false); addToast('تم إضافة المستخدم');
        }
        const handleChangePass = async (e: any) => {
            e.preventDefault();
            await cloudDb.update(cloudDb.COLLS.USERS, user!.id, {password: e.target.newPass.value});
            setPassModal(false); addToast('تم التغيير');
        }
        return (
            <div className="space-y-6 animate-fade-in"><div className={CARD_CLASS}><h3 className="font-bold text-white mb-4 flex items-center gap-2"><Lock/> الأمان</h3><p className="text-sm text-slate-400 mb-4">أنت مسجل دخول باسم: <b>{user?.name}</b></p><button onClick={()=>setPassModal(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-xs font-bold">تغيير كلمة المرور</button></div>{user?.role === UserRole.ADMIN && (<div className={CARD_CLASS}><div className="flex justify-between mb-4"><h3 className="font-bold text-white flex items-center gap-2"><Users size={18}/> الموظفين</h3><button onClick={()=>setShowModal(true)} className="bg-blue-600 px-3 py-1 rounded text-xs text-white">إضافة موظف</button></div><div className="space-y-2">{users.map(u => <div key={u.id} className="bg-slate-900 p-3 rounded flex justify-between items-center"><span>{u.name} (@{u.username})</span><button onClick={()=>confirmAction('حذف','حذف المستخدم؟',async()=>await cloudDb.delete(cloudDb.COLLS.USERS, u.id))} className="text-red-400"><Trash2 size={14}/></button></div>)}</div></div>)}{showModal && <Modal title="مستخدم جديد" onClose={()=>setShowModal(false)}><form onSubmit={handleSaveUser} className="space-y-4"><input name="name" placeholder="الاسم الكامل" className={INPUT_CLASS} required/><input name="username" placeholder="اسم الدخول" className={INPUT_CLASS} required/><input name="password" placeholder="كلمة المرور" className={INPUT_CLASS}/><div className="grid grid-cols-1 gap-2 border border-slate-700 p-2 rounded max-h-40 overflow-y-auto">{PERMISSIONS_LIST.map(p => <label key={p.id} className="flex gap-2 text-xs cursor-pointer hover:text-white transition-colors"><input type="checkbox" name="perms" value={p.id} className="accent-brand-500"/> {p.label}</label>)}</div><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}{passModal && <Modal title="تغيير كلمة المرور" onClose={()=>setPassModal(false)}><form onSubmit={handleChangePass} className="space-y-4"><input type="password" name="newPass" placeholder="كلمة المرور الجديدة" className={INPUT_CLASS} required/><button className={BTN_PRIMARY}>حفظ</button></form></Modal>}</div>
        );
    }

    const HomeManager = () => {
        const totalDresses = dresses.filter(d => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED).length;
        const rentedDresses = bookings.filter(b => b.status === BookingStatus.ACTIVE).length;
        const cleaningAlerts = dresses.filter(d => d.status === DressStatus.CLEANING);
        const lateReturns = bookings.filter(b => b.status === BookingStatus.ACTIVE && new Date(b.eventDate).getTime() < new Date().getTime() - 86400000);
        return (
            <div className="space-y-6 animate-fade-in"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><StatCard title="فساتين الإيجار" value={totalDresses} icon={Shirt} color="bg-purple-500" subtext="متاح بالمحل" /><StatCard title="مع العرائس" value={rentedDresses} icon={RotateCcw} color="bg-green-500" subtext="فساتين نشطة" /><StatCard title="تحتاج تنظيف" value={cleaningAlerts.length} icon={Droplets} color="bg-orange-500" subtext="في المغسلة" /><StatCard title="تأخيرات" value={lateReturns.length} icon={AlertTriangle} color="bg-red-500" subtext="تجاوزت الموعد" /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className={CARD_CLASS}><h3 className="font-bold text-white mb-4 flex items-center gap-2"><Gift size={18} className="text-blue-400"/> تسليمات قريبة (48 ساعة)</h3><div className="space-y-3">{bookings.filter(b => b.status === BookingStatus.PENDING && Math.abs(new Date(b.eventDate).getTime() - new Date().getTime()) < 172800000).slice(0, 5).map(b => (<div key={b.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border-r-2 border-blue-500"><div><p className="text-sm font-bold">{b.customerName}</p><p className="text-xs text-slate-500">{b.dressName}</p></div><div className="text-right"><p className="text-xs font-mono text-blue-300">{formatDate(b.eventDate)}</p><p className="text-[10px] text-red-400">متبقي: {formatCurrency(b.remainingToPay)}</p></div></div>))}{bookings.filter(b => b.status === BookingStatus.PENDING).length === 0 && <p className="text-slate-500 text-sm text-center">لا توجد تسليمات قريبة</p>}</div></div><div className={CARD_CLASS}><h3 className="font-bold text-white mb-4 flex items-center gap-2">
    {/* Fixed missing PieChartIcon by importing from lucide-react */}
    <PieChartIcon size={18} className="text-purple-400"/> ملخص المالية</h3><div className="space-y-4"><div className="flex justify-between p-2 bg-slate-900 rounded"><span>إيرادات الشهر</span><span className="text-green-400 font-bold">{formatCurrency(finance.filter(f=>f.type==='INCOME' && new Date(f.date).getMonth() === new Date().getMonth()).reduce((a,b)=>a+b.amount,0))}</span></div><div className="flex justify-between p-2 bg-slate-900 rounded"><span>مصروفات الشهر</span><span className="text-red-400 font-bold">{formatCurrency(finance.filter(f=>f.type==='EXPENSE' && new Date(f.date).getMonth() === new Date().getMonth()).reduce((a,b)=>a+b.amount,0))}</span></div></div></div></div></div>
        );
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><div className="text-center"><Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4"/><p className="text-brand-200">جاري الاتصال السحابي بمزود الخدمة...</p></div></div>;
    if (!user) return <Login users={users} onLogin={(u) => { setUser(u); setTab('home'); }} />;

    return (
        <ErrorBoundary>
            <ToastContext.Provider value={{ addToast }}>
                <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans" dir="rtl">
                     <aside className="w-60 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
                        <div className="p-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 text-white"><Shirt size={24} /></div>
                            <div><h1 className="font-bold text-lg text-white">Elaf Wedding</h1><p className="text-[10px] text-green-400 flex items-center gap-1"><Cloud size={10}/> Cloud Online</p></div>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                            {NAV_ITEMS.map(item => {
                                const Icon = {Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings}[item.icon] as any;
                                const permMap: any = { 'dresses_rent': 'dresses_rent_view', 'bookings': 'bookings_view', 'dresses_sale': 'dresses_sale_view', 'factory': 'factory_view', 'delivery': 'delivery_view', 'finance': ['finance_ops', 'finance_profit_analysis'], 'settings': 'settings_view', 'customers': 'customers_view' };
                                if(item.id !== 'home' && !hasPerm(permMap[item.id] || 'ALL')) return null;
                                return (
                                    <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all text-sm font-medium ${tab === item.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                                        <Icon size={18} /> <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50"><div className="flex items-center gap-3 mb-4 px-2"><div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600"><User size={16}/></div><div><p className="text-xs font-bold text-white">{user.name}</p><p className="text-[10px] text-slate-500">{user.role}</p></div></div><button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-950/30 py-2 rounded-lg transition-colors text-xs font-bold"><LogOut size={14} /> خروج</button></div>
                     </aside>
                    <main className="flex-1 overflow-y-auto bg-slate-950 relative">
                        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800 p-4 flex justify-between items-center px-8">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">{NAV_ITEMS.find(i=>i.id===tab)?.label}</h2>
                            <div className="flex gap-4">
                                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-400 flex items-center gap-2 shadow-inner"><RotateCcw size={14} className="text-brand-500"/> نشط: <span className="text-white font-bold">{activeBookingsCount}</span></div>
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
                            {tab === 'customers' && <CustomerManager />}
                            {tab === 'settings' && <SettingsManager />}
                            {tab === 'logs' && <div className="bg-slate-800 rounded-xl overflow-hidden p-4 text-xs text-slate-400 max-h-[80vh] overflow-y-auto">{logs.slice(0,50).map(l=><div key={l.id} className="border-b border-slate-700 py-2 flex justify-between"><span>{l.action} - {l.details}</span><span className="text-slate-600 font-mono">{new Date(l.timestamp).toLocaleString('ar-EG')}</span></div>)}</div>}
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
export default App;
