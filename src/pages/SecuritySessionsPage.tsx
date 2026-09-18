import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ActiveSession } from '../../server/types/index.js';

export const SecuritySessionsPage: React.FC = () => {
  const { showToast } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTerminateAllDialogOpen, setIsTerminateAllDialogOpen] = useState(false);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/sessions');
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      const res = await api.post(`/sessions/${id}/revoke`);
      if (res.data.success) {
        showToast('warning', 'Session Severed', `Invalidated session token for ${res.data.data.userName}`);
        fetchSessions();
      }
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message);
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      const res = await api.post(`/sessions/${id}/unlock`);
      if (res.data.success) {
        showToast('success', 'Session Unlocked', `Restored active workstation token for ${res.data.data.userName}`);
        fetchSessions();
      }
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message);
    }
  };

  const handleTerminateAll = async () => {
    try {
      const res = await api.post('/sessions/terminate-all');
      if (res.data.success) {
        showToast('success', 'Emergency Revocation', res.data.message);
        setIsTerminateAllDialogOpen(false);
        fetchSessions();
      }
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message);
    }
  };

  const columns: Column<ActiveSession>[] = [
    {
      header: 'User & Workstation',
      accessor: (s) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 leading-tight">{s.userName}</span>
            {s.isCurrentSession && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                THIS DEVICE
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">{s.device}</span>
        </div>
      ),
    },
    {
      header: 'IP & Geolocation',
      accessor: (s) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-slate-800 block">{s.ipAddress}</span>
          <span className="text-slate-500 text-[11px]">{s.location}</span>
        </div>
      ),
    },
    {
      header: 'Login & Activity',
      accessor: (s) => (
        <div className="font-mono text-xs text-slate-600">
          <span className="block">Logged in: {s.loginTime}</span>
          <span className="text-slate-400 text-[10px]">Active: {s.lastActive}</span>
        </div>
      ),
    },
    {
      header: 'Security Status',
      align: 'center',
      accessor: (s) => <StatusBadge state={s.status} size="sm" />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          {s.status === 'LOCKED' ? (
            <button
              onClick={() => handleUnlock(s.id)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
            >
              Unlock
            </button>
          ) : s.status === 'ACTIVE' && !s.isCurrentSession ? (
            <button
              onClick={() => handleRevoke(s.id)}
              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
            >
              Sever Session
            </button>
          ) : (
            <span className="text-slate-400 font-mono text-[11px]">Protected</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Zero-Trust IAM Shield"
        badgeIcon="security"
        title="Active Concurrent Sessions & Zero-Trust Telemetry"
        description="Real-time monitor of active JWT authorization tokens, IP geolocation telemetry, workstation locks, and emergency mass session termination."
        actions={
          <button
            onClick={() => setIsTerminateAllDialogOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
            <span>Emergency Terminate All Remote Sessions</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={sessions}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
      />

      <ConfirmDialog
        isOpen={isTerminateAllDialogOpen}
        onClose={() => setIsTerminateAllDialogOpen(false)}
        onConfirm={handleTerminateAll}
        title="Emergency Mass Session Invalidation"
        message="Are you sure you want to forcibly terminate all concurrent administrative sessions across campus? All users will be immediately logged out and required to re-authenticate via MFA."
        confirmLabel="Sever All Concurrent Tokens"
        variant="danger"
      />
    </div>
  );
};
