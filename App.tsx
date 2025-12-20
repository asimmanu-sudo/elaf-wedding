
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
    FinanceRecord, SaleOrder, AuditLog
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Global Styles & Helpers ---
const INPUT_CLASS = "w-full bg-slate-900/50 text-white border border-slate-700/50 rounded-2xl p-4 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder-slate-600 text-sm";
const BTN_PRIMARY = "w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand-900/20 flex justify-center items-center gap-2 active:scale-[0.98] transition-all text-sm disabled:opacity-50";
const CARD_CLASS = "bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden group hover:border-white/10 transition-all";
const BADGE_CLASS = "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-flex items-center justify-center gap-1.5";

const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val || 0);

const getStatusColor = (status: string) => {
    switch(status) {
        case DressStatus.AVAILABLE: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case DressStatus.RENTED: return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
        case DressStatus.CLEANING: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        case BookingStatus.ACTIVE: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case SaleStatus.DESIGNING: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case SaleStatus.READY: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
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

// --- Component Managers ---

const FactoryManager = ({ orders, onUpdate, onFinanceAdd }: any) => {
    const [search, setSearch] = useState('');
    const [view, setView] = useState<'PENDING' | 'COMPLETED'>('PENDING');
    const [modalType, setModalType] = useState<'DEPOSIT' | 'SETTLEMENT' | null>(null);
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
    const [paymentValues, setPaymentValues] = useState<Record<string, number>>({});

    const filtered = useMemo(() => {
        return orders.filter((o: any) => {
            const matchesSearch = o.factoryCode?.toLowerCase().includes(search.toLowerCase());
            const matchesView = view === 'COMPLETED' ? o.factoryStatus === FactoryPaymentStatus.PAID : o.factoryStatus !== FactoryPaymentStatus.PAID;
            return matchesSearch && matchesView;
        });
    }, [orders, search, view]);

    const totalInModal = useMemo(() => {
        return Object.entries(selectedIds)
            .filter(([_, isSelected]) => isSelected)
            .reduce((sum, [id, _]) => sum + (paymentValues[id] || 0), 0);
    }, [selectedIds, paymentValues]);

    const handleConfirmPayment = async () => {
        const entries = Object.entries(selectedIds).filter(([_, isSelected]) => isSelected);
        for (const [id, _] of entries) {
            const order = orders.find((o: any) => o.id === id);
            const payAmount = paymentValues[id] || 0;
            if (payAmount <= 0) continue;

            const newPaid = (order.factoryDepositPaid || 0) + payAmount;
            const newStatus = newPaid >= order.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL;

            await onUpdate(id, { 
                factoryDepositPaid: newPaid, 
                factoryStatus: newStatus 
            });

            await onFinanceAdd({
                amount: payAmount,
                type: 'EXPENSE',
                category: 'سداد مصنع',
                targetName: `كود ${order.factoryCode}`,
                date: new Date().toISOString()
            });
        }
        setModalType(null);
        setSelectedIds({});
        setPaymentValues({});
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-3xl font-black text-white">إدارة تعاملات المصنع</h3>
                <div className="flex gap-2 p-1 bg-slate-900 border border-white/5 rounded-2xl">
                    <button onClick={() => setView('PENDING')} className={`px-5 py-2 rounded-xl text-xs font-black ${view === 'PENDING' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>المستحقات</button>
                    <button onClick={() => setView('COMPLETED')} className={`px-5 py-2 rounded-xl text-xs font-black ${view === 'COMPLETED' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>المدفوع بالكامل</button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                <input 
                    placeholder="بحث بكود الفستان..." 
                    className={INPUT_CLASS + " pr-14 h-16"} 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>

            {view === 'PENDING' && (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setModalType('DEPOSIT'); setSelectedIds({}); setPaymentValues({}); }} className="flex items-center justify-center gap-2 py-4 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl font-black text-sm hover:bg-emerald-600 hover:text-white transition-all">
                        <DollarSign size={18}/> دفع عربون متعدد
                    </button>
                    <button onClick={() => { setModalType('SETTLEMENT'); setSelectedIds({}); setPaymentValues({}); }} className="flex items-center justify-center gap-2 py-4 bg-brand-600/10 text-brand-400 border border-brand-500/20 rounded-2xl font-black text-sm hover:bg-brand-600 hover:text-white transition-all">
                        <CheckSquare size={18}/> تصفية حساب متعدد
                    </button>
                </div>
            )}

            <div className="overflow-x-auto bg-slate-900/50 border border-white/5 rounded-[2.5rem] shadow-sm">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="bg-slate-950/40 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                            <th className="p-5">كود المصنع</th>
                            <th className="p-5">العروس</th>
                            <th className="p-5 text-center">التكلفة</th>
                            <th className="p-5 text-center">المدفوع</th>
                            <th className="p-5 text-center">المتبقي</th>
                            <th className="p-5 text-center">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.length > 0 ? filtered.map((o: any) => (
                            <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 font-black text-white text-sm tracking-widest">{o.factoryCode}</td>
                                <td className="p-5 text-slate-400 text-sm">{o.brideName}</td>
                                <td className="p-5 text-center text-white font-bold">{formatCurrency(o.factoryPrice)}</td>
                                <td className="p-5 text-center text-emerald-400 font-bold">{formatCurrency(o.factoryDepositPaid)}</td>
                                <td className="p-5 text-center text-red-400 font-black">{formatCurrency(o.factoryPrice - (o.factoryDepositPaid || 0))}</td>
                                <td className="p-5 text-center">
                                    <span className={BADGE_CLASS + " " + (o.factoryStatus === FactoryPaymentStatus.PAID ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20')}>
                                        {o.factoryStatus}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-500 italic">لا توجد بيانات متاحة</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalType && (
                <Modal title={modalType === 'DEPOSIT' ? 'دفع عربون للمصنع' : 'تصفية حساب للمصنع'} onClose={() => setModalType(null)} size="lg">
                    <div className="space-y-6">
                        <div className="max-h-96 overflow-y-auto space-y-3 p-2">
                            {orders.filter((o: any) => o.factoryStatus !== FactoryPaymentStatus.PAID).map((o: any) => (
                                <div key={o.id} className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center gap-4 ${selectedIds[o.id] ? 'bg-brand-600/10 border-brand-500' : 'bg-slate-950/50 border-white/5'}`}
                                     onClick={() => {
                                         const newState = !selectedIds[o.id];
                                         setSelectedIds({ ...selectedIds, [o.id]: newState });
                                         if (modalType === 'SETTLEMENT' && newState) {
                                             setPaymentValues(prev => ({ ...prev, [o.id]: o.factoryPrice - (o.factoryDepositPaid || 0) }));
                                         }
                                     }}>
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${selectedIds[o.id] ? 'bg-brand-500 border-brand-500' : 'border-slate-700'}`}>
                                        {selectedIds[o.id] && <Check size={14} className="text-white"/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-black text-white text-sm">{o.factoryCode} - {o.brideName}</p>
                                            <p className="text-xs text-slate-500">المتبقي: {formatCurrency(o.factoryPrice - (o.factoryDepositPaid || 0))}</p>
                                        </div>
                                        {selectedIds[o.id] && modalType === 'DEPOSIT' && (
                                            <div onClick={e => e.stopPropagation()} className="mt-2">
                                                <input 
                                                    type="number" 
                                                    placeholder="قيمة العربون..." 
                                                    className={INPUT_CLASS + " h-10 py-1 text-xs"}
                                                    value={paymentValues[o.id] || ''}
                                                    onChange={e => setPaymentValues({ ...paymentValues, [o.id]: Number(e.target.value) })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-950 p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-500">إجمالي المبلغ المدفوع:</span>
                            <span className="text-2xl font-black text-brand-400">{formatCurrency(totalInModal)}</span>
                        </div>
                        <button onClick={handleConfirmPayment} disabled={totalInModal <= 0} className={BTN_PRIMARY}>
                            <Check size={20}/> تأكيد الدفع وتسجيل المصروفات
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

const RentalManager = ({ dresses, onAdd, onUpdate }: any) => {
    const [view, setView] = useState<'STOCK'|'CLEANING'|'ARCHIVE'>('STOCK');
    const [isModal, setModal] = useState(false);
    
    // تعديل المنطق لعدم إخفاء فساتين المغسلة من المخزون
    const filtered = dresses.filter((d:any) => {
        if(view === 'CLEANING') return d.status === DressStatus.CLEANING;
        if(view === 'ARCHIVE') return d.status === DressStatus.ARCHIVED;
        // في عرض المخزون، تظهر الفساتين المتاحة والمؤجرة والتي في المغسلة (أي شيء غير مؤرشف)
        return d.status !== DressStatus.ARCHIVED;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-3xl font-black text-white">إدارة فساتين الإيجار</h3>
                <button onClick={()=>setModal(true)} className="p-3 bg-brand-600 text-white rounded-2xl shadow-xl hover:bg-brand-700 transition-all"><Plus size={24}/></button>
            </div>
            <div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-white/5 overflow-x-auto no-scrollbar">
                {['STOCK', 'CLEANING', 'ARCHIVE'].map((v:any) => (
                    <button key={v} onClick={()=>setView(v)} className={`flex-none px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${view===v?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>
                        {v === 'STOCK' ? 'المخزون' : v === 'CLEANING' ? 'سجل المغسلة' : 'الأرشيف'}
                    </button>
                ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                {filtered.map((d:any) => (
                    <div key={d.id} className={CARD_CLASS}>
                        <div className="flex gap-4">
                            <div className="w-24 h-32 bg-slate-800 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5">
                                <Shirt size={32} className="text-slate-700"/>
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div><h4 className="font-black text-white text-lg tracking-tight">{d.name}</h4><span className={BADGE_CLASS + " " + getStatusColor(d.status)}>{d.status}</span></div>
                                <div className="flex gap-2">
                                    {d.status !== DressStatus.CLEANING && d.status !== DressStatus.ARCHIVED && (
                                        <button onClick={()=>onUpdate(d.id, {status: DressStatus.CLEANING})} className="flex-1 py-2 bg-orange-600/10 text-orange-400 rounded-xl text-[10px] font-black hover:bg-orange-600 hover:text-white transition-all">إرسال للمغسلة</button>
                                    )}
                                    {d.status === DressStatus.CLEANING && (
                                        <button onClick={()=>onUpdate(d.id, {status: DressStatus.AVAILABLE})} className="w-full py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all">تم التنظيف (جاهز)</button>
                                    )}
                                    <button onClick={()=>onUpdate(d.id, {status: view === 'ARCHIVE' ? DressStatus.AVAILABLE : DressStatus.ARCHIVED})} className="p-2 text-slate-500 hover:text-red-400 transition-all">{view === 'ARCHIVE' ? <RotateCcw size={16}/> : <Archive size={16}/>}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModal && (
                <Modal title="إضافة فستان إيجار" onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault(); const fd = new FormData(e.target);
                        await onAdd({ name: fd.get('name'), style: fd.get('style'), factoryPrice: Number(fd.get('fPrice')), rentalPrice: Number(fd.get('rPrice')), status: DressStatus.AVAILABLE, createdAt: new Date().toISOString() });
                        setModal(false);
                    }} className="space-y-4">
                        <input name="name" placeholder="اسم الفستان" className={INPUT_CLASS} required />
                        <input name="style" placeholder="الموديل" className={INPUT_CLASS} required />
                        <div className="grid grid-cols-2 gap-4"><input name="fPrice" type="number" placeholder="تكلفة المصنع" className={INPUT_CLASS} required /><input name="rPrice" type="number" placeholder="سعر الإيجار" className={INPUT_CLASS} required /></div>
                        <button className={BTN_PRIMARY}>حفظ الفستان</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const SalesManager = ({ orders, onAdd, onUpdate, onFinanceAdd }: any) => {
    const [isModal, setModal] = useState(false);
    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-3xl font-black text-white px-2">إدارة فساتين البيع (التفصيل)</h3>
            <button onClick={()=>setModal(true)} className={BTN_PRIMARY + " h-16 text-lg"}><Plus size={24}/> طلب تفصيل جديد</button>
            <div className="grid gap-4">
                {orders.map((o:any)=>(
                    <div key={o.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="font-black text-white text-xl">{o.brideName}</h4><p className="text-sm text-brand-400 font-bold mt-1 tracking-wider">{o.bridePhone}</p></div>
                            <span className={BADGE_CLASS + " " + getStatusColor(o.status)}>{o.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5"><p className="text-[10px] text-slate-500 font-black uppercase">كود المصنع</p><p className="text-sm font-black text-white tracking-widest">{o.factoryCode}</p></div>
                            <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5"><p className="text-[10px] text-slate-500 font-black uppercase">موعد التسليم</p><p className="text-sm font-black text-brand-300">{formatDate(o.expectedDeliveryDate)}</p></div>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-lg font-black text-white">{formatCurrency(o.sellPrice)}</p>
                            <div className="flex gap-2">
                                {o.status === SaleStatus.DESIGNING && <button onClick={()=>onUpdate(o.id, {status: SaleStatus.READY})} className="p-2 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black">جاهز للاستلام</button>}
                                {o.status === SaleStatus.READY && <button onClick={async ()=>{
                                    if(confirm('تأكيد تسليم الفستان للعروس وتحصيل المتبقي؟')) {
                                        await onUpdate(o.id, {status: SaleStatus.DELIVERED, remainingFromBride: 0});
                                        if(o.remainingFromBride > 0) await onFinanceAdd({ amount: o.remainingFromBride, type: 'INCOME', category: `تحصيل نهائي مبيعات - ${o.brideName}`, targetName: o.brideName, date: new Date().toISOString() });
                                    }
                                }} className="p-2 bg-brand-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-brand-900/20">تسليم نهائي</button>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModal && (
                <Modal title="طلب تفصيل جديد" onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault(); const fd = new FormData(e.target);
                        const sPrice = Number(fd.get('sPrice')); const dep = Number(fd.get('deposit'));
                        await onAdd({
                            brideName: fd.get('name'), bridePhone: fd.get('phone'), factoryCode: fd.get('code'),
                            factoryPrice: Number(fd.get('fPrice')), sellPrice: sPrice, deposit: dep, remainingFromBride: sPrice - dep,
                            expectedDeliveryDate: fd.get('date'), status: SaleStatus.DESIGNING, factoryStatus: FactoryPaymentStatus.UNPAID,
                            factoryDepositPaid: 0, orderDate: new Date().toISOString()
                        });
                        if(dep > 0) await onFinanceAdd({ amount: dep, type: 'INCOME', category: 'عربون مبيعات (تفصيل)', targetName: fd.get('name'), date: new Date().toISOString() });
                        setModal(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4"><input name="name" placeholder="اسم العروس" className={INPUT_CLASS} required /><input name="phone" placeholder="رقم الهاتف" className={INPUT_CLASS} required /></div>
                        <input name="code" placeholder="كود الفستان بالمصنع" className={INPUT_CLASS} required />
                        <div className="grid grid-cols-3 gap-3">
                            <input name="fPrice" type="number" placeholder="تكلفة المصنع" className={INPUT_CLASS} required />
                            <input name="sPrice" type="number" placeholder="سعر البيع" className={INPUT_CLASS} required />
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

const BookingManager = ({ bookings, dresses, onAdd, onDelete, onFinanceAdd }: any) => {
    const [isModal, setModal] = useState(false);
    const [viewMeasurements, setViewMeasurements] = useState<any>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-3xl font-black text-white px-2">إدارة حجوزات الإيجار</h3>
            <button onClick={()=>setModal(true)} className={BTN_PRIMARY + " h-16 text-lg"}><Plus size={24}/> حجز جديد</button>
            <div className="grid gap-4">
                {bookings.filter((b:any)=>b.status === BookingStatus.PENDING).map((b:any)=>(
                    <div key={b.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="font-black text-white text-xl">{b.customerName}</h4><p className="text-sm text-brand-400 font-bold mt-1 tracking-wider">{b.customerPhone}</p></div>
                            <span className={BADGE_CLASS + " border-brand-500/20 text-brand-400"}>{b.status}</span>
                        </div>
                        <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 flex justify-between items-center mb-4">
                            <div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">الفستان</p><p className="text-sm font-bold text-white">{b.dressName}</p></div>
                            <div className="text-left"><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">المناسبة</p><p className="text-sm font-black text-brand-300">{formatDate(b.eventDate)}</p></div>
                        </div>
                        {b.notes && (
                            <div className="mb-4 p-3 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-[11px] text-brand-200 italic">
                                <strong>ملحوظة التعديلات:</strong> {b.notes}
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                                <p className="text-lg font-black text-white">{formatCurrency(b.agreedRentalPrice)}</p>
                                <button onClick={()=>setViewMeasurements(b)} title="مشاهدة المقاسات" className="p-2 bg-slate-800 text-brand-400 rounded-xl hover:bg-brand-600 hover:text-white transition-all"><Ruler size={18}/></button>
                            </div>
                            <button onClick={()=>confirm('حذف الحجز؟') && onDelete(b.id)} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={20}/></button>
                        </div>
                    </div>
                ))}
            </div>
            
            {viewMeasurements && (
                <Modal title={`مقاسات العروس: ${viewMeasurements.customerName}`} onClose={()=>setViewMeasurements(null)}>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(viewMeasurements.measurements || {}).map(([key, val]: any) => (
                            <div key={key} className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-slate-500 font-black uppercase">{key}</p>
                                <p className="text-sm text-white font-bold">{val || '-'}</p>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {isModal && (
                <Modal title="حجز إيجار جديد" onClose={()=>setModal(false)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault(); const fd = new FormData(e.target);
                        const dress = dresses.find((d:any)=>d.id === fd.get('dressId'));
                        const price = Number(fd.get('price')); const dep = Number(fd.get('deposit'));
                        await onAdd({ customerName: fd.get('name'), customerPhone: fd.get('phone'), dressId: dress.id, dressName: dress.name, eventDate: fd.get('date'), agreedRentalPrice: price, paidDeposit: dep, remainingToPay: price - dep, status: BookingStatus.PENDING, notes: fd.get('alterations'), createdAt: new Date().toISOString() });
                        if(dep > 0) await onFinanceAdd({ amount: dep, type: 'INCOME', category: 'عربون حجز إيجار', targetName: fd.get('name'), date: new Date().toISOString() });
                        setModal(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4"><input name="name" placeholder="اسم العروس" className={INPUT_CLASS} required /><input name="phone" placeholder="رقم هاتف العروس" className={INPUT_CLASS} required /></div>
                        <select name="dressId" className={INPUT_CLASS} required><option value="">اختر الفستان المتاح...</option>{dresses.filter((d:any)=>d.status === DressStatus.AVAILABLE).map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
                        <div className="grid grid-cols-2 gap-4"><input name="price" type="number" placeholder="سعر الإيجار" className={INPUT_CLASS} required /><input name="deposit" type="number" placeholder="العربون" className={INPUT_CLASS} required /></div>
                        <input name="date" type="date" className={INPUT_CLASS} required />
                        <textarea name="alterations" placeholder="ملحوظة التعديلات المطلوبة (اختياري)" className={INPUT_CLASS + " h-24"}></textarea>
                        <button className={BTN_PRIMARY}>تثبيت الحجز</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const DeliveryManager = ({ bookings, dresses, user, onUpdate, onFinanceAdd }: any) => {
    const [view, setView] = useState<'PENDING'|'ACTIVE'|'ARCHIVE'>('PENDING');
    const [modalData, setModalData] = useState<any>(null);
    const [returnModal, setReturnModal] = useState<any>(null);
    const filtered = bookings.filter((b:any) => {
        if(view === 'PENDING') return b.status === BookingStatus.PENDING;
        if(view === 'ACTIVE') return b.status === BookingStatus.ACTIVE;
        if(view === 'ARCHIVE') return b.status === BookingStatus.COMPLETED;
        return false;
    }).sort((a:any, b:any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-white/5"><button onClick={()=>setView('PENDING')} className={`flex-1 py-3 rounded-2xl text-xs font-black ${view==='PENDING'?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>التسليم</button><button onClick={()=>setView('ACTIVE')} className={`flex-1 py-3 rounded-2xl text-xs font-black ${view==='ACTIVE'?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>الإرجاع</button><button onClick={()=>setView('ARCHIVE')} className={`flex-1 py-3 rounded-2xl text-xs font-black ${view==='ARCHIVE'?'bg-brand-600 text-white shadow-lg':'text-slate-500'}`}>الأرشيف</button></div>
            <div className="grid gap-4">
                {filtered.map((b:any) => (
                    <div key={b.id} className={CARD_CLASS}>
                        <div className="flex justify-between items-start mb-6"><div><h4 className="font-black text-white text-xl">{b.customerName}</h4><p className="text-xs text-slate-500 font-bold mt-1">{b.dressName}</p></div><div className="text-left"><p className="text-[10px] text-brand-400 font-black uppercase">المناسبة</p><p className="text-base font-black text-white">{formatDate(b.eventDate)}</p></div></div>
                        {view === 'PENDING' && <button onClick={()=>setModalData(b)} className={BTN_PRIMARY}><Truck size={20}/> تسليم للعروس وتحصيل المتبقي</button>}
                        {view === 'ACTIVE' && (
                            <div className="flex gap-3">
                                <button onClick={async () => { 
                                    if(confirm('التراجع عن التسليم؟')) { 
                                        await onUpdate(b.id, {status: BookingStatus.PENDING}); 
                                        await cloudDb.update(COLLS.DRESSES, b.dressId, {status: DressStatus.AVAILABLE}); 
                                    } 
                                }} className="flex-1 py-4 bg-slate-800 rounded-2xl text-slate-400 font-black text-xs hover:text-white flex items-center justify-center gap-2 transition-all">
                                    <Undo2 size={18}/> تراجع
                                </button>
                                <button onClick={()=>setReturnModal(b)} className="flex-1 py-4 bg-emerald-600 rounded-2xl text-white font-black text-xs hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"><RotateCcw size={18}/> استرجاع</button>
                            </div>
                        )}
                        {view === 'ARCHIVE' && <div className="pt-4 border-t border-white/5 text-center text-xs text-slate-500 font-bold">تم الإرجاع بواسطة {b.returnDetails?.staffName} في {formatDate(b.returnDetails?.date)}</div>}
                    </div>
                ))}
            </div>
            {modalData && (
                <Modal title="تسليم العروس وتصفية الحساب المالي" onClose={()=>setModalData(null)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault(); const fd = new FormData(e.target); const rem = Number(fd.get('remaining'));
                        const paidNow = modalData.remainingToPay - rem;
                        await onUpdate(modalData.id, { status: BookingStatus.ACTIVE, remainingToPay: rem, deliveryDetails: { date: new Date().toISOString(), staffName: user.name, depositType: fd.get('dType'), depositInfo: fd.get('dInfo') } });
                        await cloudDb.update(COLLS.DRESSES, modalData.dressId, {status: DressStatus.RENTED});
                        if(paidNow > 0) await onFinanceAdd({ amount: paidNow, type: 'INCOME', category: `تحصيل متبقي عند التسليم - ${modalData.customerName}`, targetName: modalData.customerName, date: new Date().toISOString() });
                        setModalData(null);
                    }} className="space-y-6">
                        <div className="bg-slate-950 p-6 rounded-[2rem] border border-white/5 text-center"><p className="text-xs text-slate-500 font-black mb-2 uppercase">المتبقي حالياً على العروس: {formatCurrency(modalData.remainingToPay)}</p><label className="text-xs text-brand-400 font-black block mb-2 px-2">المبلغ المتبقي للتحصيل مستقبلاً (ادخل 0 إذا سددت الكل الآن)</label><input name="remaining" type="number" defaultValue={0} className={INPUT_CLASS + " h-16 text-xl font-black"} required /></div>
                        <div className="space-y-4">
                            <label className="text-sm font-black text-white block px-2">نوع الأمنية (الضمان المستلم)</label>
                            <select name="dType" className={INPUT_CLASS} required><option value="مبلغ مالي">مبلغ مالي</option><option value="مستند">مستند (هوية/جواز)</option><option value="قطعة ذهب">قطعة ذهب</option><option value="اخرى">أخرى</option></select>
                            <input name="dInfo" placeholder="تفاصيل الضمان" className={INPUT_CLASS} required />
                        </div>
                        <button className={BTN_PRIMARY}>تأكيد التسليم وتحصيل المتبقي</button>
                    </form>
                </Modal>
            )}
            {returnModal && (
                <Modal title="استرجاع الفستان وتوثيق الحالة" onClose={()=>setReturnModal(null)}>
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault(); const fd = new FormData(e.target); const fee = Number(fd.get('fee') || 0);
                        await onUpdate(returnModal.id, { status: BookingStatus.COMPLETED, returnDetails: { date: new Date().toISOString(), staffName: user.name, isDamage: fd.get('damage')==='on', damageFee: fee } });
                        await cloudDb.update(COLLS.DRESSES, returnModal.dressId, {status: DressStatus.CLEANING});
                        if(fee > 0) await onFinanceAdd({ amount: fee, type: 'INCOME', category: `تعويض تلفيات - ${returnModal.customerName}`, targetName: returnModal.customerName, date: new Date().toISOString() });
                        setReturnModal(null);
                    }} className="space-y-6">
                        <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-white/5 text-center"><p className="text-xs text-slate-500 font-black mb-2 uppercase">الأمنية الواجب ردها للعروس</p><p className="text-sm font-black text-brand-300">{returnModal.deliveryDetails?.depositType}: {returnModal.deliveryDetails?.depositInfo}</p></div>
                        <div className="flex items-center gap-4 p-5 bg-slate-900 border border-white/5 rounded-3xl"><input type="checkbox" name="damage" className="w-6 h-6 accent-brand-500 rounded-xl" id="dmg" /><label htmlFor="dmg" className="text-sm font-black text-white cursor-pointer">هل يوجد تلف أو يحتاج تصليح خاص؟</label></div>
                        <input name="fee" type="number" placeholder="قيمة الغرامة إن وجدت" className={INPUT_CLASS} />
                        <button className={BTN_PRIMARY}>تأكيد الاسترجاع وتحرير الأمنية</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const SettingsManager = ({ user, users, onUpdate, onAdd, onDelete }: any) => {
    const [userModal, setUserModal] = useState<any>(null);
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
    const isAdmin = user.role === UserRole.ADMIN;
    return (
        <div className="space-y-8 animate-fade-in">
            <h3 className="text-3xl font-black text-white px-2">الإعدادات</h3>
            <div className={CARD_CLASS}><div className="flex items-center gap-5 mb-8"><div className="w-20 h-20 bg-brand-500/10 rounded-[2rem] flex items-center justify-center text-brand-400 border border-brand-500/20"><User size={40}/></div><div><h4 className="text-2xl font-black text-white">{user.name}</h4><p className="text-sm text-slate-500 font-bold">@{user.username} • {user.role}</p></div></div><button onClick={()=>setUserModal(user)} className={BTN_PRIMARY + " bg-slate-800 hover:bg-slate-750"}><Key size={20}/> تغيير كلمة المرور</button></div>
            {isAdmin && (
                <div className="space-y-4"><div className="flex justify-between items-center px-4"><h4 className="text-xl font-black text-white">إدارة الموظفين والصلاحيات</h4><button onClick={()=>{setUserModal({}); setSelectedPerms([])}} className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl hover:bg-brand-500/20 transition-all"><UserPlus size={24}/></button></div>
                    <div className="grid gap-4">{users.map((u:any)=>(
                        <div key={u.id} className={CARD_CLASS + " p-6"}><div className="flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400"><User size={24}/></div><div><p className="font-black text-white">{u.name}</p><p className="text-xs text-slate-500 mt-0.5">@{u.username} • {u.permissions.includes('ALL') ? 'كامل الصلاحيات' : `${u.permissions.length} صلاحيات`}</p></div></div><div className="flex gap-2"><button onClick={()=>{setUserModal(u); setSelectedPerms(u.permissions)}} className="p-3 text-slate-400 hover:text-brand-400"><Edit size={20}/></button>{u.id !== user.id && <button onClick={()=>confirm('حذف المستخدم؟') && onDelete(u.id)} className="p-3 text-slate-400 hover:text-red-400"><Trash2 size={20}/></button>}</div></div></div>
                    ))}</div>
                </div>
            )}
            {userModal && (
                <Modal title={userModal.id ? `تعديل المستخدم: ${userModal.name}` : 'إضافة موظف جديد'} onClose={()=>setUserModal(null)} size="lg">
                    <form onSubmit={async (e:any)=>{
                        e.preventDefault(); const fd = new FormData(e.target);
                        const data = { name: fd.get('name'), username: fd.get('user'), password: fd.get('pass') || '123', permissions: isAdmin ? selectedPerms : userModal.permissions, firstLogin: !userModal.id };
                        if(userModal.id) await onUpdate(userModal.id, data); else await onAdd({ ...data, role: UserRole.EMPLOYEE });
                        setUserModal(null); setSelectedPerms([]);
                    }} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4"><input name="name" defaultValue={userModal.name} placeholder="الاسم الكامل" className={INPUT_CLASS} required /><input name="user" defaultValue={userModal.username} placeholder="اسم المستخدم" className={INPUT_CLASS} required /></div>
                        <input name="pass" type="password" placeholder={userModal.id ? "كلمة المرور الجديدة" : "كلمة المرور (123)"} className={INPUT_CLASS} />
                        {isAdmin && (
                            <div className="space-y-4"><p className="text-xs font-black text-slate-500 uppercase px-2">تخصيص الصلاحيات الممنوحة:</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-5 bg-slate-950 rounded-[2.5rem] border border-white/5">{PERMISSIONS_LIST.map(p => (<label key={p.id} className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl cursor-pointer hover:bg-slate-800 transition-all"><input type="checkbox" className="w-6 h-6 accent-brand-500" checked={selectedPerms.includes(p.id)} onChange={e=>{if(e.target.checked) setSelectedPerms([...selectedPerms, p.id]); else setSelectedPerms(selectedPerms.filter(x=>x!==p.id));}} /><span className="text-sm text-white font-bold">{p.label}</span></label>))}</div></div>
                        )}
                        <button className={BTN_PRIMARY}>{userModal.id ? 'حفظ التعديلات' : 'إضافة الموظف'}</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const CustomerManager = ({ bookings, orders }: any) => {
    const [search, setSearch] = useState('');
    const customers = useMemo(() => {
        const map = new Map();
        bookings.forEach((b:any) => { if(!map.has(b.customerPhone)) map.set(b.customerPhone, { name: b.customerName, phone: b.customerPhone, type: 'إيجار', date: b.createdAt }); });
        orders.forEach((o:any) => { if(!map.has(o.bridePhone)) map.set(o.bridePhone, { name: o.brideName, phone: o.bridePhone, type: 'بيع (تفصيل)', date: o.createdAt }); });
        return Array.from(map.values()).filter(c => c.name.includes(search) || c.phone.includes(search));
    }, [bookings, orders, search]);
    return (
        <div className="space-y-6 animate-fade-in"><h3 className="text-3xl font-black text-white px-2">سجل العملاء</h3><div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/><input placeholder="بحث باسم العميل أو رقم الهاتف..." className={INPUT_CLASS + " pr-14 h-16 text-lg"} onChange={e=>setSearch(e.target.value)} /></div>
            <div className="grid gap-4">{customers.map(c => (<div key={c.phone} className={CARD_CLASS}><div className="flex justify-between items-center"><div><h4 className="font-black text-white text-xl">{c.name}</h4><p className="text-sm text-brand-400 font-bold mt-1">{c.phone}</p></div><div className="text-left"><span className={BADGE_CLASS + " border-brand-500/20 text-brand-300"}>{c.type}</span><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">{formatDate(c.date)}</p></div></div></div>))}</div>
        </div>
    );
};

const FinanceManager = ({ finance, users, dresses, onAdd }: any) => {
    const [tab, setTab] = useState<'LOG'|'ANALYTICS'>('LOG'); const [isModal, setModal] = useState(false); const [type, setType] = useState<'INCOME'|'EXPENSE'>('INCOME'); const [category, setCategory] = useState(''); const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const totalIncome = finance.filter((f:any)=>f.type==='INCOME').reduce((a:any,b:any)=>a+b.amount, 0); const totalExpense = finance.filter((f:any)=>f.type==='EXPENSE').reduce((a:any,b:any)=>a+b.amount, 0);
    return (
        <div className="space-y-8 animate-fade-in"><div className="flex justify-between items-center px-2"><h3 className="text-3xl font-black text-white">المالية</h3><div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-white/5"><button onClick={()=>setTab('LOG')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${tab==='LOG'?'bg-brand-600 text-white shadow-xl':'text-slate-500'}`}>السجل</button><button onClick={()=>setTab('ANALYTICS')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${tab==='ANALYTICS'?'bg-brand-600 text-white shadow-xl':'text-slate-500'}`}>التحليلات</button></div></div>
            {tab === 'LOG' ? (<><div className="grid grid-cols-2 gap-4"><div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[3rem] text-center"><TrendingUp className="mx-auto text-emerald-400 mb-2" size={32}/><p className="text-xs font-black text-emerald-500/70 uppercase">الواردات</p><p className="text-2xl font-black text-white mt-2">{formatCurrency(totalIncome)}</p></div><div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[3rem] text-center"><ArrowRightLeft className="mx-auto text-red-400 mb-2" size={32}/><p className="text-xs font-black text-red-500/70 uppercase">المنصرفات</p><p className="text-2xl font-black text-white mt-2">{formatCurrency(totalExpense)}</p></div></div><button onClick={()=>setModal(true)} className={BTN_PRIMARY + " h-16 text-lg"}><Plus size={24}/> إضافة حركة مالية</button>
                    <div className={CARD_CLASS}><div className="divide-y divide-white/5">{finance.sort((a:any,b:any)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map((f:any)=>(<div key={f.id} className="py-6 flex justify-between items-center"><div className="flex items-center gap-5"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.type==='INCOME'?'bg-emerald-500/20 text-emerald-400':'bg-red-500/20 text-red-400'}`}>{f.type==='INCOME'?<TrendingUp size={20}/>:<ArrowRightLeft size={20}/>}</div><div><p className="font-black text-white text-base">{f.category}</p><p className="text-xs text-slate-500 font-bold mt-1">{formatDate(f.date)} {f.targetName ? `• ${f.targetName}` : ''}</p></div></div><p className={`font-black text-xl ${f.type==='INCOME'?'text-emerald-400':'text-red-400'}`}>{f.type==='INCOME'?'+':'-'} {formatCurrency(f.amount)}</p></div>))}</div></div></>) : <div className={CARD_CLASS + " h-80 flex items-center justify-center text-slate-500 italic"}>الرسوم البيانية قيد المعالجة...</div>}
            {isModal && (<Modal title="إضافة حركة مالية" onClose={()=>setModal(false)}><form onSubmit={async (e:any)=>{
                e.preventDefault(); const fd = new FormData(e.target); await onAdd({ type, amount: Number(fd.get('amount')), category: type === 'INCOME' ? fd.get('in_cat') : category, subCategory: fd.get('sub_cat') || '', targetName: selectedItems.join(', '), date: fd.get('date') || new Date().toISOString() }); setModal(false);
            }} className="space-y-6"><div className="flex p-1.5 bg-slate-950 rounded-3xl border border-white/5"><button type="button" onClick={()=>setType('INCOME')} className={`flex-1 py-4 rounded-2xl text-sm font-black ${type==='INCOME'?'bg-emerald-600 text-white':'text-slate-500'}`}>وارد</button><button type="button" onClick={()=>setType('EXPENSE')} className={`flex-1 py-4 rounded-2xl text-sm font-black ${type==='EXPENSE'?'bg-red-600 text-white':'text-slate-500'}`}>منصرف</button></div>
                        {type === 'INCOME' ? <input name="in_cat" placeholder="نوع الوارد" className={INPUT_CLASS} required /> : (
                            <div className="space-y-4"><select className={INPUT_CLASS} required onChange={e=>setCategory(e.target.value)}><option value="">اختر التصنيف الرئيسي...</option><option value="فواتير">فواتير</option><option value="رواتب">رواتب</option><option value="تنظيف">تنظيف</option><option value="ترزي">ترزي</option><option value="اخرى">أخرى</option></select>
                                {category === 'رواتب' && <select className={INPUT_CLASS} onChange={e=>setSelectedItems([e.target.value])} required><option value="">اختر الموظف...</option>{users.map((u:any)=><option key={u.id} value={u.name}>{u.name}</option>)}</select>}
                                {category === 'اخرى' && <input name="sub_cat" placeholder="النوع" className={INPUT_CLASS} required />}
                            </div>)}<div className="grid grid-cols-2 gap-4"><input name="amount" type="number" placeholder="المبلغ" className={INPUT_CLASS} required /><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className={INPUT_CLASS} required /></div><button className={BTN_PRIMARY}>تثبيت العملية</button></form></Modal>)}
        </div>
    );
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

    useEffect(() => {
        const unsubs = [
            cloudDb.subscribe(COLLS.DRESSES, setDresses), cloudDb.subscribe(COLLS.BOOKINGS, setBookings), cloudDb.subscribe(COLLS.FINANCE, setFinance), cloudDb.subscribe(COLLS.SALES, setOrders), cloudDb.subscribe(COLLS.USERS, setUsers)
        ];
        setTimeout(() => setLoading(false), 1200); return () => unsubs.forEach(u => u());
    }, []);

    const can = (perm: string) => { 
        if (!user) return false; 
        if (user.permissions.includes('ALL')) return true; 
        return user.permissions.includes(perm); 
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 font-black text-brand-500 uppercase tracking-widest text-xs animate-pulse">Elaf Cloud v3.1.0</div>;

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-white/5 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl shadow-brand-500/10 overflow-hidden p-2">
                        <img 
                          src="/logo.png" 
                          alt="إيلاف" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback in case logo.png doesn't exist
                            const target = e.currentTarget as HTMLImageElement;
                            const parent = target.parentElement as HTMLDivElement;
                            parent.innerHTML = '';
                            parent.className = "w-24 h-24 bg-brand-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-brand-500 border border-brand-500/20 shadow-2xl shadow-brand-500/10";
                            const icon = document.createElement('div');
                            icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shirt"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>';
                            parent.appendChild(icon);
                          }}
                        />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">إيلاف للزفاف</h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">نظام الإدارة السحابي</p>
                </div>
                <form onSubmit={(e:any)=>{
                    e.preventDefault(); const u = users.find(x => x.username.toLowerCase() === e.target.user.value.toLowerCase() && x.password === e.target.pass.value); if(u) setUser(u); else alert('خطأ في بيانات الدخول!');
                }} className="space-y-4">
                    <input name="user" placeholder="اسم المستخدم" className={INPUT_CLASS} required />
                    <input name="pass" type="password" placeholder="كلمة المرور" className={INPUT_CLASS} required />
                    <button className={BTN_PRIMARY}>دخول النظام</button>
                </form>
            </div>
        </div>
    );

    const renderContent = () => {
        if(user?.firstLogin && tab !== 'settings') return <div className="p-12 text-center"><Lock size={64} className="mx-auto text-brand-500 mb-6"/><h3 className="text-2xl font-black text-white mb-8">يجب تغيير كلمة المرور أولاً</h3><button onClick={()=>setTab('settings')} className={BTN_PRIMARY}>الإعدادات</button></div>;
        switch(tab) {
            case 'home': return (<div className="space-y-8 animate-fade-in"><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className={CARD_CLASS + " p-6 text-center"}><Shirt className="mx-auto text-brand-400 mb-2"/><p className="text-[10px] font-black text-slate-500">الفساتين</p><p className="text-2xl font-black text-white">{dresses.length}</p></div><div className={CARD_CLASS + " p-6 text-center"}><Calendar className="mx-auto text-emerald-400 mb-2"/><p className="text-[10px] font-black text-slate-500">حجوزات نشطة</p><p className="text-2xl font-black text-white">{bookings.filter(b=>b.status===BookingStatus.ACTIVE).length}</p></div><div className={CARD_CLASS + " p-6 text-center"}><Droplets className="mx-auto text-orange-400 mb-2"/><p className="text-[10px] font-black text-slate-500">بالمغسلة</p><p className="text-2xl font-black text-white">{dresses.filter(d=>d.status===DressStatus.CLEANING).length}</p></div><div className={CARD_CLASS + " p-6 text-center"}><ShoppingBag className="mx-auto text-blue-400 mb-2"/><p className="text-[10px] font-black text-slate-500">طلبات مبيعات</p><p className="text-2xl font-black text-white">{orders.filter(o=>o.status!==SaleStatus.DELIVERED).length}</p></div></div></div>);
            case 'dresses_rent': return can('dresses_rent_view') ? <RentalManager dresses={dresses} onAdd={(d:any)=>cloudDb.add(COLLS.DRESSES, d)} onUpdate={(id:any, d:any)=>cloudDb.update(COLLS.DRESSES, id, d)} /> : null;
            case 'bookings': return can('bookings_view') ? <BookingManager bookings={bookings} dresses={dresses} onAdd={(b:any)=>cloudDb.add(COLLS.BOOKINGS, b)} onDelete={(id:any)=>cloudDb.delete(COLLS.BOOKINGS, id)} onFinanceAdd={(f:any)=>cloudDb.add(COLLS.FINANCE, f)} /> : null;
            case 'dresses_sale': return can('dresses_sale_view') ? <SalesManager orders={orders} onAdd={(o:any)=>cloudDb.add(COLLS.SALES, o)} onUpdate={(id:any, d:any)=>cloudDb.update(COLLS.SALES, id, d)} onFinanceAdd={(f:any)=>cloudDb.add(COLLS.FINANCE, f)} /> : null;
            case 'factory': return can('factory_view') ? <FactoryManager orders={orders} onUpdate={(id:any, o:any)=>cloudDb.update(COLLS.SALES, id, o)} onFinanceAdd={(f:any)=>cloudDb.add(COLLS.FINANCE, f)} /> : null;
            case 'delivery': return can('delivery_view') ? <DeliveryManager bookings={bookings} dresses={dresses} user={user} onUpdate={(id:any, d:any)=>cloudDb.update(COLLS.BOOKINGS, id, d)} onFinanceAdd={(f:any)=>cloudDb.add(COLLS.FINANCE, f)} /> : null;
            case 'finance': return can('finance_ops') ? <FinanceManager finance={finance} users={users} dresses={dresses} onAdd={(f:any)=>cloudDb.add(COLLS.FINANCE, f)} /> : null;
            case 'customers': return can('customers_view') ? <CustomerManager bookings={bookings} orders={orders} /> : null;
            case 'settings': return <SettingsManager user={user} users={users} onAdd={(u:any)=>cloudDb.add(COLLS.USERS, u)} onUpdate={(id:any, d:any)=>cloudDb.update(COLLS.USERS, id, d)} onDelete={(id:any)=>cloudDb.delete(COLLS.USERS, id)} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden" dir="rtl">
            <header className="fixed top-0 inset-x-0 h-20 bg-slate-900/60 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-8 z-[60]"><div className="flex items-center gap-4 font-black text-xl tracking-tight"><div className="w-10 h-10 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500"><Shirt size={22}/></div> إيلاف</div><button onClick={()=>setUser(null)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"><LogOut size={18}/></button></header>
            <main className="flex-1 overflow-y-auto pt-28 pb-32 px-6 max-w-5xl mx-auto w-full">{renderContent()}</main>
            <nav className="fixed bottom-0 inset-x-0 h-20 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center z-[60] pb-safe px-4">
                <button onClick={()=>setTab('home')} className={`flex flex-col items-center gap-1.5 flex-1 ${tab==='home'?'text-brand-500':'text-slate-500'}`}><Home size={22}/><span className="text-[9px] font-black uppercase tracking-widest">الرئيسية</span></button>
                {can('dresses_rent_view') && <button onClick={()=>setTab('dresses_rent')} className={`flex flex-col items-center gap-1.5 flex-1 ${tab==='dresses_rent'?'text-brand-500':'text-slate-500'}`}><Shirt size={22}/><span className="text-[9px] font-black uppercase tracking-widest">الإيجار</span></button>}
                {can('finance_ops') && <button onClick={()=>setTab('finance')} className={`flex flex-col items-center gap-1.5 flex-1 ${tab==='finance'?'text-brand-500':'text-slate-500'}`}><DollarSign size={22}/><span className="text-[9px] font-black uppercase tracking-widest">المالية</span></button>}
                <button onClick={()=>setMenuOpen(true)} className="flex flex-col items-center gap-1.5 flex-1 text-slate-500 hover:text-brand-400"><MoreHorizontal size={22}/><span className="text-[9px] font-black uppercase tracking-widest">المزيد</span></button>
            </nav>
            {isMenuOpen && (<div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl p-10 flex flex-col animate-fade-in"><div className="flex justify-between items-center mb-16"><h3 className="text-5xl font-black text-white tracking-tight">الأقسام</h3><button onClick={()=>setMenuOpen(false)} className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-white"><X size={32}/></button></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {can('bookings_view') && <button onClick={()=>{setTab('bookings'); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-brand-500/10 transition-all"><Calendar size={36} className="text-brand-400"/><span className="text-sm font-black">حجوزات الإيجار</span></button>}
                        {can('dresses_sale_view') && <button onClick={()=>{setTab('dresses_sale'); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-brand-500/10 transition-all"><ShoppingBag size={36} className="text-brand-400"/><span className="text-sm font-black">مبيعات التفصيل</span></button>}
                        {can('delivery_view') && <button onClick={()=>{setTab('delivery'); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-brand-500/10 transition-all"><Truck size={36} className="text-brand-400"/><span className="text-sm font-black">التسليم والإرجاع</span></button>}
                        {can('factory_view') && <button onClick={()=>{setTab('factory'); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-brand-500/10 transition-all"><Factory size={36} className="text-brand-400"/><span className="text-sm font-black">تعاملات المصنع</span></button>}
                        {can('customers_view') && <button onClick={()=>{setTab('customers'); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-brand-500/10 transition-all"><Users size={36} className="text-brand-400"/><span className="text-sm font-black">سجل العملاء</span></button>}
                        <button onClick={()=>{setTab('settings'); setMenuOpen(false)}} className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-brand-500/10 transition-all"><Settings size={36} className="text-brand-400"/><span className="text-sm font-black">الإعدادات</span></button>
                    </div></div>)}
        </div>
    );
}
