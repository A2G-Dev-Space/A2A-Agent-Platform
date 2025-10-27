import { Plus } from 'lucide-react';

export default function WorkbenchDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-6">
        My Workbench
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* New Agent Card */}
        <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
          <Plus className="w-12 h-12 text-purple-500 dark:text-purple-400 mb-2" />
          <p className="text-purple-700 dark:text-purple-300 font-medium">새 에이전트 만들기</p>
        </div>

        {/* Agent Cards will be rendered here */}
      </div>
    </div>
  );
}
