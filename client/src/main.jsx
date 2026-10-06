import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from './lib/api.js';
import { router } from './App.jsx';
import { applyTheme } from './lib/theme.js';
import './index.css';

try { applyTheme(localStorage.getItem('de-theme') || 'system'); } catch { applyTheme('system'); }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
