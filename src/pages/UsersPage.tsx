import React from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { useAuth } from '../context/AuthContext.js';
import { PersonaProfile } from '../../server/types/index.js';

export const UsersPage: React.FC = () => {
  const { personas, currentPersona, switchPersona, showToast } = useAuth();

  const columns: Column<PersonaProfile>[] = [
    {
      header: 'Identity & Staff ID',
      accessor: (p) => (
        <div className="flex items-center gap-3">
          <img
            src={p.avatar}
            alt={p.name}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{p.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">
              ID: {p.staffId} • {p.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned RBAC Role',
      accessor: (p) => (
        <div>
          <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
            {p.role}
          </span>
          <span className="text-xs text-slate-700 block mt-0.5">{p.roleLabel}</span>
        </div>
      ),
    },
    {
      header: 'Department / Unit',
      accessor: (p) => <span className="text-slate-800 font-medium">{p.department}</span>,
    },
    {
      header: 'Portal Credentials',
      accessor: (p) => (
        <div className="space-y-0.5 text-xs font-mono">
          <div className="text-slate-700">
            <span className="text-slate-400 text-[10px]">ID: </span>
            <span className="font-semibold">{p.staffId}</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            <span className="text-slate-400 text-[10px]">Pass: </span>
            <code className="bg-slate-100 px-1 rounded text-slate-700">{p.password || 'password123'}</code>
          </div>
        </div>
      ),
    },
    {
      header: 'Authorized Modules',
      accessor: (p) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {p.allowedModules.map((m, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200"
            >
              {m}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Action',
      align: 'right',
      accessor: (p) => (
        <button
          onClick={() => switchPersona(p.id)}
          disabled={p.id === currentPersona?.id}
          className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            p.id === currentPersona?.id
              ? 'bg-slate-100 text-slate-400 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
          }`}
        >
          {p.id === currentPersona?.id ? 'Active Persona' : 'Impersonate'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Identity & Access Management"
        badgeIcon="manage_accounts"
        title="IAM Personnel & Role-Based Access Control (RBAC)"
        description="Statutory security profiles, cryptographic clearance policies, and granular module permissions across institutional authorities."
        actions={
          <button
            onClick={() => showToast('info', 'LDAP Directory', 'Institutional Active Directory LDAP is synchronized.')}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Sync LDAP Directory</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={personas}
        keyExtractor={(p) => p.id}
      />
    </div>
  );
};
