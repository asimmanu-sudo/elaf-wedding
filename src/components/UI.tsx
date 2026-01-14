
// src/components/UI.tsx
import React from 'react';
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings, 
  X, Camera, AlertTriangle, CheckCircle, Info
} from 'lucide-react';

export function IconByName({ name, ...props }: any) {
  const icons: any = { Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings };
  const Comp = icons[name] || Home;
  return <Comp {...props} />;
}

export function Modal({ title, children, onClose, size = 'md' }: any) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print p-4">
      <div className={`bg-slate-900 border border-white/5 rounded-[2.5rem] w-full ${size === 'lg' ? 'max-w-4xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl'} shadow-2xl relative animate-slide-up flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 shrink-0">
          <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, msg, onConfirm, onCancel, confirmText = "نعم، متأكد", cancelText = "إلغاء", icon: Icon = AlertTriangle, variant = "danger" }: any) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <div className="text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${variant === 'danger' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : variant === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
          <Icon size={40} />
        </div>
        <p className="text-white font-bold text-lg leading-relaxed">{msg}</p>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Button variant="ghost" onClick={onCancel} className="!rounded-xl">{cancelText}</Button>
          <Button variant={variant} onClick={onConfirm} className="!rounded-xl">{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Card({ children, className = "", onClick, ...props }: any) {
  return (
    <div onClick={onClick} className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-sm mb-4 transition-all hover:border-white/10 ${className}`} {...props}>
      {children}
    </div>
  );
}

// Utility to convert Eastern Arabic Numerals to Western
const parseArabicNumbers = (str: string) => {
  return str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

export function Input({ label, icon: Icon, onChange, ...props }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && /[٠-٩]/.test(val)) {
       val = parseArabicNumbers(val);
       e.target.value = val; // Update visual input immediately
    }
    if (onChange) onChange(e);
  };

  return (
    <div className="w-full space-y-2">
      {label && <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">{label}</label>}
      <div className="relative group">
        {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={18} />}
        <input 
          className={`w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:ring-2 focus:ring-brand-500/50 outline-none transition-all placeholder:text-slate-700 font-medium ${Icon ? 'pr-12' : ''}`}
          onChange={handleChange}
          {...props} 
        />
      </div>
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }: any) {
  const base = "h-14 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md px-6 text-sm whitespace-nowrap";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/20",
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/5",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
  };
  return <button className={`${base} ${variants[variant as keyof typeof variants] || variants.primary} ${className}`} {...props}>{children}</button>;
}
