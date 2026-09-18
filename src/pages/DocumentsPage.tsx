import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { DocumentVerification } from '../../server/types/index.js';

export const DocumentsPage: React.FC = () => {
  const { showToast } = useAuth();
  const [docs, setDocs] = useState<DocumentVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyHash, setVerifyHash] = useState('');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/academic/documents');
        if (res.data.success) {
          setDocs(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const handleVerifyCheck = () => {
    if (!verifyHash) return;
    const match = docs.find((d) => d.sha256Hash.toLowerCase().includes(verifyHash.toLowerCase()));
    if (match) {
      showToast('success', 'Document Authentic', `Verified authentic transcript for ${match.studentName} (${match.rollNo})`);
    } else {
      showToast('error', 'Hash Mismatch', 'No document found matching this cryptographic fingerprint.');
    }
  };

  const columns: Column<DocumentVerification>[] = [
    {
      header: 'Certificate ID',
      accessor: (d) => <span className="font-mono font-bold text-slate-800">{d.certificateId || d.documentNo}</span>,
    },
    {
      header: 'Student & Document Type',
      accessor: (d) => (
        <div>
          <span className="font-bold text-slate-900 block leading-tight">{d.docType}</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {d.studentName} ({d.rollNo})
          </span>
        </div>
      ),
    },
    {
      header: 'Cryptographic SHA-256 Fingerprint',
      accessor: (d) => (
        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 p-1 rounded block max-w-xs truncate">
          {d.sha256Hash}
        </span>
      ),
    },
    {
      header: 'Issuing Authority',
      accessor: (d) => (
        <div>
          <span className="text-slate-900 font-medium block">{d.issuingAuthority || d.issuedBy}</span>
          <span className="text-[10px] text-slate-400 font-mono">{d.issuedDate}</span>
        </div>
      ),
    },
    {
      header: 'State',
      align: 'center',
      accessor: (d) => <StatusBadge state={d.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Cryptographic Vault"
        badgeIcon="verified"
        title="Tamper-Proof Document Verification Vault"
        description="Public ledger of cryptographically signed degrees, semester grade transcripts, provisional certificates, and character certificates."
      />

      <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Verify Transcript Authenticity</h3>
        <p className="text-xs text-slate-500">
          Enter partial or full SHA-256 hash printed on the academic credential to check institutional signature.
        </p>
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
            placeholder="Paste SHA-256 hash or Certificate ID (e.g. 8f4b2a...)"
            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
          />
          <button
            onClick={handleVerifyCheck}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer shrink-0"
          >
            Verify Integrity
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={docs}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
      />
    </div>
  );
};
