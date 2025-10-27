export default function LLMUsageStats() {
  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        LLM 사용량 통계
      </h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="date"
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
        <span className="self-center">~</span>
        <input
          type="date"
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
        <select className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <option>뷰: 개인별</option>
          <option>뷰: 부서별</option>
          <option>뷰: Agent별</option>
        </select>
      </div>

      {/* Chart Placeholder */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chart will be displayed here</p>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-2 justify-end mb-6">
        <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          Export CSV
        </button>
        <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          Export Excel
        </button>
      </div>
    </div>
  );
}
