import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DashboardModuleCard } from '../components/common/DashboardModuleCard.js';
import { DashboardCustomizer } from '../components/common/DashboardCustomizer.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { useDashboard } from '../context/DashboardContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import {
  Student,
  ExaminationMark,
  ResourceUploadItem,
  FeeChallan,
  ActiveSession,
  AuditLogEntry,
  TimetableSlot,
} from '../../server/types/index.js';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
  onOpenNewAdmission: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenNewAdmission }) => {
  const { authorizedModules, isCustomizing, setIsCustomizing } = useDashboard();
  const { currentPersona, hasAccess } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<ExaminationMark[]>([]);
  const [resources, setResources] = useState<ResourceUploadItem[]>([]);
  const [fees, setFees] = useState<FeeChallan[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const role = currentPersona?.role || 'SUPER_ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const canViewMarks = role === 'SUPER_ADMIN' || role === 'COE_OFFICER' || role.startsWith('HOD') || role.startsWith('FAC') || role.startsWith('STUDENT');
        const canViewFees = role === 'SUPER_ADMIN' || role === 'BURSAR_FINANCE' || role.startsWith('STUDENT');
        const canViewSessions = role === 'SUPER_ADMIN';
        const canViewLogs = role === 'SUPER_ADMIN' || role === 'COE_OFFICER' || role === 'DEAN_ACADEMICS' || role === 'BURSAR_FINANCE';

        // Safely query services with Promise.allSettled to respect role boundaries
        const [sRes, mRes, rRes, fRes, sessRes, logRes, ttRes] = await Promise.allSettled([
          api.get('/students'),
          canViewMarks ? api.get('/examinations/marks') : Promise.resolve({ data: { success: true, data: [] } }),
          api.get('/resources'),
          canViewFees ? api.get('/fees') : Promise.resolve({ data: { success: true, data: [] } }),
          canViewSessions ? api.get('/sessions') : Promise.resolve({ data: { success: true, data: [] } }),
          canViewLogs ? api.get('/audit-logs') : Promise.resolve({ data: { success: true, data: [] } }),
          api.get('/academic/timetable'),
        ]);

        if (sRes.status === 'fulfilled' && sRes.value.data?.success) setStudents(sRes.value.data.data);
        if (mRes.status === 'fulfilled' && mRes.value.data?.success) setMarks(mRes.value.data.data);
        if (rRes.status === 'fulfilled' && rRes.value.data?.success) setResources(rRes.value.data.data);
        if (fRes.status === 'fulfilled' && fRes.value.data?.success) setFees(fRes.value.data.data);
        if (sessRes.status === 'fulfilled' && sessRes.value.data?.success) setSessions(sessRes.value.data.data);
        if (logRes.status === 'fulfilled' && logRes.value.data?.success) setLogs(logRes.value.data.data.slice(0, 5));
        if (ttRes.status === 'fulfilled' && ttRes.value.data?.success) setTimetable(ttRes.value.data.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentPersona]);

  // Derived KPIs
  const totalStudents = students.length || 8;
  const criticalMarksCount = marks.filter((m) => m.status === 'CRITICAL').length;
  const validMarksCount = marks.filter((m) => m.status === 'VALID').length;
  const deficientResourcesCount = resources.filter((r) => r.status === 'DEFICIENCY').length;

  const totalFeeExpected = fees.reduce((acc, f) => acc + f.totalAmount, 0) || 270000;
  const totalFeeCollected = fees.reduce((acc, f) => acc + f.paidAmount, 0) || 165000;
  const feeRealizationPct = totalFeeExpected > 0 ? Math.round((totalFeeCollected / totalFeeExpected) * 100) : 61;

  const activeSessionsCount = sessions.filter((s) => s.status === 'ACTIVE').length || 1;

  // Active enabled modules strictly authorized for this role
  const activeModules = authorizedModules
    .filter((m) => m.enabled)
    .sort((a, b) => a.order - b.order);

  const getDashboardHeaderDetails = () => {
    switch (role) {
      case 'STUDENT':
      case 'STUDENT_REP':
        return {
          badgeText: 'Enrolled Student Portal',
          badgeIcon: 'school',
          title: `Welcome, ${currentPersona?.name} • Student Dossier`,
          description: `Roll No: ${currentPersona?.staffId} | Department: ${currentPersona?.department}. Review class schedules, attendance quotas, syllabi, fee challans, and official transcripts.`,
        };
      case 'FAC_MEMBER':
        return {
          badgeText: 'Faculty & Instructor Console',
          badgeIcon: 'co_present',
          title: `Faculty Workstation • ${currentPersona?.name}`,
          description: `${currentPersona?.roleLabel} | Manage assigned courses, record class attendance, and commit examination marks to the ACID statutory gate.`,
        };
      case 'HOD_CSE':
        return {
          badgeText: 'Department Head Console',
          badgeIcon: 'badge',
          title: `HOD Management Desk • ${currentPersona?.department}`,
          description: `Oversee department faculty allocations, academic syllabi, bulk asset ingestion, and student progression cohorts.`,
        };
      case 'COE_OFFICER':
        return {
          badgeText: 'Controller of Examinations',
          badgeIcon: 'fact_check',
          title: `COE Master Ledger & Marks Sealing Console`,
          description: `Statutory examination ledger gate, pre-flight score audits, out-of-bounds anomaly mitigation, and sealed transcripts.`,
        };
      case 'BURSAR_FINANCE':
        return {
          badgeText: 'University Treasury & Accounts',
          badgeIcon: 'payments',
          title: `Finance Directorate & Fee Accounting`,
          description: `Track semester fee realization, generate student bank challans, verify tuition dues, and monitor statutory financial audits.`,
        };
      case 'DEAN_ACADEMICS':
        return {
          badgeText: 'Academic Affairs & Admissions',
          badgeIcon: 'how_to_reg',
          title: `Dean's Academic Governance Cockpit`,
          description: `Candidate admissions scrutiny, merit quota allocations, university curriculum structures, and accreditation metrics.`,
        };
      case 'HOSTEL_WARDEN':
        return {
          badgeText: 'Residential Life & Hostels',
          badgeIcon: 'hotel',
          title: `Hostel Warden Operational Console`,
          description: `Manage hall bed occupancy, student night roll checks, room allotments, and campus living notices.`,
        };
      default:
        return {
          badgeText: 'Statutory Institutional Command Center',
          badgeIcon: 'domain',
          title: `Institutional Overview • ${currentPersona?.roleLabel || 'System Admin'}`,
          description: `Unified real-time management cockpit for academic administration, COE examination gates, bulk data pipelines, and zero-trust security.`,
        };
    }
  };

  const headerInfo = getDashboardHeaderDetails();

  // Render role-tailored top KPI metric strip with strict least-privilege principles
  const renderRoleMetricsStrip = () => {
    // 1. STUDENT
    if (role === 'STUDENT' || role === 'STUDENT_REP') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Attendance</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">fact_check</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">91.4%</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Above 75% Statutory Cutoff</span>
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Academic Term</span>
              <span className="material-symbols-outlined text-blue-600 text-[20px]">school</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">Sem VI (Even)</div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">6 Theory & 2 Laboratory Courses</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Fee Challan Status</span>
              <span className="material-symbols-outlined text-amber-600 text-[20px]">receipt_long</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">PAID (Zero Dues)</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Receipt #REC-2024-8842 verified</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Hostel Allotment</span>
              <span className="material-symbols-outlined text-rose-600 text-[20px]">hotel</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">Hall 4 • 308-B</div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">Tagore Hall of Residence</p>
          </div>
        </div>
      );
    }

    // 2. CONTROLLER OF EXAMINATIONS (COE)
    if (role === 'COE_OFFICER') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Staged Mark Records</span>
              <span className="material-symbols-outlined text-purple-600 text-[20px]">rule</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? '...' : marks.length} Candidates
            </div>
            <p className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">sync</span>
              <span>CS601 & CS602 Continuous Assessment</span>
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Pre-Flight Compliant</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? '...' : validMarksCount} Records
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Ready for permanent ledger sealing</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-700">Score Ceiling Violations</span>
              <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? '...' : `${criticalMarksCount} Flagged`}
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">Exceeds statutory 70-mark ceiling</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-purple-700">COE Master Ledger Gate</span>
              <span className="material-symbols-outlined text-purple-600 text-[20px]">lock</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">ACID Verified</div>
            <p className="text-[11px] text-purple-700 font-semibold mt-1">Cryptographic checksums synchronized</p>
          </div>
        </div>
      );
    }

    // 3. FINANCE & BURSAR
    if (role === 'BURSAR_FINANCE') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Fee Realization</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">payments</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? '...' : `${feeRealizationPct}%`}
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              ₹{(totalFeeCollected / 100000).toFixed(2)}L realized of ₹{(totalFeeExpected / 100000).toFixed(2)}L dues
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Total Revenue Collected</span>
              <span className="material-symbols-outlined text-blue-600 text-[20px]">account_balance</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ₹{totalFeeCollected.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Direct University Treasury Credits</span>
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-700">Pending Challans</span>
              <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {fees.filter((f) => f.status !== 'PAID').length || 3} Dues
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              ₹{((totalFeeExpected - totalFeeCollected) / 100000).toFixed(2)}L uncollected dues
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Treasury Gateway</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">receipt_long</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">100% Reconciled</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">HDFC & SBI Bank Clearance Active</p>
          </div>
        </div>
      );
    }

    // 4. FACULTY MEMBER
    if (role === 'FAC_MEMBER') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Assigned Courses</span>
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">auto_stories</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">2 Courses</div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">CS601 Cloud & CS602 Compilers</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Today's Lectures</span>
              <span className="material-symbols-outlined text-blue-600 text-[20px]">calendar_today</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">2 Scheduled</div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">10:00 AM LH-204 & 02:00 PM Lab 3</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Class Attendance</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">how_to_reg</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">91.8% Avg</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">68 Students Enrolled (Div A)</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Marks Upload Status</span>
              <span className="material-symbols-outlined text-purple-600 text-[20px]">upload_file</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">ACID Active</div>
            <p className="text-[11px] text-purple-700 font-semibold mt-1">Continuous assessment marks portal open</p>
          </div>
        </div>
      );
    }

    // 5. HEAD OF DEPARTMENT (HOD_CSE)
    if (role === 'HOD_CSE') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Department Cohort</span>
              <span className="material-symbols-outlined text-blue-600 text-[20px]">groups</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">120 Students</div>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">B.Tech Computer Science (Div A & B)</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Department Faculty</span>
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">badge</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">6 Instructors</div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">All Course Allocations Synchronized</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Department Attendance</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">fact_check</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">90.4% Avg</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">2 Defaulters flagged below 75%</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Curriculum Syllabi</span>
              <span className="material-symbols-outlined text-teal-600 text-[20px]">menu_book</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">24 Modules</div>
            <p className="text-[11px] text-teal-700 font-semibold mt-1">100% Accredited Syllabus Mapped</p>
          </div>
        </div>
      );
    }

    // 6. DEAN ACADEMICS
    if (role === 'DEAN_ACADEMICS') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Active University Cohort</span>
              <span className="material-symbols-outlined text-blue-600 text-[20px]">school</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? '...' : totalStudents} Students
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>Across CSE, ECE, & MECH</span>
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Academic Programs</span>
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">domain</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">3 Disciplines</div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">B.Tech Approved Statutory Syllabi</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-700">Admissions Scrutiny</span>
              <span className="material-symbols-outlined text-amber-600 text-[20px]">how_to_reg</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">24 Candidates</div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">Merit quota counseling active</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Statutory Accreditation</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">NAAC A++</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">NBA Tier-1 Compliance Certified</p>
          </div>
        </div>
      );
    }

    // 7. HOSTEL WARDEN
    if (role === 'HOSTEL_WARDEN') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Total Bed Capacity</span>
              <span className="material-symbols-outlined text-rose-600 text-[20px]">hotel</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">450 Beds</div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">Halls 1, 2, 3 (Boys) & Hall 4 (Girls)</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-700">Current Occupancy</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">bed</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">92.4%</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">416 Resident Students Allotted</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold">Night Roll Compliance</span>
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">verified_user</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">98.8%</div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">Tagore & Ramanujan Halls Verified</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-700">Maintenance Logs</span>
              <span className="material-symbols-outlined text-amber-600 text-[20px]">build</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">2 Work Orders</div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">Plumbing repairs in Hall 2 scheduled</p>
          </div>
        </div>
      );
    }

    // 8. SUPER ADMIN / DEFAULT
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-bold">Active Cohort</span>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">school</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLoading ? '...' : totalStudents.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+99.8% Academic Continuity</span>
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-bold">Fee Realization</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">payments</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLoading ? '...' : `${feeRealizationPct}%`}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            ₹{(totalFeeCollected / 100000).toFixed(1)}L realized / ₹{(totalFeeExpected / 100000).toFixed(1)}L dues
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-bold">COE Ledger Gate</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">fact_check</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLoading ? '...' : criticalMarksCount > 0 ? `${criticalMarksCount} Flagged` : '0 Breaches'}
          </div>
          <p
            className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
              criticalMarksCount > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {criticalMarksCount > 0 ? 'warning' : 'verified'}
            </span>
            <span>{criticalMarksCount > 0 ? 'ACID Lock Active' : 'Pre-flight verified'}</span>
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-bold">Active Sessions</span>
            <span className="material-symbols-outlined text-purple-600 text-[20px]">security</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLoading ? '...' : `${activeSessionsCount} Live`}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>Zero Geolocation Anomalies</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText={headerInfo.badgeText}
        badgeIcon={headerInfo.badgeIcon}
        title={headerInfo.title}
        description={headerInfo.description}
        actions={
          <div className="flex items-center gap-2">
            {/* Widget Customization Trigger */}
            <button
              onClick={() => setIsCustomizing(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Customize Widgets</span>
            </button>

            {/* Role-governed action buttons strictly for least privilege */}
            {(role === 'STUDENT' || role === 'STUDENT_REP') && (
              <button
                onClick={() => onNavigate('/timetable')}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>My Timetable</span>
              </button>
            )}

            {role === 'FAC_MEMBER' && (
              <>
                <button
                  onClick={() => onNavigate('/attendance')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">fact_check</span>
                  <span>Mark Attendance</span>
                </button>
                <button
                  onClick={() => onNavigate('/bulk/marks')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Marks</span>
                </button>
              </>
            )}

            {role === 'COE_OFFICER' && (
              <>
                <button
                  onClick={() => onNavigate('/bulk/validation')}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">rule</span>
                  <span>Schema Pre-Flight Audit</span>
                </button>
                <button
                  onClick={() => onNavigate('/documents')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Seal Transcripts</span>
                </button>
              </>
            )}

            {role === 'BURSAR_FINANCE' && (
              <button
                onClick={() => onNavigate('/fees')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                <span>Open Fee Platform</span>
              </button>
            )}

            {role === 'HOSTEL_WARDEN' && (
              <button
                onClick={() => onNavigate('/hostels')}
                className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">hotel</span>
                <span>Hostel Allotments</span>
              </button>
            )}

            {role === 'DEAN_ACADEMICS' && hasAccess('/admissions') && (
              <button
                onClick={onOpenNewAdmission}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                <span>New Admission</span>
              </button>
            )}
          </div>
        }
      />

      {/* Role-Tailored Top Metric Strip */}
      {renderRoleMetricsStrip()}

      {/* Render Configured & Role-Authorized Dashboard Modules */}
      <div className="space-y-6">
        {activeModules.map((module) => {
          // 1. STUDENT ACADEMIC SUMMARY WIDGET
          if (module.id === 'student_academics_summary') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/academic')}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    View Full Syllabus Handbooks →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Enrolled Courses (Sem VI)</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">CS601, CS602, CS603, CS604</div>
                    <p className="text-[11px] text-slate-500 mt-1">Computer Science & Engineering • Div A</p>
                  </div>
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-mono uppercase font-bold">Cumulative GPA</span>
                    <div className="text-xl font-bold text-emerald-900 mt-1">8.84 CGPA (First Class Dist.)</div>
                    <p className="text-[11px] text-emerald-700 mt-1">Official Transcripts Sealed by COE</p>
                  </div>
                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200">
                    <span className="text-xs text-blue-700 font-mono uppercase font-bold">Attendance Quota Check</span>
                    <div className="text-xl font-bold text-blue-900 mt-1">91.4% Present</div>
                    <p className="text-[11px] text-blue-700 mt-1">Eligible for End-Term Examination</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 2. STUDENT TODAY'S TIMETABLE WIDGET
          if (module.id === 'student_timetable_today') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/timetable')}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Complete Weekly Schedule →
                  </button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        09:00 - 10:00 AM
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">Room LH-204</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">CS601: Distributed Cloud Systems</h5>
                    <p className="text-[11px] text-slate-500">Instructor: Dr. P. Sundaram</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                        10:15 - 11:15 AM
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">Lab CSE-3</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">CS602: Compiler Design Lab</h5>
                    <p className="text-[11px] text-slate-500">Instructor: Dr. Rajesh Nair</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        02:00 - 03:00 PM
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">Room LH-202</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">CS604: High Performance Computing</h5>
                    <p className="text-[11px] text-slate-500">Instructor: Prof. Evelyn Vance</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 3. STUDENT DUES & HOSTEL
          if (module.id === 'student_dues_hostel') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/fees')}
                    className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Download Fee Receipts →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-mono uppercase font-bold">Tuition Fee Ledger</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">₹65,000 / Semester VI</div>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1">Paid in full on 14 Jan 2026</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300">
                      PAID
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-mono uppercase font-bold">Residential Accommodation</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">Room 308-B (Tagore Hall)</div>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">Warden: Col. R. S. Rathore</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-300">
                      ALLOCATED
                    </span>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 4. FACULTY COURSE DUTIES
          if (module.id === 'faculty_course_duties') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/bulk/marks')}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Faculty Marks Upload →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Assigned Subject</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">CS601: Cloud Architecture</div>
                    <p className="text-[11px] text-slate-500 mt-1">Division: DIV-A • 68 Students</p>
                  </div>
                  <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200">
                    <span className="text-xs text-indigo-700 font-mono uppercase font-bold">Marks Upload Status</span>
                    <div className="text-xl font-bold text-indigo-900 mt-1">ACID Gate Active</div>
                    <p className="text-[11px] text-indigo-700 mt-1">Continuous assessment marks staged</p>
                  </div>
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-mono uppercase font-bold">Attendance Record</span>
                    <div className="text-xl font-bold text-emerald-900 mt-1">42 / 45 Lectures Logged</div>
                    <p className="text-[11px] text-emerald-700 mt-1">Syllabus Completion: 93.3%</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 5. FACULTY TODAY'S TEACHING SCHEDULE & QUICK ATTENDANCE
          if (module.id === 'faculty_today_lectures') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/attendance')}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Attendance Console →
                  </button>
                }
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            10:00 - 11:00 AM
                          </span>
                          <span className="text-xs font-bold text-slate-900">CS601: Cloud Architecture</span>
                        </div>
                        <p className="text-xs text-slate-500">Venue: Lecture Hall 204 • Div A (68 Students)</p>
                      </div>
                      <button
                        onClick={() => onNavigate('/attendance')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        Take Attendance
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                            02:00 - 04:00 PM
                          </span>
                          <span className="text-xs font-bold text-slate-900">CS602: Cloud Architecture Lab</span>
                        </div>
                        <p className="text-xs text-slate-500">Venue: Systems Lab 3 • Div A (Batch 1)</p>
                      </div>
                      <button
                        onClick={() => onNavigate('/attendance')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        Take Attendance
                      </button>
                    </div>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 6. ATTENDANCE TELEMETRY & DEFAULTERS WATCH
          if (module.id === 'attendance_pulse') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/attendance')}
                    className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    View All Attendance Logs →
                  </button>
                }
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-mono uppercase font-bold">Class Average</span>
                    <div className="text-2xl font-bold text-emerald-950 mt-1">91.8%</div>
                    <p className="text-xs text-emerald-700 mt-1">66 of 68 students meet the 75% quota threshold</p>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                    <span className="text-xs text-amber-800 font-mono uppercase font-bold">Defaulters Alert</span>
                    <div className="text-2xl font-bold text-amber-950 mt-1">2 Flagged Students</div>
                    <p className="text-xs text-amber-700 mt-1">Below statutory 75% mandatory requirement</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Flagged Candidates</span>
                    <div className="space-y-1.5 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">Kavya Pillai (23ME014)</span>
                        <span className="text-rose-600 font-mono font-bold">71.4% (Barred)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">Rohan Mehra (22EC009)</span>
                        <span className="text-amber-600 font-mono font-bold">73.2% (Warning)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 7. EXAM MARKS PIPELINE (COE, FACULTY, HOD, ADMIN)
          if (module.id === 'exam_marks_pipeline') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/bulk/marks')}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open ACID Marks Gateway →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Staged Exam Mark Records</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{marks.length} Candidates</div>
                    <p className="text-[11px] text-slate-500 mt-1">Course: CS601 - Cloud Architecture</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-mono uppercase font-bold">Pre-Flight Compliant</span>
                    <div className="text-xl font-bold text-emerald-900 mt-1">{validMarksCount} Records</div>
                    <p className="text-[11px] text-emerald-700 mt-1">Ready for permanent COE ledger sealing</p>
                  </div>
                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200">
                    <span className="text-xs text-rose-700 font-mono uppercase font-bold">Critical Out-of-Bounds</span>
                    <div className="text-xl font-bold text-rose-900 mt-1">{criticalMarksCount} Violations</div>
                    <p className="text-[11px] text-rose-700 mt-1">Theory score exceeds statutory 70-mark ceiling</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 8. COE TRANSCRIPTS & DEGREE SEALING (COE, ADMIN)
          if (module.id === 'coe_transcript_status') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/documents')}
                    className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Document Verification →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200">
                    <span className="text-xs text-purple-800 font-mono uppercase font-bold">Sealed Transcripts</span>
                    <div className="text-xl font-bold text-purple-950 mt-1">128 Grade Sheets</div>
                    <p className="text-xs text-purple-700 mt-1">SHA-256 tamper-evident digital signatures active</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Pending COE Sign-Off</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">0 Batches Awaiting</div>
                    <p className="text-xs text-slate-500 mt-1">All verified continuous assessment scores sealed</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-mono uppercase font-bold">Degree Verification</span>
                    <div className="text-xl font-bold text-emerald-900 mt-1">Instant QR Code Active</div>
                    <p className="text-xs text-emerald-700 mt-1">Statutory graduation ledgers synchronized</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 9. FEE PLATFORM & TREASURY RECONCILIATION (FINANCE & SUPER ADMIN ONLY)
          if (module.id === 'fee_collections') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/fees')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    Open Fee Platform →
                  </button>
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                      <span className="text-xs text-emerald-800 font-mono uppercase font-bold">Realization Rate</span>
                      <div className="text-2xl font-bold text-emerald-950 mt-1">{feeRealizationPct}%</div>
                      <div className="w-full bg-emerald-200 h-2 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${feeRealizationPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-mono uppercase font-bold">Total Collected (Cash & Bank)</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">₹{totalFeeCollected.toLocaleString()}</div>
                      <p className="text-xs text-slate-500 mt-1">Credited to University Treasury Main A/C</p>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                      <span className="text-xs text-amber-800 font-mono uppercase font-bold">Outstanding Semester Dues</span>
                      <div className="text-2xl font-bold text-amber-950 mt-1">
                        ₹{(totalFeeExpected - totalFeeCollected).toLocaleString()}
                      </div>
                      <p className="text-xs text-amber-700 mt-1">
                        {fees.filter((f) => f.status !== 'PAID').length} pending student challans
                      </p>
                    </div>
                  </div>

                  {/* Recent Challans Quick Review */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Recent Fee Challans & Treasury Status</span>
                      <button
                        onClick={() => onNavigate('/fees')}
                        className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                      >
                        Manage All Challans ({fees.length}) →
                      </button>
                    </div>
                    <div className="divide-y divide-slate-200/60 bg-white">
                      {fees.slice(0, 3).map((f) => (
                        <div key={f.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{f.studentName}</span>
                            <span className="text-slate-400 font-mono ml-2">({f.rollNo})</span>
                            <span className="text-slate-500 block text-[11px]">Challan #{f.challanNo} • {f.semester}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold font-mono text-slate-900">₹{f.totalAmount.toLocaleString()}</span>
                            <StatusBadge state={f.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 10. FINANCIAL REPORTS & GATEWAYS SUMMARY (FINANCE & ADMIN)
          if (module.id === 'financial_reports_summary') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/audit')}
                    className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    View Treasury Audit Logs →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Tuition Revenue</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">₹1,45,000 Realized</div>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">Semester VI Tuition Verified</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Hostel & Mess Realization</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">₹20,000 Realized</div>
                    <p className="text-xs text-slate-500 mt-1">Hall Accommodations Reconciled</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-mono uppercase font-bold">Payment Gateways</span>
                    <div className="text-xl font-bold text-emerald-950 mt-1">SBI & HDFC Online</div>
                    <p className="text-xs text-emerald-700 mt-1">100% Digital Receipts Auto-Issued</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 11. BULK RESOURCE INGEST (ADMIN, HOD, DEAN)
          if (module.id === 'bulk_resource_ingest') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/bulk/resources')}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Launch 8-Stage Pipeline →
                  </button>
                }
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Lecture Materials & Circulars Automation</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                        8-Stage Ingestion
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Automated Excel ingestion pipeline with canonical mapping, taxonomy binding, and deficiency exclusion before publishing to LMS.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-slate-900">{resources.length} Staged</div>
                      <div className="text-[11px] text-slate-500">{deficientResourcesCount} Deficiencies Flagged</div>
                    </div>
                    <button
                      onClick={() => onNavigate('/bulk/resources')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      Process Batch
                    </button>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 12. ADMISSIONS FUNNEL (DEAN, ADMIN)
          if (module.id === 'admissions_funnel') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/admissions')}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Admissions Scrutiny →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Applications Received</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">24 Applications</div>
                    <p className="text-xs text-slate-500 mt-1">B.Tech 2026-2030 Admissions Cycle</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-mono uppercase font-bold">Verified Merit Dossiers</span>
                    <div className="text-xl font-bold text-emerald-950 mt-1">18 Verified</div>
                    <p className="text-xs text-emerald-700 mt-1">State counseling merit cutoffs met</p>
                  </div>
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                    <span className="text-xs text-amber-800 font-mono uppercase font-bold">Pending Document Scrutiny</span>
                    <div className="text-xl font-bold text-amber-950 mt-1">6 In Progress</div>
                    <p className="text-xs text-amber-700 mt-1">Category & domicile certificates review</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 13. UNIVERSITY SYLLABI & ARREARS STATUS (DEAN, HOD, ADMIN)
          if (module.id === 'academic_curriculum_status') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/academic')}
                    className="px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Curriculum & Arrear Manager →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Approved Syllabi</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">6 Active Courses</div>
                    <p className="text-xs text-slate-500 mt-1">24 Modular course breakdowns</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-mono uppercase font-bold">Credit Distribution</span>
                    <div className="text-xl font-bold text-emerald-950 mt-1">160 Degree Credits</div>
                    <p className="text-xs text-emerald-700 mt-1">Statutory AICTE model curriculum</p>
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200">
                    <span className="text-xs text-indigo-800 font-mono uppercase font-bold">Arrear & Remedial Clinics</span>
                    <div className="text-xl font-bold text-indigo-950 mt-1">Saturday Clinic Active</div>
                    <p className="text-xs text-indigo-700 mt-1">Remedial schedules and coordinators set</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 14. HOSTEL REGISTER & BED OCCUPANCY (WARDEN, ADMIN)
          if (module.id === 'hostel_warden_summary') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/hostels')}
                    className="px-3 py-1 bg-pink-50 text-pink-700 hover:bg-pink-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Manage Hostel Rooms →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block">Hall 1 (Ramanujan)</span>
                    <span className="text-xs text-slate-500">Boys • 120 Beds</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">112 Occupied</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">93.3% Occupancy</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block">Hall 2 (Aryabhatta)</span>
                    <span className="text-xs text-slate-500">Boys • 110 Beds</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">102 Occupied</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">92.7% Occupancy</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block">Hall 3 (Bhabha)</span>
                    <span className="text-xs text-slate-500">Boys • 110 Beds</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">98 Occupied</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">89.0% Occupancy</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block">Hall 4 (Tagore)</span>
                    <span className="text-xs text-slate-500">Girls • 110 Beds</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">104 Occupied</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">94.5% Occupancy</span>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 15. HOSTEL NIGHT ROLL CALL (WARDEN, ADMIN)
          if (module.id === 'hostel_night_roll') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/hostels')}
                    className="px-3 py-1 bg-pink-50 text-pink-700 hover:bg-pink-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Night Register →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-mono uppercase font-bold">Night Roll Attendance</span>
                    <div className="text-xl font-bold text-emerald-950 mt-1">98.8% Verified</div>
                    <p className="text-xs text-emerald-700 mt-1">411 of 416 residents present at 10:00 PM curfew</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Approved Leave Passes</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">5 Active Passes</div>
                    <p className="text-xs text-slate-500 mt-1">Parental consent and warden approvals verified</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-mono uppercase font-bold">Curfew Security Status</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">Gates Locked</div>
                    <p className="text-xs text-slate-500 mt-1">Biometric gate telemetry synchronized</p>
                  </div>
                </div>
              </DashboardModuleCard>
            );
          }

          // 16. ZERO-TRUST ACTIVE SESSIONS (SUPER ADMIN ONLY)
          if (module.id === 'security_sessions') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/settings/security')}
                    className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Manage Sessions & Zero-Trust →
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sessions.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 font-mono text-xs">
                          {s.device.substring(0, 2)}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{s.userName}</h5>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {s.device} • {s.location}
                          </p>
                        </div>
                      </div>
                      <StatusBadge state={s.status} size="sm" />
                    </div>
                  ))}
                </div>
              </DashboardModuleCard>
            );
          }

          // 17. AUDIT FEED (SUPER ADMIN, COE, BURSAR)
          if (module.id === 'audit_feed') {
            return (
              <DashboardModuleCard
                key={module.id}
                module={module}
                actions={
                  <button
                    onClick={() => onNavigate('/audit')}
                    className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    View All Audit Trails →
                  </button>
                }
              >
                <div className="space-y-2.5">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 truncate block">
                            {log.action} • {log.details}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.actorName} ({log.actorRole}) • IP: {log.ipAddress}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatusBadge state={log.severity} size="sm" />
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardModuleCard>
            );
          }

          // Default fallback card
          return (
            <DashboardModuleCard key={module.id} module={module}>
              <div className="p-4 text-center text-slate-400 text-xs font-mono">
                Real-time operational stream synchronized for {module.title}
              </div>
            </DashboardModuleCard>
          );
        })}
      </div>

      <DashboardCustomizer
        isOpen={isCustomizing}
        onClose={() => setIsCustomizing(false)}
      />
    </div>
  );
};
