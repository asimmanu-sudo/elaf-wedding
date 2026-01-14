import React, { useState, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { FactoryPaymentStatus } from '../types';
import { Button, Input, Modal } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';

export default function FactoryView({ sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'pending' | 'completed'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [payAmts, setPayAmts] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    return sales.filter((s: any) => (s.factoryCode.toLowerCase().includes(query.toLowerCase()) || s.brideName.toLowerCase().includes(query.toLowerCase())))
                .filter((s: any) => subTab === 'pending' ? s.factoryStatus !== FactoryPaymentStatus.PAID : s.factoryStatus === FactoryPaymentStatus.PAID)
                .sort((a: any, b: any) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate));
  }, [sales, subTab, query]);

  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(s=>s.id));

  const bulkTotalRemaining = useMemo(() => selectedIds.reduce((sum, id) => {
    const s = sales.find(x=>x.id === id);
    return sum + (s ? (s.factoryPrice - s.factoryDepositPaid) : 0);
  }, 0), [selectedIds, sales]);

  const handleBulkPayment = async (type: 'DEPOSIT' | 'COLLECTION') => {
    const records = selectedIds.map(id => sales.find(x=>x.id === id)).filter(Boolean);
    let totalPaid = 0;
    for (const s of records) {
      const amt = type === 'DEPOSIT' ? (payAmts[s.id] || 0) : (s.factoryPrice - s.factoryDepositPaid);
      if (amt > 0) {
        const newPaid = s.factoryDepositPaid + amt;
        await cloudDb.update(COLLS.SALES, s.id, { factoryDepositPaid: newPaid, factoryStatus: newPaid >= s.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL });
        totalPaid += amt;
      }
    }
    if (totalPaid > 0) await cloudDb.add(COLLS.FINANCE, { amount: totalPaid, type: 'EXPENSE', category: 'المصنع', notes: `دفع ${type === 'DEPOSIT' ? 'عربون' : 'تحصيل'} لـ ${records.length} فستان`, date: today });
    showToast('تمت العملية بنجاح'); setSelectedIds([]); setPayAmts({}); setModal(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        <button onClick={() => {setSubTab('pending'); setSelectedIds([]);}} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all ${subTab === 'pending' ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500'}`}>مستحقات المصنع</button>
        <button onClick={() => {setSubTab('completed'); setSelectedIds([]);}} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all ${subTab === 'completed' ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500'}`}>دفعيات مكتملة</button>
      </div>

      <div className="flex gap-4 flex-wrap">
         <Button variant="ghost" className="h-10 text-xs" onClick={toggleAll}>{selectedIds.length === filtered.length ? 'إلغاء التحديد' : 'تحديد الكل'}</Button>
         {subTab === 'pending' && selectedIds.length > 0 && (
           <>
             <Button onClick={() => setModal({type: 'PAY_DEPOSIT'})} className="h-10 text-xs">دفع عربون ({selectedIds.length})</Button>
             <Button variant="success" onClick={() => setModal({type: 'PAY_FULL'})} className="h-10 text-xs">تصفية تحصيل ({formatCurrency(bulkTotalRemaining)})</Button>
           </>
         )}
      </div>

      <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
              <th className="p-4 w-12 text-center"></th>
              <th className="p-4">كود الفستان</th>
              <th className="p-4">العروس</th>
              <th className="p-4">إجمالي السعر</th>
              <th className="p-4">{subTab === 'pending' ? 'المتبقي للمصنع' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-4 text-center">{subTab === 'pending' && <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} className="w-5 h-5 accent-brand-500" />}</td>
                <td className="p-4 font-black text-brand-400">{s.factoryCode}</td>
                <td className="p-4 font-bold text-white">{s.brideName}</td>
                <td className="p-4 font-bold text-slate-300">{formatCurrency(s.factoryPrice)}</td>
                <td className="p-4 font-black">
                   {subTab === 'pending' ? <span className="text-red-400">{formatCurrency(s.factoryPrice - s.factoryDepositPaid)}</span> : <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={14}/> مكتمل</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'PAY_DEPOSIT' && (
        <Modal title="دفع عربون متعدد" onClose={() => setModal(null)}>
           <div className="space-y-4 max-h-[50vh] overflow-y-auto p-1 custom-scrollbar">
              {selectedIds.map(id => {
                const s = sales.find(x=>x.id === id);
                return (
                  <div key={id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                     <div className="flex justify-between mb-2">
                        <span className="font-black text-sm text-white">{s?.factoryCode}</span>
                        <span className="text-xs text-red-400">المتبقي: {formatCurrency(s?.factoryPrice - s?.factoryDepositPaid)}</span>
                     </div>
                     <Input type="number" placeholder="ادخل العربون..." onChange={(e:any)=>setPayAmts(p=>({...p, [id]: Number(e.target.value)}))} />
                  </div>
                );
              })}
           </div>
           <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-brand-500/20 text-center">
              <p className="text-xs text-slate-500 mb-1 font-bold uppercase">إجمالي المبالغ المدخلة</p>
              <h3 className="text-3xl font-black text-brand-400">{formatCurrency(Object.values(payAmts).reduce((a,b)=>a+b, 0))}</h3>
           </div>
           <Button onClick={() => handleBulkPayment('DEPOSIT')} className="w-full mt-6">تأكيد الدفع</Button>
        </Modal>
      )}

      {modal?.type === 'PAY_FULL' && (
        <Modal title="تصفية حساب متعدد" onClose={() => setModal(null)}>
           <div className="space-y-3 mb-6 italic text-sm text-surface-400">سيتم تصفية حساب {selectedIds.length} فستان بالكامل بقيمة إجمالية {formatCurrency(bulkTotalRemaining)}</div>
           <Button onClick={() => handleBulkPayment('COLLECTION')} className="w-full">تأكيد التصفية النهائية</Button>
        </Modal>
      )}
    </div>
  );
}