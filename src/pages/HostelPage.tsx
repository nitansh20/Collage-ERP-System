import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Modal } from '../components/common/Modal.js';
import { FormField } from '../components/common/FormField.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { HostelRoom } from '../../server/types/index.js';

export const HostelPage: React.FC = () => {
  const { currentPersona, showToast } = useAuth();
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allocatingRoom, setAllocatingRoom] = useState<HostelRoom | null>(null);

  const isStudent = currentPersona?.role === 'STUDENT' || currentPersona?.role === 'STUDENT_REP';
  const canAllocate = currentPersona?.role === 'SUPER_ADMIN' || currentPersona?.role === 'HOSTEL_WARDEN';

  // Form State
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');

  const fetchHostels = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/hostels');
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingRoom || !canAllocate) return;
    try {
      const res = await api.post(`/hostels/${allocatingRoom.id}/allocate`, {
        studentId: `stu_${Date.now()}`,
        studentName,
        rollNo,
      });
      if (res.data.success) {
        showToast('success', 'Bed Allocated', `Assigned bed in Room ${allocatingRoom.roomNo} to ${studentName} (${rollNo})`);
        setAllocatingRoom(null);
        setStudentName('');
        setRollNo('');
        fetchHostels();
      }
    } catch (err: any) {
      showToast('error', 'Allocation Error', err.message);
    }
  };

  // Locate current student room
  const myAssignedRoom = rooms.find((r) =>
    r.occupants.some(
      (o) =>
        o.rollNo === currentPersona?.staffId ||
        o.studentName.toLowerCase() === (currentPersona?.name || '').toLowerCase()
    )
  );

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText={isStudent ? 'Residential Life' : 'Campus Living & Hostels'}
        badgeIcon="hotel"
        title={isStudent ? 'My Hostel Room & Hall Assignment' : 'Hostel Hall Allocations & Mess Tracking'}
        description={
          isStudent
            ? 'Your designated hostel room allocation, roommate directory, hall warden contact information, and mess attendance rules.'
            : 'Residential block room inventory, bed allotments, warden inspections, and student accommodation telemetry.'
        }
      />

      {isStudent && myAssignedRoom && (
        <div className="p-6 bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-sm border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-300">
              Verified Hall Allotment • Academic Year 2025-26
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Active Resident
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 block">Hostel Block</span>
              <span className="text-lg font-bold text-white mt-0.5 block">{myAssignedRoom.blockName}</span>
              <span className="text-[11px] text-slate-300">Floor {myAssignedRoom.floor}, Wing B</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 block">Room & Bed</span>
              <span className="text-lg font-bold text-white mt-0.5 block font-mono">Room {myAssignedRoom.roomNo}</span>
              <span className="text-[11px] text-blue-300 font-mono">Bed B-1 (Window Side)</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 block">Chief Warden Desk</span>
              <span className="text-lg font-bold text-white mt-0.5 block">Dr. R. K. Saxena</span>
              <span className="text-[11px] text-emerald-400 font-mono">Intercom: #2044 • Hall Office</span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400">Loading room inventory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                    {room.blockName} • Room {room.roomNo}
                  </span>
                  <StatusBadge state={room.status} size="sm" />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Floor & Wing:</span>
                  <span className="font-medium text-slate-800">Floor {room.floor}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Occupancy:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {room.occupied} / {room.capacity} Beds
                  </span>
                </div>

                {/* Bed Occupants List */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                    Allotted Occupants
                  </span>
                  {room.occupants.map((occ, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{occ.studentName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{occ.rollNo}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                        {occ.bedNo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {canAllocate && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setAllocatingRoom(room)}
                    disabled={room.occupied >= room.capacity}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      room.occupied >= room.capacity
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                    }`}
                  >
                    {room.occupied >= room.capacity ? 'Full Capacity' : 'Allocate Available Bed'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Allocate Modal */}
      <Modal
        isOpen={!!allocatingRoom}
        onClose={() => setAllocatingRoom(null)}
        title="Allocate Hostel Bed"
        subtitle={allocatingRoom ? `${allocatingRoom.blockName} Room ${allocatingRoom.roomNo}` : ''}
        maxWidth="sm"
      >
        {allocatingRoom && (
          <form onSubmit={handleAllocateSubmit} className="space-y-4">
            <FormField label="Student Full Name" required>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Leo Vance"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              />
            </FormField>

            <FormField label="Roll Number" required>
              <input
                type="text"
                required
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 2026-CS-022"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono"
              />
            </FormField>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAllocatingRoom(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Bed Allocation
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
