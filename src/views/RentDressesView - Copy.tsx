
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Camera, Shirt, Calendar, Droplets, Edit, Trash2, Check, AlertTriangle, RotateCcw, LayoutGrid, List, Calculator, RefreshCw } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { DressStatus, DressType, DressCondition, BookingStatus } from '../types';
import { Button, Input, Modal, Card, ConfirmModal } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';
import { PAYMENT_METHODS, COUNTRY_CODES } from '../utils/constants';

export default function RentDressesView({ dresses, bookings, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'available' | 'archived' | 'ratings'>('available');
  const [modal, setModal] = useState<any>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingSave, setPendingSave] = useState<any>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(window.innerWidth < 768 ? 'list' : 'grid');

  // --- SMART BOOKING STATES ---
  const [phoneCode, setPhoneCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');
  const [calcState, setCalcState] = useState({ 
    currency: 'EGP', 
    egpAmount: 0, 
    foreignAmount: 0, 
    rate: 0 
  });

  const filtered = useMemo(() => {
    return dresses.filter((d: any) => d.type === DressType.RENT && (d.name.toLowerCase().includes(query.toLowerCase()))).filter((d: any) => {
      if (subTab === 'available') return d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD;
      if (subTab === 'archived') return d.status === DressStatus.ARCHIVED || d.status === DressStatus.SOLD;
      return true;
    }).filter((d: any) => {
      if (filters.length === 0) return true;
      if (filters.includes('CLEANING')) return d.status === DressStatus.CLEANING;
      return true;
    }).sort((a: any, b: any) => a.name.localeCompare(b.name, 'ar'));
  }, [dresses, subTab, query, filters]);

  // --- BIDIRECTIONAL CURRENCY CALCULATION ---
  const handlePaymentMethodChange = (pm: string) => {
      let curr = 'EGP';
      if (pm.includes('بنكك') || pm.includes('SDG')) curr = 'SDG';
      else if (pm.includes('دولار') || pm.includes('USD')) curr = 'USD';
      setCalcState(prev => ({ ...prev, currency: curr }));
      setModal((prev:any) => ({...prev, paymentMethod: pm }));
  };

  const handleCalc = (type: 'EGP' | 'FOREIGN' | 'RATE', val: number) => {
      setCalcState(prev => {
          const newState = { ...prev };
          if (type === 'RATE') newState.rate = val;
          if (type === 'FOREIGN') newState.foreignAmount = val;
          if (type === 'EGP') newState.egpAmount = val;

          const { currency, rate, foreignAmount, egpAmount } = newState;

          if (type === 'RATE') {
              if (foreignAmount > 0) {
                  newState.egpAmount = currency === 'USD' ? foreignAmount * rate : (rate > 0 ? foreignAmount / rate : 0);
              }
          } else if (type === 'FOREIGN') {
              newState.egpAmount = currency === 'USD' ? val * rate : (rate > 0 ? val / rate : 0);
          } else if (type === 'EGP') {
              newState.foreignAmount = currency === 'USD' ? (rate > 0 ? val / rate : 0) : val * rate;
          }
          
          newState.egpAmount = parseFloat(Number(newState.egpAmount).toFixed(2));
          newState.foreignAmount = parseFloat(Number(newState.foreignAmount).toFixed(2));
          
          return newState;
      });
  };

  // --- ACTIONS ---

  const openBookModal = (dress: any) => {
      setModal({ type: 'BOOK_FROM_DRESS', dress });
      setPhoneCode('+20');
      setLocalPhone('');
      setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
  };

  const executeSaveBooking = async (data: any) => {
     let bId = data.id;
     
     const finalData = {
        ...data,
        originalCurrency: calcState.currency !== 'EGP' ? calcState.currency : 'EGP',
        foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
        exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
     };

     bId = await cloudDb.add(COLLS.BOOKINGS, finalData);
     
     const dress = dresses.find((d: any) => d.id === data.dressId);
     if (dress) {
        await cloudDb.update(COLLS.DRESSES, dress.id, { rentalCount: (dress.rentalCount || 0) + 1 });
     }
     
     const depositAmount = Number(finalData.paidDeposit);
     if (depositAmount > 0) {
        await cloudDb.add(COLLS.FINANCE, {
          amount: depositAmount, 
          currency: finalData.originalCurrency,
          currencyAmount: finalData.foreignAmount || depositAmount,
          exchangeRate: finalData.exchangeRate,
          type: 'INCOME', 
          category: 'حجز إيجار',
          notes: `عربون حجز فستان ${finalData.dressName} للعروس ${finalData.customerName}`,
          date: finalData.createdAt, 
          relatedId: bId
        });
        showToast('تم تسجيل عملية مالية بقيمة: ' + depositAmount);
     }
     
     showToast('تم الحجز بنجاح'); 
     setModal(null); 
     setPendingSave(null);
     setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
  };

  const handleRestore = (d: any) => {
      setModal({ type: 'CONFIRM_RESTORE', item: d });
  };

  const executeRestore = async (d: any) => {
      await cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.AVAILABLE });
      showToast('تم استرجاع الفستان لقائمة المتاح');
      setModal(null);
  };

  const handleDeleteFinal = async (id: string) => {
      await cloudDb.delete(COLLS.DRESSES, id);
      showToast('تم حذف الفستان نهائياً');
      setModal(null);
  };

  const toggleStatus = (d: any) => {
      cloudDb.update(COLLS.DRESSES, d.id, { status: d.status === DressStatus.CLEANING ? DressStatus.AVAILABLE : DressStatus.CLEANING });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl p-2 rounded-3xl border-b border-white/5">
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
            {['available', 'archived', 'ratings'].map(t => (
              <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 md:flex-none px-4 h-10 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
                {t === 'available' ? 'المتاحة' : t === 'archived' ? 'الأرشيف' : 'التقييمات'}
              </button>
            ))}
          </div>

          {subTab !== 'ratings' && (
            <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
               <button 
                 onClick={() => setViewMode('list')}
                 className={`flex-1 md:flex-none w-12 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
               >
                 <List size={20} />
               </button>
               <button 
                 onClick={() => setViewMode('grid')}
                 className={`flex-1 md:flex-none w-12 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
               >
                 <LayoutGrid size={18} />
               </button>
            </div>
          )}
      </div>

      {subTab === 'available' && hasPerm('add_rent_dress') && (
        <Button onClick={() => setModal({ type: 'ADD', condition: DressCondition.NEW })} className="w-full !rounded-[2rem] h-14 shadow-xl"><Plus size={20}/> تسجيل فستان جديد</Button>
      )}

      {subTab === 'ratings' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...dresses].filter(d => d.type === DressType.RENT).sort((a,b) => b.rentalCount - a.rentalCount).map((d: any, idx: number) => (
              <Card key={d.id} className="flex justify-between items-center group !p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${idx < 3 ? 'bg-brand-500 text-white border-brand-400' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                      {idx + 1}
                  </div>
                  <div><p className="font-black text-white text-base tracking-tight">{d.name}</p><p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mt-0.5">{d.style}</p></div>
                </div>
                <div className="px-3 py-1 bg-white/5 text-white rounded-lg font-black text-xs border border-white/10">{d.rentalCount} مرة</div>
              </Card>
            ))}
          </div>
      ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
            {filtered.map((d: any) => (
               viewMode === 'grid' ? (
                <Card key={d.id} className="group overflow-hidden !p-0 border border-white/10 hover:border-brand-500/50 transition-colors">
                  <div className="h-64 relative overflow-hidden">
                    {d.imageUrl ? <img src={d.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={d.name} /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-surface-700"><Shirt size={48} strokeWidth={1} /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                    <div className="absolute top-3 right-3"><Button onClick={() => openBookModal(d)} className="!h-9 !text-[10px] !px-3 !bg-white/10 backdrop-blur-md border-white/20 hover:!bg-brand-500 shadow-xl"><Calendar size={14}/> حجز سريع</Button></div>
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                       <div><h3 className="text-xl font-black text-white tracking-tight">{d.name}</h3><p className="text-[10px] text-surface-300 font-bold uppercase tracking-[0.2em]">{d.style} • {d.condition}</p></div>
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg ${d.status === DressStatus.AVAILABLE ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>{d.status}</span>
                    </div>
                  </div>
                  <div className="p-4 flex gap-2 bg-slate-950/50">
                    <Button variant="ghost" onClick={() => toggleStatus(d)} className={`flex-1 !h-10 !text-[10px] font-bold ${d.status === DressStatus.CLEANING ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-white/5'}`}>
                      {d.status === DressStatus.CLEANING ? <Check size={14}/> : <Droplets size={14}/>} {d.status === DressStatus.CLEANING ? 'جاهز للعرض' : 'يحتاج تنظيف'}
                    </Button>
                    <Button variant="ghost" onClick={() => setModal({ ...d, type: 'EDIT' })} className="!w-10 !h-10 !p-0 text-brand-400 bg-brand-500/5 hover:bg-brand-500/20"><Edit size={16}/></Button>
                    {subTab === 'available' ? (
                      <Button variant="danger" onClick={() => setModal({ type: 'DELETE_OPT', item: d })} className="!w-10 !h-10 !p-0"><Trash2 size={16}/></Button>
                    ) : (
                      <Button variant="success" onClick={() => handleRestore(d)} className="!w-10 !h-10 !p-0"><RotateCcw size={16}/></Button>
                    )}
                  </div>
                </Card>
               ) : (
                <div key={d.id} className="flex bg-slate-900 border border-white/5 rounded-2xl overflow-hidden h-28 relative group shadow-sm transition-all hover:border-brand-500/30">
                    <div className="w-24 h-full relative shrink-0 border-l border-white/5">
                        {d.imageUrl ? <img src={d.imageUrl} className="w-full h-full object-cover" alt={d.name} /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Shirt size={24} className="text-slate-600"/></div>}
                        <div className={`absolute bottom-0 inset-x-0 h-1 ${d.status === DressStatus.AVAILABLE ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-center gap-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className="font-black text-white text-sm truncate leading-tight">{d.name}</h3>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${d.status === DressStatus.AVAILABLE ? 'text-emerald-400 bg-emerald-500/10' : 'text-orange-400 bg-orange-500/10'}`}>{d.status === DressStatus.CLEANING ? 'غسيل' : d.status === DressStatus.RENTED ? 'مؤجر' : 'متاح'}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{d.style}</p>
                    </div>
                    <div className="w-14 bg-slate-950/50 border-r border-white/5 flex flex-col items-center justify-evenly p-1">
                        <button onClick={() => openBookModal(d)} className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                            <Calendar size={16} />
                        </button>
                        <div className="flex flex-col gap-2">
                            {subTab === 'available' ? (
                                <button onClick={() => setModal({ ...d, type: 'EDIT' })} className="text-slate-400 hover:text-white transition-colors"><Edit size={16} /></button>
                            ) : (
                                <button onClick={() => handleRestore(d)} className="text-emerald-400 hover:text-emerald-300 transition-colors"><RotateCcw size={16} /></button>
                            )}
                        </div>
                    </div>
                </div>
               )
            ))}
            {filtered.length === 0 && <div className="text-center py-20 opacity-20"><Shirt size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-sm">No items found</p></div>}
          </div>
      )}

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'إضافة فستان إيجار' : 'تعديل بيانات فستان'} onClose={() => setModal(null)}>
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const data = {
              name: fd.get('n'), style: fd.get('s'), factoryPrice: Number(fd.get('p')), rentalPrice: Number(fd.get('rp')),
              condition: fd.get('cond'), videoUrl: fd.get('v'), imageUrl: modal.imageUrl || '',
              type: DressType.RENT, status: modal.status || DressStatus.AVAILABLE, rentalCount: modal.rentalCount || 0, createdAt: today
            };
            if (modal.type === 'ADD') await cloudDb.add(COLLS.DRESSES, data);
            else await cloudDb.update(COLLS.DRESSES, modal.id, data);
            showToast('تم حفظ الفستان بنجاح'); setModal(null);
          }} className="space-y-6">
            <div className="flex justify-center">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-3xl bg-slate-950/50 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-brand-500 transition-all group">
                {modal.imageUrl ? <img src={modal.imageUrl} className="w-full h-full object-cover" /> : <><Camera className="text-surface-600 group-hover:text-brand-500" /><span className="text-[10px] font-black text-surface-600">رفع صورة</span></>}
              </button>
              <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setModal((p: any) => ({ ...p, imageUrl: reader.result })); reader.readAsDataURL(file); } }} className="hidden" accept="image/*" />
            </div>
            <Input label="اسم الفستان" name="n" defaultValue={modal.name} required />
            <Input label="الموديل / الاستايل" name="s" defaultValue={modal.style} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="سعر الشراء (التكلفة)" name="p" type="number" defaultValue={modal.factoryPrice} required />
              <Input label="سعر الإيجار المقترح" name="rp" type="number" defaultValue={modal.rentalPrice} required />
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">الحالة</label>
                <select name="cond" defaultValue={modal.condition || DressCondition.NEW} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all">
                  <option value={DressCondition.NEW}>جديد</option>
                  <option value={DressCondition.USED}>مستعمل</option>
                </select>
            </div>
            <Button className="w-full mt-4 !rounded-2xl">حفظ البيانات</Button>
          </form>
        </Modal>
      )}
      
      {modal?.type === 'BOOK_FROM_DRESS' && (
        <Modal title={`حجز فستان: ${modal.dress.name}`} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e: any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const dr = modal.dress;
             const rp = Number(fd.get('rp')); const dep = calcState.egpAmount; // Use Calculated EGP
             const fullPhone = `${phoneCode}${localPhone}`.trim();

             if (dep > rp) {
                 setPendingSave({
                     customerName: fd.get('cn'), 
                     customerPhone: fullPhone, 
                     customerAddress: fd.get('ca'),
                     dressId: dr.id, dressName: dr.name, eventDate: fd.get('ed'), deliveryDate: fd.get('dd'),
                     rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep, notes: fd.get('notes'),
                     paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || '',
                     dress: modal.dress,
                     // Currency Info
                     originalCurrency: calcState.currency,
                     foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
                     exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
                 });
                 setModal({ type: 'VALIDATION_WARNING', msg: 'قيمة العربون أكبر من سعر الإيجار!' });
                 return;
             }

             const data: any = {
               customerName: fd.get('cn'), 
               customerPhone: fullPhone, 
               customerAddress: fd.get('ca'),
               dressId: dr.id, dressName: dr.name, eventDate: fd.get('ed'), deliveryDate: fd.get('dd'),
               rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep, notes: fd.get('notes'),
               status: BookingStatus.PENDING, createdAt: today,
               paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || '',
               originalCurrency: calcState.currency,
               foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
               exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
             };

             const targetDate = new Date(data.eventDate);
             const conflicts = bookings.filter((b: any) => {
                 if (b.dressId !== data.dressId) return false;
                 if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED) return false;
                 const bDate = new Date(b.eventDate);
                 const diff = Math.abs(targetDate.getTime() - bDate.getTime());
                 return Math.ceil(diff / (1000 * 3600 * 24)) <= 2;
             });

             if (conflicts.length > 0) {
                 setPendingSave(data);
                 setModal({ type: 'CONFLICT_WARNING', conflicts });
                 return;
             }
             await executeSaveBooking(data);
           }} className="space-y-5">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input label="اسم العروس" name="cn" defaultValue={modal.customerName} required />
               <div className="space-y-2">
                  <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">رقم الهاتف (واتساب)</label>
                  <div className="flex gap-2" dir="ltr">
                      <select className="w-1/3 bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-sm" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}>
                          {COUNTRY_CODES.map(c => (<option key={c.code} value={c.code}>{c.flag} {c.code}</option>))}
                      </select>
                      <input className="w-2/3 bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none placeholder:text-slate-700" placeholder="10xxxxxxxx" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} required />
                  </div>
               </div>
             </div>
             <Input label="العنوان" name="ca" defaultValue={modal.customerAddress} />
             <div className="grid grid-cols-2 gap-4">
               <Input label="تاريخ المناسبة" name="ed" type="date" defaultValue={modal.eventDate} required onChange={(e:any) => {
                    const eventDate = new Date(e.target.value);
                    if (!isNaN(eventDate.getTime())) {
                      eventDate.setDate(eventDate.getDate() - 1);
                      const suggested = eventDate.toISOString().split('T')[0];
                      const ddInput = document.querySelector('input[name="dd"]') as HTMLInputElement;
                      if (ddInput) ddInput.value = suggested;
                    }
               }} />
               <Input label="تاريخ التسليم" name="dd" type="date" defaultValue={modal.deliveryDate} required />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <Input label="سعر الإيجار (EGP)" name="rp" type="number" defaultValue={modal.rentalPrice || modal.dress.rentalPrice} required />
               <Input label="العربون بالمصري (EGP)" name="dep" type="number" value={calcState.egpAmount || ''} required onChange={(e:any) => handleCalc('EGP', Number(e.target.value))} />
             </div>

             <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع</label>
               <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" defaultValue={modal.paymentMethod} onChange={(e:any)=>handlePaymentMethodChange(e.target.value)} required>
                  <option value="">-- اختر --</option>
                  {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
               </select>
               {/* SMART CURRENCY CALCULATOR */}
               {calcState.currency !== 'EGP' && (
                 <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl animate-slide-up grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex items-center justify-between text-brand-400 mb-1">
                        <div className="flex items-center gap-2"><Calculator size={16}/> <span className="text-xs font-bold">حاسبة العملة ({calcState.currency})</span></div>
                        <RefreshCw size={14} className="opacity-50"/>
                    </div>
                    
                    <Input 
                      label={`المبلغ بالـ ${calcState.currency}`} 
                      type="number" 
                      value={calcState.foreignAmount || ''}
                      onChange={(e:any) => handleCalc('FOREIGN', Number(e.target.value))} 
                      placeholder="0.00" 
                    />
                    <Input 
                      label={calcState.currency === 'SDG' ? `سعر التحويل (كم ${calcState.currency} = 1 جنيه)` : `سعر التحويل (1 ${calcState.currency} = كم جنيه)`}
                      type="number" 
                      value={calcState.rate || ''}
                      placeholder="مثلاً 55" 
                      onChange={(e:any) => handleCalc('RATE', Number(e.target.value))}
                    />
                    <p className="col-span-2 text-[10px] text-center text-slate-500 dir-ltr font-mono">
                       Formula: {calcState.currency === 'SDG' 
                         ? `${calcState.foreignAmount} ${calcState.currency} / ${calcState.rate} Rate = ${calcState.egpAmount} EGP`
                         : `${calcState.foreignAmount} ${calcState.currency} * ${calcState.rate} Rate = ${calcState.egpAmount} EGP`}
                    </p>
                 </div>
               )}
               {(modal.payMethod === 'أخرى' || modal.paymentMethod === 'أخرى') && <Input label="تفاصيل الدفع الأخرى" name="opm" defaultValue={modal.otherPaymentMethod} required />}
             </div>
             <textarea name="notes" placeholder="ملاحظات..." defaultValue={modal.notes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold min-h-[100px]" />
             <Button className="w-full mt-4 !rounded-2xl">تأكيد الحجز</Button>
           </form>
        </Modal>
      )}

      {modal?.type === 'VALIDATION_WARNING' && (
        <Modal title="تنبيه هام" onClose={() => setModal(null)}>
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 border border-orange-500/20"><AlertTriangle size={40} /></div>
               <div><h3 className="font-black text-white text-xl">{modal.msg}</h3><p className="text-sm text-slate-400 mt-2">يرجى مراجعة البيانات المدخلة.</p></div>
               <Button onClick={() => setModal({ ...pendingSave, type: 'BOOK_FROM_DRESS' })} className="w-full">تعديل البيانات</Button>
            </div>
        </Modal>
      )}

      {modal?.type === 'CONFLICT_WARNING' && (
        <Modal title="تحذير تعارض حجوزات" onClose={() => setModal(null)}>
            <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-2"><AlertTriangle size={32} /></div>
                <h3 className="text-lg font-bold text-white">يوجد حجوزات قريبة لهذا الفستان</h3>
                <p className="text-sm text-slate-400">الفستان محجوز في تواريخ قريبة جداً. هل أنت متأكد؟</p>
                <div className="bg-slate-950/50 rounded-xl p-4 text-right space-y-2 border border-white/5">
                    {modal.conflicts.map((c: any) => (<div key={c.id} className="p-3 bg-white/5 rounded-lg border border-white/5"><p className="text-white font-bold text-sm">{c.customerName}</p><p className="text-xs text-brand-400 font-bold mt-1">تاريخ المناسبة: {c.eventDate}</p></div>))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
                    <Button variant="danger" onClick={() => executeSaveBooking(pendingSave)}>استمرار وحفظ</Button>
                </div>
            </div>
        </Modal>
      )}
      
      {modal?.type === 'CONFIRM_DELETE_FINAL' && (
        <ConfirmModal 
          title="حذف نهائي"
          msg={`هل أنت متأكد من حذف فستان "${modal.item.name}" نهائياً من السجلات؟`}
          onConfirm={() => handleDeleteFinal(modal.item.id)}
          onCancel={() => setModal(null)}
          confirmText="نعم، حذف"
        />
      )}

      {modal?.type === 'CONFIRM_RESTORE' && (
        <ConfirmModal 
          title="استرجاع الفستان"
          msg={`هل تريد استرجاع فستان "${modal.item.name}" إلى قائمة المتاح؟`}
          onConfirm={() => executeRestore(modal.item)}
          onCancel={() => setModal(null)}
          confirmText="نعم، استرجاع"
          variant="success"
          icon={RotateCcw}
        />
      )}
      
      {modal?.type === 'DELETE_OPT' && (
        <Modal title="خيارات الفستان" onClose={() => setModal(null)}>
          <div className="grid gap-4">
            <Button variant="danger" onClick={() => setModal({ type: 'CONFIRM_DELETE_FINAL', item: modal.item })} className="h-20 text-lg !rounded-3xl">حذف نهائي</Button>
            <Button variant="ghost" onClick={() => { cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.ARCHIVED }); setModal(null); showToast('تم الأرشفة'); }} className="h-20 text-lg !rounded-3xl">نقل للأرشيف</Button>
            <Button variant="success" onClick={() => setModal({ type: 'SELL_NOW', item: modal.item })} className="h-20 text-lg !rounded-3xl">بيع الفستان للعروس</Button>
          </div>
        </Modal>
      )}
      
      {modal?.type === 'SELL_NOW' && (
        <Modal title={`بيع فستان: ${modal.item.name}`} onClose={() => setModal(null)}>
           <form onSubmit={async (e:any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const price = Number(fd.get('p'));
             await cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.SOLD, salePrice: price, customerName: fd.get('cn'), customerPhone: fd.get('cp') });
             await cloudDb.add(COLLS.FINANCE, { amount: price, type: 'INCOME', category: 'بيع مباشر', notes: `بيع فستان ${modal.item.name} للعميلة ${fd.get('cn')}`, date: today, relatedId: modal.item.id });
             showToast('تمت عملية البيع بنجاح'); setModal(null);
           }} className="space-y-6">
              <Input label="اسم العميلة" name="cn" required />
              <Input label="رقم الهاتف" name="cp" required />
              <Input label="قيمة البيع" name="p" type="number" required />
              <Button className="w-full h-16 !rounded-2xl">تأكيد البيع</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}