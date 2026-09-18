import React from 'react';

export interface StepItem {
  number: number;
  label: string;
  sublabel: string;
}

const steps: StepItem[] = [
  { number: 1, label: 'File Ingest', sublabel: 'Stage XLSX/CSV' },
  { number: 2, label: 'Schema Map', sublabel: 'Canonical Bindings' },
  { number: 3, label: 'Taxonomy Binding', sublabel: 'Dept & Course' },
  { number: 4, label: 'Pre-Flight Ping', sublabel: 'Integrity Check' },
  { number: 5, label: 'ACID Gate', sublabel: 'Ceiling/Deficiency' },
  { number: 6, label: 'Deduplication', sublabel: 'Hash Match' },
  { number: 7, label: 'Audit Preview', sublabel: 'Reconciliation' },
  { number: 8, label: 'LMS Broadcast', sublabel: 'Public Release' },
];

interface ImportStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const ImportStepper: React.FC<ImportStepperProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs overflow-x-auto">
      <div className="flex items-center justify-between min-w-[760px] gap-2">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <React.Fragment key={step.number}>
              <div
                onClick={() => onStepClick && onStepClick(step.number)}
                className={`flex items-center gap-2.5 cursor-pointer select-none transition-all ${
                  isCurrent ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-40'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    step.number
                  )}
                </div>
                <div>
                  <h4
                    className={`text-xs font-bold leading-tight ${
                      isCurrent ? 'text-blue-600' : 'text-slate-800'
                    }`}
                  >
                    {step.label}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                    {step.sublabel}
                  </p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 min-w-[16px] transition-all ${
                    currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
