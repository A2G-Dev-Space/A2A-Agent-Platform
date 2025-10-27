import { useThemeStore } from '@/store/useThemeStore';

export default function GeneralSettings() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">일반 설정</h1>

      {/* Theme Setting */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">테마</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setTheme('light')}
            className={`px-6 py-3 rounded-lg border-2 transition-colors ${
              theme === 'light'
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            라이트
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`px-6 py-3 rounded-lg border-2 transition-colors ${
              theme === 'dark'
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            다크
          </button>
        </div>
      </div>

      {/* Language Setting */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">언어</h2>
        <div className="flex gap-4">
          <button className="px-6 py-3 rounded-lg border-2 border-purple-600 bg-purple-50 dark:bg-purple-900">
            한국어
          </button>
          <button className="px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700">
            English
          </button>
        </div>
      </div>
    </div>
  );
}
