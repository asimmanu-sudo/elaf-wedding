
// src/utils/helpers.ts
export const today = new Date().toISOString().split('T')[0];
export const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(val);
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// --- WHATSAPP LOGIC ---

export const DEFAULT_WA_TEMPLATES = {
  booking_confirm: `أهلاً عروستنا الجميلة {Name} 👰🏻‍♀️،\nتم تأكيد حجزك لفستان ({Dress}) ليوم ({EventDate}).\n\nمواعيد البروفات المبدئية:\n- الأولى: {Fitting1}\n- الثانية: {Fitting2}\n(المواعيد قابلة للتنسيق).\n\nتم استلام عربون: {Deposit}.\nمتحمسين نكون جزء من يومك المميز! ✨\n- أتيليه إيلاف`,
  pickup_ready: `يا أجمل عروسة {Name} 👑!\nفستانك ({Dress}) جاهز ومكوي وبيستناكي عشان تنوريه.\n\nمتبقي للدفع: {Remaining}.\nمنتظرينك في المعرض للاستلام. ألف مبروك مقدماً! 💍`,
  return_thanks: `نورتينا يا {Name}! 💖\nشكراً لتعاملك الراقي مع أتيليه إيلاف.\nنتمنى نكون كنا عند حسن ظنك، وألف مبروك مرة تانية وربنا يسعدك!`,
  payment_reminder: `مرحباً مدام {Name}،\nنتمنى أن تكوني بخير.\nتذكير بموعد البروفة القادم أو سداد دفعة مستحقة لفستان ({Dress}).\nيرجى التواصل معنا للتأكيد.\nشكراً لك!`
};

const WA_FOOTER = `\n\n--------\nتنبيه: هذه رسالة تلقائية تم إنشاؤها عبر نظام إيلاف للإدارة الإلكترونية، وليست رسالة شخصية.`;

export type WATemplateKey = 'BOOKING_CONFIRM' | 'PICKUP_READY' | 'RETURN_THANKS' | 'PAYMENT_REMINDER';

export const getWhatsAppLink = (phone: string, key: WATemplateKey, data: Record<string, any>, customTemplates?: any) => {
  let template = '';
  const temps = customTemplates || {};

  switch (key) {
    case 'BOOKING_CONFIRM':
      template = temps.booking_confirm || DEFAULT_WA_TEMPLATES.booking_confirm;
      break;
    case 'PICKUP_READY':
      template = temps.pickup_ready || DEFAULT_WA_TEMPLATES.pickup_ready;
      break;
    case 'RETURN_THANKS':
      template = temps.return_thanks || DEFAULT_WA_TEMPLATES.return_thanks;
      break;
    case 'PAYMENT_REMINDER':
      template = temps.payment_reminder || DEFAULT_WA_TEMPLATES.payment_reminder;
      break;
  }

  // Replace Variables
  let text = template
    .replace(/{Name}/g, (data.Name || '').split(' ')[0])
    .replace(/{Dress}/g, data.Dress || '')
    .replace(/{EventDate}/g, data.EventDate || '---')
    .replace(/{DeliveryDate}/g, data.DeliveryDate || '---')
    .replace(/{Fitting1}/g, data.Fitting1 || 'سيتم تحديدها لاحقاً')
    .replace(/{Fitting2}/g, data.Fitting2 || 'سيتم تحديدها لاحقاً')
    .replace(/{Deposit}/g, data.Deposit ? formatCurrency(data.Deposit) : '0')
    .replace(/{Remaining}/g, data.Remaining ? formatCurrency(data.Remaining) : '0');

  // Append Footer
  text += WA_FOOTER;

  const cleanPhone = (phone || '').replace(/\s+/g, '').replace(/-/g, '').replace('+', '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};
