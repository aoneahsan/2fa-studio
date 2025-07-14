/**
 * Admin Route Protection Component
 * @module components/admin/AdminRoute
 */

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@store/hooks';
import { adminService } from '@services/admin.service';
import LoadingScreen from '@components/common/LoadingScreen';

interface AdminRouteProps {
  requireSuperAdmin?: boolean;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ requireSuperAdmin = false }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated && user) {
        const adminStatus = await adminService.isAdmin();
        setIsAdmin(adminStatus);

        if (requireSuperAdmin) {
          const superAdminStatus = await adminService.isSuperAdmin();
          setIsSuperAdmin(superAdminStatus);
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user, requireSuperAdmin]);

  // Still checking admin status
  if (isAdmin === null || (requireSuperAdmin && isSuperAdmin === null)) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Requires super admin but user is not
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;