import React from 'react';
import { useDashboard, DashboardModule } from '../../context/DashboardContext.js';

interface DashboardModuleCardProps {
  module: DashboardModule;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const DashboardModuleCard: React.FC<DashboardModuleCardProps> = ({
  module,
  children,
  actions,
}) => {
  const { isCustomizing, toggleModule, reorderModule } = useDashboard();

  return (
    <div
      className={`bg-white rounded-3xl border transition-all shadow-2xs overflow-hidden flex flex-col ${
        isCustomizing ? 'border-dashed border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200'
      }`}
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50/40">
        <div className="flex items-center gap-3">
          {isCustomizing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => reorderModule(module.id, 'up')}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                title="Move Module Up"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              </button>
              <button
                onClick={() => reorderModule(module.id, 'down')}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                title="Move Module Down"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{module.title}</h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {module.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5 line-clamp-1">
              {module.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {isCustomizing && (
            <button
              onClick={() => toggleModule(module.id)}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
            >
              Hide Module
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1">{children}</div>
    </div>
  );
};
