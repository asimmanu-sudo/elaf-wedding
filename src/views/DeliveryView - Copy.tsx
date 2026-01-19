
import React, { useState, useMemo } from 'react';
import { Truck, PackagePlus, MinusCircle, RotateCcw, Printer, Calculator, RefreshCw, AlertTriangle } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { BookingStatus, SaleStatus, DressStatus } from '../types';
import { Button, Input, Modal, Card, ConfirmModal } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';
import { PAYMENT_METHODS } from '../utils/constants';
import PrintPreviewModal from '../components/PrintPreviewModal';

export default function DeliveryView({ bookings, sales, query, user, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'delivery' | 'return' | 'archive'>('delivery');
  const [modal, setModal] = useState<any>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [newExtra, setNewExtra] = useState('');

  // Print Preview State
  const [printModalData, setPrintModalData] = useState<any>(null);
  const [printModalMode, setPrintModalMode] = useState<'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE'>('DEPOSIT');

  // SMART CALCULATION STATE (Unified)
  const [calcState, setCalcState] = useState({ 
    currency: 'EGP', 
    egpAmount: 0, 
    foreignAmount: 0, 
    rate: 0 
  });

  const toDeliver = useMemo(() => {
    const q = (query || '').toLowerCase();
    const b = bookings.filter((x: any) => x.status === BookingStatus.PENDING && ((x.customerName || '').toLowerCase().includes(q) || (x.customerPhone || '').includes(query)));
    const s = sales.filter((x: any) => (x.status === SaleStatus.READY || x.status === SaleStatus.DESIGNING) && ((x.brideName || '').toLowerCase().includes(q) || (x.bridePhone || '').includes(query)));
    const combined = [...b.map((x: any) => ({ ...x, type: 'RENT' })), ...s.map((x: any) => ({ ...x, type: 'SALE' }))];
    return combined.sort((a, b) => (a.deliveryDate || a.expectedDeliveryDate || '').localeCompare(b.deliveryDate || b.expectedDeliveryDate || ''));
  }, [bookings, sales, query]);

  const toReturn = useMemo(() => {
    const q = (query || '').toLowerCase();
    return bookings.filter((x: any) => x.status === BookingStatus.ACTIVE && ((x.customerName || '').toLowerCase().includes(q) || (x.customerPhone || '').includes(query)));
  }, [bookings, query]);

  const archiveData = useMemo(() => {
    const completedBookings = bookings.filter((b: any) => b.status === BookingStatus.COMPLETED);
    const deliveredSales = sales.filter((s: any) => s.status === SaleStatus.DELIVERED);
    const combined = [
      ...completedBookings.map((b: any) => ({ ...b, type: 'RENT', opDate: b.actualReturnDate })),
      ...deliveredSales.map((s: any) => ({ ...s, type: 'SALE', opDate: s.actualDeliveryDate }))
    ];
    return combined.sort((a, b) => (b.opDate || '').localeCompare(a.opDate || ''));
  }, [bookings, sales]);

  const handleDeliverConfirm = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const paidNow = calcState.egpAmount; // Use Calculated EGP Value
    const staffName = user?.name || 'Admin';

    let currentTotalDebt = 0;
    if (item.type === 'RENT') {
        currentTotalDebt = Number(item.remainingToPay || 0);
    } else {
        currentTotalDebt = Number(item.remainingFromBride || 0);
    }
    const newRemaining = currentTotalDebt - paidNow;

    if (newRemaining < 0) {
        showToast('خطأ: المبلغ المدفوع أكبر من المستحق!', 'error');
        return;
    }

    try {
        if (item.type === 'RENT') {
            const security = {
                type: fd.get('sec_type'),
                detail: fd.get('sec_detail'),
                value: Number(fd.get('sec_val') || 0)
            };
            
            await cloudDb.update(COLLS.BOOKINGS, item.id, {
                status: BookingStatus.ACTIVE,
                actualPickupDate: today,
                remainingToPay: newRemaining,
                securityDeposit: security,
                extras: extras.join(', '),
                staffName
            });
            
            await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.RENTED });

            if (paidNow > 0) {
                await cloudDb.add(COLLS.FINANCE, {
                    amount: paidNow,
                    type: 'INCOME',
                    category: 'تحصيل متبقي (إيجار)',
                    notes: `تحصيل متبقي إيجار فستان ${item.dressName} من العروس ${item.customerName} (عند التسليم)`,
                    date: today,
                    relatedId: item.id,
                    currency: calcState.currency !== 'EGP' ? calcState.currency : 'EGP',
                    currencyAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : paidNow,
                    exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1
                });
                showToast(`تم استلام مبلغ: ${formatCurrency(paidNow)}`);
            }
            addLog('تسليم فستان', `تم تسليم فستان ${item.dressName}. المدفوع: ${paidNow}، المتبقي: ${newRemaining}`);

        } else {
            await cloudDb.update(COLLS.SALES, item.id, {
                status: SaleStatus.DELIVERED,
                actualDeliveryDate: today,
                remainingFromBride: newRemaining,
                staffName
            });

            if (paidNow > 0) {
                await cloudDb.add(COLLS.FINANCE, {
                    amount: paidNow,
                    type: 'INCOME',
                    category: 'تحصيل متبقي (تفصيل)',
                    notes: `تحصيل متبقي تفصيل فستان ${item.factoryCode} من العروس ${item.brideName} (عند التسليم)`,
                    date: today,
                    relatedId: item.id,
                    currency: calcState.currency !== 'EGP' ? calcState.currency : 'EGP',
                    currencyAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : paidNow,
                    exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1
                });
                showToast(`تم استلام مبلغ: ${formatCurrency(paidNow)}`);
            }
            addLog('تسليم بيع', `تم تسليم فستان التفصيل. المدفوع: ${paidNow}`);
        }

        if (paidNow === 0) showToast('تم التسليم (لم يتم دفع مبالغ إضافية)');
        setModal(null); setExtras([]); setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
    } catch (err) {
        showToast('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  // --- BIDIRECTIONAL CURRENCY CALCULATION ---
  const handlePaymentMethodChange = (pm: string) => {
      let curr = 'EGP';
      if (pm.includes('بنكك') || pm.includes('SDG')) curr = 'SDG';
      else if (pm.includes('دولار') || pm.includes('Western') || pm.includes('USD')) curr = 'USD';
      
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

  const handleReturnConfirm = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const hasDamage = fd.get('damage') === 'yes';
    const damageFee = hasDamage ? Number(fd.get('damage_fee')) : 0;
    
    try {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { 
        status: BookingStatus.COMPLETED, 
        actualReturnDate: today,
        damageFee: damageFee
      });
      await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.CLEANING });
      
      if (damageFee > 0) {
        await cloudDb.add(COLLS.FINANCE, {
          amount: damageFee, type: 'INCOME', category: 'خصم غرامة تلف',
          notes: `غرامة تلف فستان ${item.dressName} من العروس ${item.customerName}`,
          date: today, relatedId: item.id
        });
      }
      
      addLog('استلام فستان', `تم استلام فستان ${item.dressName} من العروس ${item.customerName}`);
      showToast('تم إتمام الاستلام بنجاح');
      setModal(null);
    } catch (err) {
      showToast('خطأ في التحديث', 'error');
    }
  };

  const undoDelivery = async (item: any) => {
    setModal({ type: 'CONFIRM_UNDO', item });
  };

  const executeUndo = async (item: any) => {
    try {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { status: BookingStatus.PENDING, actualPickupDate: null });
      await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.AVAILABLE });
      addLog('تراجع تسليم', `تم التراجع عن تسليم فستان ${item.dressName}`);
      showToast('تم التراجع عن التسليم');
      setModal(null);
    } catch (err) {
      showToast('خطأ', 'error');
    }
  };

  const openPrintModal = (data: any, mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE') => {
      setPrintModalData(data);
      setPrintModalMode(mode);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['delivery', 'return', 'archive'].map((t) => (
          <button 
            key={t}
            onClick={() => setSubTab(t as any)} 
            className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}
          >
            {t === 'delivery' ? 'قيد التسليم' : t === 'return' ? 'قيد الإرجاع' : 'الأرشيف'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subTab === 'delivery' && toDeliver.map((item: any) => (
          <Card key={item.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1.5 h-full opacity-20 ${item.type === 'SALE' ? 'bg-orange-500' : 'bg-brand-500'}`}></div>
            <div className="flex justify-between mb-4">
              <div>
                <h4 className="font-black text-white text-lg">{item.customerName || item.brideName}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${item.type === 'SALE' ? 'bg-orange-500/10 text-orange-400' : 'bg-brand-500/10 text-brand-400'}`}>{item.type === 'SALE' ? 'تفصيل' : 'إيجار'}</span>
                   <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{item.dressName || item.factoryCode}</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-brand-400 block mb-1 uppercase">المناسبة</span>
                <span className="text-sm font-black text-white">{item.eventDate || item.expectedDeliveryDate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setModal({ type: 'DELIVER_FORM', item }); setCalcState({ currency: 'EGP', egpAmount: item.remainingToPay || item.remainingFromBride, foreignAmount: 0, rate: 0 }); }} variant="success" className="flex-1 h-12 text-xs font-bold">تسليم للعروس</Button>
              <button 
                type="button" 
                onClick={() => openPrintModal(item, item.type === 'SALE' ? 'DEPOSIT' : 'RECEIPT')}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 transition-colors"
                title="طباعة"
              >
                <Printer size={20} />
              </button>
            </div>
          </Card>
        ))}

        {subTab === 'return' && toReturn.map((item: any) => (
          <Card key={item.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1.5 h-full opacity-20 bg-emerald-500`}></div>
            <div className="flex justify-between mb-4">
              <div>
                <h4 className="font-black text-white text-lg">{item.customerName}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400">إيجار</span>
                   <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{item.dressName}</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-brand-400 block mb-1">تاريخ التسليم</span>
                <span className="text-sm font-black text-white">{item.actualPickupDate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModal({ type: 'RETURN_FORM', item })} variant="success" className="flex-1 h-12 text-xs font-bold">استلام من العروس</Button>
              <button 
                onClick={() => undoDelivery(item)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-red-400 border border-white/10 transition-colors"
                title="تراجع عن التسليم"
              >
                <RotateCcw size={20} />
              </button>
              <button 
                onClick={() => openPrintModal(item, 'RECEIPT')}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 transition-colors"
                title="طباعة"
              >
                <Printer size={20} />
              </button>
            </div>
          </Card>
        ))}

        {subTab === 'archive' && archiveData.map((item: any) => (
          <Card key={item.id} className="relative opacity-80">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-white">{item.customerName || item.brideName}</h4>
              <div className="flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.type === 'SALE' ? 'bg-orange-500/10 text-orange-400' : 'bg-brand-500/10 text-brand-400'}`}>{item.type === 'SALE' ? 'تفصيل' : 'إيجار'}</span>
                 <button 
                    onClick={() => openPrintModal(item, item.type === 'SALE' ? 'DEPOSIT' : 'RECEIPT')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 transition-colors"
                    title="طباعة"
                 >
                    <Printer size={16} />
                 </button>
              </div>
            </div>
            <p className="text-[10px] font-bold text-surface-500 mb-3">{item.dressName || item.factoryCode}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/40 p-3 rounded-xl">
               <div><span className="block text-slate-500">تم التسليم:</span> <span className="font-bold">{item.actualPickupDate || item.actualDeliveryDate}</span></div>
               {item.type === 'RENT' && <div><span className="block text-slate-500">تم الاستلام:</span> <span className="font-bold">{item.actualReturnDate}</span></div>}
               <div className="col-span-2"><span className="text-slate-500">الموظف المسئول:</span> <span className="font-bold">{item.staffName || '---'}</span></div>
            </div>
          </Card>
        ))}

        {(subTab === 'delivery' ? toDeliver : subTab === 'return' ? toReturn : archiveData).length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 italic uppercase tracking-[0.3em]">
             <Truck size={48} className="mx-auto mb-4" />
             <p>No Items Pending</p>
          </div>
        )}
      </div>

      {modal?.type === 'CONFIRM_UNDO' && (
        <ConfirmModal 
          title="تراجع عن التسليم"
          msg="هل أنت متأكد من التراجع عن عملية التسليم؟"
          onConfirm={() => executeUndo(modal.item)}
          onCancel={() => setModal(null)}
          confirmText="نعم، تراجع"
        />
      )}

      {modal?.type === 'DELIVER_FORM' && (
        <Modal title={`إتمام تسليم: ${modal.item.customerName || modal.item.brideName}`} onClose={() => { setModal(null); setExtras([]); setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 }); }}>
          <form onSubmit={handleDeliverConfirm} className="space-y-6">
            <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl mb-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">إجمالي المبلغ المستحق على العروس</p>
                <p className="text-3xl font-black text-red-400 tracking-tighter">
                    {formatCurrency(modal.item.remainingToPay || modal.item.remainingFromBride)}
                </p>
            </div>

            <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4">تفاصيل الدفع (التحصيل)</label>
               <Input 
                  label="المبلغ المدفوع الآن بالمصري (EGP)" 
                  name="paid_now" 
                  type="number" 
                  value={calcState.egpAmount || ''} 
                  required 
                  onChange={(e:any) => handleCalc('EGP', Number(e.target.value))}
               />
               <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none mt-2" onChange={(e:any)=>handlePaymentMethodChange(e.target.value)}>
                  <option value="كاش (جنية مصري)">دفع نقدي (مصري)</option>
                  {PAYMENT_METHODS.filter(p => !p.includes('جنية')).map(p=><option key={p} value={p}>{p}</option>)}
               </select>

               {/* SMART CURRENCY CALCULATOR */}
               {calcState.currency !== 'EGP' && (
                 <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl animate-slide-up grid grid-cols-2 gap-4 mt-2">
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
            </div>
            
            {modal.item.type === 'RENT' && (
              <>
                <div className="p-5 bg-slate-950/50 border border-white/5 rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-widest">تفاصيل الأمنية</h4>
                  <select name="sec_type" onChange={(e:any)=>setModal({...modal, secType: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-white font-bold" required>
                    <option value="">-- اختر نوع الأمنية --</option>
                    <option value="مبلغ مالي">مبلغ مالي</option>
                    <option value="مستند">مستند (بطاقة/جواز)</option>
                    <option value="قطعة ذهب">قطعة ذهب</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  {modal.secType === 'مبلغ مالي' && <Input label="قيمة الأمنية المالية" name="sec_val" type="number" placeholder="ادخل المبلغ..." required />}
                  {(modal.secType === 'مستند' || modal.secType === 'قطعة ذهب' || modal.secType === 'أخرى') && (
                    <Input label="تفاصيل الأمنية" name="sec_detail" placeholder="ادخل التفاصيل..." required />
                  )}
                </div>

                <div className="p-5 bg-slate-950/50 border border-white/5 rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">إضافات وملحقات (Add-ons)</h4>
                  <div className="flex gap-2">
                    <input value={newExtra} onChange={e=>setNewExtra(e.target.value)} placeholder="مثال: طرحة خاصة، اكسسوار شعر..." className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm" />
                    <button type="button" onClick={()=>{ if(newExtra) { setExtras(p=>[...p, newExtra]); setNewExtra(''); } }} className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center"><PackagePlus size={20}/></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extras.map((ex, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                        {ex} <button type="button" onClick={()=>setExtras(p=>p.filter((_,i)=>i!==idx))} className="text-red-400"><MinusCircle size={14}/></button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
               <Button className="flex-1 !rounded-2xl h-16 shadow-xl">تأكيد عملية التسليم</Button>
               {/* Modal Printer Button with preview */}
               <button 
                 type="button" 
                 onClick={() => openPrintModal(modal.item, modal.item.type === 'SALE' ? 'DEPOSIT' : 'RECEIPT')}
                 className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 transition-colors"
                 title="طباعة"
               >
                 <Printer size={24} />
               </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'RETURN_FORM' && (
        <Modal title={`استلام فستان من العروس: ${modal.item.customerName}`} onClose={() => setModal(null)}>
          <div className="mb-6 space-y-4">
            <div className="p-5 bg-slate-950 border border-white/5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">الأمنية المستلمة</span>
              <p className="text-white font-bold">{modal.item.securityDeposit?.type}: {modal.item.securityDeposit?.detail || formatCurrency(modal.item.securityDeposit?.value)}</p>
            </div>
            <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-1">المتبقي غير المدفوع</span>
              <p className="text-xl font-black text-white">{formatCurrency(modal.item.remainingToPay)}</p>
            </div>
          </div>
          <form onSubmit={handleReturnConfirm} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-white uppercase px-4 italic opacity-60">حالة الفستان</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center h-14 rounded-2xl border cursor-pointer transition-all font-bold ${modal.hasDamage ? 'border-white/5 bg-slate-950' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
                  <input type="radio" name="damage" value="no" className="hidden" defaultChecked onChange={() => setModal({...modal, hasDamage: false})} /> سليم
                </label>
                <label className={`flex items-center justify-center h-14 rounded-2xl border cursor-pointer transition-all font-bold ${modal.hasDamage ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'border-white/5 bg-slate-950'}`}>
                  <input type="radio" name="damage" value="yes" className="hidden" onChange={() => setModal({...modal, hasDamage: true})} /> به تلف
                </label>
              </div>
            </div>
            {modal.hasDamage && (
              <div className="animate-slide-up">
                 <Input label="قيمة غرامة التلف (تخصم نقداً)" name="damage_fee" type="number" placeholder="ادخل القيمة..." required />
                 <p className="text-[10px] text-red-400 font-bold mt-2 px-4">سيتم تسجيل هذا المبلغ كإيراد نقدي تحت بند "خصم غرامة تلف".</p>
              </div>
            )}
            <div className="flex gap-2">
               <Button className="flex-1 !rounded-2xl h-16 shadow-xl">تأكيد الاستلام النهائي</Button>
               {/* Modal Printer Button with preview */}
               <button 
                 type="button" 
                 onClick={() => openPrintModal(modal.item, 'RECEIPT')}
                 className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 transition-colors"
                 title="طباعة"
               >
                 <Printer size={24} />
               </button>
            </div>
            <p className="text-center text-[10px] text-slate-500 font-bold">تأكيد الاستلام سيغير حالة الفستان تلقائياً إلى "يحتاج تنظيف".</p>
          </form>
        </Modal>
      )}

      {printModalData && (
          <PrintPreviewModal data={printModalData} mode={printModalMode} onClose={() => setPrintModalData(null)} onPrint={(imageSrc) => { onPrint(imageSrc); setPrintModalData(null); }} />
      )}
    </div>
  );
}