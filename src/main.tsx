import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any existing service workers. Some online IDEs
// inject their own service worker which can break routing.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(regs => Promise.all(regs.map(r => r.unregister())).catch(err => {
      console.warn('Service worker unregister failed:', err);
    }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
