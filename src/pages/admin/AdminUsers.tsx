/**
 * Admin Users Management Page
 * @module pages/admin/AdminUsers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { adminService, UserSearchParams } from '@services/admin.service';
import { User, SubscriptionTier, SubscriptionStatus } from '@src/types';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import LoadingSpinner from '@components/common/LoadingSpinner';
import UserDetailsModal from '@components/admin/UserDetailsModal';
import UpdateSubscriptionModal from '@components/admin/UpdateSubscriptionModal';
import { DocumentSnapshot } from 'firebase/firestore';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<SubscriptionTier | ''>('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | ''>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastLogin' | 'email'>('createdAt');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filterTier, filterStatus, sortBy]);

  const loadUsers = async (loadMore = false) => {
    try {
      setLoading(true);
      
      const params: UserSearchParams = {
        searchTerm: searchTerm || undefined,
        subscriptionTier: filterTier || undefined,
        subscriptionStatus: filterStatus || undefined,
        sortBy,
        pageSize: 20,
        lastDoc: loadMore ? (lastDoc || undefined) : undefined
      };

      const result = await adminService.searchUsers(params);
      
      if (loadMore) {
        setUsers(prev => [...prev, ...result.users]);
      } else {
        setUsers(result.users);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(() => {
    setLastDoc(null);
    loadUsers();
  }, [searchTerm]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleUpdateSubscription = (user: User) => {
    setSelectedUser(user);
    setShowUpdateModal(true);
  };

  const handleSubscriptionUpdated = () => {
    loadUsers();
    setShowUpdateModal(false);
  };

  const getTierBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'premium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'family':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'enterprise':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'expired':
      case 'cancelled':
      case 'past_due':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search, view, and manage user subscriptions
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Filters:</span>
              </div>
              
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value as SubscriptionTier | '')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="family">Family</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as SubscriptionStatus | '')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="createdAt">Created Date</option>
                <option value="lastLogin">Last Login</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      Subscription
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      Accounts
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      Last Login
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(users || []).map((user) => (
                    <tr 
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="h-8 w-8 rounded-full mr-3"
                            />
                          ) : (
                            <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.displayName || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor((user as any).subscription.tier)}`}>
                          {user.subscription.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {getStatusIcon((user as any).subscription.status)}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {user.subscription.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.accountCount || 0}
                          {user.subscription.accountLimit && ` / ${user.subscription.accountLimit}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateSubscription(user);
                          }}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="mt-4 text-center">
              <Button
                onClick={() => loadUsers(true)}
                variant="outline"
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedUser && (
        <>
          <UserDetailsModal
            user={selectedUser}
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            onUpdateSubscription={() => {
              setShowDetailsModal(false);
              setShowUpdateModal(true);
            }}
          />
          
          <UpdateSubscriptionModal
            user={selectedUser}
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            onSuccess={handleSubscriptionUpdated}
          />
        </>
      )}
    </div>
  );
};

export default AdminUsers;