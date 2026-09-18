import React from 'react';
import { Drawer } from './Drawer.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({ isOpen, onClose }) => {
  const { authorizedModules, toggleModule, reorderModule, resetToDefaults } = useDashboard();
  const { currentPersona } = useAuth();

  const sortedModules = authorizedModules.slice().sort((a, b) => a.order - b.order);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Role Dashboard Widgets"
      subtitle={`Personalize operational widgets and priorities for ${currentPersona?.roleLabel || 'your workspace'}.`}
      width="md"
    >
      <div className="space-y-4">
        {/* Role Identity Banner */}
        <div className="p-3 bg-slate-900 text-white rounded-2xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-400">admin_panel_settings</span>
            <div>
              <span className="font-bold block">{currentPersona?.name}</span>
              <span className="text-[11px] text-slate-300 font-mono">{currentPersona?.roleLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
            {sortedModules.filter((m) => m.enabled).length} Active
          </span>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] shrink-0 text-blue-600">tune</span>
          <p>
            Reorder widgets using the arrows and toggle visibility. Changes are saved automatically for your role clearance.
          </p>
        </div>

        {/* Modules List */}
        <div className="space-y-2.5">
          {sortedModules.map((m, idx) => (
            <div
              key={m.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                m.enabled
                  ? 'border-slate-200 bg-white shadow-2xs'
                  : 'border-slate-200/60 bg-slate-50/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => reorderModule(m.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-20 cursor-pointer transition-colors"
                    title="Move Up"
                  >
                    <span className="material-symbols-outlined text-[16px] block">expand_less</span>
                  </button>
                  <button
                    onClick={() => reorderModule(m.id, 'down')}
                    disabled={idx === sortedModules.length - 1}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-20 cursor-pointer transition-colors"
                    title="Move Down"
                  >
                    <span className="material-symbols-outlined text-[16px] block">expand_more</span>
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{m.title}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {m.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono line-clamp-1 mt-0.5">{m.description}</p>
                </div>
              </div>

              <button
                onClick={() => toggleModule(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  m.enabled
                    ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {m.enabled ? 'Visible' : 'Hidden'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={resetToDefaults}
            className="px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold cursor-pointer transition-colors"
          >
            Reset Role Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Save & Close
          </button>
        </div>
      </div>
    </Drawer>
  );
};
