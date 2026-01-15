
import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Printer, Pen, Eraser, Check, Maximize2, Minimize2, MessageCircle } from 'lucide-react';
import InvoiceClone from './InvoiceClone';
import { formatCurrency } from '../utils/helpers';

interface PrintPreviewModalProps {
  data: any;
  mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE';
  onClose: () => void;
  onPrint: (data: any, mode: any) => void;
}

export default function PrintPreviewModal({ data, mode, onClose, onPrint }: PrintPreviewModalProps) {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const sigPad = useRef<SignatureCanvas>(null);

  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureImg(null);
  };

  const saveSignature = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      setSignatureImg(sigPad.current.getTrimmedCanvas().toDataURL('image/png'));
    }
  };

  const handleFinalPrint = () => {
    // Inject signature into data if available
    const finalData = signatureImg ? { ...data, signatureImg } : data;
    onPrint(finalData, mode);
  };

  const handleWhatsAppShare = () => {
    const name = data.customerName || data.brideName || 'العميل';
    const dress = data.dressName || data.factoryCode || 'الفستان';
    const total = data.rentalPrice || data.sellPrice || 0;
    const paid = data.paidDeposit || data.deposit || 0;
    const remaining = data.remainingToPay || data.remainingFromBride || 0;
    const date = data.eventDate || data.expectedDeliveryDate || '---';

    const msg = `مرحباً ${name}،\nإليك تفاصيل الفاتورة الإلكترونية من إيلاف:\n\nالفستان: ${dress}\nالمناسبة: ${date}\n\nالإجمالي: ${formatCurrency(total)}\nالمدفوع: ${formatCurrency(paid)}\nالمتبقي: ${formatCurrency(remaining)}\n\nشكراً لاختيارك إيلاف! 💖`;
    
    const phone = data.customerPhone || data.bridePhone;
    const cleanPhone = (phone || '').replace(/\s+/g, '').replace(/-/g, '').replace('+', '');
    
    if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
        alert('رقم الهاتف غير متوفر');
    }
  };

  // Preview Scale Logic
  const A4_WIDTH_PX = 794; // 210mm at 96dpi
  const A4_HEIGHT_PX = 1123; // 296mm at 96dpi
  
  return (
    <div className={`fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
      
      {/* Container */}
      <div className={`bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row w-full ${isFullScreen ? 'h-full rounded-none border-none' : 'max-w-[95vw] h-[90vh]'}`}>
        
        {/* LEFT: PREVIEW AREA */}
        <div className="flex-1 bg-slate-800/50 relative overflow-hidden flex items-center justify-center p-8 group">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
             <button onClick={() => setIsFullScreen(!isFullScreen)} className="w-10 h-10 bg-slate-950/50 text-white rounded-full flex items-center justify-center hover:bg-brand-500 transition-colors">
                {isFullScreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
             </button>
          </div>

          <div className="relative shadow-2xl origin-center transition-transform duration-300 transform scale-[0.45] md:scale-[0.55] lg:scale-[0.65] xl:scale-[0.75]">
             <div className="pointer-events-none select-none bg-white">
                <InvoiceClone data={data} mode={mode} signatureImg={signatureImg || undefined} />
             </div>
          </div>
        </div>

        {/* RIGHT: TOOLS AREA */}
        <div className="w-full md:w-96 bg-slate-950 border-r border-white/5 flex flex-col p-6 gap-6 overflow-y-auto custom-scrollbar shrink-0">
           <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-xl font-black text-white">معاينة وتوقيع</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">تأكيد الفاتورة قبل الطباعة</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                  <X size={20} />
              </button>
           </div>

           {/* Signature Pad */}
           <div className="space-y-3">
              <div className="flex justify-between items-end">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Pen size={14}/> توقيع العميل (إلكتروني)
                  </label>
                  {signatureImg && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Check size={12}/> تم الحفظ</span>}
              </div>
              
              <div className="bg-white rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 relative h-48 group hover:border-brand-500 transition-colors cursor-crosshair">
                  <SignatureCanvas 
                      ref={sigPad}
                      canvasProps={{ className: 'w-full h-full' }}
                      onEnd={() => setSignatureImg(null)} // Reset saved state on new stroke
                  />
                  <button 
                      onClick={clearSignature} 
                      className="absolute top-2 left-2 p-2 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg hover:bg-red-50 transition-colors"
                      title="مسح التوقيع"
                  >
                      <Eraser size={16} />
                  </button>
              </div>

              <button onClick={saveSignature} className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-white/5 transition-colors">
                 تثبيت التوقيع على الفاتورة
              </button>
           </div>

           <div className="h-px bg-white/10 my-2"></div>

           {/* Actions */}
           <div className="space-y-3 mt-auto">
               <button onClick={handleFinalPrint} className="w-full h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 transition-all active:scale-95">
                   <Printer size={20} /> طباعة نهائية
               </button>

               <button onClick={handleWhatsAppShare} className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95">
                   <MessageCircle size={20} /> مشاركة واتساب (ملخص)
               </button>
           </div>
        </div>

      </div>
    </div>
  );
}
