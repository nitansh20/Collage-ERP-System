import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { Modal } from '../components/common/Modal.js';
import { FormField } from '../components/common/FormField.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { NoticeCircular } from '../../server/types/index.js';

export const NotificationsPage: React.FC = () => {
  const { currentPersona, showToast } = useAuth();
  const [notices, setNotices] = useState<NoticeCircular[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canBroadcast =
    currentPersona?.role === 'SUPER_ADMIN' ||
    currentPersona?.role === 'DEAN_ACADEMICS' ||
    currentPersona?.role === 'HOD_CSE';

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Academic' | 'Administrative' | 'Examination' | 'General'>('Academic');
  const [targetAudience, setTargetAudience] = useState('All Students');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Urgent' | 'Statutory'>('Standard');

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/notices');
      if (res.data.success) {
        setNotices(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBroadcast) return;
    try {
      const res = await api.post('/notices', {
        title,
        category,
        targetAudience,
        content,
        priority,
      });
      if (res.data.success) {
        showToast('success', 'Circular Broadcasted', `Dispatched official circular: ${title} to ${targetAudience}`);
        setIsModalOpen(false);
        setTitle('');
        setContent('');
        fetchNotices();
      }
    } catch (err: any) {
      showToast('error', 'Broadcast Error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Institutional Notices"
        badgeIcon="campaign"
        title={canBroadcast ? 'Official Circulars, Advisories & Notices' : 'Institutional Notices & Circulars'}
        description={
          canBroadcast
            ? 'Statutory institutional gazette broadcasting academic announcements, fee payment deadlines, holiday calendars, and syndicate decrees.'
            : 'Official university circulars, academic notifications, examination schedules, fee deadlines, and holiday announcements.'
        }
        actions={
          canBroadcast ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Broadcast Official Circular</span>
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400">Loading official gazette...</div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <div
              key={n.id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                    {n.circularNo}
                  </span>
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {n.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                      n.priority === 'Statutory'
                        ? 'bg-rose-100 text-rose-800'
                        : n.priority === 'Urgent'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {n.priority}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">Published: {n.publishedDate}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.content}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Issuer: <strong>{n.issuer}</strong></span>
                <span>Target: <strong>{n.targetAudience}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal (Authorized Staff Only) */}
      {canBroadcast && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Broadcast Statutory Circular"
          subtitle="Dispatches circular immediately to student and faculty portals"
          maxWidth="md"
        >
        <form onSubmit={handleBroadcastSubmit} className="space-y-4">
          <FormField label="Circular Headline" required>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule for End-Semester Practical Assessments"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Category" required>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Academic">Academic</option>
                <option value="Examination">Examination</option>
                <option value="Administrative">Administrative</option>
                <option value="General">General</option>
              </select>
            </FormField>

            <FormField label="Target Group" required>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </FormField>

            <FormField label="Priority" required>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Standard">Standard</option>
                <option value="Urgent">Urgent</option>
                <option value="Statutory">Statutory</option>
              </select>
            </FormField>
          </div>

          <FormField label="Circular Content / Decree" required>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detailed circular text as passed by Academic Council..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
            />
          </FormField>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Dispatch Official Circular
            </button>
          </div>
        </form>
      </Modal>
      )}
    </div>
  );
};
