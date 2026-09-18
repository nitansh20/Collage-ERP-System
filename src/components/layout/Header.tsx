import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onNavigate: (route: string) => void;
  onOpenNewAdmission: () => void;
  currentRoute: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onNavigate,
  onOpenNewAdmission,
  currentRoute,
}) => {
  const { personas, currentPersona, switchPersona, logout, hasAccess } = useAuth();
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);

  const canCreateAdmission = hasAccess('/admissions');

  const getRoleTagColor = (role?: string) => {
    switch (role) {
      case 'STUDENT':
      case 'STUDENT_REP':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FAC_MEMBER':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SUPER_ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BURSAR_FINANCE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DEAN_ACADEMICS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COE_OFFICER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Mobile hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Campus ERP</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-800 uppercase tracking-wider">
            {currentRoute.replace('/', '').replace('/', ' • ') || 'DASHBOARD'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Clearance Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${getRoleTagColor(
              currentPersona?.role
            )} flex items-center gap-1.5`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>Role: {currentPersona?.role || 'Guest'}</span>
          </span>
        </div>

        {/* Global Fast Action (RBAC Guarded: Only visible if authorized) */}
        {canCreateAdmission && (
          <button
            onClick={onOpenNewAdmission}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span className="hidden sm:inline">New Admission</span>
          </button>
        )}

        {/* Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <img
              src={currentPersona?.avatar}
              alt={currentPersona?.name}
              className="w-7 h-7 rounded-lg object-cover border border-slate-200"
            />
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {currentPersona?.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block leading-none">
                {currentPersona?.roleLabel}
              </span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              expand_more
            </span>
          </button>

          {isPersonaMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPersonaMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                {/* Authenticated Identity Dossier */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <img
                    src={currentPersona?.avatar}
                    alt={currentPersona?.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block leading-tight">
                      Active User Session
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {currentPersona?.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 truncate block">
                      {currentPersona?.email}
                    </span>
                  </div>
                </div>

                {/* Statutory RBAC Clearance Badge */}
                <div className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Assigned Role:</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                      {currentPersona?.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Clearance Level:</span>
                    <span className="font-semibold text-slate-800">
                      {currentPersona?.roleLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Department:</span>
                    <span className="font-semibold text-slate-800">
                      {currentPersona?.department || 'Institution-wide'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Staff / Roll ID:</span>
                    <span className="font-mono text-slate-700">
                      {currentPersona?.staffId}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 px-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Encrypted JWT session • RBAC active</span>
                </div>

                {/* Session Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                  <button
                    onClick={async () => {
                      setIsPersonaMenuOpen(false);
                      await logout();
                      onNavigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out Securely</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Direct Sign Out Icon */}
        <button
          onClick={async () => {
            await logout();
            onNavigate('/login');
          }}
          title="Sign Out"
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </header>
  );
};
