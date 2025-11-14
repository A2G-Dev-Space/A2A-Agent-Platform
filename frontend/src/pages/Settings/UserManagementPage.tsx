import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, ShieldX, UserMinus } from 'lucide-react';
import { UserRole, type User } from '@/types';

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await adminService.getAllUsers();
        // axios interceptor already returns response.data, so res IS the data array
        return res ?? [];
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: adminService.approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: adminService.rejectUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: adminService.removeUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'PENDING' | 'USER' | 'ADMIN' }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleApprove = (userId: number) => {
    approveMutation.mutate(userId);
  };

  const handleReject = (userId: number) => {
    rejectMutation.mutate(userId);
  };

  const handleRemove = (userId: number) => {
    if (confirm(t('settings.userManagement.confirmRemove'))) {
      removeMutation.mutate(userId);
    }
  };

  const handleRoleChange = (userId: number, newRole: 'USER' | 'ADMIN') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const isCurrentUser = (user: User) => {
    // Compare by email since currentUser may not have id
    return currentUser?.email === user.email;
  };

  const getStatusChip = (_user: User) => {
    // User type doesn't have status field, so we'll use a default
    const status = 'Active';
    if (status === 'Active') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{status}</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300">{status}</span>;
  };
  
  const getRoleChip = (role: UserRole) => {
      switch (role) {
          case UserRole.ADMIN:
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-purple-800 dark:bg-primary/30 dark:text-primary">{t('roles.admin')}</span>;
          case UserRole.USER:
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">{t('roles.user')}</span>;
          case UserRole.PENDING:
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('roles.pending')}</span>;
          case UserRole.NEW:
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300">{t('roles.new')}</span>;
      }
  }

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (isError) {
    return <div>Error fetching users: {error.message}</div>;
  }

  return (
    <div>
        <div className="mt-4 @container">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#483956] bg-white dark:bg-[#211b28]/50">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-[#211b28]">
                        <tr>
                            <th className="w-12 px-4 py-3 text-left"><input type="checkbox" className="h-5 w-5 rounded border-gray-400 dark:border-[#483956] bg-transparent text-primary" /></th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('settings.userManagement.user')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('settings.userManagement.department')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('settings.userManagement.role')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('settings.userManagement.status')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('settings.userManagement.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#483956]">
                        {users?.map(user => {
                            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                            let bgStyle: React.CSSProperties = {};

                            if (user.role === 'PENDING') {
                                // Yellow background for PENDING users
                                bgStyle = {
                                    backgroundColor: isDarkMode ? 'rgba(202, 138, 4, 0.15)' : 'rgba(254, 252, 232, 1)'
                                };
                            } else if (user.role === 'ADMIN') {
                                // Pastel red background for ADMIN users
                                bgStyle = {
                                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)'
                                };
                            }

                            return (
                                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5" style={bgStyle}>
                                    <td className="px-4 py-3"><input type="checkbox" className="h-5 w-5 rounded border-gray-400 dark:border-[#483956] bg-transparent text-primary" /></td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username_kr || user.username}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.department_kr || user.department_en}</td>
                                    <td className="px-4 py-3">
                                        {getRoleChip(user.role)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{getStatusChip(user)}</td>
                                    <td className="px-4 py-3 text-sm font-medium">
                                        {user.role === UserRole.PENDING ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleApprove(user.id)}
                                                    disabled={approveMutation.isPending}
                                                    className="flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                                    {t('actions.approve')}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.id)}
                                                    disabled={rejectMutation.isPending || isCurrentUser(user)}
                                                    className="flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ShieldX className="w-3.5 h-3.5 mr-1" />
                                                    {t('actions.reject')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'USER' | 'ADMIN')}
                                                    disabled={updateRoleMutation.isPending || isCurrentUser(user)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-[#483956] bg-white dark:bg-[#211b28] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#2a1f35] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="USER">{t('roles.user')}</option>
                                                    <option value="ADMIN">{t('roles.admin')}</option>
                                                </select>
                                                <button
                                                    onClick={() => handleRemove(user.id)}
                                                    disabled={removeMutation.isPending || isCurrentUser(user)}
                                                    className="flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={isCurrentUser(user) ? t('settings.userManagement.cannotRemoveSelf') : t('settings.userManagement.removeUser')}
                                                >
                                                    <UserMinus className="w-3.5 h-3.5 mr-1" />
                                                    {t('settings.userManagement.remove')}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default UserManagementPage;