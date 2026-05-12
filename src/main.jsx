import 'leaflet/dist/leaflet.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SosPage from './pages/SosPage.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

const isSosRoute = window.location.pathname === '/sos';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSosRoute ? (
      <SosPage />
    ) : (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    )}
  </StrictMode>,
)
