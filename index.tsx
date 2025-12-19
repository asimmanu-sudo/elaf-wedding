
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Elaf Wedding App: Initializing...");

const rootElement = document.getElementById('root');
if (!rootElement) {
    console.error("Critical: Root element not found!");
} else {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Elaf Wedding App: Rendered successfully.");
}
