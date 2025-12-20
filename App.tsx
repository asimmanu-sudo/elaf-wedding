
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, Droplets, User, Factory, 
  RotateCcw, AlertCircle, TrendingUp, Bell, ShoppingBag,
  Gift, AlertTriangle, Lock, Menu, MoreHorizontal,
  Scissors, FileCheck, Cloud, Loader2, Tag, Sparkles, PieChart as PieChartIcon,
  ChevronRight, Phone, MapPin, CreditCard, Trash, Clock, Undo2, CheckSquare,
  TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import { cloudDb, isConfigured } from './services/firebase';
import { 
    UserRole, DressType, DressStatus, BookingStatus, 
    SaleStatus, FactoryPaymentStatus, PaymentMethod, DepositType
} from './types';
import type { 
    User as UserType, Dress, Booking, 
    FinanceRecord, AuditLog, Customer, SaleOrder, 
    Accessory, Measurements
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Styles & Helpers ---
const INPUT_CLASS = "w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-slate-500 text-sm";
const LABEL_CLASS = "block text-[11px] mb-1.5 text-slate-400 font-bold uppercase tracking-wider px-1";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-95 transition-all text-sm";
const CARD_CLASS = "bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group";
const BADGE_CLASS = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border inline-flex items-center justify-center gap-1.5";
const COLORS = ['#d946ef', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const formatDate = (iso: string) => { 
    if(!iso) return '-';
    try { return new Date(iso).toLocaleDateString('ar-EG'); } catch { return '-'; } 
};
const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val || 0);
const toInputDate = (iso: string | undefined) => iso ? new Date(iso).toISOString().split('T')[0] : '';

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

// --- Contexts ---
const ToastContext = React.createContext<{ addToast: (msg: string, type?: 'success'|'error') => void }>({ addToast: () => {} });

// --- Components ---
const Modal = ({ title, children, onClose, size = 'md' }: any) => (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
        <div className={`bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl w-full ${size==='lg'?'max-w-4xl':'max-w-xl'} flex flex-col animate-slide-in-up max-h-[95vh]`}>
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h2 className="text-lg font-bold text-brand-300">{title}</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={22}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-12">{children}</div>
        </div>
    </div>
);

const PrePrintedInvoice = ({ data, type, onClose }: {data: any, type: string, onClose: () => void}) => {
    return (
        <div className="fixed inset-0 z-[200] bg-white text-black flex flex-col overflow-y-auto" dir="rtl">
            <div className="p-4 bg-gray-100 flex justify-between items-center print:hidden border-b">
                <h2 className="font-bold text-lg">معاينة للطباعة</h2>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-xl font-bold"><Printer size={16}/> طباعة الآن</button>
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 rounded-xl font-bold">إغلاق</button>
                </div>
            </div>
            <div className="p-10 max-w-[210mm] mx-auto w-full bg-white min-h-screen">
                <div className="text-center border-b-4 border-black pb-6 mb-8">
                    <h1 className="text-4xl font-black mb-2">إيلاف لفساتين الزفاف</h1>
                    <p className="text-gray-600 text-lg uppercase tracking-widest font-serif">Elaf For Wedding Dress</p>
                    <div className="mt-4 inline-block px-8 py-1 bg-black text-white font-bold rounded-full">
                        {type === 'BOOKING' ? 'عقد إيجار رسمي' : type === 'SALE' ? 'عقد تفصيل ملكي' : 'تفاصيل المقاسات'}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-10 text-sm mb-10 border-b-2 border-dashed border-gray-300 pb-10">
                    <div className="space-y-3">
                        <p><span className="font-black text-lg">اسم العميلة:</span> <span className="text-xl">{data.customerName || data.brideName}</span></p>
                        <p><span className="font-bold">رقم الهاتف:</span> {data.customerPhone || data.bridePhone}</p>
                        <p><span className="font-bold">تاريخ التعاقد:</span> {formatDate(new Date().toISOString())}</p>
                    </div>
                    <div className="space-y-3 text-left">
                        <p><span className="font-bold">كود الموديل:</span> {data.factoryCode || data.dressId || '-'}</p>
                        <p><span className="font-black text-lg">موعد المناسبة:</span> <span className="text-xl font-serif">{formatDate(data.eventDate || data.expectedDeliveryDate)}</span></p>
                    </div>
                </div>
                
                {data.measurements && (
                    <div className="mb-10 p-6 border-2 border-black rounded-3xl">
                        <h3 className="font-black text-xl mb-6 border-b-2 border-black inline-block">جدول المقاسات الفني (سم)</h3>
                        <div className="grid grid-cols-3 gap-y-4 gap-x-10 text-sm font-bold">
                            {Object.entries(data.measurements).map(([k, v]) => (
                                v ? <div key={k} className="flex justify-between border-b border-gray-200"><span>{k}:</span> <span>{String(v)}</span></div> : null
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-10">
                    <div className="p-4 border-2 border-black rounded-2xl text-center">
                        <p className="text-xs text-gray-500 mb-1">الإجمالي</p>
                        <p className="text-xl font-black">{formatCurrency(data.agreedRentalPrice || data.sellPrice)}</p>
                    </div>
                    <div className="p-4 border-2 border-black rounded-2xl text-center">
                        <p className="text-xs text-gray-500 mb-1">المدفوع (عربون)</p>
                        <p className="text-xl font-black">{formatCurrency(data.paidDeposit || data.deposit)}</p>
                    </div>
                    <div className="p-4 border-2 border-black rounded-2xl text-center bg-gray-100">
                        <p className="text-xs text-gray-500 mb-1">المتبقي</p>
                        <p className="text-xl font-black text-red-600">{formatCurrency(data.remainingToPay || data.remainingFromBride)}</p>
                    </div>
                </div>

                <div className="mt-20 flex justify-between px-20">
                    <div className="text-center"><p className="font-black mb-16 underline">توقيع العروس</p><p className="text-gray-300">.................................</p></div>
                    <div className="text-center"><p className="font-black mb-16 underline">ختم المحل والإدارة</p><p className="text-gray-300">.................................</p></div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Managers ---

const HomeManager = ({ dresses, bookings, finance }: any) => {
    const today = new Date().toDateString();
    const stats = [
        { title: 'إيجار متاح', value: dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).length, icon: Shirt, color: 'text-green-400', bg: 'bg-green-500/10' },
        { title: 'حجوزات قادمة', value: bookings.filter((b:any)=>b.status===BookingStatus.PENDING).length, icon: Calendar, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { title: 'إيراد اليوم', value: formatCurrency(finance.filter((f:any)=>f.type==='INCOME' && new Date(f.date).toDateString() === today).reduce((a:any,b:any)=>a+b.amount,0)), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { title: 'تحت التنظيف', value: dresses.filter((d:any)=>d.status===DressStatus.CLEANING).length, icon: Droplets, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className={CARD_CLASS}>
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 ${s.color}`}><s.icon size={20} /></div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{s.title}</p>
                        <p className="text-lg font-black text-white mt-1">{s.value}</p>
                    </div>
                ))}
            </div>
            <div className={CARD_CLASS}>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-brand-400"/> آخر النشاطات</h3>
                <div className="space-y-3">
                    {bookings.slice(0, 5).map((b:any) => (
                        <div key={b.id} className="p-3 bg-slate-800/30 rounded-2xl border border-slate-800 flex justify-between items-center group-hover:bg-slate-800/50 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-500 font-bold">{b.customerName[0]}</div>
                                <div><p className="text-sm font-bold text-white">{b.customerName}</p><p className="text-[10px] text-slate-500">حجز فستان: {b.dressName}</p></div>
                            </div>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                    ))}
                    {bookings.length === 0 && <p className="text-center py-6 text-slate-600 text-xs italic">لا توجد حركات مسجلة حالياً</p>}
                </div>
            </div>
        </div>
    );
};

const RentalManager = ({ dresses, onAdd, onUpdate, onDelete }: any) => {
    const [view, setView] = useState<'STOCK'|'ARCHIVE'|'ROI'>('STOCK');
    const [isModal, setModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const filtered = dresses.filter((d:any) => view === 'ARCHIVE' ? d.status === DressStatus.ARCHIVED : d.status !== DressStatus.ARCHIVED);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
                {['STOCK', 'ARCHIVE', 'ROI'].map((v:any) => (
                    <button key={v} onClick={()=>setView(v)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${view===v?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>
                        {v === 'STOCK' ? 'المخزون' : v === 'ARCHIVE' ? 'الأرشيف' : 'أداء الفساتين'}
                    </button>
                ))}
            </div>
            
            <button onClick={()=>{setEditing(null); setModal(true)}} className={BTN_PRIMARY}><Plus size={18}/> إضافة فستان إيجار جديد</button>

            <div className="grid grid-cols-1 gap-4">
                {filtered.map((d:any) => (
                    <div key={d.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="font-black text-white text-lg">{d.name}</h4><p className="text-xs text-slate-500 font-bold uppercase">{d.style}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(d.status)}>{d.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">تكلفة الشراء</p>
                                <p className="text-sm font-bold text-white">{formatCurrency(d.factoryPrice)}</p>
                            </div>
                            <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">سعر الإيجار</p>
                                <p className="text-sm font-bold text-brand-400">{formatCurrency(d.rentalPrice)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>{setEditing(d); setModal(true)}} className="flex-1 py-2.5 bg-slate-800 rounded-xl text-slate-300 font-bold text-xs">تعديل</button>
                            <button onClick={()=>onUpdate(d.id, {status: view==='ARCHIVE'?DressStatus.AVAILABLE:DressStatus.ARCHIVED})} className={`p-2.5 rounded-xl border ${view==='ARCHIVE'?'border-green-500/30 text-green-400':'border-red-500/30 text-red-400'}`}>
                                {view === 'ARCHIVE' ? <Undo2 size={18}/> : <Trash2 size={18}/>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModal && (
                <Modal title={editing ? "تعديل بيانات فستان" : "إضافة فستان جديد"} onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const data = {
                            name: fd.get('name'), style: fd.get('style'), 
                            factoryPrice: Number(fd.get('fPrice')), rentalPrice: Number(fd.get('rPrice')),
                            status: fd.get('status'), type: DressType.RENT, updatedAt: new Date().toISOString()
                        };
                        editing ? await onUpdate(editing.id, data) : await onAdd({ ...data, createdAt: new Date().toISOString(), rentalCount: 0 });
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" defaultValue={editing?.name} placeholder="اسم الفستان الفني" className={INPUT_CLASS} required />
                        <input name="style" defaultValue={editing?.style} placeholder="الموديل / الماركة" className={INPUT_CLASS} />
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={LABEL_CLASS}>تكلفة المصنع</label><input name="fPrice" type="number" defaultValue={editing?.factoryPrice} className={INPUT_CLASS} required /></div>
                            <div><label className={LABEL_CLASS}>سعر الإيجار</label><input name="rPrice" type="number" defaultValue={editing?.rentalPrice} className={INPUT_CLASS} required /></div>
                        </div>
                        <select name="status" defaultValue={editing?.status || DressStatus.AVAILABLE} className={INPUT_CLASS}>
                            {Object.values(DressStatus).map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className={BTN_PRIMARY}>حفظ البيانات سحابياً</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const BookingManager = ({ bookings, dresses, onAdd, onUpdate, onPrint }: any) => {
    const [isModal, setModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={()=>{setEditing(null); setModal(true)}} className={BTN_PRIMARY}><Calendar size={18}/> تسجيل حجز جديد</button>
            <div className="space-y-4">
                {bookings.filter((b:any)=>b.status!==BookingStatus.CANCELLED).map((b:any)=>(
                    <div key={b.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-4">
                            <div><h4 className="font-black text-white text-lg">{b.customerName}</h4><p className="text-xs text-slate-500 font-bold">{b.dressName}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4 mb-4">
                            <div><p className="text-[9px] text-slate-500 font-black uppercase">المناسبة</p><p className="text-sm font-bold text-brand-300">{formatDate(b.eventDate)}</p></div>
                            <div className="text-left"><p className="text-[9px] text-slate-500 font-black uppercase">المتبقي</p><p className="text-sm font-black text-red-500">{formatCurrency(b.remainingToPay)}</p></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>onPrint(b, 'BOOKING')} className="flex-1 py-2.5 bg-slate-800 rounded-xl text-brand-400 font-bold text-xs flex justify-center items-center gap-2"><Printer size={14}/> طباعة العقد</button>
                            <button onClick={()=>{setEditing(b); setModal(true)}} className="p-2.5 bg-slate-800 rounded-xl text-slate-400"><Edit size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModal && (
                <Modal title={editing ? "تعديل الحجز" : "حجز إيجار جديد"} onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const dress = dresses.find((d:any)=>d.id === fd.get('dressId'));
                        const price = Number(fd.get('price'));
                        const dep = Number(fd.get('deposit'));
                        const data = {
                            customerName: fd.get('name'), customerPhone: fd.get('phone'),
                            dressId: fd.get('dressId'), dressName: dress?.name || '',
                            eventDate: fd.get('date'), agreedRentalPrice: price,
                            paidDeposit: dep, remainingToPay: price - dep,
                            paymentMethod: fd.get('method'), status: BookingStatus.PENDING,
                            createdAt: new Date().toISOString()
                        };
                        editing ? await onUpdate(editing.id, data) : await onAdd(data);
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" defaultValue={editing?.customerName} placeholder="اسم العروس" className={INPUT_CLASS} required />
                        <input name="phone" defaultValue={editing?.customerPhone} placeholder="رقم الهاتف" className={INPUT_CLASS} required />
                        <select name="dressId" defaultValue={editing?.dressId} className={INPUT_CLASS} required>
                            <option value="">اختر الفستان من المخزون...</option>
                            {dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).map((d:any)=>(
                                <option key={d.id} value={d.id}>{d.name} ({d.style})</option>
                            ))}
                        </select>
                        <input name="date" type="date" defaultValue={toInputDate(editing?.eventDate)} className={INPUT_CLASS} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="price" type="number" defaultValue={editing?.agreedRentalPrice} placeholder="سعر الاتفاق" className={INPUT_CLASS} required />
                            <input name="deposit" type="number" defaultValue={editing?.paidDeposit} placeholder="العربون" className={INPUT_CLASS} required />
                        </div>
                        <select name="method" defaultValue={editing?.paymentMethod || PaymentMethod.CASH_EGP} className={INPUT_CLASS}>
                            {Object.values(PaymentMethod).map(m=><option key={m} value={m}>{m}</option>)}
                        </select>
                        <button className={BTN_PRIMARY}>تثبيت الحجز سحابياً</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const SalesManager = ({ orders, onAdd, onUpdate, onPrint }: any) => {
    const [isModal, setModal] = useState(false);
    const [measureModal, setMeasureModal] = useState<{show:boolean, order:any}>({show:false, order:null});

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={()=>setModal(true)} className={BTN_PRIMARY}><ShoppingBag size={18}/> أمر تفصيل جديد</button>
            <div className="space-y-4">
                {orders.map((o:any)=>(
                    <div key={o.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-4">
                            <div><h4 className="font-black text-white text-lg">{o.brideName}</h4><p className="text-xs text-slate-500 font-bold">كود المصنع: {o.factoryCode}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(o.status)}>{o.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{o.dressDescription}</p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">موعد التسليم</p>
                                <p className="text-sm font-bold text-white">{formatDate(o.expectedDeliveryDate)}</p>
                            </div>
                            <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800 text-left">
                                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">المتبقي</p>
                                <p className="text-sm font-black text-red-500">{formatCurrency(o.remainingFromBride)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>setMeasureModal({show:true, order:o})} className="flex-1 py-2.5 bg-brand-600/10 rounded-xl text-brand-400 font-bold text-xs flex justify-center items-center gap-2"><Scissors size={14}/> المقاسات</button>
                            <button onClick={()=>onPrint(o, 'SALE')} className="p-2.5 bg-slate-800 rounded-xl text-slate-400"><Printer size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModal && (
                <Modal title="تسجيل طلب تفصيل (بيع)" onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const price = Number(fd.get('sellPrice'));
                        const dep = Number(fd.get('deposit'));
                        await onAdd({
                            brideName: fd.get('name'), bridePhone: fd.get('phone'),
                            factoryCode: fd.get('code'), dressDescription: fd.get('desc'),
                            factoryPrice: Number(fd.get('fPrice')), sellPrice: price,
                            deposit: dep, remainingFromBride: price - dep,
                            status: SaleStatus.DESIGNING, factoryStatus: FactoryPaymentStatus.UNPAID,
                            expectedDeliveryDate: fd.get('date'), orderDate: new Date().toISOString(),
                            createdAt: new Date().toISOString()
                        });
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" placeholder="اسم العروس" className={INPUT_CLASS} required />
                        <input name="phone" placeholder="رقم هاتف العروس" className={INPUT_CLASS} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="code" placeholder="كود الموديل" className={INPUT_CLASS} required />
                            <input name="date" type="date" className={INPUT_CLASS} required />
                        </div>
                        <textarea name="desc" placeholder="وصف الفستان وتفاصيل التصميم" className={INPUT_CLASS + " h-20"} required />
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className={LABEL_CLASS}>سعر المصنع</label><input name="fPrice" type="number" className={INPUT_CLASS} required /></div>
                            <div><label className={LABEL_CLASS}>سعر البيع</label><input name="sellPrice" type="number" className={INPUT_CLASS} required /></div>
                            <div><label className={LABEL_CLASS}>العربون</label><input name="deposit" type="number" className={INPUT_CLASS} required /></div>
                        </div>
                        <button className={BTN_PRIMARY}>تثبيت الطلب وبدء التنفيذ</button>
                    </form>
                </Modal>
            )}

            {measureModal.show && (
                <Modal title={`مقاسات العروس: ${measureModal.order.brideName}`} size="lg" onClose={()=>setMeasureModal({show:false, order:null})}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const measurements = Object.fromEntries(fd.entries());
                        await onUpdate(measureModal.order.id, { measurements });
                        setMeasureModal({show:false, order:null});
                    }} className="space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {['محيط الرقبة', 'محيط الكتف', 'محيط الصدر', 'تحت الصدر', 'خصر', 'هانش', 'طول ظهر', 'طول كلي', 'طول يد', 'محيط ابط'].map(m=>(
                                <div key={m}><label className="text-[9px] text-slate-500 font-black mb-1 block">{m}</label><input name={m} defaultValue={measureModal.order?.measurements?.[m]} className={INPUT_CLASS} /></div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={LABEL_CLASS}>نوع الصدر</label><input name="bustType" defaultValue={measureModal.order?.measurements?.bustType} className={INPUT_CLASS} /></div>
                            <div><label className={LABEL_CLASS}>نوع التنورة</label><input name="skirtType" defaultValue={measureModal.order?.measurements?.skirtType} className={INPUT_CLASS} /></div>
                        </div>
                        <textarea name="orderNotes" placeholder="ملاحظات خياطة إضافية للمصنع..." className={INPUT_CLASS + " h-24"} defaultValue={measureModal.order?.measurements?.orderNotes} />
                        <button className={BTN_PRIMARY}>حفظ المقاسات سحابياً</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const FactoryManager = ({ orders, onUpdate, finance, onAddFinance }: any) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [isPayModal, setPayModal] = useState(false);

    const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white">تعاملات المصانع</h3>
                {selected.length > 0 && (
                    <button onClick={()=>setPayModal(true)} className="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-black text-white shadow-lg animate-bounce">تسديد دفعات ({selected.length})</button>
                )}
            </div>

            <div className="space-y-4">
                {orders.filter((o:any)=>o.factoryStatus !== FactoryPaymentStatus.PAID).map((o:any)=>(
                    <div key={o.id} className={`${CARD_CLASS} ${selected.includes(o.id)?'border-brand-500 bg-brand-500/5':''}`} onClick={()=>toggle(o.id)}>
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selected.includes(o.id)?'bg-brand-500 border-brand-500':'border-slate-700'}`}>
                                    {selected.includes(o.id) && <Check size={14} className="text-white"/>}
                                </div>
                                <h4 className="font-bold text-white">كود: {o.factoryCode}</h4>
                            </div>
                            <span className={BADGE_CLASS + " border-yellow-500/30 text-yellow-400"}>{o.factoryStatus}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-xs">المطلوب: <span className="font-bold text-white">{formatCurrency(o.factoryPrice)}</span></div>
                            <div className="text-xs text-left">المتبقي للمصنع: <span className="font-bold text-red-400">{formatCurrency(o.factoryPrice - (o.factoryDepositPaid || 0))}</span></div>
                        </div>
                    </div>
                ))}
            </div>

            {isPayModal && (
                <Modal title="تسديد مبالغ للمصنع" onClose={()=>setPayModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        for (const id of selected) {
                            const order = orders.find((o:any)=>o.id===id);
                            const amount = Number(e.target[`amt_${id}`].value);
                            if (amount > 0) {
                                const newPaid = (order.factoryDepositPaid || 0) + amount;
                                await onUpdate(id, { 
                                    factoryDepositPaid: newPaid,
                                    factoryStatus: newPaid >= order.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL
                                });
                                await onAddFinance({
                                    type: 'EXPENSE', category: 'سداد مصنع', amount,
                                    notes: `تسديد للمصنع - كود ${order.factoryCode}`,
                                    date: new Date().toISOString()
                                });
                            }
                        }
                        setSelected([]); setPayModal(false);
                    }} className="space-y-4">
                        {selected.map(id => {
                            const o = orders.find((x:any)=>x.id===id);
                            return (
                                <div key={id} className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-white">{o.factoryCode}</span> <span className="text-xs text-red-400">متبقي {formatCurrency(o.factoryPrice - (o.factoryDepositPaid || 0))}</span></div>
                                    <input name={`amt_${id}`} type="number" placeholder="المبلغ المراد دفعه الآن" className={INPUT_CLASS} required />
                                </div>
                            );
                        })}
                        <button className={BTN_PRIMARY}>تأكيد دفع المبالغ المحددة</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Main App ---

const App = () => {
    if (!isConfigured) return <div className="p-8 text-center text-red-500">Firebase Error.</div>;

    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<any[]>([]);
    const [printData, setPrintData] = useState<any>(null);
    const [isMenuOpen, setMenuOpen] = useState(false);

    const [dresses, setDresses] = useState<Dress[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [finance, setFinance] = useState<FinanceRecord[]>([]);
    const [orders, setOrders] = useState<SaleOrder[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);

    useEffect(() => {
        const unsubs = [
            cloudDb.subscribe(cloudDb.COLLS.DRESSES, setDresses),
            cloudDb.subscribe(cloudDb.COLLS.BOOKINGS, setBookings),
            cloudDb.subscribe(cloudDb.COLLS.FINANCE, setFinance),
            cloudDb.subscribe(cloudDb.COLLS.SALES, setOrders),
            cloudDb.subscribe(cloudDb.COLLS.USERS, setUsers),
        ];
        setTimeout(() => setLoading(false), 1500);
        return () => unsubs.forEach(u => u());
    }, []);

    const addToast = (msg: string, type: 'success'|'error' = 'success') => {
        const id = Math.random().toString();
        setToasts(prev => [...prev, {id, msg, type}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
            <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-[10px] font-black tracking-widest animate-pulse uppercase">جاري تأمين الاتصال السحابي...</p>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.1),transparent)] pointer-events-none"></div>
            <div className="w-full max-w-sm bg-slate-900/50 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-brand-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-2xl shadow-brand-500/40 rotate-3"><Shirt size={40} /></div>
                    <h1 className="text-3xl font-black text-white">إيلاف للزفاف</h1>
                    <p className="text-slate-500 text-xs mt-2 font-bold">نظام الإدارة السحابي v3.0</p>
                </div>
                <form onSubmit={(e:any)=>{
                    e.preventDefault();
                    const u = users.find(x => x.username.toLowerCase() === e.target.user.value.toLowerCase() && x.password === e.target.pass.value);
                    if(u) setUser(u); else alert('بيانات الدخول غير صحيحة');
                }} className="space-y-4">
                    <input name="user" placeholder="اسم المستخدم" className={INPUT_CLASS} required />
                    <input name="pass" type="password" placeholder="كلمة المرور" className={INPUT_CLASS} required />
                    <button className={BTN_PRIMARY + " mt-4"}>دخول النظام</button>
                </form>
            </div>
        </div>
    );

    return (
        <ToastContext.Provider value={{ addToast }}>
            <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30" dir="rtl">
                
                <header className="fixed top-0 inset-x-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6 z-[60]">
                    <div className="flex items-center gap-3 font-black text-lg">
                        <div className="p-1.5 bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20"><Shirt size={18}/></div> 
                        <span>إيلاف</span>
                    </div>
                    <button onClick={()=>setUser(null)} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 transition-colors"><LogOut size={18}/></button>
                </header>

                <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
                    <div className="max-w-xl mx-auto">
                        <div className="mb-6 flex justify-between items-end px-2">
                             <h2 className="text-2xl font-black text-white">{NAV_ITEMS.find(i=>i.id===tab)?.label}</h2>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formatDate(new Date().toISOString())}</p>
                        </div>

                        {tab === 'home' && <HomeManager dresses={dresses} bookings={bookings} finance={finance} />}
                        {tab === 'dresses_rent' && <RentalManager dresses={dresses} onAdd={(d:any)=>cloudDb.add(cloudDb.COLLS.DRESSES, d)} onUpdate={(id:any, d:any)=>cloudDb.update(cloudDb.COLLS.DRESSES, id, d)} />}
                        {tab === 'bookings' && <BookingManager bookings={bookings} dresses={dresses} onAdd={(b:any)=>cloudDb.add(cloudDb.COLLS.BOOKINGS, b)} onUpdate={(id:any, b:any)=>cloudDb.update(cloudDb.COLLS.BOOKINGS, id, b)} onPrint={(d:any, t:any)=>setPrintData({data:d, type:t})} />}
                        {tab === 'dresses_sale' && <SalesManager orders={orders} onAdd={(o:any)=>cloudDb.add(cloudDb.COLLS.SALES, o)} onUpdate={(id:any, o:any)=>cloudDb.update(cloudDb.COLLS.SALES, id, o)} onPrint={(d:any, t:any)=>setPrintData({data:d, type:t})} />}
                        {tab === 'factory' && <FactoryManager orders={orders} onUpdate={(id:any, d:any)=>cloudDb.update(cloudDb.COLLS.SALES, id, d)} onAddFinance={(f:any)=>cloudDb.add(cloudDb.COLLS.FINANCE, f)} />}
                        {tab === 'finance' && (
                             <div className="space-y-6">
                                 <div className={CARD_CLASS + " h-64"}>
                                     <h3 className="font-bold mb-4 text-xs uppercase text-slate-500">موجز الإيرادات (6 أشهر)</h3>
                                     <ResponsiveContainer width="100%" height="100%">
                                         <BarChart data={finance.slice(0, 6).map(f=>({n: f.category, v: f.amount}))}>
                                             <Bar dataKey="v" fill="#d946ef" radius={[4,4,0,0]} />
                                             <XAxis dataKey="n" hide />
                                             <RechartsTooltip contentStyle={{backgroundColor:'#0f172a', border:'none'}} />
                                         </BarChart>
                                     </ResponsiveContainer>
                                 </div>
                                 <button onClick={()=>cloudDb.add(cloudDb.COLLS.FINANCE, { type:'INCOME', amount: 1000, date: new Date().toISOString(), category:'إيراد يدوي' })} className={BTN_PRIMARY}>إضافة حركة مالية سريعة</button>
                             </div>
                        )}
                        {tab === 'settings' && (
                            <div className="space-y-4">
                                <div className={CARD_CLASS}><h3 className="font-bold mb-1">بيانات المستخدم</h3><p className="text-xs text-slate-500">{user.name} (@{user.username})</p></div>
                                <button onClick={()=>{ if(confirm('مسح؟')) dresses.forEach(d=>cloudDb.delete(cloudDb.COLLS.DRESSES, d.id)) }} className="w-full py-4 bg-red-950/20 border border-red-900/30 text-red-500 rounded-3xl font-black text-xs uppercase flex items-center justify-center gap-2 tracking-widest"><Trash size={16}/> تصفير مخزون الفساتين</button>
                            </div>
                        )}
                    </div>
                </main>

                <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center z-[60] pb-safe">
                    <button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='home'?'text-brand-500':'text-slate-500'}`}><Home size={20}/><span className="text-[9px] font-black uppercase">الرئيسية</span></button>
                    <button onClick={()=>setTab('dresses_rent')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='dresses_rent'?'text-brand-500':'text-slate-500'}`}><Shirt size={20}/><span className="text-[9px] font-black uppercase">الإيجار</span></button>
                    <button onClick={()=>setTab('dresses_sale')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='dresses_sale'?'text-brand-500':'text-slate-500'}`}><ShoppingBag size={20}/><span className="text-[9px] font-black uppercase">البيع</span></button>
                    <button onClick={()=>setMenuOpen(true)} className="flex flex-col items-center gap-1 flex-1 text-slate-500"><MoreHorizontal size={20}/><span className="text-[9px] font-black uppercase">المزيد</span></button>
                </nav>

                {isMenuOpen && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl p-8 animate-fade-in">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-3xl font-black text-white">كل الأقسام</h3><button onClick={()=>setMenuOpen(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center"><X size={24}/></button></div>
                        <div className="grid grid-cols-2 gap-4">
                            {NAV_ITEMS.map(item => (
                                <button key={item.id} onClick={() => {setTab(item.id); setMenuOpen(false)}} className={`bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:bg-brand-600 ${tab===item.id?'border-brand-500 bg-brand-500/5':''}`}>
                                    <span className="text-xs font-black text-slate-200 uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {toasts.map(t=>(
                    <div key={t.id} className={`fixed bottom-24 inset-x-4 z-[200] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-in-up max-w-sm mx-auto w-full pointer-events-none ${t.type==='success'?'bg-emerald-950/90 border-emerald-500/50 text-emerald-200':'bg-red-950/90 border-red-500/50 text-red-200'}`}>
                        {t.type==='success' ? <Check size={18}/> : <AlertCircle size={18}/>}
                        <span className="text-xs font-bold">{t.msg}</span>
                    </div>
                ))}

                {printData && <PrePrintedInvoice data={printData.data} type={printData.type} onClose={()=>setPrintData(null)} />}
            </div>
        </ToastContext.Provider>
    );
};

export default App;
