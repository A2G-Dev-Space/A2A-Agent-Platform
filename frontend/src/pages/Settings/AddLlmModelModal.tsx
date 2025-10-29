import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Eye, EyeOff } from 'lucide-react';

interface AddLlmModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddLlmModelModal: React.FC<AddLlmModelModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [showKey, setShowKey] = useState(false);

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
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">{t('settings.llmManagement.addModal.modelNameLabel')} *</p>
            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal" placeholder={t('settings.llmManagement.addModal.modelNamePlaceholder')} />
          </label>
          <label className="flex flex-col w-full">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">{t('settings.llmManagement.addModal.endpointLabel')} *</p>
            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal" placeholder={t('settings.llmManagement.addModal.endpointPlaceholder')} />
          </label>
          <label className="flex flex-col w-full">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 pb-2">{t('settings.llmManagement.addModal.keyLabel')} *</p>
            <div className="relative">
                <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal" placeholder={t('settings.llmManagement.addModal.keyPlaceholder')} type={showKey ? 'text' : 'password'} />
                <button onClick={() => setShowKey(!showKey)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    {showKey ? <EyeOff /> : <Eye />}
                </button>
            </div>
          </label>
        </div>
        <div className="flex flex-row-reverse gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 focus:ring-4 focus:ring-primary/30">
            <span className="truncate">{t('common.save')}</span>
          </button>
          <button onClick={onClose} className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-base font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-500/20">
            <span className="truncate">{t('common.cancel')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLlmModelModal;