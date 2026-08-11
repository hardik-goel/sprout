import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside the router on purpose: a crash while resolving a route must
        still land somewhere with a button on it. */}
    <ErrorBoundary>
      {/* Opt in to the v7 behaviours now: they're what we already assume, and
          without the flags every page load prints two upgrade warnings that bury
          the console messages we actually care about. */}
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
