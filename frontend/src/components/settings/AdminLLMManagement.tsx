import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, Eye, EyeOff, TestTube } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface LLMModel {
  id: number;
  name: string;
  provider: string;
  endpoint: string;
  is_active: boolean;
  health_status: string;
  last_health_check: string | null;
  created_at: string;
}

interface LLMModelCreate {
  name: string;
  provider: string;
  endpoint: string;
  api_key: string;
}

export default function AdminLLMManagement() {
  const { accessToken } = useAuthStore();
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingModel, setTestingModel] = useState<number | null>(null);

  const [newModel, setNewModel] = useState<LLMModelCreate>({
    name: '',
    provider: 'google',
    endpoint: '',
    api_key: '',
  });

  // Predefined endpoints for providers
  const providerEndpoints = {
    google: 'https://generativelanguage.googleapis.com/v1beta',
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
  };

  // Common models per provider
  const providerModels = {
    google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:9050/api/admin/llm-models/', {
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

  const handleAddModel = async () => {
    try {
      const response = await fetch('http://localhost:9050/api/admin/llm-models/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newModel,
          endpoint: newModel.endpoint || providerEndpoints[newModel.provider as keyof typeof providerEndpoints],
        }),
      });

      if (response.ok) {
        await fetchModels();
        setShowAddModal(false);
        setNewModel({
          name: '',
          provider: 'google',
          endpoint: '',
          api_key: '',
        });
      }
    } catch (error) {
      console.error('Failed to add LLM model:', error);
    }
  };

  const handleDeleteModel = async (id: number) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      const response = await fetch(`http://localhost:9050/api/admin/llm-models/${id}/`, {
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
      const response = await fetch(`http://localhost:9050/api/admin/llm-models/${id}/health-check/`, {
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
      const response = await fetch(`http://localhost:9050/api/admin/llm-models/${id}/`, {
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

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            LLM Model Management
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage LLM API keys and endpoints for the platform
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Model
        </button>
      </div>

      {/* Model List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Model
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Provider
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Endpoint
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Active
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {models.map((model) => (
              <tr key={model.id}>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {model.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {model.provider}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                    {model.endpoint}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    model.health_status === 'HEALTHY'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : model.health_status === 'UNHEALTHY'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {model.health_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleModelActive(model.id, model.is_active)}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    style={{
                      backgroundColor: model.is_active ? 'rgb(34, 197, 94)' : 'rgb(156, 163, 175)',
                    }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                      style={{
                        transform: `translateX(${model.is_active ? '18px' : '2px'})`,
                      }}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestModel(model.id)}
                      disabled={testingModel === model.id}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Test Connection"
                    >
                      <TestTube className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {models.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No LLM models configured. Add your first model to get started.
          </div>
        )}
      </div>

      {/* Add Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add LLM Model
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider
                </label>
                <select
                  value={newModel.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    setNewModel({
                      ...newModel,
                      provider,
                      endpoint: providerEndpoints[provider as keyof typeof providerEndpoints] || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="google">Google (Gemini)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Name
                </label>
                <select
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a model</option>
                  {providerModels[newModel.provider as keyof typeof providerModels]?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Endpoint
                </label>
                <input
                  type="text"
                  value={newModel.endpoint || providerEndpoints[newModel.provider as keyof typeof providerEndpoints]}
                  onChange={(e) => setNewModel({ ...newModel, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                  placeholder="API Endpoint URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={newModel.api_key}
                    onChange={(e) => setNewModel({ ...newModel, api_key: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    placeholder="Enter API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModel}
                disabled={!newModel.name || !newModel.api_key}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}