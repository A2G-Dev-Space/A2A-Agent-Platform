export default function LLMModelsManagement() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        LLM 모델 관리
      </h1>

      <button className="mb-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
        + 새 LLM 등록
      </button>

      <div className="space-y-4">
        {/* Model Card Example */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🟢</span>
                <h3 className="text-lg font-semibold">GPT-4</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Endpoint: https://api.openai.com/v1
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                상태: Healthy | 마지막 체크: 2025-10-27 10:00
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                수정
              </button>
              <button className="px-3 py-1 text-sm text-red-600 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
