import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.js';

export interface DashboardModule {
  id: string;
  title: string;
  description: string;
  category: 'Academics' | 'Governance' | 'Finances' | 'Operations' | 'Security' | 'Student Services';
  requiredRoles: string[];
  enabled: boolean;
  order: number;
}

export const allSystemModules: DashboardModule[] = [
  // Student-specific Modules
  {
    id: 'student_academics_summary',
    title: 'My Academic Standing & Attendance',
    description: 'Current term attendance record (91.4%), enrolled courses, and grade sheet status.',
    category: 'Student Services',
    requiredRoles: ['STUDENT', 'STUDENT_REP', 'SUPER_ADMIN'],
    enabled: true,
    order: 1,
  },
  {
    id: 'student_timetable_today',
    title: 'Today’s Lecture Schedule & Lab Sessions',
    description: 'Live daily timetable, assigned lecture halls, and instructor hours.',
    category: 'Student Services',
    requiredRoles: ['STUDENT', 'STUDENT_REP', 'SUPER_ADMIN'],
    enabled: true,
    order: 2,
  },
  {
    id: 'student_dues_hostel',
    title: 'Semester Fee Challans & Residential Accommodations',
    description: 'Verified fee payments, receipt downloads, and Hostel Hall room allotment.',
    category: 'Student Services',
    requiredRoles: ['STUDENT', 'STUDENT_REP', 'SUPER_ADMIN'],
    enabled: true,
    order: 3,
  },

  // Faculty & Academic Modules
  {
    id: 'faculty_course_duties',
    title: 'Faculty Course Roster & Active Divisions',
    description: 'Assigned academic courses, student enrollments, and syllabus completion tracker.',
    category: 'Academics',
    requiredRoles: ['FAC_MEMBER', 'HOD_CSE', 'SUPER_ADMIN'],
    enabled: true,
    order: 4,
  },
  {
    id: 'faculty_today_lectures',
    title: 'Today’s Teaching Schedule & Quick Attendance',
    description: 'Instructor lecture slots for today, classroom venues, and rapid attendance marking.',
    category: 'Academics',
    requiredRoles: ['FAC_MEMBER', 'HOD_CSE', 'SUPER_ADMIN'],
    enabled: true,
    order: 5,
  },
  {
    id: 'attendance_pulse',
    title: 'Attendance Telemetry & Defaulters Watch',
    description: 'Department-wise lecture attendance, defaulter identification (<75%), and session logs.',
    category: 'Academics',
    requiredRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'HOSTEL_WARDEN'],
    enabled: true,
    order: 6,
  },
  {
    id: 'exam_marks_pipeline',
    title: 'COE Examination Marks & ACID Validator Gateway',
    description: 'Status of bulk marks ingest, pre-flight score ceiling breaches, and master ledger commitment.',
    category: 'Academics',
    requiredRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'HOD_CSE', 'FAC_MEMBER'],
    enabled: true,
    order: 7,
  },
  {
    id: 'bulk_resource_ingest',
    title: 'Bulk Materials & Circular Ingestion Pipeline',
    description: 'Staged lecture notes, problem sets, and institutional announcements awaiting LMS broadcast.',
    category: 'Academics',
    requiredRoles: ['SUPER_ADMIN', 'HOD_CSE', 'DEAN_ACADEMICS'],
    enabled: true,
    order: 8,
  },

  // Finance & Treasury (Strict Least Privilege for Bursar / Finance)
  {
    id: 'fee_collections',
    title: 'Fee Platform & Treasury Reconciliation',
    description: 'Term-wise revenue realization, partial dues, pending bank challans, and payment collections.',
    category: 'Finances',
    requiredRoles: ['SUPER_ADMIN', 'BURSAR_FINANCE'],
    enabled: true,
    order: 9,
  },
  {
    id: 'financial_reports_summary',
    title: 'Treasury Realization & Digital Gateways',
    description: 'Tuition vs hostel collections, payment gateway reconciliations, and statutory fee audit.',
    category: 'Finances',
    requiredRoles: ['SUPER_ADMIN', 'BURSAR_FINANCE'],
    enabled: true,
    order: 10,
  },

  // Examinations & COE (Strict Least Privilege for COE)
  {
    id: 'coe_transcript_status',
    title: 'Cryptographic Transcripts & Degree Sealing',
    description: 'Controller of Examinations grade sheets, end-term marks sealing, and tamper-evident transcripts.',
    category: 'Governance',
    requiredRoles: ['SUPER_ADMIN', 'COE_OFFICER'],
    enabled: true,
    order: 11,
  },

  // Operations & Residential Life
  {
    id: 'admissions_funnel',
    title: 'Admissions & Seat Allocation Funnel',
    description: 'Merit list counseling status, document verification, and candidate seat acceptance metrics.',
    category: 'Operations',
    requiredRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS'],
    enabled: true,
    order: 12,
  },
  {
    id: 'academic_curriculum_status',
    title: 'University Syllabi & Curriculum Structures',
    description: 'Departmental syllabus breakdown, arrears/remedials status, and academic credit compliance.',
    category: 'Academics',
    requiredRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE'],
    enabled: true,
    order: 13,
  },
  {
    id: 'hostel_warden_summary',
    title: 'Residential Halls & Bed Occupancy Register',
    description: 'Campus accommodation capacity, room allocations, and resident demographics.',
    category: 'Operations',
    requiredRoles: ['SUPER_ADMIN', 'HOSTEL_WARDEN'],
    enabled: true,
    order: 14,
  },
  {
    id: 'hostel_night_roll',
    title: 'Night Roll Call & Resident Status',
    description: 'Hall-wise night attendance check, outstation passes, and curfew compliance.',
    category: 'Operations',
    requiredRoles: ['SUPER_ADMIN', 'HOSTEL_WARDEN'],
    enabled: true,
    order: 15,
  },

  // Security & Audit
  {
    id: 'security_sessions',
    title: 'Active Concurrent Sessions & Zero-Trust Monitor',
    description: 'Live active JWT sessions, geolocation anomaly flags, and rapid remote session revocation.',
    category: 'Security',
    requiredRoles: ['SUPER_ADMIN'],
    enabled: true,
    order: 16,
  },
  {
    id: 'audit_feed',
    title: 'Cryptographic Audit Trail Stream',
    description: 'Real-time telemetry of sensitive administrative actions, mark updates, and financial logs.',
    category: 'Governance',
    requiredRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'BURSAR_FINANCE'],
    enabled: true,
    order: 17,
  },
];

export const getDefaultModulesForRole = (role?: string): DashboardModule[] => {
  if (!role || role === 'SUPER_ADMIN') {
    return allSystemModules.map((m, i) => ({ ...m, order: i + 1, enabled: true }));
  }

  return allSystemModules
    .filter((m) => m.requiredRoles.includes(role))
    .map((m, i) => ({ ...m, order: i + 1, enabled: true }));
};

interface DashboardContextType {
  modules: DashboardModule[];
  authorizedModules: DashboardModule[];
  toggleModule: (id: string) => void;
  reorderModule: (id: string, direction: 'up' | 'down') => void;
  resetToDefaults: () => void;
  isCustomizing: boolean;
  setIsCustomizing: (val: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPersona } = useAuth();
  const [isCustomizing, setIsCustomizing] = useState(false);

  const role = currentPersona?.role || 'SUPER_ADMIN';
  const storageKey = `college_erp_dashboard_modules_role_${role}`;

  const [modules, setModules] = useState<DashboardModule[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: DashboardModule[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fall back to defaults
      }
    }
    return getDefaultModulesForRole(role);
  });

  // When persona/role changes, load that role's customized modules
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: DashboardModule[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setModules(parsed);
          return;
        }
      } catch {
        // Fall through to default
      }
    }
    setModules(getDefaultModulesForRole(role));
  }, [role, storageKey]);

  // Persist role-specific customized modules
  useEffect(() => {
    if (modules && modules.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(modules));
    }
  }, [modules, storageKey]);

  // Filter modules strictly based on user role authorization (Least Privilege)
  const authorizedModules = modules.filter((m) => {
    if (!currentPersona) return false;
    if (currentPersona.role === 'SUPER_ADMIN' || currentPersona.allowedModules.includes('*')) {
      return true;
    }
    return m.requiredRoles.includes(currentPersona.role);
  });

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const reorderModule = (id: string, direction: 'up' | 'down') => {
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;

      return updated.map((m, i) => ({ ...m, order: i + 1 }));
    });
  };

  const resetToDefaults = () => {
    const fresh = getDefaultModulesForRole(role);
    setModules(fresh);
    localStorage.setItem(storageKey, JSON.stringify(fresh));
  };

  return (
    <DashboardContext.Provider
      value={{
        modules,
        authorizedModules,
        toggleModule,
        reorderModule,
        resetToDefaults,
        isCustomizing,
        setIsCustomizing,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
  return context;
};
