import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initializeAuth } from '@/store/authStore';
import './index.css';

// Initialize auth on app load - this checks for existing Supabase session
initializeAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
