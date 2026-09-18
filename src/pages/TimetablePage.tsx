import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { Modal } from '../components/common/Modal.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { TimetableSlot } from '../../server/types/index.js';

export const TimetablePage: React.FC = () => {
  const { currentPersona, showToast } = useAuth();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal state for adding or editing a timetable slot
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [formData, setFormData] = useState<Partial<TimetableSlot>>({
    day: 'Monday',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    courseCode: 'CS601',
    courseName: 'Distributed Systems & Cloud Computing',
    subject: 'Distributed Systems & Cloud Computing',
    faculty: currentPersona?.name || 'Dr. Rajesh Nair',
    instructor: currentPersona?.name || 'Dr. Rajesh Nair',
    room: 'LH-302',
    batch: 'Batch CSE-A (Sem 6)',
    type: 'Lecture',
  });

  const isFacultyOrAdmin =
    currentPersona?.role === 'FAC_MEMBER' ||
    currentPersona?.role === 'HOD_CSE' ||
    currentPersona?.role === 'SUPER_ADMIN' ||
    currentPersona?.role === 'DEAN_ACADEMICS';

  type TimetableDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  const days: TimetableDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const fetchTimetable = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/timetable');
      if (res.data.success) {
        setSlots(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSlot(null);
    setFormData({
      day: selectedDay as TimetableDay,
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      courseCode: 'CS601',
      courseName: 'Distributed Systems & Cloud Computing',
      subject: 'Distributed Systems & Cloud Computing',
      faculty: currentPersona?.name || 'Dr. Rajesh Nair',
      instructor: currentPersona?.name || 'Dr. Rajesh Nair',
      room: 'LH-302',
      batch: 'Batch CSE-A (Sem 6)',
      type: 'Lecture',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setFormData({
      ...slot,
      day: (slot.dayOfWeek || slot.day) as TimetableDay,
      faculty: slot.faculty || slot.instructor,
      courseName: slot.courseName || slot.subject,
    });
    setIsModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseCode || !formData.room || !formData.startTime || !formData.endTime) {
      showToast('error', 'Incomplete Details', 'Course code, room, and timings are required.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingSlot) {
        // Update existing slot
        const res = await api.put(`/academic/timetable/${editingSlot.id}`, formData);
        if (res.data.success) {
          showToast('success', 'Timetable Updated', `Updated schedule for ${formData.courseCode} on ${formData.day}.`);
          setIsModalOpen(false);
          fetchTimetable();
        }
      } else {
        // Create new slot
        const res = await api.post('/academic/timetable', formData);
        if (res.data.success) {
          showToast('success', 'Lecture Slot Added', `Added ${formData.courseCode} to ${formData.day} schedule.`);
          setIsModalOpen(false);
          fetchTimetable();
        }
      }
    } catch (err: any) {
      showToast('error', 'Failed to Save', err.response?.data?.error || 'Error saving timetable slot.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string, courseCode?: string) => {
    if (!confirm(`Are you sure you want to remove the lecture slot for ${courseCode || 'this course'}?`)) {
      return;
    }

    try {
      const res = await api.delete(`/academic/timetable/${slotId}`);
      if (res.data.success) {
        showToast('info', 'Slot Cancelled', `Removed timetable slot for ${courseCode}.`);
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      }
    } catch (err: any) {
      showToast('error', 'Deletion Failed', err.response?.data?.error || 'Unable to delete timetable slot.');
    }
  };

  const daySlots = slots.filter((s) => (s.dayOfWeek || s.day) === selectedDay);

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Academic Scheduling"
        badgeIcon="calendar_month"
        title="Class Timetable"
        description="Master room allocation schedules, conflict-free lecture slots, laboratory sessions, and assigned course faculty."
        actions={
          isFacultyOrAdmin ? (
            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Timetable Slot</span>
            </button>
          ) : undefined
        }
      />

      {/* Day Selector Tabs & Quick Faculty Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedDay === day
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong>{daySlots.length}</strong> scheduled sessions on <strong>{selectedDay}</strong>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400">Loading timetable matrix...</div>
      ) : daySlots.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-xs space-y-3">
          <span className="material-symbols-outlined text-[32px] text-slate-400 block mx-auto">event_busy</span>
          <p>No scheduled lectures on {selectedDay}.</p>
          {isFacultyOrAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Schedule First Lecture on {selectedDay}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daySlots.map((slot) => (
            <div
              key={slot.id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-600 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                  {slot.startTime} – {slot.endTime}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${
                      slot.type === 'Lab' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {slot.type || 'Lecture'}
                  </span>

                  {isFacultyOrAdmin && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(slot)}
                        title="Edit Timetable Slot"
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id, slot.courseCode)}
                        title="Cancel / Delete Slot"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{slot.courseName || slot.subject}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{slot.courseCode} • {slot.department || slot.batch}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">meeting_room</span>
                  <span className="font-mono font-medium">{slot.room}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                  <span className="font-mono font-medium">{slot.instructor || slot.faculty}</span>
                </div>
              </div>

              {isFacultyOrAdmin && (
                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenEditModal(slot)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Timetable</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* EDIT / CREATE TIMETABLE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSlot ? `Edit Timetable Slot: ${formData.courseCode}` : 'Schedule New Timetable Slot'}
        subtitle="Faculty and Academic Deans can update lecture hall, timings, instructor hours, and cohort batches."
        maxWidth="md"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
              <input
                type="text"
                required
                value={formData.courseCode || ''}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                placeholder="e.g. CS601"
                className="w-full text-xs font-mono font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Day of Week</label>
              <select
                value={formData.day || 'Monday'}
                onChange={(e) => setFormData({ ...formData, day: e.target.value as TimetableDay })}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Course Name</label>
            <input
              type="text"
              required
              value={formData.courseName || formData.subject || ''}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value, subject: e.target.value })}
              placeholder="e.g. Distributed Systems & Cloud Computing"
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
              <input
                type="text"
                required
                value={formData.startTime || ''}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="e.g. 10:00 AM"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
              <input
                type="text"
                required
                value={formData.endTime || ''}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="e.g. 11:00 AM"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Classroom / Room Number</label>
              <input
                type="text"
                required
                value={formData.room || ''}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="e.g. LH-302 or Turing Lab 4"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Session Type</label>
              <select
                value={formData.type || 'Lecture'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="Lecture">Lecture</option>
                <option value="Lab">Laboratory</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Remedial">Arrear Remedial Clinic</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Faculty</label>
              <input
                type="text"
                required
                value={formData.faculty || formData.instructor || ''}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value, instructor: e.target.value })}
                placeholder="e.g. Dr. Rajesh Nair"
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Division</label>
              <input
                type="text"
                value={formData.batch || ''}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                placeholder="e.g. Batch CSE-A (Sem 6)"
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isSaving ? 'Saving Timetable...' : editingSlot ? 'Update Timetable Slot' : 'Create Timetable Slot'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
