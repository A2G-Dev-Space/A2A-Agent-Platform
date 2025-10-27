import { useParams } from 'react-router-dom';

export default function HubPlayground() {
  const { id } = useParams();

  return (
    <div className="flex h-full">
      {/* Playground Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
        <button className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-lg mb-4">
          + 새 대화
        </button>
        <div className="text-sm text-gray-600 dark:text-gray-400">Agent ID: {id}</div>
      </div>

      {/* Chat Playground */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            Chat messages will appear here
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <textarea
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"
            placeholder="메시지를 입력하세요..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
