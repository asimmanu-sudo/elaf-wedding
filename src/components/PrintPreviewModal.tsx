
import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Printer, Pen, Eraser, Check, MessageCircle, Share2, AlertTriangle } from 'lucide-react';
import InvoiceClone from './InvoiceClone';
import { toPng } from 'html-to-image';

interface PrintPreviewModalProps {
  data: any;
  mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE';
  onClose: () => void;
  onPrint: (data: any, mode: any, signature?: string | null) => void;
}

export default function PrintPreviewModal({ data, mode, onClose, onPrint }: PrintPreviewModalProps) {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Refs
  const sigPad = useRef<SignatureCanvas>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // --- Signature Logic ---

  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureImg(null);
  };

  // Captures signature to State (for visual preview)
  const saveSignatureToState = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      setSignatureImg(dataUrl);
      return dataUrl;
    }
    return null;
  };

  // --- Print Handlers ---

  const handleFinalPrint = () => {
    // 1. Capture signature directly from canvas if available (ensures latest drawing is used even if 'update' wasn't clicked)
    let finalSig = signatureImg;
    
    if (sigPad.current && !sigPad.current.isEmpty()) {
       // Convert canvas to static Base64 PNG
       finalSig = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    }

    // 2. Pass to global print handler
    onPrint(data, mode, finalSig);
  };

  const handleWhatsAppShare = async () => {
    if (!invoiceRef.current) return;
    setIsSharing(true);

    try {
        // 1. Ensure signature is visually applied before capture
        if (sigPad.current && !sigPad.current.isEmpty() && !signatureImg) {
            saveSignatureToState();
            // Tiny delay to let React render the signature image in the DOM
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 2. High Quality Capture Settings for A4 using html-to-image
        // A4 Width at 96 DPI is approx 794px. 
        // pixelRatio: 4 ensures high density (approx 300+ DPI equivalent) for crisp text on mobile.
        const width = 794; 
        const height = 1123; // A4 height @ 96dpi

        const dataUrl = await toPng(invoiceRef.current, {
            cacheBust: true, // Prevents caching issues with external images (like logos)
            pixelRatio: 4,   // High Quality for mobile zooming and printing
            quality: 1.0,
            backgroundColor: '#ffffff', // Force white background
            width: width,
            height: height,
            style: {
                // Ensure specific styles for capture
                fontFamily: "'Tajawal', sans-serif",
            }
        });

        // 3. Convert DataURL to Blob & File
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const fileName = `invoice_${data.customerName || 'client'}_${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        // 4. Share or Download
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'فاتورة إيلاف',
                text: `فاتورة ${data.customerName || data.brideName}`,
            });
        } else {
            // Desktop Fallback
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Helper link for web.whatsapp.com
            const phone = data.customerPhone || data.bridePhone;
            if (phone) {
                const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '').replace('+', '');
                if (confirm('تم تحميل الصورة بدقة عالية. هل تريد فتح واتساب ويب لإرسالها؟')) {
                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                }
            } else {
                alert('تم تحميل صورة الفاتورة بنجاح.');
            }
        }

    } catch (error) {
        console.error('Share Error:', error);
        alert('حدث خطأ أثناء محاولة مشاركة الفاتورة. يرجى المحاولة مرة أخرى.');
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-sm flex flex-col md:flex-row h-full w-full overflow-hidden">
      
      {/* 
        ========================================
        1. PREVIEW AREA (Left/Top) - SCROLLABLE
        ========================================
      */}
      <div className="flex-1 bg-slate-800 relative overflow-auto custom-scrollbar flex justify-center items-start p-4 md:p-8">
        
        {/* Floating Close Button for Mobile Accessibility */}
        <button 
            onClick={onClose} 
            className="fixed top-4 left-4 z-50 w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center border border-white/10 shadow-lg hover:bg-red-500 transition-colors md:hidden"
        >
            <X size={20} />
        </button>

        {/* 
           INVOICE CONTAINER 
           - Explicit A4 dimensions.
           - Pointer events disabled to prevent text selection while scrolling.
        */}
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

      {/* 
        ========================================
        2. TOOLS SIDEBAR (Right/Bottom) - FIXED
        ========================================
      */}
      <div className="w-full md:w-96 bg-slate-950 border-t md:border-t-0 md:border-r border-white/10 flex flex-col shrink-0 h-[45vh] md:h-full z-40 shadow-2xl">
         
         {/* Header */}
         <div className="flex justify-between items-center p-5 border-b border-white/5 bg-slate-900/50">
            <div>
                <h3 className="text-lg font-black text-white">معاينة وتوقيع</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">تأكد من البيانات قبل الطباعة</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
                <X size={18} />
            </button>
         </div>

         {/* Tools Content - Scrollable if needed */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            
            {/* Signature Block */}
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

            {/* Actions Block */}
            <div className="space-y-3">
               <button 
                   onClick={handleFinalPrint} 
                   className="w-full h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 group"
               >
                   <Printer size={20} className="group-hover:scale-110 transition-transform" /> طباعة المستند
               </button>

               <button 
                  onClick={handleWhatsAppShare} 
                  disabled={isSharing}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
               >
                   {isSharing ? (
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
