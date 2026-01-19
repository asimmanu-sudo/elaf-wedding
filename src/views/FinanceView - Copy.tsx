
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Plus, CalendarDays, Clock, TrendingUp, ArrowDownCircle, DollarSign, LogOut, Wallet, RefreshCw, Calculator } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { DressType, DressStatus, BookingStatus, SaleStatus } from '../types';
import { Button, Input, Modal, Card } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';
import { FINANCE_CATEGORIES, DEFAULT_RENT_OPS_FEE, DEFAULT_STAFF_RATIO, CURRENCIES } from '../utils/constants';

export default function FinanceView({ finance, dresses, users, bookings, sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'logs' | 'analysis' | 'performance'>('logs');
  const [modal, setModal] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Exchange State (Unified for calculations)
  const [exchangeState, setExchangeState] = useState({ 
      fromCurrency: 'SDG', 
      amount: 0, 
      rate: 0,
      targetEGP: 0 
  });

  // WALLET CALCULATION
  const wallets = useMemo(() => {
      const bals = { EGP: 0, SDG: 0, USD: 0 };
      finance.forEach((f: any) => {
          if (f.isFuture) return;
          const curr = (f.currency || 'EGP') as keyof typeof bals;
          const amt = f.currencyAmount || f.amount || 0;

          if (f.type === 'INCOME' || f.type === 'EXCHANGE_IN') {
              bals[curr] += amt;
          } else if (f.type === 'EXPENSE' || f.type === 'EXCHANGE_OUT') {
              bals[curr] -= amt;
          }
      });
      return bals;
  }, [finance]);

  const activeBookings = useMemo(() => bookings.filter((b: any) => 
    b.status === BookingStatus.PENDING || b.status === BookingStatus.ACTIVE
  ), [bookings]);
  
  const activeSales = useMemo(() => sales.filter((s: any) => 
    s.status !== SaleStatus.DELIVERED && s.status !== SaleStatus.CANCELLED
  ), [sales]);

  const totalRentRemaining = useMemo(() => activeBookings.reduce((sum: number, b: any) => sum + (b.remainingToPay || 0), 0), [activeBookings]);
  const totalSaleRemaining = useMemo(() => activeSales.reduce((sum: number, s: any) => sum + (s.remainingFromBride || 0), 0), [activeSales]);

  const filteredFinance = useMemo(() => {
    let list = finance.filter((f: any) => !f.isFuture);
    return list.filter((f: any) => {
      const matchesQuery = (f.category || '').includes(query) || (f.notes || '').includes(query);
      const matchesDate = (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate);
      const matchesCategory = selectedCats.length === 0 || selectedCats.includes(f.category);
      return matchesQuery && matchesDate && matchesCategory;
    }).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [finance, query, startDate, endDate, selectedCats]);

  const totals = useMemo(() => {
    const inc = filteredFinance.filter((f: any) => f.type === 'INCOME').reduce((s: any, f: any) => s + f.amount, 0);
    const exp = filteredFinance.filter((f: any) => f.type === 'EXPENSE').reduce((s: any, f: any) => s + f.amount, 0);
    return { inc, exp, profit: inc - exp };
  }, [filteredFinance]);

  const handleWithdraw = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const liquidEGP = wallets.EGP;
    if (amount > liquidEGP) {
        showToast(`رصيد الكاش المصري غير كافٍ. المتاح: ${formatCurrency(liquidEGP)}`, 'error');
        return;
    }
    await cloudDb.add(COLLS.FINANCE, {
       amount, type: 'EXPENSE', category: 'سحب للمنزل (مسحوبات مالك)', 
       currency: 'EGP', currencyAmount: amount,
       notes: fd.get('notes') || 'سحب شخصي', date: today
    });
    await cloudDb.add(COLLS.PERSONAL, {
       docType: 'TRANSACTION', type: 'INCOME', amount, currency: 'EGP', date: today, 
       category: 'مسحوبات من المحل', description: 'تحويل تلقائي من مالية المحل'
    });
    showToast('تم السحب وتسجيله في ميزانية البيت');
    setModal(null);
  };

  const performance = useMemo(() => {
    return dresses.filter((d: any) => d.type === DressType.RENT).map((d: any) => {
      const bookingsForDress = bookings.filter((b: any) => b.dressId === d.id && b.status !== BookingStatus.CANCELLED);
      const rentalIncome = bookingsForDress.reduce((s: any, b: any) => s + b.rentalPrice, 0);
      const salesIncome = d.status === DressStatus.SOLD ? (d.salePrice || 0) : 0;
      const relatedExpenses = finance.filter((f: any) => f.type === 'EXPENSE' && f.relatedDresses?.includes(d.name))
                                     .reduce((s: any, f: any) => s + f.amount, 0);
      const totalExpense = d.factoryPrice + relatedExpenses;
      const totalIncome = rentalIncome + salesIncome;
      return { ...d, income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense, usageCount: bookingsForDress.length };
    }).sort((a: any, b: any) => b.profit - a.profit);
  }, [dresses, bookings, finance]);

  const analysis = useMemo(() => {
      const expMap: Record<string, number> = {};
      const incMap: Record<string, number> = {};
      filteredFinance.forEach((f: any) => {
          if (f.type === 'EXPENSE') expMap[f.category] = (expMap[f.category] || 0) + f.amount;
          else if (f.type === 'INCOME') incMap[f.category] = (incMap[f.category] || 0) + f.amount;
      });
      return {
          expenses: Object.entries(expMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b)=>b.value-a.value),
          income: Object.entries(incMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b)=>b.value-a.value)
      };
  }, [filteredFinance]);

  // Unified calc state for ADD modal
  const [addCalcState, setAddCalcState] = useState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get('t') as 'INCOME' | 'EXPENSE';
    const amount = addCalcState.currency === 'EGP' ? Math.abs(Number(fd.get('a'))) : addCalcState.egpAmount;
    const currency = addCalcState.currency;
    const currencyAmount = currency === 'EGP' ? amount : addCalcState.foreignAmount;

    const data: any = { 
        date: fd.get('d') || today, 
        type, 
        amount, 
        currency,
        currencyAmount,
        category: fd.get('c'), 
        notes: fd.get('n') || '',
        exchangeRate: currency !== 'EGP' ? addCalcState.rate : 1
    };

    if (type === 'EXPENSE') {
      if (data.category === 'رواتب') data.targetUser = fd.get('tu');
      if (['تنظيف', 'ترزي'].includes(data.category)) {
        data.relatedDresses = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => (c as HTMLInputElement).value);
      }
    }
    await cloudDb.add(COLLS.FINANCE, data);
    showToast('تم تسجيل عملية مالية بنجاح'); setModal(null);
  };

  const handleExchange = async () => {
      const { fromCurrency, amount, targetEGP } = exchangeState;
      if (amount <= 0 || targetEGP <= 0) return alert('القيم غير صحيحة');
      const currentBalance = wallets[fromCurrency as keyof typeof wallets];
      if (amount > currentBalance) return alert(`الرصيد غير كافٍ. المتاح: ${currentBalance}`);

      await cloudDb.add(COLLS.FINANCE, {
          type: 'EXCHANGE_OUT', category: 'تحويل عملة', date: today,
          amount: targetEGP, currency: fromCurrency, currencyAmount: amount,
          notes: `تحويل ${amount} ${fromCurrency} إلى مصري`
      });

      await cloudDb.add(COLLS.FINANCE, {
          type: 'EXCHANGE_IN', category: 'تحويل عملة', date: today,
          amount: targetEGP, currency: 'EGP', currencyAmount: targetEGP,
          notes: `استلام مقابل تحويل ${amount} ${fromCurrency}`
      });

      showToast('تم تحويل العملة بنجاح'); setModal(null);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // Handlers for Exchange Calc (Bidirectional)
  const handleExchangeCalc = (type: 'RATE' | 'AMOUNT' | 'EGP', val: number) => {
      setExchangeState(prev => {
          const newState = { ...prev };
          if (type === 'RATE') newState.rate = val;
          if (type === 'AMOUNT') newState.amount = val;
          if (type === 'EGP') newState.targetEGP = val;
          
          const { fromCurrency, amount, rate, targetEGP } = newState;
          
          if (type === 'RATE') {
              if (amount > 0) newState.targetEGP = fromCurrency === 'SDG' ? (rate > 0 ? amount / rate : 0) : amount * rate;
          } else if (type === 'AMOUNT') {
              newState.targetEGP = fromCurrency === 'SDG' ? (rate > 0 ? val / rate : 0) : val * rate;
          } else if (type === 'EGP') {
              newState.amount = fromCurrency === 'SDG' ? val * rate : (rate > 0 ? val / rate : 0);
          }
          
          newState.amount = parseFloat(Number(newState.amount).toFixed(2));
          newState.targetEGP = parseFloat(Number(newState.targetEGP).toFixed(2));
          return newState;
      });
  };

  // Handlers for ADD modal Calc (Bidirectional)
  const handleAddCalc = (type: 'EGP' | 'FOREIGN' | 'RATE', val: number) => {
      setAddCalcState(prev => {
          const newState = { ...prev };
          if (type === 'RATE') newState.rate = val;
          if (type === 'FOREIGN') newState.foreignAmount = val;
          if (type === 'EGP') newState.egpAmount = val;
          
          const { currency, rate, foreignAmount, egpAmount } = newState;

          if (type === 'RATE') {
              if (foreignAmount > 0) newState.egpAmount = currency === 'USD' ? foreignAmount * rate : (rate > 0 ? foreignAmount / rate : 0);
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

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['logs', 'analysis', 'performance'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'logs' ? 'سجل العمليات' : t === 'analysis' ? 'التحليلات' : 'أداء الفساتين'}
          </button>
        ))}
      </div>

      {/* WALLETS SECTION */}
      <div className="grid grid-cols-3 gap-3">
         <div className="bg-slate-950 p-4 rounded-3xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">EGP (كاش)</p>
             <p className="text-xl font-black text-white" dir="ltr">{formatCurrency(wallets.EGP)}</p>
         </div>
         <div className="bg-slate-950 p-4 rounded-3xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">SDG (بنكك)</p>
             <p className="text-xl font-black text-white" dir="ltr">{formatCurrency(wallets.SDG)}</p>
         </div>
         <div className="bg-slate-950 p-4 rounded-3xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">USD (دولار)</p>
             <p className="text-xl font-black text-white" dir="ltr">{new Intl.NumberFormat('en-US').format(wallets.USD)}</p>
         </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Button variant="ghost" className="flex-1 h-12" onClick={() => setShowFilters(!showFilters)}>
           <Filter size={18} /> {showFilters ? 'إخفاء الفلاتر' : 'تصفية النتائج'}
        </Button>
        {hasPerm('add_finance') && (
          <>
            <Button onClick={() => setModal({ type: 'ADD' })} className="flex-1 h-12"><Plus size={18}/> إضافة عملية</Button>
            <Button onClick={() => setModal({ type: 'WITHDRAW' })} variant="danger" className="flex-1 h-12 bg-red-500/10 hover:bg-red-500 border-red-500/20 text-red-400"><LogOut size={18}/> سحب للمنزل</Button>
            <Button onClick={() => { setModal({ type: 'EXCHANGE' }); setExchangeState({ fromCurrency: 'SDG', amount: 0, rate: 0, targetEGP: 0 }); }} className="flex-1 h-12 bg-blue-500/10 hover:bg-blue-500 border-blue-500/20 text-blue-400"><RefreshCw size={18}/> تحويل عملة</Button>
          </>
        )}
      </div>

      {showFilters && (
        <Card className="animate-slide-up bg-slate-900/40 border-brand-500/20">
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input label="من تاريخ" type="date" value={startDate} onChange={(e:any)=>setStartDate(e.target.value)} icon={CalendarDays} />
                <Input label="إلى تاريخ" type="date" value={endDate} onChange={(e:any)=>setEndDate(e.target.value)} icon={CalendarDays} />
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest px-4">تصفية حسب البند</p>
                 <div className="flex flex-wrap gap-2">
                    {FINANCE_CATEGORIES.filter(c => !c.includes('(مستقبلية)')).map(cat => (
                      <button key={cat} onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${selectedCats.includes(cat) ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-950 border-white/5 text-slate-500'}`}>{cat}</button>
                    ))}
                    {selectedCats.length > 0 && <button onClick={() => setSelectedCats([])} className="px-4 py-2 rounded-xl text-[11px] font-black text-red-500">مسح الكل</button>}
                 </div>
              </div>
           </div>
        </Card>
      )}

      {subTab === 'logs' && (
        <div className="space-y-3">
           {filteredFinance.map((f: any) => (
             <Card key={f.id} className={`!py-4 flex items-center justify-between group`}>
               <div className="flex items-center gap-4">
                 <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${f.type === 'INCOME' || f.type === 'EXCHANGE_IN' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-500' : 'bg-red-500/10 border-red-500/10 text-red-500'}`}>
                     {f.type.includes('INCOME') || f.type.includes('IN') ? <TrendingUp size={18}/> : <ArrowDownCircle size={18}/>}
                 </div>
                 <div>
                     <h4 className="font-black text-sm text-white">{f.category}</h4>
                     <p className="text-[10px] text-slate-500 font-bold mt-0.5">{f.date} • {f.notes}</p>
                 </div>
               </div>
               <div className="text-left flex flex-col items-end">
                 <span className={`text-base font-black tracking-tighter ${f.type.includes('IN') ? 'text-emerald-400' : 'text-red-400'}`}>
                     {f.type.includes('IN') ? '+' : '-'}{formatCurrency(f.currencyAmount || f.amount)} <span className="text-[9px] uppercase opacity-70">{f.currency || 'EGP'}</span>
                 </span>
                 {hasPerm('admin_reset') && (
                     <button onClick={async () => { if(confirm('حذف السجل المالي؟')) cloudDb.delete(COLLS.FINANCE, f.id); }} className="text-[9px] text-red-500/50 mt-1 hover:text-red-500 transition-colors">حذف</button>
                 )}
               </div>
             </Card>
           ))}
           {filteredFinance.length === 0 && <div className="text-center py-20 opacity-20"><DollarSign size={64} className="mx-auto mb-4"/><p className="font-black uppercase tracking-widest text-sm">No results match filters</p></div>}
        </div>
      )}

      {subTab === 'analysis' && (
        <div className="space-y-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-3xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-2 opacity-60">وارد (+)</span>
                  <p className="text-lg font-black text-emerald-200 tracking-tighter">{formatCurrency(totals.inc)}</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-3xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-2 opacity-60">منصرف (-)</span>
                  <p className="text-lg font-black text-red-200 tracking-tighter">{formatCurrency(totals.exp)}</p>
              </div>
              <div className="bg-brand-500/5 border border-brand-500/10 p-4 rounded-3xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest block mb-2 opacity-60">الربح الصافي</span>
                  <p className="text-lg font-black text-brand-200 tracking-tighter">{formatCurrency(totals.profit)}</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-3xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2 opacity-60">تحصيلات مستقبلية</span>
                  <p className="text-lg font-black text-blue-200 tracking-tighter">{formatCurrency(totalRentRemaining + totalSaleRemaining)}</p>
              </div>
           </div>
           {/* Charts omitted for brevity but logic remains unchanged */}
        </div>
      )}

      {subTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {performance.map((d: any) => (
             <Card key={d.id} className="relative overflow-hidden">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="font-black text-white">{d.name}</h4>
                 <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${d.profit > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {d.profit > 0 ? 'ربح' : 'خسارة'}
                 </span>
               </div>
               <div className="grid grid-cols-3 gap-2 text-center mt-4">
                  <div className="bg-slate-950 p-2 rounded-xl">
                     <span className="text-[9px] text-slate-500 block">إيراد</span>
                     <span className="text-xs font-black text-emerald-400">{formatCurrency(d.income)}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl">
                     <span className="text-[9px] text-slate-500 block">تكلفة</span>
                     <span className="text-xs font-black text-red-400">{formatCurrency(d.expense)}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl">
                     <span className="text-[9px] text-slate-500 block">مرات الإيجار</span>
                     <span className="text-xs font-black text-brand-400">{d.usageCount}</span>
                  </div>
               </div>
             </Card>
           ))}
        </div>
      )}

      {modal?.type === 'WITHDRAW' && (
         <Modal title="سحب نقدي للمنزل" onClose={() => setModal(null)}>
            <form onSubmit={handleWithdraw} className="space-y-6">
               <div className="p-4 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-center">
                  <p className="text-[10px] text-brand-400 uppercase tracking-widest mb-1">رصيد الكاش المصري المتاح</p>
                  <p className="text-2xl font-black text-white">{formatCurrency(wallets.EGP)}</p>
               </div>
               <Input label="المبلغ المراد سحبه (EGP)" name="amount" type="number" required />
               <Input name="notes" placeholder="ملاحظات (اختياري)" />
               <p className="text-xs text-slate-500 text-center px-4 leading-relaxed">
                  تنبيه: يمكنك سحب الأرصدة المصرية السائلة فقط.
               </p>
               <Button variant="danger" className="w-full h-14 shadow-xl">تأكيد السحب</Button>
            </form>
         </Modal>
      )}

      {/* EXCHANGE MODAL */}
      {modal?.type === 'EXCHANGE' && (
        <Modal title="تحويل عملة (تسييل)" onClose={() => setModal(null)}>
           <div className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">من عملة (المصدر)</label>
                 <div className="flex gap-2">
                    <button onClick={() => setExchangeState({...exchangeState, fromCurrency: 'SDG', amount: 0, targetEGP: 0})} className={`flex-1 h-12 rounded-xl font-bold transition-all border ${exchangeState.fromCurrency === 'SDG' ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : 'bg-slate-950 border-white/5 text-slate-500'}`}>SDG (بنكك)</button>
                    <button onClick={() => setExchangeState({...exchangeState, fromCurrency: 'USD', amount: 0, targetEGP: 0})} className={`flex-1 h-12 rounded-xl font-bold transition-all border ${exchangeState.fromCurrency === 'USD' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-950 border-white/5 text-slate-500'}`}>USD (دولار)</button>
                 </div>
              </div>
              <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl space-y-4">
                 <Input 
                    label={`المبلغ المراد تحويله (${exchangeState.fromCurrency})`} 
                    type="number" 
                    value={exchangeState.amount || ''}
                    onChange={(e:any) => handleExchangeCalc('AMOUNT', Number(e.target.value))}
                    required 
                 />
                 <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <Input 
                            label={exchangeState.fromCurrency === 'SDG' ? 'سعر التحويل (كم SDG = 1 EGP)' : 'سعر التحويل (1 USD = كم EGP)'}
                            type="number" 
                            value={exchangeState.rate || ''}
                            onChange={(e:any) => handleExchangeCalc('RATE', Number(e.target.value))}
                            required 
                        />
                    </div>
                    {exchangeState.targetEGP > 0 && (
                        <div className="pt-6">
                            <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1 text-center">القيمة بالمصري</span>
                            <div className="h-12 px-4 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 font-black">
                                {formatCurrency(exchangeState.targetEGP)}
                            </div>
                        </div>
                    )}
                 </div>
              </div>
              <Button onClick={handleExchange} className="w-full h-14 shadow-xl">تأكيد التحويل</Button>
           </div>
        </Modal>
      )}

      {modal?.type === 'ADD' && (
        <Modal title="تسجيل عملية مالية" onClose={() => setModal(null)}>
           <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[11px] font-black text-white uppercase px-4 italic opacity-60 tracking-widest leading-none">نوع العملية</label>
                 <select name="t" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" onChange={(e: any)=>setModal({...modal, entry: e.target.value})} required>
                   <option value="">-- اختر --</option>
                   <option value="INCOME">وارد (+)</option>
                   <option value="EXPENSE">منصرف (-)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-white px-4 leading-none uppercase tracking-widest italic">التصنيف</label>
                 <select name="c" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" onChange={(e: any)=>setModal({...modal, expType: e.target.value})} required>
                    <option value="">-- اختر التصنيف --</option>
                    {FINANCE_CATEGORIES.filter(c => !c.includes('مستقبلية') && !c.includes('سحب')).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                 </select>
              </div>
              {modal.expType === 'رواتب' && (
                <select name="tu" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold" required>
                   {users.map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              )}
              
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-white px-4">تفاصيل العملة والمبلغ</label>
                 <div className="grid grid-cols-3 gap-2">
                    <select name="curr" defaultValue="EGP" className="bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold" onChange={(e:any)=>setAddCalcState({...addCalcState, currency: e.target.value})}>
                        <option value="EGP">EGP</option>
                        <option value="SDG">SDG</option>
                        <option value="USD">USD</option>
                    </select>
                    {addCalcState.currency !== 'EGP' && (
                        <div className="col-span-3 space-y-2">
                            <Input 
                                label={`المبلغ (${addCalcState.currency})`} 
                                type="number" 
                                value={addCalcState.foreignAmount || ''}
                                onChange={(e:any) => handleAddCalc('FOREIGN', Number(e.target.value))}
                                required 
                            />
                            <Input 
                                label={addCalcState.currency === 'SDG' ? `سعر التحويل (كم ${addCalcState.currency} = 1 EGP)` : `سعر التحويل (1 ${addCalcState.currency} = كم EGP)`}
                                type="number" 
                                value={addCalcState.rate || ''}
                                onChange={(e:any) => handleAddCalc('RATE', Number(e.target.value))}
                                required 
                            />
                        </div>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label="القيمة المعادلة بالمصري (للحسابات)" 
                    name="a" 
                    type="number" 
                    value={addCalcState.egpAmount || ''}
                    onChange={(e:any) => handleAddCalc('EGP', Number(e.target.value))}
                    required 
                 />
                 <Input label="التاريخ" name="d" type="date" defaultValue={today} />
              </div>
              <textarea name="n" placeholder="وصف / ملاحظات إضافية..." className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold h-24" />
              <Button className="w-full italic font-black uppercase shadow-brand-900/20">تسجيل العملية</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}
