
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, Droplets, User, Factory, 
  RotateCcw, AlertCircle, TrendingUp, Bell, ShoppingBag,
  Gift, AlertTriangle, Lock, Menu, MoreHorizontal,
  Scissors, FileCheck, Cloud, Loader2, Tag, Sparkles, PieChart as PieChartIcon,
  ChevronRight, Phone, MapPin, CreditCard
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
const INPUT_CLASS = "w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-3.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-slate-500 text-base md:text-sm";
const LABEL_CLASS = "block text-[11px] mb-1.5 text-slate-400 font-bold uppercase tracking-wider px-1";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 text-white py-4 md:py-3 rounded-xl font-bold shadow-lg shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-sm";
const BTN_GHOST = "px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium";
const CARD_CLASS = "bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm overflow-hidden relative group";
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
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
};

// --- AI Service ---
const generateDescription = async (name: string, style: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `أكتب وصفاً تسويقياً لفستان زفاف موديل ${name} وتصميمه ${style}. ركز على الأناقة والرقي في جملة واحدة.`,
        });
        return response.text?.trim();
    } catch { return "فستان رائع لإطلالة ملكية."; }
};

// --- Contexts ---
const ToastContext = React.createContext<{ addToast: (msg: string, type?: 'success'|'error'|'info') => void }>({ addToast: () => {} });

// --- Shared Components ---
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

// --- Section: Home Manager ---
const HomeManager = ({ dresses, bookings, finance }: any) => {
    const stats = [
        { title: 'إيجار متاح', value: dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).length, icon: Shirt, color: 'bg-green-500' },
        { title: 'حجوزات نشطة', value: bookings.filter((b:any)=>b.status===BookingStatus.ACTIVE).length, icon: Calendar, color: 'bg-brand-500' },
        { title: 'إيراد اليوم', value: formatCurrency(finance.filter((f:any)=>f.type==='INCOME' && new Date(f.date).toDateString() === new Date().toDateString()).reduce((a:any,b:any)=>a+b.amount,0)), icon: DollarSign, color: 'bg-emerald-500' },
        { title: 'في المغسلة', value: dresses.filter((d:any)=>d.status===DressStatus.CLEANING).length, icon: Droplets, color: 'bg-blue-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className={CARD_CLASS}>
                        <div className={`w-10 h-10 rounded-xl ${s.color} bg-opacity-10 flex items-center justify-center mb-3`}>
                            <s.icon size={20} className={s.color.replace('bg-', 'text-')} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.title}</p>
                        <p className="text-xl font-bold text-white mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={CARD_CLASS}>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Gift size={18} className="text-brand-400"/> مواعيد قادمة</h3>
                    <div className="space-y-3">
                        {bookings.slice(0, 4).map((b:any) => (
                            <div key={b.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">{b.customerName[0]}</div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{b.customerName}</p>
                                        <p className="text-[10px] text-slate-500">{b.dressName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-brand-400 font-mono">{formatDate(b.eventDate)}</p>
                                    <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className={CARD_CLASS}>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-400"/> ملخص الأداء</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={finance.slice(-7)}>
                                <Bar dataKey="amount" fill="#d946ef" radius={[4, 4, 0, 0]} />
                                <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Section: Dress Manager ---
const DressManager = ({ dresses, onAdd, onUpdate, onDelete }: any) => {
    const [search, setSearch] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingDress, setEditingDress] = useState<any>(null);

    const filtered = dresses.filter((d:any) => 
        d.name.includes(search) || d.style.includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        className="w-full bg-transparent border-none text-white pr-10 pl-4 py-2 outline-none text-sm"
                        placeholder="ابحث عن فستان..."
                        value={search}
                        onChange={(e)=>setSearch(e.target.value)}
                    />
                </div>
                <button onClick={()=>{setEditingDress(null); setModalOpen(true)}} className="bg-brand-600 p-2.5 rounded-xl text-white shadow-lg shadow-brand-900/20 active:scale-90 transition-transform">
                    <Plus size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((d:any) => (
                    <div key={d.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-brand-500">
                                    <Shirt size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">{d.name}</h4>
                                    <p className="text-xs text-slate-500">{d.style}</p>
                                </div>
                            </div>
                            <span className={BADGE_CLASS + " " + getStatusColor(d.status)}>{d.status}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-800/30 p-3 rounded-xl">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">سعر الإيجار</p>
                                <p className="text-sm font-bold text-white">{formatCurrency(d.rentalPrice)}</p>
                            </div>
                            <div className="bg-slate-800/30 p-3 rounded-xl">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">مرات الإيجار</p>
                                <p className="text-sm font-bold text-white">{d.rentalCount || 0}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={()=>{setEditingDress(d); setModalOpen(true)}} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-2">
                                <Edit size={14} /> تعديل
                            </button>
                            <button onClick={()=>onDelete(d.id)} className="w-10 h-10 flex items-center justify-center bg-red-900/20 text-red-400 rounded-xl hover:bg-red-900/40 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <Modal title={editingDress ? "تعديل فستان" : "إضافة فستان جديد"} onClose={()=>setModalOpen(false)}>
                    <form onSubmit={async (e:any) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = Object.fromEntries(formData.entries());
                        const dressData = {
                            ...editingDress,
                            name: data.name,
                            style: data.style,
                            rentalPrice: Number(data.rentalPrice),
                            status: data.status,
                            type: DressType.RENT,
                            updatedAt: new Date().toISOString()
                        };
                        editingDress ? await onUpdate(editingDress.id, dressData) : await onAdd(dressData);
                        setModalOpen(false);
                    }} className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>اسم الفستان</label>
                            <input name="name" defaultValue={editingDress?.name} className={INPUT_CLASS} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>الموديل / التصميم</label>
                                <input name="style" defaultValue={editingDress?.style} className={INPUT_CLASS} required />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>سعر الإيجار</label>
                                <input name="rentalPrice" type="number" defaultValue={editingDress?.rentalPrice} className={INPUT_CLASS} required />
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>الحالة الحالية</label>
                            <select name="status" defaultValue={editingDress?.status || DressStatus.AVAILABLE} className={INPUT_CLASS}>
                                {Object.values(DressStatus).map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button className={BTN_PRIMARY}>{editingDress ? "حفظ التغييرات" : "إضافة للكتالوج"}</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Section: Booking Manager ---
const BookingManager = ({ bookings, dresses, onAdd, onUpdate }: any) => {
    const [isModalOpen, setModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="text-brand-500" /> قائمة الحجوزات</h3>
                <button onClick={()=>setModalOpen(true)} className="flex items-center gap-2 bg-brand-600 px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-brand-900/20 active:scale-95 transition-transform">
                    <Plus size={18} /> حجز جديد
                </button>
            </div>

            <div className="space-y-4">
                {bookings.map((b:any) => (
                    <div key={b.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-950 text-brand-400 flex items-center justify-center font-bold">{b.customerName[0]}</div>
                                <div>
                                    <h4 className="font-bold text-white">{b.customerName}</h4>
                                    <p className="text-[10px] text-slate-500">تم الحجز في: {formatDate(b.createdAt)}</p>
                                </div>
                            </div>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="text-center p-2 bg-slate-800/30 rounded-xl">
                                <p className="text-[9px] text-slate-500 uppercase font-bold">الفستان</p>
                                <p className="text-xs font-bold text-white truncate">{b.dressName}</p>
                            </div>
                            <div className="text-center p-2 bg-slate-800/30 rounded-xl">
                                <p className="text-[9px] text-slate-500 uppercase font-bold">تاريخ المناسبة</p>
                                <p className="text-xs font-bold text-brand-400 font-mono">{formatDate(b.eventDate)}</p>
                            </div>
                            <div className="text-center p-2 bg-slate-800/30 rounded-xl">
                                <p className="text-[9px] text-slate-500 uppercase font-bold">المتبقي</p>
                                <p className="text-xs font-bold text-red-400">{formatCurrency(b.remainingToPay)}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <a href={`tel:${b.customerPhone}`} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                <Phone size={14} /> اتصال
                            </a>
                            <button className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                <Check size={14} /> استلام/إرجاع
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <Modal title="إضافة حجز جديد" onClose={()=>setModalOpen(false)}>
                    <form onSubmit={async (e:any) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = Object.fromEntries(formData.entries());
                        const selectedDress = dresses.find((d:any)=>d.id === data.dressId);
                        
                        const bookingData = {
                            customerName: data.customerName,
                            customerPhone: data.customerPhone,
                            dressId: data.dressId,
                            dressName: selectedDress?.name || "غير معروف",
                            eventDate: data.eventDate,
                            agreedRentalPrice: Number(data.price),
                            paidDeposit: Number(data.deposit),
                            remainingToPay: Number(data.price) - Number(data.deposit),
                            status: BookingStatus.PENDING,
                            createdAt: new Date().toISOString()
                        };
                        await onAdd(bookingData);
                        setModalOpen(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>اسم العروس</label>
                                <input name="customerName" className={INPUT_CLASS} required />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>رقم الهاتف</label>
                                <input name="customerPhone" className={INPUT_CLASS} required />
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>اختر الفستان</label>
                            <select name="dressId" className={INPUT_CLASS} required>
                                {dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).map((d:any)=>(
                                    <option key={d.id} value={d.id}>{d.name} ({formatCurrency(d.rentalPrice)})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className={LABEL_CLASS}>تاريخ المناسبة</label>
                                <input name="eventDate" type="date" className={INPUT_CLASS} required />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>سعر الاتفاق</label>
                                <input name="price" type="number" className={INPUT_CLASS} required />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>العربون</label>
                                <input name="deposit" type="number" className={INPUT_CLASS} required />
                            </div>
                        </div>
                        <button className={BTN_PRIMARY}>تثبيت الحجز السحابي</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Section: Finance Manager ---
const FinanceManager = ({ finance, onAdd }: any) => {
    const [isModalOpen, setModalOpen] = useState(false);
    
    const totalIncome = finance.filter((f:any)=>f.type==='INCOME').reduce((a:any,b:any)=>a+b.amount, 0);
    const totalExpense = finance.filter((f:any)=>f.type==='EXPENSE').reduce((a:any,b:any)=>a+b.amount, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-900/20 border border-emerald-800/30 p-5 rounded-2xl">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-red-900/20 border border-red-800/30 p-5 rounded-2xl">
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">إجمالي المصاريف</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
                </div>
            </div>

            <button onClick={()=>setModalOpen(true)} className={BTN_PRIMARY}>
                <Plus size={18} /> تسجيل حركة مالية جديدة
            </button>

            <div className={CARD_CLASS}>
                <h3 className="font-bold text-white mb-4">آخر العمليات</h3>
                <div className="space-y-3">
                    {finance.sort((a:any,b:any)=>new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((f:any)=>(
                        <div key={f.id} className="flex justify-between items-center p-3 border-b border-slate-800 last:border-0">
                            <div>
                                <p className="text-sm font-bold text-white">{f.category}</p>
                                <p className="text-[10px] text-slate-500">{formatDate(f.date)} - {f.notes}</p>
                            </div>
                            <p className={`font-bold text-sm ${f.type==='INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {f.type==='INCOME' ? '+' : '-'}{formatCurrency(f.amount)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <Modal title="تسجيل حركة مالية" onClose={()=>setModalOpen(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = Object.fromEntries(formData.entries());
                        await onAdd({
                            type: data.type,
                            amount: Number(data.amount),
                            category: data.category,
                            notes: data.notes,
                            date: new Date().toISOString()
                        });
                        setModalOpen(false);
                    }} className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>نوع العملية</label>
                            <select name="type" className={INPUT_CLASS}>
                                <option value="INCOME">إيراد (+)</option>
                                <option value="EXPENSE">مصروف (-)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>المبلغ</label>
                                <input name="amount" type="number" className={INPUT_CLASS} required />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>التصنيف</label>
                                <input name="category" placeholder="إيجار، صيانة، كهرباء..." className={INPUT_CLASS} required />
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>ملاحظات</label>
                            <textarea name="notes" className={INPUT_CLASS + " h-20"} />
                        </div>
                        <button className={BTN_PRIMARY}>حفظ العملية</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Main App ---
const App = () => {
    if (!isConfigured) return <div className="p-8 text-center text-red-500">Firebase configuration missing.</div>;

    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
    const [toasts, setToasts] = useState<any[]>([]);

    // Data States
    const [dresses, setDresses] = useState<Dress[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [finance, setFinance] = useState<FinanceRecord[]>([]);
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
            cloudDb.subscribe(cloudDb.COLLS.USERS, setUsers),
        ];
        setTimeout(() => setLoading(false), 1200);
        return () => unsubs.forEach(u => u());
    }, []);

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                <Shirt className="absolute inset-0 m-auto text-brand-500 animate-pulse" size={30} />
            </div>
            <p className="mt-6 text-slate-500 text-sm font-bold tracking-widest animate-pulse">نظام إيلاف السحابي</p>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-brand-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-brand-900/30 text-white">
                        <Shirt size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">إيلاف للزفاف</h1>
                    <p className="text-slate-500 text-xs">نظام الإدارة السحابي المتكامل</p>
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
            <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none" dir="rtl">
                
                {/* Global Mobile Header */}
                <header className="fixed top-0 inset-x-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-[60]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white"><Shirt size={18}/></div>
                        <span className="font-bold text-lg">إيلاف</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-2 py-1 bg-slate-800 rounded-full flex items-center gap-1.5 border border-slate-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">سحابي</span>
                        </div>
                        <button onClick={()=>setUser(null)} className="p-2 text-red-400 hover:bg-red-950/20 rounded-lg"><LogOut size={18}/></button>
                    </div>
                </header>

                {/* Main Content Viewport */}
                <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4 custom-scrollbar">
                    <div className="max-w-xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white">{NAV_ITEMS.find(i=>i.id===tab)?.label}</h2>
                            <p className="text-[10px] text-slate-500">نظام إدارة فساتين الزفاف • 2024</p>
                        </div>

                        {tab === 'home' && <HomeManager dresses={dresses} bookings={bookings} finance={finance} />}
                        {tab === 'dresses_rent' && <DressManager 
                            dresses={dresses.filter(d=>d.type===DressType.RENT)} 
                            onAdd={(d:any)=>cloudDb.add(cloudDb.COLLS.DRESSES, d)}
                            onUpdate={(id:string, d:any)=>cloudDb.update(cloudDb.COLLS.DRESSES, id, d)}
                            onDelete={(id:string)=>cloudDb.delete(cloudDb.COLLS.DRESSES, id)}
                        />}
                        {tab === 'bookings' && <BookingManager 
                            bookings={bookings} 
                            dresses={dresses}
                            onAdd={(b:any)=>cloudDb.add(cloudDb.COLLS.BOOKINGS, b)}
                        />}
                        {tab === 'finance' && <FinanceManager 
                            finance={finance}
                            onAdd={(f:any)=>cloudDb.add(cloudDb.COLLS.FINANCE, f)}
                        />}
                        {['dresses_sale', 'factory', 'customers', 'logs', 'settings'].includes(tab) && (
                            <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-4">
                                <Loader2 size={30} className="animate-spin text-brand-500" />
                                <p>جاري تجهيز قسم {NAV_ITEMS.find(n=>n.id===tab)?.label} في الواجهة السحابية الجديدة...</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Bottom Navigation (Touch Ready) */}
                <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-900 border-t border-slate-800 flex justify-around items-center px-2 z-[60] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
                    <button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${tab==='home'?'text-brand-500':'text-slate-500'}`}>
                        <Home size={20} className={tab==='home'?'animate-bounce-short':''} />
                        <span className="text-[9px] font-bold">الرئيسية</span>
                    </button>
                    <button onClick={()=>setTab('dresses_rent')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${tab==='dresses_rent'?'text-brand-500':'text-slate-500'}`}>
                        <Shirt size={20} className={tab==='dresses_rent'?'animate-bounce-short':''} />
                        <span className="text-[9px] font-bold">الفساتين</span>
                    </button>
                    <button onClick={()=>setTab('bookings')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${tab==='bookings'?'text-brand-500':'text-slate-500'}`}>
                        <Calendar size={20} className={tab==='bookings'?'animate-bounce-short':''} />
                        <span className="text-[9px] font-bold">الحجوزات</span>
                    </button>
                    <button onClick={()=>setTab('finance')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${tab==='finance'?'text-brand-500':'text-slate-500'}`}>
                        <DollarSign size={20} className={tab==='finance'?'animate-bounce-short':''} />
                        <span className="text-[9px] font-bold">المالية</span>
                    </button>
                    <button onClick={()=>setMoreMenuOpen(true)} className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-500">
                        <MoreHorizontal size={20} />
                        <span className="text-[9px] font-bold">المزيد</span>
                    </button>
                </nav>

                {/* "More" Fullscreen Overlay */}
                {isMoreMenuOpen && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl animate-fade-in p-8">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-bold text-white">كل الأقسام</h3>
                            <button onClick={()=>setMoreMenuOpen(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"><X size={24}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {NAV_ITEMS.map(item => {
                                const Icon = {Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings}[item.icon] as any;
                                return (
                                    <button key={item.id} onClick={() => {setTab(item.id); setMoreMenuOpen(false)}} className={`bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 transition-all active:bg-brand-600 active:border-brand-500 group ${tab===item.id?'border-brand-500 bg-brand-500/10':''}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${tab===item.id?'bg-brand-600 text-white':'bg-slate-800 text-brand-400 group-active:bg-brand-400 group-active:text-slate-900'}`}>
                                            <Icon size={24}/>
                                        </div>
                                        <span className={`text-[11px] font-bold transition-colors ${tab===item.id?'text-brand-400':'text-slate-400 group-active:text-white'}`}>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Toast System */}
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
