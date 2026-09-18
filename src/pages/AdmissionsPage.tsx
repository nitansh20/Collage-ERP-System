import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Modal } from '../components/common/Modal.js';
import { Drawer } from '../components/common/Drawer.js';
import { FormField } from '../components/common/FormField.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { AdmissionApplication } from '../../server/types/index.js';

interface AdmissionsPageProps {
  isNewModalOpen?: boolean;
  onCloseNewModal?: () => void;
}

export const AdmissionsPage: React.FC<AdmissionsPageProps> = ({
  isNewModalOpen = false,
  onCloseNewModal,
}) => {
  const { showToast } = useAuth();
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [localModalOpen, setLocalModalOpen] = useState(false);

  // Form State
  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [programApplied, setProgramApplied] = useState('B.Tech Computer Science');
  const [entranceScore, setEntranceScore] = useState(88.5);
  const [qualifyingPercentage, setQualifyingPercentage] = useState(91.2);
  const [category, setCategory] = useState('General');

  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admissions');
      if (res.data.success) {
        setApplications(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admissions', {
        applicantName,
        email,
        phone,
        programApplied,
        entranceScore,
        qualifyingPercentage,
        category,
      });
      if (res.data.success) {
        showToast('success', 'Application Registered', `Generated Application #${res.data.data.applicationNo} for ${applicantName}`);
        if (onCloseNewModal) onCloseNewModal();
        setLocalModalOpen(false);
        setApplicantName('');
        setEmail('');
        setPhone('');
        fetchAdmissions();
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: AdmissionApplication['status']) => {
    try {
      const res = await api.patch(`/admissions/${id}/status`, { status });
      if (res.data.success) {
        showToast('info', 'Status Updated', `Application #${res.data.data.applicationNo} transitioned to ${status}`);
        fetchAdmissions();
        if (selectedApp?.id === id) {
          setSelectedApp(res.data.data);
        }
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const isModalVisible = isNewModalOpen || localModalOpen;
  const closeModal = () => {
    if (onCloseNewModal) onCloseNewModal();
    setLocalModalOpen(false);
  };

  const columns: Column<AdmissionApplication>[] = [
    {
      header: 'App Number',
      accessor: (a) => <span className="font-mono font-bold text-slate-900">{a.applicationNo}</span>,
    },
    {
      header: 'Applicant Details',
      accessor: (a) => (
        <div>
          <span className="font-bold text-slate-900 block leading-tight">{a.applicantName}</span>
          <span className="text-[11px] text-slate-500 font-mono">{a.email} • {a.phone}</span>
        </div>
      ),
    },
    {
      header: 'Program Applied',
      accessor: (a) => (
        <div>
          <span className="text-slate-800 font-medium block">{a.programApplied}</span>
          <span className="text-[11px] text-slate-400 font-mono">Quota: {a.allottedQuota}</span>
        </div>
      ),
    },
    {
      header: 'Scores',
      align: 'center',
      accessor: (a) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-blue-600 block">Entrance: {a.entranceScore}</span>
          <span className="text-slate-400 text-[10px]">10+2: {a.qualifyingPercentage}%</span>
        </div>
      ),
    },
    {
      header: 'Scrutiny Status',
      align: 'center',
      accessor: (a) => <StatusBadge state={a.status} size="sm" />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedApp(a)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Review
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Admissions Secretariat"
        badgeIcon="how_to_reg"
        title="Candidate Admissions & Merit Scrutiny"
        description="Statutory intake pipeline for incoming candidates: verify qualifying examination transcripts, check reservation quotas, and allocate seats."
        actions={
          <button
            onClick={() => setLocalModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Register Candidate</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={applications}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        onRowClick={(a) => setSelectedApp(a)}
      />

      {/* Review Drawer */}
      <Drawer
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={selectedApp?.applicantName || 'Application Scrutiny'}
        subtitle={`Application #${selectedApp?.applicationNo} • Date: ${selectedApp?.appliedDate}`}
        width="lg"
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-mono uppercase font-bold">Current Scrutiny State</span>
                <div className="mt-1">
                  <StatusBadge state={selectedApp.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-mono uppercase font-bold">Entrance Percentile</span>
                <div className="text-lg font-bold font-mono text-blue-600 mt-0.5">{selectedApp.entranceScore}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
                Applicant Information
              </h5>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-bold text-slate-900">{selectedApp.applicantName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Contact Email:</span>
                  <span className="font-mono text-slate-900">{selectedApp.email}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="font-mono text-slate-900">{selectedApp.phone}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Applied Academic Program:</span>
                  <span className="font-bold text-slate-900">{selectedApp.programApplied}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Category / Reservation:</span>
                  <span className="font-mono text-slate-900">{selectedApp.category}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Documents Legally Verified:</span>
                  <span className={`font-bold ${selectedApp.documentsVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedApp.documentsVerified ? 'Yes (Sealed)' : 'Pending Inspection'}
                  </span>
                </div>
              </div>
            </div>

            {/* Workflow Action Transitions */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-400 block">
                Administrative Transitions
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'DOCUMENT_VERIFIED')}
                  className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Verify Documents
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'COUNSELING_ALLOCATED')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Allocate Merit Seat
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'OFFER_ACCEPTED')}
                  className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Confirm Acceptance
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'REJECTED')}
                  className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reject Candidate
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Registration Modal */}
      <Modal
        isOpen={isModalVisible}
        onClose={closeModal}
        title="Register New Admission Candidate"
        subtitle="Intake portal for Academic Year 2026-2027"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <FormField label="Candidate Full Name" required>
            <input
              type="text"
              required
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="e.g. Rachel Zane"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email Address" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rachel@domain.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              />
            </FormField>
            <FormField label="Phone Number" required>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 99999 11111"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              />
            </FormField>
          </div>

          <FormField label="Target Program" required>
            <select
              value={programApplied}
              onChange={(e) => setProgramApplied(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
            >
              <option value="B.Tech Computer Science">B.Tech Computer Science & Engineering</option>
              <option value="B.Tech Electronics & Comm">B.Tech Electronics & Communication</option>
              <option value="B.Tech Mechanical Eng">B.Tech Mechanical Engineering</option>
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Entrance Score" required>
              <input
                type="number"
                step="0.1"
                value={entranceScore}
                onChange={(e) => setEntranceScore(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono"
              />
            </FormField>
            <FormField label="10+2 Percentage" required>
              <input
                type="number"
                step="0.1"
                value={qualifyingPercentage}
                onChange={(e) => setQualifyingPercentage(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono"
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
