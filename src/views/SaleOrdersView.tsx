
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Printer, Edit, Trash2, AlertTriangle, Calculator, RefreshCw, Ruler, Check, MessageCircle, Send } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { SaleStatus, FactoryPaymentStatus } from '../types';
import { Button, Input, Modal, Card, ConfirmModal } from '../components/UI';
import { today, formatCurrency, getWhatsAppLink, DEFAULT_WA_TEMPLATES, WATemplateKey } from '../utils/helpers';
import { PAYMENT_METHODS, MEASUREMENT_FIELDS, COUNTRY_CODES } from '../utils/constants';
import PrintPreviewModal from '../components/PrintPreviewModal';

export default function SaleOrdersView({ sales, finance, query, hasPerm, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'active' | 'completed'>('active');
  const [modal, setModal] = useState<any>(null);
  const [pendingSave, setPendingSave] = useState<any>(null);
  
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
    return sales.filter((s: any) => (s.brideName.toLowerCase().includes(query.toLowerCase()) || s.factoryCode.toLowerCase().includes(query.toLowerCase()))).filter((s: any) => {
      if (subTab === 'active') return s.status !== SaleStatus.DELIVERED && s.status !== SaleStatus.CANCELLED;
      if (subTab === 'completed') return s.status === SaleStatus.DELIVERED || s.status === SaleStatus.CANCELLED;
      return true;
    }).sort((a: any, b: any) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate));
  }, [sales, subTab, query]);

  const handleDelete = async (s: any) => {
    setModal({ type: 'CONFIRM_DELETE', data: s });
  };

  const executeDelete = async (s: any) => {
    try {
      await cloudDb.delete(COLLS.SALES, s.id);
      const relatedFinance = (finance || []).filter((f: any) => f.relatedId === s.id);
      for (const f of relatedFinance) {
        await cloudDb.delete(COLLS.FINANCE, f.id);
      }
      showToast('تم حذف الطلب وتصفية المالية');
      addLog('حذف بيع', `تم حذف طلب البيع للعروس ${s.brideName} وتصفية عملياته المالية`);
      setModal(null);
    } catch (err) {
      showToast('خطأ في الحذف', 'error');
    }
  };

  const openModal = (type: 'ADD' | 'EDIT', item?: any) => {
      if (type === 'EDIT' && item) {
          let code = '+20';
          let num = item.bridePhone || '';
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
     let sId = data.id;
     const isAdd = !sId; 

     const finalData = {
        ...data,
        originalCurrency: calcState.currency !== 'EGP' ? calcState.currency : 'EGP',
        foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
        exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
     };

     if (isAdd) {
       sId = await cloudDb.add(COLLS.SALES, finalData);
       const deposit = Number(finalData.deposit);
       if (deposit > 0) {
          await cloudDb.add(COLLS.FINANCE, {
            amount: deposit,
            currency: finalData.originalCurrency,
            currencyAmount: finalData.foreignAmount || deposit,
            exchangeRate: finalData.exchangeRate,
            type: 'INCOME', category: 'عربون تفصيل',
            notes: `عربون تفصيل فستان كود ${finalData.factoryCode} للعروس ${finalData.brideName}`,
            date: finalData.orderDate, relatedId: sId
          });
       }
     } else {
       await cloudDb.update(COLLS.SALES, finalData.id, finalData);
     }
     showToast('تم الحفظ بنجاح'); 
     setModal(null); setPendingSave(null);
     setCalcState({ currency: 'EGP', egpAmount: 0, foreignAmount: 0, rate: 0 });
  };

  const handleWhatsAppClick = (s: any) => {
      setModal({ type: 'WHATSAPP_TEMPLATES', data: s });
  };

  const sendWhatsApp = (templateType: WATemplateKey, data: any) => {
      const waData = {
          Name: data.brideName,
          Dress: data.factoryCode,
          DeliveryDate: data.expectedDeliveryDate,
          Deposit: data.deposit,
          Remaining: data.remainingFromBride
      };
      // SALE_CONFIRM template doesn't use Fitting dates
      const url = getWhatsAppLink(data.bridePhone, templateType, waData, waTemplates);
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
    <div className="space-y-6 animate-fade-in">
       {/* Top Bar */}
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['active', 'completed'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'active' ? 'قيد التنفيذ' : 'مكتمل / ملغي'}
          </button>
        ))}
      </div>

      {subTab === 'active' && hasPerm('add_sale') && (
        <Button onClick={() => openModal('ADD')} className="w-full !rounded-[2rem] h-16 shadow-xl"><Plus size={20}/> تسجيل طلب تفصيل/بيع</Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((s: any) => {
          const hasMeasurements = s.measurements && Object.keys(s.measurements).length > 0;
          return (
            <Card key={s.id} className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-orange-500 opacity-20"></div>
              <div className="flex justify-between items-start mb-6">
                <div><h4 className="text-xl font-black text-white tracking-tight">{s.brideName}</h4><p className="text-xs font-bold text-surface-500 mt-1 tracking-widest" dir="ltr">{s.bridePhone}</p></div>
                <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-500/10">{s.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-6 bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-6">
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">كود المصنع</span><p className="text-sm font-bold text-white italic truncate">{s.factoryCode}</p></div>
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">الاستلام المتوقع</span><p className="text-sm font-bold text-white tracking-tight">{s.expectedDeliveryDate}</p></div>
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">المتبقي</span><p className="text-sm font-black text-red-400">{formatCurrency(s.remainingFromBride)}</p></div>
                <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">حالة المصنع</span><p className="text-sm font-black text-brand-400 tracking-tight">{s.factoryStatus}</p></div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleWhatsAppClick(s)} className="!w-12 !h-12 !p-0 text-emerald-500 hover:bg-emerald-500/10"><MessageCircle size={18}/></Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setModal({ ...s, type: 'MEASURE' })} 
                  className={`flex-1 !h-12 !text-[10px] font-bold ${hasMeasurements ? 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' : 'text-orange-400 bg-orange-500/5 hover:bg-orange-500/10'}`}
                >
                  {hasMeasurements ? <Check size={16}/> : <Ruler size={16}/>}
                  {hasMeasurements ? 'تم أخذ المقاسات' : 'لم يتم تسجيل المقاسات'}
                </Button>
                <Button variant="ghost" onClick={() => openPrintModal(s, 'DEPOSIT')} className="!w-12 !h-12 !p-0 text-brand-400"><Printer size={18}/></Button>
                <Button variant="ghost" onClick={() => openModal('EDIT', s)} className="!w-12 !h-12 !p-0 text-surface-500"><Edit size={18}/></Button>
                <Button variant="ghost" onClick={() => handleDelete(s)} className="!w-12 !h-12 !p-0 text-red-400"><Trash2 size={18}/></Button>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="text-center py-20 opacity-20"><Plus size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-sm">No items found</p></div>}

      {/* CONFIRM DELETE MODAL */}
      {modal?.type === 'CONFIRM_DELETE' && (
        <ConfirmModal 
          title="حذف الطلب"
          msg="سيتم حذف طلب البيع وكافة العمليات المالية المرتبطة به. هل أنت متأكد؟"
          onConfirm={() => executeDelete(modal.data)}
          onCancel={() => setModal(null)}
          confirmText="نعم، حذف نهائي"
        />
      )}

      {/* WHATSAPP TEMPLATES MODAL */}
      {modal?.type === 'WHATSAPP_TEMPLATES' && (
        <Modal title="مراسلة العروس (واتساب)" onClose={() => setModal(null)} size="sm">
           <div className="space-y-4">
              <p className="text-sm font-bold text-slate-400 text-center mb-4">اختر نوع الرسالة للإرسال:</p>
              <button onClick={() => sendWhatsApp('SALE_CONFIRM', modal.data)} className="w-full p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center gap-4 hover:bg-brand-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0"><Check size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">تأكيد التفصيل/البيع</h4><p className="text-[10px] text-slate-400">تأكيد الموديل والمقاسات وموعد الاستلام</p></div>
              </button>
              <button onClick={() => sendWhatsApp('PICKUP_READY', modal.data)} className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 hover:bg-blue-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"><Check size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">التجهيز والاستلام</h4><p className="text-[10px] text-slate-400">إشعار بجاهزية الفستان والمتبقي المالي</p></div>
              </button>
              <button onClick={() => sendWhatsApp('PAYMENT_REMINDER', modal.data)} className="w-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-4 hover:bg-orange-500/20 transition-all group text-right">
                 <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0"><AlertTriangle size={20}/></div>
                 <div><h4 className="font-black text-white text-sm">تذكير عام</h4><p className="text-[10px] text-slate-400">تذكير بموعد أو دفعة مالية</p></div>
              </button>
           </div>
        </Modal>
      )}

      {/* Modal - Add/Edit Sale */}
      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'طلب تفصيل جديد' : 'تعديل الطلب'} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e: any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const fc = fd.get('fc') as string;
             const sp = Number(fd.get('sp')); 
             const fp = Number(fd.get('fp'));
             const dep = calcState.egpAmount; // Use Calculated EGP Value
             const fullPhone = `${phoneCode}${localPhone}`.trim();

             const data: any = {
               brideName: fd.get('bn'), 
               bridePhone: fullPhone,
               brideAddress: fd.get('ba'),
               factoryCode: fc, 
               description: fd.get('desc'),
               expectedDeliveryDate: fd.get('edd'),
               sellPrice: sp, 
               factoryPrice: fp,
               deposit: dep, 
               remainingFromBride: sp - dep, 
               factoryDepositPaid: modal.factoryDepositPaid || 0,
               status: modal.status || SaleStatus.DESIGNING, 
               factoryStatus: modal.factoryStatus || FactoryPaymentStatus.UNPAID,
               orderDate: modal.orderDate || today,
               paymentMethod: fd.get('pm'), 
               otherPaymentMethod: fd.get('opm') || '',
               // Currency Details
               originalCurrency: calcState.currency,
               foreignAmount: calcState.currency !== 'EGP' ? calcState.foreignAmount : 0,
               exchangeRate: calcState.currency !== 'EGP' ? calcState.rate : 1,
             };

             if (modal.type === 'EDIT') data.id = modal.id;
             
             if (dep > sp) {
                 setPendingSave({ ...data, id: modal.id, isEdit: modal.type === 'EDIT' });
                 setModal({ type: 'VALIDATION_WARNING', msg: 'قيمة العربون أكبر من سعر البيع!' });
                 return;
             }

             await executeSave(data);
           }} className="space-y-5">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input label="اسم العروس" name="bn" defaultValue={modal.brideName} required />
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
             
             <Input label="العنوان" name="ba" defaultValue={modal.brideAddress} />
             
             <div className="grid grid-cols-2 gap-4">
                <Input label="كود المصنع / اسم الفستان" name="fc" defaultValue={modal.factoryCode} required />
                <Input label="موعد الاستلام المتوقع" name="edd" type="date" defaultValue={modal.expectedDeliveryDate} required />
             </div>

             <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
               <Input label="سعر البيع للعروس (EGP)" name="sp" type="number" defaultValue={modal.sellPrice} required />
               <Input label="تكلفة المصنع (للحسابات)" name="fp" type="number" defaultValue={modal.factoryPrice} required />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <Input label="العربون المدفوع (EGP)" name="dep" type="number" value={calcState.egpAmount || ''} required onChange={(e:any) => handleCalc('EGP', Number(e.target.value))} />
               <div className="space-y-2">
                 <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع</label>
                 <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" defaultValue={modal.paymentMethod} onChange={(e:any)=>handlePaymentMethodChange(e.target.value)} required>
                    <option value="">-- اختر --</option>
                    {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
                 </select>
               </div>
             </div>

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
             <textarea name="desc" placeholder="تفاصيل الفستان والملاحظات..." defaultValue={modal.description} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold min-h-[100px]" />
             <Button className="w-full mt-4 !rounded-2xl">حفظ الطلب</Button>
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

      {modal?.type === 'MEASURE' && (
        <Modal title="تسجيل المقاسات" onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {};
            MEASUREMENT_FIELDS.forEach(f => { m[f.id] = fd.get(f.id); });
            m.unit = fd.get('unit');
            m.orderNotes = fd.get('orderNotes');
            const coll = COLLS.SALES;
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
