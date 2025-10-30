import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { AgentFramework } from '@/types';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const cardColors = [
  'rgb(239, 68, 68)',
  'rgb(249, 115, 22)',
  'rgb(234, 179, 8)',
  'rgb(34, 197, 94)',
  'rgb(59, 130, 246)',
  'rgb(99, 102, 241)',
  'rgb(139, 92, 246)',
  'rgb(217, 70, 239)',
];

const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  // TODO: Replace this with useMutation for createAgent
  const [isLoading] = useState(false); // Read-only placeholder

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState<AgentFramework | ''>('');
  const [color, setColor] = useState(cardColors[3]);

  const handleSubmit = async () => {
    // ... (submission logic will be updated later)
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative w-full max-w-2xl transform rounded-xl bg-background-light dark:bg-[#1f1c26] text-gray-800 dark:text-white shadow-2xl transition-all">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#433c53]">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">{t('createAgent.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-[#a59db8]">{t('createAgent.subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 dark:text-[#a59db8] hover:bg-gray-100 dark:hover:bg-[#433c53]">
            <X />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <label className="flex flex-col">
            <p className="text-base font-medium leading-normal pb-2">{t('createAgent.nameLabel')}</p>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg bg-white dark:bg-[#131118] text-gray-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#433c53] h-12 placeholder:text-gray-400 dark:placeholder:text-[#a59db8] px-4 text-base font-normal leading-normal"
              placeholder={t('createAgent.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <p className="text-base font-medium leading-normal pb-2">{t('createAgent.descriptionLabel')}</p>
            <textarea
              className="form-input flex w-full min-w-0 flex-1 resize-y overflow-hidden rounded-lg bg-white dark:bg-[#131118] text-gray-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#433c53] min-h-28 placeholder:text-gray-400 dark:placeholder:text-[#a59db8] p-4 text-base font-normal leading-normal"
              placeholder={t('createAgent.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <p className="text-base font-medium leading-normal pb-2">{t('createAgent.frameworkLabel')}</p>
            <select
              className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg bg-white dark:bg-[#131118] text-gray-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#433c53] h-12 px-4 text-base font-normal leading-normal"
              value={framework}
              onChange={(e) => setFramework(e.target.value as AgentFramework)}
            >
              <option value="" disabled>{t('createAgent.frameworkPlaceholder')}</option>
              {Object.values(AgentFramework).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <div>
            <p className="text-base font-medium leading-normal pb-2">{t('createAgent.colorLabel')}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              {cardColors.map((c) => (
                <label key={c} className={`relative size-9 cursor-pointer rounded-full border-2 border-transparent ring-2 ${color === c ? 'ring-primary' : 'ring-gray-200 dark:ring-[#433c53]'} ring-offset-2 ring-offset-background-light dark:ring-offset-[#1f1c26]`} style={{ backgroundColor: c }}>
                  <input type="radio" name="card-color" className="invisible absolute" value={c} checked={color === c} onChange={() => setColor(c)} />
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-[#433c53]">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-white/10">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90" disabled={!name || !description || !framework || isLoading}>
            {isLoading ? t('common.creating') : t('createAgent.createButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAgentModal;