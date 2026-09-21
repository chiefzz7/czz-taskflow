import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Enterprise } from '../types/enterprise';

type Workspace =
  | { type: 'personal' }
  | { type: 'enterprise'; enterprise: Enterprise };

interface WorkspaceContextValue {
  workspace: Workspace;
  setPersonal: () => void;
  setEnterprise: (enterprise: Enterprise) => void;
  isPersonal: boolean;
  isEnterprise: boolean;
  currentEnterpriseId: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(() => {
    try {
      const stored = localStorage.getItem('taskflow_workspace');
      if (stored) return JSON.parse(stored) as Workspace;
    } catch { /* ignore */ }
    return { type: 'personal' };
  });

  const setPersonal = useCallback(() => {
    const ws: Workspace = { type: 'personal' };
    setWorkspace(ws);
    localStorage.setItem('taskflow_workspace', JSON.stringify(ws));
  }, []);

  const setEnterprise = useCallback((enterprise: Enterprise) => {
    const ws: Workspace = { type: 'enterprise', enterprise };
    setWorkspace(ws);
    localStorage.setItem('taskflow_workspace', JSON.stringify(ws));
  }, []);

  const currentEnterpriseId = workspace.type === 'enterprise' ? workspace.enterprise.id : null;

  return (
    <WorkspaceContext.Provider value={{
      workspace,
      setPersonal,
      setEnterprise,
      isPersonal: workspace.type === 'personal',
      isEnterprise: workspace.type === 'enterprise',
      currentEnterpriseId,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
}
