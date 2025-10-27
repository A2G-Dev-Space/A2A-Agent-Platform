export default function UsersManagement() {
  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">사용자 관리</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <option>부서: 전체</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <option>역할: 전체</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">사용자 ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">이름</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">역할</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">부서</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                No users found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
