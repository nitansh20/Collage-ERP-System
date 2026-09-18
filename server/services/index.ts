import { repo } from '../repositories/index.js';
import { validatePaymentAmount } from '../security/payments.js';
import { revokeSessionTokens } from '../security/jwt.js';
import {
  Student,
  AdmissionApplication,
  ExaminationMark,
  ResourceUploadItem,
  FeeChallan,
  HostelRoom,
  LibraryBook,
  NoticeCircular,
  PersonaProfile,
} from '../types/index.js';

export class StudentService {
  getAll(params?: { search?: string; department?: string; status?: string }) {
    let result = repo.students.filter((s) => !s.isDeleted);
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (params?.department && params.department !== 'ALL') {
      result = result.filter((s) => s.departmentId === params.department);
    }
    if (params?.status && params.status !== 'ALL') {
      result = result.filter((s) => s.status === params.status);
    }
    return result;
  }

  getById(id: string) {
    return repo.students.find((s) => !s.isDeleted && s.id === id);
  }

  create(data: Omit<Student, 'id'>, actor?: PersonaProfile) {
    // Unique constraint validation
    repo.assertUniqueStudent(data.rollNo, data.email);

    const newStudent: Student = {
      ...data,
      id: `stu_${Date.now()}`,
    };
    repo.students.unshift(newStudent);
    repo.logAudit({
      actorId: actor?.id || 'sys',
      actorName: actor?.name || 'System Auto',
      actorRole: actor?.role || 'SYSTEM',
      action: 'STUDENT_ENROLLED',
      entity: 'Student',
      entityId: newStudent.id,
      details: `Enrolled new student ${newStudent.name} (Roll: ${newStudent.rollNo}) into ${newStudent.department}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState: null,
      afterState: { id: newStudent.id, rollNo: newStudent.rollNo, email: newStudent.email, name: newStudent.name },
    });
    return newStudent;
  }

  delete(id: string, actor?: PersonaProfile) {
    const student = repo.students.find((s) => !s.isDeleted && s.id === id);
    if (!student) throw new Error('Student not found');

    const beforeState = { ...student };
    student.isDeleted = true;
    student.deletedAt = new Date().toISOString();
    student.deletedBy = actor?.id;

    repo.logAudit({
      actorId: actor?.id || 'sys',
      actorName: actor?.name || 'Dean of Students',
      actorRole: actor?.role || 'ADMIN',
      action: 'STUDENT_SOFT_DELETED',
      entity: 'Student',
      entityId: id,
      details: `Soft deleted student profile for ${student.name} (${student.rollNo}).`,
      severity: 'WARNING',
      ipAddress: '127.0.0.1',
      beforeState,
      afterState: { id: student.id, isDeleted: true, deletedAt: student.deletedAt },
    });

    return true;
  }
}

export class AdmissionService {
  getAll() {
    return repo.admissions.filter((a) => !a.isDeleted);
  }

  getById(id: string) {
    return repo.admissions.find((a) => !a.isDeleted && a.id === id);
  }

  create(data: Partial<AdmissionApplication>, actor?: PersonaProfile) {
    const newApp: AdmissionApplication = {
      id: `adm_${Date.now()}`,
      applicationNo: `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      applicantName: data.applicantName || 'Anonymous Applicant',
      email: data.email || 'applicant@domain.com',
      phone: data.phone || '+91 99999 00000',
      programApplied: data.programApplied || 'B.Tech Computer Science',
      departmentId: data.departmentId || 'dept_cs',
      entranceScore: data.entranceScore || 85.0,
      qualifyingPercentage: data.qualifyingPercentage || 88.0,
      status: 'SUBMITTED',
      category: data.category || 'General',
      documentsVerified: false,
      appliedDate: new Date().toISOString().substring(0, 10),
      allottedQuota: data.allottedQuota || 'Merit General',
      remarks: data.remarks || 'Application registered online.',
    };
    repo.admissions.unshift(newApp);
    repo.logAudit({
      actorId: actor?.id || 'sys',
      actorName: actor?.name || 'Applicant Portal',
      actorRole: actor?.role || 'APPLICANT',
      action: 'ADMISSION_APPLICATION_SUBMITTED',
      entity: 'AdmissionApplication',
      entityId: newApp.id,
      details: `New admission candidate ${newApp.applicantName} registered under application #${newApp.applicationNo}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState: null,
      afterState: { id: newApp.id, applicationNo: newApp.applicationNo, status: newApp.status },
    });
    return newApp;
  }

  updateStatus(id: string, status: AdmissionApplication['status'], actor?: PersonaProfile) {
    const app = repo.admissions.find((a) => !a.isDeleted && a.id === id);
    if (!app) throw new Error('Application not found');
    const beforeState = { status: app.status, documentsVerified: app.documentsVerified };
    app.status = status;
    if (status === 'DOCUMENT_VERIFIED') {
      app.documentsVerified = true;
    }
    const afterState = { status: app.status, documentsVerified: app.documentsVerified };

    repo.logAudit({
      actorId: actor?.id || 'sys',
      actorName: actor?.name || 'Admissions Dean',
      actorRole: actor?.role || 'ADMIN',
      action: 'ADMISSION_STATUS_MODIFIED',
      entity: 'AdmissionApplication',
      entityId: id,
      details: `Transitioned application ${app.applicationNo} to state ${status}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState,
      afterState,
    });
    return app;
  }
}

export class BulkResourceService {
  getAll() {
    return repo.resources;
  }

  bulkUpload(items: Partial<ResourceUploadItem>[], actor?: PersonaProfile) {
    const processed: ResourceUploadItem[] = items.map((item, idx) => {
      const isDeficient = !item.driveUrl || item.driveUrl.startsWith('file://') || !item.driveUrl.startsWith('http');
      return {
        id: `res_${Date.now()}_${idx}`,
        title: item.title || `Resource Item ${idx + 1}`,
        category: item.category || 'Learning Materials',
        courseCode: item.courseCode || 'CS601',
        courseName: item.courseName || 'Core Curriculum',
        department: item.department || 'Computer Science',
        semester: item.semester || 6,
        driveUrl: item.driveUrl || '',
        fileSize: item.fileSize || '2.4 MB',
        status: isDeficient ? 'DEFICIENCY' : 'VALID',
        errorDetails: isDeficient ? 'Local or broken URL reference detected. Cloud Drive URL required.' : undefined,
        uploadedBy: actor?.name || 'Faculty Uploader',
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
    });

    repo.resources.unshift(...processed);
    repo.logAudit({
      actorId: actor?.id || 'fac',
      actorName: actor?.name || 'Faculty Member',
      actorRole: actor?.role || 'FACULTY',
      action: 'BULK_RESOURCES_INGEST_STAGED',
      entity: 'ResourceUploadItem',
      entityId: `BATCH_${Date.now()}`,
      details: `Staged ${processed.length} academic materials via Excel automation pipeline.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
    });
    return processed;
  }

  excludeDeficiencies(actor?: PersonaProfile) {
    let count = 0;
    repo.resources = repo.resources.map((item) => {
      if (item.status === 'DEFICIENCY') {
        count++;
        return { ...item, status: 'EXCLUDED' };
      }
      return item;
    });
    repo.logAudit({
      actorId: actor?.id || 'fac',
      actorName: actor?.name || 'Batch Engine',
      actorRole: actor?.role || 'SYSTEM',
      action: 'BULK_DEFICIENCIES_EXCLUDED',
      entity: 'ResourceUploadItem',
      entityId: `EXCLUDE_${Date.now()}`,
      details: `Isolated and excluded ${count} deficient resource records from publishing queue.`,
      severity: 'WARNING',
      ipAddress: '127.0.0.1',
    });
    return { count };
  }

  publishAll(actor?: PersonaProfile) {
    let count = 0;
    repo.resources = repo.resources.map((item) => {
      if (item.status === 'VALID') {
        count++;
        return { ...item, status: 'PUBLISHED' };
      }
      return item;
    });
    repo.logAudit({
      actorId: actor?.id || 'fac',
      actorName: actor?.name || 'Faculty Lead',
      actorRole: actor?.role || 'FACULTY',
      action: 'BULK_RESOURCES_PUBLISHED',
      entity: 'ResourceUploadItem',
      entityId: `PUB_${Date.now()}`,
      details: `Published and broadcasted ${count} learning materials to student LMS.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
    });
    return { count };
  }
}

export class ExaminationService {
  getAllMarks() {
    return repo.marks;
  }

  updateMarkCell(
    id: string,
    updates: { internalMarks?: number; theoryMarks?: number },
    actor?: PersonaProfile
  ) {
    const mark = repo.marks.find((m) => m.id === id);
    if (!mark) throw new Error('Mark entry not found');

    if (updates.internalMarks !== undefined) {
      mark.internalMarks = Number(updates.internalMarks);
    }
    if (updates.theoryMarks !== undefined) {
      mark.theoryMarks = Number(updates.theoryMarks);
    }

    mark.totalMarks = mark.internalMarks + mark.theoryMarks;

    // ACID validation rules
    if (mark.theoryMarks > mark.maxTheory) {
      mark.status = 'CRITICAL';
      mark.validationMessage = `Theory marks (${mark.theoryMarks}) exceed maximum statutory ceiling of ${mark.maxTheory}!`;
    } else if (mark.internalMarks > mark.maxInternal) {
      mark.status = 'CRITICAL';
      mark.validationMessage = `Internal marks (${mark.internalMarks}) exceed maximum ceiling of ${mark.maxInternal}!`;
    } else {
      mark.status = 'VALID';
      mark.validationMessage = undefined;
      // Recalculate letter grade
      if (mark.totalMarks >= 90) mark.grade = 'O';
      else if (mark.totalMarks >= 80) mark.grade = 'A+';
      else if (mark.totalMarks >= 70) mark.grade = 'A';
      else if (mark.totalMarks >= 60) mark.grade = 'B+';
      else mark.grade = 'B';
    }

    mark.lastUpdated = new Date().toISOString().replace('T', ' ').substring(0, 16);

    repo.logAudit({
      actorId: actor?.id || 'coe',
      actorName: actor?.name || 'Controller of Exams',
      actorRole: actor?.role || 'COE_OFFICER',
      action: 'EXAM_MARK_CELL_EDITED',
      entity: 'ExaminationMark',
      entityId: mark.id,
      details: `Adjusted marks for ${mark.studentName} (${mark.rollNo}): Internal=${mark.internalMarks}, Theory=${mark.theoryMarks}, Total=${mark.totalMarks}, Status=${mark.status}.`,
      severity: mark.status === 'CRITICAL' ? 'WARNING' : 'INFO',
      ipAddress: '127.0.0.1',
    });

    return mark;
  }

  commitLedger(actor?: PersonaProfile) {
    const hasCritical = repo.marks.some((m) => m.status === 'CRITICAL');
    if (hasCritical) {
      repo.logAudit({
        actorId: actor?.id || 'coe',
        actorName: actor?.name || 'COE Officer',
        actorRole: actor?.role || 'COE_OFFICER',
        action: 'COE_COMMIT_REJECTED',
        entity: 'ExaminationLedger',
        entityId: 'LEDGER_CS601',
        details: 'ACID policy gate aborted ledger commitment due to unresolved critical validation errors.',
        severity: 'BLOCKED',
        ipAddress: '127.0.0.1',
      });
      throw new Error('ACID Gate Blocked: Cannot commit examination marks while out-of-bounds critical errors persist.');
    }

    repo.marks = repo.marks.map((m) => ({
      ...m,
      status: 'COMMITTED',
    }));

    repo.logAudit({
      actorId: actor?.id || 'coe',
      actorName: actor?.name || 'Controller of Exams',
      actorRole: actor?.role || 'COE_OFFICER',
      action: 'COE_MASTER_LEDGER_COMMITTED',
      entity: 'ExaminationLedger',
      entityId: `LEDGER_${Date.now()}`,
      details: `Permanently committed and cryptographically sealed ${repo.marks.length} candidate marks into Controller of Examinations ledger.`,
      severity: 'CRITICAL',
      ipAddress: '127.0.0.1',
    });

    return { success: true, count: repo.marks.length };
  }
}

export class FeesService {
  getAll() {
    return repo.fees;
  }

  recordPayment(id: string, amount: number, actor?: PersonaProfile) {
    const challan = repo.fees.find((f) => f.id === id);
    if (!challan) throw new Error('Challan not found');

    // Server-side payment validation
    const paymentCheck = validatePaymentAmount(challan, amount);
    if (!paymentCheck.valid) {
      throw new Error(paymentCheck.error);
    }

    const beforeState = { ...challan };
    challan.paidAmount += amount;
    challan.balanceAmount = Math.max(0, challan.totalAmount - challan.paidAmount);
    challan.status = challan.balanceAmount === 0 ? 'PAID' : 'PARTIAL';
    challan.receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const afterState = { ...challan };

    repo.logAudit({
      actorId: actor?.id || 'bursar',
      actorName: actor?.name || 'Bursar Cashier',
      actorRole: actor?.role || 'BURSAR_FINANCE',
      action: 'FEE_PAYMENT_RECORDED',
      entity: 'FeeChallan',
      entityId: challan.id,
      details: `Ingested payment of ₹${amount} for ${challan.studentName} (${challan.rollNo}). Generated receipt ${challan.receiptNo}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState,
      afterState,
    });

    return challan;
  }
}

export class HostelService {
  getAll() {
    return repo.hostels;
  }

  allocateBed(
    roomId: string,
    occupant: { studentId: string; studentName: string; rollNo: string },
    actor?: PersonaProfile
  ) {
    const room = repo.hostels.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');
    if (room.occupied >= room.capacity) throw new Error('Room is at full capacity');

    if (occupant.studentId || occupant.rollNo) {
      repo.assertForeignKey('Student', occupant.studentId || occupant.rollNo);
    }

    const beforeState = { occupied: room.occupied, status: room.status, occupantsCount: room.occupants.length };
    const bedLetter = String.fromCharCode(65 + room.occupied);
    room.occupants.push({
      ...occupant,
      bedNo: `Bed ${bedLetter}`,
    });
    room.occupied++;
    if (room.occupied >= room.capacity) {
      room.status = 'FULL';
    }
    const afterState = { occupied: room.occupied, status: room.status, occupantsCount: room.occupants.length };

    repo.logAudit({
      actorId: actor?.id || 'warden',
      actorName: actor?.name || 'Hostel Warden',
      actorRole: actor?.role || 'HOSTEL_WARDEN',
      action: 'HOSTEL_BED_ALLOCATED',
      entity: 'HostelRoom',
      entityId: room.id,
      details: `Allocated Bed ${bedLetter} in ${room.blockName} Room ${room.roomNo} to ${occupant.studentName} (${occupant.rollNo}).`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState,
      afterState,
    });

    return room;
  }
}

export class LibraryService {
  getAll() {
    return repo.library;
  }

  issueBook(bookId: string, studentName: string, actor?: PersonaProfile) {
    const book = repo.library.find((b) => b.id === bookId);
    if (!book) throw new Error('Book not found');
    if (book.availableCopies <= 0) throw new Error('No copies available');

    const beforeState = { availableCopies: book.availableCopies, status: book.status };
    book.availableCopies--;
    if (book.availableCopies === 0) {
      book.status = 'OUT_OF_STOCK';
    }
    const afterState = { availableCopies: book.availableCopies, status: book.status };

    repo.logAudit({
      actorId: actor?.id || 'lib',
      actorName: actor?.name || 'Library Circulation',
      actorRole: actor?.role || 'LIBRARIAN',
      action: 'LIBRARY_BOOK_ISSUED',
      entity: 'LibraryBook',
      entityId: book.id,
      details: `Issued copy of "${book.title}" (ISBN: ${book.isbn}) to ${studentName}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState,
      afterState,
    });

    return book;
  }

  returnBook(bookId: string, actor?: PersonaProfile) {
    const book = repo.library.find((b) => b.id === bookId);
    if (!book) throw new Error('Book not found');
    const beforeState = { availableCopies: book.availableCopies, status: book.status };
    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
    book.status = 'AVAILABLE';
    const afterState = { availableCopies: book.availableCopies, status: book.status };

    repo.logAudit({
      actorId: actor?.id || 'lib',
      actorName: actor?.name || 'Library Circulation',
      actorRole: actor?.role || 'LIBRARIAN',
      action: 'LIBRARY_BOOK_RETURNED',
      entity: 'LibraryBook',
      entityId: book.id,
      details: `Restocked returned copy of "${book.title}" to ${book.rackLocation}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      beforeState,
      afterState,
    });

    return book;
  }
}

export class SecurityService {
  getSessions() {
    return repo.sessions;
  }

  revokeSession(sessionId: string, actor?: PersonaProfile) {
    const sess = repo.sessions.find((s) => s.id === sessionId);
    if (!sess) throw new Error('Session not found');
    sess.status = 'REVOKED';

    revokeSessionTokens(sessionId);

    repo.logAudit({
      actorId: actor?.id || 'admin',
      actorName: actor?.name || 'Security Officer',
      actorRole: actor?.role || 'SUPER_ADMIN',
      action: 'SECURITY_SESSION_REVOKED',
      entity: 'ActiveSession',
      entityId: sessionId,
      details: `Severed JWT token and invalidated active session for ${sess.userName} (${sess.ipAddress}).`,
      severity: 'WARNING',
      ipAddress: '127.0.0.1',
    });

    return sess;
  }

  unlockSession(sessionId: string, actor?: PersonaProfile) {
    const sess = repo.sessions.find((s) => s.id === sessionId);
    if (!sess) throw new Error('Session not found');
    sess.status = 'ACTIVE';

    repo.logAudit({
      actorId: actor?.id || 'admin',
      actorName: actor?.name || 'Security Officer',
      actorRole: actor?.role || 'SUPER_ADMIN',
      action: 'SECURITY_SESSION_UNLOCKED',
      entity: 'ActiveSession',
      entityId: sessionId,
      details: `Workstation session unlocked for ${sess.userName}.`,
      severity: 'INFO',
      ipAddress: '127.0.0.1',
    });

    return sess;
  }

  terminateAllOtherSessions(currentUserId: string, actor?: PersonaProfile) {
    let count = 0;
    repo.sessions = repo.sessions.map((s) => {
      if (!s.isCurrentSession && s.status === 'ACTIVE') {
        count++;
        revokeSessionTokens(s.id);
        return { ...s, status: 'REVOKED' };
      }
      return s;
    });

    repo.logAudit({
      actorId: actor?.id || 'admin',
      actorName: actor?.name || 'Security Officer',
      actorRole: actor?.role || 'SUPER_ADMIN',
      action: 'SECURITY_MASS_SESSION_TERMINATION',
      entity: 'ActiveSession',
      entityId: `MASS_${Date.now()}`,
      details: `Emergency invalidation executed: Terminated ${count} active concurrent sessions across campus network.`,
      severity: 'CRITICAL',
      ipAddress: '127.0.0.1',
    });

    return { count };
  }
}

export const studentService = new StudentService();
export const admissionService = new AdmissionService();
export const bulkResourceService = new BulkResourceService();
export const examinationService = new ExaminationService();
export const feesService = new FeesService();
export const hostelService = new HostelService();
export const libraryService = new LibraryService();
export const securityService = new SecurityService();
