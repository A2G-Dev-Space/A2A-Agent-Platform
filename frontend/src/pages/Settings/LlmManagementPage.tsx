import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import AddLlmModelModal from './AddLlmModelModal';
import { useAuthStore } from '@/stores/authStore';
import { getGatewayBaseUrl } from '@/config/api';

interface LLMModel {
  id: number;
  name: string;
  provider: string;
  endpoint: string;
  api_key?: string;
  is_active: boolean;
  health_status: string;
  last_health_check: string | null;
  created_at: string;
}

const LlmManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingModel, setTestingModel] = useState<number | null>(null);
  const { accessToken } = useAuthStore();

  const fetchModels = async () => {
    try {
      const response = await fetch(`${getGatewayBaseUrl()}/api/admin/llm-models/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch LLM models:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDeleteModel = async (id: number) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      const response = await fetch(`${getGatewayBaseUrl()}/api/admin/llm-models/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        await fetchModels();
      }
    } catch (error) {
      console.error('Failed to delete LLM model:', error);
    }
  };

  const handleTestModel = async (id: number) => {
    setTestingModel(id);
    try {
      const response = await fetch(`${getGatewayBaseUrl()}/api/admin/llm-models/${id}/health-check/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        await fetchModels();
      }
    } catch (error) {
      console.error('Failed to test LLM model:', error);
    } finally {
      setTestingModel(null);
    }
  };

  const toggleModelActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`${getGatewayBaseUrl()}/api/admin/llm-models/${id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        await fetchModels();
      }
    } catch (error) {
      console.error('Failed to toggle model status:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchModels(); // Refresh list after adding
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 pt-4">
        <div className="flex min-w-72 flex-col gap-1">
            <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">{t('settings.llmManagement.title')}</p>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">{t('settings.llmManagement.subtitle')}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
            <Plus className="text-lg" />
            <span className="truncate">{t('settings.llmManagement.addNewModel')}</span>
        </button>
      </div>
      <div className="mt-6 @container">
        {models.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No LLM models configured. Add your first model to get started.
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-white/20 bg-background-light dark:bg-background-dark">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-white/5">
                      <tr>
                          <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[20%] text-sm font-medium leading-normal">{t('settings.llmManagement.modelName')}</th>
                          <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[15%] text-sm font-medium leading-normal">Provider</th>
                          <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[25%] text-sm font-medium leading-normal">{t('settings.llmManagement.endpoint')}</th>
                          <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[15%] text-sm font-medium leading-normal">{t('settings.llmManagement.healthStatus')}</th>
                          <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[10%] text-sm font-medium leading-normal text-center">{t('settings.llmManagement.active')}</th>
                          <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[15%] text-sm font-medium leading-normal text-right">{t('settings.llmManagement.actions')}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {models.map(model => (
                          <tr key={model.id} className="border-t border-t-slate-200 dark:border-t-white/20">
                              <td className="h-[72px] px-4 py-2 text-slate-900 dark:text-white text-sm font-normal leading-normal">{model.name}</td>
                              <td className="h-[72px] px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal capitalize">{model.provider}</td>
                              <td className="h-[72px] px-4 py-2 text-slate-500 dark:text-slate-400 text-xs font-mono">{model.endpoint}</td>
                              <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                                  <div className="flex items-center gap-2">
                                      <span className={`h-2.5 w-2.5 rounded-full ${
                                        model.health_status === 'HEALTHY' ? 'bg-green-500' :
                                        model.health_status === 'UNHEALTHY' ? 'bg-red-500' :
                                        'bg-slate-400'
                                      }`}></span>
                                      <span className={`${
                                        model.health_status === 'HEALTHY' ? 'text-green-700 dark:text-green-400' :
                                        model.health_status === 'UNHEALTHY' ? 'text-red-700 dark:text-red-400' :
                                        'text-slate-600 dark:text-slate-400'
                                      }`}>{model.health_status}</span>
                                  </div>
                              </td>
                              <td className="h-[72px] px-4 py-2 text-center text-sm font-normal leading-normal">
                                  <label className="relative inline-flex items-center cursor-pointer group">
                                      <input
                                        type="checkbox"
                                        checked={model.is_active}
                                        onChange={() => toggleModelActive(model.id, model.is_active)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-slate-100 after:border-slate-400 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary group-hover:border-slate-400 dark:group-hover:border-slate-500 transition-colors"></div>
                                  </label>
                              </td>
                              <td className="h-[72px] px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleTestModel(model.id)}
                                        disabled={testingModel === model.id}
                                        className="text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-500 p-2 rounded-lg hover:bg-blue-500/10"
                                        title="Test Connection"
                                      >
                                          <RefreshCw className={testingModel === model.id ? 'animate-spin' : ''} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteModel(model.id)}
                                        className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10"
                                      >
                                          <Trash2 />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        )}
      </div>
      <AddLlmModelModal isOpen={isModalOpen} onClose={handleModalClose} />
    </div>
  );
};

export default LlmManagementPage;