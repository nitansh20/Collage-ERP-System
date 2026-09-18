import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Modal } from '../components/common/Modal.js';
import { FormField } from '../components/common/FormField.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { FeeChallan } from '../../server/types/index.js';

export const FeesPage: React.FC = () => {
  const { showToast } = useAuth();
  const [challans, setChallans] = useState<FeeChallan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [payingChallan, setPayingChallan] = useState<FeeChallan | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  const fetchFees = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/fees');
      if (res.data.success) {
        setChallans(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingChallan) return;
    try {
      const res = await api.post(`/fees/${payingChallan.id}/pay`, { amount: payAmount });
      if (res.data.success) {
        showToast('success', 'Payment Ingested', `Processed ₹${payAmount} for Challan #${payingChallan.challanNo}. Receipt: ${res.data.data.receiptNo}`);
        setPayingChallan(null);
        fetchFees();
      }
    } catch (err: any) {
      showToast('error', 'Payment Failed', err.message);
    }
  };

  const columns: Column<FeeChallan>[] = [
    {
      header: 'Challan ID',
      accessor: (f) => <span className="font-mono font-bold text-slate-900">{f.challanNo}</span>,
    },
    {
      header: 'Student Name & Roll',
      accessor: (f) => (
        <div>
          <span className="font-bold text-slate-900 block leading-tight">{f.studentName}</span>
          <span className="text-[11px] text-slate-500 font-mono">{f.rollNo}</span>
        </div>
      ),
    },
    {
      header: 'Fee Head & Due Date',
      accessor: (f) => (
        <div>
          <span className="text-slate-800 font-medium block">{f.feeHead}</span>
          <span className="text-[11px] text-slate-400 font-mono">Due: {f.dueDate}</span>
        </div>
      ),
    },
    {
      header: 'Amounts (INR)',
      accessor: (f) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-slate-900 block">Total: ₹{f.totalAmount.toLocaleString()}</span>
          <span className="text-emerald-700">Paid: ₹{f.paidAmount.toLocaleString()}</span>
          {f.balanceAmount > 0 && (
            <span className="text-rose-600 block text-[10px]">Balance: ₹{f.balanceAmount.toLocaleString()}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment Status',
      align: 'center',
      accessor: (f) => <StatusBadge state={f.status} size="sm" />,
    },
    {
      header: 'Receipt & Action',
      align: 'right',
      accessor: (f) => (
        <div className="flex items-center justify-end gap-1.5">
          {f.balanceAmount > 0 ? (
            <button
              onClick={() => {
                setPayingChallan(f);
                setPayAmount(f.balanceAmount);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
            >
              Collect Dues
            </button>
          ) : (
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {f.receiptNo}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Bursar & Treasury"
        badgeIcon="payments"
        title="Student Fee Challans & Treasury Reconciliation"
        description="Comprehensive accounting ledger for academic tuition, hostel fees, laboratory caution deposits, and statutory digital receipt generation."
      />

      <DataTable
        columns={columns}
        data={challans}
        keyExtractor={(f) => f.id}
        isLoading={isLoading}
      />

      {/* Pay Modal */}
      <Modal
        isOpen={!!payingChallan}
        onClose={() => setPayingChallan(null)}
        title="Record Treasury Payment"
        subtitle={payingChallan ? `Challan #${payingChallan.challanNo} • ${payingChallan.studentName}` : ''}
        maxWidth="sm"
      >
        {payingChallan && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Roll No:</span>
                <span className="font-mono font-bold text-slate-900">{payingChallan.rollNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Challan Amount:</span>
                <span className="font-mono font-bold text-slate-900">₹{payingChallan.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span className="font-mono font-bold text-rose-600">₹{payingChallan.balanceAmount.toLocaleString()}</span>
              </div>
            </div>

            <FormField label="Payment Amount to Ingest (INR)" required>
              <input
                type="number"
                required
                min={1}
                max={payingChallan.balanceAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900"
              />
            </FormField>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingChallan(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Payment & Generate Receipt
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
