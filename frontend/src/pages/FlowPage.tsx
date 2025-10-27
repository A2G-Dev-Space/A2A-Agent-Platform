import { ChevronDown } from 'lucide-react';

export default function FlowPage() {
  return (
    <div className="flex items-center justify-center min-h-full p-6">
      <div className="max-w-3xl w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-700 dark:text-teal-300 mb-2">
            Agent Flow
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            여러 에이전트를 조합하여 복잡한 작업을 수행하세요
          </p>
        </div>

        {/* Agent Selection Dropdown */}
        <button className="w-full mb-4 px-4 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span className="text-gray-700 dark:text-gray-300">Select Agents</span>
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </button>

        {/* Input Area */}
        <div className="relative">
          <textarea
            className="w-full border-2 border-gray-300 dark:border-gray-700 rounded-2xl p-6 pr-16 bg-white dark:bg-gray-800 focus:border-teal-500 dark:focus:border-teal-500 outline-none resize-none"
            placeholder="What would you like to do?"
            rows={6}
          />
          <button className="absolute bottom-6 right-6 w-10 h-10 bg-teal-600 hover:bg-teal-700 rounded-full flex items-center justify-center text-white transition-colors">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
