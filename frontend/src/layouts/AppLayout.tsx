import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Columns3, Calendar, BarChart2,
  MessageSquare, Building2, Users, Settings, LogOut, Menu, X,
  Zap, ChevronDown, Moon, Sun, Monitor, User, Share2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { cn } from '../utils/cn';

// ── Nav items ────────────────────────────────────────────────────────────────
const personalNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { to: '/tasks', icon: CheckSquare, label: 'Minhas Tarefas' },
  { to: '/kanban', icon: Columns3, label: 'Kanban' },
  { to: '/social', icon: Share2, label: 'Redes Sociais' },
  { to: '/enterprise', icon: Building2, label: 'Empresas' },
  { to: '/calendar', icon: Calendar, label: 'Calendário' },
  { to: '/reports', icon: BarChart2, label: 'Relatórios' },
];


const enterpriseNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/kanban', icon: Columns3, label: 'Kanban' },
  { to: '/social', icon: Share2, label: 'Redes Sociais' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/enterprise', icon: Building2, label: 'Empresa' },
  { to: '/members', icon: Users, label: 'Membros' },
  { to: '/reports', icon: BarChart2, label: 'Relatórios' },
];


// ── Nav Link ─────────────────────────────────────────────────────────────────
function SidebarLink({ to, icon: Icon, label, onClick }: { to: string; icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      )}
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

// ── Sidebar Content ───────────────────────────────────────────────────────────
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { workspace, setPersonal, isPersonal } = useWorkspace();
  const navigate = useNavigate();

  const navItems = isPersonal ? personalNav : enterpriseNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Claro' },
    { value: 'dark' as const, icon: Moon, label: 'Escuro' },
    { value: 'system' as const, icon: Monitor, label: 'Sistema' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">TaskFlow</span>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Espaço de Trabalho</p>
        <div className="flex gap-1">
          <button
            onClick={setPersonal}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors',
              isPersonal
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            Pessoal
          </button>
          <button
            onClick={() => navigate('/enterprise')}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors',
              !isPersonal
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            Empresa
          </button>
        </div>
        {!isPersonal && workspace.type === 'enterprise' && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2 px-1 truncate">
            {workspace.enterprise.name}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarLink key={item.to} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
        {/* Theme switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              title={label}
              className={cn(
                'flex-1 flex items-center justify-center py-1 rounded-md transition-colors',
                theme === value
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <SidebarLink to="/profile" icon={User} label="Perfil" onClick={onNavClick} />
        <SidebarLink to="/settings" icon={Settings} label="Configurações" onClick={onNavClick} />

        {/* User info + logout */}
        <div className="flex items-center gap-2 px-3 py-2 mt-1">
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AppLayout ─────────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { workspace } = useWorkspace();

  const workspaceLabel = workspace.type === 'personal'
    ? 'Personal'
    : workspace.type === 'enterprise' ? workspace.enterprise.name : '';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 lg:hidden transition-transform duration-300',
        drawerOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent onNavClick={() => setDrawerOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">TaskFlow</span>
          </div>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            {workspace.type === 'personal' ? 'Pessoal' : workspace.type === 'enterprise' ? workspace.enterprise.name : ''}
          </span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
