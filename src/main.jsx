import 'leaflet/dist/leaflet.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import SosPage from './pages/SosPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/sos' ? (
      <SosPage />
    ) : path === '/admin' ? (
      <AdminPage />
    ) : (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    )}
  </StrictMode>,
);
