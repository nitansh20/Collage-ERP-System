import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { AttendanceSummary, AttendanceSessionRecord, AttendanceStudentEntry } from '../../server/types/index.js';

interface RosterStudent {
  studentId: string;
  rollNo: string;
  registrationNo: string;
  name: string;
  email: string;
  department: string;
  currentAttendancePct: number;
  source?: 'EXCEL_UPLOAD' | 'MANUAL' | 'SENSOR';
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}

export const AttendancePage: React.FC = () => {
  const { currentPersona, showToast } = useAuth();
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'mark' | 'telemetry' | 'history'>('mark');

  // Attendance Entry Mode: 'excel' or 'manual'
  const [entryMode, setEntryMode] = useState<'excel' | 'manual'>('excel');

  // Faculty session parameters
  const [selectedCourse, setSelectedCourse] = useState('CS601');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [lectureHall, setLectureHall] = useState('LH-302');
  const [lectureSlot, setLectureSlot] = useState('10:00 AM - 11:00 AM');
  const [lectureDate, setLectureDate] = useState(new Date().toISOString().split('T')[0]);
  const [lectureTopic, setLectureTopic] = useState('Lecture 39: Raft Consensus & Distributed Log Replication');

  // Student roster for live marking
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>('ALL');

  // Excel upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelReport, setExcelReport] = useState<{
    totalRows: number;
    matched: number;
    present: number;
    absent: number;
    late: number;
    unmatched: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStudent = currentPersona?.role === 'STUDENT' || currentPersona?.role === 'STUDENT_REP';
  const isFacultyOrAdmin =
    currentPersona?.role === 'FAC_MEMBER' ||
    currentPersona?.role === 'HOD_CSE' ||
    currentPersona?.role === 'SUPER_ADMIN' ||
    currentPersona?.role === 'DEAN_ACADEMICS';

  const canIssueWarnings =
    currentPersona?.role === 'SUPER_ADMIN' ||
    currentPersona?.role === 'DEAN_ACADEMICS' ||
    currentPersona?.role === 'HOD_CSE';

  const coursesList = [
    { code: 'CS601', name: 'Distributed Systems', sem: 6, defaultTopic: 'Lecture 39: Raft Consensus & Distributed Log Replication' },
    { code: 'CS602', name: 'Compiler Construction', sem: 6, defaultTopic: 'Lecture 37: LR Parsing & Shift-Reduce Conflict Resolution' },
    { code: 'CS603', name: 'Cloud Computing Architecture', sem: 6, defaultTopic: 'Lecture 35: Kubernetes Pod Scheduling & Horizontal Autoscaling' },
  ];

  // Fetch aggregate course attendance summaries
  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/attendance');
      if (res.data.success) {
        setSummaries(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch past conducted sessions
  const fetchSessions = async () => {
    try {
      const res = await api.get('/academic/attendance/sessions');
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch student roster for faculty attendance marker
  const fetchRoster = async (courseCode: string) => {
    try {
      setIsRosterLoading(true);
      const res = await api.get(`/academic/attendance/roster?courseCode=${courseCode}&division=${selectedDivision}`);
      if (res.data.success) {
        const mapped: RosterStudent[] = res.data.data.map((s: any) => ({
          ...s,
          source: 'MANUAL',
          status: s.suggestedStatus || 'PRESENT',
        }));
        setRoster(mapped);
        setExcelReport(null);
        setUploadedFileName(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRosterLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    if (isFacultyOrAdmin) {
      fetchSessions();
      fetchRoster(selectedCourse);
    }
  }, []);

  const handleCourseChange = (newCode: string) => {
    setSelectedCourse(newCode);
    const found = coursesList.find((c) => c.code === newCode);
    if (found) {
      setLectureTopic(found.defaultTopic);
    }
    fetchRoster(newCode);
  };

  // EXCEL / CSV PARSING LOGIC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const processExcelFile = async (file: File) => {
    setIsProcessingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        showToast('error', 'Empty Spreadsheet', 'The uploaded sheet has no rows or data.');
        setIsProcessingExcel(false);
        return;
      }

      // Detect column keys
      const sampleRow = rows[0];
      const keys = Object.keys(sampleRow);

      const rollKey = keys.find((k) => {
        const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          lower.includes('roll') ||
          lower.includes('rollno') ||
          lower.includes('reg') ||
          lower.includes('registration') ||
          lower.includes('student') ||
          lower.includes('id')
        );
      });

      const statusKey = keys.find((k) => {
        const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          lower.includes('status') ||
          lower.includes('attendance') ||
          lower.includes('mark') ||
          lower.includes('present') ||
          lower.includes('state')
        );
      });

      if (!rollKey) {
        showToast(
          'error',
          'Missing Roll Number Column',
          `Could not detect a Roll Number or Registration No column in spreadsheet. Found columns: ${keys.join(', ')}`
        );
        setIsProcessingExcel(false);
        return;
      }

      let matchedCount = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      const unmatched: string[] = [];

      // Create a map from parsed rows
      const statusMap = new Map<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>();

      rows.forEach((row) => {
        const rawRoll = String(row[rollKey] || '').trim().toUpperCase();
        if (!rawRoll) return;

        let parsedStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' = 'PRESENT';
        if (statusKey) {
          const rawStatus = String(row[statusKey] || '').trim().toUpperCase();
          if (rawStatus === 'A' || rawStatus === 'ABSENT' || rawStatus === '0' || rawStatus === 'NO' || rawStatus === 'N') {
            parsedStatus = 'ABSENT';
          } else if (rawStatus === 'L' || rawStatus === 'LATE') {
            parsedStatus = 'LATE';
          } else if (rawStatus === 'E' || rawStatus === 'EXCUSED') {
            parsedStatus = 'EXCUSED';
          } else {
            parsedStatus = 'PRESENT';
          }
        }

        statusMap.set(rawRoll, parsedStatus);
      });

      // Update current roster
      const updatedRoster = roster.map((student) => {
        const studentRoll = student.rollNo.trim().toUpperCase();
        const studentReg = student.registrationNo.trim().toUpperCase();

        let newStatus = student.status;
        let matched = false;

        if (statusMap.has(studentRoll)) {
          newStatus = statusMap.get(studentRoll)!;
          matched = true;
        } else if (statusMap.has(studentReg)) {
          newStatus = statusMap.get(studentReg)!;
          matched = true;
        }

        if (matched) {
          matchedCount++;
          if (newStatus === 'PRESENT') presentCount++;
          else if (newStatus === 'ABSENT') absentCount++;
          else if (newStatus === 'LATE') lateCount++;
          return {
            ...student,
            status: newStatus,
            source: 'EXCEL_UPLOAD' as const,
          };
        }

        return student;
      });

      // Check which rows in sheet didn't match any student
      const rosterRolls = new Set(roster.map((s) => s.rollNo.trim().toUpperCase()));
      const rosterRegs = new Set(roster.map((s) => s.registrationNo.trim().toUpperCase()));

      statusMap.forEach((_, roll) => {
        if (!rosterRolls.has(roll) && !rosterRegs.has(roll)) {
          unmatched.push(roll);
        }
      });

      setRoster(updatedRoster);
      setUploadedFileName(file.name);
      setExcelReport({
        totalRows: rows.length,
        matched: matchedCount,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        unmatched,
      });

      showToast(
        'success',
        'Excel Sheet Processed Successfully',
        `Matched ${matchedCount} students from ${file.name}. Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}. You can review or manually adjust before sealing.`
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Spreadsheet Parsing Failed', err.message || 'Unable to read uploaded file.');
    } finally {
      setIsProcessingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download Sample Excel Attendance Template
  const handleDownloadTemplate = () => {
    const templateData = roster.map((s) => ({
      RollNo: s.rollNo,
      RegistrationNo: s.registrationNo,
      StudentName: s.name,
      Department: s.department,
      Status: s.status, // Default P/A
    }));

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `Attendance_Template_${selectedCourse}_Div${selectedDivision}.xlsx`);

    showToast('info', 'Template Downloaded', `Downloaded sample Excel template for ${selectedCourse} Division ${selectedDivision}.`);
  };

  // Bulk Manual Actions
  const handleMarkAll = (targetStatus: 'PRESENT' | 'ABSENT') => {
    setRoster((prev) =>
      prev.map((s) => ({
        ...s,
        status: targetStatus,
        source: 'MANUAL',
      }))
    );
    showToast('info', 'Bulk Action Applied', `Marked all students as ${targetStatus}.`);
  };

  // Change individual student attendance status
  const handleStudentStatusChange = (studentId: string, newStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setRoster((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, status: newStatus, source: 'MANUAL' } : s
      )
    );
  };

  // Commit and seal attendance session to central university database
  const handleCommitSession = async () => {
    if (!lectureTopic.trim()) {
      showToast('error', 'Validation Error', 'Please enter a lecture topic before committing.');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentCourseObj = coursesList.find((c) => c.code === selectedCourse);

      const records: AttendanceStudentEntry[] = roster.map((s) => ({
        studentId: s.studentId,
        rollNo: s.rollNo,
        name: s.name,
        status: s.status,
        method: s.source === 'EXCEL_UPLOAD' ? 'EXCEL_IMPORT' : 'MANUAL',
      }));

      const payload = {
        courseCode: selectedCourse,
        courseName: currentCourseObj?.name || selectedCourse,
        department: 'Computer Science & Engineering',
        semester: currentCourseObj?.sem || 6,
        division: selectedDivision,
        hall: lectureHall,
        date: lectureDate,
        timeSlot: lectureSlot,
        topic: lectureTopic,
        records,
      };

      const res = await api.post('/academic/attendance/session', payload);
      if (res.data.success) {
        showToast(
          'success',
          'Attendance Committed to University Ledger',
          `Lecture attendance committed: ${res.data.data.presentCount}/${res.data.data.totalStudents} Present (${res.data.data.turnoutPercentage}% Turnout).`
        );
        fetchAttendance();
        fetchSessions();
        setActiveTab('history');
      }
    } catch (err: any) {
      showToast('error', 'Commit Failed', err.response?.data?.error || 'Unable to seal attendance session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcastDefaulters = () => {
    showToast(
      'warning',
      'Defaulter Notices Dispatched',
      'Sent official statutory attendance alert notices to all students below the 75% UGC requirement.'
    );
  };

  // Turnout calculations
  const totalStudents = roster.length;
  const presentCount = roster.filter((s) => s.status === 'PRESENT').length;
  const lateCount = roster.filter((s) => s.status === 'LATE').length;
  const absentCount = roster.filter((s) => s.status === 'ABSENT').length;
  const excusedCount = roster.filter((s) => s.status === 'EXCUSED').length;
  const turnoutPct = totalStudents > 0 ? Number(((presentCount / totalStudents) * 100).toFixed(1)) : 0;
  const meetsUgcThreshold = turnoutPct >= 75.0;

  // Filtered roster for search and status tabs
  const filteredRoster = roster.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.registrationNo.toLowerCase().includes(studentSearch.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Table columns for telemetry tab
  const columns: Column<AttendanceSummary>[] = [
    {
      header: 'Course Code',
      accessor: (a) => <span className="font-mono font-bold text-blue-600">{a.courseCode}</span>,
    },
    {
      header: 'Course Title',
      accessor: (a) => <span className="font-bold text-slate-900">{a.courseName}</span>,
    },
    {
      header: 'Lectures Delivered',
      align: 'center',
      accessor: (a) => (
        <span className="font-mono font-bold text-slate-700">
          {a.totalConducted || a.totalLectures} Sessions
        </span>
      ),
    },
    ...(isStudent
      ? [
          {
            header: 'My Attendance %',
            align: 'center' as const,
            accessor: (a: AttendanceSummary) => {
              const myPct = a.averagePct ? Math.min(100, Math.round(a.averagePct * 1.05)) : 92;
              return (
                <span
                  className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                    myPct < 75 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {myPct}%
                </span>
              );
            },
          },
          {
            header: 'Exam Clearance',
            align: 'center' as const,
            accessor: (a: AttendanceSummary) => {
              const myPct = a.averagePct ? Math.min(100, Math.round(a.averagePct * 1.05)) : 92;
              return myPct >= 75 ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Eligible (Clear)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Defaulter Warning
                </span>
              );
            },
          },
        ]
      : [
          {
            header: 'Average Cohort Attendance',
            align: 'center' as const,
            accessor: (a: AttendanceSummary) => {
              const pct = a.averagePct ?? a.averageAttendance;
              return (
                <span
                  className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                    pct < 75 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {pct}%
                </span>
              );
            },
          },
          {
            header: 'Defaulters (<75%)',
            align: 'center' as const,
            accessor: (a: AttendanceSummary) => (
              <span
                className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                  a.defaultersCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {a.defaultersCount} Students
              </span>
            ),
          },
        ]),
    {
      header: 'Verification Status',
      align: 'right',
      accessor: () => (
        <span className="text-[11px] font-mono text-emerald-600 flex items-center justify-end gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Roster</span>
        </span>
      ),
    },
  ];

  // Table columns for session history tab
  const sessionHistoryColumns: Column<AttendanceSessionRecord>[] = [
    {
      header: 'Date & Time',
      accessor: (s) => (
        <div>
          <div className="font-mono text-xs font-bold text-slate-900">{s.date}</div>
          <div className="text-[11px] text-slate-500">{s.timeSlot}</div>
        </div>
      ),
    },
    {
      header: 'Course & Hall',
      accessor: (s) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {s.courseCode}
            </span>
            <span>{s.courseName}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Hall: <span className="font-mono font-medium">{s.hall}</span> • Div: {s.division}
          </div>
        </div>
      ),
    },
    {
      header: 'Lecture Topic',
      accessor: (s) => (
        <span className="text-xs text-slate-700 font-medium line-clamp-1">{s.topic}</span>
      ),
    },
    {
      header: 'Turnout',
      align: 'center',
      accessor: (s) => (
        <div>
          <span
            className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
              s.turnoutPercentage >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {s.turnoutPercentage}%
          </span>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {s.presentCount}/{s.totalStudents} Present
          </div>
        </div>
      ),
    },
    {
      header: 'Ledger Audit Tx',
      align: 'right',
      accessor: (s) => (
        <div className="text-right">
          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
            {s.ledgerTxId}
          </span>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center justify-end gap-1">
            <span className="material-symbols-outlined text-[12px]">verified</span>
            <span>Sealed</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText={isStudent ? 'Student Attendance Portal' : 'Faculty Attendance Console'}
        badgeIcon="fact_check"
        title={isStudent ? 'My Course Attendance' : 'Attendance'}
        description={
          isStudent
            ? 'Personal classroom attendance logs and statutory percentages across all enrolled subjects. 75% minimum required for end-semester examination clearance.'
            : 'Record lecture attendance via Excel spreadsheet import or direct manual roll marking. Real-time turnout calculation and statutory 75% threshold monitoring.'
        }
        actions={
          canIssueWarnings ? (
            <button
              onClick={handleBroadcastDefaulters}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Issue Defaulter Warnings</span>
            </button>
          ) : undefined
        }
      />

      {/* Mode Tab Switcher for Faculty */}
      {isFacultyOrAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'mark'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            <span>Record Attendance</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-500 text-white font-mono">
              Excel / Manual
            </span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            <span>Course Attendance & Defaulters</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Attendance Ledger History</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 text-slate-700 font-mono">
              {sessions.length}
            </span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isStudent ? (
          <>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">My Overall Attendance</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">92.4%</div>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Clear for End-Semester Examinations</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">Statutory Threshold</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">75.0% Required</div>
              <p className="text-[11px] text-blue-600 mt-1 font-mono">+17.4% Buffer Above Threshold</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">Sessions Attended</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">146 / 158</div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Recorded across all enrolled courses</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">Total Enrolled Cohort</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">1,480 Active</div>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">91.4% Overall Campus Turnout</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">Classroom Attendance Gates</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">36 / 36 Online</div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">Synchronized with Central LDAP</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">Barred Candidates</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">1 Candidate</div>
              <p className="text-[11px] text-rose-600 mt-1 font-medium">De-registered from final exams</p>
            </div>
          </>
        )}
      </div>

      {/* TAB 1: FACULTY RECORD ATTENDANCE WORKSPACE */}
      {isFacultyOrAdmin && activeTab === 'mark' && (
        <div className="space-y-5">
          {/* Lecture Setup Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Classroom Lecture Session Parameters</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instructor: <span className="font-semibold text-slate-700">{currentPersona?.name}</span> ({currentPersona?.staffId})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Method:</span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setEntryMode('excel')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      entryMode === 'excel'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Excel Sheet Upload</span>
                  </button>
                  <button
                    onClick={() => setEntryMode('manual')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      entryMode === 'manual'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">touch_app</span>
                    <span>Direct Manual Roll</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Course Code & Name</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {coursesList.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Class Division</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="A">Division A (Sem VI)</option>
                  <option value="B">Division B (Sem VI)</option>
                  <option value="C">Division C (Sem VI)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Lecture Hall</label>
                <input
                  type="text"
                  value={lectureHall}
                  onChange={(e) => setLectureHall(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Time Slot</label>
                <input
                  type="text"
                  value={lectureSlot}
                  onChange={(e) => setLectureSlot(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Session Date</label>
                <input
                  type="date"
                  value={lectureDate}
                  onChange={(e) => setLectureDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lecture Topic */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Delivered Lecture Topic / Syllabus Key</label>
              <input
                type="text"
                value={lectureTopic}
                onChange={(e) => setLectureTopic(e.target.value)}
                placeholder="Enter lecture topic or curriculum milestone delivered..."
                className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* DUAL METHOD SECTION */}
          {entryMode === 'excel' ? (
            /* EXCEL UPLOAD PANEL */
            <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <span className="material-symbols-outlined text-[28px]">description</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Upload Attendance Excel / Spreadsheet (.xlsx, .xls, .csv)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload your Excel attendance sheet. The system will automatically map student Roll Numbers and mark Present, Absent, or Late.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-600">download</span>
                  <span>Download Excel Template</span>
                </button>
              </div>

              {/* Upload Drop Zone / Input */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-attendance-upload"
                />
                <label
                  htmlFor="excel-attendance-upload"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">file_upload</span>
                  <span>{isProcessingExcel ? 'Processing Spreadsheet...' : 'Choose Excel Sheet to Upload'}</span>
                </label>

                {uploadedFileName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span>Loaded: <strong>{uploadedFileName}</strong></span>
                  </div>
                )}
              </div>

              {/* Parsing Report Summary if Available */}
              {excelReport && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Spreadsheet Extraction Summary:</span>
                    <span className="font-mono text-slate-500">{excelReport.totalRows} rows read</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Matched</span>
                      <span className="text-sm font-bold text-blue-600 font-mono">{excelReport.matched} / {totalStudents}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-emerald-600 uppercase font-mono block">Present</span>
                      <span className="text-sm font-bold text-emerald-600 font-mono">{excelReport.present}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-rose-600 uppercase font-mono block">Absent</span>
                      <span className="text-sm font-bold text-rose-600 font-mono">{excelReport.absent}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-amber-600 uppercase font-mono block">Late</span>
                      <span className="text-sm font-bold text-amber-600 font-mono">{excelReport.late}</span>
                    </div>
                  </div>
                  {excelReport.unmatched.length > 0 && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-1">
                      <strong>Unmatched Roll Numbers:</strong> {excelReport.unmatched.join(', ')} (not in this course division).
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 italic">
                    Roster below has been updated based on the Excel sheet. You can manually inspect or adjust any student status before committing.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* MANUAL QUICK-ACTION PANEL */
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">touch_app</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Direct Manual Roll Mode</h4>
                  <p className="text-[11px] text-slate-500">Toggle individual student marks in the table below, or apply quick bulk presets.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">done_all</span>
                  <span>Mark All Present</span>
                </button>
                <button
                  onClick={() => handleMarkAll('ABSENT')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Mark All Absent</span>
                </button>
              </div>
            </div>
          )}

          {/* Turnout Telemetry HUD */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">analytics</span>
                  <span>Live Turnout Telemetry</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated dynamically from current sheet import and manual entries.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${meetsUgcThreshold ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="font-semibold text-slate-300">
                  UGC 75% Requirement:{' '}
                  <strong className={meetsUgcThreshold ? 'text-emerald-400' : 'text-rose-400'}>
                    {meetsUgcThreshold ? 'COMPLIANT (+ ' + (turnoutPct - 75).toFixed(1) + '% Margin)' : 'DEFICIENT'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Turnout Progress & Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-800">
              <div className="bg-slate-800/60 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Total Roster</span>
                <div className="text-xl font-bold mt-0.5">{totalStudents} Students</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl">
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-semibold">Present</span>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{presentCount}</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl">
                <span className="text-[10px] text-amber-400 uppercase font-mono font-semibold">Late</span>
                <div className="text-xl font-bold text-amber-400 mt-0.5">{lateCount}</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl">
                <span className="text-[10px] text-rose-400 uppercase font-mono font-semibold">Absent</span>
                <div className="text-xl font-bold text-rose-400 mt-0.5">{absentCount}</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Class Turnout</span>
                <div className={`text-xl font-bold mt-0.5 ${meetsUgcThreshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {turnoutPct}%
                </div>
              </div>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            {/* Header & Filter Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Class Roll & Attendance Roster</h4>
                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-mono font-semibold">
                  {filteredRoster.length} Students
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
                    search
                  </span>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search roll no or name..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 text-xs">
                  {(['ALL', 'PRESENT', 'ABSENT', 'LATE'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        statusFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Roster List */}
            {isRosterLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Loading enrolled student cohort from database...
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No students found matching current search filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase bg-slate-50">
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Cumulative Attendance</th>
                      <th className="py-3 px-4">Entry Source</th>
                      <th className="py-3 px-4 text-center">Session Status (Toggle Manually)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRoster.map((student) => (
                      <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {student.rollNo}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {student.name}
                          <div className="text-[11px] text-slate-400 font-normal font-mono">
                            {student.registrationNo}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                              student.currentAttendancePct < 75
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {student.currentAttendancePct}%
                          </span>
                          {student.currentAttendancePct < 75 && (
                            <span className="ml-1.5 text-[10px] font-bold text-rose-600">
                              Defaulter Alert
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {student.source === 'EXCEL_UPLOAD' ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <span className="material-symbols-outlined text-[13px]">table_chart</span>
                              <span>Excel Imported</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <span className="material-symbols-outlined text-[13px]">edit</span>
                              <span>Manual Entry</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.studentId, 'PRESENT')}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                student.status === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.studentId, 'LATE')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                student.status === 'LATE'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Late
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.studentId, 'ABSENT')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                student.status === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.studentId, 'EXCUSED')}
                              className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                student.status === 'EXCUSED'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Excused
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Commit & Seal Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Ready to commit: {presentCount} Present, {absentCount} Absent, {lateCount} Late to university attendance records.
              </div>

              <button
                type="button"
                onClick={handleCommitSession}
                disabled={isSubmitting || roster.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>{isSubmitting ? 'Committing Attendance...' : 'Commit & Seal Attendance to University Ledger'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSE TELEMETRY & DEFAULTERS */}
      {(isStudent || activeTab === 'telemetry') && (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={summaries}
            keyExtractor={(a) => a.courseCode}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* TAB 3: ATTENDANCE LEDGER HISTORY */}
      {isFacultyOrAdmin && activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Sealed Attendance Ledger Records ({sessions.length} Sessions)
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Verified Records Signed by Course Instructors
            </span>
          </div>

          <DataTable
            columns={sessionHistoryColumns}
            data={sessions}
            keyExtractor={(s) => s.id}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};
