
import React, { useState, useEffect, useRef } from 'react';
import { Users, Key, Edit, UserPlus, RotateCcw, BarChart3, AlertTriangle, Palette, Check, Wallet, Calculator, MessageCircle, Save, ShieldCheck, Download, Upload, FileJson, Loader } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { backupService } from '../services/backup';
import { UserRole, BookingStatus } from '../types';
import { Button, Input, Modal, ConfirmModal, Card } from '../components/UI';
import { PERMISSIONS_CATEGORIES } from '../utils/constants';
import { today, formatCurrency, DEFAULT_WA_TEMPLATES } from '../utils/helpers';

export default function SettingsView({ user, users, bookings, sales, finance, dresses, hasPerm, showToast, addLog, onThemeChange }: any) {
  const [modal, setModal] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('app_theme') || 'default');
  const [waConfig, setWaConfig] = useState<any>(null);

  // Backup & Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string>('');

  useEffect(() => {
    // Load WhatsApp Templates
    const fetchWaConfig = async () => {
        const doc = await cloudDb.getDoc(COLLS.METADATA, 'whatsapp_templates');
        setWaConfig(doc || DEFAULT_WA_TEMPLATES);
    };
    fetchWaConfig();
  }, []);

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

  // --- BACKUP & RESTORE LOGIC ---
  const handleBackupNow = () => {
      // Gather current data from props
      const fullData = { dresses, bookings, sales, finance, users, logs: [] }; 
      const success = backupService.exportData(fullData);
      if(success) showToast('تم تحميل النسخة الاحتياطية');
      else showToast('فشل التحميل', 'error');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const jsonContent = event.target?.result as string;
              const data = JSON.parse(jsonContent);
              
              // Basic Validation
              if (!data.dresses && !data.bookings && !data.users) {
                  throw new Error("ملف غير صالح: لا يحتوي على بيانات النظام المعروفة");
              }
              
              setRestoreFileContent(data);
              setModal({ type: 'CONFIRM_RESTORE_FILE' });
          } catch (err) {
              console.error(err);
              showToast('الملف تالف أو غير صالح', 'error');
          }
      };
      reader.readAsText(file);
      // Reset input so same file can be selected again if needed
      e.target.value = '';
  };

  const executeRestoreFromFile = async () => {
      if (!restoreFileContent) return;
      
      setModal(null); // Close confirmation modal
      setIsRestoring(true);
      setRestoreStatus('جاري تحليل البيانات...');

      try {
          const collectionsMap: any = {
              dresses: COLLS.DRESSES,
              bookings: COLLS.BOOKINGS,
              sales: COLLS.SALES,
              finance: COLLS.FINANCE,
              users: COLLS.USERS,
              logs: COLLS.LOGS
          };

          let totalRestored = 0;
          const collections = Object.keys(restoreFileContent);

          for (const key of collections) {
              const dbCollectionName = collectionsMap[key];
              const items = restoreFileContent[key];

              if (dbCollectionName && Array.isArray(items) && items.length > 0) {
                  setRestoreStatus(`جاري استعادة ${key} (${items.length} سجل)...`);
                  
                  // Process in chunks to avoid UI freeze or quota limits
                  for (const item of items) {
                      if (!item.id) continue;

                      // Sanitize data: remove undefined fields (Firestore doesn't like them)
                      const cleanItem = JSON.parse(JSON.stringify(item));

                      try {
                          // Use explicitly added 'set' to create/overwrite doc with specific ID
                          await cloudDb.set(dbCollectionName, item.id, cleanItem);
                          totalRestored++;
                      } catch (innerErr) {
                          console.warn(`Failed to restore item ${item.id} in ${key}:`, innerErr);
                          // Continue to next item
                      }
                  }
              }
          }

          addLog('استعادة نسخة', `تم استعادة النظام من ملف. السجلات المعالجة: ${totalRestored}`);
          setRestoreStatus('تمت العملية بنجاح!');
          
          setTimeout(() => {
              alert(`تم استعادة ${totalRestored} سجل بنجاح. سيتم إعادة تحميل النظام الآن.`);
              window.location.reload();
          }, 500);

      } catch (err: any) {
          console.error("Restore Error:", err);
          showToast(`حدث خطأ أثناء الاستعادة: ${err.message}`, 'error');
          setIsRestoring(false);
          setRestoreStatus('');
      }
  };

  // --- OPENING BALANCE WIZARD LOGIC ---
  // State for Opening Balance Wizard
  const [openingState, setOpeningState] = useState({ egp: 0, sdg: 0, rate: 50 });

  const handleOpeningBalance = () => {
      setModal({ type: 'OPENING_BALANCE' });
  };

  const executeOpeningBalance = async () => {
      // 1. Calculate Current Balances (Theoretically)
      const balances = { EGP: 0, SDG: 0, USD: 0 };
      finance.forEach((f: any) => {
          if (f.isFuture) return;
          const curr = (f.currency || 'EGP') as keyof typeof balances;
          const amt = f.currencyAmount || f.amount || 0;
          if (f.type === 'INCOME' || f.type === 'EXCHANGE_IN') balances[curr] += amt;
          if (f.type === 'EXPENSE' || f.type === 'EXCHANGE_OUT') balances[curr] -= amt;
      });

      // 2. Zero Out Existing Balances (Legacy Adjustment)
      for (const [currency, balance] of Object.entries(balances)) {
          if (Math.abs(balance) > 0) {
              await cloudDb.add(COLLS.FINANCE, {
                  type: balance > 0 ? 'EXPENSE' : 'INCOME', // Counteract the balance
                  category: 'تسوية فروقات سابقة',
                  amount: currency === 'EGP' ? Math.abs(balance) : 0, // EGP Impact
                  currency: currency,
                  currencyAmount: Math.abs(balance),
                  exchangeRate: 1,
                  notes: `تصفير رصيد ${currency} القديم (${formatCurrency(balance)}) لبدء فترة جديدة.`,
                  date: today
              });
          }
      }

      // 3. Add New Opening Balances
      // EGP Cash
      if (openingState.egp > 0) {
          await cloudDb.add(COLLS.FINANCE, {
              type: 'INCOME',
              category: 'رصيد افتتاحي (كاش)',
              amount: openingState.egp,
              currency: 'EGP',
              currencyAmount: openingState.egp,
              exchangeRate: 1,
              notes: 'بداية الرصيد الفعلي في الدرج',
              date: today
          });
      }

      // SDG Bankak
      if (openingState.sdg > 0) {
          const equivalentEGP = openingState.sdg * (openingState.rate || 0); // EGP Value for reports
          await cloudDb.add(COLLS.FINANCE, {
              type: 'INCOME',
              category: 'رصيد افتتاحي (بنكك)',
              amount: equivalentEGP,
              currency: 'SDG',
              currencyAmount: openingState.sdg,
              exchangeRate: openingState.rate,
              notes: `رصيد بنكك الافتتاحي (${openingState.sdg} SDG) بسعر صرف ${openingState.rate}`,
              date: today
          });
      }

      showToast('تم ضبط الأرصدة الافتتاحية بنجاح');
      addLog('ضبط أرصدة', `تم تصفير الأرصدة القديمة وضبط EGP: ${openingState.egp}, SDG: ${openingState.sdg}`);
      setModal(null);
  };

  const handleSaveWaTemplates = async (e: any) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const newConfig = {
          booking_confirm: fd.get('booking_confirm'),
          pickup_ready: fd.get('pickup_ready'),
          return_thanks: fd.get('return_thanks'),
          payment_reminder: fd.get('payment_reminder')
      };
      await cloudDb.update(COLLS.METADATA, 'whatsapp_templates', newConfig);
      setWaConfig(newConfig);
      showToast('تم حفظ قوالب الرسائل');
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
            {/* BACKUP & RESTORE CENTER */}
            <Card className="border-brand-500/20 bg-brand-900/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">أمان البيانات والنسخ الاحتياطي</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Backup & Restore Center</p>
                    </div>
                </div>
                
                {/* LOADING OVERLAY FOR RESTORE */}
                {isRestoring && (
                    <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center">
                        <Loader size={64} className="text-brand-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-black text-white mb-2">جاري استعادة البيانات...</h2>
                        <p className="text-sm text-slate-400 font-bold">{restoreStatus}</p>
                        <p className="text-xs text-red-400 mt-4 font-bold">يرجى عدم إغلاق الصفحة</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleBackupNow}
                        className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-white/5 rounded-3xl hover:bg-slate-800 hover:border-brand-500/30 transition-all group"
                    >
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
                            <Download size={28} />
                        </div>
                        <h4 className="font-black text-white text-sm">حفظ نسخة احتياطية الآن</h4>
                        <p className="text-[10px] text-slate-500 mt-1">تنزيل ملف JSON على جهازك</p>
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-white/5 rounded-3xl hover:bg-slate-800 hover:border-orange-500/30 transition-all group relative overflow-hidden"
                    >
                        <input 
                            type="file" 
                            accept=".json" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect}
                        />
                        <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-3 group-hover:scale-110 transition-transform">
                            <Upload size={28} />
                        </div>
                        <h4 className="font-black text-white text-sm">استعادة البيانات من ملف</h4>
                        <p className="text-[10px] text-slate-500 mt-1">تحديث قاعدة البيانات بملف سابق</p>
                    </button>
                </div>
            </Card>

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
                  <h4 className="text-white font-bold text-lg px-2 mt-4">أدوات الصيانة والإدارة</h4>
                  
                  <Button onClick={() => setModal({ type: 'WA_TEMPLATES' })} className="w-full !rounded-[2rem] h-16 text-base bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/10 uppercase tracking-widest font-black italic">
                      <MessageCircle size={22} className="ml-2"/> تخصيص رسائل واتساب (Templates)
                  </Button>

                  <Button onClick={handleFixFinance} className="w-full !rounded-[2rem] h-16 text-base bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/10 uppercase tracking-widest font-black italic">
                      <RotateCcw size={22} className="ml-2"/> مراجعة وتصحيح السجلات المالية
                  </Button>
                  <Button onClick={handleRecalculateCounts} className="w-full !rounded-[2rem] h-16 text-base bg-orange-600 hover:bg-orange-500 shadow-xl shadow-orange-900/10 uppercase tracking-widest font-black italic">
                      <BarChart3 size={22} className="ml-2"/> تحديث عدادات الإيجار (Recalculate)
                  </Button>
                  
                  <Button onClick={handleOpeningBalance} className="w-full !rounded-[2rem] h-16 text-base bg-slate-700 hover:bg-slate-600 shadow-xl shadow-slate-900/10 uppercase tracking-widest font-black italic">
                      <Wallet size={22} className="ml-2"/> ضبط الرصيد الافتتاحي (صفر العداد)
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

       {/* CONFIRMATION MODAL FOR RESTORE */}
       {modal?.type === 'CONFIRM_RESTORE_FILE' && (
         <ConfirmModal 
           title="استعادة البيانات"
           msg="تحذير: ستقوم هذه العملية بدمج وتحديث البيانات الحالية بالبيانات الموجودة في الملف. هل أنت متأكد تماماً من صحة الملف المختار؟"
           onConfirm={executeRestoreFromFile}
           onCancel={() => { setModal(null); setRestoreFileContent(null); }}
           confirmText="نعم، ابدأ الاستعادة"
           variant="danger"
           icon={FileJson}
         />
       )}

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

       {/* WA TEMPLATES EDITOR */}
       {modal?.type === 'WA_TEMPLATES' && (
         <Modal title="محرر قوالب واتساب" onClose={() => setModal(null)} size="lg">
            <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">المتغيرات المتاحة للاستخدام:</p>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-brand-400" dir="ltr">
                    <span>{`{Name}`}</span> <span>{`{Dress}`}</span> <span>{`{EventDate}`}</span> 
                    <span>{`{DeliveryDate}`}</span> <span>{`{Fitting1}`}</span> <span>{`{Fitting2}`}</span>
                    <span>{`{Deposit}`}</span> <span>{`{Remaining}`}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-2 font-bold">سيتم إضافة تذييل "رسالة تلقائية" إجبارياً في نهاية كل رسالة.</p>
            </div>
            <form onSubmit={handleSaveWaTemplates} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-white px-2">رسالة تأكيد الحجز</label>
                    <textarea name="booking_confirm" defaultValue={waConfig?.booking_confirm || DEFAULT_WA_TEMPLATES.booking_confirm} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-medium h-32 text-xs leading-relaxed" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-white px-2">رسالة جاهزية الاستلام</label>
                    <textarea name="pickup_ready" defaultValue={waConfig?.pickup_ready || DEFAULT_WA_TEMPLATES.pickup_ready} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-medium h-32 text-xs leading-relaxed" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-white px-2">رسالة شكر بعد الإرجاع</label>
                    <textarea name="return_thanks" defaultValue={waConfig?.return_thanks || DEFAULT_WA_TEMPLATES.return_thanks} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-medium h-24 text-xs leading-relaxed" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-white px-2">رسالة تذكير / مطالبة</label>
                    <textarea name="payment_reminder" defaultValue={waConfig?.payment_reminder || DEFAULT_WA_TEMPLATES.payment_reminder} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-medium h-24 text-xs leading-relaxed" />
                </div>
                <Button className="w-full !rounded-2xl h-16 shadow-xl"><Save size={20}/> حفظ التغييرات</Button>
            </form>
         </Modal>
       )}

       {/* OPENING BALANCE MODAL */}
       {modal?.type === 'OPENING_BALANCE' && (
         <Modal title="ضبط الرصيد الافتتاحي" onClose={() => setModal(null)} size="md">
            <div className="space-y-6">
                <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 text-xs text-blue-200 font-bold leading-relaxed">
                    <p>هذه الأداة تقوم بما يلي:</p>
                    <ul className="list-disc pr-4 mt-2 space-y-1 opacity-80">
                        <li>حساب الرصيد "النظري" الحالي في النظام وتصفيره (Zero-out) عبر عملية تسوية تلقائية.</li>
                        <li>إنشاء عمليات "إيداع" جديدة بالمبالغ الفعلية التي ستدخلها الآن.</li>
                        <li>لن يتم حذف أي سجلات قديمة، بل إضافة عمليات تسوية فقط.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                        <Input 
                            label="النقدية الفعلية بالمصري (الكاش في الدرج)" 
                            type="number" 
                            value={openingState.egp || ''}
                            onChange={(e:any) => setOpeningState({...openingState, egp: Number(e.target.value)})}
                            placeholder="مثلاً: 5000"
                            icon={Wallet}
                        />
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-4">
                        <Input 
                            label="رصيد بنكك الحالي (اختياري - SDG)" 
                            type="number" 
                            value={openingState.sdg || ''}
                            onChange={(e:any) => setOpeningState({...openingState, sdg: Number(e.target.value)})}
                            placeholder="مثلاً: 200000"
                        />
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Input 
                                    label="سعر الصرف الحالي (لتقييم رصيد بنكك)" 
                                    type="number" 
                                    value={openingState.rate || ''}
                                    onChange={(e:any) => setOpeningState({...openingState, rate: Number(e.target.value)})}
                                    icon={Calculator}
                                />
                            </div>
                            {openingState.sdg > 0 && (
                                <div className="pt-6">
                                    <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-3 py-2 rounded-xl">
                                        = {formatCurrency(openingState.sdg * openingState.rate)} EGP
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Button onClick={executeOpeningBalance} className="w-full !rounded-2xl h-16 shadow-xl text-base font-black">
                    <Check size={20} className="ml-2"/> تأكيد وبدء الفترة الجديدة
                </Button>
            </div>
         </Modal>
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
              
              <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                  {PERMISSIONS_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="mb-6 last:mb-0">
                      <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                        {cat.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.perms.map(p => (
                          <label key={p.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5 bg-slate-900/50">
                            <input type="checkbox" value={p.id} defaultChecked={modal.permissions?.includes(p.id)} className="w-5 h-5 accent-brand-500 rounded-lg shadow-sm" />
                            <span className="text-[12px] font-bold text-surface-200 leading-none pt-0.5">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
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
