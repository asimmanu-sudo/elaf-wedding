
import React, { useState, useEffect, useRef } from 'react';
import { Users, Key, Edit, UserPlus, RotateCcw, BarChart3, AlertTriangle, Check, Wallet, Calculator, MessageCircle, Save, ShieldCheck, Download, Upload, FileJson, Loader, Trash2, Eye, ShieldAlert, Database, Wrench, Lock } from 'lucide-react';
import { cloudDb, COLLS } from '../services/firebase';
import { backupService } from '../services/backup';
import { UserRole, BookingStatus } from '../types';
import { Button, Input, Modal, ConfirmModal, Card } from '../components/UI';
import { PERMISSIONS_CATEGORIES } from '../utils/constants';
import { today, formatCurrency, DEFAULT_WA_TEMPLATES } from '../utils/helpers';

export default function SettingsView({ user, users, bookings, sales, finance, dresses, hasPerm, showToast, addLog }: any) {
  const [activeTab, setActiveTab] = useState('staff');
  const [modal, setModal] = useState<any>(null);
  const [waConfig, setWaConfig] = useState<any>(null);

  // Backup & Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string>('');

  // Security Logs State
  const [sensitiveLogs, setSensitiveLogs] = useState<any[]>([]);

  // Permission Check for Admin Tabs
  const isAdminOrManager = hasPerm('admin_reset') || hasPerm('view_settings') || user.role === UserRole.ADMIN;

  useEffect(() => {
    // Load WhatsApp Templates
    const fetchWaConfig = async () => {
        const doc = await cloudDb.getDoc(COLLS.METADATA, 'whatsapp_templates');
        setWaConfig(doc || DEFAULT_WA_TEMPLATES);
    };
    fetchWaConfig();

    // Load Sensitive Logs (Only if admin)
    if (isAdminOrManager) {
        const fetchSecurityLogs = () => {
        const unsub = cloudDb.subscribe(COLLS.LOGS, (allLogs) => {
            const keywords = ['حذف', 'Delete', 'تراجع', 'Undo', 'تصفير', 'Reset', 'تعديل', 'Edit'];
            const filtered = allLogs
                .filter((l: any) => keywords.some(k => (l.action || '').includes(k)))
                .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 100); 
            setSensitiveLogs(filtered);
        });
        return unsub;
        };
        const unsubLogs = fetchSecurityLogs();
        return () => unsubLogs();
    }
  }, [isAdminOrManager]);

  // --- ACTIONS & HANDLERS ---
  const handleResetAll = async () => { setModal({ type: 'CONFIRM_RESET' }); };

  const executeResetAll = async () => {
     await cloudDb.clearAll();
     showToast('تم تصفير النظام بنجاح تام');
     setModal(null);
     setTimeout(() => window.location.reload(), 1200);
  };

  const handleFixFinance = async () => { setModal({ type: 'CONFIRM_FIX' }); };

  const executeFixFinance = async () => {
    let count = 0;
    const financeIds = new Set(finance.map((f:any) => f.relatedId).filter(Boolean));
    // Fix Bookings
    for (const b of bookings) {
        if (b.paidDeposit > 0 && !financeIds.has(b.id)) {
            await cloudDb.add(COLLS.FINANCE, {
                amount: b.paidDeposit,
                type: 'INCOME', category: 'حجز إيجار',
                notes: `عربون حجز فستان ${b.dressName} للعروس ${b.customerName} (تصحيح تلقائي)`,
                date: b.createdAt || today, relatedId: b.id
            });
            count++;
        }
    }
    // Fix Sales
    for (const s of sales) {
        if (s.deposit > 0 && !financeIds.has(s.id)) {
             await cloudDb.add(COLLS.FINANCE, {
               amount: s.deposit, type: 'INCOME', category: 'عربون تفصيل',
               notes: `عربون تفصيل فستان كود ${s.factoryCode} للعروس ${s.brideName} (تصحيح تلقائي)`,
               date: s.orderDate || today, relatedId: s.id
             });
             count++;
        }
    }
    showToast(`تم إضافة ${count} سجل مالي مفقود`);
    addLog('تصحيح مالي', `تم تشغيل التصحيح التلقائي وإضافة ${count} سجل`);
    setModal(null);
  };

  const handleRecalculateCounts = async () => { setModal({ type: 'CONFIRM_RECALC' }); };

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

  const handleBackupNow = () => {
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
              if (!data.dresses && !data.bookings && !data.users) throw new Error("ملف غير صالح");
              setRestoreFileContent(data);
              setModal({ type: 'CONFIRM_RESTORE_FILE' });
          } catch (err) {
              console.error(err);
              showToast('الملف تالف أو غير صالح', 'error');
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const executeRestoreFromFile = async () => {
      if (!restoreFileContent) return;
      setModal(null); setIsRestoring(true); setRestoreStatus('جاري تحليل البيانات...');
      try {
          const collectionsMap: any = { dresses: COLLS.DRESSES, bookings: COLLS.BOOKINGS, sales: COLLS.SALES, finance: COLLS.FINANCE, users: COLLS.USERS, logs: COLLS.LOGS };
          let totalRestored = 0;
          const collections = Object.keys(restoreFileContent);
          for (const key of collections) {
              const dbCollectionName = collectionsMap[key];
              const items = restoreFileContent[key];
              if (dbCollectionName && Array.isArray(items) && items.length > 0) {
                  setRestoreStatus(`جاري استعادة ${key} (${items.length} سجل)...`);
                  for (const item of items) {
                      if (!item.id) continue;
                      const cleanItem = JSON.parse(JSON.stringify(item));
                      try { await cloudDb.set(dbCollectionName, item.id, cleanItem); totalRestored++; } catch (innerErr) { console.warn(`Failed to restore item ${item.id}`, innerErr); }
                  }
              }
          }
          addLog('استعادة نسخة', `تم استعادة النظام من ملف. السجلات المعالجة: ${totalRestored}`);
          setRestoreStatus('تمت العملية بنجاح!');
          setTimeout(() => { alert(`تم استعادة ${totalRestored} سجل. سيتم إعادة التحميل.`); window.location.reload(); }, 500);
      } catch (err: any) {
          console.error("Restore Error:", err);
          showToast(`حدث خطأ أثناء الاستعادة: ${err.message}`, 'error');
          setIsRestoring(false); setRestoreStatus('');
      }
  };

  // --- OPENING BALANCE WIZARD LOGIC ---
  const [openingState, setOpeningState] = useState({ egp: 0, sdg: 0, rate: 50 });
  const handleOpeningBalance = () => { setModal({ type: 'OPENING_BALANCE' }); };
  const executeOpeningBalance = async () => {
      const balances = { EGP: 0, SDG: 0, USD: 0 };
      finance.forEach((f: any) => {
          if (f.isFuture) return;
          const curr = (f.currency || 'EGP') as keyof typeof balances;
          const amt = f.currencyAmount || f.amount || 0;
          if (f.type === 'INCOME' || f.type === 'EXCHANGE_IN') balances[curr] += amt;
          if (f.type === 'EXPENSE' || f.type === 'EXCHANGE_OUT') balances[curr] -= amt;
      });
      for (const [currency, balance] of Object.entries(balances)) {
          if (Math.abs(balance) > 0) {
              await cloudDb.add(COLLS.FINANCE, {
                  type: balance > 0 ? 'EXPENSE' : 'INCOME', category: 'تسوية فروقات سابقة',
                  amount: currency === 'EGP' ? Math.abs(balance) : 0, currency: currency,
                  currencyAmount: Math.abs(balance), exchangeRate: 1,
                  notes: `تصفير رصيد ${currency} القديم (${formatCurrency(balance)}) لبدء فترة جديدة.`, date: today
              });
          }
      }
      if (openingState.egp > 0) {
          await cloudDb.add(COLLS.FINANCE, { type: 'INCOME', category: 'رصيد افتتاحي (كاش)', amount: openingState.egp, currency: 'EGP', currencyAmount: openingState.egp, exchangeRate: 1, notes: 'بداية الرصيد الفعلي في الدرج', date: today });
      }
      if (openingState.sdg > 0) {
          const equivalentEGP = openingState.sdg * (openingState.rate || 0);
          await cloudDb.add(COLLS.FINANCE, { type: 'INCOME', category: 'رصيد افتتاحي (بنكك)', amount: equivalentEGP, currency: 'SDG', currencyAmount: openingState.sdg, exchangeRate: openingState.rate, notes: `رصيد بنكك الافتتاحي (${openingState.sdg} SDG) بسعر صرف ${openingState.rate}`, date: today });
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

  const handleDeleteUser = (u: any) => { setModal({ type: 'CONFIRM_DELETE_USER', targetUser: u }); };
  const executeDeleteUser = async (u: any) => {
      try {
          await cloudDb.delete(COLLS.USERS, u.id);
          showToast(`تم حذف الموظف ${u.name}`);
          addLog('حذف موظف', `قام ${user.name} بحذف حساب الموظف ${u.name} (${u.username})`);
          setModal(null);
      } catch (err) { showToast('فشل الحذف', 'error'); }
  };

  // --- TABS CONFIG ---
  const tabs = [
      { id: 'staff', label: 'الموظفين', icon: Users, show: true },
      { id: 'security', label: 'الأمان', icon: ShieldAlert, show: isAdminOrManager },
      { id: 'backup', label: 'النسخ', icon: Database, show: isAdminOrManager },
      { id: 'maintenance', label: 'الصيانة', icon: Wrench, show: isAdminOrManager },
  ].filter(t => t.show);

  return (
    <div className="space-y-6 animate-fade-in pb-10 italic">
       
       {/* TABS NAVIGATION */}
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg overflow-x-auto custom-scrollbar">
        {tabs.map((t) => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)} 
            className={`flex-1 h-12 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap min-w-[100px] ${activeTab === t.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
       </div>

       {/* TAB 1: STAFF & PROFILE */}
       {activeTab === 'staff' && (
         <div className="space-y-8 animate-fade-in">
             {/* Current User Card */}
            <div className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500"></div>
                <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <Users size={40} className="text-brand-500"/>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{user.name}</h2>
                <p className="text-brand-500 font-bold mt-1 tracking-widest uppercase text-[10px]">@{user.username} • {user.role}</p>
                <div className="mt-6 flex justify-center">
                    <Button variant="ghost" onClick={() => setModal({ type: 'CHANGE_PASS' })} className="!rounded-xl h-12 px-6 text-xs border-white/10"><Key size={14}/> تغيير كلمة المرور</Button>
                </div>
            </div>

            {/* Staff List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end px-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">فريق العمل</h3>
                    {hasPerm('manage_users') && <Button onClick={() => setModal({ type: 'ADD_USER' })} className="!h-10 !px-4 text-xs !rounded-xl bg-slate-800 border border-white/5 hover:bg-slate-700"><UserPlus size={14}/> إضافة موظف</Button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(users || []).map((u: any) => {
                        const displayName = u.name || 'مستخدم غير معروف';
                        const isSelf = u.id === user.id;
                        const isProtected = u.username === 'admin' || u.id === 'master';
                        const canManage = hasPerm('manage_users');
                        const canDelete = hasPerm('delete_users') && !isSelf && !isProtected;

                        return (
                            <Card key={u.id} className="flex justify-between items-center group !p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-slate-500 font-bold border border-white/5">{displayName.charAt(0)}</div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{displayName} {isSelf && <span className="text-[9px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-md mr-1">أنت</span>}</p>
                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">@{u.username} • {u.role}</p>
                                    </div>
                                </div>
                                {canManage && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setModal({ ...u, type: 'EDIT_USER' })} className="w-9 h-9 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><Edit size={14}/></button>
                                        {canDelete && <button onClick={() => handleDeleteUser(u)} className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>
         </div>
       )}

       {/* TAB 2: SECURITY */}
       {activeTab === 'security' && isAdminOrManager && (
         <div className="space-y-6 animate-fade-in">
             <Card 
                className="border-red-500/20 bg-red-900/5 hover:bg-red-900/10 hover:border-red-500/40 transition-all cursor-pointer group"
                onClick={() => setModal({ type: 'SECURITY_LOGS' })}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">سجل العمليات الحساسة</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">مراقبة عمليات الحذف، التعديل المالي، والتصفير</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20"><Eye size={20}/></div>
                </div>
            </Card>
            
            <div className="p-6 bg-slate-950 border border-white/5 rounded-3xl text-center opacity-50">
                <Lock size={32} className="mx-auto mb-2 text-slate-600"/>
                <p className="text-xs text-slate-500">ميزات أمان إضافية قريباً (2FA, Login History)</p>
            </div>
         </div>
       )}

       {/* TAB 3: BACKUP */}
       {activeTab === 'backup' && isAdminOrManager && (
         <div className="space-y-6 animate-fade-in">
             {/* LOADING OVERLAY FOR RESTORE */}
            {isRestoring && (
                <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center">
                    <Loader size={64} className="text-brand-500 animate-spin mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2">جاري استعادة البيانات...</h2>
                    <p className="text-sm text-slate-400 font-bold">{restoreStatus}</p>
                    <p className="text-xs text-red-400 mt-4 font-bold">يرجى عدم إغلاق الصفحة</p>
                </div>
            )}

             <Card className="border-brand-500/20 bg-brand-900/5">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">النسخ الاحتياطي والاستعادة</h3>
                        <p className="text-[10px] text-slate-400 font-bold">حفظ بيانات النظام محلياً أو استعادتها</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleBackupNow}
                        className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-white/5 rounded-3xl hover:bg-slate-800 hover:border-emerald-500/30 transition-all group"
                    >
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                            <Download size={32} />
                        </div>
                        <h4 className="font-black text-white">تحميل نسخة احتياطية</h4>
                        <p className="text-[10px] text-slate-500 mt-1">تنزيل ملف JSON</p>
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-white/5 rounded-3xl hover:bg-slate-800 hover:border-orange-500/30 transition-all group relative overflow-hidden"
                    >
                        <input 
                            type="file" 
                            accept=".json" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect}
                        />
                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                        </div>
                        <h4 className="font-black text-white">استعادة من ملف</h4>
                        <p className="text-[10px] text-slate-500 mt-1">تحديث قاعدة البيانات</p>
                    </button>
                </div>
            </Card>
         </div>
       )}

       {/* TAB 4: MAINTENANCE */}
       {activeTab === 'maintenance' && isAdminOrManager && (
         <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={() => setModal({ type: 'WA_TEMPLATES' })} className="h-20 text-sm bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/10 !rounded-3xl border border-white/5">
                      <MessageCircle size={22} className="ml-2"/> قوالب رسائل واتساب
                  </Button>

                  <Button onClick={handleFixFinance} className="h-20 text-sm bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/10 !rounded-3xl border border-white/5">
                      <RotateCcw size={22} className="ml-2"/> تصحيح السجلات المالية
                  </Button>

                  <Button onClick={handleRecalculateCounts} className="h-20 text-sm bg-orange-600 hover:bg-orange-500 shadow-xl shadow-orange-900/10 !rounded-3xl border border-white/5">
                      <BarChart3 size={22} className="ml-2"/> تحديث عدادات الإيجار
                  </Button>
                  
                  <Button onClick={handleOpeningBalance} className="h-20 text-sm bg-slate-700 hover:bg-slate-600 shadow-xl shadow-slate-900/10 !rounded-3xl border border-white/5">
                      <Wallet size={22} className="ml-2"/> ضبط الرصيد الافتتاحي
                  </Button>
             </div>

             <div className="mt-12 p-8 bg-red-950/20 border border-red-500/20 rounded-[3rem] text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-red-500/30"></div>
                <AlertTriangle size={48} className="mx-auto text-red-500 mb-6" />
                <h4 className="text-red-500 font-black text-2xl mb-2">منطقة الخطر</h4>
                <p className="text-xs text-red-400/60 font-bold mb-6 max-w-md mx-auto">الإجراءات هنا غير قابلة للتراجع وتؤثر على كامل النظام</p>
                <Button variant="danger" onClick={handleResetAll} className="w-full h-16 text-lg font-black !rounded-2xl shadow-lg shadow-red-900/20">تصفير النظام بالكامل</Button>
            </div>
         </div>
       )}

       {/* --- MODALS --- */}
       
       {/* SECURITY LOGS MODAL */}
       {modal?.type === 'SECURITY_LOGS' && (
         <Modal title="سجل العمليات الحساسة" onClose={() => setModal(null)} size="lg">
            <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-4">
                    <p className="text-xs text-red-400 font-bold flex items-center gap-2">
                        <AlertTriangle size={16} />
                        يتم عرض عمليات الحذف، التراجع، التصفير، والتعديلات المالية فقط.
                    </p>
                </div>
                <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
                    <table className="w-full text-right border-collapse">
                        <thead className="sticky top-0 bg-slate-900 z-10">
                            <tr className="border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="p-3">الموظف</th>
                                <th className="p-3">العملية</th>
                                <th className="p-3">الوقت</th>
                                <th className="p-3 w-1/2">التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sensitiveLogs.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-xs font-bold">لا توجد عمليات حساسة مسجلة حديثاً</td></tr>
                            ) : (
                                sensitiveLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-white/5 hover:bg-red-500/5 transition-colors bg-red-500/5">
                                        <td className="p-3 text-xs font-bold text-white">{log.username}</td>
                                        <td className="p-3 text-xs font-black text-red-400 uppercase">{log.action}</td>
                                        <td className="p-3 text-[10px] font-mono text-slate-400" dir="ltr">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-3 text-[10px] text-slate-300 leading-relaxed max-w-xs">{log.details}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={() => setModal(null)} className="w-full">إغلاق السجل</Button>
                </div>
            </div>
         </Modal>
       )}

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

       {modal?.type === 'CONFIRM_DELETE_USER' && (
         <ConfirmModal 
           title="حذف حساب موظف"
           msg={`هل أنت متأكد من حذف الموظف "${modal.targetUser.name}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم فقدان صلاحيات الدخول الخاصة به.`}
           onConfirm={() => executeDeleteUser(modal.targetUser)}
           onCancel={() => setModal(null)}
           confirmText="نعم، حذف نهائي"
           variant="danger"
           icon={Trash2}
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
