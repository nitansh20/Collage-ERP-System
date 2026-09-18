import {
  seedPersonas,
  seedStudents,
  seedAdmissions,
  seedCourses,
  seedTimetable,
  seedAttendance,
  seedAttendanceSessions,
  seedMarks,
  seedResources,
  seedFees,
  seedHostels,
  seedLibrary,
  seedFaculty,
  seedNotices,
  seedDocuments,
  seedSessions,
  seedAuditLogs,
} from '../db/seedData.js';
import {
  PersonaProfile,
  Student,
  AdmissionApplication,
  CourseStructure,
  TimetableSlot,
  AttendanceSummary,
  AttendanceSessionRecord,
  ExaminationMark,
  ResourceUploadItem,
  FeeChallan,
  HostelRoom,
  LibraryBook,
  FacultyMember,
  NoticeCircular,
  DocumentVerification,
  ActiveSession,
  AuditLogEntry,
  ResourceImportAudit,
  ResourceValidationResponse,
} from '../types/index.js';

class DataRepository {
  public personas: PersonaProfile[] = [...seedPersonas];
  public students: Student[] = [...seedStudents];
  public admissions: AdmissionApplication[] = [...seedAdmissions];
  public courses: CourseStructure[] = [...seedCourses];
  public timetable: TimetableSlot[] = [...seedTimetable];
  public attendance: AttendanceSummary[] = [...seedAttendance];
  public attendanceSessions: AttendanceSessionRecord[] = [...seedAttendanceSessions];
  public marks: ExaminationMark[] = [...seedMarks];
  public resources: ResourceUploadItem[] = [...seedResources];
  public fees: FeeChallan[] = [...seedFees];
  public hostels: HostelRoom[] = [...seedHostels];
  public library: LibraryBook[] = [...seedLibrary];
  public faculty: FacultyMember[] = [...seedFaculty];
  public notices: NoticeCircular[] = [...seedNotices];
  public documents: DocumentVerification[] = [...seedDocuments];
  public sessions: ActiveSession[] = [...seedSessions];
  public auditLogs: AuditLogEntry[] = [...seedAuditLogs];
  public importAuditLogs: ResourceImportAudit[] = [
    {
      id: 'audit_res_init_01',
      requestId: 'REQ-RES-2026-0308-01',
      userId: 'user_faculty_cse',
      userName: 'Dr. Rajesh Nair',
      userRole: 'FACULTY',
      importType: 'EXCEL',
      fileName: 'CSE601_LectureNotes_BatchA.xlsx',
      totalRows: 4,
      successfulRows: 4,
      failedRows: 0,
      duplicateRows: 0,
      timestamp: '2026-03-08 10:15:00',
      status: 'COMPLETED',
    },
    {
      id: 'audit_res_init_02',
      requestId: 'REQ-RES-2026-0309-02',
      userId: 'user_faculty_cse',
      userName: 'Dr. P. Sundaram',
      userRole: 'FACULTY',
      importType: 'CSV',
      fileName: 'CS602_Compiler_LabManuals.csv',
      totalRows: 3,
      successfulRows: 3,
      failedRows: 0,
      duplicateRows: 0,
      timestamp: '2026-03-09 11:40:00',
      status: 'COMPLETED',
    },
  ];
  public stagedResourceUploads: Map<string, ResourceValidationResponse> = new Map();

  /**
   * Enforce unique constraint checks before persisting a student
   */
  public assertUniqueStudent(rollNo: string, email: string, excludeId?: string) {
    const duplicateRoll = this.students.find(
      (s) => !s.isDeleted && s.rollNo.toUpperCase() === rollNo.toUpperCase() && s.id !== excludeId
    );
    if (duplicateRoll) {
      throw new Error(`Unique constraint violation: Student roll number '${rollNo}' already registered.`);
    }

    const duplicateEmail = this.students.find(
      (s) => !s.isDeleted && s.email.toLowerCase() === email.toLowerCase() && s.id !== excludeId
    );
    if (duplicateEmail) {
      throw new Error(`Unique constraint violation: Student email '${email}' is already associated with roll ${duplicateEmail.rollNo}.`);
    }
  }

  /**
   * Enforce foreign key relational integrity
   */
  public assertForeignKey(entity: 'Student' | 'Department' | 'HostelRoom' | 'LibraryBook', id: string) {
    if (entity === 'Student') {
      const exists = this.students.some((s) => !s.isDeleted && (s.id === id || s.rollNo === id));
      if (!exists) throw new Error(`Foreign key constraint violation: Referenced student '${id}' does not exist.`);
    } else if (entity === 'HostelRoom') {
      const exists = this.hostels.some((h) => h.id === id);
      if (!exists) throw new Error(`Foreign key constraint violation: Referenced hostel room '${id}' does not exist.`);
    } else if (entity === 'LibraryBook') {
      const exists = this.library.some((b) => b.id === id);
      if (!exists) throw new Error(`Foreign key constraint violation: Referenced library book '${id}' does not exist.`);
    }
  }

  public logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.auditLogs.unshift(newEntry);
    return newEntry;
  }
}

export const repo = new DataRepository();
