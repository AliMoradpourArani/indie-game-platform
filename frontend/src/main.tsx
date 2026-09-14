import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '../src/i18n/config';
import { AuthProvider } from './app/auth';
import { router } from './app/router';
import { ErrorModalProvider } from './design/ui';
import './design/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorModalProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorModalProvider>
  </React.StrictMode>,
);
