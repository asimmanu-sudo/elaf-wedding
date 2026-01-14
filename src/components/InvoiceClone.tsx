import React from 'react';
import { Phone, Shirt, CheckCircle } from 'lucide-react'; // تأكد من استيراد الأيقونات
import { formatCurrency, today } from '../utils/helpers';
import { MEASUREMENT_FIELDS } from '../utils/constants';

const InvoiceClone = ({ data, mode = 'DEPOSIT' }: { data: any, mode?: 'DEPOSIT' | 'RECEIPT' | 'SIZES' | 'SCHEDULE' }) => {
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

  // --- Sub-Components ---

  const Header = ({ title, subtitle }: { title?: string, subtitle?: string }) => (
    <div className="flex justify-between items-start mb-8 shrink-0 border-b-2 border-slate-100 pb-6">
      <div className="flex flex-col justify-center">
        <img src="/Logo.png" alt="Logo" className="w-36 object-contain mb-2" />
        <p className="text-[10px] font-black text-[#B59410] tracking-[0.2em] uppercase">ELAF WEDDING DRESSES</p>
      </div>
      <div className="text-left">
        {title && <h1 className="text-4xl font-black text-[#B59410] uppercase tracking-tight">{title}</h1>}
        {subtitle && <p className="text-lg text-slate-400 font-bold tracking-widest uppercase mt-1 dir-ltr">{subtitle}</p>}
      </div>
    </div>
  );

  const Footer = () => (
    <div className="mt-auto pt-6 shrink-0 border-t-2 border-slate-100">
      <div className="flex justify-between items-end">
        <div className="space-y-2 text-right">
           <div className="flex items-center gap-3 text-slate-600 justify-end">
             <span className="text-sm font-bold tracking-wider" dir="ltr">+20 10 05830864</span>
             <Phone size={16} className="text-[#B59410]" />
           </div>
           <div className="flex items-center gap-3 text-slate-600 justify-end">
             <span className="text-sm font-bold">Elaf Wedding Dresses</span>
             <span className="w-4 h-4 flex items-center justify-center bg-[#B59410] text-white rounded-full text-[10px] font-bold">f</span>
           </div>
        </div>
        <div className="text-center">
           <div className="w-48 border-b border-dashed border-slate-300 mb-2"></div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">توقيع الموظف</p>
        </div>
        <div className="text-left">
           <img src="/qrcode.png" alt="QR" className="w-16 h-16 border border-slate-200 rounded-lg p-1 opacity-80" />
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

  // --- MODES ---

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
        
        <div className="flex-1 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">اسم العروس</label>
                    <p className="text-xl font-black text-slate-800">{brideFullName}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">كود / اسم الفستان</label>
                    <p className="text-xl font-black text-[#B59410]">{data.factoryCode || data.dressName || '---'}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">وحدة القياس</label>
                    <p className="text-lg font-bold text-slate-600">{m.unit === 'cm' ? 'سنتيمتر (CM)' : 'إنش (IN)'}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">تاريخ القياس</label>
                    <p className="text-lg font-bold text-slate-600" dir="ltr">{invDate}</p>
                </div>
            </div>

            <table className="w-full border-collapse border border-slate-200 text-right">
                <thead>
                <tr className="bg-slate-100 text-[#B59410]">
                    <th className="border border-slate-200 p-2 font-black text-xs w-[35%]">منطقة القياس</th>
                    <th className="border border-slate-200 p-2 text-center font-black text-xs w-[15%]">القيمة</th>
                    <th className="border border-slate-200 p-2 font-black text-xs w-[35%]">منطقة القياس</th>
                    <th className="border border-slate-200 p-2 text-center font-black text-xs w-[15%]">القيمة</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 p-2 font-bold text-slate-600 text-sm">{row.left.label}</td>
                    <td className="border border-slate-200 p-2 text-center font-black text-base text-slate-800 dir-ltr">{m[row.left.id] || '-'}</td>
                    <td className="border border-slate-200 p-2 font-bold text-slate-600 text-sm">{row.right ? row.right.label : ''}</td>
                    <td className="border border-slate-200 p-2 text-center font-black text-base text-slate-800 dir-ltr">{row.right ? (m[row.right.id] || '-') : ''}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            <div className="grid grid-cols-3 gap-4">
                {descriptiveFields.map(fieldId => {
                    const field = MEASUREMENT_FIELDS.find(f => f.id === fieldId);
                    return (
                        <div key={fieldId} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{field?.label}</label>
                            <p className="text-base font-bold text-slate-800">{m[fieldId] || '---'}</p>
                        </div>
                    );
                })}
            </div>

            {m.orderNotes && (
                <div className="p-4 border border-amber-100 rounded-xl bg-amber-50 flex-1">
                    <h4 className="font-black mb-2 text-amber-600 text-xs uppercase tracking-wider">ملاحظات الخياطة</h4>
                    <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed text-slate-700">{m.orderNotes}</p>
                </div>
            )}
        </div>
        <Footer />
      </div>
    );
  }

  if (mode === 'RECEIPT') {
    return (
      <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
        <Header title="سند استلام / إرجاع" subtitle="RECEIPT VOUCHER" />
        <div className="flex-1 flex flex-col gap-8">
            <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">استلمنا من السيدة</label>
                    <p className="text-2xl font-black text-slate-800">{brideFullName}</p>
                </div>
                <div className="text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">التاريخ</label>
                    <p className="text-xl font-black text-slate-800" dir="ltr">{invDate}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">الفستان / المنتج</label>
                    <p className="text-xl font-black text-slate-800 border-b border-slate-200 pb-2">{dressName}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">رقم الهاتف</label>
                    <p className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2" dir="ltr">{phone}</p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">الأمنية المستردة (التأمين)</label>
                    <p className="text-xl font-bold text-emerald-600 border-b border-slate-200 pb-2">
                        {data.securityDeposit?.type}: {data.securityDeposit?.detail} {data.securityDeposit?.value ? `(${formatCurrency(data.securityDeposit.value)})` : ''}
                    </p>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">حالة المتبقي المالي</label>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                       <p className="text-xl font-bold text-red-500">
                           {data.remainingToPay > 0 ? `متبقي للدفع: ${formatCurrency(data.remainingToPay)}` : 'تمت التسوية المالية بالكامل'}
                       </p>
                       {data.damageFee > 0 && <span className="text-sm font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">خصم تلف: {formatCurrency(data.damageFee)}</span>}
                    </div>
                </div>
                {data.extras && (
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">الملاحظات / الإضافات</label>
                        <p className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{data.extras}</p>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 mt-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">إقرار الاستلام</h4>
                <ul className="text-xs text-slate-600 font-bold space-y-3 leading-loose list-disc pr-4">
                    <li>تقر العروس باستلام الأمنية (التأمين) بحالتها الأصلية.</li>
                    <li>تم فحص الفستان والتأكد من حالته عند الاستلام.</li>
                    <li>في حال وجود تلفيات، تم الاتفاق على قيمة الخصم الموضح أعلاه.</li>
                    <li>براء ذمة الطرفين من أي التزامات مالية أو عينية بعد توقيع هذا السند.</li>
                </ul>
            </div>
        </div>
        <Footer />
      </div>
    );
  }

  // DEFAULT: DEPOSIT / SALE INVOICE
  const title = isTailoring ? "فاتورة بيع" : "فاتورة إيجار";
  const subTitle = isTailoring ? "SALE INVOICE" : "RENT INVOICE";

  return (
    <div id="printable-invoice-container" className="print-invoice" style={containerStyle} dir="rtl">
      <Header title={title} subtitle={`${subTitle} #${data.id ? data.id.slice(-6).toUpperCase() : '---'}`} />
      
      <div className="flex-1 flex flex-col justify-start gap-6">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">اسم العروس</label>
                  <p className="text-xl font-black text-slate-800 border-b border-slate-200 pb-1">{brideFullName}</p>
              </div>
              <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">تاريخ الفاتورة</label>
                  <p className="text-xl font-black text-slate-800 border-b border-slate-200 pb-1" dir="ltr">{invDate}</p>
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">رقم الهاتف</label>
                  <p className="text-xl font-bold text-slate-700 tracking-wider" dir="ltr">{phone}</p>
              </div>
              <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{!isTailoring ? 'تاريخ المناسبة' : 'تاريخ التسليم'}</label>
                  <p className="text-xl font-bold text-[#B59410]" dir="ltr">{evDate}</p>
              </div>
              {address && (
                  <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">العنوان</label>
                      <p className="text-base font-bold text-slate-600">{address}</p>
                  </div>
              )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shirt size={14}/> تفاصيل الفستان
              </h3>
              <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl font-black text-slate-800">{dressName}</span>
                  <span className="px-4 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wider text-slate-500">
                      {isTailoring ? 'تفصيل (Sale)' : 'إيجار (Rent)'}
                  </span>
              </div>
              <p className="text-sm font-bold text-slate-500 leading-relaxed whitespace-pre-wrap mt-2">
                  {notes || 'لا توجد ملاحظات إضافية.'}
              </p>
          </div>

          <div>
              <div className="grid grid-cols-4 gap-4 mb-2 text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">طريقة الدفع</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الإجمالي</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المدفوع (العربون)</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المتبقي</div>
              </div>
              <div className="grid grid-cols-4 gap-4 h-24">
                  <div className="bg-slate-100 rounded-2xl flex items-center justify-center text-sm font-black text-slate-600 text-center px-2 border border-slate-200">
                      {payMethod || 'نقدي'}
                  </div>
                  <div className="bg-slate-800 rounded-2xl flex items-center justify-center text-2xl font-black text-white tracking-tight shadow-lg">
                      {total}
                  </div>
                  <div className="bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl font-black text-emerald-600 tracking-tight border border-emerald-100">
                      {deposit}
                  </div>
                  <div className="bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center text-2xl font-black text-red-500 tracking-tight">
                      {remainder}
                  </div>
              </div>
          </div>

          <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">الشروط والأحكام</h4>
              <ul className="text-xs text-slate-600 font-bold space-y-3 leading-loose list-disc pr-4 flex-1">
                {isTailoring ? (
                  <>
                    <li>يتم تصميم الفستان حسب المقاسات والطلب المتفق عليه بدقة.</li>
                    <li>العربون المدفوع غير قابل للاسترداد، ويخصم من إجمالي قيمة الفاتورة.</li>
                    <li>أي تعديلات جوهرية بعد بدء التنفيذ قد تترتب عليها تكلفة إضافية.</li>
                    <li>في حال إلغاء الطلب بعد شراء الخامات، يتحمل العميل كافة التكاليف.</li>
                    <li>يلزم سداد كامل المبلغ المتبقي عند الاستلام النهائي للفستان.</li>
                  </>
                ) : (
                  <>
                    <li>العربون المدفوع هو تأكيد للحجز وغير قابل للاسترداد في حال الإلغاء.</li>
                    <li>يجب الالتزام بموعد إرجاع الفستان؛ وأي تأخير يترتب عليه غرامة يومية.</li>
                    <li>تتحمل العروس تكلفة إصلاح أي تلفيات تحدث للفستان أثناء فترة الإيجار.</li>
                    <li>الأمنية (التأمين) تسترد بعد التأكد من سلامة الفستان عند الإرجاع.</li>
                    <li>في حال تغيير الموعد، يجب إبلاغ الإدارة قبل المناسبة بـ 14 يومًا على الأقل.</li>
                  </>
                )}
              </ul>
          </div>
      </div>
      <Footer />
    </div>
  );
};

export default InvoiceClone;