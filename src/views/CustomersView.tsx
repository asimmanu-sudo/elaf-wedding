
import React, { useState, useMemo } from 'react';
import { Users, CheckCircle, MessageCircle } from 'lucide-react';
import { Card, Modal } from '../components/UI';
import { formatCurrency, today } from '../utils/helpers';

export default function CustomersView({ bookings, sales, query }: any) {
  const [viewCustomer, setViewCustomer] = useState<any>(null);

  const customers = useMemo(() => {
    const map = new Map();
    
    const mergeData = (item: any, type: 'RENT' | 'SALE') => {
       const rawName = type === 'RENT' ? item.customerName : item.brideName;
       if (!rawName) return;
       const name = rawName.trim();
       const phone = (type === 'RENT' ? item.customerPhone : item.bridePhone) || '';
       const date = (type === 'RENT' ? (item.createdAt || item.eventDate) : (item.orderDate || item.expectedDeliveryDate)) || today;
       
       if (!map.has(name)) {
         map.set(name, { 
           id: name, name, phone, count: 0, lastDate: date, 
           history: [], totalSpent: 0, totalDebt: 0 
         });
       }
       
       const entry = map.get(name);
       if (!entry.phone && phone) entry.phone = phone;
       if (date > entry.lastDate) entry.lastDate = date;
       entry.count++;
       
       const price = type === 'RENT' ? (item.rentalPrice || 0) : (item.sellPrice || 0);
       const debt = type === 'RENT' ? (item.remainingToPay || 0) : (item.remainingFromBride || 0);
       entry.totalSpent += price;
       entry.totalDebt += debt;

       entry.history.push({
         id: item.id,
         type,
         date: type === 'RENT' ? item.eventDate : item.expectedDeliveryDate,
         status: item.status,
         item: type === 'RENT' ? item.dressName : item.factoryCode,
         price,
         debt
       });
    };

    bookings.forEach((b: any) => mergeData(b, 'RENT'));
    sales.forEach((s: any) => mergeData(s, 'SALE'));

    return Array.from(map.values())
      .filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query))
      .sort((a: any, b: any) => b.lastDate.localeCompare(a.lastDate));
  }, [bookings, sales, query]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {customers.map((c: any) => (
          <Card key={c.id} onClick={() => setViewCustomer(c)} className="cursor-pointer hover:border-brand-500/50 group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-800 group-hover:bg-brand-500 transition-colors"></div>
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 font-black text-xl group-hover:bg-brand-500 group-hover:text-white transition-all border border-white/5">
                    {c.name.charAt(0)}
                    </div>
                    <div>
                    <h4 className="font-black text-white text-base">{c.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold tracking-wider" dir="ltr">{c.phone || 'No Phone'}</p>
                    </div>
                </div>
                {c.phone && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const cleanPhone = c.phone.replace(/\+/g, '').replace(/\s+/g, '');
                            window.open(`https://wa.me/${cleanPhone}`, '_blank');
                        }}
                        className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
                        title="مراسلة عبر واتساب"
                    >
                        <MessageCircle size={18} />
                    </button>
                )}
             </div>
             <div className="flex justify-between items-end border-t border-white/5 pt-3">
                <div>
                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1">المعاملات</span>
                   <span className="text-lg font-black text-white">{c.count}</span>
                </div>
                <div className="text-left">
                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1">آخر نشاط</span>
                   <span className="text-xs font-bold text-brand-400">{c.lastDate}</span>
                </div>
             </div>
          </Card>
        ))}
        {customers.length === 0 && <div className="col-span-full py-20 text-center opacity-20"><Users size={64} className="mx-auto mb-4"/><p className="font-black uppercase tracking-widest text-sm">No Customers Found</p></div>}
      </div>

      {viewCustomer && (
        <Modal title={viewCustomer.name} onClose={() => setViewCustomer(null)} size="lg">
           <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                 <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">إجمالي التعاملات</span>
                    <span className="text-xl font-black text-white">{formatCurrency(viewCustomer.totalSpent)}</span>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">إجمالي المديونية</span>
                    <span className={`text-xl font-black ${viewCustomer.totalDebt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(viewCustomer.totalDebt)}</span>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">عدد الطلبات</span>
                    <span className="text-xl font-black text-brand-400">{viewCustomer.count}</span>
                 </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                 {viewCustomer.history.sort((a:any,b:any) => b.date.localeCompare(a.date)).map((h: any) => (
                   <div key={h.id} className="p-4 rounded-2xl border border-white/5 bg-slate-900/50 flex justify-between items-center group hover:bg-slate-900 transition-colors">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${h.type === 'RENT' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'}`}>{h.type === 'RENT' ? 'إيجار' : 'تفصيل'}</span>
                            <span className="text-xs font-bold text-white">{h.item}</span>
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <span>{h.date}</span>
                            <span>•</span>
                            <span className={h.status === 'ملغي' || h.status === 'CANCELLED' ? 'text-red-400' : 'text-slate-400'}>{h.status}</span>
                         </div>
                      </div>
                      <div className="text-left">
                         <span className="block text-sm font-black text-white">{formatCurrency(h.price)}</span>
                         {h.debt > 0 ? <span className="text-[10px] font-bold text-red-400">متبقي: {formatCurrency(h.debt)}</span> : <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 justify-end"><CheckCircle size={10}/> خالص</span>}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </Modal>
      )}
    </>
  );
}
