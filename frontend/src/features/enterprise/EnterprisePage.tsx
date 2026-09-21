import { useEffect, useState } from 'react';
import { Building2, Plus, Users, Settings, CheckSquare, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { enterpriseService } from '../../services/enterpriseService';
import type { Enterprise } from '../../types/enterprise';
import { cn } from '../../utils/cn';

function EnterpriseCard({ enterprise, isActive, onClick }: {
  enterprise: Enterprise;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-5 rounded-xl border-2 transition-all hover:shadow-md',
        isActive
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
          isActive ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-800'
        )}>
          <Building2 size={20} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{enterprise.name}</p>
          {enterprise.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{enterprise.description}</p>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Created {new Date(enterprise.created_at).toLocaleDateString()}
          </p>
        </div>
        {isActive && (
          <div className="flex-shrink-0">
            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded-full">
              Active
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export default function EnterprisePage() {
  const { user } = useAuth();
  const { setEnterprise, setPersonal, currentEnterpriseId, isEnterprise } = useWorkspace();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    enterpriseService.list()
      .then(setEnterprises)
      .catch(() => setError('Failed to load enterprises'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await enterpriseService.create({ name: newName.trim(), description: newDesc.trim() || null });
      setEnterprises((prev) => [created, ...prev]);
      setEnterprise(created);
      setShowForm(false);
      setNewName('');
      setNewDesc('');
    } catch {
      setError('Failed to create enterprise');
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (enterprise: Enterprise) => {
    setEnterprise(enterprise);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={22} className="text-indigo-600 dark:text-indigo-400" />
            Enterprise
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your organizations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Enterprise
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 animate-slide-up">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Create Enterprise</h2>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Organization name"
            required
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg flex items-center gap-2">
              {creating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
        </div>
      ) : enterprises.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No enterprises yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create one to start collaborating with your team</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {enterprises.map((e) => (
            <EnterpriseCard
              key={e.id}
              enterprise={e}
              isActive={isEnterprise && currentEnterpriseId === e.id}
              onClick={() => handleSelect(e)}
            />
          ))}
        </div>
      )}

      {isEnterprise && (
        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl flex items-center justify-between">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            You're in enterprise mode. Switch back to personal workspace?
          </p>
          <button onClick={setPersonal} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Go personal <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
