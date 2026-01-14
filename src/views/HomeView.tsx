import React, { useState, useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { Modal, Card } from '../components/UI';
import { BookingStatus, DressStatus, SaleStatus } from '../types';
import { today } from '../utils/helpers';

export default function HomeView({ dresses, bookings, sales }: any) {
  const [activeList, setActiveList] = useState<any>(null);
  
  const weekLater = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

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

  return (
    <div className="grid grid-cols-2 gap-4 animate-fade-in">
      {stats.map(s => (
        <button key={s.label} onClick={() => setActiveList(s)} className={`p-8 rounded-[2.5rem] border text-center transition-all active:scale-95 shadow-sm group ${s.color}`}>
          <span className="text-5xl font-black block mb-2 leading-none tracking-tighter transition-transform group-hover:scale-110">{s.count}</span>
          <span className="text-[11px] font-black uppercase opacity-60 tracking-widest leading-none">{s.label}</span>
        </button>
      ))}
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