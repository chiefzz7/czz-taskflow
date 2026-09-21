import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { User, Moon, Sun, Monitor, Mail, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <User size={22} className="text-indigo-600 dark:text-indigo-400" />
        Profile
      </h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.status}</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <Mail size={16} className="text-gray-400 flex-shrink-0" />
            {user?.email}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <Clock size={16} className="text-gray-400 flex-shrink-0" />
            {user?.timezone ?? 'UTC'}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <div className="flex gap-3">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium',
                theme === value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
              )}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
