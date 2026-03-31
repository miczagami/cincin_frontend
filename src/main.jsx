import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './i18n';
import AppRouter from './AppRouter';
import useAuthStore from './context/authStore';

// Bootstrap auth session on app load
useAuthStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
