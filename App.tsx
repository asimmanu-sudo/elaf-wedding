
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Shirt, Calendar, Truck, Users, DollarSign, FileText, Settings, LogOut, Plus, 
  Search, Edit, Trash2, Check, X, Printer, Droplets, User, Factory, 
  RotateCcw, AlertCircle, TrendingUp, Bell, ShoppingBag,
  Gift, AlertTriangle, Lock, Menu, MoreHorizontal,
  Scissors, FileCheck, Loader2, Undo2, CheckSquare, BarChart3, Clock, ArrowRightLeft, CreditCard, Ruler, Archive, Key, Trash, Info, UserPlus
} from 'lucide-react';
import { cloudDb, COLLS } from './services/firebase';
import { 
    UserRole, DressType, DressStatus, BookingStatus, 
    SaleStatus, FactoryPaymentStatus, PaymentMethod, DepositType
} from './types';
import type { 
    User as UserType, Dress, Booking, 
    FinanceRecord, SaleOrder, AuditLog, Customer as CustomerType
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Global Styles & Helpers ---
const INPUT_CLASS = "w-full bg-slate-900/50 text-white border border-slate-700/50 rounded-2xl p-4 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder-slate-600 text-sm";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-[0.98] transition-all text-sm disabled:opacity-50";
const CARD_CLASS = "bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden group hover:border-white/10 transition-all";
const BADGE_CLASS = "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-flex items-center justify-center gap-1.5";

const formatDate = (iso: string) => iso ? new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val || 0);

const getStatusColor = (status: string) => {
    switch(status) {
        case DressStatus.AVAILABLE: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case DressStatus.RENTED: return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
        case DressStatus.CLEANING: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        case BookingStatus.ACTIVE: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case SaleStatus.DESIGNING: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case SaleStatus.READY: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        case SaleStatus.DELIVERED: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
};

const Modal = ({ title, children, onClose, size = 'md' }: any) => (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-950/90 backdrop-blur-md p-0 md:p-4 animate-fade-in">
        <div className={`bg-slate-900 border-t md:border border-white/10 rounded-t-[3rem] md:rounded-[3.5rem] shadow-2xl w-full ${size==='lg'?'max-w-4xl':'max-w-xl'} flex flex-col animate-slide-in-up max-h-[95vh]`}>
            <div className="flex justify-between items-center p-8 border-b border-white/5">
                <h2 className="text-xl font-black text-brand-300 tracking-tight">{String(title)}</h2>
                <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 pb-20">{children}</div>
        </div>
    </div>
);

const MEASUREMENT_FIELDS = [
    { key: 'neck', label: 'محيط الرقبة' },
    { key: 'shoulder', label: 'محيط الكتف' },
    { key: 'chest', label: 'محيط الصدر' },
    { key: 'underChest', label: 'محيط تحت الصدر' },
    { key: 'chestDart', label: 'طول بنس الصدر' },
    { key: 'waist', label: 'محيط الخصر' },
    { key: 'backLength', label: 'طول الظهر' },
    { key: 'hips', label: 'محيط الهانش' },
    { key: 'fullLength', label: 'الطول الكامل' },
    { key: 'sleeve', label: 'طول اليد' },
    { key: 'armhole', label: 'محيط الأبط' },
    { key: 'arm', label: 'محيط الذراع' },
    { key: 'forearm', label: 'محيط الساعد' },
    { key: 'wrist', label: 'محيط الأسوارة' },
    { key: 'legOpening', label: 'محيط فتحة الرجل' },
    { key: 'bustType', label: 'نوع الصدر' },
    { key: 'skirtType', label: 'نوع التنورة' },
    { key: 'materials', label: 'الخامة المستخدمة' },
    { key: 'orderNotes', label: 'الشرح المطلوب للأوردر' },
];

const MeasurementsModal = ({ data, onSave, onClose, title }: any) => {
    const [measurements, setMeasurements] = useState<any>(data?.measurements || {});
    return (
        <Modal title={title} onClose={onClose} size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MEASUREMENT_FIELDS.map(f => (
                    <div key={f.key} className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-black uppercase px-2">{f.label}</label>
                        {f.key === 'orderNotes' || f.key === 'materials' ? (
                            <textarea className={INPUT_CLASS + " h-24"} value={measurements[f.key] || ''} onChange={e => setMeasurements({...measurements, [f.key]: e.target.value})} />
                        ) : (
                            <input className={INPUT_CLASS} value={measurements[f.key] || ''} onChange={e => setMeasurements({...measurements, [f.key]: e.target.value})} />
                        )}
                    </div>
                ))}
            </div>
            <button onClick={() => onSave(measurements)} className={BTN_PRIMARY + " mt-8"}><CheckSquare size={20}/> حفظ المقاسات</button>
        </Modal>
    );
};

// --- Component Managers ---

const FinanceManager = ({ finance, users, dresses, onAdd }: any) => {
    const [isModal, setModal] = useState(false);
    const [type, setType] = useState<'INCOME'|'EXPENSE'>('INCOME');
    const [category, setCategory] = useState('');
    const [billType, setBillType] = useState('');
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
    const rentalDresses = dresses.filter((d:any) => d.type === DressType.RENT);
    return (
        <div className="space-y-8 animate-fade-in">
            <h3 className="text-3xl font-black text-white px-2">المالية</h3>
            <button onClick={()=>{setModal(true); setCategory(''); setSelectedEntities([])}} className={BTN_PRIMARY + " h-16 text-lg"}><Plus size={24}/> إضافة حركة مالية</button>
            <div className={CARD_CLASS}><div className="divide-y divide-white/5">{finance.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map((f:any)=>(<div key={f.id} className="py-6 flex justify-between items-center"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.type==='INCOME'?'bg-emerald-500/20 text-emerald-400':'bg-red-500/20 text-red-400'}`}>{f.type==='INCOME'?<TrendingUp size={18}/>:<ArrowRightLeft size={18}/>}</div><div><p className="font-black text-white text-sm">{f.category}</p><p className="text-[10px] text-slate-500 font-bold">{formatDate(f.date)} {f.targetName ? `• ${f.targetName}` : ''}</p></div></div><p className={`font-black text-sm ${f.type==='INCOME'?'text-emerald-400':'text-red-400'}`}>{f.type==='INCOME'?'+':'-'} {formatCurrency(f.amount)}</p></div>))}</div></div>
            {isModal && (<Modal title="إضافة حركة مالية" onClose={()=>setModal(false)}><form onSubmit={async (e:any)=>{
                e.preventDefault(); const fd = new FormData(e.target); const finalCat = type === 'INCOME' ? fd.get('in_cat') : category; const sub = category === 'فواتير' ? billType : (category === 'اخرى' ? fd.get('sub_cat') : ''); const target = selectedEntities.join(', ') || fd.get('target') || '';
                await onAdd({ type, amount: Number(fd.get('amount')), category: finalCat, subCategory: sub, targetName: target, date: fd.get('date') || new Date().toISOString() }); setModal(false);
            }} className="space-y-6"><div className="flex p-1.5 bg-slate-950 rounded-3xl border border-white/5"><button type="button" onClick={()=>setType('INCOME')} className={`flex-1 py-4 rounded-2xl text-sm font-black ${type==='INCOME'?'bg-emerald-600 text-white':'text-slate-500'}`}>وارد</button><button type="button" onClick={()=>setType('EXPENSE')} className={`flex-1 py-4 rounded-2xl text-sm font-black ${type==='EXPENSE'?'bg-red-600 text-white':'text-slate-500'}`}>منصرف</button></div>
                        {type === 'INCOME' ? <input name="in_cat" placeholder="نوع الوارد..." className={INPUT_CLASS} required /> : (
                            <div className="space-y-4"><select className={INPUT_CLASS} required onChange={e=>{setCategory(e.target.value); setSelectedEntities([])}}><option value="">اختر التصنيف...</option><option value="فواتير">فواتير</option><option value="رواتب">رواتب</option><option value="تنظيف">تنظيف</option><option value="ترزي">ترزي</option><option value="اخرى">أخرى</option></select>
                                {category === 'فواتير' && <select className={INPUT_CLASS} required onChange={e=>setBillType(e.target.value)}><option value="">نوع الفاتورة...</option><option value="ايجار">إيجار</option><option value="كهرباء">كهرباء</option><option value="ماء">ماء</option><option value="صيانة">صيانة</option><option value="اخرى">أخرى (سيظهر حقل إضافي)</option></select>}
                                {category === 'فواتير' && billType === 'اخرى' && <input name="sub_cat" placeholder="تفاصيل الفاتورة" className={INPUT_CLASS} required />}
                                {category === 'رواتب' && <select className={INPUT_CLASS} required onChange={e=>setSelectedEntities([e.target.value])}><option value="">اختر الموظف...</option>{users.map((u:any)=><option key={u.id} value={u.name}>{u.name}</option>)}</select>}
                                {(category === 'تنظيف' || category === 'ترزي') && <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 max-h-48 overflow-y-auto"><p className="text-[10px] text-slate-500 font-black mb-2 px-2">اختر الفساتين المعنية:</p>{rentalDresses.map((d:any) => (<label key={d.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-800"><input type="checkbox" className="w-5 h-5 accent-brand-500" checked={selectedEntities.includes(d.name)} onChange={e => e.target.checked ? setSelectedEntities([...selectedEntities, d.name]) : setSelectedEntities(selectedEntities.filter(x => x !== d.name))} /><span className="text-xs text-white font-bold">{d.name}</span></label>))}</div>}
                                {category === 'اخرى' && <input name="sub_cat" placeholder="النوع" className={INPUT_CLASS} required />}
                            </div>)}<div className="grid grid-cols-2 gap-4"><input name="amount" type="number" placeholder="المبلغ" className={INPUT_CLASS} required /><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className={INPUT_CLASS} required /></div><button className={BTN_PRIMARY}>تثبيت العملية</button></form></Modal>)}
        </div>
    );
};

const SalesManager = ({ orders, onAdd, onUpdate, onFinanceAdd }: any) => {
    const [view, setView] = useState<'ACTIVE'|'COMPLETED'>('ACTIVE');
    const [isModal, setModal] = useState(false);
    const [collectModal, setCollectModal] = useState<any>(null);
    const [measurementsModal, setMeasurementsModal] = useState<any>(null);
    const filtered = orders.filter((o:any) => view === 'COMPLETED' ? o.status === SaleStatus.DELIVERED : o.status !== SaleStatus.DELIVERED);
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center px-2"><h3 className="text-3xl font-black text-white">مبيعات التفصيل</h3><div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-white/5"><button onClick={()=>setView('ACTIVE')} className={`px-6 py-2.5 rounded-2xl text-xs font-black ${view==='ACTIVE'?'bg-brand-600 text-white':'text-slate-500'}`}>النشطة</button><button onClick={()=>setView('COMPLETED')} className={`px-6 py-2.5 rounded-2xl text-xs font-black ${view==='COMPLETED'?'bg-brand-600 text-white':'text-slate-500'}`}>المكتملة</button></div></div>
            {view === 'ACTIVE' ? (<><button onClick={()=>setModal(true)} className={BTN_PRIMARY + " h-16 text-lg"}><Plus size={24}/> طلب تفصيل جديد</button>
                    <div className="grid gap-4">{filtered.map((o:any)=>(<div key={o.id} className={CARD_CLASS}><div className="flex justify-between items-start mb-4"><div><h4 className="font-black text-white text-xl">{o.brideName}</h4><p className="text-sm text-brand-400 font-bold">{o.bridePhone}</p></div><span className={BADGE_CLASS + " " + getStatusColor(o.status)}>{o.status}</span></div>
                                <div className="grid grid-cols-2 gap-3 mb-4"><div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5"><p className="text-[10px] text-slate-500 font-black">كود المصنع</p><p className="text-sm font-black text-white">{o.factoryCode}</p></div><div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5"><p className="text-[10px] text-slate-500 font-black">المتبقي</p><p className="text-sm font-black text-red-400">{formatCurrency(o.remainingFromBride)}</p></div></div>
                                <div className="flex justify-between items-center"><button onClick={()=>setMeasurementsModal(o)} className="p-2 bg-slate-800 text-brand-400 rounded-xl hover:bg-brand-600 hover:text-white transition-all"><Ruler size={18}/></button><div className="flex gap-2">{o.status === SaleStatus.DESIGNING && <button onClick={()=>onUpdate(o.id, {status: SaleStatus.READY})} className="px-4 py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[10px] font-black">جاهز</button>}<button onClick={()=>setCollectModal(o)} className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black">تسليم للعروس</button></div></div></div>))}</div></>) : (
                <div className="overflow-x-auto bg-slate-900/50 border border-white/5 rounded-[2.5rem]"><table className="w-full text-right border-collapse"><thead><tr className="bg-slate-950/40 text-slate-500 text-[10px] font-black uppercase border-b border-white/5"><th className="p-5">كود المصنع</th><th className="p-5">العروس</th><th className="p-5 text-center">المتبقي</th><th className="p-5 text-center">الإجراءات</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map((o:any)=>(<tr key={o.id} className="hover:bg-white/5"><td className="p-5 text-sm font-black text-white">{o.factoryCode}</td><td className="p-5 text-sm text-slate-400">{o.brideName}</td><td className="p-5 text-center text-sm font-black text-red-400">{formatCurrency(o.remainingFromBride)}</td><td className="p-5 text-center"><div className="flex justify-center gap-2">{o.remainingFromBride > 0 && <button onClick={()=>setCollectModal(o)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"><DollarSign size={18}/></button>}<button onClick={()=>{if(confirm('استعادة للتصميم؟')){onUpdate(o.id, {status: SaleStatus.DESIGNING});}}} className="p-2 text-brand-400 hover:bg-brand-500/10 rounded-lg"><RotateCcw size={18}/></button></div></td></tr>))}</tbody></table></div>)}
            {isModal && (<Modal title="طلب تفصيل جديد" onClose={()=>setModal(false)}><form onSubmit={async (e:any)=>{
                e.preventDefault(); const fd = new FormData(e.target); const code = fd.get('code')?.toString(); if(orders.some((o:any) => o.factoryCode === code && o.status !== SaleStatus.DELIVERED)){ alert('كود مكرر!'); return; }
                const sPrice = Number(fd.get('sPrice')); const dep = Number(fd.get('deposit'));
                await onAdd({ brideName: fd.get('name'), bridePhone: fd.get('phone'), factoryCode: code, factoryPrice: Number(fd.get('fPrice')), sellPrice: sPrice, deposit: dep, remainingFromBride: sPrice - dep, status: SaleStatus.DESIGNING, factoryStatus: FactoryPaymentStatus.UNPAID, factoryDepositPaid: 0, orderDate: new Date().toISOString() });
                if(dep > 0) await onFinanceAdd({ amount: dep, type: 'INCOME', category: 'عربون مبيعات (تفصيل)', targetName: fd.get('name'), date: new Date().toISOString() }); setModal(false);
            }} className="space-y-4"><div className="grid grid-cols-2 gap-4"><input name="name" placeholder="العروس" className={INPUT_CLASS} required /><input name="phone" placeholder="الهاتف" className={INPUT_CLASS} required /></div><input name="code" placeholder="كود الفستان" className={INPUT_CLASS} required /><div className="grid grid-cols-3 gap-3"><input name="fPrice" type="number" placeholder="تكلفة المصنع" className={INPUT_CLASS} required /><input name="sPrice" type="number" placeholder="سعر البيع" className={INPUT_CLASS} required /><input name="deposit" type="number" placeholder="العربون" className={INPUT_CLASS} required /></div><button className={BTN_PRIMARY}>تثبيت الطلب</button></form></Modal>)}
            {collectModal && (<Modal title={`تحصيل متبقي - ${collectModal.brideName}`} onClose={()=>setCollectModal(null)}><form onSubmit={async (e:any)=>{
                e.preventDefault(); const amount = Number(new FormData(e.target).get('amount')); await onUpdate(collectModal.id, { remainingFromBride: collectModal.remainingFromBride - amount, status: SaleStatus.DELIVERED });
                if(amount > 0) await onFinanceAdd({ amount, type: 'INCOME', category: `تحصيل نهائي مبيعات - ${collectModal.brideName}`, targetName: collectModal.brideName, date: new Date().toISOString() }); setCollectModal(null);
            }} className="space-y-6"><div className="bg-slate-950 p-6 rounded-3xl border border-white/5 text-center"><p className="text-xs text-slate-500 font-black mb-2 uppercase">المتبقي: {formatCurrency(collectModal.remainingFromBride)}</p><input name="amount" type="number" defaultValue={collectModal.remainingFromBride} className={INPUT_CLASS + " text-center text-xl font-black"} required /></div><button className={BTN_PRIMARY}>تأكيد التسليم</button></form></Modal>)}
            {measurementsModal && <MeasurementsModal title={`مقاسات العروس: ${measurementsModal.brideName}`} data={measurementsModal} onSave={m => {onUpdate(measurementsModal.id, {measurements: m}); setMeasurementsModal(null);}} onClose={()=>setMeasurementsModal(null)} />}
        </div>
    );
};

const CustomerManager = ({ bookings, orders }: any) => {
    const [search, setSearch] = useState('');
    const customers = useMemo(() => {
        const map = new Map();
        bookings.forEach((b:any) => map.set(b.customerPhone, { name: b.customerName, phone: b.customerPhone, type: 'إيجار', date: b.createdAt }));
        orders.forEach((o:any) => map.set(o.bridePhone, { name: o.brideName, phone: o.bridePhone, type: 'بيع', date: o.createdAt }));
        return Array.from(map.values()).filter(c => c.name.includes(search) || c.phone.includes(search));
    }, [bookings, orders, search]);
    return (<div className="space-y-6 animate-fade-in"><h3 className="text-3xl font-black text-white px-2">سجل العملاء</h3><div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/><input placeholder="بحث..." className={INPUT_CLASS + " pr-14 h-16"} onChange={e=>setSearch(e.target.value)} /></div>
            <div className="grid gap-4">{customers.map(c => (<div key={c.phone} className={CARD_CLASS}><div className="flex justify-between items-center"><div><h4 className="font-black text-white text-xl">{c.name}</h4><p className="text-sm text-brand-400 font-bold">{c.phone}</p></div><div className="text-left"><span className={BADGE_CLASS + " border-brand-500/20 text-brand-300"}>{c.type}</span><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">{formatDate(c.date)}</p></div></div></div>))}</div></div>);
};

const LogManager = ({ logs }: any) => (
    <div className="space-y-6 animate-fade-in"><h3 className="text-3xl font-black text-white px-2">سجل الحركة</h3><div className={CARD_CLASS}><div className="divide-y divide-white/5">{logs.sort((a:any,b:any)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime()).map((l:any)=>(<div key={l.id} className="py-6 flex justify-between items-start gap-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><Clock size={16}/></div><div><p className="text-sm font-black text-white">{l.action}</p><p className="text-[10px] text-slate-500">{l.username} • {formatDate(l.timestamp)}</p></div></div><p className="text-[10px] text-brand-400 font-bold flex-1 text-left">{l.details}</p></div>))}</div></div></div>
);

const SettingsManager = ({ user, users, onUpdate, onAdd, onDelete, resetSystem }: any) => {
    const [userModal, setUserModal] = useState<any>(null);
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
    const isAdmin = user.role === UserRole.ADMIN;
    return (<div className="space-y-8 animate-fade-in"><h3 className="text-3xl font-black text-white px-2">الإعدادات</h3>
        <div className={CARD_CLASS}><div className="flex items-center gap-5 mb-8"><div className="w-20 h-20 bg-brand-500/10 rounded-3xl flex items-center justify-center text-brand-400"><User size={40}/></div><div><h4 className="text-2xl font-black text-white">{user.name}</h4><p className="text-sm text-slate-500 font-bold">@{user.username} • {user.role}</p></div></div><button onClick={()=>setUserModal(user)} className={BTN_PRIMARY + " bg-slate-800 hover:bg-slate-750"}><Key size={20}/> تغيير كلمة المرور</button></div>
        {isAdmin && (<div className="space-y-4"><div className="flex justify-between items-center px-4"><h4 className="text-xl font-black text-white">إدارة الموظفين والصلاحيات</h4><button onClick={()=>{setUserModal({}); setSelectedPerms([])}} className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl hover:bg-brand-500/20"><UserPlus size={24}/></button></div><div className="grid gap-4">{users.map((u:any)=>(<div key={u.id} className={CARD_CLASS + " p-6"}><div className="flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400"><User size={24}/></div><div><p className="font-black text-white">{u.name}</p><p className="text-xs text-slate-500 mt-0.5">@{u.username} • {u.permissions.includes('ALL') ? 'كامل الصلاحيات' : `${u.permissions.length} صلاحيات`}</p></div></div><div className="flex gap-2"><button onClick={()=>{setUserModal(u); setSelectedPerms(u.permissions)}} className="p-3 text-slate-400 hover:text-brand-400"><Edit size={20}/></button>{u.id !== user.id && <button onClick={()=>{if(confirm('حذف الموظف؟')){onDelete(u.id);}}} className="p-3 text-slate-400 hover:text-red-400"><Trash2 size={20}/></button>}</div></div></div>))}</div><div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[3rem] space-y-4"><h4 className="text-red-400 font-black">إعادة ضبط المصنع</h4><button onClick={()=>{if(confirm('سيتم حذف كافة الداتا! هل أنت متأكد؟')){resetSystem();}}} className="w-full py-4 border-2 border-red-500/20 text-red-500 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all text-xs">حذف كافة البيانات السحابية</button></div></div>)}
        {userModal && (<Modal title={userModal.id ? `تعديل الموظف: ${userModal.name}` : 'إضافة موظف جديد'} onClose={()=>setUserModal(null)} size="lg"><form onSubmit={async (e:any)=>{
                e.preventDefault(); const fd = new FormData(e.target); const data = { name: fd.get('name'), username: fd.get('user'), password: fd.get('pass') || '123', permissions: isAdmin ? selectedPerms : userModal.permissions, firstLogin: !userModal.id };
                if(userModal.id) await onUpdate(userModal.id, data); else await onAdd({ ...data, role: UserRole.EMPLOYEE }); setUserModal(null);
            }} className="space-y-6"><div className="grid grid-cols-2 gap-4"><input name="name" defaultValue={userModal.name} placeholder="الاسم" className={INPUT_CLASS} required /><input name="user" defaultValue={userModal.username} placeholder="اسم المستخدم" className={INPUT_CLASS} required /></div><input name="pass" type="password" placeholder={userModal.id ? "كلمة المرور الجديدة" : "كلمة المرور (123)"} className={INPUT_CLASS} />
                {isAdmin && (<div className="space-y-4"><p className="text-xs font-black text-slate-500 uppercase px-2">تخصيص الصلاحيات:</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-5 bg-slate-950 rounded-3xl border border-white/5">{PERMISSIONS_LIST.map(p => (<label key={p.id} className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl cursor-pointer hover:bg-slate-800"><input type="checkbox" className="w-6 h-6 accent-brand-500" checked={selectedPerms.includes(p.id)} onChange={e=>e.target.checked ? setSelectedPerms([...selectedPerms, p.id]) : setSelectedPerms(selectedPerms.filter(x=>x!==p.id))} /><span className="text-sm text-white font-bold">{p.label}</span></label>))}</div></div>)}<button className={BTN_PRIMARY}>{userModal.id ? 'حفظ' : 'إضافة'}</button></form></Modal>)}
    </div>);
};

// --- Main App ---
export default function App() {
    const [user, setUser] = useState<UserType|null>(null);
    const [tab, setTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [dresses, setDresses] = useState<Dress[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [finance, setFinance] = useState<FinanceRecord[]>([]);
    const [orders, setOrders] = useState<SaleOrder[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        const unsubs = [
            cloudDb.subscribe(COLLS.DRESSES, setDresses), cloudDb.subscribe(COLLS.BOOKINGS, setBookings), 
            cloudDb.subscribe(COLLS.FINANCE, setFinance), cloudDb.subscribe(COLLS.SALES, setOrders), 
            cloudDb.subscribe(COLLS.USERS, setUsers), cloudDb.subscribe(COLLS.LOGS, setLogs)
        ];
        setTimeout(() => setLoading(false), 1200); return () => unsubs.forEach(u => u());
    }, []);

    const addLog = (action: string, details: string) => {
        if(user) cloudDb.add(COLLS.LOGS, { action, userId: user.id, username: user.name, timestamp: new Date().toISOString(), details });
    };

    const resetSystem = async () => {
        const allColls = [COLLS.DRESSES, COLLS.BOOKINGS, COLLS.SALES, COLLS.FINANCE, COLLS.CUSTOMERS, COLLS.LOGS];
        for(const c of allColls){
            const data = await new Promise<any[]>((resolve) => {
                const unsub = cloudDb.subscribe(c, (d) => { resolve(d); unsub(); });
            });
            for(const item of data) await cloudDb.delete(c, item.id);
        }
        alert('تم تصفير النظام بنجاح.'); window.location.reload();
    };

    const can = (perm: string) => {
        if (!user) return false;
        if (user.permissions.includes('ALL')) return true;
        return user.permissions.includes(perm);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 font-black text-brand-500 tracking-widest text-xs animate-pulse">إيلاف سحابي v4.5</div>;

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-white/5 p-12 rounded-[4rem] shadow-2xl relative">
                <div className="text-center mb-10"><div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl overflow-hidden p-2"><img src="/logo.png" alt="لوقو" className="w-full h-full object-contain" onError={e => {(e.currentTarget as any).style.display='none'; (e.currentTarget as any).parentElement.innerHTML='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d946ef" stroke-width="2.5"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>';}} /></div><h1 className="text-2xl font-black text-white">تسجيل الدخول</h1></div>
                <form onSubmit={e=>{
                    e.preventDefault(); const fd = new FormData(e.currentTarget); const u = users.find(x => x.username.toLowerCase() === fd.get('u')?.toString().toLowerCase() && x.password === fd.get('p'));
                    if(u) { setUser(u); addLog('دخول', `قام الموظف ${u.name} بتسجيل الدخول`); } else alert('خطأ!');
                }} className="space-y-4"><input name="u" placeholder="اسم المستخدم" className={INPUT_CLASS} required /><input name="p" type="password" placeholder="كلمة المرور" className={INPUT_CLASS} required /><button className={BTN_PRIMARY}>دخول</button></form>
            </div>
        </div>
    );

    const renderContent = () => {
        if(user?.firstLogin && tab !== 'settings') return <div className="p-12 text-center"><Lock size={64} className="mx-auto text-brand-500 mb-6"/><h3 className="text-2xl font-black text-white mb-8">يجب تغيير كلمة المرور أولاً</h3><button onClick={()=>setTab('settings')} className={BTN_PRIMARY}>الإعدادات</button></div>;
        switch(tab) {
            case 'home': return can('view_home') ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className={CARD_CLASS + " p-8 text-center"}><Shirt className="mx-auto text-brand-400 mb-2"/><p className="text-[10px] font-black text-slate-500">الفساتين</p><p className="text-2xl font-black text-white">{dresses.length}</p></div><div className={CARD_CLASS + " p-8 text-center"}><Calendar className="mx-auto text-emerald-400 mb-2"/><p className="text-[10px] font-black text-slate-500">الحجوزات</p><p className="text-2xl font-black text-white">{bookings.length}</p></div><div className={CARD_CLASS + " p-8 text-center"}><ShoppingBag className="mx-auto text-blue-400 mb-2"/><p className="text-[10px] font-black text-slate-500">المبيعات</p><p className="text-2xl font-black text-white">{orders.length}</p></div><div className={CARD_CLASS + " p-8 text-center"}><Users className="mx-auto text-orange-400 mb-2"/><p className="text-[10px] font-black text-slate-500">العملاء</p><p className="text-2xl font-black text-white">{users.length}</p></div></div> : null;
            case 'finance': return can('view_finance') ? <FinanceManager finance={finance} users={users} dresses={dresses} onAdd={f=>{cloudDb.add(COLLS.FINANCE, f); addLog('مالية', `إضافة ${f.category} بقيمة ${f.amount}`);}} /> : null;
            case 'dresses_sale': return can('view_dresses_sale') ? <SalesManager orders={orders} onAdd={o=>{cloudDb.add(COLLS.SALES, o); addLog('مبيعات', `طلب تفصيل لـ ${o.brideName}`);}} onUpdate={(id, d)=>{cloudDb.update(COLLS.SALES, id, d); addLog('مبيعات', `تحديث طلب ${id}`);}} onFinanceAdd={f=>{cloudDb.add(COLLS.FINANCE, f); addLog('مالية', `دفع مبيعات: ${f.amount}`);}} /> : null;
            case 'customers': return can('view_customers') ? <CustomerManager bookings={bookings} orders={orders} /> : null;
            case 'logs': return can('view_logs') ? <LogManager logs={logs} /> : null;
            case 'settings': return <SettingsManager user={user} users={users} onAdd={u=>{cloudDb.add(COLLS.USERS, u); addLog('إعدادات', `إضافة موظف ${u.name}`);}} onUpdate={(id, d)=>{cloudDb.update(COLLS.USERS, id, { ...d, firstLogin: d.password==='123' ? true : false }); addLog('إعدادات', `تحديث بيانات ${id}`);}} onDelete={id=>{cloudDb.delete(COLLS.USERS, id); addLog('إعدادات', `حذف موظف ${id}`);}} resetSystem={resetSystem} />;
            case 'dresses_rent': return can('view_dresses_rent') ? <RentalManager dresses={dresses} onAdd={d=>{cloudDb.add(COLLS.DRESSES, d); addLog('إيجار', `إضافة فستان ${d.name}`);}} onUpdate={(id, d)=>{cloudDb.update(COLLS.DRESSES, id, d); addLog('إيجار', `تحديث حالة فستان ${id}`);}} /> : null;
            case 'bookings': return can('view_bookings') ? <BookingManager bookings={bookings} dresses={dresses} onAdd={b=>{cloudDb.add(COLLS.BOOKINGS, b); addLog('حجوزات', `حجز لـ ${b.customerName}`);}} onDelete={id=>{if(confirm('حذف الحجز؟')){cloudDb.delete(COLLS.BOOKINGS, id); addLog('حجوزات', `حذف حجز ${id}`);}}} onFinanceAdd={f=>{cloudDb.add(COLLS.FINANCE, f); addLog('مالية', `عربون حجز: ${f.amount}`);}} /> : null;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
            <header className="fixed top-0 inset-x-0 h-20 bg-slate-900/60 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-8 z-[60]"><div className="flex items-center gap-4 font-black text-xl"><Shirt size={22} className="text-brand-500"/> إيلاف</div><button onClick={()=>setUser(null)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"><LogOut size={18}/></button></header>
            <main className="flex-1 overflow-y-auto pt-28 pb-32 px-6 max-w-5xl mx-auto w-full">{renderContent()}</main>
            <nav className="fixed bottom-0 inset-x-0 h-20 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center z-[60]"><button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1.5 flex-1 ${tab==='home'?'text-brand-500':'text-slate-500'}`}><Home size={22}/><span className="text-[9px] font-black uppercase">الرئيسية</span></button><button onClick={()=>setTab('dresses_rent')} className={`flex flex-col items-center gap-1.5 flex-1 ${tab==='dresses_rent'?'text-brand-500':'text-slate-500'}`}><Shirt size={22}/><span className="text-[9px] font-black uppercase">الإيجار</span></button><button onClick={()=>setTab('finance')} className={`flex flex-col items-center gap-1.5 flex-1 ${tab==='finance'?'text-brand-500':'text-slate-500'}`}><DollarSign size={22}/><span className="text-[9px] font-black uppercase">المالية</span></button><button onClick={()=>setMenuOpen(true)} className="flex flex-col items-center gap-1.5 flex-1 text-slate-500"><MoreHorizontal size={22}/><span className="text-[9px] font-black uppercase">المزيد</span></button></nav>
            {isMenuOpen && (<div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl p-10 flex flex-col"><div className="flex justify-between items-center mb-12"><h3 className="text-4xl font-black text-white">الأقسام</h3><button onClick={()=>setMenuOpen(false)} className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-white"><X size={32}/></button></div><div className="grid grid-cols-2 gap-6">{NAV_ITEMS.filter(n=>['bookings','dresses_sale','customers','logs','settings','factory','delivery'].includes(n.id)).map(n => <button key={n.id} onClick={()=>{setTab(n.id); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] flex flex-col items-center gap-4 hover:bg-brand-500/10 transition-all"><span className="text-brand-400">{n.id==='bookings'?<Calendar size={32}/>:n.id==='dresses_sale'?<ShoppingBag size={32}/>:n.id==='customers'?<Users size={32}/>:n.id==='logs'?<FileText size={32}/>:n.id==='factory'?<Factory size={32}/>:n.id==='delivery'?<Truck size={32}/>:<Settings size={32}/>}</span><span className="text-xs font-black">{n.label}</span></button>)}</div></div>)}
        </div>
    );
}

const RentalManager = ({ dresses, onAdd, onUpdate }: any) => {
    const [view, setView] = useState<'STOCK'|'CLEANING'>('STOCK');
    const [isModal, setModal] = useState(false);
    return (<div className="space-y-6">
        <div className="flex justify-between items-center px-2"><h3 className="text-3xl font-black text-white">فساتين الإيجار</h3><button onClick={()=>setModal(true)} className="p-3 bg-brand-600 text-white rounded-2xl shadow-xl"><Plus size={24}/></button></div>
        <div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-white/5"><button onClick={()=>setView('STOCK')} className={`flex-1 py-3 rounded-2xl text-xs font-black ${view==='STOCK'?'bg-brand-600 text-white':'text-slate-500'}`}>المخزون</button><button onClick={()=>setView('CLEANING')} className={`flex-1 py-3 rounded-2xl text-xs font-black ${view==='CLEANING'?'bg-brand-600 text-white':'text-slate-500'}`}>المغسلة</button></div>
        <div className="grid md:grid-cols-2 gap-4">{dresses.filter((d:any)=>view==='CLEANING'?d.status===DressStatus.CLEANING:d.status!==DressStatus.ARCHIVED).map((d:any)=>(<div key={d.id} className={CARD_CLASS}><div className="flex gap-4"><div className="w-20 h-24 bg-slate-800 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-700"><Shirt size={24}/></div><div className="flex-1"><h4 className="font-black text-white text-lg">{d.name}</h4><span className={BADGE_CLASS + " " + getStatusColor(d.status)}>{d.status}</span><div className="flex gap-2 mt-4">{d.status!=='CLEANING' && <button onClick={()=>onUpdate(d.id, {status: DressStatus.CLEANING})} className="flex-1 py-2 bg-orange-600/10 text-orange-400 rounded-xl text-[10px] font-black">مغسلة</button>}{d.status==='CLEANING' && <button onClick={()=>onUpdate(d.id, {status: DressStatus.AVAILABLE})} className="w-full py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[10px] font-black">جاهز</button>}<button onClick={()=>{if(confirm('أرشفة؟')){onUpdate(d.id, {status: DressStatus.ARCHIVED});}}} className="p-2 text-slate-500 hover:text-red-400"><Archive size={16}/></button></div></div></div></div>))}</div>
        {isModal && (<Modal title="إضافة فستان" onClose={()=>setModal(false)}><form onSubmit={async e=>{e.preventDefault(); const fd = new FormData(e.currentTarget); onAdd({name: fd.get('n'), type: DressType.RENT, status: DressStatus.AVAILABLE, createdAt: new Date().toISOString()}); setModal(false);}} className="space-y-4"><input name="n" placeholder="الاسم" className={INPUT_CLASS} required /><button className={BTN_PRIMARY}>حفظ</button></form></Modal>)}
    </div>);
};

const BookingManager = ({ bookings, dresses, onAdd, onDelete, onFinanceAdd }: any) => {
    const [isModal, setModal] = useState(false);
    const [measurementsModal, setMeasurementsModal] = useState<any>(null);
    return (<div className="space-y-6">
        <h3 className="text-3xl font-black text-white px-2">حجوزات الإيجار</h3>
        <button onClick={()=>setModal(true)} className={BTN_PRIMARY + " h-16 text-lg"}><Plus size={24}/> حجز جديد</button>
        <div className="grid gap-4">{bookings.filter((b:any)=>b.status===BookingStatus.PENDING).map((b:any)=>(<div key={b.id} className={CARD_CLASS}><div className="flex justify-between items-start mb-4"><div><h4 className="font-black text-white text-xl">{b.customerName}</h4><p className="text-xs text-brand-400 font-bold">{b.customerPhone}</p></div><span className={BADGE_CLASS + " border-brand-500/20 text-brand-400"}>{b.status}</span></div><div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 mb-4 text-center"><p className="text-[10px] text-slate-500 font-black uppercase">الفستان: {b.dressName}</p><p className="text-sm font-black text-brand-300">{formatDate(b.eventDate)}</p></div><div className="flex justify-between items-center"><button onClick={()=>setMeasurementsModal(b)} className="p-2 bg-slate-800 text-brand-400 rounded-xl hover:bg-brand-600 hover:text-white transition-all"><Ruler size={18}/></button><button onClick={()=>{if(confirm('حذف الحجز؟')){onDelete(b.id);}}} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={18}/></button></div></div>))}</div>
        {isModal && (<Modal title="حجز جديد" onClose={()=>setModal(false)}><form onSubmit={async e=>{e.preventDefault(); const fd = new FormData(e.currentTarget); const dr = dresses.find((d:any)=>d.id===fd.get('dr')); const p = Number(fd.get('p')); const d = Number(fd.get('d')); onAdd({customerName: fd.get('n'), customerPhone: fd.get('ph'), dressId: dr.id, dressName: dr.name, eventDate: fd.get('date'), agreedRentalPrice: p, paidDeposit: d, remainingToPay: p-d, status: BookingStatus.PENDING, createdAt: new Date().toISOString()}); if(d>0) onFinanceAdd({amount: d, type: 'INCOME', category: 'عربون حجز', targetName: fd.get('n'), date: new Date().toISOString()}); setModal(false);}} className="space-y-4"><div className="grid grid-cols-2 gap-4"><input name="n" placeholder="الاسم" className={INPUT_CLASS} required /><input name="ph" placeholder="الهاتف" className={INPUT_CLASS} required /></div><select name="dr" className={INPUT_CLASS} required><option value="">اختر الفستان...</option>{dresses.filter((d:any)=>d.status===DressStatus.AVAILABLE).map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select><div className="grid grid-cols-2 gap-4"><input name="p" type="number" placeholder="السعر" className={INPUT_CLASS} required /><input name="d" type="number" placeholder="العربون" className={INPUT_CLASS} required /></div><input name="date" type="date" className={INPUT_CLASS} required /><button className={BTN_PRIMARY}>تثبيت</button></form></Modal>)}
        {measurementsModal && <MeasurementsModal title={`مقاسات العروس: ${measurementsModal.customerName}`} data={measurementsModal} onSave={(m:any) => {cloudDb.update(COLLS.BOOKINGS, measurementsModal.id, {measurements: m}); setMeasurementsModal(null);}} onClose={()=>setMeasurementsModal(null)} />}
    </div>);
};
