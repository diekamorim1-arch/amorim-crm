import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { CrmProvider } from './lib/store.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import { Toaster } from './components/ui/sonner.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CrmProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </CrmProvider>
    </ThemeProvider>
  </StrictMode>,
)
