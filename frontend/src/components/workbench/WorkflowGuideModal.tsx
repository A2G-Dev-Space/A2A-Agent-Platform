import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, BookOpen } from 'lucide-react';
import { AgentFramework } from '@/types';

interface WorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  framework: AgentFramework;
  onDownloadExamples: () => void;
}

export const WorkflowGuideModal: React.FC<WorkflowGuideModalProps> = ({
  isOpen,
  onClose,
  framework,
  onDownloadExamples,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isAdk = framework === AgentFramework.ADK;
  const isLangchain = framework === AgentFramework.LANGCHAIN;
  const workflowKey = isAdk ? 'adk' : isLangchain ? 'langchain' : 'agno';

  const steps = [
    { title: t(`workbench.workflow.${workflowKey}.step1Title`), desc: t(`workbench.workflow.${workflowKey}.step1Desc`) },
    { title: t(`workbench.workflow.${workflowKey}.step2Title`), desc: t(`workbench.workflow.${workflowKey}.step2Desc`) },
    { title: t(`workbench.workflow.${workflowKey}.step3Title`), desc: t(`workbench.workflow.${workflowKey}.step3Desc`) },
    { title: t(`workbench.workflow.${workflowKey}.step4Title`), desc: t(`workbench.workflow.${workflowKey}.step4Desc`) },
    { title: t(`workbench.workflow.${workflowKey}.step5Title`), desc: t(`workbench.workflow.${workflowKey}.step5Desc`) },
    { title: t(`workbench.workflow.${workflowKey}.step6Title`), desc: t(`workbench.workflow.${workflowKey}.step6Desc`) },
    { title: t(`workbench.workflow.${workflowKey}.step7Title`), desc: t(`workbench.workflow.${workflowKey}.step7Desc`) },
  ];

  const handleDontShowAgain = () => {
    localStorage.setItem(`workbench-workflow-seen-${framework}`, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('workbench.workflow.title')} - {framework}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="border-l-4 border-primary pl-4 py-2"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Download Examples Section */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  {t('workbench.workflow.downloadExamples')}
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                  {isAdk
                    ? 'ADK 프레임워크를 사용한 수학 에이전트 예시 코드를 다운로드하여 시작하세요.'
                    : isLangchain
                    ? 'LangChain 프레임워크를 사용한 테스트 에이전트 예시 코드를 다운로드하여 시작하세요.'
                    : 'Agno 프레임워크를 사용한 수학 에이전트 예시 코드를 다운로드하여 시작하세요.'}
                </p>
                <button
                  onClick={onDownloadExamples}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  {t('workbench.workflow.downloadExamples')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleDontShowAgain}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {t('workbench.workflow.dontShowAgain')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
