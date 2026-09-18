import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { SearchInput } from '../components/common/SearchInput.js';
import { FilterBar, FilterOption } from '../components/common/FilterBar.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Drawer } from '../components/common/Drawer.js';
import { Modal } from '../components/common/Modal.js';
import { FormField } from '../components/common/FormField.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Student } from '../../server/types/index.js';

export const StudentsPage: React.FC = () => {
  const { showToast } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // New Student Form
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [departmentId, setDepartmentId] = useState('dept_cs');
  const [program, setProgram] = useState('B.Tech');
  const [batch, setBatch] = useState('2023-2027');

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/students', {
        params: { search, department: selectedDept },
      });
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, selectedDept]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        rollNo,
        email,
        phone,
        department,
        departmentId,
        program,
        semester: 1,
        batch,
        cgpa: 0.0,
        attendancePct: 100,
        status: 'ACTIVE' as const,
        feeStatus: 'PAID' as const,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        admissionCategory: 'General Merit',
        guardianName: 'Parent / Guardian',
        guardianPhone: '+91 98888 11111',
        address: 'Campus Hostel Block B',
        rfidTag: `RFID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      };

      const res = await api.post('/students', payload);
      if (res.data.success) {
        showToast('success', 'Student Enrolled', `Enrolled ${name} (Roll: ${rollNo}) into academic register.`);
        setIsEnrollModalOpen(false);
        // Reset form
        setName('');
        setRollNo('');
        setEmail('');
        setPhone('');
        fetchStudents();
      }
    } catch (err: any) {
      showToast('error', 'Enrollment Error', err.response?.data?.error || err.message);
    }
  };

  const deptFilters: FilterOption[] = [
    { id: 'ALL', label: 'All Departments' },
    { id: 'dept_cs', label: 'Computer Science' },
    { id: 'dept_ec', label: 'Electronics' },
    { id: 'dept_me', label: 'Mechanical' },
  ];

  const columns: Column<Student>[] = [
    {
      header: 'Student Profile',
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <img
            src={s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
            alt={s.name}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{s.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">{s.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Roll / Registration',
      accessor: (s) => <span className="font-mono font-bold text-slate-800">{s.rollNo}</span>,
    },
    {
      header: 'Program & Dept',
      accessor: (s) => (
        <div>
          <span className="text-slate-900 font-medium block">{s.program}</span>
          <span className="text-[11px] text-slate-500">{s.department} (Sem {s.semester})</span>
        </div>
      ),
    },
    {
      header: 'CGPA',
      align: 'center',
      accessor: (s) => {
        const score = s.cgpa ?? s.gpa ?? 0;
        return (
          <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
            {score > 0 ? score.toFixed(2) : 'N/A'}
          </span>
        );
      },
    },
    {
      header: 'Attendance',
      align: 'center',
      accessor: (s) => {
        const att = s.attendancePct ?? s.attendancePercent ?? 0;
        return (
          <span
            className={`font-mono font-bold text-xs ${
              att < 75 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {att}%
          </span>
        );
      },
    },
    {
      header: 'Academic Status',
      align: 'center',
      accessor: (s) => <StatusBadge state={s.status} size="sm" />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (s) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStudent(s);
          }}
          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
        >
          View Profile
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Institutional Registry"
        badgeIcon="school"
        title="Students Directory & Cohort Management"
        description="Comprehensive roster of enrolled students across all academic faculties, tracking biometric attendance, semester CGPA, fee dues, and statutory compliance."
        actions={
          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Enroll New Student</span>
          </button>
        }
      />

      {/* Search and Filters */}
      <div className="space-y-3">
        <FilterBar
          options={deptFilters}
          selectedId={selectedDept}
          onSelect={setSelectedDept}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student name, roll number, or email..."
            className="w-full sm:w-72"
          />
        </FilterBar>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={students}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        onRowClick={(s) => setSelectedStudent(s)}
      />

      {/* Student Detail Drill-Down Drawer */}
      <Drawer
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent?.name || 'Student Profile'}
        subtitle={`Roll Number: ${selectedStudent?.rollNo} • RFID: ${selectedStudent?.rfidTag || 'VERIFIED'}`}
        width="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <img
                src={selectedStudent.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                alt={selectedStudent.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">{selectedStudent.name}</h4>
                  <StatusBadge state={selectedStudent.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedStudent.program} • {selectedStudent.department}
                </p>
                <p className="text-xs text-slate-400">Batch: {selectedStudent.batch} (Semester {selectedStudent.semester})</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Cumulative CGPA</span>
                <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                  {(selectedStudent.cgpa ?? selectedStudent.gpa ?? 0) > 0 ? (selectedStudent.cgpa ?? selectedStudent.gpa ?? 0).toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Attendance</span>
                <span className={`text-lg font-bold font-mono mt-0.5 block ${
                  (selectedStudent.attendancePct ?? selectedStudent.attendancePercent ?? 0) < 75 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {selectedStudent.attendancePct ?? selectedStudent.attendancePercent ?? 0}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider">
                Contact & Guardian Information
              </h5>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Institutional Email:</span>
                  <span className="font-mono text-slate-900">{selectedStudent.email}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Contact Number:</span>
                  <span className="font-mono text-slate-900">{selectedStudent.phone}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Guardian / Next of Kin:</span>
                  <span className="text-slate-900">{selectedStudent.guardianName} ({selectedStudent.guardianPhone})</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Residential Address:</span>
                  <span className="text-slate-900">{selectedStudent.address || 'Campus Residence / Day Scholar'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tuition Fee Status:</span>
                  <StatusBadge state={selectedStudent.feeStatus} size="sm" />
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Enroll New Student to Academic Register"
        subtitle="Mandatory registration for newly admitted candidate."
        maxWidth="lg"
      >
        <form onSubmit={handleEnrollSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Roll Number" required>
              <input
                type="text"
                required
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 2026-CS-055"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Institutional Email" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@nexusuniv.edu"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Contact Phone" required>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Department" required>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setDepartment(
                    e.target.value === 'dept_cs'
                      ? 'Computer Science & Engineering'
                      : e.target.value === 'dept_ec'
                      ? 'Electronics & Communication'
                      : 'Mechanical Engineering'
                  );
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              >
                <option value="dept_cs">Computer Science & Engineering</option>
                <option value="dept_ec">Electronics & Communication</option>
                <option value="dept_me">Mechanical Engineering</option>
              </select>
            </FormField>

            <FormField label="Batch Period" required>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono"
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Confirm Enrollment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
