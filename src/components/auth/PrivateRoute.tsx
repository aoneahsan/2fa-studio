/**
 * Private route component for authentication
 * @module components/auth/PrivateRoute
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';

/**
 * Component that protects routes requiring authentication
 */
const PrivateRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return null; // LoadingScreen is shown at App level
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;