import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@src/index.css'
import App from '@src/App.tsx'

// Register service worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered:', _registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                if (confirm('New version available! Update now?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('SW registration failed:', _error);
      });
  });
}

// Handle app install prompt
let deferredPrompt: unknown;

window.addEventListener('beforeinstallprompt', (_e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Update UI to notify the user they can add to home screen
  const installBanner = document.getElementById('install-banner');
  if (installBanner) {
    installBanner.style.display = 'block';
  }
});

// PWA app installed
window.addEventListener('appinstalled', () => {
  console.log('2FA Studio was installed');
  deferredPrompt = null;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
