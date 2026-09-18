import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Modal } from '../components/common/Modal.js';
import { FormField } from '../components/common/FormField.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LibraryBook } from '../../server/types/index.js';

export const LibraryPage: React.FC = () => {
  const { currentPersona, showToast } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [issuingBook, setIssuingBook] = useState<LibraryBook | null>(null);
  const [studentName, setStudentName] = useState('');

  const isStudent = currentPersona?.role === 'STUDENT' || currentPersona?.role === 'STUDENT_REP';
  const canCirculate = currentPersona?.role === 'SUPER_ADMIN';

  const fetchLibrary = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/library/books');
      if (res.data.success) {
        setBooks(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleReserve = (b: LibraryBook) => {
    showToast(
      'success',
      'Hold Placed Successfully',
      `Hold placed on "${b.title}". Please present your student ID at Circulation Desk (Rack: ${b.rackLocation}) within 48 hours.`
    );
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuingBook || !canCirculate) return;
    try {
      const res = await api.post(`/library/books/${issuingBook.id}/issue`, { studentName });
      if (res.data.success) {
        showToast('success', 'Book Issued', `Issued copy of "${issuingBook.title}" to ${studentName}`);
        setIssuingBook(null);
        setStudentName('');
        fetchLibrary();
      }
    } catch (err: any) {
      showToast('error', 'Issue Failed', err.message);
    }
  };

  const handleReturn = async (b: LibraryBook) => {
    if (!canCirculate) return;
    try {
      const res = await api.post(`/library/books/${b.id}/return`);
      if (res.data.success) {
        showToast('info', 'Book Restocked', `Restocked returned copy of "${b.title}" to ${b.rackLocation}`);
        fetchLibrary();
      }
    } catch (err: any) {
      showToast('error', 'Return Failed', err.message);
    }
  };

  const columns: Column<LibraryBook>[] = [
    {
      header: 'ISBN & Reference',
      accessor: (b) => <span className="font-mono font-bold text-slate-800">{b.isbn}</span>,
    },
    {
      header: 'Title & Author',
      accessor: (b) => (
        <div>
          <span className="font-bold text-slate-900 block leading-tight">{b.title}</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {b.author} • {b.category || b.department}
          </span>
        </div>
      ),
    },
    {
      header: 'Rack Location',
      accessor: (b) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
          {b.rackLocation}
        </span>
      ),
    },
    {
      header: 'Available Copies',
      align: 'center',
      accessor: (b) => (
        <span className="font-mono font-bold text-xs">
          {b.availableCopies} / {b.totalCopies}
        </span>
      ),
    },
    {
      header: 'Circulation Status',
      align: 'center',
      accessor: (b) => <StatusBadge state={b.status} size="sm" />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          {canCirculate ? (
            <>
              <button
                onClick={() => setIssuingBook(b)}
                disabled={b.availableCopies <= 0}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-30 cursor-pointer shadow-2xs"
              >
                Issue
              </button>
              <button
                onClick={() => handleReturn(b)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Return
              </button>
            </>
          ) : (
            <button
              onClick={() => handleReserve(b)}
              disabled={b.availableCopies <= 0}
              className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-2xs"
            >
              {b.availableCopies > 0 ? 'Place Hold' : 'Unavailable'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText={isStudent ? 'Campus Library Catalog' : 'Central Library System'}
        badgeIcon="local_library"
        title={isStudent ? 'Central Library Catalog & Digital Discovery' : 'Institutional Library Catalog & Circulation'}
        description={
          isStudent
            ? 'Search academic book holdings, course reference texts, shelf locations, and check physical copy availability.'
            : 'Book holdings database, rack telemetry, active student borrowings, and fine calculation gateway.'
        }
      />

      <DataTable
        columns={columns}
        data={books}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
      />

      {/* Issue Modal */}
      <Modal
        isOpen={!!issuingBook}
        onClose={() => setIssuingBook(null)}
        title="Issue Library Book to Student"
        subtitle={issuingBook ? `"${issuingBook.title}" (ISBN: ${issuingBook.isbn})` : ''}
        maxWidth="sm"
      >
        {issuingBook && (
          <form onSubmit={handleIssueSubmit} className="space-y-4">
            <FormField label="Borrower Student Full Name" required>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Leo Vance"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              />
            </FormField>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIssuingBook(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Issue
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
