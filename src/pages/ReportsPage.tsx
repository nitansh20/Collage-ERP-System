import React from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { useAuth } from '../context/AuthContext.js';

export const ReportsPage: React.FC = () => {
  const { showToast } = useAuth();

  const statutoryReports = [
    {
      id: 'rep_naac',
      title: 'NAAC Institutional SSR Compliance Digest',
      code: 'NAAC-2026-Q1',
      description: 'Annual Quality Assurance Report (AQAR) covering student-teacher ratio, research publications, library footfalls, and infrastructure utilization.',
      format: 'PDF + XLSX Audit Pack',
      status: 'AUDITED & CERTIFIED',
      lastRun: '2026-03-01',
    },
    {
      id: 'rep_nirf',
      title: 'NIRF Academic & Research Performance Index',
      code: 'NIRF-RANKING-2026',
      description: 'National Institutional Ranking Framework data ingest: Graduation outcomes, faculty with PhD, patent applications, and executive education revenue.',
      format: 'Statutory XML + CSV',
      status: 'READY FOR SUBMISSION',
      lastRun: '2026-02-15',
    },
    {
      id: 'rep_aicte',
      title: 'AICTE Mandatory Disclosure & Roster Approval',
      code: 'AICTE-EOA-2026',
      description: 'Extension of Approval (EOA) compliance report verifying lab equipment, sanctioned intake seats, student barrier-free access, and faculty roster.',
      format: 'PDF Signed Certificate',
      status: 'APPROVED',
      lastRun: '2026-01-20',
    },
    {
      id: 'rep_coe',
      title: 'COE Master Ledger Consolidated Gazetted Broad-Sheet',
      code: 'COE-EXAM-BROADSHEET',
      description: 'Comprehensive course-wise candidate grade distributions, passing percentages, out-of-bounds error audit logs, and transcript hashes.',
      format: 'Cryptographic Ledger Broad-Sheet',
      status: 'SEALED',
      lastRun: '2026-03-10',
    },
    {
      id: 'rep_finance',
      title: 'Bursar Annual Tuition Realization & Defaulter Ledger',
      code: 'FIN-CHALLAN-AUDIT',
      description: 'Reconciled student fee receipts, bank challan transaction IDs, outstanding hostel dues, and student financial aid subsidies.',
      format: 'XLSX Workbook',
      status: 'RECONCILED',
      lastRun: '2026-03-08',
    },
  ];

  const handleDownload = (r: typeof statutoryReports[0]) => {
    showToast('success', 'Report Exported', `Generated statutory export for "${r.title}" (${r.format})`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Statutory Institutional Audit"
        badgeIcon="analytics"
        title="Statutory Compliance & Regulatory Reports"
        description="Formal compliance digests for National Assessment and Accreditation Council (NAAC), National Institutional Ranking Framework (NIRF), AICTE, and University Senate."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {statutoryReports.map((r) => (
          <div
            key={r.id}
            className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                  {r.code}
                </span>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {r.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{r.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{r.description}</p>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Format: {r.format}</span>
                <span>Audited: {r.lastRun}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => handleDownload(r)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Export Audit Package</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
