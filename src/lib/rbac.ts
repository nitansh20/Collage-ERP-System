import { PersonaProfile } from '../../server/types/index.js';

export interface RouteRule {
  module: string;
  label: string;
  allowedRoles?: string[];
  description?: string;
}

export const ROUTE_RULES: Record<string, RouteRule> = {
  '/dashboard': {
    module: 'dashboard',
    label: 'Dashboard',
    description: 'Executive & self-service overview adapted to role',
  },
  '/students': {
    module: 'students',
    label: 'Student Directory & Profile',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'STUDENT', 'STUDENT_REP'],
    description: 'Central student records, 13-digit enrollment identity, and dossiers',
  },
  '/students/profile': {
    module: 'students',
    label: 'My Profile',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'STUDENT', 'STUDENT_REP'],
    description: 'Student institutional profile and 13-digit enrollment scheme inspector',
  },
  '/admissions': {
    module: 'admissions',
    label: 'Admissions & Scrutiny',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS'],
    description: 'Applicant counseling, quota validation and scrutiny',
  },
  '/academic': {
    module: 'academic',
    label: 'Curriculum & Syllabi',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'STUDENT', 'STUDENT_REP'],
    description: 'Approved statutory university syllabus and courses',
  },
  '/academic/resources': {
    module: 'academic',
    label: 'Learning Materials & Subject Library',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'STUDENT', 'STUDENT_REP'],
    description: 'Course lecture notes, syllabi documents, and PDFs',
  },
  '/timetable': {
    module: 'timetable',
    label: 'Class Timetable',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'STUDENT', 'STUDENT_REP'],
    description: 'Class schedules, lecture halls, and instructor hours',
  },
  '/attendance': {
    module: 'attendance',
    label: 'Attendance',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'HOSTEL_WARDEN', 'STUDENT', 'STUDENT_REP'],
    description: 'Lecture, laboratory, and classroom attendance records and statutory percentages',
  },
  '/bulk/resources': {
    module: 'bulk-resources',
    label: 'Bulk Materials Ingest',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER'],
    description: 'Automated Excel and CSV learning asset ingestion and distribution pipeline',
  },
  '/bulk/marks': {
    module: 'bulk-marks',
    label: 'Faculty Marks Upload & Sealing',
    allowedRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'HOD_CSE', 'FAC_MEMBER'],
    description: 'ACID transactional marks upload gate and grade sealing',
  },
  '/examinations': {
    module: 'examinations',
    label: 'Examinations & Marksheet',
    allowedRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'FAC_MEMBER', 'STUDENT', 'STUDENT_REP'],
    description: 'Examination grades, marksheet transcripts, and hall tickets',
  },
  '/bulk/validation': {
    module: 'bulk-validation',
    label: 'Pre-Flight Schema Audit',
    allowedRoles: ['SUPER_ADMIN', 'COE_OFFICER'],
    description: 'Automated data integrity and statutory schema checks',
  },
  '/fees': {
    module: 'fees',
    label: 'Payments & Fee Dues',
    allowedRoles: ['SUPER_ADMIN', 'BURSAR_FINANCE', 'STUDENT', 'STUDENT_REP'],
    description: 'Student semester fee challans, dues, and payment records',
  },
  '/fees/receipts': {
    module: 'fees',
    label: 'Fees Receipt Transaction',
    allowedRoles: ['SUPER_ADMIN', 'BURSAR_FINANCE', 'STUDENT', 'STUDENT_REP'],
    description: 'Digital fee receipts, transaction logs, and clearance vouchers',
  },
  '/fees/installments': {
    module: 'fees',
    label: 'Fees at Easy Installment',
    allowedRoles: ['SUPER_ADMIN', 'BURSAR_FINANCE', 'STUDENT', 'STUDENT_REP'],
    description: 'Easy installment payment schedules and financial installment options',
  },
  '/hostels': {
    module: 'hostels',
    label: 'Hostel Hall Allocations',
    allowedRoles: ['SUPER_ADMIN', 'HOSTEL_WARDEN', 'STUDENT', 'STUDENT_REP'],
    description: 'Residential halls, room occupancy, and warden records',
  },
  '/library': {
    module: 'library',
    label: 'Subject Library & Catalog',
    allowedRoles: ['SUPER_ADMIN', 'FAC_MEMBER', 'DEAN_ACADEMICS', 'STUDENT', 'STUDENT_REP'],
    description: 'University catalog, borrowed titles, and return dates',
  },
  '/student/enrollment': {
    module: 'students',
    label: 'Enrollment Process',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'STUDENT', 'STUDENT_REP'],
    description: '13-digit university enrollment scheme breakdown and verification',
  },
  '/student/assignments': {
    module: 'academic',
    label: 'Assignments & Submissions',
    allowedRoles: ['SUPER_ADMIN', 'FAC_MEMBER', 'HOD_CSE', 'STUDENT', 'STUDENT_REP'],
    description: 'Coursework assignments, lab task submissions, and deadlines',
  },
  '/student/events': {
    module: 'notifications',
    label: 'Event (Batwara 1947)',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'HOSTEL_WARDEN', 'BURSAR_FINANCE', 'COE_OFFICER', 'STUDENT', 'STUDENT_REP'],
    description: 'Campus theatrical productions, cultural symposiums, and Batwara 1947 event passes',
  },
  '/faculty': {
    module: 'faculty',
    label: 'Faculty HR & Payroll',
    allowedRoles: ['SUPER_ADMIN', 'HOD_CSE'],
    description: 'Faculty directory, payroll bands, and department rosters',
  },
  '/notifications': {
    module: 'notifications',
    label: 'Circulars & Notices',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'HOD_CSE', 'FAC_MEMBER', 'HOSTEL_WARDEN', 'BURSAR_FINANCE', 'COE_OFFICER', 'STUDENT', 'STUDENT_REP'],
    description: 'Official academic announcements and registrar notices',
  },
  '/documents': {
    module: 'documents',
    label: 'Certificates & Documents',
    allowedRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'STUDENT', 'STUDENT_REP'],
    description: 'Cryptographically sealed grade cards and certificates',
  },
  '/documents/certificates': {
    module: 'documents',
    label: 'Certificate Issuance',
    allowedRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'STUDENT', 'STUDENT_REP'],
    description: 'Bonafide, provisional degree, and transfer certificates',
  },
  '/users': {
    module: 'users',
    label: 'IAM Personnel & RBAC',
    allowedRoles: ['SUPER_ADMIN'],
    description: 'Identity profiles, clearance levels, and role definitions',
  },
  '/settings/security': {
    module: 'security',
    label: 'Active Sessions Monitor',
    allowedRoles: ['SUPER_ADMIN'],
    description: 'Zero-trust active device sessions and hardware locks',
  },
  '/audit': {
    module: 'audit',
    label: 'Cryptographic Audit Trail',
    allowedRoles: ['SUPER_ADMIN', 'COE_OFFICER', 'BURSAR_FINANCE'],
    description: 'Immutable regulatory telemetry and transaction logs',
  },
  '/reports': {
    module: 'reports',
    label: 'Statutory Reports',
    allowedRoles: ['SUPER_ADMIN', 'DEAN_ACADEMICS', 'COE_OFFICER', 'BURSAR_FINANCE'],
    description: 'Accreditation, NAAC/NBA metrics, and compliance digests',
  },
  '/login': {
    module: 'public',
    label: 'IAM Login Gateway',
    description: 'Unified Single Sign-On and role authentication gateway',
  },
};

export const hasRouteAccess = (route: string, persona: PersonaProfile | null): boolean => {
  if (route === '/login') return true;
  if (!persona) return false;

  // Super Admin / Root clearance has universal access — all means all
  if (persona.allowedModules.includes('*') || persona.role === 'SUPER_ADMIN') {
    return true;
  }

  const rule = ROUTE_RULES[route];
  if (!rule) {
    // Check fallback by module name matching route path
    const moduleName = route.replace(/^\//, '').replace(/\//g, '-');
    return persona.allowedModules.includes(moduleName);
  }

  // Both role authorization AND module grant must be satisfied
  const roleAllowed = rule.allowedRoles && rule.allowedRoles.length > 0
    ? rule.allowedRoles.includes(persona.role)
    : true;
  const moduleAllowed = persona.allowedModules.includes(rule.module);

  return roleAllowed && moduleAllowed;
};

export interface RolePortalConfig {
  id: string;
  role: string;
  title: string;
  shortTitle: string;
  icon: string;
  color: 'emerald' | 'indigo' | 'slate' | 'blue' | 'amber' | 'purple' | 'rose';
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  description: string;
  defaultPersonaId: string;
  defaultIdentifier: string;
  defaultPassword: string;
  allowedHighlights: string[];
  restrictedHighlights: string[];
}

export const ROLE_PORTALS: RolePortalConfig[] = [
  {
    id: 'portal_student',
    role: 'STUDENT',
    title: 'Student Portal',
    shortTitle: 'Student',
    icon: 'school',
    color: 'emerald',
    badgeColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    borderColor: 'hover:border-emerald-500',
    description: 'Enrolled undergraduate/postgraduate student self-service portal.',
    defaultPersonaId: 'user_student',
    defaultIdentifier: '2301031800159',
    defaultPassword: 'student123',
    allowedHighlights: [
      'My Class Timetable & Lecture Schedule',
      'Lecture Attendance Tracking (91.4% Rate)',
      'Curriculum & Syllabus Handbooks',
      'LMS Learning Materials & Lecture Notes',
      'Semester Fee Challans & Payment Receipts',
      'Hostel Room & Living Accommodations',
      'Central Library Book Catalog',
      'Official Grade Cards & Verifications',
    ],
    restrictedHighlights: [
      'Admissions Candidate Scrutiny & Approval',
      'Faculty Examination Marks Entry & Commit',
      'Faculty HR Roster & Compensation Data',
      'IAM Personnel Administration & User Roles',
      'Active Sessions Kill-Switch & System Audit',
    ],
  },
  {
    id: 'portal_faculty',
    role: 'FAC_MEMBER',
    title: 'Faculty & Professor Portal',
    shortTitle: 'Faculty',
    icon: 'co_present',
    color: 'indigo',
    badgeColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    borderColor: 'hover:border-indigo-500',
    description: 'Academic instructor console for course grading and attendance.',
    defaultPersonaId: 'user_faculty_cse',
    defaultIdentifier: 'psundaram@hogward.edu',
    defaultPassword: 'faculty123',
    allowedHighlights: [
      'Assigned Courses & Lecture Syllabi',
      'Faculty Marks Upload (ACID Transactional Gate)',
      'Division Attendance Rosters & Logging',
      'LMS Course Notes & Materials Repository',
      'Class Schedules & Lab Timetables',
      'University Circulars & Academic Notices',
    ],
    restrictedHighlights: [
      'Student Fee Ledger & Payment Processing',
      'Admissions Application Quota Approval',
      'Hostel Room Allocation Management',
      'IAM User Accounts & Cryptographic Audit',
    ],
  },
  {
    id: 'portal_admin',
    role: 'SUPER_ADMIN',
    title: 'System Administrator (Dean IT)',
    shortTitle: 'Super Admin',
    icon: 'admin_panel_settings',
    color: 'slate',
    badgeColor: 'text-slate-900',
    badgeBg: 'bg-slate-100 border-slate-300',
    borderColor: 'hover:border-slate-500',
    description: 'Full institutional authority over all ERP databases and modules.',
    defaultPersonaId: 'user_super_admin',
    defaultIdentifier: 'admin@hogward.edu',
    defaultPassword: 'admin123',
    allowedHighlights: [
      'Universal Access to All 20+ ERP Modules',
      'IAM Personnel & Role-Based Access Control',
      'Zero-Trust Active Session Kill-Switch',
      'Regulatory Cryptographic Audit Trail',
      'Bulk Data Ingestion & Schema Gateways',
    ],
    restrictedHighlights: ['None — Unrestricted Statutory Root Clearance'],
  },
  {
    id: 'portal_dean',
    role: 'DEAN_ACADEMICS',
    title: 'Academic Affairs & Admissions',
    shortTitle: 'Dean / Admissions',
    icon: 'how_to_reg',
    color: 'blue',
    badgeColor: 'text-blue-700',
    badgeBg: 'bg-blue-50 border-blue-200',
    borderColor: 'hover:border-blue-500',
    description: 'Admissions scrutiny, quota approvals, and student directory.',
    defaultPersonaId: 'user_dean_academics',
    defaultIdentifier: 'evance@hogward.edu',
    defaultPassword: 'dean123',
    allowedHighlights: [
      'Student Directory & Academic Profiles',
      'Admissions Applications & Scrutiny Panel',
      'Curriculum Structure & Degree Syllabi',
      'Master University Timetable',
      'Cohort Attendance Aggregate Summaries',
      'Statutory Accreditation & NBA Reports',
    ],
    restrictedHighlights: [
      'Student Fee Accounting & Challan Verification',
      'Faculty End-Term Marks Commit Gate',
      'Hostel Hall Assignments & Allocations',
      'IAM Security Sessions & Root Settings',
    ],
  },
  {
    id: 'portal_finance',
    role: 'BURSAR_FINANCE',
    title: 'Finance & Accounts (Bursar)',
    shortTitle: 'Finance',
    icon: 'payments',
    color: 'amber',
    badgeColor: 'text-amber-700',
    badgeBg: 'bg-amber-50 border-amber-200',
    borderColor: 'hover:border-amber-500',
    description: 'Fee realization, challan verifications, and financial ledger.',
    defaultPersonaId: 'user_bursar',
    defaultIdentifier: 'bursar@hogward.edu',
    defaultPassword: 'finance123',
    allowedHighlights: [
      'Student Semester Fees & Challans',
      'Payment Verifications & Receipt Reconciliation',
      'Statutory University Financial Statements',
      'Financial Cryptographic Audit Trail',
    ],
    restrictedHighlights: [
      'Course Curricula & Syllabus Editing',
      'Examination Mark Adjustments',
      'Admissions Applicant Decisions',
      'Hostel Room Bed Allotments',
    ],
  },
  {
    id: 'portal_coe',
    role: 'COE_OFFICER',
    title: 'Controller of Examinations (COE)',
    shortTitle: 'COE Branch',
    icon: 'fact_check',
    color: 'purple',
    badgeColor: 'text-purple-700',
    badgeBg: 'bg-purple-50 border-purple-200',
    borderColor: 'hover:border-purple-500',
    description: 'Statutory examination ledger, mark sealing, and transcripts.',
    defaultPersonaId: 'user_coe',
    defaultIdentifier: 'coe@hogward.edu',
    defaultPassword: 'exam123',
    allowedHighlights: [
      'Faculty Marks Ledger & ACID Constraint Locks',
      'Pre-Flight Mark Schema & Bounds Validation',
      'Tamper-Proof Grade Cards & Transcripts',
      'Statutory Examination Performance Reports',
      'Cryptographic Audit Trail of All Grade Changes',
    ],
    restrictedHighlights: [
      'Admissions Verification & Approval',
      'Hostel Allocations & Room Living',
      'Fee Challan Payments & Due Collection',
      'IAM User Provisioning',
    ],
  },
  {
    id: 'portal_warden',
    role: 'HOSTEL_WARDEN',
    title: 'Residential & Hostel Warden',
    shortTitle: 'Hostel Warden',
    icon: 'hotel',
    color: 'rose',
    badgeColor: 'text-rose-700',
    badgeBg: 'bg-rose-50 border-rose-200',
    borderColor: 'hover:border-rose-500',
    description: 'Campus accommodation, hall allocations, and resident roll.',
    defaultPersonaId: 'user_warden',
    defaultIdentifier: 'warden@hogward.edu',
    defaultPassword: 'warden123',
    allowedHighlights: [
      'Hostel Hall & Room Bed Allocations',
      'Biometric Resident Attendance Records',
      'Residential Circulars & Campus Notices',
    ],
    restrictedHighlights: [
      'Curriculum & Syllabi Decisions',
      'Examination Marks Entry & Commit',
      'Fee Collection Accounting',
      'Admissions Applicant Scrutiny',
    ],
  },
];
