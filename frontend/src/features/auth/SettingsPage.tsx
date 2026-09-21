import { Settings } from 'lucide-react';
export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
      <Settings size={48} className="text-indigo-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2">Advanced settings coming soon.</p>
    </div>
  );
}
