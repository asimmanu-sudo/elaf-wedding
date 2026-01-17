
import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Printer, Pen, Eraser, Check, Share2, AlertTriangle } from 'lucide-react';
import InvoiceClone from './InvoiceClone';
import { toPng } from 'html-to-image';

interface PrintPreviewModalProps {
  data: any;
  mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE';
  onClose: () => void;
  onPrint: (data: any, mode: any) => void;
}

export default function PrintPreviewModal({ data, mode, onClose, onPrint }: PrintPreviewModalProps) {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs
  const sigPad = useRef<SignatureCanvas>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // --- Signature Logic ---

  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureImg(null);
  };

  const saveSignatureToState = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      setSignatureImg(dataUrl);
      return dataUrl;
    }
    return null;
  };

  // --- Image Helpers ---

  // Helper to ensure all images in the invoice DOM are fully loaded before capturing
  const preloadImages = async (element: HTMLElement) => {
    const images = Array.from(element.getElementsByTagName('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => { 
        img.onload = resolve; 
        img.onerror = resolve; 
      });
    }));
  };

  // --- Print Handlers ---

  const handleFinalPrint = () => {
    // Simply trigger the parent's print handler which uses native window.print()
    onPrint(data, mode);
  };

  const handleWhatsAppShare = async () => {
    if (!invoiceRef.current) return;
    setIsProcessing(true);

    try {
        // Ensure signature captured
        if (sigPad.current && !sigPad.current.isEmpty() && !signatureImg) {
            saveSignatureToState();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await preloadImages(invoiceRef.current);

        const dataUrl = await toPng(invoiceRef.current, {
            quality: 1.0,
            pixelRatio: 2,
            cacheBust: true,
            backgroundColor: '#ffffff'
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `invoice_${data.customerName || 'client'}_${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'فاتورة إيلاف',
                text: `فاتورة ${data.customerName || data.brideName}`,
            });
        } else {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            const phone = data.customerPhone || data.bridePhone;
            if (phone) {
                const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '').replace('+', '');
                if (confirm('تم تحميل الصورة. هل تريد فتح واتساب ويب لإرسالها؟')) {
                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                }
            } else {
                alert('تم تحميل صورة الفاتورة بنجاح.');
            }
        }

    } catch (error) {
        console.error('Share Error:', error);
        alert('حدث خطأ أثناء محاولة مشاركة الفاتورة.');
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-sm flex flex-col md:flex-row h-full w-full overflow-hidden">
      
      {/* PREVIEW AREA */}
      <div className="flex-1 bg-slate-800 relative overflow-auto custom-scrollbar flex justify-center items-start p-4 md:p-8">
        
        <button 
            onClick={onClose} 
            className="fixed top-4 left-4 z-50 w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center border border-white/10 shadow-lg hover:bg-red-500 transition-colors md:hidden"
        >
            <X size={20} />
        </button>

        {/* DOM Container to Capture */}
        <div 
            ref={invoiceRef}
            className="bg-white shadow-2xl relative origin-top"
            style={{ 
                width: '210mm',
                minWidth: '210mm', 
                maxWidth: '210mm',
                minHeight: '296mm',
                height: 'auto' 
            }}
        >
            <InvoiceClone data={data} mode={mode} signatureImg={signatureImg} />
        </div>
      </div>

      {/* TOOLS SIDEBAR */}
      <div className="w-full md:w-96 bg-slate-950 border-t md:border-t-0 md:border-r border-white/10 flex flex-col shrink-0 h-[45vh] md:h-full z-40 shadow-2xl">
         
         <div className="flex justify-between items-center p-5 border-b border-white/5 bg-slate-900/50">
            <div>
                <h3 className="text-lg font-black text-white">معاينة وتوقيع</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">تأكد من البيانات قبل الطباعة</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
                <X size={18} />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Pen size={12}/> توقيع العميل
                    </label>
                    {signatureImg ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-fade-in"><Check size={12}/> معتمد</span>
                    ) : (
                        <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1"><AlertTriangle size={12}/> مطلوب</span>
                    )}
                </div>
                
                <div className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-slate-600 relative h-32 group hover:border-brand-500 transition-colors cursor-crosshair">
                    <SignatureCanvas 
                        ref={sigPad}
                        canvasProps={{ className: 'w-full h-full' }}
                    />
                    <button 
                        onClick={clearSignature} 
                        className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-100/80 rounded-lg hover:bg-red-50 transition-colors"
                        title="مسح التوقيع"
                    >
                        <Eraser size={14} />
                    </button>
                </div>

                <button 
                    onClick={saveSignatureToState} 
                    className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-white/5 transition-colors flex items-center justify-center gap-2"
                >
                   <Check size={14} /> تحديث المعاينة بالتوقيع
                </button>
            </div>

            <div className="h-px bg-white/5"></div>

            <div className="space-y-3">
               <button 
                   onClick={handleFinalPrint} 
                   className="w-full h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 group"
               >
                   <Printer size={20} className="group-hover:scale-110 transition-transform" /> 
                   <span>طباعة المستند</span>
               </button>

               <button 
                  onClick={handleWhatsAppShare} 
                  disabled={isProcessing}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
               >
                   {isProcessing ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <>
                        <Share2 size={20} className="group-hover:scale-110 transition-transform"/>
                        <span>مشاركة صورة (HQ)</span>
                     </>
                   )}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
