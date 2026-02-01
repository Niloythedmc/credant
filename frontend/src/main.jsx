import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'; // Initialize i18n
import App from './App.jsx'
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import { AuthProvider } from './auth/AuthProvider.jsx';

import { NotificationProvider } from './context/NotificationContext';

// Manifest URL must be absolute or relative to root
const manifestUrl = 'https://gift-phase-5c187.web.app/tonconnect-manifest.json';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </TonConnectUIProvider>
  </StrictMode>,
)
