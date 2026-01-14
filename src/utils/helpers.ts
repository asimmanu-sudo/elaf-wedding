// src/utils/helpers.ts
export const today = new Date().toISOString().split('T')[0];
export const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(val);
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);