import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, 
  Settings, LogOut, Plus, Search, Edit, Trash2, Check, X, AlertTriangle, Ruler, 
  Droplets, CheckCircle, Eye, Video, TrendingUp, ArrowDownCircle, PieChart, 
  BarChart3, Clock, ChevronLeft, ChevronRight, Camera, Save, Key, UserPlus, Printer,
  Phone, RotateCcw, PackagePlus, MinusCircle, Filter, CalendarDays
} from 'lucide-react';
import { cloudDb, COLLS } from './services/firebase';
import { 
  UserRole, DressType, DressStatus, BookingStatus, SaleStatus, 
  FactoryPaymentStatus, DepositType, DressCondition 
} from './types';
import type { 
  User, Dress, SaleOrder, Booking, FinanceRecord, AuditLog, Measurements 
} from './types';
import { NAV_ITEMS, PERMISSIONS_LIST } from './constants';

// --- Global UI Helpers ---
const today = new Date().toISOString().split('T')[0];
const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(val);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

const PAYMENT_METHODS = [
  "تحويل بنكك (سعر اليوم مصري)",
  "Western Union",
  "كاش (جنية مصري)",
  "كاش (دولار)",
  "أخرى"
];

const FINANCE_CATEGORIES = [
  "حجز إيجار",
  "عربون تفصيل",
  "تحصيل متبقي (إيجار)",
  "تحصيل متبقي (تفصيل)",
  "بيع مباشر",
  "خصم غرامة تلف",
  "المصنع",
  "رواتب",
  "تنظيف",
  "ترزي",
  "فواتير",
  "أخرى"
];

const MEASUREMENT_FIELDS = [
  { id: 'neck', label: 'محيط الرقبة' }, { id: 'shoulder', label: 'محيط الكتف' },
  { id: 'chest', label: 'محيط الصدر' }, { id: 'underChest', label: 'محيط تحت الصدر' },
  { id: 'chestDart', label: 'طول بنس الصدر' }, { id: 'waist', label: 'محيط الخصر' },
  { id: 'backLength', label: 'طول الظهر' }, { id: 'hips', label: 'محيط الهانش' },
  { id: 'fullLength', label: 'الطول الكامل' }, { id: 'sleeve', label: 'طول اليد' },
  { id: 'armhole', label: 'محيط الأبط' }, { id: 'arm', label: 'محيط الذراع' },
  { id: 'forearm', label: 'محيط الساعد' }, { id: 'wrist', label: 'محيط الأسوارة' },
  { id: 'legOpening', label: 'محيط فتحة الرجل' }, 
  // Fields to be excluded from main table but kept in measurements object
  { id: 'bustType', label: 'نوع الصدر' },
  { id: 'skirtType', label: 'نوع التنورة' }, 
  { id: 'materials', label: 'الخامة المستخدمة' },
];

// --- INVOICE CLONE COMPONENT (A4 HTML Structure) ---

const InvoiceClone = ({ data, mode = 'DEPOSIT' }: { data: any, mode?: 'DEPOSIT' | 'RECEIPT' | 'SIZES' }) => {
  if (!data) return null;

  const invDate = (data.createdAt || data.orderDate || today).split('-').reverse().join(' / ');
  const evDate = (data.eventDate || data.expectedDeliveryDate || '').split('-').reverse().join(' / ');
  const brideFullName = data.customerName || data.brideName || '';
  const phone = data.customerPhone || data.bridePhone || '';
  const address = data.customerAddress || data.brideAddress || '';
  const dressName = data.dressName || data.factoryCode || '';
  const notes = data.notes || data.description || '';
  
  const depositVal = data.paidDeposit || data.deposit || 0;
  const remainderVal = data.remainingToPay || data.remainingFromBride || 0;
  const totalVal = data.rentalPrice || data.sellPrice || 0;
  
  const deposit = formatCurrency(depositVal);
  const remainder = formatCurrency(remainderVal);
  const total = formatCurrency(totalVal);
  
  const payMethod = data.paymentMethod === 'أخرى' ? data.otherPaymentMethod : data.paymentMethod;
  const isTailoring = !!data.factoryCode;

  // Header Component
  const Header = () => (
    <div className="flex flex-col items-center mb-[2mm] shrink-0">
      <img src="/Logo.png" alt="Logo" className="w-[120px] object-contain mb-[1mm]" />
      <div className="text-center">
        <h1 className="text-[7px] font-bold tracking-[0.2em] text-[#B59410] uppercase">FOR WEDDING DRESSES</h1>
        <p className="text-[10px] font-medium text-[#B59410] mt-[-2px]">إيلاف لفساتين الزفاف</p>
      </div>
    </div>
  );

  // Footer Component
  const Footer = () => (
    <div className="mt-auto pt-[2mm] shrink-0 border-t border-slate-100" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div className="flex justify-between items-end px-2">
        <div className="space-y-1">
           <div className="flex items-center gap-2 text-slate-800 font-bold">
             <Phone size={13} className="text-emerald-600" />
             <span className="text-[11px]" dir="ltr">+20 10 05830864</span>
           </div>
           <img src="/qrcode.png" alt="QR" className="w-11 h-11 border border-slate-200 rounded p-0.5 opacity-80" />
        </div>
        <div className="text-center min-w-[140px] mb-1">
           <p className="text-[8px] font-bold uppercase text-slate-400 mb-2 tracking-widest">SIGNATURE التوقيع</p>
           <div className="w-full border-b border-dotted border-slate-400"></div>
        </div>
        <div className="text-right">
           <h4 className="text-base font-medium text-slate-300 italic leading-none">Thank You!</h4>
           <p className="text-[10px] mt-0.5 font-bold text-slate-800">وربنا يتمم ليك على خير ❤️</p>
        </div>
      </div>
    </div>
  );

  const containerStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
    color: '#1e293b',
    padding: '8mm',
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative'
  };

  // SIZES INVOICE MODE
  if (mode === 'SIZES') {
    const m = data.measurements || {};
    // Separate main fields from descriptive fields
    const descriptiveFields = ['bustType', 'skirtType', 'materials'];
    const tableFields = MEASUREMENT_FIELDS.filter(f => !descriptiveFields.includes(f.id));
    
    const half = Math.ceil(tableFields.length / 2);
    const rows = [];
    for (let i = 0; i < half; i++) {
      rows.push({
        left: tableFields[i],
        right: tableFields[i + half]
      });
    }

    return (
      <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
        <Header />
        <div className="mb-[2mm] text-center border-y border-slate-100 py-[1mm] shrink-0">
            <h2 className="text-lg font-bold text-[#B59410] uppercase tracking-widest leading-none">SIZES INVOICE / فاتورة مقاسات</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-x-10 mb-[2mm] text-[13px] shrink-0">
          <div className="space-y-1">
             <p className="flex justify-between border-b border-slate-50 pb-0.5"><strong>اسم العروس:</strong> <span>{brideFullName}</span></p>
             <p className="flex justify-between border-b border-slate-50 pb-0.5"><strong>رقم الهاتف:</strong> <span>{phone}</span></p>
             <p className="flex justify-between border-b border-slate-50 pb-0.5"><strong>كود الفستان:</strong> <span className="text-[#B59410] font-bold">{data.factoryCode || data.dressName || '---'}</span></p>
          </div>
          <div className="space-y-1 text-left" dir="ltr">
             <p dir="rtl" className="flex justify-between border-b border-slate-50 pb-0.5"><strong>التاريخ:</strong> <span>{invDate}</span></p>
             <p dir="rtl" className="flex justify-between border-b border-slate-50 pb-0.5"><strong>وحدة القياس:</strong> <span>{m.unit === 'cm' ? 'سم (CM)' : 'إنش (Inch)'}</span></p>
          </div>
        </div>

        <div className="min-h-0 overflow-hidden">
          <table className="w-full border-collapse border border-slate-200 text-[12px]">
            <thead>
              <tr className="bg-slate-50 text-[#B59410]">
                <th className="border border-slate-200 p-1 text-right w-[35%] font-bold">المقاس</th>
                <th className="border border-slate-200 p-1 text-center w-[15%] font-bold">القيمة</th>
                <th className="border border-slate-200 p-1 text-right w-[35%] font-bold">المقاس</th>
                <th className="border border-slate-200 p-1 text-center w-[15%] font-bold">القيمة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                  <td className="border border-slate-200 p-1 font-medium text-slate-500">{row.left.label}</td>
                  <td className="border border-slate-200 p-1 text-center font-bold text-[14px] text-slate-800">{m[row.left.id] || '---'}</td>
                  <td className="border border-slate-200 p-1 font-medium text-slate-500">
                    {row.right ? row.right.label : ''}
                  </td>
                  <td className="border border-slate-200 p-1 text-center font-bold text-[14px] text-slate-800">
                    {row.right ? (m[row.right.id] || '---') : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-x-4 mt-[2mm] text-[12px]">
             {descriptiveFields.map(fieldId => {
               const field = MEASUREMENT_FIELDS.find(f => f.id === fieldId);
               return (
                 <div key={fieldId} className="flex gap-2 border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-600">{field?.label}:</span>
                    <span className="text-slate-800 italic">{m[fieldId] || '---'}</span>
                 </div>
               );
             })}
          </div>
          
          {m.orderNotes && (
            <div className="mt-[2mm] p-2 border border-slate-200 rounded-lg bg-slate-50/50">
               <h4 className="font-bold mb-1 text-[#B59410] text-[11px] uppercase tracking-wider">ملاحظات الطلب الإضافية:</h4>
               <p className="text-[11px] whitespace-pre-wrap leading-tight text-slate-600 italic">{m.orderNotes}</p>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // RENT RECEIPT INVOICE MODE
  if (mode === 'RECEIPT') {
    return (
      <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("/Logo.png")', backgroundSize: '250px', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        <Header />
        <div className="mb-[2mm] flex justify-between items-end border-b border-slate-100 pb-[1mm] shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[#B59410] uppercase tracking-wider leading-tight">RENT RECEIPT INVOICE</h2>
            <p className="text-sm text-slate-400 font-medium">فاتورة استلام إيجار</p>
          </div>
          <div className="text-left" dir="ltr">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date التاريخ</span>
            <span className="text-[15px] font-bold text-slate-800">{invDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-[3mm] shrink-0">
          <div className="border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Bride العروس</span>
             <span className="text-[14px] font-bold text-slate-800">{brideFullName}</span>
          </div>
          <div className="border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Phone الهاتف</span>
             <span className="text-[14px] font-bold text-slate-800 tracking-wider" dir="ltr">{phone}</span>
          </div>
          <div className="border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Dress الفستان</span>
             <span className="text-[14px] font-bold text-slate-800 italic">{dressName}</span>
          </div>
          <div className="border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Insurance الأمنية</span>
             <span className="text-[14px] font-bold text-emerald-600">
               {data.securityDeposit?.type}: {data.securityDeposit?.detail} {data.securityDeposit?.value ? `(${formatCurrency(data.securityDeposit.value)} ج)` : ''}
             </span>
          </div>
          {data.remainingToPay > 0 && (
            <div className="border-b border-dotted border-slate-300 pb-0.5">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Remaining المتبقي</span>
               <span className="text-[14px] font-bold text-red-600">{formatCurrency(data.remainingToPay)} جنيه</span>
            </div>
          )}
          {data.extras && (
            <div className="border-b border-dotted border-slate-300 pb-0.5">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Extras إضافات</span>
               <span className="text-[14px] font-bold text-slate-800">{data.extras}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-0 overflow-hidden">
          <h4 className="text-center font-bold text-slate-800 mb-2 text-[12px] uppercase tracking-widest underline underline-offset-4 decoration-slate-200">شروط الإيجار</h4>
          <ol className="text-[10.5px] leading-normal space-y-1.5 font-medium text-slate-700">
            <li>1. مدة الإيجار حسب التواريخ المتفق عليها، ويلزم الالتزام بموعد الإرجاع.</li>
            <li>2. في حال التأخير عن موعد الإرجاع، يحق لمعرض إيلاف احتساب غرامة عن كل يوم تأخير.</li>
            <li>3. تقر العروس باستلام الفستان بحالة جيدة وخالٍ من العيوب الظاهرة.</li>
            <li>4. الفستان مخصص للاستخدام الشخصي في يوم الزفاف فقط.</li>
            <li>5. التنظيف العادي مشمول، وأي اتساخ شديد يترتب عليه رسوم إضافية.</li>
            <li>6. تتحمل العروس تكلفة أي تلف أو فقدان لأي جزء من الفستان أو ملحقاته.</li>
            <li>7. في حال التلف الكامل أو الفقدان، تلتزم العروس بدفع القيمة الكاملة للفستان.</li>
            <li>8. يمنع إجراء أي تعديل دائم على الفستان دون موافقة معرض إيلاف.</li>
            <li>9. الأمنية المستلمة تستخدم كضمانه ويحق للمعرض الخصم من قيمتها او حجزها حال وجود غرامات.</li>
            <li>10. بالتوقيع أدناه، تقر العروس بموافقتها على جميع الشروط أعلاه. الفاتوره الالكترونية مصدقة عن طريق الواتساب.</li>
          </ol>
        </div>
        <Footer />
      </div>
    );
  }

  // DEFAULT: DEPOSIT INVOICE MODE
  return (
    <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("/Logo.png")', backgroundSize: '250px', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
      <Header />
      <div className="mb-[2mm] flex justify-between items-end border-b border-slate-100 pb-[1mm] shrink-0">
        <div>
          <h2 className="text-xl font-bold text-[#B59410] uppercase tracking-wider leading-tight">DEPOSIT INVOICE</h2>
          <p className="text-sm text-slate-400 font-medium">فاتورة عربون حجز</p>
        </div>
        <div className="flex gap-8 text-left" dir="ltr">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoice Date</span>
            <span className="text-[14px] font-bold text-slate-800">{invDate}</span>
          </div>
          {!isTailoring && <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Event Date</span>
            <span className="text-[14px] font-bold text-[#B59410]">{evDate}</span>
          </div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-[2mm] shrink-0">
          <div className="border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Bride العروس</span>
             <span className="text-[14px] font-bold text-slate-800">{brideFullName}</span>
          </div>
          <div className="border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Phone الهاتف</span>
             <span className="text-[14px] font-bold text-slate-800 tracking-wider" dir="ltr">{phone}</span>
          </div>
          <div className="col-span-2 border-b border-dotted border-slate-300 pb-0.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Address العنوان</span>
             <span className="text-[13px] font-medium text-slate-700">{address || '---'}</span>
          </div>
      </div>

      <div className="bg-[#FAF7F2] p-[3mm] rounded-xl border border-[#F0E6D2] mb-[3mm] shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-[#B59410]/20"></div>
        <h3 className="text-[11px] font-bold text-[#6B5A46] uppercase tracking-widest mb-2 border-b border-[#F0E6D2] pb-0.5">DRESS DESCRIPTION وصف الفستان والطلبية</h3>
        <p className="text-[15px] font-bold text-slate-800 mb-1 italic">
           {isTailoring ? `تفصيل جديد كود: ${dressName}` : `إيجار فستان: ${dressName}`}
        </p>
        <p className="text-[12px] font-medium text-slate-500 leading-tight italic whitespace-pre-wrap">{notes || 'لا توجد ملاحظات إضافية'}</p>
      </div>

      <div className="mb-[3mm] shrink-0 px-2">
        <div className="grid grid-cols-4 gap-4 mb-2">
          <div className="text-center py-1 bg-slate-900 rounded-lg shadow-sm"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">METHOD</p><p className="text-[10px] font-bold text-white">طريقة الدفع</p></div>
          <div className="text-center py-1 bg-slate-100 rounded-lg shadow-sm"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">DEPOSIT</p><p className="text-[10px] font-bold text-slate-800">العربون</p></div>
          <div className="text-center py-1 bg-slate-100 rounded-lg shadow-sm"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">REMAINDER</p><p className="text-[10px] font-bold text-slate-800">المتبقي</p></div>
          <div className="text-center py-1 bg-[#B59410]/10 rounded-lg border border-[#B59410]/20 shadow-sm"><p className="text-[9px] font-bold text-[#B59410] uppercase tracking-widest">TOTAL</p><p className="text-[10px] font-bold text-[#B59410]">المجموع</p></div>
        </div>
        <div className="grid grid-cols-4 gap-4 items-center h-8">
          <div className="text-center text-[11px] font-bold text-slate-600 truncate px-1">{payMethod || 'كاش'}</div>
          <div className="text-center text-[18px] font-bold text-slate-800 tracking-tighter">{deposit}</div>
          <div className="text-center text-[18px] font-bold text-red-600 tracking-tighter">{remainder}</div>
          <div className="text-center text-[20px] font-bold text-[#B59410] tracking-tighter">{total}</div>
        </div>
      </div>

      <div className="text-[10.5px] text-slate-600 leading-normal border-t border-slate-100 pt-[2mm] italic font-medium" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <p className="font-bold mb-1 text-slate-500 uppercase tracking-widest">الشروط والأحكام :</p>
        <ol className="space-y-1">
          {isTailoring ? (
            <>
              <li>1. يتم تصميم الفستان حسب المقاسات والطلب المتفق عليه مع العروس. أي تغيير بعد بدء التفصيل قد يترتب عليه تكلفة إضافية.</li>
              <li>2. المدة المتفق عليها تبدأ من تاريخ دفع العربون أو كامل المبلغ، ويجب الالتزام بها. أي تأخير من جانب العروس في تقديم المقاسات أو التعديلات قد يسبب تأخير التسليم.</li>
              <li>3. العربون غير قابل للاسترداد ويخصم من إجمالي الفاتورة، ويتم دفع المبلغ المتبقي عند الانتهاء من الفستان أو حسب الاتفاق.</li>
              <li>4. أي تعديل بسيط بعد التسليم يتم وفق الاتفاق، ويحق لمعرض إيلاف رفض أي تعديل قد يضر بالفستان أو تصميمه الأصلي.</li>
              <li>5. في حالة الشحن الدولي، المعرض غير مسؤول عن أي أضرار ناتجة عن الشحن، ويتم مراجعة الفستان من قبل مندوب للعروس أو عن طريق التصوير قبل الاستلام النهائي.</li>
              <li>6. إلغاء الطلب بعد بدء التفصيل يؤدي إلى فقدان العربون كاملاً، أما في حال الإلغاء قبل بدء التفصيل يُسترد العربون جزئياً حسب الاتفاق.</li>
              <li>7. في حال السداد عن طريق عمله اجنبية (غير الجنيه المصري)، يتم احتساب سعر الصرف حسب سعر صرف يوم الدفع سواء للعربون او المتبقي، كما أن الأسعار المذكورة لا تشمل تكاليف الشحن الدولي.</li>
              <li>8. يحق لمعرض إيلاف استخدام صور الفستان والتصميم لأغراض الدعاية والترويج بعد مناسبة العروس، دون أن يترتب على ذلك أي حق للعروس.</li>
              <li>9. بالتوقيع أدناه، تقر العروس بموافقتها على جميع الشروط أعلاه. الفاتوره الالكترونية مصدقة عن طريق الواتساب.</li>
            </>
          ) : (
            <>
              <li>1. العربون المدفوع يُعد تأكيدًا نهائيًا للحجز، غير قابل للاسترداد، ويُخصم من إجمالي المبلغ عند إتمام العملية.</li>
              <li>2. في حال إلغاء الحجز أو عدم الحضور في الموعد المحدد من قبل العميل، يُعتبر العربون ملغيًا دون أي التزام على معرض إيلاف.</li>
              <li>3. يخضع تغيير موعد المناسبة أو استبدال الفستان لتوفر الفستان وموافقة معرض إيلاف.</li>
              <li>4. الأسعار تشمل ما تم الاتفاق عليه في هذه الفاتورة فقط، وأي خدمة أو تعديل إضافي تُحسب بتكلفة منفصلة.</li>
              <li>5. العربون لا يُعد إيصال استلام للفستان، ويُستخدم لضمان جدية الحجز وصحة البيانات المقدمة من العميل.</li>
              <li>6. يحق لمعرض إيلاف, في حال لم يكن الفستان مستأجر كـ(أول لبسه), تأجيره في تاريخ أقرب وعرضه لأغراض التصوير أو النشر الإعلامي والدعائي، دون أن يترتب على ذلك أي حق للعميل.</li>
              <li>7. في حال السداد عن طريق عمله اجنبية (غير الجنيه المصري)، يتم احتساب سعر الصرف حسب سعر صرف يوم الدفع سواء للعربون او المتبقي.</li>
              <li>8. بالتوقيع أدناه، تقر العروس بموافقتها على جميع الشروط أعلاه. الفاتوره الالكترونية مصدقة عن طريق الواتساب.</li>
            </>
          )}
        </ol>
      </div>
      <Footer />
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);
  const [printingItem, setPrintingItem] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'DEPOSIT' | 'RECEIPT' | 'SIZES'>('DEPOSIT');

  // Database States
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

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

  const handlePrint = (item: any, mode: 'DEPOSIT' | 'RECEIPT' | 'SIZES' = 'DEPOSIT') => {
    setPrintMode(mode);
    setPrintingItem(item);
    setTimeout(() => { window.print(); }, 400);
  };

  const hasPerm = (p: string) => user?.role === UserRole.ADMIN || user?.permissions.includes(p);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 animate-fade-in no-print">
        <img src="/Logo.png" alt="Logo" className="w-44 mb-10 object-contain drop-shadow-2xl" />
        <div className="w-full max-sm bg-slate-900/50 backdrop-blur-xl border border-white/5 p-10 rounded-[3.5rem] shadow-2xl">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const foundUser = users.find(x => x.username === fd.get('u') && x.password === fd.get('p'));
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

  return (
    <>
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
          {activeTab === 'rent_dresses' && <RentDressesView dresses={dresses} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
          {activeTab === 'rent_bookings' && <RentBookingsView dresses={dresses} bookings={bookings} finance={finance} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} onPrint={(i:any, m:any) => handlePrint(i, m || 'DEPOSIT')} />}
          {activeTab === 'sale_orders' && <SaleOrdersView sales={sales} finance={finance} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} onPrint={(i:any, m:any) => handlePrint(i, m || 'DEPOSIT')} />}
          {activeTab === 'factory' && <FactoryView sales={sales} query={searchQuery} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
          {activeTab === 'delivery' && <DeliveryView bookings={bookings} sales={sales} query={searchQuery} user={user} showToast={showToast} addLog={addLog} onPrint={handlePrint} />}
          {activeTab === 'customers' && <CustomersView bookings={bookings} sales={sales} query={searchQuery} />}
          {activeTab === 'finance' && <FinanceView finance={finance} dresses={dresses} users={users} bookings={bookings} query={searchQuery} hasPerm={hasPerm} showToast={showToast} />}
          {activeTab === 'logs' && <LogsView logs={logs} query={searchQuery} />}
          {activeTab === 'settings' && <SettingsView user={user} users={users} bookings={bookings} sales={sales} finance={finance} hasPerm={hasPerm} showToast={showToast} addLog={addLog} />}
        </main>

        <nav className="shrink-0 pb-safe bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 fixed bottom-0 left-0 right-0 z-[200]">
          <div className="h-20 flex items-center overflow-x-auto custom-scrollbar px-2 space-x-2 space-x-reverse">
            {NAV_ITEMS.map((item: any) => (
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

      {/* Persistent Invisible Container for Print Whitelisting */}
      <div id="printable-invoice-container">
        <InvoiceClone data={printingItem} mode={printMode} />
      </div>
    </>
  );
}

// --- Visual Style Helper Components ---

function IconByName({ name, ...props }: any) {
  const icons: any = { Home, Shirt, Calendar, ShoppingBag, Factory, Truck, Users, DollarSign, FileText, Settings };
  const Comp = icons[name] || Home;
  return <Comp {...props} />;
}

function Modal({ title, children, onClose, size = 'md' }: any) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-surface-950/80 backdrop-blur-sm animate-fade-in no-print p-4">
      <div className={`bg-surface-900 border border-white/5 rounded-[2.5rem] w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} shadow-2xl relative animate-slide-up flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 shrink-0">
          <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">{children}</div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: any) {
  return (
    <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-sm mb-4 transition-all hover:border-white/10 ${className}`}>
      {children}
    </div>
  );
}

function Input({ label, icon: Icon, ...props }: any) {
  return (
    <div className="w-full space-y-2">
      {label && <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">{label}</label>}
      <div className="relative group">
        {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={18} />}
        <input 
          className={`w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:ring-2 focus:ring-brand-500/50 outline-none transition-all placeholder:text-slate-700 font-medium ${Icon ? 'pr-12' : ''}`}
          {...props} 
        />
      </div>
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }: any) {
  const base = "h-14 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md px-6 text-sm whitespace-nowrap";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/20",
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/5",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
  };
  return <button className={`${base} ${variants[variant as keyof typeof variants] || variants.primary} ${className}`} {...props}>{children}</button>;
}

// --- View Components ---

function HomeView({ dresses, bookings, sales }: any) {
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

function RentDressesView({ dresses, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'available' | 'archived' | 'ratings'>('available');
  const [modal, setModal] = useState<any>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return dresses.filter((d: any) => d.type === DressType.RENT && (d.name.toLowerCase().includes(query.toLowerCase()))).filter((d: any) => {
      if (subTab === 'available') return d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD;
      if (subTab === 'archived') return d.status === DressStatus.ARCHIVED || d.status === DressStatus.SOLD;
      return true;
    }).filter((d: any) => {
      if (filters.length === 0) return true;
      if (filters.includes('CLEANING')) return d.status === DressStatus.CLEANING;
      return true;
    });
  }, [dresses, subTab, query, filters]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['available', 'archived', 'ratings'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'available' ? 'المتاحة' : t === 'archived' ? 'الأرشيف' : 'التقييمات'}
          </button>
        ))}
      </div>

      {subTab === 'available' && hasPerm('add_rent_dress') && (
        <Button onClick={() => setModal({ type: 'ADD', condition: DressCondition.NEW })} className="w-full !rounded-[2.5rem] h-16 shadow-xl"><Plus size={20}/> إضافة فستان إيجار جديد</Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subTab === 'ratings' ? (
          [...dresses].filter(d => d.type === DressType.RENT).sort((a,b) => b.rentalCount - a.rentalCount).map((d: any) => (
            <Card key={d.id} className="flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 font-black text-2xl border border-brand-500/10">#</div>
                <div><p className="font-black text-white text-lg tracking-tight">{d.name}</p><p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mt-1">{d.style}</p></div>
              </div>
              <div className="px-5 py-2 bg-brand-500/10 text-brand-400 rounded-xl font-black text-sm border border-brand-500/20">{d.rentalCount} إيجار</div>
            </Card>
          ))
        ) : (
          filtered.map((d: any) => (
            <Card key={d.id} className="group overflow-hidden !p-0">
              <div className="h-64 relative overflow-hidden">
                {d.imageUrl ? <img src={d.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={d.name} /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-surface-700"><Shirt size={48} strokeWidth={1} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                   <div><h3 className="text-xl font-black text-white tracking-tight">{d.name}</h3><p className="text-[10px] text-surface-300 font-bold uppercase tracking-[0.2em]">{d.style} • {d.condition}</p></div>
                   <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${d.status === DressStatus.AVAILABLE ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>{d.status}</span>
                </div>
              </div>
              <div className="p-5 flex gap-2">
                <Button variant="ghost" onClick={() => cloudDb.update(COLLS.DRESSES, d.id, { status: d.status === DressStatus.CLEANING ? DressStatus.AVAILABLE : DressStatus.CLEANING })} className="flex-1 !h-12 !text-[11px] font-bold">
                  {d.status === DressStatus.CLEANING ? <Check size={16}/> : <Droplets size={16}/>} {d.status === DressStatus.CLEANING ? 'جاهز' : 'غسيل'}
                </Button>
                <Button variant="ghost" onClick={() => setModal({ ...d, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-brand-400"><Edit size={18}/></Button>
                {subTab === 'available' ? (
                  <Button variant="danger" onClick={() => setModal({ type: 'DELETE_OPT', item: d })} className="!w-12 !h-12 !p-0"><Trash2 size={18}/></Button>
                ) : (
                  <Button variant="success" onClick={() => { if(confirm('استرجاع الفستان لمتاح؟')) { cloudDb.update(COLLS.DRESSES, d.id, { status: DressStatus.AVAILABLE }); showToast('تم الاسترجاع'); } }} className="!w-12 !h-12 !p-0"><Check size={18}/></Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'إضافة فستان إيجار' : 'تعديل بيانات فستان'} onClose={() => setModal(null)}>
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const data = {
              name: fd.get('n'), style: fd.get('s'), factoryPrice: Number(fd.get('p')),
              condition: fd.get('cond'), videoUrl: fd.get('v'), imageUrl: modal.imageUrl || '',
              type: DressType.RENT, status: modal.status || DressStatus.AVAILABLE, rentalCount: modal.rentalCount || 0, createdAt: today
            };
            if (modal.type === 'ADD') await cloudDb.add(COLLS.DRESSES, data);
            else await cloudDb.update(COLLS.DRESSES, modal.id, data);
            showToast('تم حفظ الفستان بنجاح'); setModal(null);
          }} className="space-y-6">
            <div className="flex justify-center">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-3xl bg-slate-950/50 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-brand-500 transition-all group">
                {modal.imageUrl ? <img src={modal.imageUrl} className="w-full h-full object-cover" /> : <><Camera className="text-surface-600 group-hover:text-brand-500" /><span className="text-[10px] font-black text-surface-600">رفع صورة</span></>}
              </button>
              <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setModal((p: any) => ({ ...p, imageUrl: reader.result })); reader.readAsDataURL(file); } }} className="hidden" accept="image/*" />
            </div>
            <Input label="اسم الفستان" name="n" defaultValue={modal.name} required />
            <Input label="الموديل / الاستايل" name="s" defaultValue={modal.style} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="سعر الشراء" name="p" type="number" defaultValue={modal.factoryPrice} required />
              <div className="space-y-2">
                <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">الحالة</label>
                <select name="cond" defaultValue={modal.condition || DressCondition.NEW} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all">
                  <option value={DressCondition.NEW}>جديد</option>
                  <option value={DressCondition.USED}>مستعمل</option>
                </select>
              </div>
            </div>
            <Button className="w-full mt-4 !rounded-2xl">حفظ البيانات</Button>
          </form>
        </Modal>
      )}
      
      {modal?.type === 'DELETE_OPT' && (
        <Modal title="خيارات الفستان" onClose={() => setModal(null)}>
          <div className="grid gap-4">
            <Button variant="danger" onClick={() => { if(confirm('حذف نهائي؟')) { cloudDb.delete(COLLS.DRESSES, modal.item.id); setModal(null); showToast('تم الحذف'); } }} className="h-20 text-lg !rounded-3xl">حذف نهائي</Button>
            <Button variant="ghost" onClick={() => { cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.ARCHIVED }); setModal(null); showToast('تم الأرشفة'); }} className="h-20 text-lg !rounded-3xl">نقل للأرشيف</Button>
            <Button variant="success" onClick={() => setModal({ type: 'SELL_NOW', item: modal.item })} className="h-20 text-lg !rounded-3xl">بيع الفستان للعروس</Button>
          </div>
        </Modal>
      )}
      
      {modal?.type === 'SELL_NOW' && (
        <Modal title={`بيع فستان: ${modal.item.name}`} onClose={() => setModal(null)}>
           <form onSubmit={async (e:any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const price = Number(fd.get('p'));
             await cloudDb.update(COLLS.DRESSES, modal.item.id, { status: DressStatus.SOLD, salePrice: price, customerName: fd.get('cn'), customerPhone: fd.get('cp') });
             await cloudDb.add(COLLS.FINANCE, { amount: price, type: 'INCOME', category: 'بيع مباشر', notes: `بيع فستان ${modal.item.name} للعميلة ${fd.get('cn')}`, date: today, relatedId: modal.item.id });
             showToast('تمت عملية البيع بنجاح'); setModal(null);
           }} className="space-y-6">
              <Input label="اسم العميلة" name="cn" required />
              <Input label="رقم الهاتف" name="cp" required />
              <Input label="قيمة البيع" name="p" type="number" required />
              <Button className="w-full h-16 !rounded-2xl">تأكيد البيع</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}

function RentBookingsView({ dresses, bookings, finance, query, hasPerm, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past' | 'fittings'>('current');
  const [modal, setModal] = useState<any>(null);
  const [pendingSave, setPendingSave] = useState<any>(null);

  const filtered = useMemo(() => {
    return bookings.filter((b: any) => (b.customerName.toLowerCase().includes(query.toLowerCase()))).filter((b: any) => {
      if (subTab === 'current') return b.status !== BookingStatus.COMPLETED;
      if (subTab === 'past') return b.status === BookingStatus.COMPLETED;
      if (subTab === 'fittings') return (b.status === BookingStatus.PENDING || b.status === BookingStatus.ACTIVE);
      return true;
    }).sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate));
  }, [bookings, subTab, query]);

  const handleDelete = async (b: any) => {
    if (!confirm('سيتم حذف الحجز وكافة العمليات المالية المرتبطة به. هل أنت متأكد؟')) return;
    try {
      await cloudDb.delete(COLLS.BOOKINGS, b.id);
      const relatedFinance = (finance || []).filter((f: any) => f.relatedId === b.id);
      for (const f of relatedFinance) {
        await cloudDb.delete(COLLS.FINANCE, f.id);
      }
      showToast('تم حذف الحجز وتصفية المالية');
      addLog('حذف حجز', `تم حذف حجز العروس ${b.customerName} وتصفية عملياته المالية`);
    } catch (err) {
      showToast('خطأ في الحذف', 'error');
    }
  };

  const executeSave = async (data: any) => {
     let bId = data.id;
     const isAdd = !bId; 

     if (isAdd) {
       bId = await cloudDb.add(COLLS.BOOKINGS, data);
       if (data.paidDeposit > 0) {
          await cloudDb.add(COLLS.FINANCE, {
            amount: data.paidDeposit, type: 'INCOME', category: 'حجز إيجار',
            notes: `عربون حجز فستان ${data.dressName} للعروس ${data.customerName}`,
            date: data.createdAt, relatedId: bId
          });
       }
     } else {
       // Remove ID from data object before update if needed, but Firestore ignores extra fields usually, 
       // keeping it clean is better. Data already has ID.
       await cloudDb.update(COLLS.BOOKINGS, data.id, data);
     }
     showToast('تم الحفظ بنجاح'); 
     setModal(null);
     setPendingSave(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['current', 'past', 'fittings'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'current' ? 'نشط' : t === 'past' ? 'منتهي' : 'البروفات'}
          </button>
        ))}
      </div>

      {subTab === 'current' && hasPerm('add_booking') && <Button onClick={() => setModal({ type: 'ADD' })} className="w-full !rounded-[2.5rem] h-16 shadow-xl"><Plus size={20}/> تسجيل حجز جديد</Button>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subTab === 'fittings' ? (
          filtered.map((b: any) => (
            <Card key={b.id}>
              <div className="flex justify-between items-start mb-4">
                <div><h4 className="text-xl font-black text-white">{b.customerName}</h4><p className="text-xs font-bold text-surface-500 mt-1 italic">{b.dressName}</p></div>
                <div className="text-left"><p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">المناسبة</p><p className="text-sm font-black text-white">{b.eventDate}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${b.fitting1Done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-white/5'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">البروفه الأولى</p>
                  <Button variant={b.fitting1Done ? 'success' : 'ghost'} className="w-full h-10 text-xs" onClick={() => cloudDb.update(COLLS.BOOKINGS, b.id, { fitting1Done: !b.fitting1Done })}>{b.fitting1Done ? 'تمت البروفه' : 'تأكيد الأولى'}</Button>
                </div>
                <div className={`p-4 rounded-2xl border ${b.fitting2Done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-white/5'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">البروفه الثانية</p>
                  <Button variant={b.fitting2Done ? 'success' : 'ghost'} className="w-full h-10 text-xs" onClick={() => cloudDb.update(COLLS.BOOKINGS, b.id, { fitting2Done: !b.fitting2Done })}>{b.fitting2Done ? 'تمت البروفه' : 'تأكيد الثانية'}</Button>
                </div>
              </div>
            </Card>
          ))
        ) : filtered.map((b: any) => (
          <Card key={b.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-500 opacity-20"></div>
            <div className="flex justify-between items-start mb-6">
              <div><h4 className="text-xl font-black text-white tracking-tight">{b.customerName}</h4><p className="text-xs font-bold text-surface-500 mt-1 tracking-widest" dir="ltr">{b.customerPhone}</p></div>
              <span className="px-3 py-1 bg-brand-500/10 text-brand-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-500/10">{b.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-6 bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-6">
              <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">الفستان</span><p className="text-sm font-bold text-white italic truncate">{b.dressName}</p></div>
              <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">المناسبة</span><p className="text-sm font-bold text-white tracking-tight">{b.eventDate}</p></div>
              <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">المتبقي</span><p className="text-sm font-black text-red-400">{formatCurrency(b.remainingToPay)}</p></div>
              <div><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block mb-1">تاريخ التسليم</span><p className="text-sm font-black text-emerald-400 tracking-tight">{b.deliveryDate}</p></div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setModal({ ...b, type: 'MEASURE' })} className="flex-1 !h-12 !text-[11px] font-bold"><Ruler size={16}/> المقاسات</Button>
              <Button variant="ghost" onClick={() => onPrint(b, 'DEPOSIT')} className="!w-12 !h-12 !p-0 text-brand-400"><Printer size={18}/></Button>
              <Button variant="ghost" onClick={() => setModal({ ...b, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-surface-500"><Edit size={18}/></Button>
              <Button variant="ghost" onClick={() => handleDelete(b)} className="!w-12 !h-12 !p-0 text-red-400"><Trash2 size={18}/></Button>
            </div>
          </Card>
        ))}
      </div>

      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'حجز جديد' : 'تعديل حجز'} onClose={() => setModal(null)} size="lg">
           <form onSubmit={async (e: any) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const drId = fd.get('dr') as string;
             const dr = dresses.find((x:any) => x.id === drId);
             const rp = Number(fd.get('rp')); const dep = Number(fd.get('dep'));
             
             const data: any = {
               customerName: fd.get('cn'), customerPhone: fd.get('ph'), customerAddress: fd.get('ca'),
               dressId: drId, dressName: dr?.name || '', eventDate: fd.get('ed'), deliveryDate: fd.get('dd'),
               rentalPrice: rp, paidDeposit: dep, remainingToPay: rp - dep, notes: fd.get('notes'),
               status: modal.status || BookingStatus.PENDING, 
               createdAt: modal.createdAt || today,
               paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || ''
             };

             if (modal.type === 'EDIT') {
                data.id = modal.id;
             }
             
             // Conflict Check
             if (data.status !== BookingStatus.CANCELLED && data.status !== BookingStatus.COMPLETED) {
                 const targetDate = new Date(data.eventDate);
                 const conflicts = bookings.filter((b: any) => {
                     if (b.dressId !== data.dressId) return false;
                     if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED) return false;
                     if (modal.type === 'EDIT' && b.id === modal.id) return false;
                     
                     const bDate = new Date(b.eventDate);
                     const diff = Math.abs(targetDate.getTime() - bDate.getTime());
                     const days = Math.ceil(diff / (1000 * 3600 * 24));
                     return days <= 2;
                 });

                 if (conflicts.length > 0) {
                     setPendingSave(data);
                     setModal({ type: 'CONFLICT_WARNING', conflicts });
                     return;
                 }
             }

             await executeSave(data);
           }} className="space-y-5">
             <div className="grid grid-cols-2 gap-4">
               <Input label="اسم العروس" name="cn" defaultValue={modal.customerName} required />
               <Input label="رقم الهاتف" name="ph" defaultValue={modal.customerPhone} required />
             </div>
             <Input label="العنوان" name="ca" defaultValue={modal.customerAddress} />
             <div className="space-y-2">
               <label className="text-[11px] font-black text-white uppercase px-4 tracking-widest leading-none">الفستان</label>
               <select name="dr" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all" defaultValue={modal.dressId} required>
                 <option value="">-- اختر الفستان --</option>
                 {dresses.filter((d:any) => d.type === DressType.RENT && d.status !== DressStatus.ARCHIVED && d.status !== DressStatus.SOLD).map((d:any) => (
                   <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                 ))}
               </select>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <Input label="تاريخ المناسبة" name="ed" type="date" defaultValue={modal.eventDate} required onChange={(e:any) => {
                  if (modal.type === 'ADD' || !modal.deliveryDate) {
                    const eventDate = new Date(e.target.value);
                    if (!isNaN(eventDate.getTime())) {
                      eventDate.setDate(eventDate.getDate() - 1);
                      const suggested = eventDate.toISOString().split('T')[0];
                      const ddInput = document.querySelector('input[name="dd"]') as HTMLInputElement;
                      if (ddInput) ddInput.value = suggested;
                    }
                  }
               }} />
               <Input label="تاريخ التسليم" name="dd" type="date" defaultValue={modal.deliveryDate} required />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <Input label="سعر الإيجار" name="rp" type="number" defaultValue={modal.rentalPrice} required />
               <Input label="العربون" name="dep" type="number" defaultValue={modal.paidDeposit} required />
             </div>
             <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع</label>
               <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" defaultValue={modal.paymentMethod} onChange={(e:any)=>setModal({...modal, payMethod: e.target.value})} required>
                  <option value="">-- اختر --</option>
                  {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
               </select>
               {(modal.payMethod === 'أخرى' || modal.paymentMethod === 'أخرى') && <Input label="تفاصيل الدفع الأخرى" name="opm" defaultValue={modal.otherPaymentMethod} required />}
             </div>
             <textarea name="notes" placeholder="ملاحظات..." defaultValue={modal.notes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold min-h-[100px]" />
             <Button className="w-full mt-4 !rounded-2xl">حفظ الحجز</Button>
           </form>
        </Modal>
      )}

      {modal?.type === 'CONFLICT_WARNING' && (
        <Modal title="تحذير تعارض حجوزات" onClose={() => setModal(null)}>
            <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-2">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-bold text-white">يوجد حجوزات قريبة لهذا الفستان</h3>
                <p className="text-sm text-slate-400">الفستان محجوز في تواريخ قريبة جداً (يومين قبل أو بعد). هل أنت متأكد من الاستمرار؟</p>
                
                <div className="bg-slate-950/50 rounded-xl p-4 text-right space-y-2 max-h-40 overflow-y-auto custom-scrollbar border border-white/5">
                    {modal.conflicts.map((c: any) => (
                        <div key={c.id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-white font-bold text-sm">{c.customerName}</p>
                            <p className="text-xs text-brand-400 font-bold mt-1">تاريخ المناسبة: {c.eventDate}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
                    <Button variant="danger" onClick={() => executeSave(pendingSave)}>استمرار وحفظ</Button>
                </div>
            </div>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title="تسجيل المقاسات" onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {};
            MEASUREMENT_FIELDS.forEach(f => { m[f.id] = fd.get(f.id); });
            m.unit = fd.get('unit');
            m.orderNotes = fd.get('orderNotes');
            const coll = modal.factoryCode ? COLLS.SALES : COLLS.BOOKINGS;
            await cloudDb.update(coll, modal.id, { measurements: m });
            showToast('تم حفظ المقاسات'); setModal(null);
          }} className="space-y-8">
            <div className="flex bg-slate-950 p-2 rounded-2xl border border-white/5 justify-around">
               <label className="flex items-center gap-2 font-bold"><input type="radio" name="unit" value="cm" defaultChecked /> سم</label>
               <label className="flex items-center gap-2 font-bold"><input type="radio" name="unit" value="inch" /> إنش</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEASUREMENT_FIELDS.filter(f => !['bustType', 'skirtType', 'materials'].includes(f.id)).map(f => <Input key={f.id} label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEASUREMENT_FIELDS.filter(f => ['bustType', 'skirtType', 'materials'].includes(f.id)).map(f => <Input key={f.id} label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />)}
            </div>
            <textarea name="orderNotes" placeholder="ملاحظات الشرح الإضافي..." defaultValue={modal.measurements?.orderNotes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 text-white font-bold h-32 outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
            <div className="flex gap-4">
              <Button className="flex-1 !rounded-2xl">حفظ المقاسات</Button>
              <Button type="button" onClick={() => onPrint(modal, 'SIZES')} variant="ghost" className="!rounded-2xl"><Printer size={20}/></Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SaleOrdersView({ sales, finance, query, hasPerm, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'current' | 'past'>('current');
  const [modal, setModal] = useState<any>(null);

  const filtered = useMemo(() => {
    return sales.filter((s: any) => (s.brideName.toLowerCase().includes(query.toLowerCase()) || s.factoryCode.toLowerCase().includes(query.toLowerCase()))).filter((s: any) => {
      if (subTab === 'current') return s.status !== SaleStatus.DELIVERED;
      return s.status === SaleStatus.DELIVERED;
    }).sort((a: any, b: any) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate));
  }, [sales, subTab, query]);

  const handleDelete = async (s: any) => {
    if (!confirm('سيتم حذف طلب التفصيل وكافة العمليات المالية المرتبطة به. هل أنت متأكد؟')) return;
    try {
      await cloudDb.delete(COLLS.SALES, s.id);
      const relatedFinance = (finance || []).filter((f: any) => f.relatedId === s.id);
      for (const f of relatedFinance) {
        await cloudDb.delete(COLLS.FINANCE, f.id);
      }
      showToast('تم حذف الطلب وتصفية المالية');
      addLog('حذف طلب تفصيل', `تم حذف طلب تفصيل العروس ${s.brideName} وتصفية عملياته المالية`);
    } catch (err) {
      showToast('خطأ في الحذف', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['current', 'past'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'current' ? 'نشط' : 'مكتمل'}
          </button>
        ))}
      </div>

      {subTab === 'current' && hasPerm('add_sale') && (
        <Button onClick={() => setModal({ type: 'ADD' })} className="w-full !rounded-[2.5rem] h-16 shadow-xl"><Plus size={20}/> تسجيل طلب تفصيل جديد</Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((s: any) => (
          <Card key={s.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-600 opacity-20"></div>
            <div className="flex justify-between items-start mb-6">
              <div><h4 className="text-xl font-black text-white tracking-tight">{s.brideName}</h4><p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1 opacity-70">Code: {s.factoryCode}</p></div>
              <span className="px-3 py-1 bg-white/5 border border-white/5 text-surface-400 rounded-lg text-[9px] font-black uppercase tracking-widest">{s.status}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-6">
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">المتبقي</span><span className="text-sm font-black text-red-400">{formatCurrency(s.remainingFromBride)}</span></div>
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">التسليم المتوقع</span><span className="text-sm font-bold text-white tracking-tight">{s.expectedDeliveryDate}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setModal({ ...s, type: 'MEASURE' })} className="flex-1 !h-12 !text-[11px] font-bold">المقاسات</Button>
              <Button variant="ghost" onClick={() => onPrint(s, 'DEPOSIT')} className="!w-12 !h-12 !p-0 text-brand-400"><Printer size={18}/></Button>
              <Button variant="ghost" onClick={() => setModal({ ...s, type: 'EDIT' })} className="!w-12 !h-12 !p-0 text-surface-500"><Edit size={18}/></Button>
              <Button variant="ghost" onClick={() => handleDelete(s)} className="!w-12 !h-12 !p-0 text-red-400"><Trash2 size={18}/></Button>
            </div>
          </Card>
        ))}
      </div>
      
      {(modal?.type === 'ADD' || modal?.type === 'EDIT') && (
        <Modal title={modal.type === 'ADD' ? 'طلب تفصيل' : 'تعديل تفصيل'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = fd.get('c') as string;
            const sp = Number(fd.get('sp')); const dep = Number(fd.get('dep'));
            const data = {
              factoryCode: code, brideName: fd.get('n'), bridePhone: fd.get('ph'), brideAddress: fd.get('addr'),
              expectedDeliveryDate: fd.get('ed'), sellPrice: sp, factoryPrice: Number(fd.get('fp')),
              deposit: dep, remainingFromBride: sp - dep, description: fd.get('d'),
              status: modal.status || SaleStatus.DESIGNING, factoryStatus: modal.factoryStatus || FactoryPaymentStatus.UNPAID,
              factoryDepositPaid: modal.factoryDepositPaid || 0, orderDate: today,
              paymentMethod: fd.get('pm'), otherPaymentMethod: fd.get('opm') || ''
            };
            
            let sId = modal.id;
            if (modal.type === 'ADD') {
              sId = await cloudDb.add(COLLS.SALES, data);
              // Add Finance record for initial deposit
              if (dep > 0) {
                 await cloudDb.add(COLLS.FINANCE, {
                   amount: dep, type: 'INCOME', category: 'عربون تفصيل',
                   notes: `عربون تفصيل فستان كود ${code} للعروس ${data.brideName}`,
                   date: today, relatedId: sId
                 });
              }
            } else {
              await cloudDb.update(COLLS.SALES, modal.id, data);
            }
            showToast('تم الحفظ بنجاح'); setModal(null);
          }} className="space-y-5">
            <Input label="كود المصنع" name="c" defaultValue={modal.factoryCode} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="اسم العروس" name="n" defaultValue={modal.brideName} required />
              <Input label="الهاتف" name="ph" defaultValue={modal.bridePhone} required />
            </div>
            <Input label="العنوان" name="addr" defaultValue={modal.brideAddress} />
            <Input label="تاريخ التسليم المتوقع" name="ed" type="date" defaultValue={modal.expectedDeliveryDate} required />
            <div className="grid grid-cols-3 gap-4">
              <Input label="سعر البيع" name="sp" type="number" defaultValue={modal.sellPrice} required />
              <Input label="سعر المصنع" name="fp" type="number" defaultValue={modal.factoryPrice} required />
              <Input label="العربون" name="dep" type="number" defaultValue={modal.deposit} required />
            </div>
            <div className="space-y-2">
               <label className="text-[11px] font-black text-white px-4 leading-none italic uppercase tracking-widest">طريقة الدفع</label>
               <select name="pm" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" defaultValue={modal.paymentMethod} onChange={(e:any)=>setModal({...modal, payMethod: e.target.value})} required>
                  <option value="">-- اختر --</option>
                  {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
               </select>
               {(modal.payMethod === 'أخرى' || modal.paymentMethod === 'أخرى') && <Input label="تفاصيل الدفع الأخرى" name="opm" defaultValue={modal.otherPaymentMethod} required />}
            </div>
            <textarea name="d" placeholder="تفاصيل التصميم..." defaultValue={modal.description} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 text-white font-bold h-24 outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
            <Button className="w-full !rounded-2xl shadow-xl">تسجيل الطلب</Button>
          </form>
        </Modal>
      )}

      {modal?.type === 'MEASURE' && (
        <Modal title="تسجيل المقاسات" onClose={() => setModal(null)} size="lg">
          <form onSubmit={async (e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const m: any = {};
            MEASUREMENT_FIELDS.forEach(f => { m[f.id] = fd.get(f.id); });
            m.unit = fd.get('unit');
            m.orderNotes = fd.get('orderNotes');
            await cloudDb.update(COLLS.SALES, modal.id, { measurements: m });
            showToast('تم حفظ المقاسات'); setModal(null);
          }} className="space-y-8">
            <div className="flex bg-slate-950 p-2 rounded-2xl border border-white/5 justify-around">
               <label className="flex items-center gap-2 font-bold"><input type="radio" name="unit" value="cm" defaultChecked /> سم</label>
               <label className="flex items-center gap-2 font-bold"><input type="radio" name="unit" value="inch" /> إنش</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEASUREMENT_FIELDS.filter(f => !['bustType', 'skirtType', 'materials'].includes(f.id)).map(f => <Input key={f.id} label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEASUREMENT_FIELDS.filter(f => ['bustType', 'skirtType', 'materials'].includes(f.id)).map(f => <Input key={f.id} label={f.label} name={f.id} defaultValue={modal.measurements?.[f.id]} />)}
            </div>
            <textarea name="orderNotes" placeholder="ملاحظات الشرح الإضافي..." defaultValue={modal.measurements?.orderNotes} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 text-white font-bold h-32 outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
            <div className="flex gap-4">
              <Button className="flex-1 !rounded-2xl">حفظ المقاسات</Button>
              <Button type="button" onClick={() => onPrint(modal, 'SIZES')} variant="ghost" className="!rounded-2xl"><Printer size={20}/></Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function FactoryView({ sales, query, hasPerm, showToast, addLog }: any) {
  const [subTab, setSubTab] = useState<'pending' | 'completed'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [payAmts, setPayAmts] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    return sales.filter((s: any) => (s.factoryCode.toLowerCase().includes(query.toLowerCase()) || s.brideName.toLowerCase().includes(query.toLowerCase())))
                .filter((s: any) => subTab === 'pending' ? s.factoryStatus !== FactoryPaymentStatus.PAID : s.factoryStatus === FactoryPaymentStatus.PAID)
                .sort((a: any, b: any) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate));
  }, [sales, subTab, query]);

  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(s=>s.id));

  const bulkTotalRemaining = useMemo(() => selectedIds.reduce((sum, id) => {
    const s = sales.find(x=>x.id === id);
    return sum + (s ? (s.factoryPrice - s.factoryDepositPaid) : 0);
  }, 0), [selectedIds, sales]);

  const handleBulkPayment = async (type: 'DEPOSIT' | 'COLLECTION') => {
    const records = selectedIds.map(id => sales.find(x=>x.id === id)).filter(Boolean);
    let totalPaid = 0;
    for (const s of records) {
      const amt = type === 'DEPOSIT' ? (payAmts[s.id] || 0) : (s.factoryPrice - s.factoryDepositPaid);
      if (amt > 0) {
        const newPaid = s.factoryDepositPaid + amt;
        await cloudDb.update(COLLS.SALES, s.id, { factoryDepositPaid: newPaid, factoryStatus: newPaid >= s.factoryPrice ? FactoryPaymentStatus.PAID : FactoryPaymentStatus.PARTIAL });
        totalPaid += amt;
      }
    }
    if (totalPaid > 0) await cloudDb.add(COLLS.FINANCE, { amount: totalPaid, type: 'EXPENSE', category: 'المصنع', notes: `دفع ${type === 'DEPOSIT' ? 'عربون' : 'تحصيل'} لـ ${records.length} فستان`, date: today });
    showToast('تمت العملية بنجاح'); setSelectedIds([]); setPayAmts({}); setModal(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        <button onClick={() => {setSubTab('pending'); setSelectedIds([]);}} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all ${subTab === 'pending' ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500'}`}>مستحقات المصنع</button>
        <button onClick={() => {setSubTab('completed'); setSelectedIds([]);}} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all ${subTab === 'completed' ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500'}`}>دفعيات مكتملة</button>
      </div>

      <div className="flex gap-4 flex-wrap">
         <Button variant="ghost" className="h-10 text-xs" onClick={toggleAll}>{selectedIds.length === filtered.length ? 'إلغاء التحديد' : 'تحديد الكل'}</Button>
         {subTab === 'pending' && selectedIds.length > 0 && (
           <>
             <Button onClick={() => setModal({type: 'PAY_DEPOSIT'})} className="h-10 text-xs">دفع عربون ({selectedIds.length})</Button>
             <Button variant="success" onClick={() => setModal({type: 'PAY_FULL'})} className="h-10 text-xs">تصفية تحصيل ({formatCurrency(bulkTotalRemaining)})</Button>
           </>
         )}
      </div>

      <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
              <th className="p-4 w-12 text-center"></th>
              <th className="p-4">كود الفستان</th>
              <th className="p-4">العروس</th>
              <th className="p-4">إجمالي السعر</th>
              <th className="p-4">{subTab === 'pending' ? 'المتبقي للمصنع' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-4 text-center">{subTab === 'pending' && <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} className="w-5 h-5 accent-brand-500" />}</td>
                <td className="p-4 font-black text-brand-400">{s.factoryCode}</td>
                <td className="p-4 font-bold text-white">{s.brideName}</td>
                <td className="p-4 font-bold text-slate-300">{formatCurrency(s.factoryPrice)}</td>
                <td className="p-4 font-black">
                   {subTab === 'pending' ? <span className="text-red-400">{formatCurrency(s.factoryPrice - s.factoryDepositPaid)}</span> : <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={14}/> مكتمل</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'PAY_DEPOSIT' && (
        <Modal title="دفع عربون متعدد" onClose={() => setModal(null)}>
           <div className="space-y-4 max-h-[50vh] overflow-y-auto p-1 custom-scrollbar">
              {selectedIds.map(id => {
                const s = sales.find(x=>x.id === id);
                return (
                  <div key={id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                     <div className="flex justify-between mb-2">
                        <span className="font-black text-sm text-white">{s?.factoryCode}</span>
                        <span className="text-xs text-red-400">المتبقي: {formatCurrency(s?.factoryPrice - s?.factoryDepositPaid)}</span>
                     </div>
                     <Input type="number" placeholder="ادخل العربون..." onChange={(e:any)=>setPayAmts(p=>({...p, [id]: Number(e.target.value)}))} />
                  </div>
                );
              })}
           </div>
           <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-brand-500/20 text-center">
              <p className="text-xs text-slate-500 mb-1 font-bold uppercase">إجمالي المبالغ المدخلة</p>
              <h3 className="text-3xl font-black text-brand-400">{formatCurrency(Object.values(payAmts).reduce((a,b)=>a+b, 0))}</h3>
           </div>
           <Button onClick={() => handleBulkPayment('DEPOSIT')} className="w-full mt-6">تأكيد الدفع</Button>
        </Modal>
      )}

      {modal?.type === 'PAY_FULL' && (
        <Modal title="تصفية حساب متعدد" onClose={() => setModal(null)}>
           <div className="space-y-3 mb-6 italic text-sm text-surface-400">سيتم تصفية حساب {selectedIds.length} فستان بالكامل بقيمة إجمالية {formatCurrency(bulkTotalRemaining)}</div>
           <Button onClick={() => handleBulkPayment('COLLECTION')} className="w-full">تأكيد التصفية النهائية</Button>
        </Modal>
      )}
    </div>
  );
}

// --- DeliveryView Component ---
function DeliveryView({ bookings, sales, query, user, showToast, addLog, onPrint }: any) {
  const [subTab, setSubTab] = useState<'delivery' | 'return' | 'archive'>('delivery');
  const [modal, setModal] = useState<any>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [newExtra, setNewExtra] = useState('');

  const toDeliver = useMemo(() => {
    const q = (query || '').toLowerCase();
    const b = bookings.filter((x: any) => x.status === BookingStatus.PENDING && ((x.customerName || '').toLowerCase().includes(q) || (x.customerPhone || '').includes(query)));
    const s = sales.filter((x: any) => (x.status === SaleStatus.READY || x.status === SaleStatus.DESIGNING) && ((x.brideName || '').toLowerCase().includes(q) || (x.bridePhone || '').includes(query)));
    const combined = [...b.map((x: any) => ({ ...x, type: 'RENT' })), ...s.map((x: any) => ({ ...x, type: 'SALE' }))];
    return combined.sort((a, b) => (a.deliveryDate || a.expectedDeliveryDate || '').localeCompare(b.deliveryDate || b.expectedDeliveryDate || ''));
  }, [bookings, sales, query]);

  const toReturn = useMemo(() => {
    const q = (query || '').toLowerCase();
    return bookings.filter((x: any) => x.status === BookingStatus.ACTIVE && ((x.customerName || '').toLowerCase().includes(q) || (x.customerPhone || '').includes(query)));
  }, [bookings, query]);

  const archiveData = useMemo(() => {
    const completedBookings = bookings.filter((b: any) => b.status === BookingStatus.COMPLETED);
    const deliveredSales = sales.filter((s: any) => s.status === SaleStatus.DELIVERED);
    const combined = [
      ...completedBookings.map((b: any) => ({ ...b, type: 'RENT', opDate: b.actualReturnDate })),
      ...deliveredSales.map((s: any) => ({ ...s, type: 'SALE', opDate: s.actualDeliveryDate }))
    ];
    return combined.sort((a, b) => (b.opDate || '').localeCompare(a.opDate || ''));
  }, [bookings, sales]);

  const handleDeliverConfirm = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const remainingAfterPayment = Number(fd.get('rem'));
    const staffName = user.name;
    
    try {
      // Calculate amount paid now
      const currentRemaining = item.type === 'RENT' ? item.remainingToPay : item.remainingFromBride;
      const paidNow = (currentRemaining || 0) - remainingAfterPayment;

      if (item.type === 'RENT') {
        const security = {
          type: fd.get('sec_type'),
          detail: fd.get('sec_detail'),
          value: Number(fd.get('sec_val') || 0)
        };
        const updates = { 
          status: BookingStatus.ACTIVE, 
          actualPickupDate: today, 
          remainingToPay: remainingAfterPayment,
          securityDeposit: security,
          extras: extras.join(', '),
          staffName
        };
        await cloudDb.update(COLLS.BOOKINGS, item.id, updates);
        await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.RENTED });
        
        if (paidNow > 0) {
          await cloudDb.add(COLLS.FINANCE, {
            amount: paidNow, type: 'INCOME', category: 'تحصيل متبقي (إيجار)',
            notes: `تحصيل متبقي إيجار فستان ${item.dressName} من العروس ${item.customerName}`,
            date: today, relatedId: item.id
          });
        }
        addLog('تسليم فستان', `تم تسليم فستان ${item.dressName} للعروس ${item.customerName} بواسطة ${staffName}`);
      } else {
        await cloudDb.update(COLLS.SALES, item.id, { 
          status: SaleStatus.DELIVERED, 
          actualDeliveryDate: today, 
          remainingFromBride: remainingAfterPayment,
          staffName
        });
        
        if (paidNow > 0) {
           await cloudDb.add(COLLS.FINANCE, {
             amount: paidNow, type: 'INCOME', category: 'تحصيل متبقي (تفصيل)',
             notes: `تحصيل متبقي تفصيل فستان ${item.factoryCode} من العروس ${item.brideName}`,
             date: today, relatedId: item.id
           });
        }
        addLog('تسليم بيع', `تم تسليم فستان التفصيل ${item.factoryCode} للعروس ${item.brideName} بواسطة ${staffName}`);
      }
      showToast('تم إتمام التسليم بنجاح');
      setModal(null);
      setExtras([]);
    } catch (err) {
      showToast('خطأ في التحديث', 'error');
    }
  };

  const handleReturnConfirm = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal.item;
    const hasDamage = fd.get('damage') === 'yes';
    const damageFee = hasDamage ? Number(fd.get('damage_fee')) : 0;
    
    try {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { 
        status: BookingStatus.COMPLETED, 
        actualReturnDate: today,
        damageFee: damageFee
      });
      await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.CLEANING });
      
      if (damageFee > 0) {
        await cloudDb.add(COLLS.FINANCE, {
          amount: damageFee,
          type: 'INCOME',
          category: 'خصم غرامة تلف',
          notes: `غرامة تلف فستان ${item.dressName} من العروس ${item.customerName}`,
          date: today, relatedId: item.id
        });
      }
      
      addLog('استلام فستان', `تم استلام فستان ${item.dressName} من العروس ${item.customerName}`);
      showToast('تم إتمام الاستلام بنجاح');
      setModal(null);
    } catch (err) {
      showToast('خطأ في التحديث', 'error');
    }
  };

  const undoDelivery = async (item: any) => {
    if (!confirm('هل أنت متأكد من التراجع عن عملية التسليم؟')) return;
    try {
      await cloudDb.update(COLLS.BOOKINGS, item.id, { status: BookingStatus.PENDING, actualPickupDate: null });
      await cloudDb.update(COLLS.DRESSES, item.dressId, { status: DressStatus.AVAILABLE });
      addLog('تراجع تسليم', `تم التراجع عن تسليم فستان ${item.dressName}`);
      showToast('تم التراجع عن التسليم');
    } catch (err) {
      showToast('خطأ', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['delivery', 'return', 'archive'].map((t) => (
          <button 
            key={t}
            onClick={() => setSubTab(t as any)} 
            className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}
          >
            {t === 'delivery' ? 'قيد التسليم' : t === 'return' ? 'قيد الإرجاع' : 'الأرشيف'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subTab === 'delivery' && toDeliver.map((item: any) => (
          <Card key={item.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1.5 h-full opacity-20 ${item.type === 'SALE' ? 'bg-orange-500' : 'bg-brand-500'}`}></div>
            <div className="flex justify-between mb-4">
              <div>
                <h4 className="font-black text-white text-lg">{item.customerName || item.brideName}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${item.type === 'SALE' ? 'bg-orange-500/10 text-orange-400' : 'bg-brand-500/10 text-brand-400'}`}>{item.type === 'SALE' ? 'تفصيل' : 'إيجار'}</span>
                   <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{item.dressName || item.factoryCode}</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-brand-400 block mb-1 uppercase">المناسبة</span>
                <span className="text-sm font-black text-white">{item.eventDate || item.expectedDeliveryDate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModal({ type: 'DELIVER_FORM', item })} variant="success" className="flex-1 h-12 text-xs font-bold">تسليم للعروس</Button>
              <Button variant="ghost" onClick={() => onPrint(item, item.type === 'SALE' ? 'DEPOSIT' : 'RECEIPT')} className="w-12 h-12 p-0 text-brand-400"><Printer size={18}/></Button>
            </div>
          </Card>
        ))}

        {subTab === 'return' && toReturn.map((item: any) => (
          <Card key={item.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1.5 h-full opacity-20 bg-emerald-500`}></div>
            <div className="flex justify-between mb-4">
              <div>
                <h4 className="font-black text-white text-lg">{item.customerName}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400">إيجار</span>
                   <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{item.dressName}</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-brand-400 block mb-1">تاريخ التسليم</span>
                <span className="text-sm font-black text-white">{item.actualPickupDate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModal({ type: 'RETURN_FORM', item })} variant="success" className="flex-1 h-12 text-xs font-bold">استلام من العروس</Button>
              <Button onClick={() => undoDelivery(item)} variant="ghost" className="w-12 h-12 p-0 text-red-400"><RotateCcw size={18}/></Button>
              <Button variant="ghost" onClick={() => onPrint(item, 'RECEIPT')} className="w-12 h-12 p-0 text-brand-400"><Printer size={18}/></Button>
            </div>
          </Card>
        ))}

        {subTab === 'archive' && archiveData.map((item: any) => (
          <Card key={item.id} className="relative opacity-80">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-white">{item.customerName || item.brideName}</h4>
              <div className="flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.type === 'SALE' ? 'bg-orange-500/10 text-orange-400' : 'bg-brand-500/10 text-brand-400'}`}>{item.type === 'SALE' ? 'تفصيل' : 'إيجار'}</span>
                 <Button variant="ghost" onClick={() => onPrint(item, item.type === 'SALE' ? 'DEPOSIT' : 'RECEIPT')} className="!w-8 !h-8 !p-0 text-slate-500 hover:text-white"><Printer size={14}/></Button>
              </div>
            </div>
            <p className="text-[10px] font-bold text-surface-500 mb-3">{item.dressName || item.factoryCode}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/40 p-3 rounded-xl">
               <div><span className="block text-slate-500">تم التسليم:</span> <span className="font-bold">{item.actualPickupDate || item.actualDeliveryDate}</span></div>
               {item.type === 'RENT' && <div><span className="block text-slate-500">تم الاستلام:</span> <span className="font-bold">{item.actualReturnDate}</span></div>}
               <div className="col-span-2"><span className="text-slate-500">الموظف المسئول:</span> <span className="font-bold">{item.staffName || '---'}</span></div>
            </div>
          </Card>
        ))}

        {(subTab === 'delivery' ? toDeliver : subTab === 'return' ? toReturn : archiveData).length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 italic uppercase tracking-[0.3em]">
             <Truck size={48} className="mx-auto mb-4" />
             <p>No Items Pending</p>
          </div>
        )}
      </div>

      {/* --- DELIVERY FORM MODAL --- */}
      {modal?.type === 'DELIVER_FORM' && (
        <Modal title={`إتمام تسليم: ${modal.item.customerName || modal.item.brideName}`} onClose={() => { setModal(null); setExtras([]); }}>
          <form onSubmit={handleDeliverConfirm} className="space-y-6">
            <Input label="المبلغ المتبقي للتحصيل" name="rem" type="number" defaultValue={modal.item.remainingToPay || modal.item.remainingFromBride} required />
            
            {modal.item.type === 'RENT' && (
              <>
                <div className="p-5 bg-slate-950/50 border border-white/5 rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-widest">تفاصيل الأمنية</h4>
                  <select name="sec_type" onChange={(e:any)=>setModal({...modal, secType: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-white font-bold" required>
                    <option value="">-- اختر نوع الأمنية --</option>
                    <option value="مبلغ مالي">مبلغ مالي</option>
                    <option value="مستند">مستند (بطاقة/جواز)</option>
                    <option value="قطعة ذهب">قطعة ذهب</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  {modal.secType === 'مبلغ مالي' && <Input label="قيمة الأمنية المالية" name="sec_val" type="number" placeholder="ادخل المبلغ..." required />}
                  {(modal.secType === 'مستند' || modal.secType === 'قطعة ذهب' || modal.secType === 'أخرى') && (
                    <Input label="تفاصيل الأمنية" name="sec_detail" placeholder="ادخل التفاصيل..." required />
                  )}
                </div>

                <div className="p-5 bg-slate-950/50 border border-white/5 rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">إضافات وملحقات (Add-ons)</h4>
                  <div className="flex gap-2">
                    <input value={newExtra} onChange={e=>setNewExtra(e.target.value)} placeholder="مثال: طرحة خاصة، اكسسوار شعر..." className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm" />
                    <button type="button" onClick={()=>{ if(newExtra) { setExtras(p=>[...p, newExtra]); setNewExtra(''); } }} className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center"><PackagePlus size={20}/></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extras.map((ex, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                        {ex} <button type="button" onClick={()=>setExtras(p=>p.filter((_,i)=>i!==idx))} className="text-red-400"><MinusCircle size={14}/></button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
               <Button className="flex-1 !rounded-2xl h-16 shadow-xl">تأكيد عملية التسليم</Button>
               <Button type="button" variant="ghost" onClick={() => onPrint(modal.item, modal.item.type === 'SALE' ? 'DEPOSIT' : 'RECEIPT')} className="!w-16 !h-16 !p-0 !rounded-2xl border-white/10"><Printer size={24}/></Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- RETURN FORM MODAL --- */}
      {modal?.type === 'RETURN_FORM' && (
        <Modal title={`استلام فستان من العروس: ${modal.item.customerName}`} onClose={() => setModal(null)}>
          <div className="mb-6 space-y-4">
            <div className="p-5 bg-slate-950 border border-white/5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">الأمنية المستلمة</span>
              <p className="text-white font-bold">{modal.item.securityDeposit?.type}: {modal.item.securityDeposit?.detail || formatCurrency(modal.item.securityDeposit?.value)}</p>
            </div>
            <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-1">المتبقي غير المدفوع</span>
              <p className="text-xl font-black text-white">{formatCurrency(modal.item.remainingToPay)}</p>
            </div>
          </div>
          <form onSubmit={handleReturnConfirm} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-white uppercase px-4 italic opacity-60">حالة الفستان</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center h-14 rounded-2xl border cursor-pointer transition-all font-bold ${modal.hasDamage ? 'border-white/5 bg-slate-950' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
                  <input type="radio" name="damage" value="no" className="hidden" defaultChecked onChange={() => setModal({...modal, hasDamage: false})} /> سليم
                </label>
                <label className={`flex items-center justify-center h-14 rounded-2xl border cursor-pointer transition-all font-bold ${modal.hasDamage ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'border-white/5 bg-slate-950'}`}>
                  <input type="radio" name="damage" value="yes" className="hidden" onChange={() => setModal({...modal, hasDamage: true})} /> به تلف
                </label>
              </div>
            </div>
            {modal.hasDamage && (
              <div className="animate-slide-up">
                 <Input label="قيمة غرامة التلف (تخصم نقداً)" name="damage_fee" type="number" placeholder="ادخل القيمة..." required />
                 <p className="text-[10px] text-red-400 font-bold mt-2 px-4">سيتم تسجيل هذا المبلغ كإيراد نقدي تحت بند "خصم غرامة تلف".</p>
              </div>
            )}
            <div className="flex gap-2">
               <Button className="flex-1 !rounded-2xl h-16 shadow-xl">تأكيد الاستلام النهائي</Button>
               <Button type="button" variant="ghost" onClick={() => onPrint(modal.item, 'RECEIPT')} className="!w-16 !h-16 !p-0 !rounded-2xl border-white/10"><Printer size={24}/></Button>
            </div>
            <p className="text-center text-[10px] text-slate-500 font-bold">تأكيد الاستلام سيغير حالة الفستان تلقائياً إلى "يحتاج تنظيف".</p>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CustomersView({ bookings, sales, query }: any) {
  const customers = useMemo(() => {
    const map = new Map();
    [...bookings, ...sales].forEach((item: any) => {
      const name = item.customerName || item.brideName;
      const phone = item.customerPhone || item.bridePhone;
      if (!phone) return;
      if (!map.has(phone)) map.set(phone, { id: phone, name, phone, count: 1, lastDate: item.createdAt || item.orderDate });
      else {
        const existing = map.get(phone);
        existing.count++;
        if ((item.createdAt || item.orderDate) > existing.lastDate) existing.lastDate = item.createdAt || item.orderDate;
      }
    });
    return Array.from(map.values()).filter((c:any) => (c.name || '').toLowerCase().includes((query || '').toLowerCase()) || (c.phone || '').includes(query));
  }, [bookings, sales, query]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {customers.map((c: any) => (
        <Card key={c.id}>
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold italic">{c.name.charAt(0)}</div>
              <div><h4 className="font-black text-white text-base">{c.name}</h4><p className="text-[10px] text-surface-500 font-bold">{c.phone}</p></div>
           </div>
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500"><span>{c.count} معاملات</span><span>{c.lastDate}</span></div>
        </Card>
      ))}
      {customers.length === 0 && <div className="text-center py-40 opacity-10"><Users size={80} strokeWidth={1} className="mx-auto" /></div>}
    </div>
  );
}

function FinanceView({ finance, dresses, users, bookings, query, hasPerm, showToast }: any) {
  const [subTab, setSubTab] = useState<'logs' | 'analysis' | 'performance'>('logs');
  const [modal, setModal] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtering States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const filteredFinance = useMemo(() => {
    return finance.filter(f => {
      const matchesQuery = (f.category || '').includes(query) || (f.notes || '').includes(query);
      const matchesDate = (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate);
      const matchesCategory = selectedCats.length === 0 || selectedCats.includes(f.category);
      return matchesQuery && matchesDate && matchesCategory;
    });
  }, [finance, query, startDate, endDate, selectedCats]);

  const totals = useMemo(() => {
    const inc = filteredFinance.filter((f: any) => f.type === 'INCOME').reduce((s: any, f: any) => s + f.amount, 0);
    const exp = filteredFinance.filter((f: any) => f.type === 'EXPENSE').reduce((s: any, f: any) => s + f.amount, 0);
    return { inc, exp, profit: inc - exp };
  }, [filteredFinance]);

  const performance = useMemo(() => {
    return dresses.filter((d: any) => d.type === DressType.RENT).map((d: any) => {
      const income = bookings.filter((b: any) => b.dressId === d.id && b.status !== BookingStatus.CANCELLED).reduce((s: any, b: any) => s + b.rentalPrice, 0) + (d.status === DressStatus.SOLD ? (d.salePrice || 0) : 0);
      const expense = d.factoryPrice + finance.filter((f: any) => f.relatedDresses?.includes(d.name) && f.type === 'EXPENSE').reduce((s: any, f: any) => s + f.amount, 0);
      return { ...d, income, expense, profit: income - expense };
    }).sort((a: any, b: any) => b.profit - a.profit);
  }, [dresses, bookings, finance]);

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get('t') as 'INCOME' | 'EXPENSE';
    const amount = Math.abs(Number(fd.get('a')));
    const data: any = { date: fd.get('d') || today, type, amount, category: fd.get('c'), notes: fd.get('n') || '' };
    if (type === 'EXPENSE') {
      if (data.category === 'رواتب') data.targetUser = fd.get('tu');
      if (['تنظيف', 'ترزي'].includes(data.category)) {
        data.relatedDresses = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => (c as HTMLInputElement).value);
      }
    }
    await cloudDb.add(COLLS.FINANCE, data);
    showToast('تم تسجيل العملية بنجاح'); setModal(null);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-lg">
        {['logs', 'analysis', 'performance'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${subTab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500 hover:text-white'}`}>
            {t === 'logs' ? 'سجل العمليات' : t === 'analysis' ? 'التحليلات' : 'أداء الفساتين'}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <Button variant="ghost" className="flex-1 h-12" onClick={() => setShowFilters(!showFilters)}>
           <Filter size={18} /> {showFilters ? 'إخفاء الفلاتر' : 'تصفية النتائج'}
        </Button>
        {hasPerm('add_finance') && <Button onClick={() => setModal({ type: 'ADD' })} className="flex-1 h-12"><Plus size={18}/> إضافة عملية</Button>}
      </div>

      {showFilters && (
        <Card className="animate-slide-up bg-slate-900/40 border-brand-500/20">
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input label="من تاريخ" type="date" value={startDate} onChange={(e:any)=>setStartDate(e.target.value)} icon={CalendarDays} />
                <Input label="إلى تاريخ" type="date" value={endDate} onChange={(e:any)=>setEndDate(e.target.value)} icon={CalendarDays} />
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest px-4">تصفية حسب البند (اختيار متعدد)</p>
                 <div className="flex flex-wrap gap-2">
                    {FINANCE_CATEGORIES.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => toggleCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${selectedCats.includes(cat) ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                      >
                        {cat}
                      </button>
                    ))}
                    {selectedCats.length > 0 && <button onClick={() => setSelectedCats([])} className="px-4 py-2 rounded-xl text-[11px] font-black text-red-500">مسح الكل</button>}
                 </div>
              </div>
           </div>
        </Card>
      )}

      {subTab === 'logs' && (
        <div className="space-y-8">
           <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl text-center"><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2 opacity-60">وارد (+)</span><p className="text-xl font-black text-emerald-200 tracking-tighter">{formatCurrency(totals.inc)}</p></div>
              <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-3xl text-center"><span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-2 opacity-60">منصرف (-)</span><p className="text-xl font-black text-red-200 tracking-tighter">{formatCurrency(totals.exp)}</p></div>
              <div className="bg-brand-500/5 border border-brand-500/10 p-6 rounded-3xl text-center"><span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-2 opacity-60">الربح الصافي</span><p className="text-xl font-black text-brand-200 tracking-tighter">{formatCurrency(totals.profit)}</p></div>
           </div>
           
           <div className="space-y-3">
              {filteredFinance.slice().reverse().map((f: any) => (
                <Card key={f.id} className="!py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${f.type === 'INCOME' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-500' : 'bg-red-500/10 border-red-500/10 text-red-500'}`}>{f.type === 'INCOME' ? <TrendingUp size={18}/> : <ArrowDownCircle size={18}/>}</div>
                    <div><h4 className="font-black text-sm text-white">{f.category}</h4><p className="text-[10px] text-slate-500 font-bold mt-0.5">{f.date} • {f.notes}</p></div>
                  </div>
                  <div className="text-left flex flex-col items-end">
                    <span className={`text-base font-black tracking-tighter ${f.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>{f.type === 'INCOME' ? '+' : '-'}{formatCurrency(f.amount)}</span>
                    {hasPerm('admin_reset') && <button onClick={async () => { if(confirm('حذف السجل المالي؟')) cloudDb.delete(COLLS.FINANCE, f.id); }} className="text-[9px] text-red-500/50 mt-1 hover:text-red-500 transition-colors">حذف</button>}
                  </div>
                </Card>
              ))}
              {filteredFinance.length === 0 && <div className="text-center py-20 opacity-20"><DollarSign size={64} className="mx-auto mb-4"/><p className="font-black uppercase tracking-widest text-sm">No results match filters</p></div>}
           </div>
        </div>
      )}
      {subTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performance.map((d: any) => (
            <Card key={d.id}>
              <div className="flex justify-between items-start mb-4">
                <div><h4 className="text-lg font-black text-white">{d.name}</h4><p className="text-[10px] text-brand-500 font-bold mt-1 uppercase tracking-widest italic opacity-60">Profitability Index</p></div>
                <span className={`px-3 py-1 rounded-xl text-[11px] font-black ${d.profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{formatCurrency(d.profit)}</span>
              </div>
              <div className="space-y-2 text-xs italic">
                <p className="flex justify-between"><span>إجمالي الوارد:</span> <span className="text-emerald-400 font-bold">{formatCurrency(d.income)}</span></p>
                <p className="flex justify-between"><span>إجمالي المنصرف:</span> <span className="text-red-400 font-bold">{formatCurrency(d.expense)}</span></p>
              </div>
            </Card>
          ))}
        </div>
      )}
      {subTab === 'analysis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="!bg-emerald-500/5 border-emerald-500/10">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-6 border-b border-emerald-500/10 pb-3 italic">تحليل الواردات المفلترة</h3>
              <div className="space-y-4">
                 {Array.from(new Set(filteredFinance.filter((f: any) => f.type === 'INCOME').map((f: any) => f.category))).map((cat: any) => {
                   const sum = filteredFinance.filter((f: any) => f.category === cat && f.type === 'INCOME').reduce((s: number, f: any) => s + f.amount, 0);
                   return <div key={cat} className="flex justify-between items-center"><span className="text-white font-bold">{cat}</span><span className="text-emerald-400 font-black tracking-tighter">{formatCurrency(sum)}</span></div>
                 })}
              </div>
           </Card>
           <Card className="!bg-red-500/5 border-red-500/10">
              <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-6 border-b border-red-500/10 pb-3 italic">تحليل المنصرفات المفلترة</h3>
              <div className="space-y-4">
                 {Array.from(new Set(filteredFinance.filter((f: any) => f.type === 'EXPENSE').map((f: any) => f.category))).map((cat: any) => {
                   const sum = filteredFinance.filter((f: any) => f.category === cat && f.type === 'EXPENSE').reduce((s: number, f: any) => s + f.amount, 0);
                   return <div key={cat} className="flex justify-between items-center"><span className="text-white font-bold">{cat}</span><span className="text-red-400 font-black tracking-tighter">{formatCurrency(sum)}</span></div>
                 })}
              </div>
           </Card>
        </div>
      )}
      {modal?.type === 'ADD' && (
        <Modal title="تسجيل عملية مالية" onClose={() => setModal(null)}>
           <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[11px] font-black text-white uppercase px-4 italic opacity-60 tracking-widest leading-none">نوع العملية</label>
                 <select name="t" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" onChange={(e: any)=>setModal({...modal, entry: e.target.value})} required>
                   <option value="">-- اختر --</option>
                   <option value="INCOME">وارد (+)</option>
                   <option value="EXPENSE">منصرف (-)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-white px-4 leading-none uppercase tracking-widest italic">التصنيف</label>
                 <select name="c" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-brand-500" onChange={(e: any)=>setModal({...modal, expType: e.target.value})} required>
                    <option value="">-- اختر التصنيف --</option>
                    {FINANCE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                 </select>
              </div>
              {modal.expType === 'رواتب' && (
                <select name="tu" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold" required>
                   {users.map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              )}
              {(modal.expType === 'تنظيف' || modal.expType === 'ترزي') && (
                <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl max-h-60 overflow-y-auto custom-scrollbar italic font-black space-y-2 shadow-inner">
                   <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic mb-2 opacity-60 leading-none">اختر الفساتين المعنية:</p>
                   {dresses.filter((d: any)=>d.type===DressType.RENT).map((d: any) => {
                      const priority = (modal.expType === 'تنظيف' && d.status === DressStatus.CLEANING) || (modal.expType === 'ترزي' && bookings.some((b: any)=>b.dressId === d.id && !b.fitting1Done));
                      return (
                        <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${priority ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/5'}`}>
                           <input type="checkbox" value={d.name} className="w-5 h-5 accent-brand-500" />
                           <span className="text-xs font-bold text-white">{d.name} {priority && <span className="text-[9px] text-brand-400 font-black italic ml-2">● أولوية</span>}</span>
                        </label>
                      );
                   })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                 <Input label="القيمة المالية" name="a" type="number" required />
                 <Input label="التاريخ" name="d" type="date" defaultValue={today} />
              </div>
              <textarea name="n" placeholder="وصف / ملاحظات إضافية..." className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-bold h-24" />
              <Button className="w-full italic font-black uppercase shadow-brand-900/20">تسجيل العملية</Button>
           </form>
        </Modal>
      )}
    </div>
  );
}

function LogsView({ logs, query }: any) {
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

function SettingsView({ user, users, bookings, sales, finance, hasPerm, showToast, addLog }: any) {
  const [modal, setModal] = useState<any>(null);

  const handleResetAll = async () => {
    if (confirm('تحذير أمان قصوى: سيتم مسح كافة سجلات السحابة بالكامل والعودة لنقطة الصفر. هذا الإجراء لا يمكن التراجع عنه. استمرار؟')) {
       await cloudDb.clearAll();
       showToast('تم تصفير النظام بنجاح تام');
       setTimeout(() => window.location.reload(), 1200);
    }
  };

  const handleFixFinance = async () => {
    if(!confirm('سيتم مراجعة جميع الحجوزات وطلبات البيع وإضافة السجلات المالية المفقودة للعربون. هل أنت متأكد؟')) return;
    
    let count = 0;
    const financeIds = new Set(finance.map((f:any) => f.relatedId).filter(Boolean));

    // Fix Bookings
    for (const b of bookings) {
        if (b.paidDeposit > 0 && !financeIds.has(b.id)) {
            await cloudDb.add(COLLS.FINANCE, {
                amount: b.paidDeposit,
                type: 'INCOME',
                category: 'حجز إيجار',
                notes: `عربون حجز فستان ${b.dressName} للعروس ${b.customerName} (تصحيح تلقائي)`,
                date: b.createdAt || today,
                relatedId: b.id
            });
            count++;
        }
    }

    // Fix Sales
    for (const s of sales) {
        if (s.deposit > 0 && !financeIds.has(s.id)) {
             await cloudDb.add(COLLS.FINANCE, {
               amount: s.deposit, 
               type: 'INCOME', 
               category: 'عربون تفصيل',
               notes: `عربون تفصيل فستان كود ${s.factoryCode} للعروس ${s.brideName} (تصحيح تلقائي)`,
               date: s.orderDate || today, 
               relatedId: s.id
             });
             count++;
        }
    }
    
    showToast(`تم إضافة ${count} سجل مالي مفقود`);
    addLog('تصحيح مالي', `تم تشغيل التصحيح التلقائي وإضافة ${count} سجل`);
  };

  return (
    <div className="space-y-12 animate-fade-in pb-10 italic">
       <div className="text-center py-10 relative">
          <div className="w-32 h-32 bg-brand-500 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Users size={56} className="text-white"/>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight leading-none uppercase">{user.name}</h2>
          <p className="text-brand-500 font-black mt-3 tracking-[0.4em] uppercase text-xs">@{user.username} • {user.role}</p>
          <Button variant="ghost" onClick={() => setModal({ type: 'CHANGE_PASS' })} className="mx-auto mt-10 !rounded-2xl px-10 h-14 border-white/10 italic"><Key size={18}/> تغيير كلمة المرور</Button>
       </div>

       {hasPerm('admin_reset') && (
         <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(users as any[]).map((u: any) => (
                <Card key={u.id} className="flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-white/5 italic">{(u.name as string).charAt(0)}</div>
                     <div><p className="font-black text-white text-base leading-tight tracking-tight">{u.name}</p><p className="text-[10px] text-slate-600 font-bold tracking-widest mt-1 italic uppercase">@{u.username}</p></div>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="ghost" onClick={() => setModal({ ...u, type: 'EDIT_USER' })} className="!w-10 !h-10 !p-0 !rounded-xl transition-transform hover:scale-110"><Edit size={16}/></Button>
                   </div>
                </Card>
              ))}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
               <Button onClick={() => setModal({ type: 'ADD_USER' })} className="w-full !rounded-[2rem] h-18 text-base shadow-xl shadow-brand-900/10 uppercase tracking-widest font-black italic"><UserPlus size={22}/> إضافة موظف جديد</Button>
               
               <div className="space-y-4">
                  <h4 className="text-white font-bold text-lg px-2 mt-4">أدوات الإدارة</h4>
                  <Button onClick={handleFixFinance} className="w-full !rounded-[2rem] h-16 text-base bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/10 uppercase tracking-widest font-black italic">
                      <RotateCcw size={22} className="ml-2"/> مراجعة وتصحيح السجلات المالية
                  </Button>
               </div>
            </div>

            <div className="p-12 bg-red-950/20 border border-red-500/20 rounded-[4rem] text-center mt-20 relative overflow-hidden">
               <AlertTriangle size={48} className="mx-auto text-red-500 mb-6" />
               <h4 className="text-red-500 font-black text-2xl mb-4 italic">منطقة الخطر</h4>
               <Button variant="danger" onClick={handleResetAll} className="w-full h-18 text-lg font-black !rounded-[2.5rem]">تصفير النظام بالكامل</Button>
            </div>
         </div>
       )}
       
       {(modal?.type === 'ADD_USER' || modal?.type === 'EDIT_USER') && (
         <Modal title={modal.type === 'ADD_USER' ? 'موظف جديد' : 'تعديل موظف'} onClose={() => setModal(null)} size="lg">
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const perms = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')).map((c: any) => (c as HTMLInputElement).value);
              const data = { name: fd.get('n'), username: fd.get('u'), role: UserRole.EMPLOYEE, permissions: perms };
              if (modal.type === 'ADD_USER') { (data as any).password = '123'; (data as any).firstLogin = true; await cloudDb.add(COLLS.USERS, data); }
              else await cloudDb.update(COLLS.USERS, modal.id, data);
              showToast('تم حفظ بيانات الموظف'); setModal(null);
            }} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <Input label="الاسم الكامل" name="n" defaultValue={modal.name} required />
                <Input label="اسم المستخدم" name="u" defaultValue={modal.username} required />
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-6 rounded-3xl border border-white/5 max-h-[40vh] overflow-y-auto custom-scrollbar italic">
                  {(PERMISSIONS_LIST as any[]).map((p: any) => (
                    <label key={p.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                      <input type="checkbox" value={p.id} defaultChecked={modal.permissions?.includes(p.id)} className="w-6 h-6 accent-brand-500 rounded-lg shadow-sm" />
                      <span className="text-[13px] font-bold text-surface-200 uppercase tracking-widest leading-none">{p.label}</span>
                    </label>
                  ))}
              </div>
              <Button className="w-full !rounded-2xl h-16 shadow-xl uppercase italic tracking-widest">حفظ بيانات الموظف</Button>
            </form>
         </Modal>
       )}

       {modal?.type === 'CHANGE_PASS' && (
         <Modal title="تغيير كلمة السر" onClose={() => setModal(null)}>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const p = new FormData(e.currentTarget).get('p') as string;
              await cloudDb.update(COLLS.USERS, user.id, { password: p });
              showToast('تم التحديث'); setModal(null);
            }} className="space-y-6">
               <Input label="كلمة السر الجديدة" name="p" type="password" required />
               <Button className="w-full h-16 !rounded-2xl italic tracking-widest uppercase">حفظ</Button>
            </form>
         </Modal>
       )}
    </div>
  );
}