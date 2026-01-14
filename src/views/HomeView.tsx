
import React, { useState, useMemo } from 'react';
import { PieChart, AlertOctagon, MessageCircle, ArrowLeft } from 'lucide-react';
import { Modal, Card, Button } from '../components/UI';
import { BookingStatus, DressStatus, SaleStatus } from '../types';
import { today, formatCurrency } from '../utils/helpers';

export default function HomeView({ dresses, bookings, sales }: any) {
  const [activeList, setActiveList] = useState<any>(null);
  
  const weekLater = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // 1. Calculate Standard Stats
  const stats = useMemo(() => {
    const rentalsWeek = bookings.filter((b: any) => b.status === BookingStatus.PENDING && b.deliveryDate <= weekLater);
    const cleaning = dresses.filter((d: any) => d.status === DressStatus.CLEANING);
    const lateSales = sales.filter((s: any) => s.status !== SaleStatus.DELIVERED && s.expectedDeliveryDate <= today);
    const returnsToday = bookings.filter((b: any) => b.status === BookingStatus.ACTIVE && b.eventDate <= today);
    
    return [
      { label: 'تسليمات الإسبوع', count: rentalsWeek.length, data: rentalsWeek, title: 'تسليمات مستحقة', color: 'border-blue-500/20 bg-blue-500/5 text-blue-400' },
      { label: 'فساتين للغسيل', count: cleaning.length, data: cleaning, title: 'يحتاج تنظيف', color: 'border-orange-500/20 bg-orange-500/5 text-orange-400' },
      { label: 'تفصيل متأخر', count: lateSales.length, data: lateSales, title: 'طلبات متأخرة', color: 'border-red-500/20 bg-red-500/5 text-red-400' },
      { label: 'مرتجعات اليوم', count: returnsToday.length, data: returnsToday, title: 'مرتجعات اليوم', color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
    ];
  }, [bookings, dresses, sales, weekLater]);

  // 2. Calculate Bad Debts (The Radar)
  const badDebts = useMemo(() => {
    const debts = [];

    // Check Rent Bookings (Completed but unpaid)
    bookings.forEach((b: any) => {
        if (b.status === BookingStatus.COMPLETED && b.remainingToPay > 0) {
            debts.push({
                id: b.id,
                type: 'RENT',
                name: b.customerName,
                phone: b.customerPhone,
                amount: b.remainingToPay,
                date: b.actualReturnDate || b.eventDate, // Sort by when it ended
                item: b.dressName
            });
        }
    });

    // Check Sales (Delivered but unpaid)
    sales.forEach((s: any) => {
        if (s.status === SaleStatus.DELIVERED && s.remainingFromBride > 0) {
            debts.push({
                id: s.id,
                type: 'SALE',
                name: s.brideName,
                phone: s.bridePhone,
                amount: s.remainingFromBride,
                date: s.actualDeliveryDate || s.expectedDeliveryDate,
                item: s.factoryCode
            });
        }
    });

    // Sort: Oldest date first (The ones waiting longest)
    return debts.sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [bookings, sales]);

  const handleWhatsApp = (item: any) => {
      const msg = `مرحباً مدام ${item.name}،%0aنتمنى أن تكوني بخير.%0aهذا تذكير بوجود متبقي مالي بقيمة *${formatCurrency(item.amount)}* %0aعلى حساب ${item.type === 'RENT' ? 'إيجار فستان' : 'طلب تفصيل'} (${item.item}).%0aيرجى التكرم بالسداد في أقرب وقت.%0aشكراً لاختيارك إيلاف.`;
      window.open(`https://wa.me/2${item.phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => setActiveList(s)} className={`p-8 rounded-[2.5rem] border text-center transition-all active:scale-95 shadow-sm group ${s.color}`}>
            <span className="text-5xl font-black block mb-2 leading-none tracking-tighter transition-transform group-hover:scale-110">{s.count}</span>
            <span className="text-[11px] font-black uppercase opacity-60 tracking-widest leading-none">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Bad Debt Radar Section */}
      {badDebts.length > 0 && (
          <div className="bg-red-950/10 border border-red-500/20 rounded-[2.5rem] p-6 relative overflow-hidden">
              {/* Animated Radar Effect Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/40 animate-pulse">
                      <AlertOctagon size={20} />
                  </div>
                  <div>
                      <h3 className="text-lg font-black text-red-100 leading-none">رادار الديون المتعثرة</h3>
                      <p className="text-[10px] text-red-400 font-bold mt-1">عمليات مكتملة/مُسلمة وعليها متبقيات ({badDebts.length})</p>
                  </div>
              </div>

              <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {badDebts.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-900/80 border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-colors group">
                          <div>
                              <div className="flex items-center gap-2">
                                  <p className="font-black text-white text-sm">{item.name}</p>
                                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${item.type === 'RENT' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                      {item.type === 'RENT' ? 'إيجار' : 'تفصيل'}
                                  </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold mt-1">
                                  منذ: {item.date} • {item.item}
                              </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                              <div className="text-left">
                                  <p className="text-sm font-black text-red-400">{formatCurrency(item.amount)}</p>
                                  <p className="text-[9px] text-red-500/50 font-bold uppercase tracking-widest">مستحق</p>
                              </div>
                              <button 
                                onClick={() => handleWhatsApp(item)}
                                className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                                title="مطالبة عبر واتساب"
                              >
                                  <MessageCircle size={18} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Detail Modal for Stats */}
      {activeList && (
        <Modal title={activeList.title} onClose={() => setActiveList(null)} size="lg">
          <div className="space-y-3">
            {activeList.data.map((item: any) => (
              <Card key={item.id} className="!p-5 !mb-2 bg-white/5 border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-base text-white">{item.customerName || item.brideName || item.name}</p>
                  <p className="text-[10px] text-surface-500 font-bold mt-1 uppercase tracking-widest">{item.dressName || item.style || 'معاملة نشطة'}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Due Date</p>
                  <p className="text-sm font-black text-white">{item.deliveryDate || item.eventDate || item.expectedDeliveryDate}</p>
                </div>
              </Card>
            ))}
            {activeList.data.length === 0 && <div className="text-center py-20 opacity-20"><PieChart size={64} className="mx-auto mb-4" /><p className="font-black italic uppercase tracking-widest text-sm">No data found</p></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
