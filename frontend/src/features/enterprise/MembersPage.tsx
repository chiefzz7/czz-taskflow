import { useEffect, useState } from 'react';
import { Users, Loader2, Shield, User, Briefcase } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { enterpriseService } from '../../services/enterpriseService';
import type { EnterpriseMember } from '../../types/enterprise';
import { ROLE_LABELS } from '../../types/enterprise';
import { cn } from '../../utils/cn';

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  manager: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  member: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
};

export default function MembersPage() {
  const { isPersonal, currentEnterpriseId } = useWorkspace();
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPersonal || !currentEnterpriseId) {
      setIsLoading(false);
      return;
    }
    enterpriseService.listMembers(currentEnterpriseId)
      .then(setMembers)
      .finally(() => setIsLoading(false));
  }, [isPersonal, currentEnterpriseId]);

  if (isPersonal || !currentEnterpriseId) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Members</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Switch to an enterprise workspace to view members.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Users size={22} className="text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({members.length})</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {members.map((member, idx) => (
            <div key={member.id} className={cn(
              'flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
              idx < members.length - 1 && 'border-b border-gray-100 dark:border-gray-800'
            )}>
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {member.user?.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {member.user?.name ?? member.user_id}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.user?.email}</p>
              </div>
              <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide', roleColors[member.role])}>
                {ROLE_LABELS[member.role]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
