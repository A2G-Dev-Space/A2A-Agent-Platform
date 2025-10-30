import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import type { UserManagementInfo } from '../../services/adminService';
import { ShieldCheck, ShieldX, UserPlus } from 'lucide-react';

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminService.getAllUsers().then(res => res.data),
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

  const handleApprove = (userId: number) => {
    approveMutation.mutate(userId);
  };

  const handleReject = (userId: number) => {
    rejectMutation.mutate(userId);
  };

  const getStatusChip = (user: UserManagementInfo) => {
    if (user.role === 'PENDING') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('settings.userManagement.statusPending')}</span>;
    }
    // For now, consider all non-pending users as Active.
    // The 'is_active' property is not available on the User type from the API.
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{t('settings.userManagement.statusActive')}</span>;
  };
  
  const getRoleChip = (role: 'ADMIN' | 'USER' | 'PENDING') => {
      switch (role) {
          case 'ADMIN':
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-purple-800 dark:bg-primary/30 dark:text-primary">{t('roles.admin')}</span>;
          case 'USER':
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">{t('roles.user')}</span>;
          case 'PENDING':
              return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('roles.pending')}</span>;
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
        <div className="flex justify-end items-center mb-4">
            <button className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary/80 dark:bg-primary/90 text-white text-sm font-bold hover:bg-primary dark:hover:bg-primary">
                <UserPlus className="w-4 h-4 mr-2" />
                {t('settings.userManagement.inviteUser')}
            </button>
        </div>
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
                        {users?.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                                <td className="px-4 py-3"><input type="checkbox" className="h-5 w-5 rounded border-gray-400 dark:border-[#483956] bg-transparent text-primary" /></td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username_kr} ({user.username})</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.department_kr}</td>
                                <td className="px-4 py-3">
                                    {getRoleChip(user.role)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{getStatusChip(user)}</td>
                                <td className="px-4 py-3 text-sm font-medium">
                                    {user.role === 'PENDING' && (
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
                                                disabled={rejectMutation.isPending}
                                                className="flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ShieldX className="w-3.5 h-3.5 mr-1" />
                                                {t('actions.reject')}
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default UserManagementPage;