import React from 'react';
import { PersonaProfile } from '../../../server/types/index.js';
import { ROUTE_RULES } from '../../lib/rbac.js';
import { useAuth } from '../../context/AuthContext.js';

interface AccessDeniedPageProps {
  requestedRoute: string;
  currentPersona: PersonaProfile | null;
  onNavigate: (route: string) => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requestedRoute,
  currentPersona,
  onNavigate,
}) => {
  const { logout } = useAuth();
  const rule = ROUTE_RULES[requestedRoute];
  const moduleName = rule?.label || requestedRoute.replace('/', '');
  const requiredRoles = rule?.allowedRoles || ['SUPER_ADMIN'];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Primary 403 Card */}
      <div className="bg-white rounded-3xl border border-rose-200/80 shadow-xs overflow-hidden">
        {/* Banner Strip */}
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="material-symbols-outlined text-[20px]">gpp_bad</span>
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-rose-700 uppercase tracking-wider block">
                Statutory Access Control Gate (403 Forbidden)
              </span>
              <span className="text-sm font-bold text-slate-900">
                Institutional Role-Based Access Enforced
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            HTTP 403
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Access Restricted: Insufficient Statutory Clearance
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your active session under identity{' '}
              <strong className="text-slate-900 font-semibold">{currentPersona?.name || 'Unauthenticated'}</strong> (
              <span className="font-mono text-xs text-blue-600 font-semibold">
                {currentPersona?.roleLabel || 'Guest'}
              </span>
              ) does not possess permission to access the{' '}
              <strong className="text-slate-900 font-semibold">{moduleName}</strong> ({requestedRoute}) module.
            </p>
          </div>

          {/* Detailed Diagnostic Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Identity Profile Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={currentPersona?.avatar}
                  alt={currentPersona?.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                    Active Identity Dossier
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">{currentPersona?.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{currentPersona?.staffId}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Designated Role:</span>
                  <span className="font-mono font-bold text-slate-900">{currentPersona?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium text-slate-800 truncate ml-2 text-right">
                    {currentPersona?.department}
                  </span>
                </div>
              </div>
            </div>

            {/* Clearance Requirement Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">policy</span>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                  Required Statutory Clearance
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-slate-600">
                  Access to <strong className="text-slate-900">{moduleName}</strong> is restricted to personnel holding these statutory roles:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {requiredRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-mono font-semibold text-slate-700 shadow-2xs"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Permitted Modules for this Persona */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
              <h4 className="text-xs font-bold text-emerald-900 uppercase font-mono">
                Modules Cleared for Your Active Role:
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentPersona?.allowedModules.map((mod) => (
                <span
                  key={mod}
                  className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs"
                >
                  {mod === '*' ? 'Universal Root Clearance (*)' : mod}
                </span>
              ))}
            </div>
          </div>

          {/* Recovery Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Return to My Dashboard</span>
            </button>
            <button
              onClick={async () => {
                await logout();
                onNavigate('/login');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign In with Another Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
