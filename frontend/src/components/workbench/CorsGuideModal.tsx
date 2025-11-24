import React from 'react';
import { X, AlertCircle, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CorsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
}

export const CorsGuideModal: React.FC<CorsGuideModalProps> = ({ isOpen, onClose, endpoint }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Extract host from endpoint (unused for now, but kept for potential future use)
  // const getHost = (url: string) => {
  //   try {
  //     const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
  //     return urlObj.hostname;
  //   } catch {
  //     return 'your-agno-server';
  //   }
  // };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Modal */}
      <div className="relative bg-panel-light dark:bg-panel-dark rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto border border-border-light dark:border-border-dark">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              {t('cors.modal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary rounded-lg p-1.5 hover:bg-background-light dark:hover:bg-background-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {t('cors.modal.errorTitle')}
                </p>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  {t('cors.modal.errorMessage', { endpoint }).split('<code>').map((part, i) => {
                    if (i === 0) return part;
                    const [code, ...rest] = part.split('</code>');
                    return (
                      <React.Fragment key={i}>
                        <code className="font-mono bg-red-100 dark:bg-red-800/30 px-1 rounded">{code}</code>
                        {rest.join('</code>')}
                      </React.Fragment>
                    );
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              {t('cors.modal.howToFix')}
            </h3>

            {/* Configure CORS in Agent Code */}
            <div className="border border-border-light dark:border-border-dark rounded-lg p-4 space-y-3 bg-background-light dark:bg-background-dark">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {t('cors.modal.solutionTitle')}
                </h4>
              </div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {t('cors.modal.solutionDescription')}
              </p>
              <div className="bg-gray-900 dark:bg-gray-950 text-gray-100 dark:text-gray-200 rounded-lg p-3 font-mono text-sm overflow-x-auto border border-gray-700 dark:border-gray-800">
                <pre>{`${t('cors.modal.agnoComment')}
from agno import Agent
from fastapi.middleware.cors import CORSMiddleware

agent = Agent()
agent.app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

${t('cors.modal.adkComment')}
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or ["http://10.229.95.228:9060"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`}</pre>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">{t('cors.modal.whyTitle')}</p>
                  <p>
                    {t('cors.modal.whyDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-border-light dark:border-border-dark"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};