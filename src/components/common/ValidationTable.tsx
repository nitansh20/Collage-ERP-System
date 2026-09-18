import React from 'react';
import { StatusBadge } from './StatusBadge.js';

export interface ValidationItem {
  id: string;
  rowNumber: number;
  identifier: string;
  title: string;
  secondaryInfo: string;
  status: 'VALID' | 'WARNING' | 'CRITICAL' | 'DEFICIENCY' | 'EXCLUDED' | 'COMMITTED' | 'PUBLISHED' | 'ARCHIVED' | 'INVALID' | 'DUPLICATE';
  errorDetails?: string;
}

interface ValidationTableProps {
  items: ValidationItem[];
  onExcludeDeficiencies?: () => void;
  title?: string;
  subtitle?: string;
  actionButtonText?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
}

export const ValidationTable: React.FC<ValidationTableProps> = ({
  items,
  onExcludeDeficiencies,
  title = 'Pre-Flight Schema & Referential Integrity Verification',
  subtitle = 'Scanning uploaded workbook against system taxonomy, duplicate keys, and bounds constraints.',
  actionButtonText,
  onAction,
  isActionLoading,
}) => {
  const deficiencies = items.filter(
    (i) => i.status === 'CRITICAL' || i.status === 'DEFICIENCY'
  );
  const warnings = items.filter((i) => i.status === 'WARNING');
  const valid = items.filter(
    (i) => i.status === 'VALID' || i.status === 'COMMITTED' || i.status === 'PUBLISHED'
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {items.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {deficiencies.length > 0 && onExcludeDeficiencies && (
            <button
              onClick={onExcludeDeficiencies}
              className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              <span>Auto-Exclude Deficiencies ({deficiencies.length})</span>
            </button>
          )}

          {actionButtonText && onAction && (
            <button
              onClick={onAction}
              disabled={deficiencies.length > 0 || isActionLoading}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                deficiencies.length > 0 || isActionLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isActionLoading && (
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
              )}
              <span>{actionButtonText}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 text-center py-2.5">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-600">
            {valid.length} Passed
          </span>
        </div>
        <div>
          <span className="text-xs font-mono font-bold text-amber-600">
            {warnings.length} Warnings
          </span>
        </div>
        <div>
          <span className="text-xs font-mono font-bold text-rose-600">
            {deficiencies.length} Deficiencies Flagged
          </span>
        </div>
      </div>

      {/* Grid Rows */}
      <div className="overflow-x-auto max-h-[440px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider font-mono sticky top-0 bg-slate-100">
              <th className="p-3 w-12 text-center">Row</th>
              <th className="p-3">Reference / Key</th>
              <th className="p-3">Record Details</th>
              <th className="p-3">Integrity State</th>
              <th className="p-3">Verification Details & Deficiencies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className={`transition-colors ${
                  item.status === 'CRITICAL' || item.status === 'DEFICIENCY'
                    ? 'bg-rose-50/50'
                    : item.status === 'WARNING'
                    ? 'bg-amber-50/40'
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <td className="p-3 text-center font-mono text-slate-400 font-bold">
                  #{item.rowNumber}
                </td>
                <td className="p-3 font-mono font-bold text-slate-900">{item.identifier}</td>
                <td className="p-3">
                  <span className="font-semibold text-slate-800 block">{item.title}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{item.secondaryInfo}</span>
                </td>
                <td className="p-3">
                  <StatusBadge state={item.status} size="sm" />
                </td>
                <td className="p-3">
                  {item.errorDetails ? (
                    <span className="text-rose-700 font-medium text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      <span>{item.errorDetails}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>Compliant with institutional schema</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
