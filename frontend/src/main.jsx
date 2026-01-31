import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import { AuthProvider } from './auth/AuthProvider.jsx';

// Manifest URL must be absolute or relative to root
const manifestUrl = 'https://gift-phase-5c187.web.app/tonconnect-manifest.json';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </TonConnectUIProvider>
  </StrictMode>,
)
