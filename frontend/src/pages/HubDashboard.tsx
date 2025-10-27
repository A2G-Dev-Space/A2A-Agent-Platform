export default function HubDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-sky-700 dark:text-sky-300 mb-6">Agent Hub</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="어떤 에이전트를 찾고 있나요?"
        className="w-full max-w-2xl mb-6 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      />

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Agent cards will be rendered here */}
        <div className="text-gray-500 dark:text-gray-400">No agents available</div>
      </div>
    </div>
  );
}
