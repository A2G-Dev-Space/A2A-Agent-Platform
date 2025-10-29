import React from 'react';
import { useTranslation } from 'react-i18next';

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();

  // Dummy data for now
  const users = [
    { id: 1, name: 'Olivia Rhye', email: 'olivia@a2g.com', department: 'Engineering', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Phoenix Baker', email: 'phoenix@a2g.com', department: 'Product', role: 'Standard', status: 'Active' },
    { id: 3, name: 'Lana Steiner', email: 'lana@a2g.com', department: 'Design', role: 'Pending', status: 'Invited' },
    { id: 4, name: 'Drew Cano', email: 'drew@a2g.com', department: 'Marketing', role: 'Standard', status: 'Active' },
  ];

  return (
    <div>
        <div className="flex justify-end items-center mb-4">
            <button className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary/80 dark:bg-primary/90 text-white text-sm font-bold hover:bg-primary dark:hover:bg-primary">
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
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                                <td className="px-4 py-3"><input type="checkbox" className="h-5 w-5 rounded border-gray-400 dark:border-[#483956] bg-transparent text-primary" /></td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.department}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'Admin' ? 'bg-primary/20 text-purple-800 dark:bg-primary/30 dark:text-primary' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>{user.role}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.status}</td>
                                <td className="px-4 py-3 text-sm font-medium">
                                    {user.status === 'Invited' && (
                                        <div className="flex items-center gap-2">
                                            <button className="flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20">Approve</button>
                                            <button className="flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20">Reject</button>
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