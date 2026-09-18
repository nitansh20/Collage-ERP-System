import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { BulkResourceImportWizard } from '../components/resources/BulkResourceImportWizard.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import { ResourceImportAudit } from '../../server/types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import {
  Download,
  FileSpreadsheet,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface BulkResourceImportPageProps {
  onNavigate?: (route: string) => void;
}

export const BulkResourceImportPage: React.FC<BulkResourceImportPageProps> = ({ onNavigate }) => {
  const { currentPersona, showToast } = useAuth();
  const [auditLogs, setAuditLogs] = useState<ResourceImportAudit[]>([]);

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/resources/audit-logs');
      if (res.data.success) {
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleDownloadTemplate = () => {
    window.open('/api/resources/template?format=csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Statutory Batch Automation"
        badgeIcon="upload_file"
        title="Bulk Resources & Circulars Ingest Engine"
        description="Statutory 7-stage automated Excel/CSV ingestion pipeline for Lecture Notes, Learning Materials, and Institutional Announcements with strict course, division, and batch referential integrity validation."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download Schema Template</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('/resources')}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                View Published Catalog
              </button>
            )}
          </div>
        }
      />

      {/* Main 7-Stage Pipeline Wizard */}
      <BulkResourceImportWizard
        currentUser={currentPersona}
        onImportComplete={(result) => {
          showToast(
            'success',
            'Transactional Import Committed',
            `Successfully published ${result.importedCount} items distributed to ~${result.distributedCount} students.`
          );
          fetchAuditLogs();
        }}
        onClose={onNavigate ? () => onNavigate('/resources') : undefined}
      />

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recent Ingestion Batches & Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Permanent institutional ledger tracking file uploads, validation yields, and distribution scopes.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAuditLogs}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Refresh Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Uploader</th>
                <th className="py-2.5 px-3">Workbook</th>
                <th className="py-2.5 px-3 text-center">Total</th>
                <th className="py-2.5 px-3 text-center">Success</th>
                <th className="py-2.5 px-3 text-center">Failed</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Error CSV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {log.requestId}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">{log.userName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.userRole}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700 text-xs">
                    {log.fileName}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold">{log.totalRows}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                    {log.successfulRows}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">
                    {log.failedRows}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge state={log.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    {log.failedRows > 0 ? (
                      <button
                        onClick={() => window.open(`/api/resources/error-report/${log.requestId}`, '_blank')}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Error CSV
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-medium text-xs">Clean Batch</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
