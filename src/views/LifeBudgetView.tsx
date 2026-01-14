
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, TrendingUp, PieChart, Target, ShoppingCart, RefreshCw, Settings, Save, Users, Trash2, Lock, Percent, Calculator
} from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { Card, Button, Input, Modal } from '../components/UI';
import { formatCurrency, today } from '../utils/helpers';
import { CURRENCIES, DEFAULT_RENT_OPS_FEE, DEFAULT_STAFF_RATIO, PERSONAL_CATEGORIES } from '../utils/constants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip } from 'recharts';
import { BookingStatus, SaleStatus } from '../types';

export default function LifeBudgetView({ query, bookings, sales }: any) {
  const [tab, setTab] = useState<'jars' | 'reports' | 'settings'>('jars');
  const [modal, setModal] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ 
      docType: 'UNIFIED_CONFIG',
      rentOpsFee: DEFAULT_RENT_OPS_FEE, 
      staffRatio: DEFAULT_STAFF_RATIO, 
      familyMembers: [], 
      budgetPlan: [] 
  });

  // State for Multi-Currency Expense Calculation
  const [expCalc, setExpCalc] = useState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });

  useEffect(() => {
    const unsub = cloudDb.subscribe(COLLS.PERSONAL, (data) => {
      const txs = data.filter((d:any) => d.docType === 'TRANSACTION');
      const cfg = data.find((d:any) => d.docType === 'UNIFIED_CONFIG');
      setTransactions(txs || []);
      if(cfg) setConfig(cfg);
      else {
          const initialPlan = PERSONAL_CATEGORIES.map(c => ({ category: c, percentage: 0 }));
          setConfig(prev => ({ ...prev, budgetPlan: initialPlan }));
      }
    });
    return () => unsub();
  }, []);

  // --- VAULT CALCULATION (From Finance View) ---
  const vaultStatus = useMemo(() => {
      if(!bookings || !sales) return { totalLocked: 0, lockedRent: 0, lockedSale: 0 };

      const rentOpsFee = Number(config.rentOpsFee) || DEFAULT_RENT_OPS_FEE;
      const staffRatio = (Number(config.staffRatio) || DEFAULT_STAFF_RATIO) / 100;

      let lockedRent = 0;
      let lockedSale = 0;

      // Rent Logic
      const activeBookings = bookings.filter((b: any) => b.status === BookingStatus.PENDING || b.status === BookingStatus.ACTIVE);
      activeBookings.forEach((b: any) => {
          const staffFee = (b.rentalPrice || 0) * staffRatio;
          const totalLiability = staffFee + rentOpsFee;
          const paid = b.paidDeposit || 0;
          const lockedForBooking = Math.min(totalLiability, paid);
          lockedRent += lockedForBooking;
      });

      // Sale Logic
      const activeSales = sales.filter((s: any) => s.status !== SaleStatus.DELIVERED && s.status !== SaleStatus.CANCELLED);
      activeSales.forEach((s: any) => {
          const remainingFactoryDebt = (s.factoryPrice || 0) - (s.factoryDepositPaid || 0);
          const paidByBride = s.deposit || 0;
          const lockedForSale = Math.min(Math.max(0, remainingFactoryDebt), paidByBride);
          lockedSale += lockedForSale;
      });

      return {
          totalLocked: lockedRent + lockedSale,
          lockedRent,
          lockedSale
      };
  }, [bookings, sales, config]);

  // --- CALCULATION LOGIC ---
  const jars = useMemo(() => {
      // Income is considered in EGP for Budget Allocation
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      return (config.budgetPlan || []).map((plan: any) => {
          const allocated = totalIncome * ((Number(plan.percentage) || 0) / 100);
          // Expenses are deducted based on their EGP equivalent (amount field)
          const spent = transactions
            .filter(t => t.type === 'EXPENSE' && t.category === plan.category)
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          
          return {
              category: plan.category,
              allocated,
              spent,
              balance: allocated - spent,
              percentage: plan.percentage
          };
      }).sort((a:any, b:any) => b.allocated - a.allocated);
  }, [transactions, config]);

  const memberStats = useMemo(() => {
      const stats: any = {};
      (config.familyMembers || []).forEach((m: string) => { stats[m] = 0; });
      stats['Unassigned'] = 0;

      transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
          const member = t.beneficiary || 'Unassigned';
          // Use EGP amount for stats
          stats[member] = (stats[member] || 0) + (Number(t.amount) || 0);
      });

      return Object.entries(stats).map(([name, value]) => ({ name, value })).filter((x:any) => x.value > 0);
  }, [transactions, config]);

  const wallets = useMemo(() => {
    const bals = { EGP: 0, SDG: 0, USD: 0 };
    transactions.forEach((t: any) => {
      // Use the actual currency recorded
      const curr = t.currency || 'EGP';
      // Use foreign amount if available, otherwise EGP amount
      const amt = t.currencyAmount || t.amount || 0; 

      if (t.type === 'INCOME') {
          bals[curr as keyof typeof bals] += amt;
      }
      if (t.type === 'EXPENSE') {
          bals[curr as keyof typeof bals] -= amt;
      }
      if (t.type === 'EXCHANGE') {
        // Source currency deduction
        bals[curr as keyof typeof bals] -= amt;
        // Target currency addition (Exchange logic is simpler here, usually EGP out -> USD in or vice versa)
        // Note: The exchange transaction structure might need to be robust for personal wallet exchanges if implemented fully.
        if (t.toCurrency && t.exchangeRate) {
             const targetAmt = amt * t.exchangeRate; // Simplified for internal transfers if needed
             bals[t.toCurrency as keyof typeof bals] += targetAmt;
        }
      }
    });
    return bals;
  }, [transactions]);

  // --- ACTIONS ---
  const handleSaveSettings = async (e: any) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const newPlan = (config.budgetPlan || []).map((p: any) => ({
          category: p.category,
          percentage: Number(fd.get(`pct_${p.category}`))
      }));
      const newConfig = {
          ...config,
          docType: 'UNIFIED_CONFIG',
          rentOpsFee: Number(fd.get('rentOpsFee')),
          staffRatio: Number(fd.get('staffRatio')),
          budgetPlan: newPlan
      };
      if (config.id) await cloudDb.update(COLLS.PERSONAL, config.id, newConfig);
      else await cloudDb.add(COLLS.PERSONAL, newConfig);
      alert('تم حفظ الإعدادات بنجاح');
  };

  const handleAddMember = async () => {
      const name = prompt('اسم الفرد الجديد:');
      if (name) {
          const newMembers = [...(config.familyMembers || []), name];
          if (config.id) await cloudDb.update(COLLS.PERSONAL, config.id, { familyMembers: newMembers });
          else await cloudDb.add(COLLS.PERSONAL, { ...config, familyMembers: newMembers, docType: 'UNIFIED_CONFIG' });
      }
  };

  const handleRemoveMember = async (name: string) => {
      if(confirm(`حذف ${name} من القائمة؟`)) {
          const newMembers = (config.familyMembers || []).filter((m: string) => m !== name);
          await cloudDb.update(COLLS.PERSONAL, config.id, { familyMembers: newMembers });
      }
  };

  const handleAddTx = async (e: any) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      
      const data: any = {
          docType: 'TRANSACTION',
          type: modal.txType,
          date: fd.get('date') || today,
          category: fd.get('category'),
          beneficiary: fd.get('beneficiary') || null,
          description: fd.get('desc')
      };

      if (modal.txType === 'EXPENSE' || modal.txType === 'INCOME') {
          // If Multi-Currency Logic is active
          if (expCalc.currency !== 'EGP') {
              data.amount = expCalc.egpAmount; // Bookkeeping in EGP
              data.currency = expCalc.currency; // Actual wallet currency
              data.currencyAmount = expCalc.foreignAmount; // Actual wallet deduction
              data.exchangeRate = expCalc.rate;
          } else {
              data.amount = Number(fd.get('amount'));
              data.currency = 'EGP';
              data.currencyAmount = data.amount;
              data.exchangeRate = 1;
          }
      } else if (modal.txType === 'EXCHANGE') {
        data.amount = Number(fd.get('amount')); // Source Amount
        data.currency = fd.get('currency');
        data.toCurrency = fd.get('toCurrency');
        data.exchangeRate = Number(fd.get('rate'));
        data.description = `تحويل عملة`;
      }

      await cloudDb.add(COLLS.PERSONAL, data);
      setModal(null);
      setExpCalc({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
  };

  // --- CALCULATION HANDLERS FOR EXPENSE ---
  const handleExpCurrencyChange = (curr: string) => {
      setExpCalc(prev => ({ ...prev, currency: curr, rate: 0, foreignAmount: 0, egpAmount: 0 }));
  };

  const handleExpForeignChange = (val: number) => {
      setExpCalc(prev => {
          let newEgp = 0;
          if (prev.rate > 0) {
              if (prev.currency === 'SDG') newEgp = val / prev.rate;
              else newEgp = val * prev.rate;
          }
          return { ...prev, foreignAmount: val, egpAmount: parseFloat(newEgp.toFixed(2)) };
      });
  };

  const handleExpRateChange = (val: number) => {
      setExpCalc(prev => {
          let newEgp = 0;
          if (val > 0) {
              if (prev.currency === 'SDG') newEgp = prev.foreignAmount / val;
              else newEgp = prev.foreignAmount * val;
          }
          return { ...prev, rate: val, egpAmount: parseFloat(newEgp.toFixed(2)) };
      });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
       {/* Wallet Summary */}
       <div className="grid grid-cols-3 gap-3">
         {CURRENCIES.map(c => (
           <div key={c.code} className="bg-slate-900 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${c.code === 'EGP' ? 'bg-brand-500' : c.code === 'SDG' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{c.code}</p>
              <p className="text-xl font-black text-white mt-1" dir="ltr">
                 {new Intl.NumberFormat('en-US').format(wallets[c.code as keyof typeof wallets])}
              </p>
           </div>
         ))}
       </div>

       {/* Locked Vault Card */}
       <div className="bg-slate-950/50 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Lock size={18} />
             </div>
             <div>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">التزامات المحل (محجوز)</p>
                <p className="text-xs text-slate-500 font-bold">لا يمكن سحب هذا المبلغ</p>
             </div>
          </div>
          <p className="text-xl font-black text-orange-400">{formatCurrency(vaultStatus.totalLocked)}</p>
       </div>

       {/* Quick Actions */}
       <div className="flex gap-2 overflow-x-auto custom-scrollbar">
          <Button onClick={() => { setModal({ type: 'TX_FORM', txType: 'EXPENSE' }); setExpCalc({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 }); }} className="flex-1 min-w-[100px] !h-12 !text-xs !rounded-xl bg-red-500/10 text-red-400 border-red-500/20"><ShoppingCart size={16}/> مصروف</Button>
          <Button onClick={() => { setModal({ type: 'TX_FORM', txType: 'INCOME' }); setExpCalc({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 }); }} className="flex-1 min-w-[100px] !h-12 !text-xs !rounded-xl bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><TrendingUp size={16}/> دخل</Button>
          <Button onClick={() => setModal({ type: 'TX_FORM', txType: 'EXCHANGE' })} className="flex-1 min-w-[100px] !h-12 !text-xs !rounded-xl bg-blue-500/10 text-blue-400 border-blue-500/20"><RefreshCw size={16}/> تحويل</Button>
       </div>

       {/* Tabs */}
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-30 backdrop-blur-xl shadow-lg">
        {['jars', 'reports', 'settings'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${tab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'jars' ? 'الحصالات' : t === 'reports' ? 'التقارير' : 'الإعدادات'}
          </button>
        ))}
      </div>

      {/* JARS TAB - Improved Grid for Mobile */}
      {tab === 'jars' && (
          <div className="grid grid-cols-2 gap-3">
              {jars.map((jar: any) => {
                  const percent = Math.min(100, (jar.spent / (Math.max(jar.allocated, 1))) * 100);
                  let barColor = 'bg-emerald-500';
                  if (percent > 80) barColor = 'bg-red-500';
                  else if (percent > 50) barColor = 'bg-yellow-500';

                  return (
                    <div key={jar.category} className="bg-slate-900 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-black text-white text-xs truncate w-2/3">{jar.category}</h4>
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">{jar.percentage}%</span>
                        </div>
                        
                        <p className={`text-lg font-black tracking-tight ${jar.balance < 0 ? 'text-red-400' : 'text-white'}`}>
                            {formatCurrency(jar.balance)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">رصيد متاح</p>

                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-600">
                            <span>صرف: {formatCurrency(jar.spent)}</span>
                            <span>{Math.round(percent)}%</span>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* REPORTS TAB */}
      {tab === 'reports' && (
          <div className="space-y-6">
              <Card>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">المصاريف حسب الفرد</h3>
                  <div className="h-64" dir="ltr">
                    {memberStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={memberStats} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                <ReTooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#0f172a', border: '1px solid #334155', borderRadius: '12px'}} />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 font-bold text-xs">لا توجد بيانات كافية للرسم</div>
                    )}
                  </div>
              </Card>

              <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">سجل العمليات</h3>
                  {transactions.sort((a:any, b:any) => b.date.localeCompare(a.date)).slice(0, 20).map((t: any) => (
                      <div key={t.id} className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                          <div>
                              <p className="font-bold text-white text-sm">{t.category} {t.beneficiary ? `(${t.beneficiary})` : ''}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{t.date} • {t.description}</p>
                          </div>
                          <span className={`font-black ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.currencyAmount || t.amount)} <span className="text-[9px]">{t.currency || 'EGP'}</span>
                          </span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* SETTINGS TAB (Centralized) */}
      {tab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
              <Card>
                  <h3 className="text-sm font-black text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Settings size={18}/> ثوابت المحل (Shop Constants)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                      <Input label="قيمة التشغيل (Ops Fee)" name="rentOpsFee" type="number" defaultValue={config.rentOpsFee} />
                      <Input label="نسبة الموظفين %" name="staffRatio" type="number" defaultValue={config.staffRatio} icon={Percent} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-bold bg-yellow-500/10 text-yellow-500 p-2 rounded-lg">
                      تنبيه: تعديل هذه القيم سيؤثر فوراً على حسابات الخزنة المحرمة في صفحة المالية.
                  </p>
              </Card>

              <Card>
                  <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Users size={18}/> أفراد الأسرة (Family)
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                      {(config.familyMembers || []).map((m: string) => (
                          <span key={m} className="bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2">
                              {m} <button type="button" onClick={() => handleRemoveMember(m)} className="text-red-400"><Trash2 size={14}/></button>
                          </span>
                      ))}
                      <button type="button" onClick={handleAddMember} className="bg-blue-500/10 text-blue-400 px-3 py-2 rounded-xl text-xs font-bold border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors">
                          + إضافة فرد
                      </button>
                  </div>
              </Card>

              <Card>
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Target size={18}/> خطة الميزانية (Budget Plan)
                  </h3>
                  <div className="space-y-2">
                      {(config.budgetPlan || []).map((p: any) => (
                          <div key={p.category} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                              <span className="text-xs font-bold text-white">{p.category}</span>
                              <div className="flex items-center gap-2">
                                  <input 
                                      type="number" 
                                      name={`pct_${p.category}`} 
                                      defaultValue={p.percentage} 
                                      className="w-16 bg-slate-900 text-center text-white font-bold rounded-lg border border-white/10 py-1"
                                  />
                                  <span className="text-xs font-black text-slate-500">%</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </Card>

              <Button className="w-full h-16 !rounded-2xl shadow-xl fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto">
                  <Save size={20}/> حفظ كافة الإعدادات
              </Button>
          </form>
      )}

      {/* ADD TRANSACTION MODAL */}
      {modal?.type === 'TX_FORM' && (
        <Modal title={modal.txType === 'INCOME' ? 'تسجيل دخل' : modal.txType === 'EXPENSE' ? 'تسجيل مصروف' : 'تحويل عملة'} onClose={() => setModal(null)}>
           <form onSubmit={handleAddTx} className="space-y-4">
              
              {/* Currency Selection for Expense/Income */}
              {(modal.txType === 'EXPENSE' || modal.txType === 'INCOME') && (
                  <div className="bg-slate-950 p-3 rounded-2xl border border-white/5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-2">عملة العملية</label>
                      <div className="flex gap-2">
                          {CURRENCIES.map(c => (
                              <button 
                                  key={c.code} 
                                  type="button" 
                                  onClick={() => handleExpCurrencyChange(c.code)}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${expCalc.currency === c.code ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-500'}`}
                              >
                                  {c.code}
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {/* Amount Inputs */}
              {(modal.txType === 'EXPENSE' || modal.txType === 'INCOME') && expCalc.currency !== 'EGP' ? (
                  <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl animate-slide-up grid grid-cols-2 gap-4">
                      <div className="col-span-2 flex items-center gap-2 text-brand-400 mb-1">
                          <Calculator size={16}/> <span className="text-xs font-bold">حاسبة العملة ({expCalc.currency})</span>
                      </div>
                      
                      <Input 
                        label={`المبلغ بالـ ${expCalc.currency}`} 
                        type="number" 
                        value={expCalc.foreignAmount || ''}
                        onChange={(e:any) => handleExpForeignChange(Number(e.target.value))} 
                        placeholder="0.00" 
                      />
                      <Input 
                        label={expCalc.currency === 'SDG' ? `سعر التحويل (كم ${expCalc.currency} = 1 جنيه)` : `سعر التحويل (1 ${expCalc.currency} = كم جنيه)`}
                        type="number" 
                        value={expCalc.rate || ''}
                        placeholder="مثلاً 55" 
                        onChange={(e:any) => handleExpRateChange(Number(e.target.value))}
                      />
                      <div className="col-span-2 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">القيمة المعادلة بالمصري (للخصم من الميزانية)</p>
                          <p className="text-xl font-black text-white">{formatCurrency(expCalc.egpAmount)} EGP</p>
                      </div>
                  </div>
              ) : (modal.txType === 'EXPENSE' || modal.txType === 'INCOME') ? (
                  <Input label="المبلغ (EGP)" name="amount" type="number" required />
              ) : null}

              
              {/* Exchange Mode Inputs */}
              {modal.txType === 'EXCHANGE' && (
                 <>
                   <div className="grid grid-cols-2 gap-4">
                        <Input label="المبلغ المراد تحويله" name="amount" type="number" required />
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">من عملة</label>
                            <select name="currency" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none" required>
                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                        </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">إلى عملة</label>
                      <select name="toCurrency" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none" required>
                         {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                   <Input label="سعر التحويل (Rate)" name="rate" type="number" step="0.01" placeholder="مثلاً 50.5" required />
                 </>
              )}

              {(modal.txType === 'EXPENSE' || modal.txType === 'INCOME') && (
                 <>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">البند / التصنيف</label>
                        {modal.txType === 'EXPENSE' ? (
                        <select name="category" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none" required>
                            <option value="">-- اختر --</option>
                            {(config.budgetPlan || []).map((p:any) => <option key={p.category} value={p.category}>{p.category}</option>)}
                            <option value="أخرى">أخرى</option>
                        </select>
                        ) : (
                        <Input name="category" placeholder="مصدر الدخل" required />
                        )}
                    </div>
                    {modal.txType === 'EXPENSE' && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">المستفيد (من قام بالصرف)</label>
                            <select name="beneficiary" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none">
                                <option value="">-- عام للبيت --</option>
                                {(config.familyMembers || []).map((m:string) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    )}
                 </>
              )}

              <Input label="التاريخ" name="date" type="date" defaultValue={today} />
              <Input name="desc" placeholder="ملاحظات إضافية..." />
              
              <Button className="w-full h-14 mt-4 shadow-xl">حفظ العملية</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}
