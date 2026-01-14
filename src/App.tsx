
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Search, LogOut, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { cloudDb, COLLS } from './services/firebase';
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

  // Database States
  const [dresses, setDresses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sales, setSales] = useState([]);
  const [finance, setFinance] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const unsubD = cloudDb.subscribe(COLLS.DRESSES, setDresses);
    const unsubB = cloudDb.subscribe(COLLS.BOOKINGS, setBookings);
    const unsubS = cloudDb.subscribe(COLLS.SALES, setSales);
    const unsubF = cloudDb.subscribe(COLLS.FINANCE, setFinance);
    const unsubU = cloudDb.subscribe(COLLS.USERS, setUsers);
    const unsubL = cloudDb.subscribe(COLLS.LOGS, setLogs);
    return () => { unsubD(); unsubB(); unsubS(); unsubF(); unsubU(); unsubL(); };
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

  const hasPerm = (p: string) => user?.role === UserRole.ADMIN || user?.permissions.includes(p);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 animate-fade-in no-print">
        <img src="/Logo.png" alt="Logo" className="w-44 mb-10 object-contain drop-shadow-2xl" />
        <div className="w-full max-sm bg-slate-900/50 backdrop-blur-xl border border-white/5 p-10 rounded-[3.5rem] shadow-2xl">
          <form onSubmit={(e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const foundUser = users.find((x: any) => x.username === fd.get('u') && x.password === fd.get('p'));
            if (foundUser) { setUser(foundUser); } else { showToast('بيانات الدخول غير صحيحة', 'error'); }
          }} className="space-y-6">
            <Input name="u" placeholder="اسم المستخدم" required />
            <Input name="p" type="password" placeholder="كلمة المرور" required />
            <Button className="w-full h-16 text-lg mt-6">دخول النظام</Button>
          </form>
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
      <div className={`h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden no-print ${isIOS ? 'ios-style' : 'android-style'}`} dir="rtl">
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
          {activeTab === 'settings' && <SettingsView user={user} users={users} bookings={bookings} sales={sales} finance={finance} dresses={dresses} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        </main>

        <nav className="shrink-0 pb-safe bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 fixed bottom-0 left-0 right-0 z-[200]">
          <div className="h-20 flex items-center overflow-x-auto custom-scrollbar px-2 space-x-2 space-x-reverse">
            {visibleNavItems.map((item: any) => (
              <button 
                key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
                className={`flex-col items-center justify-center min-w-[85px] transition-all ${activeTab === item.id ? 'text-brand-500 scale-105' : 'text-slate-500'}`}
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
