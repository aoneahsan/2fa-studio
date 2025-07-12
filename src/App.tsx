/**
 * Main App component
 * @module App
 */

import React, { useEffect, lazy, Suspense } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store';
import { useAuth } from './hooks/useAuth';
import { useBiometric } from './hooks/useBiometric';

// Components (loaded immediately)
import Layout from './components/common/Layout';
import PrivateRoute from './components/auth/PrivateRoute';
import LockScreen from './components/auth/LockScreen';
import LoadingScreen from './components/common/LoadingScreen';
import ToastContainer from './components/common/ToastContainer';
import InstallBanner from './components/common/InstallBanner';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const BackupPage = lazy(() => import('./pages/BackupPage'));


/**
 * App content component (wrapped with Redux)
 */
const AppContent: React.FC = () => {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { biometricEnabled } = useBiometric();

  // Apply theme
  useEffect(() => {
    const theme = store.getState().settings.theme;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          } />

          {/* Private routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/backup" element={<BackupPage />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>

      {/* Global components */}
      <LockScreen />
      <ToastContainer />
      <InstallBanner />
    </>
  );
};

/**
 * Main App component
 */
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;