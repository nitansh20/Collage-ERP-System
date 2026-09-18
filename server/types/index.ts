export interface PersonaProfile {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'DEAN_ACADEMICS' | 'HOD_CSE' | 'COE_OFFICER' | 'BURSAR_FINANCE' | 'HOSTEL_WARDEN' | 'STUDENT_REP' | 'STUDENT' | 'FAC_MEMBER' | string;
  roleLabel: string;
  department: string;
  staffId: string;
  email: string;
  avatar: string;
  allowedModules: string[];
  password?: string;
}

export interface Student {
  id: string;
  rollNo: string;
  registrationNo: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  departmentId: string;
  program: string;
  courseCode?: string;
  division?: string;
  semester: number;
  batch: string;
  gpa: number;
  cgpa?: number;
  creditsEarned: number;
  attendancePercent: number;
  attendancePct?: number;
  feeStatus: 'CLEARED' | 'PARTIAL' | 'OVERDUE' | 'PAID';
  hostelResident: boolean;
  hostelRoom?: string;
  status: 'ACTIVE' | 'PROBATION' | 'SUSPENDED' | 'ALUMNI';
  guardianName: string;
  guardianPhone: string;
  bloodGroup: string;
  admissionDate: string;
  admissionCategory?: string;
  address?: string;
  rfidTag?: string;
  avatar?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  applicantName: string;
  email: string;
  phone: string;
  programApplied: string;
  departmentId: string;
  entranceScore: number;
  qualifyingPercentage: number;
  status: 'SUBMITTED' | 'UNDER_SCRUTINY' | 'DOCUMENT_VERIFIED' | 'COUNSELING_ALLOCATED' | 'OFFER_ACCEPTED' | 'FEE_PAID' | 'REJECTED';
  category: string;
  documentsVerified: boolean;
  appliedDate: string;
  allottedQuota: string;
  remarks?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CourseModule {
  title: string;
  hours: number;
  topics: string[];
}

export interface ArrearCurriculumDetails {
  arrearEligibilityCriteria: string;
  arrearExamFormat: string;
  arrearPassingThreshold: number;
  arrearFocusTopics: string[];
  specialRemedialSchedule?: string;
  facultyCoordinator?: string;
  registeredArrearCandidates?: number;
  notes?: string;
}

export interface CourseStructure {
  id: string;
  code: string;
  title: string;
  department: string;
  departmentId: string;
  semester: number;
  credits: number;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  totalHours?: number;
  facultyInCharge?: string;
  leadFaculty?: string;
  syllabusOutline: string;
  description?: string;
  modules?: CourseModule[];
  arrearDetails?: ArrearCurriculumDetails;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName?: string;
  subject: string;
  faculty: string;
  instructor?: string;
  room: string;
  batch: string;
  department?: string;
  type?: 'Lecture' | 'Lab' | 'Tutorial';
}

export interface AttendanceSummary {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
  totalLectures: number;
  totalConducted?: number;
  averageAttendance: number;
  averagePct?: number;
  defaultersCount: number;
}

export interface AttendanceStudentEntry {
  studentId: string;
  rollNo: string;
  name: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  method: 'RFID_AUTO' | 'BIOMETRIC' | 'MANUAL' | 'QR' | 'EXCEL_IMPORT';
  rfidTimestamp?: string;
  rfidTagId?: string;
}

export interface AttendanceSessionRecord {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
  division: string;
  facultyId: string;
  facultyName: string;
  hall: string;
  date: string;
  timeSlot: string;
  topic: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  turnoutPercentage: number;
  timestamp: string;
  isSealed: boolean;
  ledgerTxId: string;
  records: AttendanceStudentEntry[];
}

export interface ExaminationMark {
  id: string;
  studentId: string;
  rollNo: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  semester: number;
  internalMarks: number;
  maxInternal: number;
  theoryMarks: number;
  maxTheory: number;
  totalMarks: number;
  maxTotal: number;
  grade: string;
  status: 'VALID' | 'WARNING' | 'CRITICAL' | 'COMMITTED';
  validationMessage?: string;
  evaluator: string;
  lastUpdated: string;
}

export type AcademicResourceType = 'Lecture Notes' | 'Learning Materials' | 'Announcements';

export interface ResourceUploadItem {
  id: string;
  title: string;
  category: AcademicResourceType;
  resourceType?: AcademicResourceType;
  description?: string;
  academicYear?: string;
  term?: string;
  courseCode: string;
  courseName: string;
  course?: string;
  department: string;
  departmentId?: string;
  subject?: string;
  subjectCode?: string;
  division?: string; // e.g. 'Division A', 'Division B', 'ALL'
  batch?: string; // e.g. '2021-2025', '2022-2026', '2023-2027', 'Batch 1', 'ALL'
  semester: number;
  driveUrl: string;
  fileUrl?: string;
  fileSize: string;
  fileType?: string;
  announcementContent?: string;
  priority?: 'NORMAL' | 'URGENT' | 'STATUTORY';
  isGlobal?: boolean;
  status: 'VALID' | 'DEFICIENCY' | 'EXCLUDED' | 'PUBLISHED' | 'ARCHIVED';
  errorDetails?: string;
  uploadedBy: string;
  uploadedById?: string;
  uploadedAt: string;
  importRequestId?: string;
  targetStudentsCount?: number;
  downloadCount?: number;
  viewCount?: number;
  tags?: string[];
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface ResourceValidationRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  resourceType: AcademicResourceType;
  academicYear: string;
  term: string;
  department: string;
  course: string;
  courseCode: string;
  subject: string;
  subjectCode: string;
  division: string;
  batch: string;
  title: string;
  description: string;
  fileUrl: string;
  fileSize?: string;
  announcementContent?: string;
  isGlobal: boolean;
  priority: 'NORMAL' | 'URGENT' | 'STATUTORY';
  errors: string[];
  warnings: string[];
  rawData: Record<string, any>;
  targetStudentsCount?: number;
}

export interface ResourceValidationResponse {
  success: boolean;
  requestId: string;
  fileName: string;
  fileType: 'xlsx' | 'csv';
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rows: ResourceValidationRow[];
  errorSummary: { field: string; count: number; message: string }[];
}

export interface ResourceImportResult {
  success: boolean;
  requestId: string;
  fileName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importedCount: number;
  failedCount: number;
  distributedCount: number;
  auditLogId: string;
  timestamp: string;
  errorReport?: { row: number; identifier: string; errors: string[] }[];
}

export interface ResourceImportAudit {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userRole: string;
  importType: 'EXCEL' | 'CSV' | 'MANUAL';
  fileName: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  timestamp: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  errorReport?: { row: number; identifier: string; errors: string[] }[];
}


export interface FeeChallan {
  id: string;
  challanNo: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  semester: number;
  feeHead: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE';
  receiptNo?: string;
}

export interface HostelRoom {
  id: string;
  blockName: string;
  roomNo: string;
  floor: number;
  capacity: number;
  occupied: number;
  occupants: {
    studentId: string;
    studentName: string;
    rollNo: string;
    bedNo: string;
  }[];
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
}

export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  department: string;
  category?: string;
  totalCopies: number;
  availableCopies: number;
  rackLocation: string;
  status: 'AVAILABLE' | 'RESERVED' | 'OUT_OF_STOCK';
}

export interface FacultyMember {
  id: string;
  employeeId: string;
  staffId?: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  qualifications: string;
  qualification?: string;
  assignedCourses: string[];
  monthlySalary: number;
  netSalary?: number;
  payrollBand?: string;
  biometricActive: boolean;
  avatar?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SABBATICAL';
}

export interface NoticeCircular {
  id: string;
  circularNo: string;
  title: string;
  category: string;
  targetAudience: string;
  publishedDate: string;
  content: string;
  priority: 'Standard' | 'High' | 'Urgent' | 'Statutory';
  issuer: string;
}

export interface DocumentVerification {
  id: string;
  documentNo: string;
  certificateId?: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  docType: 'Degree Certificate' | 'Semester Grade Transcript' | 'Transfer Certificate' | 'Bonafide Certificate';
  sha256Hash: string;
  issuedBy: string;
  issuingAuthority?: string;
  issuedDate: string;
  status: 'VERIFIED' | 'REVOKED' | 'PENDING';
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  role: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  loginTime: string;
  lastActive: string;
  status: 'ACTIVE' | 'LOCKED' | 'REVOKED';
  isCurrentSession: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  beforeState?: any;
  afterState?: any;
}

export interface FacultyAcademicScope {
  academicYears: string[];
  terms: string[];
  examinations: {
    id: string;
    name: string;
    maxMarks: number;
    type: 'Internal' | 'Theory' | 'Total' | 'Practical';
    term: string;
    academicYear: string;
  }[];
  courses: {
    id: string;
    code: string;
    name: string;
    department: string;
    departmentId: string;
  }[];
  subjects: {
    code: string;
    name: string;
    department: string;
    departmentId: string;
    semester: number;
    courseCode: string;
    maxMarks: number;
    leadFaculty?: string;
  }[];
  divisions: string[];
  facultyProfile: {
    id: string;
    name: string;
    role: string;
    department: string;
    assignedCourses: string[];
  };
}

export interface MarksValidationRow {
  rowNumber: number;
  enrollmentNumber: string;
  studentName: string;
  marks: number | null;
  rawMarks?: string | number;
  validationStatus: 'VALID' | 'ERROR' | 'WARNING';
  errorMessage: string | null;
}

export interface MarksValidationResponse {
  batchId: string;
  examDetails: {
    academicYear: string;
    term: string;
    examId: string;
    examName: string;
    courseId: string;
    courseName: string;
    subjectCode: string;
    subjectName: string;
    division: string;
    maxMarks: number;
  };
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
  canConfirm: boolean;
  rows: MarksValidationRow[];
}

export interface MarksImportResult {
  success: boolean;
  totalRows: number;
  updatedRows: number;
  failedRows: number;
  processingDurationMs: number;
  requestId: string;
  exam: string;
  subject: string;
  division: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
}
