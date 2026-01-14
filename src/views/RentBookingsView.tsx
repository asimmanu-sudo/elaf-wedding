import React, { useState, useMemo } from 'react';
import { Plus, Printer, Ruler, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { BookingStatus, DressType, DressStatus } from '../types';
import { Button, Input, Modal, Card } from '../components/UI';
import { today, formatCurrency } from '../utils/helpers';
import { PAYMENT_METHODS, MEASUREMENT_FIELDS } from '../utils/constants';

export default function RentBookingsView({ dresses, bookings, finance, query, hasPerm, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past' | 'fittings'>('current');
  const [modal, setModal] = useState<any>(null);
  const [pendingSave, setPendingSave] = useState<any>(null);
  const [printFilter, setPrintFilter] = useState({ month: '', selectedIds: [] as string[] });

  const filtered = useMemo(() => {
    return bookings.filter((b: any) => (b.customerName.toLowerCase().includes(query.toLowerCase()))).filter((b: any) => {
      if (subTab === 'current') return b.status !== BookingStatus.COMPLETED;
      if (subTab === 'past') return b.status === BookingStatus.COMPLETED;
      if (subTab === 'fittings') return (b.status === BookingStatus.PENDING || b.status === BookingStatus.ACTIVE);
      return true;
    }).sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate));
  }, [bookings, subTab, query]);

  const handleDelete = async (b: any) => {
    if (!confirm('سيتم حذف الحجز وكافة العمليات المالية المرتبطة به. هل أنت متأكد؟')) return;
    try {
      await cloudDb.delete(COLLS.BOOKINGS, b.id);
      const relatedFinance = (finance || []).filter((f: any) => f.relatedId === b.id);
      for (const f of relatedFinance) {
        await cloudDb.delete(COLLS.FINANCE, f.id);
      }
      showToast('تم حذف الحجز وتصفية المالية');
      addLog('حذف حجز', `تم حذف حجز العروس ${b.customerName} وتصفية عملياته المالية`);
    } catch (err) {
      showToast('خطأ في الحذف', 'error');
    }
  };

  const executeSave = async (data: any) => {
     let bId = data.id;
     const isAdd = !bId; 

     if (isAdd) {
       bId = await cloudDb.add(COLLS.BOOKINGS, data);
       
       const dress = dresses.find((d: any) => d.id === data.dressId);
       if (dress) {
          await cloudDb.update(COLLS.DRESSES, dress.id, { rentalCount: (dress.rentalCount || 0) + 1 });
       }

       const deposit = Number(data.paidDeposit);
       if (deposit > 0) {
          await cloudDb.add(COLLS.FINANCE, {
            amount: deposit, type: 'INCOME', category: 'حجز إيجار',
            notes: `عربون حجز فستان ${data.dressName} للعروس ${data.customerName}`,
            date: data.createdAt, relatedId: bId
          });
          showToast('تم تسجيل عملية مالية بقيمة: ' + deposit);
       }
     } else {
       await cloudDb.update(COLLS.BOOKINGS, data.id, data);
     }
     showToast('تم الحفظ بنجاح'); 
     setModal(null);
     setPendingSave(null);
  };

  const filteredForPrint = useMemo(() => {
    return bookings.filter((b: any) => b.status !== BookingStatus.COMPLETED && b.status !== BookingStatus.CANCELLED)
      .filter((b: any) => !printFilter.month || b.eventDate.startsWith(printFilter.month))
      .sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate));
  }, [bookings, printFilter.month]);

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['current', 'past', 'fittings'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'current' ? 'نشط' : t === 'past' ? 'منتهي' : 'البروفات'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {subTab === 'current' && hasPerm('add_booking') && <Button onClick={() => setModal({ type: 'ADD' })} className="flex-1 !rounded-[2.5rem] h-16 shadow-xl"><Plus size={20}/> تسجيل حجز جديد</Button>}
        {subTab === 'current' && <Button variant="ghost" onClick={() => setModal({ type: 'PRINT_SCHEDULE' })} className="!w-16 !h-16 !rounded-[2.5rem] border-white/10"><Printer size={22}/></Button>}
      </div>

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
                  <Button variant={b.fitting1Done ? 'success' : 'ghost'} className="w-full h-10 text-xs" onClick={() => cloudDb.update(COLLS.BOOKINGS, b.id, { fitting1Done: !b.fitting1Done })}>{b.fitting1Done ? 'تمت البروفه' : 'تأكيد الأولى'}</Button>
                </div>
                <div className={`p-4 rounded-2xl border ${b.fitting2Done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-white/5'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">البروفه الثانية</p>
                  <Button variant={b.fitting2Done ? 'success' : 'ghost'} className="w-full h-10 text-xs" onClick={() => cloudDb.update(COLLS.BOOKINGS, b.id, { fitting2Done: !b.fitting2Done })}>{b.fitting2Done ? 'تمت البروفه' : 'تأكيد الثانية'}</Button>
                </div>
              </div>
            </Card>
          ))
        ) : filtered.map((b: any) => (
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
              <Button variant="ghost" onClick={() => setModal({ ...b, type: 'MEASURE' })} className="flex-1 !h-12 !text-[11px] font-bold"><Ruler size={16}/> المقاسات</Button>
              <Button variant="ghost" onClick={() => onPrint(b, 'DEPOSIT')} className="!w-12 !h-12 !p-0 text-brand-400"><Printer size={18}/></Button>
              <Button variant="ghost" onClick={() => setModal({ ...b, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-surface-500"><Edit size={18}/></Button>
              <Button variant="ghost" onClick={() => handleDelete(b)} className="!w-12 !h-12 !p-0 text-red-400"><Trash2 size={18}/></Button>
            </div>
          </Card>
        ))}
      </div>

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
                         <div className="flex justify-between">
                            <span className="font-bold text-white text-sm">{b.customerName}</span>
                            <span className="text-xs text-brand-400 font-bold">{b.eventDate}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 font-bold mt-0.5">{b.dressName}</p>
                      </div>
                   </label>
                 ))}
              </div>
              <Button onClick={() => {
                 const data = filteredForPrint.filter((b:any) => printFilter.selectedIds.length === 0 || printFilter.selectedIds.includes(b.id));
                 if(data.length === 0) return showToast('اختر حجز واحد على الأقل', 'error');
                 onPrint(data, 'SCHEDULE');
                 setModal(null);
              }} className="w-full !rounded-2xl">إكمال الطباعة ({printFilter.selectedIds.length || filteredForPrint.length})</Button>
           </div>
        </Modal>
      )}

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'حجز جديد' : 'تعديل حجز'} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e: any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const drId = fd.get('dr') as string;
             const dr = dresses.find((x:any) => x.id === drId);
             const rp = Number(fd.get('rp')); const dep = Number(fd.get('dep'));
             
             if (dep > rp) {
                 setPendingSave({
                     customerName: fd.get('cn'), customerPhone: fd.get('ph'), customerAddress: fd.get('ca'),
                     dressId: drId, dressName: dr?.name || '', eventDate: fd.get('ed'), deliveryDate: fd.get('dd'),
                     rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep, notes: fd.get('notes'),
                     paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || '',
                     id: modal.id, // For Edit case
                     isEdit: modal.type === 'EDIT'
                 });
                 setModal({ type: 'VALIDATION_WARNING', msg: 'قيمة العربون أكبر من سعر الإيجار!' });
                 return;
             }

             const data: any = {
               customerName: fd.get('cn'), customerPhone: fd.get('ph'), customerAddress: fd.get('ca'),
               dressId: drId, dressName: dr?.name || '', eventDate: fd.get('ed'), deliveryDate: fd.get('dd'),
               rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep, notes: fd.get('notes'),
               status: modal.status || BookingStatus.PENDING, 
               createdAt: modal.createdAt || today,
               paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || ''
             };

             if (modal.type === 'EDIT') {
                data.id = modal.id;
             }
             
             if (data.status !== BookingStatus.CANCELLED && data.status !== BookingStatus.COMPLETED) {
                 const targetDate = new Date(data.eventDate);
                 const conflicts = bookings.filter((b: any) => {
                     if (b.dressId !== data.dressId) return false;
                     if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED) return false;
                     if (modal.type === 'EDIT' && b.id === modal.id) return false;
                     
                     const bDate = new Date(b.eventDate);
                     const diff = Math.abs(targetDate.getTime() - bDate.getTime());
                     const days = Math.ceil(diff / (1000 * 3600 * 24));
                     return days <= 2;
                 });

                 if (conflicts.length > 0) {
                     setPendingSave(data);
                     setModal({ type: 'CONFLICT_WARNING', conflicts });
                     return;
                 }
             }

             await executeSave(data);
           }} className="space-y-5">
             <div className="grid grid-cols-2 gap-4">
               <Input label="اسم العروس" name="cn" defaultValue={modal.customerName} required />
               <Input label="رقم الهاتف" name="ph" defaultValue={modal.customerPhone} required />
             </div>
             <Input label="العنوان" name="ca" defaultValue={modal.customerAddress} />
             <div className="space-y-2">
               <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">الفستان</label>
               <select name="dr" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all" defaultValue={modal.dressId} required>
                 <option value="">-- اختر الفستان --</option>
                 {dresses.filter((d:any) => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD)
                         .sort((a:any,b:any) => a.name.localeCompare(b.name, 'ar'))
                         .map((d:any) => (
                   <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                 ))}
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
             <div className="grid grid-cols-2 gap-4">
               <Input label="سعر الإيجار" name="rp" type="number" defaultValue={modal.rentalPrice} required />
               <Input label="العربون" name="dep" type="number" defaultValue={modal.paidDeposit} required />
             </div>
             <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع</label>
               <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" defaultValue={modal.paymentMethod} onChange={(e:any)=>setModal({...modal, payMethod: e.target.value})} required>
                  <option value="">-- اختر --</option>
                  {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
               </select>
               {(modal.payMethod === 'أخرى' || modal.paymentMethod === 'أخرى') && <Input label="تفاصيل الدفع الأخرى" name="opm" defaultValue={modal.otherPaymentMethod} required />}
             </div>
             <textarea name="notes" placeholder="ملاحظات..." defaultValue={modal.notes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold min-h-[100px]" />
             <Button className="w-full mt-4 !rounded-2xl">حفظ الحجز</Button>
           </form>
        </Modal>
      )}

      {modal?.type === 'VALIDATION_WARNING' && (
        <Modal title="تنبيه هام" onClose={() => setModal(null)}>
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 border border-orange-500/20">
                   <AlertTriangle size={40} />
               </div>
               <div>
                   <h3 className="font-black text-white text-xl">{modal.msg}</h3>
                   <p className="text-sm text-slate-400 mt-2">يرجى مراجعة البيانات المدخلة.</p>
               </div>
               <Button onClick={() => setModal({ ...pendingSave, type: pendingSave.isEdit ? 'EDIT' : 'ADD' })} className="w-full">تعديل البيانات</Button>
            </div>
        </Modal>
      )}

      {modal?.type === 'CONFLICT_WARNING' && (
        <Modal title="تحذير تعارض حجوزات" onClose={() => setModal(null)}>
            <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-2">
                    <AlertTriangle size={32} />
                </div>
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
              <Button type="button" onClick={() => onPrint(modal, 'SIZES')} variant="ghost" className="!rounded-2xl"><Printer size={20}/></Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}