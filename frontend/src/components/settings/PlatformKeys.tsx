import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Key, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface PlatformKey {
  id: number;
  key: string;
  name: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

export default function PlatformKeys() {
  const { accessToken, user } = useAuthStore();
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch('http://localhost:9050/api/v1/users/me/platform-keys/', {
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

  const handleGenerateKey = async () => {
    try {
      const response = await fetch('http://localhost:9050/api/v1/users/me/platform-keys/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: keyName || 'Unnamed Key' }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.key);
        await fetchKeys();
      }
    } catch (error) {
      console.error('Failed to generate platform key:', error);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) return;

    try {
      const response = await fetch(`http://localhost:9050/api/v1/users/me/platform-keys/${id}/`, {
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

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyEndpoint = (path: string) => {
    const endpoint = `http://localhost:9050${path}`;
    navigator.clipboard.writeText(endpoint);
    setCopiedKey(endpoint);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Platform API Keys
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Generate and manage API keys to access the platform's LLM proxy endpoints
        </p>
      </div>

      {/* Platform Endpoints */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
          Platform LLM Proxy Endpoints
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                General LLM Endpoint:
              </span>
              <code className="ml-2 text-xs font-mono text-blue-900 dark:text-blue-200">
                http://localhost:9050/api/llm/chat
              </code>
            </div>
            <button
              onClick={() => handleCopyEndpoint('/api/llm/chat')}
              className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800/50 rounded"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Agent-specific Endpoint:
              </span>
              <code className="ml-2 text-xs font-mono text-blue-900 dark:text-blue-200">
                http://localhost:9050/api/llm/agent/{'{agent_id}'}/chat
              </code>
            </div>
            <button
              onClick={() => handleCopyEndpoint('/api/llm/agent/{agent_id}/chat')}
              className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800/50 rounded"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-700 dark:text-blue-400">
          Use your platform key as Bearer token in the Authorization header
        </div>
      </div>

      {/* Key List */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Your API Keys
        </h4>
        <button
          onClick={() => {
            setShowAddModal(true);
            setKeyName('');
            setGeneratedKey(null);
          }}
          className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Generate Key
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Last Used
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {keys.map((key) => (
              <tr key={key.id}>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {key.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      a2g_{key.key.substring(0, 8)}...{key.key.slice(-4)}
                    </code>
                    <button
                      onClick={() => handleCopyKey(`a2g_${key.key}`)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {copiedKey === `a2g_${key.key}` && (
                      <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(key.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {keys.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No API keys yet. Generate your first key to get started.
          </div>
        )}
      </div>

      {/* Generate Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !generatedKey && setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {generatedKey ? 'Your New API Key' : 'Generate API Key'}
            </h3>

            {!generatedKey ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Name (optional)
                  </label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Development Key"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateKey}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    Generate
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                    ⚠️ Save this key now. You won't be able to see it again!
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white break-all">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => handleCopyKey(generatedKey)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  {copiedKey === generatedKey && (
                    <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </div>

                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}