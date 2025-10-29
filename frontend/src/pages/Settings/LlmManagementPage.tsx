import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import AddLlmModelModal from './AddLlmModelModal';

const LlmManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dummy data for now
  const models = [
    { id: 1, name: 'GPT-4-Turbo', endpoint: 'https://api.openai.com/v1', key: 'sk-••••••••1234', health: 'Healthy', active: true },
    { id: 2, name: 'Claude 3 Sonnet', endpoint: 'https://api.anthropic.com/v1', key: 'sk-••••••••5678', health: 'Error', active: false },
    { id: 3, name: 'Gemini Pro 1.5', endpoint: 'https://generativelanguage.googleapis.com/v1beta', key: 'sk-••••••••9012', health: 'Checking', active: true },
  ];

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
        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-white/20 bg-background-light dark:bg-background-dark">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[20%] text-sm font-medium leading-normal">{t('settings.llmManagement.modelName')}</th>
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[25%] text-sm font-medium leading-normal">{t('settings.llmManagement.endpoint')}</th>
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[15%] text-sm font-medium leading-normal">{t('settings.llmManagement.key')}</th>
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[15%] text-sm font-medium leading-normal">{t('settings.llmManagement.healthStatus')}</th>
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[10%] text-sm font-medium leading-normal text-center">{t('settings.llmManagement.active')}</th>
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 w-[15%] text-sm font-medium leading-normal text-right">{t('settings.llmManagement.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {models.map(model => (
                        <tr key={model.id} className="border-t border-t-slate-200 dark:border-t-white/20">
                            <td className="h-[72px] px-4 py-2 text-slate-900 dark:text-white text-sm font-normal leading-normal">{model.name}</td>
                            <td className="h-[72px] px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">{model.endpoint}</td>
                            <td className="h-[72px] px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal font-mono">{model.key}</td>
                            <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${model.health === 'Healthy' ? 'bg-green-500' : model.health === 'Error' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                                    <span className={`${model.health === 'Healthy' ? 'text-green-700 dark:text-green-400' : model.health === 'Error' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>{model.health}</span>
                                </div>
                            </td>
                            <td className="h-[72px] px-4 py-2 text-center text-sm font-normal leading-normal">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked={model.active} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </td>
                            <td className="h-[72px] px-4 py-2 text-right">
                                <button className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10">
                                    <Trash2 />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      <AddLlmModelModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default LlmManagementPage;