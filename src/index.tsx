
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// هذا الملف هو نقطة الانطلاق للتطبيق
// يقوم باستدعاء المكون الرئيسي App الذي يحتوي على كافة التفاصيل (الإيجار، البيع، المالية، إلخ)
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
