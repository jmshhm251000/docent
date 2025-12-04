import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TDSMobileAITProvider>
        <App />
      </TDSMobileAITProvider>
    </BrowserRouter>
  </StrictMode>,
)
