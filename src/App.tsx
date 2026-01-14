
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Search, LogOut, CheckCircle, AlertTriangle, RefreshCw, Save } from 'lucide-react';
import { cloudDb, COLLS } from './services/firebase';
import { backupService } from './services/backup';
import { User, UserRole } from './types';
import { NAV_ITEMS } from './utils/constants';
import { isIOS } from './utils/helpers';
import { IconByName, Input, Button } from './components/UI';
import InvoiceClone from './components/InvoiceClone';

// Importing Views
import HomeView from './views/HomeView';
import RentDressesView from './views/RentDressesView';
import RentBookingsView from './views/RentBookingsView';
import SaleOrdersView from './views/SaleOrdersView';
import FactoryView from './views/FactoryView';
import DeliveryView from './views/DeliveryView';
import CustomersView from './views/CustomersView';
import FinanceView from './views/FinanceView';
import LifeBudgetView from './views/LifeBudgetView';
import LogsView from './views/LogsView';
import SettingsView from './views/SettingsView';

// --- THEME CONFIGURATION (RGB CHANNELS ONLY) ---
// These values are injected into --color-brand-* and --color-base-*
const THEMES: any = {
  default: {
    // Brand: Purple/Fuchsia (Default)
    '--color-brand-50': '253 244 255',
    '--color-brand-100': '250 232 255',
    '--color-brand-200': '245 208 254',
    '--color-brand-300': '240 171 252',
    '--color-brand-400': '232 121 249',
    '--color-brand-500': '217 70 239',
    '--color-brand-600': '192 38 211',
    '--color-brand-700': '162 28 175',
    '--color-brand-800': '134 25 143',
    '--color-brand-900': '112 26 117',
    '--color-brand-950': '74 4 78',
    // Base: Slate (Blue-ish Gray)
    '--color-base-50': '248 250 252',
    '--color-base-100': '241 245 249',
    '--color-base-200': '226 232 240',
    '--color-base-300': '203 213 225',
    '--color-base-400': '148 163 184',
    '--color-base-500': '100 116 139',
    '--color-base-600': '71 85 105',
    '--color-base-700': '51 65 85',
    '--color-base-800': '30 41 59',
    '--color-base-900': '15 23 42',
    '--color-base-950': '2 6 23',
  },
  warm_gold: {
    // Brand: Rich Gold / Amber
    '--color-brand-50': '251 248 242',
    '--color-brand-100': '245 239 224',
    '--color-brand-200': '234 219 179',
    '--color-brand-300': '222 195 133',
    '--color-brand-400': '212 175 55', // Metallic Gold
    '--color-brand-500': '184 150 40',
    '--color-brand-600': '150 120 28',
    '--color-brand-700': '117 92 18',
    '--color-brand-800': '87 67 13',
    '--color-brand-900': '61 47 8',
    '--color-brand-950': '38 28 3',
    // Base: Stone (Warm Brownish Grey) - Maps to "slate" classes
    '--color-base-50': '250 250 249',
    '--color-base-100': '245 245 244',
    '--color-base-200': '231 229 228',
    '--color-base-300': '214 211 209',
    '--color-base-400': '168 162 158',
    '--color-base-500': '120 113 108',
    '--color-base-600': '87 83 78',
    '--color-base-700': '68 64 60',
    '--color-base-800': '41 37 36',
    '--color-base-900': '28 25 23',
    '--color-base-950': '12 10 9',
  }
};

// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center dir-ltr">
          <AlertTriangle size={64} className="text-red-500 mb-6" />
          <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
          <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/20 max-w-2xl overflow-auto text-left mb-6">
            <p className="text-red-400 font-mono text-sm mb-2">{this.state.error?.toString()}</p>
            <details className="text-slate-500 text-xs font-mono">
              <summary>Stack Trace</summary>
              <pre className="mt-2 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </details>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2"
          >
            <RefreshCw size={20} /> Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);
  const [printingItem, setPrintingItem] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE'>('DEPOSIT');
  
  // Theme State
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'default');
  
  // Backup State
  const [isBackupNeeded, setIsBackupNeeded] = useState(false);

  // Database States
  const [dresses, setDresses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sales, setSales] = useState([]);
  const [finance, setFinance] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Listen for theme changes from SettingsView
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('app_theme') || 'default');
    };
    window.addEventListener('theme-change', handleThemeChange);

    // Check Backup Status
    setIsBackupNeeded(backupService.isBackupNeeded());

    const unsubD = cloudDb.subscribe(COLLS.DRESSES, setDresses);
    const unsubB = cloudDb.subscribe(COLLS.BOOKINGS, setBookings);
    const unsubS = cloudDb.subscribe(COLLS.SALES, setSales);
    const unsubF = cloudDb.subscribe(COLLS.FINANCE, setFinance);
    const unsubU = cloudDb.subscribe(COLLS.USERS, setUsers);
    const unsubL = cloudDb.subscribe(COLLS.LOGS, setLogs);
    return () => { 
      window.removeEventListener('theme-change', handleThemeChange);
      unsubD(); unsubB(); unsubS(); unsubF(); unsubU(); unsubL(); 
    };
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const addLog = (action: string, details: string) => {
    if (user) cloudDb.add(COLLS.LOGS, { action, username: user.name, timestamp: new Date().toISOString(), details });
  };

  const handlePrint = (item: any, mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE' = 'DEPOSIT') => {
    setPrintMode(mode);
    setPrintingItem(item);
    setTimeout(() => { window.print(); }, 800);
  };

  const handleBackupExport = () => {
    const fullData = { dresses, bookings, sales, finance, users, logs };
    const success = backupService.exportData(fullData);
    if(success) {
        setIsBackupNeeded(false);
        showToast('تم حفظ نسخة احتياطية بنجاح');
    } else {
        showToast('فشل حفظ النسخة', 'error');
    }
  };

  const hasPerm = (p: string) => user?.role === UserRole.ADMIN || user?.permissions.includes(p);

  // Apply Theme Variables
  const themeStyles = THEMES[theme] || THEMES['default'];

  if (!user) {
    return (
      // LOGIN SCREEN: Using generic slate classes that map to variables
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-8 animate-fade-in no-print bg-slate-950 bg-[url('/store-bg.jpg')] bg-cover bg-center relative"
        style={themeStyles as React.CSSProperties}
      >
        {/* Overlay: Uses bg-slate-950 which becomes Warm Brown in Gold Theme */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-slate-950/85"></div> 
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
          <img src="/Logo.png" alt="Logo" className="w-44 mb-10 object-contain drop-shadow-2xl" />
          <div className="w-full backdrop-blur-xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl bg-slate-900/60">
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const foundUser = users.find((x: any) => x.username === fd.get('u') && x.password === fd.get('p'));
              
              // MANUAL BACKDOOR for Initial Setup or DB Failure
              if (!foundUser && fd.get('u') === 'admin' && fd.get('p') === '123') {
                  setUser({ id: 'master', name: 'مدير النظام', role: UserRole.ADMIN, permissions: ['ALL'], username: 'admin' });
                  setActiveTab('home');
                  return;
              }

              if (foundUser) { 
                setUser(foundUser); 
                setActiveTab('home'); // Ensure we start at home
              } else { 
                showToast('بيانات الدخول غير صحيحة', 'error'); 
              }
            }} className="space-y-6">
              <Input name="u" placeholder="اسم المستخدم" required className="!bg-slate-950/50 !border-white/10 placeholder:text-white/50" />
              <Input name="p" type="password" placeholder="كلمة المرور" required className="!bg-slate-950/50 !border-white/10 placeholder:text-white/50" />
              {/* Button: bg-brand-600 becomes Gold or Purple automatically */}
              <Button className="w-full h-16 text-lg mt-6 text-white border-none bg-brand-600 hover:bg-brand-500 shadow-brand-500/20">دخول النظام</Button>
            </form>
          </div>
        </div>
        
        <div className="fixed bottom-8 left-4 right-4 z-[2000] space-y-2 pointer-events-none flex flex-col items-center">
          {toasts.map((t: any) => (
            <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border pointer-events-auto animate-slide-up w-full max-w-sm ${
              t.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-100' : t.type === 'warning' ? 'bg-orange-950/90 border-orange-500/50 text-orange-100' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
            }`}>
              {t.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
              <span className="font-bold text-sm">{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter NAV_ITEMS based on permissions
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.id === 'life_budget') return hasPerm('view_personal_budget') || hasPerm('admin_reset');
    if (item.id === 'settings') return true; 
    if (item.id === 'home') return true;
    return hasPerm(`view_${item.id}`);
  });

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          #root { display: none; }
          #printable-invoice-container {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 210mm;
            height: 100%;
            margin: 0 auto;
            background-color: white;
            z-index: 9999;
          }
          .print-invoice { height: 296mm !important; overflow: hidden !important; page-break-after: always; }
        }
      `}</style>
      
      {/* Root Application Wrapper with Dynamic Variables */}
      {/* NOTE: We only use bg-slate-950. The CSS variables defined in style={} transform "slate" into "stone" automatically */}
      <div 
        className="h-full flex flex-col text-slate-100 overflow-hidden no-print bg-slate-950" 
        dir="rtl"
        style={themeStyles as React.CSSProperties}
      >
        {/* SMART BACKUP REMINDER BANNER */}
        {user && isBackupNeeded && (
            <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md relative z-[150]">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="animate-pulse" />
                    <span className="text-xs font-bold">تنبيه: لم تقم بحفظ نسخة احتياطية لبيانات اليوم!</span>
                </div>
                <button onClick={handleBackupExport} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-black hover:bg-red-50 transition-colors flex items-center gap-1">
                    <Save size={14}/> حفظ الآن
                </button>
            </div>
        )}

        <header className="pt-safe shrink-0 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 z-[100]">
          <div className="px-6 h-20 flex items-center gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
              <input 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={`بحث في ${NAV_ITEMS.find(i => i.id === activeTab)?.label}...`}
                className="w-full bg-slate-950/50 border-none ring-1 ring-white/5 rounded-full h-12 pr-12 pl-4 text-sm font-bold focus:ring-brand-500 outline-none transition-all"
              />
            </div>
            <button onClick={() => setUser(null)} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full">
              <LogOut size={22}/>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32">
          {activeTab === 'home' && <HomeView dresses={dresses} bookings={bookings} sales={sales} />}
          {activeTab === 'rent_dresses' && <RentDressesView dresses={dresses} bookings={bookings} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
          {activeTab === 'rent_bookings' && <RentBookingsView dresses={dresses} bookings={bookings} finance={finance} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} onPrint={handlePrint} />}
          {activeTab === 'sale_orders' && <SaleOrdersView sales={sales} finance={finance} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} onPrint={handlePrint} />}
          {activeTab === 'factory' && <FactoryView sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
          {activeTab === 'delivery' && <DeliveryView bookings={bookings} sales={sales} query={searchQuery} user={user} showToast={showToast} addLog={addLog} onPrint={handlePrint} />}
          {activeTab === 'customers' && <CustomersView bookings={bookings} sales={sales} query={searchQuery} />}
          {activeTab === 'finance' && <FinanceView finance={finance} dresses={dresses} users={users} bookings={bookings} sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
          {activeTab === 'life_budget' && <LifeBudgetView query={searchQuery} bookings={bookings} sales={sales} />}
          {activeTab === 'logs' && <LogsView logs={logs} query={searchQuery} />}
          {activeTab === 'settings' && <SettingsView user={user} users={users} bookings={bookings} sales={sales} finance={finance} dresses={dresses} hasPerm={hasPerm} showToast={showToast} addLog={addLog} onThemeChange={setTheme} />}
        </main>

        <nav className="shrink-0 pb-safe bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 fixed bottom-0 left-0 right-0 z-[200]">
          <div className="h-20 flex items-center overflow-x-auto custom-scrollbar px-2 space-x-2 space-x-reverse">
            {visibleNavItems.map((item: any) => (
              <button 
                key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
                className={`flex flex-col items-center justify-center min-w-[85px] transition-all ${activeTab === item.id ? 'text-brand-500 scale-105' : 'text-slate-500'}`}
              >
                <div className={`w-12 h-9 flex items-center justify-center rounded-full transition-all ${activeTab === item.id ? 'bg-brand-500/10' : ''}`}>
                  <IconByName name={item.icon} size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                <span className="text-[9px] mt-1 whitespace-nowrap opacity-80">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="fixed bottom-24 left-4 right-4 z-[2000] space-y-2 pointer-events-none">
          {toasts.map((t: any) => (
            <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border pointer-events-auto animate-slide-up mx-auto max-sm ${
              t.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-100' : t.type === 'warning' ? 'bg-orange-950/90 border-orange-500/50 text-orange-100' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
            }`}>
              {t.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
              <span className="font-bold text-sm">{t.msg}</span>
            </div>
          ))}
        </div>
      </div>

      <div id="printable-invoice-container">
        <InvoiceClone data={printingItem} mode={printMode} />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
