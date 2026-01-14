import React from 'react';
import { FileText } from 'lucide-react';
import { Card } from '../components/UI';

export default function LogsView({ logs, query }: any) {
  return (
    <div className="space-y-4 animate-fade-in">
      {logs.filter((l:any) => (l.action || '').toLowerCase().includes((query || '').toLowerCase())).reverse().slice(0, 50).map((l:any) => (
        <Card key={l.id} className="!p-5 border-l-4 border-l-brand-500 shadow-sm relative overflow-hidden italic">
           <div className="flex justify-between items-center mb-3 leading-none">
              <span className="text-[11px] font-black text-brand-400 uppercase tracking-[0.2em]">{l.action}</span>
              <span className="text-[10px] text-surface-600 font-bold italic tracking-tighter">{new Date(l.timestamp).toLocaleString('ar-EG')}</span>
           </div>
           <p className="text-sm font-medium text-surface-200 leading-relaxed italic">{l.details}</p>
           <div className="mt-4 flex items-center gap-2 opacity-30">
              <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">Admin Action by @{l.username}</span>
           </div>
        </Card>
      ))}
      {logs.length === 0 && <div className="text-center py-40 opacity-10"><FileText size={80} strokeWidth={1} className="mx-auto" /></div>}
    </div>
  );
}