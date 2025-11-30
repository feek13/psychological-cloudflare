/**
 * 页面加载占位组件
 * 用于 React.lazy 懒加载时的 Suspense fallback
 */
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">加载中...</p>
      </div>
    </div>
  );
}
