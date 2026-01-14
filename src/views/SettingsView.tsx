
import React, { useState } from 'react';
import { Users, Key, Edit, UserPlus, RotateCcw, BarChart3, AlertTriangle, Palette, Check } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { UserRole, BookingStatus } from '../types';
import { Button, Input, Modal, Card, ConfirmModal } from '../components/UI';
import { PERMISSIONS_LIST } from '../utils/constants';
import { today } from '../utils/helpers';

export default function SettingsView({ user, users, bookings, sales, finance, dresses, hasPerm, showToast, addLog, onThemeChange }: any) {
  const [modal, setModal] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('app_theme') || 'default');

  const handleThemeSwitch = (theme: string) => {
    localStorage.setItem('app_theme', theme);
    setCurrentTheme(theme);
    
    // Notify the rest of the app immediately
    window.dispatchEvent(new Event('theme-change'));
    
    if (onThemeChange) onThemeChange(theme);
    showToast(`تم تغيير المظهر إلى ${theme === 'warm_gold' ? 'الذهبي الفاخر' : 'الافتراضي'}`);
  };

  const handleResetAll = async () => {
    setModal({ type: 'CONFIRM_RESET' });
  };

  const executeResetAll = async () => {
     await cloudDb.clearAll();
     showToast('تم تصفير النظام بنجاح تام');
     setModal(null);
     setTimeout(() => window.location.reload(), 1200);
  };

  const handleFixFinance = async () => {
    setModal({ type: 'CONFIRM_FIX' });
  };

  const executeFixFinance = async () => {
    let count = 0;
    const financeIds = new Set(finance.map((f:any) => f.relatedId).filter(Boolean));

    // Fix Bookings
    for (const b of bookings) {
        if (b.paidDeposit > 0 && !financeIds.has(b.id)) {
            await cloudDb.add(COLLS.FINANCE, {
                amount: b.paidDeposit,
                type: 'INCOME',
                category: 'حجز إيجار',
                notes: `عربون حجز فستان ${b.dressName} للعروس ${b.customerName} (تصحيح تلقائي)`,
                date: b.createdAt || today,
                relatedId: b.id
            });
            count++;
        }
    }

    // Fix Sales
    for (const s of sales) {
        if (s.deposit > 0 && !financeIds.has(s.id)) {
             await cloudDb.add(COLLS.FINANCE, {
               amount: s.deposit, 
               type: 'INCOME', 
               category: 'عربون تفصيل',
               notes: `عربون تفصيل فستان كود ${s.factoryCode} للعروس ${s.brideName} (تصحيح تلقائي)`,
               date: s.orderDate || today, 
               relatedId: s.id
             });
             count++;
        }
    }
    
    showToast(`تم إضافة ${count} سجل مالي مفقود`);
    addLog('تصحيح مالي', `تم تشغيل التصحيح التلقائي وإضافة ${count} سجل`);
    setModal(null);
  };

  const handleRecalculateCounts = async () => {
    setModal({ type: 'CONFIRM_RECALC' });
  };

  const executeRecalculateCounts = async () => {
    let updatedCount = 0;
    for (const d of dresses) {
        const realCount = bookings.filter((b: any) => b.dressId === d.id && b.status !== BookingStatus.CANCELLED).length;
        if (d.rentalCount !== realCount) {
            await cloudDb.update(COLLS.DRESSES, d.id, { rentalCount: realCount });
            updatedCount++;
        }
    }
    showToast(`تم تحديث عداد ${updatedCount} فستان`);
    addLog('صيانة', `إعادة احتساب عدادات الإيجار. تم تحديث ${updatedCount} سجل.`);
    setModal(null);
  };

  return (
    <div className="space-y-12 animate-fade-in pb-10 italic">
       <div className="text-center py-10 relative">
          <div className="w-32 h-32 bg-brand-500 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Users size={56} className="text-white"/>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight leading-none uppercase">{user.name}</h2>
          <p className="text-brand-500 font-black mt-3 tracking-[0.4em] uppercase text-xs">@{user.username} • {user.role}</p>
          <Button variant="ghost" onClick={() => setModal({ type: 'CHANGE_PASS' })} className="mx-auto mt-10 !rounded-2xl px-10 h-14 border-white/10 italic"><Key size={18}/> تغيير كلمة المرور</Button>
       </div>

       {/* THEME SWITCHER */}
       <Card>
          <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><Palette size={20}/> مظهر التطبيق (App Theme)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button 
               onClick={() => handleThemeSwitch('default')}
               className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${currentTheme === 'default' ? 'border-brand-500 bg-brand-500/10' : 'border-white/5 bg-slate-900/50 hover:bg-slate-900'}`}
             >
                <div className="flex items-center gap-4 z-10">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 shadow-lg"></div>
                   <div className="text-right">
                      <p className="font-black text-white">الافتراضي (أزرق/بارد)</p>
                      <p className="text-[10px] text-slate-400 font-bold">Original Cool Vibes</p>
                   </div>
                </div>
                {currentTheme === 'default' && <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white"><Check size={16}/></div>}
             </button>

             <button 
               onClick={() => handleThemeSwitch('warm_gold')}
               className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${currentTheme === 'warm_gold' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/5 bg-slate-900/50 hover:bg-slate-900'}`}
             >
                <div className="flex items-center gap-4 z-10">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8a6d1c] shadow-lg border border-[#F5EFE0]/20"></div>
                   <div className="text-right">
                      <p className="font-black text-white">الملكي (ذهبي/دافئ)</p>
                      <p className="text-[10px] text-slate-400 font-bold">Luxury Warm Gold</p>
                   </div>
                </div>
                {currentTheme === 'warm_gold' && <div className="w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white"><Check size={16}/></div>}
             </button>
          </div>
       </Card>

       {hasPerm('admin_reset') && (
         <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(users as any[]).map((u: any) => (
                <Card key={u.id} className="flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-white/5 italic">{(u.name as string).charAt(0)}</div>
                     <div><p className="font-black text-white text-base leading-tight tracking-tight">{u.name}</p><p className="text-[10px] text-slate-600 font-bold tracking-widest mt-1 italic uppercase">@{u.username}</p></div>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="ghost" onClick={() => setModal({ ...u, type: 'EDIT_USER' })} className="!w-10 !h-10 !p-0 !rounded-xl transition-transform hover:scale-110"><Edit size={16}/></Button>
                   </div>
                </Card>
              ))}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
               <Button onClick={() => setModal({ type: 'ADD_USER' })} className="w-full !rounded-[2rem] h-18 text-base shadow-xl shadow-brand-900/10 uppercase tracking-widest font-black italic"><UserPlus size={22}/> إضافة موظف جديد</Button>
               
               <div className="space-y-4">
                  <h4 className="text-white font-bold text-lg px-2 mt-4">أدوات الصيانة</h4>
                  
                  <Button onClick={handleFixFinance} className="w-full !rounded-[2rem] h-16 text-base bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/10 uppercase tracking-widest font-black italic">
                      <RotateCcw size={22} className="ml-2"/> مراجعة وتصحيح السجلات المالية
                  </Button>
                  <Button onClick={handleRecalculateCounts} className="w-full !rounded-[2rem] h-16 text-base bg-orange-600 hover:bg-orange-500 shadow-xl shadow-orange-900/10 uppercase tracking-widest font-black italic">
                      <BarChart3 size={22} className="ml-2"/> تحديث عدادات الإيجار (Recalculate)
                  </Button>
               </div>
            </div>

            <div className="p-12 bg-red-950/20 border border-red-500/20 rounded-[4rem] text-center mt-20 relative overflow-hidden">
               <AlertTriangle size={48} className="mx-auto text-red-500 mb-6" />
               <h4 className="text-red-500 font-black text-2xl mb-4 italic">منطقة الخطر</h4>
               <Button variant="danger" onClick={handleResetAll} className="w-full h-18 text-lg font-black !rounded-[2.5rem]">تصفير النظام بالكامل</Button>
            </div>
         </div>
       )}

       {/* CONFIRMATION MODALS */}
       {modal?.type === 'CONFIRM_RESET' && (
         <ConfirmModal 
           title="تصفير النظام"
           msg="تحذير أمان قصوى: سيتم مسح كافة سجلات السحابة بالكامل والعودة لنقطة الصفر. هذا الإجراء لا يمكن التراجع عنه. استمرار؟"
           onConfirm={executeResetAll}
           onCancel={() => setModal(null)}
           confirmText="نعم، دمر البيانات"
         />
       )}

       {modal?.type === 'CONFIRM_FIX' && (
         <ConfirmModal 
           title="تصحيح مالي"
           msg="سيتم مراجعة جميع الحجوزات وطلبات البيع وإضافة السجلات المالية المفقودة للعربون. هل أنت متأكد؟"
           onConfirm={executeFixFinance}
           onCancel={() => setModal(null)}
           confirmText="بدء الفحص والتصحيح"
           variant="primary"
           icon={RotateCcw}
         />
       )}

       {modal?.type === 'CONFIRM_RECALC' && (
         <ConfirmModal 
           title="تحديث العدادات"
           msg="سيتم إعادة حساب عدد مرات الإيجار لكل فستان بناءً على الحجوزات المسجلة. هل أنت متأكد؟"
           onConfirm={executeRecalculateCounts}
           onCancel={() => setModal(null)}
           confirmText="تحديث الآن"
           variant="primary"
           icon={BarChart3}
         />
       )}
       
       {(modal?.type === 'ADD_USER' || modal?.type === 'EDIT_USER') && (
         <Modal title={modal.type === 'ADD_USER' ? 'موظف جديد' : 'تعديل موظف'} onClose={() => setModal(null)} size="lg">
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const perms = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => (c as HTMLInputElement).value);
              const data = { name: fd.get('n'), username: fd.get('u'), role: UserRole.EMPLOYEE, permissions: perms };
              if (modal.type === 'ADD_USER') { (data as any).password = '123'; (data as any).firstLogin = true; await cloudDb.add(COLLS.USERS, data); }
              else await cloudDb.update(COLLS.USERS, modal.id, data);
              showToast('تم حفظ بيانات الموظف'); setModal(null);
            }} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <Input label="الاسم الكامل" name="n" defaultValue={modal.name} required />
                <Input label="اسم المستخدم" name="u" defaultValue={modal.username} required />
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-6 rounded-3xl border border-white/5 max-h-[40vh] overflow-y-auto custom-scrollbar italic">
                  {(PERMISSIONS_LIST as any[]).map((p: any) => (
                    <label key={p.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                      <input type="checkbox" value={p.id} defaultChecked={modal.permissions?.includes(p.id)} className="w-6 h-6 accent-brand-500 rounded-lg shadow-sm" />
                      <span className="text-[13px] font-bold text-surface-200 uppercase tracking-widest leading-none">{p.label}</span>
                    </label>
                  ))}
              </div>
              <Button className="w-full !rounded-2xl h-16 shadow-xl uppercase italic tracking-widest">حفظ بيانات الموظف</Button>
            </form>
         </Modal>
       )}

       {modal?.type === 'CHANGE_PASS' && (
         <Modal title="تغيير كلمة السر" onClose={() => setModal(null)}>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const p = new FormData(e.currentTarget).get('p') as string;
              await cloudDb.update(COLLS.USERS, user.id, { password: p });
              showToast('تم التحديث'); setModal(null);
            }} className="space-y-6">
               <Input label="كلمة السر الجديدة" name="p" type="password" required />
               <Button className="w-full h-16 !rounded-2xl italic tracking-widest uppercase">حفظ</Button>
            </form>
         </Modal>
       )}
    </div>
  );
}
