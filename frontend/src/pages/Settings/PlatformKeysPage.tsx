import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { copyToClipboard } from '@/utils/clipboard';

interface PlatformKey {
  id: number;
  key: string;
  name: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

const PlatformKeysPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchKeys = async () => {
    try {
      const HOST_IP = import.meta.env.VITE_HOST_IP || 'localhost';
      const GATEWAY_PORT = import.meta.env.VITE_GATEWAY_PORT || '9050';
      const response = await fetch(`http://${HOST_IP}:${GATEWAY_PORT}/api/v1/users/me/platform-keys/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch platform keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const HOST_IP = import.meta.env.VITE_HOST_IP || 'localhost';
      const GATEWAY_PORT = import.meta.env.VITE_GATEWAY_PORT || '9050';
      const response = await fetch(`http://${HOST_IP}:${GATEWAY_PORT}/api/v1/users/me/platform-keys/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.key);
        setNewKeyName('');
        await fetchKeys();
      }
    } catch (error) {
      console.error('Failed to create platform key:', error);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Are you sure you want to delete this key?')) return;

    try {
      const HOST_IP = import.meta.env.VITE_HOST_IP || 'localhost';
      const GATEWAY_PORT = import.meta.env.VITE_GATEWAY_PORT || '9050';
      const response = await fetch(`http://${HOST_IP}:${GATEWAY_PORT}/api/v1/users/me/platform-keys/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        await fetchKeys();
      }
    } catch (error) {
      console.error('Failed to delete platform key:', error);
    }
  };

  const handleCopyKey = async (text: string, id: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCreatedKey('');
    setNewKeyName('');
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 pt-4">
        <div className="flex min-w-72 flex-col gap-1">
          <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Platform API Keys</p>
          <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Manage your platform API keys for agent authentication</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]"
        >
          <Plus className="text-lg" />
          <span className="truncate">Generate New Key</span>
        </button>
      </div>


      {/* Keys Table */}
      <div className="mt-6">
        {keys.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No API keys yet. Generate your first key to get started.
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-white/20 bg-background-light dark:bg-background-dark">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[25%] text-sm font-medium leading-normal">Name</th>
                  <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[35%] text-sm font-medium leading-normal">Key (Partial)</th>
                  <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[20%] text-sm font-medium leading-normal">Created</th>
                  <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[10%] text-sm font-medium leading-normal">Last Used</th>
                  <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[10%] text-sm font-medium leading-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(key => (
                  <tr key={key.id} className="border-t border-t-slate-200 dark:border-t-white/20">
                    <td className="h-[72px] px-4 py-2 text-slate-900 dark:text-white text-sm font-normal leading-normal">{key.name}</td>
                    <td className="h-[72px] px-4 py-2">
                      <div className="flex items-center gap-2">
                        <code className="text-slate-600 dark:text-slate-400 text-xs font-mono">a2g_{key.key}</code>
                        <button
                          onClick={() => handleCopyKey(`a2g_${key.key}`, key.id)}
                          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {copiedId === key.id ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="h-[72px] px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="h-[72px] px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal">
                      {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="h-[72px] px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-background-dark shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xl font-bold text-gray-900 dark:text-white">Generate Platform API Key</p>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {createdKey ? (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your new API key has been generated. Copy it now, as it won't be shown again:</p>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all">{createdKey}</code>
                  </div>
                  <button
                    onClick={() => handleCopyKey(createdKey, 999)}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    {copiedId === 999 ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="flex flex-col w-full">
                    <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">Key Name *</p>
                    <input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal"
                      placeholder="Enter a descriptive name for this key"
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="flex flex-row-reverse gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              {createdKey ? (
                <button
                  onClick={closeModal}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90"
                >
                  <span className="truncate">Done</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim()}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="truncate">Generate</span>
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-base font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <span className="truncate">Cancel</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformKeysPage;