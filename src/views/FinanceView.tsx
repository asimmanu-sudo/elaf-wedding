
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Plus, CalendarDays, Clock, TrendingUp, ArrowDownCircle, DollarSign, Shirt, LogOut } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { DressType, DressStatus, BookingStatus, SaleStatus } from '../types';
import { Button, Input, Modal, Card } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';
import { FINANCE_CATEGORIES, DEFAULT_RENT_OPS_FEE, DEFAULT_STAFF_RATIO } from '../utils/constants';

export default function FinanceView({ finance, dresses, users, bookings, sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'logs' | 'analysis' | 'performance'>('logs');
  const [modal, setModal] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [sysConfig, setSysConfig] = useState<any>({ rentOpsFee: DEFAULT_RENT_OPS_FEE, staffRatio: DEFAULT_STAFF_RATIO });
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  useEffect(() => {
    const unsub = cloudDb.subscribe(COLLS.PERSONAL, (data) => {
       const config = data.find((d:any) => d.docType === 'UNIFIED_CONFIG');
       if(config) {
         setSysConfig({ 
           rentOpsFee: Number(config.rentOpsFee), 
           staffRatio: Number(config.staffRatio) 
         });
       }
    });
    return () => unsub();
  }, []);

  const activeBookings = useMemo(() => bookings.filter((b: any) => 
    b.status === BookingStatus.PENDING || b.status === BookingStatus.ACTIVE
  ), [bookings]);
  
  const activeSales = useMemo(() => sales.filter((s: any) => 
    s.status !== SaleStatus.DELIVERED && s.status !== SaleStatus.CANCELLED
  ), [sales]);

  const totalRentRemaining = useMemo(() => activeBookings.reduce((sum: number, b: any) => sum + (b.remainingToPay || 0), 0), [activeBookings]);
  const totalSaleRemaining = useMemo(() => activeSales.reduce((sum: number, s: any) => sum + (s.remainingFromBride || 0), 0), [activeSales]);

  const futureRentals = useMemo(() => activeBookings.filter((b: any) => b.remainingToPay > 0).map((b: any) => ({
     id: `fut_rent_${b.id}`, category: "مستحقات إيجار (مستقبلية)", amount: b.remainingToPay, type: 'INCOME', notes: `متبقي إيجار: ${b.customerName}`, date: b.deliveryDate, isFuture: true
  })), [activeBookings]);

  const futureSales = useMemo(() => activeSales.filter((s: any) => s.remainingFromBride > 0).map((s: any) => ({
     id: `fut_sale_${s.id}`, category: "مستحقات تفصيل (مستقبلية)", amount: s.remainingFromBride, type: 'INCOME', notes: `متبقي تفصيل: ${s.brideName}`, date: s.expectedDeliveryDate, isFuture: true
  })), [activeSales]);

  const filteredFinance = useMemo(() => {
    let list = [...finance];
    if (selectedCats.includes("مستحقات إيجار (مستقبلية)") || selectedCats.length === 0) list = [...list, ...futureRentals];
    if (selectedCats.includes("مستحقات تفصيل (مستقبلية)") || selectedCats.length === 0) list = [...list, ...futureSales];

    return list.filter(f => {
      const matchesQuery = (f.category || '').includes(query) || (f.notes || '').includes(query);
      const matchesDate = (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate);
      const matchesCategory = selectedCats.length === 0 || selectedCats.includes(f.category);
      return matchesQuery && matchesDate && matchesCategory;
    }).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [finance, query, startDate, endDate, selectedCats, futureRentals, futureSales]);

  const totals = useMemo(() => {
    const actuals = filteredFinance.filter((f: any) => !f.isFuture);
    const inc = actuals.filter((f: any) => f.type === 'INCOME').reduce((s: any, f: any) => s + f.amount, 0);
    const exp = actuals.filter((f: any) => f.type === 'EXPENSE').reduce((s: any, f: any) => s + f.amount, 0);
    return { inc, exp, profit: inc - exp };
  }, [filteredFinance]);

  const handleWithdraw = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    
    // Logic for available funds moved to LifeBudgetView generally, but simple check here
    const allInc = finance.filter((f:any) => f.type === 'INCOME').reduce((s:any,f:any)=>s+f.amount, 0);
    const allExp = finance.filter((f:any) => f.type === 'EXPENSE').reduce((s:any,f:any)=>s+f.amount, 0);
    const cashInHand = allInc - allExp;

    if (amount > cashInHand) {
        showToast('رصيد الخزنة الفعلي لا يكفي', 'warning');
        return;
    }

    await cloudDb.add(COLLS.FINANCE, {
       amount, type: 'EXPENSE', category: 'سحب للمنزل (مسحوبات مالك)', 
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
      filteredFinance.filter((f:any) => !f.isFuture).forEach((f: any) => {
          if (f.type === 'EXPENSE') expMap[f.category] = (expMap[f.category] || 0) + f.amount;
          else incMap[f.category] = (incMap[f.category] || 0) + f.amount;
      });
      return {
          expenses: Object.entries(expMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b)=>b.value-a.value),
          income: Object.entries(incMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b)=>b.value-a.value)
      };
  }, [filteredFinance]);

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get('t') as 'INCOME' | 'EXPENSE';
    const amount = Math.abs(Number(fd.get('a')));
    const data: any = { date: fd.get('d') || today, type, amount, category: fd.get('c'), notes: fd.get('n') || '' };
    if (type === 'EXPENSE') {
      if (data.category === 'رواتب') data.targetUser = fd.get('tu');
      if (['تنظيف', 'ترزي'].includes(data.category)) {
        data.relatedDresses = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => (c as HTMLInputElement).value);
      }
    }
    await cloudDb.add(COLLS.FINANCE, data);
    showToast('تم تسجيل عملية مالية بنجاح'); setModal(null);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
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

      <div className="flex gap-4 flex-wrap">
        <Button variant="ghost" className="flex-1 h-12" onClick={() => setShowFilters(!showFilters)}>
           <Filter size={18} /> {showFilters ? 'إخفاء الفلاتر' : 'تصفية النتائج'}
        </Button>
        {hasPerm('add_finance') && (
          <>
            <Button onClick={() => setModal({ type: 'ADD' })} className="flex-1 h-12"><Plus size={18}/> إضافة عملية</Button>
            <Button onClick={() => setModal({ type: 'WITHDRAW' })} variant="danger" className="flex-1 h-12 bg-red-500/10 hover:bg-red-500 border-red-500/20 text-red-400"><LogOut size={18}/> سحب للمنزل</Button>
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
                    {FINANCE_CATEGORIES.map(cat => (
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
           {/* LOGS LIST ONLY - Cleaned up */}
           {filteredFinance.map((f: any) => (
             <Card key={f.id} className={`!py-4 flex items-center justify-between group ${(f as any).isFuture ? 'opacity-70 border-dashed border-blue-500/30' : ''}`}>
               <div className="flex items-center gap-4">
                 <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${(f as any).isFuture ? 'bg-blue-500/10 border-blue-500/10 text-blue-500' : f.type === 'INCOME' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-500' : 'bg-red-500/10 border-red-500/10 text-red-500'}`}>
                     {(f as any).isFuture ? <Clock size={18}/> : f.type === 'INCOME' ? <TrendingUp size={18}/> : <ArrowDownCircle size={18}/>}
                 </div>
                 <div>
                     <h4 className="font-black text-sm text-white">{f.category}</h4>
                     <p className="text-[10px] text-slate-500 font-bold mt-0.5">{f.date} • {f.notes}</p>
                 </div>
               </div>
               <div className="text-left flex flex-col items-end">
                 <span className={`text-base font-black tracking-tighter ${(f as any).isFuture ? 'text-blue-400' : f.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                     {f.type === 'INCOME' ? '+' : '-'}{formatCurrency(f.amount)}
                 </span>
                 {!((f as any).isFuture) && hasPerm('admin_reset') && (
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
           {/* STATS MOVED HERE */}
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

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                 <h3 className="text-sm font-black text-white mb-4">توزيع المصروفات</h3>
                 <div className="space-y-3">
                    {analysis.expenses.map((item:any, idx: number) => (
                       <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold">{item.name}</span>
                          <div className="flex items-center gap-2">
                             <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${(item.value / totals.exp) * 100}%` }}></div>
                             </div>
                             <span className="font-black text-white">{formatCurrency(item.value)}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </Card>
              <Card>
                 <h3 className="text-sm font-black text-white mb-4">مصادر الدخل</h3>
                 <div className="space-y-3">
                    {analysis.income.map((item:any, idx: number) => (
                       <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold">{item.name}</span>
                          <div className="flex items-center gap-2">
                             <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${(item.value / totals.inc) * 100}%` }}></div>
                             </div>
                             <span className="font-black text-white">{formatCurrency(item.value)}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </Card>
           </div>
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
                  <p className="text-[10px] text-brand-400 uppercase tracking-widest mb-1">إجمالي الخزينة (كاش)</p>
                  <p className="text-2xl font-black text-white">{formatCurrency(totals.inc - totals.exp)}</p>
               </div>
               <Input label="المبلغ المراد سحبه" name="amount" type="number" required />
               <Input name="notes" placeholder="ملاحظات (اختياري)" />
               <p className="text-xs text-slate-500 text-center px-4 leading-relaxed">
                  سيتم تسجيل المبلغ كمصروف في المحل، وكدخل في ميزانية البيت تلقائياً.
               </p>
               <Button variant="danger" className="w-full h-14 shadow-xl">تأكيد السحب</Button>
            </form>
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
              {(modal.expType === 'تنظيف' || modal.expType === 'ترزي') && (
                <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl max-h-60 overflow-y-auto custom-scrollbar italic font-black space-y-2 shadow-inner">
                   <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic mb-2 opacity-60 leading-none">اختر الفساتين المعنية:</p>
                   {dresses.filter((d: any)=>d.type===DressType.RENT).map((d: any) => {
                      const priority = (modal.expType === 'تنظيف' && d.status === DressStatus.CLEANING) || (modal.expType === 'ترزي' && bookings.some((b: any)=>b.dressId === d.id && !b.fitting1Done));
                      return (
                        <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${priority ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/5'}`}>
                           <input type="checkbox" value={d.name} className="w-5 h-5 accent-brand-500" />
                           <span className="text-xs font-bold text-white">{d.name} {priority && <span className="text-[9px] text-brand-400 font-black italic ml-2">● أولوية</span>}</span>
                        </label>
                      );
                   })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                 <Input label="القيمة المالية" name="a" type="number" required />
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
