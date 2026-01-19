
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Printer, Ruler, Edit, Trash2, AlertTriangle, Calculator, RefreshCw, Check, MessageCircle, Calendar as CalendarIcon, List, ChevronRight, ChevronLeft } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { BookingStatus, DressType, DressStatus } from '../types';
import { Button, Input, Modal, Card, ConfirmModal } from '../components/UI';
import { today, formatCurrency, getWhatsAppLink, DEFAULT_WA_TEMPLATES, WATemplateKey } from '../utils/helpers';
import { PAYMENT_METHODS, MEASUREMENT_FIELDS, COUNTRY_CODES } from '../utils/constants';
import PrintPreviewModal from '../components/PrintPreviewModal';

export default function RentBookingsView({ dresses, bookings, finance, query, hasPerm, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past' | 'fittings'>('current');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modal, setModal] = useState<any>(null);
  const [pendingSave, setPendingSave] = useState<any>(null);
  const [printFilter, setPrintFilter] = useState({ month: '', selectedIds: [] as string[] });
  
  // Print Preview State
  const [printModalData, setPrintModalData] = useState<any>(null);
  const [printModalMode, setPrintModalMode] = useState<'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE'>('DEPOSIT');

  // Custom WA Templates State
  const [waTemplates, setWaTemplates] = useState(DEFAULT_WA_TEMPLATES);

  useEffect(() => {
      cloudDb.getDoc(COLLS.METADATA, 'whatsapp_templates').then(doc => {
          if (doc) setWaTemplates(doc);
      });
  }, []);

  // PHONE STATE
  const [phoneCode, setPhoneCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');

  // SMART CALCULATION STATE (Bidirectional)
  const [calcState, setCalcState] = useState({ 
    currency: 'EGP', 
    egpAmount: 0, 
    foreignAmount: 0, 
    rate: 0 
  });

  const filtered = useMemo(() => {
    return bookings.filter((b: any) => (b.customerName.toLowerCase().includes(query.toLowerCase()))).filter((b: any) => {
      if (subTab === 'current') return b.status !== BookingStatus.COMPLETED;
      if (subTab === 'past') return b.status === BookingStatus.COMPLETED;
      if (subTab === 'fittings') return (b.status === BookingStatus.PENDING || b.status === BookingStatus.ACTIVE);
      return true;
    }).sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate));
  }, [bookings, subTab, query]);

  const filteredForPrint = useMemo(() => {
    if (!printFilter.month) return [];
    return bookings.filter((b: any) => b.eventDate && b.eventDate.startsWith(printFilter.month))
        .sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate));
  }, [bookings, printFilter.month]);

  // --- CALENDAR LOGIC ---
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const startDay = (firstDayOfMonth.getDay() + 1) % 7; 

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({
            day: i,
            date: dateStr,
            bookings: bookings.filter((b: any) => b.eventDate === dateStr && b.status !== BookingStatus.CANCELLED)
        });
    }
    return days;
  }, [currentMonth, bookings]);

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentMonth(newDate);
  };

  const handleDelete = async (b: any) => {
    setModal({ type: 'CONFIRM_DELETE', data: b });
  };

  const executeDelete = async (b: any) => {
    try {
      await cloudDb.delete(COLLS.BOOKINGS, b.id);
      const relatedFinance = (finance || []).filter((f: any) => f.relatedId === b.id);
      for (const f of relatedFinance) {
        await cloudDb.delete(COLLS.FINANCE, f.id);
      }
      showToast('تم حذف الحجز وتصفية المالية');
      addLog('حذف حجز', `تم حذف حجز العروس ${b.customerName} وتصفية عملياته المالية`);
      setModal(null);
    } catch (err) {
      showToast('خطأ في الحذف', 'error');
    }
  };

  const handleFitting1Click = async (b: any) => {
      const isDone = b.fitting1Done;
      if (isDone) {
          await cloudDb.update(COLLS.BOOKINGS, b.id, { fitting1Done: false });
          return;
      }
      setModal({ type: 'CONFIRM_FITTING_WORKFLOW', data: b });
  };

  const executeFitting1 = async (measure: boolean, item: any) => {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { fitting1Done: true });
      if (measure) {
          setModal({ ...item, type: 'MEASURE' });
      } else {
          setModal(null);
          showToast('تم تأكيد البروفة');
      }
  };

  const openModal = (type: 'ADD' | 'EDIT', item?: any) => {
      if (type === 'EDIT' && item) {
          let code = '+20';
          let num = item.customerPhone || '';
          const found = COUNTRY_CODES.find(c => c.code && num.startsWith(c.code));
          if (found) {
              code = found.code;
              num = num.replace(code, '');
          } else if (num.startsWith('0')) {
              code = '+20';
          }
          setPhoneCode(code);
          setLocalPhone(num);
          setModal({ ...item, type: 'EDIT' });
      } else {
          setPhoneCode('+20');
          setLocalPhone('');
          setModal({ type: 'ADD' });
      }
      setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
  };

  const executeSave = async (data: any) => {
     let bId = data.id;
     const isAdd = !bId; 

     const finalData = {
        ...data,
        originalCurrency: calcState.currency !== 'EGP' ? calcState.currency : 'EGP',
        foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
        exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
     };

     if (isAdd) {
       bId = await cloudDb.add(COLLS.BOOKINGS, finalData);
       const dress = dresses.find((d: any) => d.id === finalData.dressId);
       if (dress) {
          await cloudDb.update(COLLS.DRESSES, dress.id, { rentalCount: (dress.rentalCount || 0) + 1 });
       }
       const deposit = Number(finalData.paidDeposit);
       if (deposit > 0) {
          await cloudDb.add(COLLS.FINANCE, {
            amount: deposit,
            currency: finalData.originalCurrency,
            currencyAmount: finalData.foreignAmount || deposit,
            exchangeRate: finalData.exchangeRate,
            type: 'INCOME', category: 'حجز إيجار',
            notes: `عربون حجز فستان ${finalData.dressName} للعروس ${finalData.customerName}`,
            date: finalData.createdAt, relatedId: bId
          });
       }
     } else {
       await cloudDb.update(COLLS.BOOKINGS, finalData.id, finalData);
     }
     showToast('تم الحفظ بنجاح'); 
     setModal(null); setPendingSave(null);
     setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
  };

  const handleWhatsAppClick = (b: any) => {
      setModal({ type: 'WHATSAPP_TEMPLATES', data: b });
  };

  const sendWhatsApp = (templateType: WATemplateKey, data: any) => {
      const waData = {
          Name: data.customerName,
          Dress: data.dressName,
          EventDate: data.eventDate,
          Fitting1: data.fitting1Date,
          Fitting2: data.fitting2Date,
          Deposit: data.paidDeposit,
          Remaining: data.remainingToPay
      };
      const url = getWhatsAppLink(data.customerPhone, templateType, waData, waTemplates);
      window.open(url, '_blank');
      setModal(null);
  };

  // --- BIDIRECTIONAL CURRENCY LOGIC ---
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

          // LOGIC: USD (*) | SDG (/)
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

  const openPrintModal = (data: any, mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE') => {
      setPrintModalData(data);
      setPrintModalMode(mode);
  };

  return (
    <div className="space-y-8 animate-fade-in">
       {/* Top Bar */}
       <div className="flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl p-2 rounded-3xl border-b border-white/5">
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
            {['current', 'past', 'fittings'].map(t => (
              <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 md:flex-none px-4 h-10 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
                {t === 'current' ? 'نشط' : t === 'past' ? 'منتهي' : 'البروفات'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
             <button 
               onClick={() => setViewMode('list')}
               className={`flex-1 md:flex-none w-12 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
             >
               <List size={20} />
             </button>
             <button 
               onClick={() => setViewMode('calendar')}
               className={`flex-1 md:flex-none w-12 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
             >
               <CalendarIcon size={18} />
             </button>
          </div>
      </div>

      <div className="flex gap-2">
        {subTab === 'current' && hasPerm('add_booking') && <Button onClick={() => openModal('ADD')} className="flex-1 !rounded-[2.5rem] h-16 shadow-xl"><Plus size={20}/> تسجيل حجز جديد</Button>}
        {subTab === 'current' && <Button variant="ghost" onClick={() => setModal({ type: 'PRINT_SCHEDULE' })} className="!w-16 !h-16 !rounded-[2.5rem] border-white/10"><Printer size={22}/></Button>}
      </div>

      {/* VIEW: CALENDAR */}
      {viewMode === 'calendar' && (
        <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between bg-slate-900 border border-white/5 p-4 rounded-3xl">
                <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><ChevronRight /></button>
                <h3 className="text-lg font-black text-white">{currentMonth.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><ChevronLeft /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(d => (
                    <div key={d} className="text-center py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
                ))}
                {calendarData.map((d, idx) => {
                    if (!d) return <div key={idx} className="bg-transparent h-24 md:h-32"></div>;
                    const isToday = d.date === today;
                    return (
                        <div key={idx} className={`bg-slate-900 border ${isToday ? 'border-brand-500 shadow-brand-500/20 shadow-md' : 'border-white/5'} rounded-xl p-1 h-24 md:h-32 flex flex-col gap-1 overflow-hidden relative`}>
                            <span className={`text-[10px] font-black absolute top-1 right-2 ${isToday ? 'text-brand-400' : 'text-slate-600'}`}>{d.day}</span>
                            <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {d.bookings.map((b: any) => (
                                    <button 
                                        key={b.id} 
                                        onClick={() => openModal('EDIT', b)}
                                        className={`w-full text-right px-1.5 py-1 rounded text-[8px] md:text-[9px] font-bold truncate block ${b.status === BookingStatus.ACTIVE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}
                                    >
                                        {b.customerName.split(' ')[0]} - {b.dressName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* VIEW: LIST */}
      {viewMode === 'list' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subTab === 'fittings' ? (
          filtered.map((b: any) => (
            <Card key={b.id}>
              <div className="flex justify-between items-start mb-4">
                <div><h4 className="text-xl font-black text-white">{b.customerName}</h4><p className="text-xs font-bold text-surface-500 mt-1 italic">{b.dressName}</p></div>
                <div className="text-left"><p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">المناسبة</p><p className="text-sm font-black text-white">{b.eventDate}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${b.fitting1Done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-white/5'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">البروفه الأولى</p>
                  <Button variant={b.fitting1Done ? 'success' : 'ghost'} className="w-full h-10 text-xs" onClick={() => handleFitting1Click(b)}>{b.fitting1Done ? 'تمت البروفه' : 'تأكيد الأولى'}</Button>
                </div>
                <div className={`p-4 rounded-2xl border ${b.fitting2Done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-white/5'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">البروفه الثانية</p>
                  <Button variant={b.fitting2Done ? 'success' : 'ghost'} className="w-full h-10 text-xs" onClick={() => cloudDb.update(COLLS.BOOKINGS, b.id, { fitting2Done: !b.fitting2Done })}>{b.fitting2Done ? 'تمت البروفه' : 'تأكيد الثانية'}</Button>
                </div>
              </div>
            </Card>
          ))
        ) : filtered.map((b: any) => {
          const hasMeasurements = b.measurements && Object.keys(b.measurements).length > 0;
          return (
            <Card key={b.id} className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-500 opacity-20"></div>
              <div className="flex justify-between items-start mb-6">
                <div><h4 className="text-xl font-black text-white tracking-tight">{b.customerName}</h4><p className="text-xs font-bold text-surface-500 mt-1 tracking-widest" dir="ltr">{b.customerPhone}</p></div>
                <span className="px-3 py-1 bg-brand-500/10 text-brand-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-500/10">{b.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-6 bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-6">
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">الفستان</span><p className="text-sm font-bold text-white italic truncate">{b.dressName}</p></div>
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">المناسبة</span><p className="text-sm font-bold text-white tracking-tight">{b.eventDate}</p></div>
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">المتبقي</span><p className="text-sm font-black text-red-400">{formatCurrency(b.remainingToPay)}</p></div>
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">تاريخ التسليم</span><p className="text-sm font-black text-emerald-400 tracking-tight">{b.deliveryDate}</p></div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleWhatsAppClick(b)} className="!w-12 !h-12 !p-0 text-emerald-500 hover:bg-emerald-500/10"><MessageCircle size={18}/></Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setModal({ ...b, type: 'MEASURE' })} 
                  className={`flex-1 !h-12 !text-[10px] font-bold ${hasMeasurements ? 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' : 'text-orange-400 bg-orange-500/5 hover:bg-orange-500/10'}`}
                >
                  {hasMeasurements ? <Check size={16}/> : <Ruler size={16}/>}
                  {hasMeasurements ? 'تم أخذ المقاسات' : 'لم يتم تسجيل المقاسات'}
                </Button>
                <Button variant="ghost" onClick={() => openPrintModal(b, 'DEPOSIT')} className="!w-12 !h-12 !p-0 text-brand-400"><Printer size={18}/></Button>
                <Button variant="ghost" onClick={() => openModal('EDIT', b)} className="!w-12 !h-12 !p-0 text-surface-500"><Edit size={18}/></Button>
                <Button variant="ghost" onClick={() => handleDelete(b)} className="!w-12 !h-12 !p-0 text-red-400"><Trash2 size={18}/></Button>
              </div>
            </Card>
          );
        })}
      </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {modal?.type === 'CONFIRM_DELETE' && (
        <ConfirmModal 
          title="حذف الحجز"
          msg="سيتم حذف الحجز وكافة العمليات المالية المرتبطة به. هل أنت متأكد؟"
          onConfirm={() => executeDelete(modal.data)}
          onCancel={() => setModal(null)}
          confirmText="نعم، حذف نهائي"
        />
      )}

      {/* CONFIRM FITTING WORKFLOW MODAL */}
      {modal?.type === 'CONFIRM_FITTING_WORKFLOW' && (
        <Modal title="تأكيد البروفة الأولى" onClose={() => setModal(null)} size="sm">
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                   <Check size={40} />
               </div>
               <div>
                   <h3 className="font-black text-white text-xl">تم تأكيد البروفة</h3>
                   <p className="text-sm text-slate-400 mt-2">هل تريد تسجيل المقاسات الآن أم الاكتفاء بتحديث الحالة؟</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <Button variant="ghost" onClick={() => executeFitting1(false, modal.data)}>تأكيد فقط</Button>
                   <Button variant="success" onClick={() => executeFitting1(true, modal.data)}>تأكيد وتسجيل مقاسات</Button>
               </div>
            </div>
        </Modal>
      )}

      {/* WHATSAPP TEMPLATES MODAL */}
      {modal?.type === 'WHATSAPP_TEMPLATES' && (
        <Modal title="مراسلة العروس (واتساب)" onClose={() => setModal(null)} size="sm">
           <div className="space-y-4">
              <p className="text-sm font-bold text-slate-400 text-center mb-4">اختر نوع الرسالة للإرسال:</p>
              <button onClick={() => sendWhatsApp('BOOKING_CONFIRM', modal.data)} className="w-full p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center gap-4 hover:bg-brand-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0"><Check size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">تأكيد الحجز</h4><p className="text-[10px] text-slate-400">رسالة ترحيب وتفاصيل المواعيد والعربون</p></div>
              </button>
              <button onClick={() => sendWhatsApp('PICKUP_READY', modal.data)} className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 hover:bg-blue-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"><Check size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">التجهيز والاستلام</h4><p className="text-[10px] text-slate-400">إشعار بجاهزية الفستان والمتبقي المالي</p></div>
              </button>
              <button onClick={() => sendWhatsApp('RETURN_THANKS', modal.data)} className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 hover:bg-emerald-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">شكر بعد الإرجاع</h4><p className="text-[10px] text-slate-400">رسالة شكر ووداع لطيفة</p></div>
              </button>
              <button onClick={() => sendWhatsApp('PAYMENT_REMINDER', modal.data)} className="w-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-4 hover:bg-orange-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0"><AlertTriangle size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">تذكير عام</h4><p className="text-[10px] text-slate-400">تذكير بموعد أو دفعة مالية</p></div>
              </button>
           </div>
        </Modal>
      )}

      {/* Modal - Print Schedule */}
      {modal?.type === 'PRINT_SCHEDULE' && (
        <Modal title="طباعة جدول الحجوزات" onClose={() => setModal(null)} size="lg">
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <Input label="فلترة بالشهر" type="month" onChange={(e:any) => setPrintFilter({...printFilter, month: e.target.value})} />
                 <div className="flex items-end">
                    <Button variant="ghost" onClick={() => setPrintFilter({...printFilter, selectedIds: filteredForPrint.length === printFilter.selectedIds.length ? [] : filteredForPrint.map((b:any)=>b.id)})} className="w-full">
                       {filteredForPrint.length === printFilter.selectedIds.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </Button>
                 </div>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-2xl bg-slate-950/50 p-4 space-y-2">
                 {filteredForPrint.length === 0 ? <p className="text-center text-slate-500 py-4 text-xs font-bold">لا توجد حجوزات في هذا التاريخ</p> : filteredForPrint.map((b:any) => (
                   <label key={b.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl cursor-pointer border border-transparent hover:border-white/10 transition-all">
                      <input 
                        type="checkbox" 
                        checked={printFilter.selectedIds.includes(b.id)} 
                        onChange={() => {
                           const ids = printFilter.selectedIds.includes(b.id) 
                             ? printFilter.selectedIds.filter(id=>id!==b.id) 
                             : [...printFilter.selectedIds, b.id];
                           setPrintFilter({...printFilter, selectedIds: ids});
                        }} 
                        className="w-5 h-5 accent-brand-500"
                      />
                      <div className="flex-1">
                         <div className="flex justify-between"><span className="font-bold text-white text-sm">{b.customerName}</span><span className="text-xs text-brand-400 font-bold">{b.eventDate}</span></div>
                         <p className="text-[10px] text-slate-500 font-bold mt-0.5">{b.dressName}</p>
                      </div>
                   </label>
                 ))}
              </div>
              <Button onClick={() => {
                 const data = filteredForPrint.filter((b:any) => printFilter.selectedIds.length === 0 || printFilter.selectedIds.includes(b.id));
                 if(data.length === 0) return showToast('اختر حجز واحد على الأقل', 'error');
                 openPrintModal(data, 'SCHEDULE');
                 setModal(null);
              }} className="w-full !rounded-2xl">إكمال الطباعة ({printFilter.selectedIds.length || filteredForPrint.length})</Button>
           </div>
        </Modal>
      )}

      {/* Modal - Add/Edit Booking */}
      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'حجز جديد' : 'تعديل حجز'} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e: any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const drId = fd.get('dr') as string;
             const dr = dresses.find((x:any) => x.id === drId);
             const rp = Number(fd.get('rp')); 
             const dep = calcState.egpAmount; // Use Calculated EGP Value
             const fullPhone = `${phoneCode}${localPhone}`.trim();

             const data: any = {
               customerName: fd.get('cn'), 
               customerPhone: fullPhone,
               customerAddress: fd.get('ca'),
               dressId: drId, dressName: dr?.name || '', eventDate: fd.get('ed'), deliveryDate: fd.get('dd'),
               rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep, notes: fd.get('notes'),
               status: modal.status || BookingStatus.PENDING, 
               createdAt: modal.createdAt || today,
               paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || '',
               // Currency Details
               originalCurrency: calcState.currency,
               foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
               exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
             };

             if (modal.type === 'EDIT') data.id = modal.id;
             
             if (dep > rp) {
                 setPendingSave({ ...data, id: modal.id, isEdit: modal.type === 'EDIT' });
                 setModal({ type: 'VALIDATION_WARNING', msg: 'قيمة العربون أكبر من سعر الإيجار!' });
                 return;
             }

             if (data.status !== BookingStatus.CANCELLED && data.status !== BookingStatus.COMPLETED) {
                 const targetDate = new Date(data.eventDate);
                 const conflicts = bookings.filter((b: any) => {
                     if (b.dressId !== data.dressId) return false;
                     if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED) return false;
                     if (modal.type === 'EDIT' && b.id === modal.id) return false;
                     const bDate = new Date(b.eventDate);
                     const diff = Math.abs(targetDate.getTime() - bDate.getTime());
                     return Math.ceil(diff / (1000 * 3600 * 24)) <= 2;
                 });

                 if (conflicts.length > 0) {
                     setPendingSave(data);
                     setModal({ type: 'CONFLICT_WARNING', conflicts });
                     return;
                 }
             }

             await executeSave(data);
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
               <Input label="سعر الإيجار (EGP)" name="rp" type="number" defaultValue={modal.rentalPrice} required />
               <Input label="العربون بالمصري (EGP)" name="dep" type="number" value={calcState.egpAmount || ''} required onChange={(e:any) => handleCalc('EGP', Number(e.target.value))} />
             </div>

             <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع (العربون)</label>
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

             <div className="space-y-2">
               <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">الفستان</label>
               <select name="dr" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all" defaultValue={modal.dressId} required>
                 <option value="">-- اختر الفستان --</option>
                 {dresses.filter((d:any) => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD).sort((a:any,b:any) => a.name.localeCompare(b.name, 'ar')).map((d:any) => (<option key={d.id} value={d.id}>{d.name} ({d.status})</option>))}
               </select>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <Input label="تاريخ المناسبة" name="ed" type="date" defaultValue={modal.eventDate} required onChange={(e:any) => {
                  if (modal.type === 'ADD' || !modal.deliveryDate) {
                    const eventDate = new Date(e.target.value);
                    if (!isNaN(eventDate.getTime())) {
                      eventDate.setDate(eventDate.getDate() - 1);
                      const suggested = eventDate.toISOString().split('T')[0];
                      const ddInput = document.querySelector('input[name="dd"]') as HTMLInputElement;
                      if (ddInput) ddInput.value = suggested;
                    }
                  }
               }} />
               <Input label="تاريخ التسليم" name="dd" type="date" defaultValue={modal.deliveryDate} required />
             </div>
             
             <textarea name="notes" placeholder="ملاحظات..." defaultValue={modal.notes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold min-h-[100px]" />
             <Button className="w-full mt-4 !rounded-2xl">حفظ الحجز</Button>
           </form>
        </Modal>
      )}

      {modal?.type === 'VALIDATION_WARNING' && (
        <Modal title="تنبيه هام" onClose={() => setModal(null)}>
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 border border-orange-500/20"><AlertTriangle size={40} /></div>
               <div><h3 className="font-black text-white text-xl">{modal.msg}</h3><p className="text-sm text-slate-400 mt-2">يرجى مراجعة البيانات المدخلة.</p></div>
               <Button onClick={() => setModal({ ...pendingSave, type: pendingSave.isEdit ? 'EDIT' : 'ADD' })} className="w-full">تعديل البيانات</Button>
            </div>
        </Modal>
      )}

      {modal?.type === 'CONFLICT_WARNING' && (
        <Modal title="تحذير تعارض حجوزات" onClose={() => setModal(null)}>
            <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-2"><AlertTriangle size={32} /></div>
                <h3 className="text-lg font-bold text-white">يوجد حجوزات قريبة لهذا الفستان</h3>
                <p className="text-sm text-slate-400">الفستان محجوز في تواريخ قريبة جداً (يومين قبل أو بعد). هل أنت متأكد من الاستمرار؟</p>
                <div className="bg-slate-950/50 rounded-xl p-4 text-right space-y-2 max-h-40 overflow-y-auto custom-scrollbar border border-white/5">
                    {modal.conflicts.map((c: any) => (
                        <div key={c.id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-white font-bold text-sm">{c.customerName}</p>
                            <p className="text-xs text-brand-400 font-bold mt-1">تاريخ المناسبة: {c.eventDate}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
                    <Button variant="danger" onClick={() => executeSave(pendingSave)}>استمرار وحفظ</Button>
                </div>
            </div>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title="تسجيل المقاسات" onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {};
            MEASUREMENT_FIELDS.forEach(f => { m[f.id] = fd.get(f.id); });
            m.unit = fd.get('unit');
            m.orderNotes = fd.get('orderNotes');
            const coll = modal.factoryCode ? COLLS.SALES : COLLS.BOOKINGS;
            await cloudDb.update(coll, modal.id, { measurements: m });
            showToast('تم حفظ المقاسات'); setModal(null);
          }} className="space-y-8">
            <div className="flex bg-slate-950 p-2 rounded-2xl border border-white/5 justify-around">
               <label className="flex items-center gap-2 font-bold"><input type="radio" name="unit" value="cm" defaultChecked /> سم</label>
               <label className="flex items-center gap-2 font-bold"><input type="radio" name="unit" value="inch" /> إنش</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEASUREMENT_FIELDS.filter(f => !['bustType', 'skirtType', 'materials'].includes(f.id)).map(f => <Input key={f.id} label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEASUREMENT_FIELDS.filter(f => ['bustType', 'skirtType', 'materials'].includes(f.id)).map(f => <Input key={f.id} label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />)}
            </div>
            <textarea name="orderNotes" placeholder="ملاحظات الشرح الإضافي..." defaultValue={modal.measurements?.orderNotes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 text-white font-bold h-32 outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
            <div className="flex gap-4">
              <Button className="flex-1 !rounded-2xl">حفظ المقاسات</Button>
              <Button type="button" onClick={() => openPrintModal(modal, 'SIZES')} variant="ghost" className="!rounded-2xl"><Printer size={20}/></Button>
            </div>
          </form>
        </Modal>
      )}

      {printModalData && (
          <PrintPreviewModal data={printModalData} mode={printModalMode} onClose={() => setPrintModalData(null)} onPrint={(imageSrc) => { onPrint(imageSrc); setPrintModalData(null); }} />
      )}
    </div>
  );
}
