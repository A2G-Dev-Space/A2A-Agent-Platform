import { useState, useEffect } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { useApiKeyStore } from '@/store/useApiKeyStore';
import { formatDate } from '@/utils/helpers';
import { APIKey } from '@/types';

export default function ApiKeysSettings() {
  const { apiKeys, activeApiKey, fetchApiKeys, createApiKey, deleteApiKey } = useApiKeyStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      await fetchApiKeys();
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const handleCreateApiKey = async () => {
    try {
      setIsLoading(true);
      const createdKey = await createApiKey();
      setNewKey(createdKey.key);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('API Key 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!window.confirm('이 API Key를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await deleteApiKey(keyId);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('API Key 삭제에 실패했습니다.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewKey(null);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">API Keys</h1>

      <div className="mb-6">
        <Button onClick={() => setIsCreateModalOpen(true)} variant="primary">
          + 새 API Key 생성
        </Button>
        {activeApiKey && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            활성 키: {activeApiKey.key.slice(0, 20)}...
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Key
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                생성일
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                마지막 사용
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {apiKeys.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  생성된 API Key가 없습니다
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr
                  key={key.key_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {key.key.slice(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="복사"
                      >
                        {copiedKey === key.key ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(key.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {key.last_used_at ? formatDate(key.last_used_at) : '사용 안 됨'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDeleteApiKey(key.key_id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create API Key Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} title="새 API Key 생성">
        {!newKey ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              새로운 API Key를 생성하시겠습니까? 생성된 키는 한 번만 표시되며, 이후에는 확인할 수
              없습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeCreateModal}>
                취소
              </Button>
              <Button variant="primary" onClick={handleCreateApiKey} loading={isLoading}>
                생성
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                중요: 이 키를 안전한 곳에 보관하세요
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                생성된 API Key는 이 화면에서만 확인할 수 있습니다. 나중에 다시 확인할 수 없으니
                반드시 복사해두세요.
              </p>
            </div>
            <div className="relative">
              <code className="block w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono break-all text-gray-900 dark:text-gray-100">
                {newKey}
              </code>
              <button
                onClick={() => copyToClipboard(newKey)}
                className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded border border-gray-300 dark:border-gray-600"
              >
                {copiedKey === newKey ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={closeCreateModal}>
                확인
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
