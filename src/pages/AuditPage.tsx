import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { SearchInput } from '../components/common/SearchInput.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { api } from '../lib/api.js';
import { AuditLogEntry } from '../../server/types/index.js';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/audit-logs');
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || l.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp & IP',
      accessor: (l) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-slate-800 block">{l.timestamp}</span>
          <span className="text-slate-400 text-[10px]">IP: {l.ipAddress}</span>
        </div>
      ),
    },
    {
      header: 'Administrative Actor',
      accessor: (l) => (
        <div>
          <span className="font-bold text-slate-900 block leading-tight">{l.actorName}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 inline-block mt-0.5">
            {l.actorRole}
          </span>
        </div>
      ),
    },
    {
      header: 'Action / Event Type',
      accessor: (l) => (
        <span className="font-mono text-xs font-bold text-blue-600 block">{l.action}</span>
      ),
    },
    {
      header: 'Audit Telemetry & Details',
      accessor: (l) => (
        <div className="max-w-md">
          <p className="text-xs text-slate-700 leading-snug">{l.details}</p>
          <span className="text-[10px] font-mono text-slate-400">
            Target: {l.entity} (#{l.entityId})
          </span>
        </div>
      ),
    },
    {
      header: 'Severity',
      align: 'center',
      accessor: (l) => <StatusBadge state={l.severity} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Institutional Audit Ledger"
        badgeIcon="history_edu"
        title="Tamper-Proof Cryptographic Audit Trail"
        description="Immutable administrative activity stream recording grade modifications, admission approvals, financial challan receipts, and session terminations."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO Only</option>
              <option value="WARNING">WARNING Only</option>
              <option value="CRITICAL">CRITICAL Only</option>
              <option value="BLOCKED">BLOCKED Gate Only</option>
            </select>
          </div>
        }
      />

      <div className="w-full sm:w-80">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter audit entries by action or actor..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredLogs}
        keyExtractor={(l) => l.id}
        isLoading={isLoading}
      />
    </div>
  );
};
