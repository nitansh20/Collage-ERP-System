import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { api } from '../lib/api.js';
import { FacultyMember } from '../../server/types/index.js';

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/faculty');
        if (res.data.success) {
          setFaculty(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFaculty();
  }, []);

  const columns: Column<FacultyMember>[] = [
    {
      header: 'Staff Profile',
      accessor: (f) => (
        <div className="flex items-center gap-3">
          <img
            src={f.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
            alt={f.name}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{f.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">{f.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Staff ID & Designation',
      accessor: (f) => (
        <div>
          <span className="font-mono font-bold text-slate-800 block">{f.staffId || f.employeeId}</span>
          <span className="text-[11px] text-slate-600">{f.designation}</span>
        </div>
      ),
    },
    {
      header: 'Department & Qualification',
      accessor: (f) => (
        <div>
          <span className="text-slate-800 font-medium block">{f.department}</span>
          <span className="text-[11px] text-slate-400 font-mono">{f.qualification || f.qualifications}</span>
        </div>
      ),
    },
    {
      header: 'Payroll Band',
      accessor: (f) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-slate-800 block">{f.payrollBand || 'UGC Level 12'}</span>
          <span className="text-emerald-700">₹{(f.netSalary || f.monthlySalary).toLocaleString()} / mo</span>
        </div>
      ),
    },
    {
      header: 'HR Status',
      align: 'center',
      accessor: (f) => <StatusBadge state={f.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Faculty Senate & HR"
        badgeIcon="badge"
        title="Faculty HR, Service Records & Payroll"
        description="Statutory academic staff registry, UGC pay matrix tiers, research publication credentials, and biometric payroll disbursement."
      />

      <DataTable
        columns={columns}
        data={faculty}
        keyExtractor={(f) => f.id}
        isLoading={isLoading}
      />
    </div>
  );
};
