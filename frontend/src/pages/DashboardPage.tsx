import { Link } from "react-router-dom";

export function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">WatchLens Dashboard</h1>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← 업로드 페이지
        </Link>
      </div>
      <div className="space-y-8">
        {/* Chart components will be added in Tasks 8 and 9 */}
        <p className="text-gray-400">Dashboard sections coming soon...</p>
      </div>
    </div>
  );
}
