import React, { useState, useMemo } from 'react';
import { Plus, Printer, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { SaleStatus, FactoryPaymentStatus } from '../types';
import { Button, Input, Modal, Card } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';
import { PAYMENT_METHODS, MEASUREMENT_FIELDS } from '../utils/constants';

export default function SaleOrdersView({ sales, finance, query, hasPerm, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past'>('current');
  const [modal, setModal] = useState<any>(null);
  const [pendingSave, setPendingSave] = useState<any>(null);

  const filtered = useMemo(() => {
    return sales.filter((s: any) => (s.brideName.toLowerCase().includes(query.toLowerCase()) || s.factoryCode.toLowerCase().includes(query.toLowerCase()))).filter((s: any) => {
      if (subTab === 'current') return s.status !== SaleStatus.DELIVERED;
      return s.status === SaleStatus.DELIVERED;
    }).sort((a: any, b: any) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate));
  }, [sales, subTab, query]);

  const handleDelete = async (s: any) => {
    if (!confirm('سيتم حذف طلب التفصيل وكافة العمليات المالية المرتبطة به. هل أنت متأكد؟')) return;
    try {
      await cloudDb.delete(COLLS.SALES, s.id);
      const relatedFinance = (finance || []).filter((f: any) => f.relatedId === s.id);
      for (const f of relatedFinance) {
        await cloudDb.delete(COLLS.FINANCE, f.id);
      }
      showToast('تم حذف الطلب وتصفية المالية');
      addLog('حذف طلب تفصيل', `تم حذف طلب تفصيل العروس ${s.brideName} وتصفية عملياته المالية`);
    } catch (err) {
      showToast('خطأ في الحذف', 'error');
    }
  };

  const handleSave = async (data: any, isAdd: boolean, sId: string) => {
      if (isAdd) {
        sId = await cloudDb.add(COLLS.SALES, data);
        if (data.deposit > 0) {
           await cloudDb.add(COLLS.FINANCE, {
             amount: data.deposit, type: 'INCOME', category: 'عربون تفصيل',
             notes: `عربون تفصيل فستان كود ${data.factoryCode} للعروس ${data.brideName}`,
             date: today, relatedId: sId
           });
        }
      } else {
        await cloudDb.update(COLLS.SALES, sId, data);
      }
      showToast('تم الحفظ بنجاح'); 
      setModal(null);
      setPendingSave(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['current', 'past'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'current' ? 'نشط' : 'مكتمل'}
          </button>
        ))}
      </div>

      {subTab === 'current' && hasPerm('add_sale') && (
        <Button onClick={() => setModal({ type: 'ADD' })} className="w-full !rounded-[2.5rem] h-16 shadow-xl"><Plus size={20}/> تسجيل طلب تفصيل جديد</Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((s: any) => (
          <Card key={s.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-600 opacity-20"></div>
            <div className="flex justify-between items-start mb-6">
              <div><h4 className="text-xl font-black text-white tracking-tight">{s.brideName}</h4><p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1 opacity-70">Code: {s.factoryCode}</p></div>
              <span className="px-3 py-1 bg-white/5 border border-white/5 text-surface-400 rounded-lg text-[9px] font-black uppercase tracking-widest">{s.status}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-6">
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">المتبقي</span><span className="text-sm font-black text-red-400">{formatCurrency(s.remainingFromBride)}</span></div>
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">التسليم المتوقع</span><span className="text-sm font-bold text-white tracking-tight">{s.expectedDeliveryDate}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setModal({ ...s, type: 'MEASURE' })} className="flex-1 !h-12 !text-[11px] font-bold">المقاسات</Button>
              <Button variant="ghost" onClick={() => onPrint(s, 'DEPOSIT')} className="!w-12 !h-12 !p-0 text-brand-400"><Printer size={18}/></Button>
              <Button variant="ghost" onClick={() => setModal({ ...s, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-surface-500"><Edit size={18}/></Button>
              <Button variant="ghost" onClick={() => handleDelete(s)} className="!w-12 !h-12 !p-0 text-red-400"><Trash2 size={18}/></Button>
            </div>
          </Card>
        ))}
      </div>
      
      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'طلب تفصيل' : 'تعديل تفصيل'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = fd.get('c') as string;
            const sp = Number(fd.get('sp')); const dep = Number(fd.get('dep'));
            const fp = Number(fd.get('fp'));

            const data = {
              factoryCode: code, brideName: fd.get('n'), bridePhone: fd.get('ph'), brideAddress: fd.get('addr'),
              expectedDeliveryDate: fd.get('ed'), sellPrice: sp, factoryPrice: fp,
              deposit: dep, remainingFromBride: sp - dep, description: fd.get('d'),
              status: modal.status || SaleStatus.DESIGNING, factoryStatus: modal.factoryStatus || FactoryPaymentStatus.UNPAID,
              factoryDepositPaid: modal.factoryDepositPaid || 0, orderDate: today,
              paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || ''
            };
            
            if (fp > sp) {
                setPendingSave({ ...data, isAdd: modal.type === 'ADD', sId: modal.id });
                setModal({ type: 'LOSS_WARNING' });
                return;
            }

            await handleSave(data, modal.type === 'ADD', modal.id);
          }} className="space-y-5">
            <Input label="كود المصنع" name="c" defaultValue={modal.factoryCode} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="اسم العروس" name="n" defaultValue={modal.brideName} required />
              <Input label="الهاتف" name="ph" defaultValue={modal.bridePhone} required />
            </div>
            <Input label="العنوان" name="addr" defaultValue={modal.brideAddress} />
            <Input label="تاريخ التسليم المتوقع" name="ed" type="date" defaultValue={modal.expectedDeliveryDate} required />
            <div className="grid grid-cols-3 gap-4">
              <Input label="سعر البيع" name="sp" type="number" defaultValue={modal.sellPrice} required />
              <Input label="سعر المصنع" name="fp" type="number" defaultValue={modal.factoryPrice} required />
              <Input label="العربون" name="dep" type="number" defaultValue={modal.deposit} required />
            </div>
            <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع</label>
               <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" defaultValue={modal.paymentMethod} onChange={(e:any)=>setModal({...modal, payMethod: e.target.value})} required>
                  <option value="">-- اختر --</option>
                  {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
               </select>
               {(modal.payMethod === 'أخرى' || modal.paymentMethod === 'أخرى') && <Input label="تفاصيل الدفع الأخرى" name="opm" defaultValue={modal.otherPaymentMethod} required />}
            </div>
            <textarea name="d" placeholder="تفاصيل التصميم..." defaultValue={modal.description} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 text-white font-bold h-24 outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
            <Button className="w-full !rounded-2xl shadow-xl">تسجيل الطلب</Button>
          </form>
        </Modal>
      )}

      {modal?.type === 'LOSS_WARNING' && (
        <Modal title="تحذير خسارة" onClose={() => setModal(null)}>
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
                   <AlertTriangle size={40} />
               </div>
               <div>
                   <h3 className="font-black text-white text-xl">سعر المصنع أكبر من سعر البيع!</h3>
                   <p className="text-sm text-slate-400 mt-2">هل أنت متأكد من تسجيل هذه العملية بخسارة؟</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <Button variant="ghost" onClick={() => setModal({ ...pendingSave, type: pendingSave.isAdd ? 'ADD' : 'EDIT', id: pendingSave.sId })}>تعديل</Button>
                   <Button variant="danger" onClick={() => handleSave(pendingSave, pendingSave.isAdd, pendingSave.sId)}>متابعة</Button>
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
            await cloudDb.update(COLLS.SALES, modal.id, { measurements: m });
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
              <Button type="button" onClick={() => onPrint(modal, 'SIZES')} variant="ghost" className="!rounded-2xl"><Printer size={20}/></Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}