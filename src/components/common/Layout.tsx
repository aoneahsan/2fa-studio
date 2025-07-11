/**
 * Main layout component
 * @module components/common/Layout
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { signOut } from '../../store/slices/authSlice';
import { useBiometric } from '../../hooks/useBiometric';
import { 
  HomeIcon, 
  KeyIcon, 
  CogIcon, 
  CloudArrowUpIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Main application layout with navigation
 */
const Layout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLocked } = useSelector((state: RootState) => state.ui);
  const { lockApp } = useBiometric();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { path: '/accounts', label: 'Accounts', icon: <KeyIcon className="w-5 h-5" /> },
    { path: '/backup', label: 'Backup', icon: <CloudArrowUpIcon className="w-5 h-5" /> },
    { path: '/settings', label: 'Settings', icon: <CogIcon className="w-5 h-5" /> },
  ];

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleLock = () => {
    lockApp();
    setIsMobileMenuOpen(false);
  };

  if (isLocked) {
    return null; // LockScreen component handles this
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-2xl font-bold text-primary">2FA Studio</h1>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`
                        }
                      >
                        {item.icon}
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
              
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-foreground">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="truncate">{user?.email}</p>
                  </div>
                </div>
                
                <div className="-mx-2 mt-2 space-y-1">
                  <button
                    onClick={handleLock}
                    className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <LockClosedIcon className="w-5 h-5" />
                    Lock App
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-background px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-foreground lg:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-foreground">
          2FA Studio
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary">2FA Studio</h2>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="mt-6">
              <ul className="-mx-3 space-y-1">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`
                      }
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 border-t border-border pt-6">
                <div className="flex items-center gap-x-4 px-3 py-3 text-sm font-semibold leading-6 text-foreground">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="truncate">{user?.email}</p>
                  </div>
                </div>
                
                <div className="-mx-3 mt-2 space-y-1">
                  <button
                    onClick={handleLock}
                    className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <LockClosedIcon className="w-5 h-5" />
                    Lock App
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;