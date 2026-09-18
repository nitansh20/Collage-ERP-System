import React from 'react';

interface PageHeaderProps {
  badgeText?: string;
  badgeIcon?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badgeText,
  badgeIcon,
  title,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-1">
        {badgeText && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-100 mb-1">
            {badgeIcon && (
              <span className="material-symbols-outlined text-[14px] leading-none">
                {badgeIcon}
              </span>
            )}
            <span>{badgeText}</span>
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
