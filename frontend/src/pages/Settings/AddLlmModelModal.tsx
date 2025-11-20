import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface AddLlmModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddLlmModelModal: React.FC<AddLlmModelModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai_compatible',
    endpoint: '',
    api_key: '',
  });

  // Predefined endpoints for providers
  const providerEndpoints: { [key: string]: string } = {
    google: 'https://generativelanguage.googleapis.com/v1beta',
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    openai_compatible: '', // Custom endpoint for OpenAI-compatible APIs
  };

  // Common models per provider
  const providerModels: { [key: string]: string[] } = {
    google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    openai_compatible: [], // Allow custom model names for OpenAI-compatible endpoints
  };

  const handleProviderChange = (provider: string) => {
    setFormData({
      ...formData,
      provider,
      endpoint: providerEndpoints[provider] || '',
      name: '', // Reset name when changing provider
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.api_key) {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.provider === 'openai_compatible' && !formData.endpoint) {
      alert('Endpoint is required for OpenAI Compatible providers');
      return;
    }

    setLoading(true);
    try {
      const HOST_IP = import.meta.env.VITE_HOST_IP || 'localhost';
      const GATEWAY_PORT = import.meta.env.VITE_GATEWAY_PORT || '9050';
      const response = await fetch(`http://${HOST_IP}:${GATEWAY_PORT}/api/admin/llm-models/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({
          name: '',
          provider: 'openai_compatible',
          endpoint: '',
          api_key: '',
        });
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to add model: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add LLM model:', error);
      alert('Failed to add model. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-background-dark shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{t('settings.llmManagement.addModal.title')}</p>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <label className="flex flex-col w-full">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">Provider *</p>
            <select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal"
            >
              <option value="google">Google (Gemini)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai_compatible">OpenAI Compatible (Custom)</option>
            </select>
          </label>

          <label className="flex flex-col w-full">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">Model Name *</p>
            {formData.provider === 'openai_compatible' ? (
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal"
                placeholder="Enter model name (e.g., gemini-2.0-flash-exp)"
              />
            ) : (
              <select
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal"
              >
                <option value="">Select a model</option>
                {providerModels[formData.provider]?.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="flex flex-col w-full">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">Endpoint {formData.provider === 'openai_compatible' ? '*' : ''}</p>
            <input
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-xs font-mono leading-normal"
              placeholder={formData.provider === 'openai_compatible' ?
                "Enter OpenAI-compatible endpoint (e.g., https://example.com/v1/chat/completions)" :
                "API Endpoint URL"}
            />
          </label>

          <label className="flex flex-col w-full">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">API Key *</p>
            <div className="relative">
                <input
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-sm font-mono leading-normal pr-12"
                  placeholder="Enter your API key"
                  type={showKey ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
          </label>
        </div>
        <div className="flex flex-row-reverse gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name || !formData.api_key}
            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">{loading ? 'Adding...' : t('common.save')}</span>
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-base font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">{t('common.cancel')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLlmModelModal;