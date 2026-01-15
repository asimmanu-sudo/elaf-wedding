
import React from 'react';
import { Phone } from 'lucide-react';
import { formatCurrency, today } from '../utils/helpers';
import { MEASUREMENT_FIELDS } from '../utils/constants';

interface InvoiceCloneProps {
  data: any;
  mode?: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE';
  signatureImg?: string | null; // Added signature prop
}

const InvoiceClone: React.FC<InvoiceCloneProps> = ({ data, mode = 'DEPOSIT', signatureImg }) => {
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

  // --- Terms & Conditions Logic ---
  const RENT_TERMS = [
    "العربون المدفوع يُعد تأكيدًا نهائيًا للحجز، غير قابل للاسترداد، ويُخصم من إجمالي المبلغ عند إتمام العملية.",
    "في حال إلغاء الحجز أو عدم الحضور في الموعد المحدد من قبل العميل، يُعتبر العربون ملغيًا دون أي التزام على معرض إيلاف.",
    "يخضع تغيير موعد المناسبة أو استبدال الفستان لتوفر الفستان وموافقة معرض إيلاف.",
    "الأسعار تشمل ما تم الاتفاق عليه في هذه الفاتورة فقط، وأي خدمة أو تعديل إضافي تُحسب بتكلفة منفصلة.",
    "العربون لا يُعد إيصال استلام للفستان، ويُستخدم لضمان جدية الحجز وصحة البيانات المقدمة من العميل.",
    "يحق لمعرض إيلاف، في حال عدم تأجير الفستان ك(أول لبسة)، إعادة تأجيره في تاريخ أقرب وعرضه لأغراض التصوير أو النشر الإعلامي، دون أن يترتب على ذلك أي حق للعميل.",
    "في حال السداد عن طريق التحويل البنكي أو ويسترن يونيون، يتم احتساب سعر الصرف حسب سعر يوم دفع العربون أو سداد المبلغ المتبقي، كما أن الأسعار المذكورة لا تشمل تكاليف الشحن الدولي.",
    "بتوقيعك أدناه، فإنك توافق على دفع المبلغ المتبقي كما هو موضح في الأعلى وقبول وصف فستان الزفاف كما هو مذكور. النسخة الإلكتورنية مصدقة عن طريق الواتساب."
  ];

  const SALE_TERMS = [
    "يتم تصميم الفستان حسب المقاسات والطلب المتفق عليه مع العروس. أي تغيير بعد بدء التفصيل قد يترتب عليه تكلفة إضافية.",
    "المدة المتفق عليها تبدأ من تاريخ دفع العربون أو كامل المبلغ، ويجب الالتزام بها. أي تأخير من جانب العروس في تقديم المقاسات أو التعديلات قد يسبب تأخير التسليم.",
    "العربون غير قابل للاسترداد ويخصم من إجمالي الفاتورة، ويتم دفع المبلغ المتبقي عند الانتهاء من الفستان أو حسب الاتفاق.",
    "أي تعديل بسيط بعد التسليم يتم وفق الاتفاق، ويحق لمعرض إيلاف رفض أي تعديل قد يضر بالفستان أو تصميمه الأصلي.",
    "في حالة الشحن الدولي، المعرض غير مسؤول عن أي أضرار ناتجة عن الشحن، ويتم مراجعة الفستان من قبل مندوب للعروس أو عن طريق التصوير قبل الاستلام النهائي.",
    "إلغاء الطلب بعد بدء التفصيل يؤدي إلى فقدان العربون كاملاً، أما في حال الإلغاء قبل بدء التفصيل يُسترد العربون جزئياً حسب الاتفاق.",
    "يحق لمعرض إيلاف استخدام صور الفستان والتصميم لأغراض الدعاية والترويج بعد مناسبة العروس، دون أن يترتب على ذلك أي حق للعروس.",
    "في حال السداد عن طريق التحويل البنكي أو ويسترن يونيون، يتم احتساب سعر الصرف حسب سعر يوم دفع العربون أو سداد المبلغ المتبقي، كما أن الأسعار المذكورة لا تشمل تكاليف الشحن الدولي.",
    "بتوقيعك أدناه، فإنك توافق على دفع المبلغ المتبقي كما هو موضح في الأعلى وقبول وصف فستان الزفاف كما هو مذكور. النسخة الإلكتورنية مصدقة عن طريق الواتساب."
  ];

  const RECEIPT_TERMS = [
    "مدة الإيجار حسب التاريخ المتفق عليه، ويلزم الالتزام بموعد الإرجاع.",
    "في حال التأخير عن موعد الإرجاع، يحق لمعرض إيلاف احتساب غرامة عن كل يوم تأخير.",
    "تقر العروس باستلام الفستان بحالة جيدة وخالٍ من العيوب الظاهرة.",
    "الفستان مخصص للاستخدام الشخصي في يوم الزفاف فقط.",
    "التنظيف العادي مشمول، وأي اتساخ شديد يترتب عليه رسوم إضافية.",
    "تتحمل العروس تكلفة أي تلف أو فقدان لأي جزء من الفستان أو ملحقاته.",
    "في حال التلف الكامل أو الفقدان، تلتزم العروس بدفع القيمة الكاملة للفستان.",
    "يمنع إجراء أي تعديل دائم على الفستان دون موافقة معرض إيلاف.",
    "العربون المدفوع غير قابل للاسترداد ويُستخدم كضمان.",
    "باستلام الفستان، تقر العروس بموافقتها الكاملة على جميع الشروط أعلاه."
  ];

  // --- Layout Components ---

  const Header = ({ title, subtitle }: { title?: string, subtitle?: string }) => (
    <div className="flex justify-between items-start mb-8 shrink-0 border-b-2 border-[#B59410]/20 pb-4">
      <div className="flex flex-col justify-center">
        <img src="/Logo.png" alt="Logo" className="w-32 object-contain mb-2" />
        <p className="text-[9px] font-black text-[#B59410] tracking-[0.25em] uppercase">ELAF WEDDING DRESSES</p>
      </div>
      <div className="text-left mt-2">
        {title && <h1 className="text-3xl font-black text-[#B59410] uppercase tracking-tight leading-none">{title}</h1>}
        {subtitle && <p className="text-sm text-slate-400 font-bold tracking-widest uppercase mt-1 dir-ltr">{subtitle}</p>}
      </div>
    </div>
  );

  const Footer = () => (
    <div className="mt-auto pt-12 shrink-0 border-t border-slate-200/60">
      <div className="flex justify-between items-end">
        <div className="space-y-2 text-right">
           <div className="flex items-center gap-3 text-slate-600 justify-end group">
             <span className="text-base font-black tracking-wider group-hover:text-[#B59410] transition-colors" dir="ltr">+20 10 05830864</span>
             <Phone size={18} className="text-[#B59410]" fill="currentColor" />
           </div>
           <div className="flex items-center gap-3 text-slate-600 justify-end group">
             <span className="text-base font-black group-hover:text-[#B59410] transition-colors">Elaf Wedding Dresses</span>
             <span className="w-5 h-5 flex items-center justify-center bg-[#B59410] text-white rounded-full text-xs font-bold shadow-sm">f</span>
           </div>
        </div>
        
        {/* SIGNATURE SECTION */}
        <div className="text-center pb-2">
           <div className="h-20 flex items-end justify-center mb-2">
              {signatureImg ? (
                  <img src={signatureImg} alt="Signature" className="h-full object-contain mix-blend-multiply opacity-90" />
              ) : (
                  <div className="w-64 border-b-2 border-dashed border-slate-300"></div>
              )}
           </div>
           <p className="text-base font-black text-slate-400 uppercase tracking-widest">توقيع العميل</p>
        </div>
        
        <div className="text-left">
           <img src="/qrcode.png" alt="QR" className="w-24 h-24 border-2 border-slate-100 rounded-xl p-1 opacity-90 mix-blend-multiply" />
        </div>
      </div>
    </div>
  );

  const containerStyle: React.CSSProperties = {
    width: '210mm',
    height: '296mm',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
    color: '#334155',
    padding: '12mm',
    boxSizing: 'border-box',
    position: 'relative',
    fontFamily: 'Tajawal, sans-serif'
  };

  // --- MODES RENDER ---

  // 1. SCHEDULE MODE
  if (mode === 'SCHEDULE') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
        <Header title="جدول الحجوزات" subtitle="BOOKINGS SCHEDULE" />
        <div className="flex-1 min-h-0 mt-4">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="bg-slate-100 text-[#B59410] border-y-2 border-slate-200">
                <th className="p-3 font-black w-[15%] text-xs">التاريخ</th>
                <th className="p-3 font-black w-[25%] text-xs">اسم العروس</th>
                <th className="p-3 font-black w-[20%] text-xs">الفستان</th>
                <th className="p-3 font-black w-[15%] text-xs">رقم الهاتف</th>
                <th className="p-3 font-black w-[25%] border-r border-slate-200 text-xs text-center">ملاحظات / توقيع</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item: any, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800 text-sm" dir="ltr">{item.eventDate}</td>
                  <td className="p-3 font-bold text-slate-800 text-sm">{item.customerName}</td>
                  <td className="p-3 font-medium text-slate-600 italic text-sm">{item.dressName}</td>
                  <td className="p-3 font-medium text-slate-500 tracking-wider text-sm" dir="ltr">{item.customerPhone}</td>
                  <td className="p-3 border-r border-slate-200"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Footer />
      </div>
    );
  }

  // 2. SIZES MODE
  if (mode === 'SIZES') {
    const m = data.measurements || {};
    const descriptiveFields = ['bustType', 'skirtType', 'materials'];
    const tableFields = MEASUREMENT_FIELDS.filter(f => !descriptiveFields.includes(f.id));
    const half = Math.ceil(tableFields.length / 2);
    const rows = [];
    for (let i = 0; i < half; i++) { rows.push({ left: tableFields[i], right: tableFields[i + half] }); }

    return (
      <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
        <Header title="نموذج المقاسات" subtitle="MEASUREMENTS SHEET" />
        
        <div className="flex-1 flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">اسم العروس</label>
                    <p className="text-lg font-black text-slate-800">{brideFullName}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">كود / اسم الفستان</label>
                    <p className="text-lg font-black text-[#B59410]">{data.factoryCode || data.dressName || '---'}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">وحدة القياس</label>
                    <p className="text-base font-bold text-slate-600">{m.unit === 'cm' ? 'سنتيمتر (CM)' : 'إنش (IN)'}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">تاريخ القياس</label>
                    <p className="text-base font-bold text-slate-600" dir="ltr">{invDate}</p>
                </div>
            </div>

            <table className="w-full border-collapse border border-slate-200 text-right text-sm">
                <thead>
                <tr className="bg-slate-100 text-[#B59410]">
                    <th className="border border-slate-200 p-2 font-black w-[35%]">منطقة القياس</th>
                    <th className="border border-slate-200 p-2 text-center font-black w-[15%]">القيمة</th>
                    <th className="border border-slate-200 p-2 font-black w-[35%]">منطقة القياس</th>
                    <th className="border border-slate-200 p-2 text-center font-black w-[15%]">القيمة</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 p-2 font-bold text-slate-600">{row.left.label}</td>
                    <td className="border border-slate-200 p-2 text-center font-black text-slate-800 dir-ltr text-base">{m[row.left.id] || '-'}</td>
                    <td className="border border-slate-200 p-2 font-bold text-slate-600">{row.right ? row.right.label : ''}</td>
                    <td className="border border-slate-200 p-2 text-center font-black text-slate-800 dir-ltr text-base">{row.right ? (m[row.right.id] || '-') : ''}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            <div className="grid grid-cols-3 gap-4">
                {descriptiveFields.map(fieldId => {
                    const field = MEASUREMENT_FIELDS.find(f => f.id === fieldId);
                    return (
                        <div key={fieldId} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{field?.label}</label>
                            <p className="text-base font-bold text-slate-800">{m[fieldId] || '---'}</p>
                        </div>
                    );
                })}
            </div>

            {m.orderNotes && (
                <div className="p-4 border border-amber-100 rounded-xl bg-amber-50 flex-1">
                    <h4 className="font-black mb-2 text-amber-600 text-[10px] uppercase tracking-wider">ملاحظات الخياطة</h4>
                    <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed text-slate-700">{m.orderNotes}</p>
                </div>
            )}
        </div>
        <Footer />
      </div>
    );
  }

  // 3. RECEIPT / PICKUP MODE
  if (mode === 'RECEIPT') {
    return (
      <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
        <Header title="سند استلام / إرجاع" subtitle="RECEIPT VOUCHER" />
        <div className="flex-1 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-6">
                {/* Info Section */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 pb-6 border-b-2 border-slate-100">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">استلمنا من السيدة</label>
                        <p className="text-lg font-black text-slate-800">{brideFullName}</p>
                    </div>
                    <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">التاريخ</label>
                        <p className="text-lg font-black text-slate-800" dir="ltr">{invDate}</p>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">الفستان / المنتج</label>
                        <p className="text-xl font-black text-slate-800">{dressName}</p>
                    </div>
                </div>

                {/* Status Section */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">الأمنية المستردة (التأمين)</label>
                        <p className="text-lg font-bold text-emerald-600">
                            {data.securityDeposit?.type}: {data.securityDeposit?.detail} {data.securityDeposit?.value ? `(${formatCurrency(data.securityDeposit.value)})` : ''}
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">حالة المتبقي المالي</label>
                        <p className={`text-lg font-bold ${data.remainingToPay > 0 ? 'text-red-500' : 'text-slate-700'}`}>
                            {data.remainingToPay > 0 ? `متبقي للدفع: ${formatCurrency(data.remainingToPay)}` : 'تمت التسوية المالية بالكامل'}
                        </p>
                    </div>
                    {data.damageFee > 0 && (
                        <div className="col-span-2 mt-2">
                            <span className="text-sm font-bold text-red-600 bg-red-100 px-4 py-1 rounded-full border border-red-200">خصم تلف: {formatCurrency(data.damageFee)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Terms - Updated Typography and Spacing */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex-1 flex flex-col">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">شروط الاستلام والإرجاع</h4>
                <ol className="list-decimal list-outside pr-4 space-y-2 overflow-hidden">
                    {RECEIPT_TERMS.map((term, i) => (
                        <li key={i} className="text-xs text-slate-700 font-bold leading-relaxed">{term}</li>
                    ))}
                </ol>
            </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 4. DEPOSIT MODE (DEFAULT) - RENT OR SALE
  const title = isTailoring ? "فاتورة بيع" : "فاتورة إيجار";
  const subTitle = isTailoring ? "SALE INVOICE" : "RENT INVOICE";
  const termsText = isTailoring ? SALE_TERMS : RENT_TERMS;

  return (
    <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
      <Header title={title} subtitle={`${subTitle} #${data.id ? data.id.slice(-6).toUpperCase() : '---'}`} />
      
      {/* Main Content Wrapper - Distributes Vertical Space */}
      <div className="flex-1 flex flex-col gap-8 min-h-0">
          
          {/* Customer Info Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">اسم العروس</label>
                  <p className="text-base font-black text-slate-800 border-b border-slate-100 pb-1">{brideFullName}</p>
              </div>
              <div className="text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">تاريخ الفاتورة</label>
                  <p className="text-base font-black text-slate-800 border-b border-slate-100 pb-1" dir="ltr">{invDate}</p>
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">رقم الهاتف</label>
                  <p className="text-base font-bold text-slate-700 tracking-wider" dir="ltr">{phone}</p>
              </div>
              <div className="text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{!isTailoring ? 'تاريخ المناسبة' : 'تاريخ التسليم'}</label>
                  <p className="text-base font-bold text-[#B59410]" dir="ltr">{evDate}</p>
              </div>
              {address && (
                  <div className="col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">العنوان</label>
                      <p className="text-sm font-bold text-slate-600">{address}</p>
                  </div>
              )}
          </div>

          {/* Dress Info */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-black text-slate-800">{dressName}</span>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {isTailoring ? 'تفصيل (Sale)' : 'إيجار (Rent)'}
                  </span>
              </div>
              {notes && <p className="text-xs font-bold text-slate-500 leading-relaxed whitespace-pre-wrap">{notes}</p>}
          </div>

          {/* Financial Grid - Compact Mode */}
          <div>
              <div className="grid grid-cols-4 gap-4 mb-2 text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">طريقة الدفع</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">الإجمالي</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المدفوع</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المتبقي</div>
              </div>
              <div className="grid grid-cols-4 gap-4 h-16">
                  <div className="bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-600 text-center px-2 border border-slate-200 leading-tight shadow-sm">
                      {payMethod || 'نقدي'}
                  </div>
                  <div className="bg-slate-800 rounded-xl flex items-center justify-center text-xl font-black text-white tracking-tight shadow-sm">
                      {total}
                  </div>
                  <div className="bg-emerald-50 rounded-xl flex items-center justify-center text-xl font-black text-emerald-600 tracking-tight border border-emerald-100 shadow-sm">
                      {deposit}
                  </div>
                  <div className="bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-xl font-black text-red-500 tracking-tight shadow-sm">
                      {remainder}
                  </div>
              </div>
          </div>

          {/* Terms & Conditions - Readable Mode */}
          <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-start mb-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">الشروط والأحكام (Terms & Conditions)</h4>
              <ol className="list-decimal list-outside pr-4 space-y-1.5 overflow-hidden">
                {termsText.map((term, i) => (
                    <li key={i} className="text-[11px] text-slate-600 font-bold leading-relaxed text-justify pl-2">
                        {term}
                    </li>
                ))}
              </ol>
          </div>
      </div>
      <Footer />
    </div>
  );
};

export default InvoiceClone;
