
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, Droplets, User, Factory, 
  RotateCcw, AlertCircle, TrendingUp, Bell, ShoppingBag,
  Gift, AlertTriangle, Lock, Menu, MoreHorizontal,
  Scissors, FileCheck, Cloud, Loader2, Tag, Sparkles, PieChart as PieChartIcon,
  ChevronRight, Phone, MapPin, CreditCard, Trash, Clock, Undo2, CheckSquare,
  TrendingDown, BarChart3
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
    Accessory
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Styles Constants ---
const INPUT_CLASS = "w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-slate-500 text-sm";
const LABEL_CLASS = "block text-[11px] mb-1.5 text-slate-400 font-bold uppercase tracking-wider px-1";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-95 transition-all text-sm";
const CARD_CLASS = "bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group";
const BADGE_CLASS = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border inline-flex items-center justify-center gap-1.5";
const COLORS = ['#d946ef', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

// --- Helpers ---
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
        <div className={`bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl w-full ${size==='lg'?'max-w-3xl':'max-w-xl'} flex flex-col animate-slide-in-up max-h-[95vh]`}>
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
                <h2 className="font-bold text-lg">معاينة المستند</h2>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded font-bold"><Printer size={16}/> طباعة</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded font-bold">إغلاق</button>
                </div>
            </div>
            <div className="p-10 max-w-[210mm] mx-auto w-full bg-white min-h-screen font-serif">
                <div className="text-center border-b-2 border-black pb-6 mb-8">
                    <h1 className="text-4xl font-bold mb-2">إيلاف لفساتين الزفاف</h1>
                    <p className="text-gray-600">Elaf For Wedding Dress</p>
                    <p className="mt-2 font-bold">{type === 'BOOKING' ? 'عقد إيجار' : type === 'SALE' ? 'عقد تفصيل' : 'سند استلام'}</p>
                </div>
                <div className="grid grid-cols-2 gap-8 text-sm mb-10">
                    <div className="space-y-2">
                        <p><span className="font-bold">العميلة:</span> {data.customerName || data.brideName}</p>
                        <p><span className="font-bold">الهاتف:</span> {data.customerPhone || data.bridePhone}</p>
                        <p><span className="font-bold">التاريخ:</span> {formatDate(new Date().toISOString())}</p>
                    </div>
                    <div className="space-y-2 text-left">
                        <p><span className="font-bold">كود الفستان:</span> {data.factoryCode || data.dressId || '-'}</p>
                        <p><span className="font-bold">موعد المناسبة:</span> {formatDate(data.eventDate || data.expectedDeliveryDate)}</p>
                    </div>
                </div>
                {type === 'ORDER_DETAILS' && data.measurements && (
                    <div className="mb-10">
                        <h3 className="font-bold border-b border-black mb-4">جدول المقاسات</h3>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                            {Object.entries(data.measurements).map(([k, v]) => (
                                <p key={k}>- {k}: <b>{String(v)}</b></p>
                            ))}
                        </div>
                    </div>
                )}
                <div className="border-2 border-black p-4 rounded mb-10">
                    <p className="font-bold mb-2">التفاصيل المالية:</p>
                    <p>الإجمالي: {formatCurrency(data.agreedRentalPrice || data.sellPrice)}</p>
                    <p>المدفوع: {formatCurrency(data.paidDeposit || data.deposit)}</p>
                    <p className="font-bold text-lg">المتبقي: {formatCurrency(data.remainingToPay || data.remainingFromBride)}</p>
                </div>
                <div className="mt-20 flex justify-between px-10">
                    <div className="text-center border-t border-black pt-2 w-32">توقيع العروس</div>
                    <div className="text-center border-t border-black pt-2 w-32">ختم المحل</div>
                </div>
            </div>
        </div>
    );
};

// --- Manager Components ---

const HomeManager = ({ dresses, bookings, finance }: any) => {
    const today = new Date().toDateString();
    const stats = [
        { title: 'متاح للإيجار', value: dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).length, icon: Shirt, color: 'text-green-400', bg: 'bg-green-500/10' },
        { title: 'فساتين مؤجرة', value: bookings.filter((b:any)=>b.status===BookingStatus.ACTIVE).length, icon: Calendar, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        { title: 'إيراد اليوم', value: formatCurrency(finance.filter((f:any)=>f.type==='INCOME' && new Date(f.date).toDateString() === today).reduce((a:any,b:any)=>a+b.amount,0)), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { title: 'تنبيهات الغسيل', value: dresses.filter((d:any)=>d.status===DressStatus.CLEANING).length, icon: Droplets, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className={CARD_CLASS}>
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 ${s.color}`}><s.icon size={20} /></div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{s.title}</p>
                        <p className="text-lg font-bold text-white mt-1">{s.value}</p>
                    </div>
                ))}
            </div>
            <div className={CARD_CLASS}>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-brand-400"/> آخر النشاطات السحابية</h3>
                <div className="space-y-3">
                    {bookings.slice(0, 4).map((b:any) => (
                        <div key={b.id} className="p-3 bg-slate-800/30 rounded-xl border border-slate-800 flex justify-between items-center group-hover:bg-slate-800/50 transition-colors">
                            <div><p className="text-sm font-bold text-white">{b.customerName}</p><p className="text-[10px] text-slate-500">{b.dressName}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const RentalManager = ({ dresses, onAdd, onUpdate, onDelete }: any) => {
    const [view, setView] = useState<'ALL'|'ARCHIVED'|'ANALYTICS'>('ALL');
    const [isModal, setModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);

    const filtered = dresses.filter((d:any) => view==='ARCHIVED' ? d.status===DressStatus.ARCHIVED : d.status!==DressStatus.ARCHIVED);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                <button onClick={()=>setView('ALL')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${view==='ALL'?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>المخزون</button>
                <button onClick={()=>setView('ARCHIVED')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${view==='ARCHIVED'?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>الأرشيف</button>
            </div>
            <button onClick={()=>{setEditItem(null); setModal(true)}} className={BTN_PRIMARY}><Plus size={18}/> إضافة فستان جديد</button>
            <div className="grid grid-cols-1 gap-4">
                {filtered.map((d:any) => (
                    <div key={d.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="font-bold text-white">{d.name}</h4><p className="text-xs text-slate-500">{d.style}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(d.status)}>{d.status}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                            <p className="text-brand-400 font-bold">{formatCurrency(d.rentalPrice)}</p>
                            <div className="flex gap-2">
                                <button onClick={()=>{setEditItem(d); setModal(true)}} className="p-2.5 bg-slate-800 rounded-xl text-slate-400"><Edit size={16}/></button>
                                {view === 'ALL' ? (
                                    <button onClick={()=>onUpdate(d.id, {status: DressStatus.ARCHIVED})} className="p-2.5 bg-red-950/20 rounded-xl text-red-500"><Trash2 size={16}/></button>
                                ) : (
                                    <button onClick={()=>onUpdate(d.id, {status: DressStatus.AVAILABLE})} className="p-2.5 bg-green-950/20 rounded-xl text-green-500"><Undo2 size={16}/></button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModal && (
                <Modal title={editItem ? "تعديل فستان" : "فستان جديد"} onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const data = {
                            name: fd.get('name'), style: fd.get('style'), rentalPrice: Number(fd.get('price')),
                            status: fd.get('status'), type: DressType.RENT, updatedAt: new Date().toISOString()
                        };
                        editItem ? await onUpdate(editItem.id, data) : await onAdd(data);
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" defaultValue={editItem?.name} placeholder="اسم الفستان" className={INPUT_CLASS} required />
                        <input name="style" defaultValue={editItem?.style} placeholder="الموديل" className={INPUT_CLASS} />
                        <input name="price" type="number" defaultValue={editItem?.rentalPrice} placeholder="سعر الإيجار" className={INPUT_CLASS} required />
                        <select name="status" defaultValue={editItem?.status || DressStatus.AVAILABLE} className={INPUT_CLASS}>
                            {Object.values(DressStatus).map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className={BTN_PRIMARY}>حفظ</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const BookingManager = ({ bookings, dresses, onAdd, onUpdate, onPrint }: any) => {
    const [isModal, setModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={()=>{setEditItem(null); setModal(true)}} className={BTN_PRIMARY}><Plus size={18}/> حجز إيجار جديد</button>
            <div className="space-y-4">
                {bookings.filter((b:any)=>b.status!==BookingStatus.CANCELLED).map((b:any)=>(
                    <div key={b.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-3">
                            <div><h4 className="font-bold text-white">{b.customerName}</h4><p className="text-[10px] text-slate-500">فستان: {b.dressName}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(b.status)}>{b.status}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="text-xs text-slate-400">المناسبة: <span className="text-brand-400 font-bold">{formatDate(b.eventDate)}</span></div>
                            <div className="flex gap-2">
                                <button onClick={()=>onPrint(b, 'BOOKING')} className="p-2 bg-slate-800 rounded-lg text-brand-300"><Printer size={16}/></button>
                                <button onClick={()=>{setEditItem(b); setModal(true)}} className="p-2 bg-slate-800 rounded-lg text-slate-400"><Edit size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModal && (
                <Modal title={editItem ? "تعديل حجز" : "حجز جديد"} onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const price = Number(fd.get('price'));
                        const dep = Number(fd.get('deposit'));
                        const dress = dresses.find((d:any)=>d.id===fd.get('dressId'));
                        const data = {
                            customerName: fd.get('name'), customerPhone: fd.get('phone'),
                            dressId: fd.get('dressId'), dressName: dress?.name || '',
                            eventDate: fd.get('date'), agreedRentalPrice: price, paidDeposit: dep,
                            remainingToPay: price - dep, status: BookingStatus.PENDING,
                            createdAt: new Date().toISOString()
                        };
                        editItem ? await onUpdate(editItem.id, data) : await onAdd(data);
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" defaultValue={editItem?.customerName} placeholder="اسم العروس" className={INPUT_CLASS} required />
                        <input name="phone" defaultValue={editItem?.customerPhone} placeholder="رقم الهاتف" className={INPUT_CLASS} required />
                        <select name="dressId" defaultValue={editItem?.dressId} className={INPUT_CLASS} required>
                            <option value="">اختر الفستان...</option>
                            {dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).map((d:any)=>(
                                <option key={d.id} value={d.id}>{d.name} ({d.style})</option>
                            ))}
                        </select>
                        <input name="date" type="date" defaultValue={toInputDate(editItem?.eventDate)} className={INPUT_CLASS} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="price" type="number" defaultValue={editItem?.agreedRentalPrice} placeholder="سعر الإيجار" className={INPUT_CLASS} required />
                            <input name="deposit" type="number" defaultValue={editItem?.paidDeposit} placeholder="العربون" className={INPUT_CLASS} required />
                        </div>
                        <button className={BTN_PRIMARY}>تأكيد الحجز سحابياً</button>
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
            <button onClick={()=>setModal(true)} className={BTN_PRIMARY}><ShoppingBag size={18}/> طلب تفصيل (بيع) جديد</button>
            <div className="space-y-4">
                {orders.map((o:any)=>(
                    <div key={o.id} className={CARD_CLASS}>
                        <div className="flex justify-between mb-3">
                            <div><h4 className="font-bold text-white">{o.brideName}</h4><p className="text-[10px] text-slate-400">كود: {o.factoryCode}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(o.status)}>{o.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{o.dressDescription}</p>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                            <div className="text-[10px] text-red-400">المتبقي: {formatCurrency(o.remainingFromBride)}</div>
                            <div className="flex gap-2">
                                <button onClick={()=>setMeasureModal({show:true, order:o})} className="p-2 bg-slate-800 rounded-lg text-brand-400"><Scissors size={16}/></button>
                                <button onClick={()=>onPrint(o, 'ORDER_DETAILS')} className="p-2 bg-slate-800 rounded-lg text-slate-400"><Printer size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModal && (
                <Modal title="طلب تفصيل جديد" onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const price = Number(fd.get('price'));
                        const dep = Number(fd.get('deposit'));
                        await onAdd({
                            brideName: fd.get('name'), bridePhone: fd.get('phone'),
                            factoryCode: fd.get('code'), dressDescription: fd.get('desc'),
                            sellPrice: price, deposit: dep, remainingFromBride: price - dep,
                            status: SaleStatus.DESIGNING, expectedDeliveryDate: fd.get('date'),
                            createdAt: new Date().toISOString()
                        });
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" placeholder="اسم العروس" className={INPUT_CLASS} required />
                        <input name="phone" placeholder="رقم الهاتف" className={INPUT_CLASS} required />
                        <input name="code" placeholder="كود الموديل" className={INPUT_CLASS} required />
                        <textarea name="desc" placeholder="وصف الفستان" className={INPUT_CLASS + " h-20"} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="price" type="number" placeholder="سعر البيع" className={INPUT_CLASS} required />
                            <input name="deposit" type="number" placeholder="العربون" className={INPUT_CLASS} required />
                        </div>
                        <input name="date" type="date" className={INPUT_CLASS} required />
                        <button className={BTN_PRIMARY}>تثبيت الطلب</button>
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
                    }} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            {['صدر', 'خصر', 'هانش', 'طول كلي', 'كتف', 'كم'].map(m=>(
                                <div key={m}><label className="text-[10px] text-slate-500 mb-1 block">{m}</label><input name={m} defaultValue={measureModal.order?.measurements?.[m]} className={INPUT_CLASS} /></div>
                            ))}
                        </div>
                        <textarea name="notes" placeholder="ملاحظات خياطة إضافية" className={INPUT_CLASS + " h-24"} />
                        <button className={BTN_PRIMARY}>حفظ المقاسات</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const FinanceManager = ({ finance, onAdd }: any) => {
    const [isModal, setModal] = useState(false);
    const months = ['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو'];
    const chartData = months.map(m => ({ name: m, income: Math.random()*5000 + 2000, expense: Math.random()*3000 + 1000 }));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className={CARD_CLASS + " h-64"}>
                <h3 className="font-bold mb-4">تحليل التدفق المالي</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                        <Bar dataKey="income" name="إيرادات" fill="#d946ef" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="مصاريف" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <button onClick={()=>setModal(true)} className={BTN_PRIMARY}><Plus size={18}/> تسجيل حركة مالية</button>
            <div className="space-y-3">
                {finance.slice(0, 10).map((f:any)=>(
                    <div key={f.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
                        <div><p className="text-sm font-bold text-white">{f.category}</p><p className="text-[10px] text-slate-500">{formatDate(f.date)}</p></div>
                        <p className={`font-bold ${f.type==='INCOME'?'text-emerald-400':'text-red-400'}`}>{f.type==='INCOME'?'+':'-'} {formatCurrency(f.amount)}</p>
                    </div>
                ))}
            </div>
            {isModal && (
                <Modal title="حركة مالية جديدة" onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        await onAdd({
                            type: fd.get('type'), category: fd.get('cat'), 
                            amount: Number(fd.get('amount')), date: new Date().toISOString(),
                            notes: fd.get('notes')
                        });
                        setModal(false);
                    }} className="space-y-4">
                        <select name="type" className={INPUT_CLASS}><option value="INCOME">إيراد (+)</option><option value="EXPENSE">مصروف (-)</option></select>
                        <input name="cat" placeholder="البند (مثلاً: تنظيف فستان، فاتورة كهرباء)" className={INPUT_CLASS} required />
                        <input name="amount" type="number" placeholder="المبلغ" className={INPUT_CLASS} required />
                        <textarea name="notes" placeholder="ملاحظات" className={INPUT_CLASS} />
                        <button className={BTN_PRIMARY}>حفظ الحركة</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- Main App Component ---

const App = () => {
    if (!isConfigured) return <div className="p-8 text-center text-red-500">Firebase configuration error.</div>;

    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [isMoreMenu, setMoreMenu] = useState(false);
    const [toasts, setToasts] = useState<any[]>([]);
    const [printData, setPrintData] = useState<any>(null);

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

    const handleWipe = async () => {
        if (!confirm("سيتم مسح كافة البيانات بشكل نهائي! هل أنت متأكد؟")) return;
        setLoading(true);
        try {
            for (const d of dresses) await cloudDb.delete(cloudDb.COLLS.DRESSES, d.id);
            for (const b of bookings) await cloudDb.delete(cloudDb.COLLS.BOOKINGS, b.id);
            for (const f of finance) await cloudDb.delete(cloudDb.COLLS.FINANCE, f.id);
            for (const o of orders) await cloudDb.delete(cloudDb.COLLS.SALES, o.id);
            addToast("تم تصفير النظام بنجاح");
        } catch (e) { addToast("خطأ في العملية", "error"); }
        setLoading(false);
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
            <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest animate-pulse">مزامنة سحابية آمنة...</p>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-sm bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
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
                
                <header className="fixed top-0 inset-x-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-[60]">
                    <div className="flex items-center gap-2 font-bold"><div className="p-1.5 bg-brand-600 rounded-lg"><Shirt size={16}/></div> إيلاف</div>
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <button onClick={()=>setUser(null)} className="p-2 text-slate-400"><LogOut size={18}/></button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
                    <div className="max-w-xl mx-auto">
                        {tab === 'home' && <HomeManager dresses={dresses} bookings={bookings} finance={finance} />}
                        {tab === 'dresses_rent' && <RentalManager dresses={dresses} onAdd={(d:any)=>cloudDb.add(cloudDb.COLLS.DRESSES, d)} onUpdate={(id:any, d:any)=>cloudDb.update(cloudDb.COLLS.DRESSES, id, d)} />}
                        {tab === 'bookings' && <BookingManager bookings={bookings} dresses={dresses} onAdd={(b:any)=>cloudDb.add(cloudDb.COLLS.BOOKINGS, b)} onUpdate={(id:any, b:any)=>cloudDb.update(cloudDb.COLLS.BOOKINGS, id, b)} onPrint={(d:any, t:any)=>setPrintData({data:d, type:t})} />}
                        {tab === 'dresses_sale' && <SalesManager orders={orders} onAdd={(o:any)=>cloudDb.add(cloudDb.COLLS.SALES, o)} onUpdate={(id:any, o:any)=>cloudDb.update(cloudDb.COLLS.SALES, id, o)} onPrint={(d:any, t:any)=>setPrintData({data:d, type:t})} />}
                        {tab === 'finance' && <FinanceManager finance={finance} onAdd={(f:any)=>cloudDb.add(cloudDb.COLLS.FINANCE, f)} />}
                        {tab === 'settings' && (
                            <div className="space-y-6">
                                <div className={CARD_CLASS}><h3 className="font-bold mb-2">إصدار النظام</h3><p className="text-xs text-slate-500">v2.1.0 Premium Cloud</p></div>
                                <button onClick={handleWipe} className="w-full py-4 bg-red-950/20 border border-red-900/30 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2"><Trash size={18}/> تصفير النظام (ضبط مصنع)</button>
                            </div>
                        )}
                        {!['home', 'dresses_rent', 'bookings', 'dresses_sale', 'finance', 'settings'].includes(tab) && (
                            <div className="text-center py-20 text-slate-600">سيتم تفعيل هذا القسم في التحديث القادم</div>
                        )}
                    </div>
                </main>

                <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-900 border-t border-slate-800 flex justify-around items-center z-[60] pb-safe">
                    <button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='home'?'text-brand-500':'text-slate-500'}`}><Home size={18}/><span className="text-[9px] font-bold">الرئيسية</span></button>
                    <button onClick={()=>setTab('dresses_rent')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='dresses_rent'?'text-brand-500':'text-slate-500'}`}><Shirt size={18}/><span className="text-[9px] font-bold">المخزون</span></button>
                    <button onClick={()=>setTab('bookings')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='bookings'?'text-brand-500':'text-slate-500'}`}><Calendar size={18}/><span className="text-[9px] font-bold">الحجوزات</span></button>
                    <button onClick={()=>setTab('finance')} className={`flex flex-col items-center gap-1 flex-1 ${tab==='finance'?'text-brand-500':'text-slate-500'}`}><DollarSign size={18}/><span className="text-[9px] font-bold">المالية</span></button>
                    <button onClick={()=>setMoreMenu(true)} className="flex flex-col items-center gap-1 flex-1 text-slate-500"><MoreHorizontal size={18}/><span className="text-[9px] font-bold">المزيد</span></button>
                </nav>

                {isMoreMenu && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl p-8 animate-fade-in flex flex-col">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-2xl font-bold">القائمة الكاملة</h3><button onClick={()=>setMoreMenu(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center"><X/></button></div>
                        <div className="grid grid-cols-2 gap-4">
                            {NAV_ITEMS.map(item => (
                                <button key={item.id} onClick={() => {setTab(item.id); setMoreMenu(false)}} className={`bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 ${tab===item.id?'border-brand-500 bg-brand-600/10':''}`}>
                                    <span className="text-xs font-bold text-slate-300">{item.label}</span>
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
