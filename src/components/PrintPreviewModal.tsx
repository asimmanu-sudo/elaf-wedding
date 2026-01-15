import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Printer, Pen, Eraser, Check, Maximize2, Minimize2, MessageCircle, Download, Share2 } from 'lucide-react';
import InvoiceClone from './InvoiceClone';
import { formatCurrency } from '../utils/helpers';
import html2canvas from 'html2canvas';

interface PrintPreviewModalProps {
  data: any;
  mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE';
  onClose: () => void;
  onPrint: (data: any, mode: any, signature?: string | null) => void;
}

export default function PrintPreviewModal({ data, mode, onClose, onPrint }: PrintPreviewModalProps) {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const sigPad = useRef<SignatureCanvas>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureImg(null);
  };

  const saveSignature = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      setSignatureImg(dataUrl);
    }
  };

  const handleFinalPrint = () => {
    // 1. Check if there's a signature in the pad that hasn't been saved to state yet
    let finalSig = signatureImg;
    
    if (sigPad.current && !sigPad.current.isEmpty()) {
       // If user signed but didn't click "Save", we capture it now
       finalSig = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
       setSignatureImg(finalSig); // Update state for consistency
    }

    // 2. Proceed with print
    onPrint(data, mode, finalSig);
  };

  const handleWhatsAppShare = async () => {
    if (!invoiceRef.current) return;
    setIsSharing(true);

    try {
        // Ensure signature is captured for the image
        if (sigPad.current && !sigPad.current.isEmpty() && !signatureImg) {
            saveSignature();
            // Allow a brief tick for React to render the signature into InvoiceClone
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Capture Invoice as Image
        const canvas = await html2canvas(invoiceRef.current, {
            scale: 2, // Better quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to create blob');

        const file = new File([blob], `invoice_${data.id || 'draft'}.png`, { type: 'image/png' });
        
        // Try Native Share (Mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'فاتورة إيلاف',
                text: `فاتورة ${data.customerName || data.brideName}`,
            });
        } else {
            // Fallback: Download for Desktop
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `invoice_${data.id || 'draft'}.png`;
            link.click();
            alert('تم تحميل صورة الفاتورة بنجاح. يمكنك الآن إرسالها يدوياً عبر واتساب.');
            
            // Optionally open WhatsApp Web text link as a helper
            const phone = data.customerPhone || data.bridePhone;
            if (phone) {
                const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '').replace('+', '');
                window.open(`https://wa.me/${cleanPhone}`, '_blank');
            }
        }

    } catch (error) {
        console.error('Error sharing invoice:', error);
        alert('حدث خطأ أثناء محاولة مشاركة الفاتورة.');
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
      
      {/* Container */}
      <div className={`bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row w-full ${isFullScreen ? 'h-full rounded-none border-none' : 'max-w-[95vw] h-[90vh]'}`}>
        
        {/* LEFT: PREVIEW AREA */}
        <div className="flex-1 bg-slate-800/50 relative overflow-auto flex justify-center p-8 group custom-scrollbar">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
             <button onClick={() => setIsFullScreen(!isFullScreen)} className="w-10 h-10 bg-slate-950/50 text-white rounded-full flex items-center justify-center hover:bg-brand-500 transition-colors">
                {isFullScreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
             </button>
          </div>

          {/* 
             Fix: Wrapped InvoiceClone in a div with explicit A4 dimensions.
             Added origin-top to keep it centered/top aligned when scaled down.
          */}
          <div 
             className="relative shadow-2xl transition-transform duration-300 origin-top"
             style={{ transform: isFullScreen ? 'scale(0.85)' : 'scale(0.55)' }}
          >
             <div 
                ref={invoiceRef} 
                className="bg-white pointer-events-none select-none"
                style={{ width: '210mm', minHeight: '296mm' }} // Enforce A4 Size
             >
                <InvoiceClone data={data} mode={mode} signatureImg={signatureImg} />
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
                  {signatureImg && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Check size={12}/> تم الاعتماد</span>}
              </div>
              
              <div className="bg-white rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 relative h-48 group hover:border-brand-500 transition-colors cursor-crosshair">
                  <SignatureCanvas 
                      ref={sigPad}
                      // Removed penColor prop to rely on default (black) to fix TS error
                      canvasProps={{ className: 'w-full h-full' }}
                      onEnd={() => { /* Optional: auto-save on end stroke if desired */ }}
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
                 تثبيت التوقيع على المعاينة
              </button>
           </div>

           <div className="h-px bg-white/10 my-2"></div>

           {/* Actions */}
           <div className="space-y-3 mt-auto">
               <button onClick={handleFinalPrint} className="w-full h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 transition-all active:scale-95">
                   <Printer size={20} /> طباعة نهائية
               </button>

               <button 
                  onClick={handleWhatsAppShare} 
                  disabled={isSharing}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                   {isSharing ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <>
                        <Share2 size={20} />
                        <span>مشاركة صورة الفاتورة</span>
                     </>
                   )}
               </button>
           </div>
        </div>

      </div>
    </div>
  );
}