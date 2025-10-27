export default function ApiKeysSettings() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">API Keys</h1>

      <button className="mb-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
        + 새 API Key 생성
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Key</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">생성일</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">마지막 사용</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                No API keys yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
