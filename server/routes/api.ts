import { Router } from 'express';
import {
  authMiddleware,
  requireRole,
  requireDepartmentScoping,
  requireFacultyGradingPermission,
} from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import {
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  CreateStudentSchema,
  CreateAdmissionSchema,
  UpdateAdmissionStatusSchema,
  CreateResourceSchema,
  ValidateResourceUploadSchema,
  ConfirmResourceImportSchema,
  UpdateMarkCellSchema,
  RecordFeePaymentSchema,
  AllocateHostelBedSchema,
  IssueLibraryBookSchema,
  CreateNoticeSchema,
} from '../validators/schemas.js';
import {
  getPersonas,
  getStudents,
  getStudentById,
  createStudent,
  deleteStudent,
  getAdmissions,
  createAdmission,
  updateAdmissionStatus,
  getAcademicCourses,
  updateAcademicCourse,
  getTimetable,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getAttendanceSummary,
  getAttendanceSessions,
  getAttendanceRoster,
  markAttendanceSession,
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  validateResourceUpload,
  confirmResourceImport,
  downloadResourceTemplate,
  downloadResourceErrorReport,
  getResourceAuditLogs,
  bulkUploadResources,
  excludeDeficiencies,
  publishResources,
  getExaminationMarks,
  updateMarkCell,
  commitLedger,
  getFacultyScope,
  downloadFacultyMarksTemplate,
  validateFacultyMarksUpload,
  confirmFacultyMarksImport,
  downloadFacultyMarksErrorReport,
  getFees,
  recordFeePayment,
  handlePaymentWebhook,
  getHostels,
  allocateHostelBed,
  getLibraryBooks,
  issueLibraryBook,
  returnLibraryBook,
  getFaculty,
  getNotices,
  createNotice,
  getDocuments,
  getSessions,
  revokeSession,
  unlockSession,
  terminateAllOtherSessions,
  getAuditLogs,
  loginUser,
  refreshTokenHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  verifyEmailHandler,
  setupMfaHandler,
  verifyMfaHandler,
  logoutUser,
} from '../controllers/index.js';

export const apiRouter = Router();

// Public Authentication & IAM Gateway
apiRouter.post('/auth/login', authRateLimiter, validateRequest(LoginSchema), loginUser);
apiRouter.post('/auth/refresh', validateRequest(RefreshTokenSchema), refreshTokenHandler);
apiRouter.post('/auth/forgot-password', authRateLimiter, validateRequest(ForgotPasswordSchema), forgotPasswordHandler);
apiRouter.post('/auth/reset-password', authRateLimiter, validateRequest(ResetPasswordSchema), resetPasswordHandler);
apiRouter.post('/auth/verify-email', validateRequest(VerifyEmailSchema), verifyEmailHandler);
apiRouter.post('/payments/webhook', handlePaymentWebhook);
apiRouter.get('/personas', getPersonas);

// All subsequent routes require valid cryptographically signed JWT in Authorization header
apiRouter.use(authMiddleware);

// Session Lifecycle & MFA
apiRouter.post('/auth/logout', logoutUser);
apiRouter.post('/auth/mfa/setup', setupMfaHandler);
apiRouter.post('/auth/mfa/verify', verifyMfaHandler);

// Students (Self-access for students, Department scoping for faculty, Admin for management)
apiRouter.get('/students', getStudents);
apiRouter.get('/students/:id', getStudentById);
apiRouter.post(
  '/students',
  requireRole(['SUPER_ADMIN', 'REGISTRAR', 'ACADEMIC_ADMIN']),
  validateRequest(CreateStudentSchema),
  createStudent
);
apiRouter.delete(
  '/students/:id',
  requireRole(['SUPER_ADMIN', 'REGISTRAR']),
  deleteStudent
);

// Admissions (Registration / Enrollment office)
apiRouter.get(
  '/admissions',
  requireRole(['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER', 'ACADEMIC_ADMIN']),
  getAdmissions
);
apiRouter.post(
  '/admissions',
  requireRole(['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER']),
  validateRequest(CreateAdmissionSchema),
  createAdmission
);
apiRouter.patch(
  '/admissions/:id/status',
  requireRole(['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER']),
  validateRequest(UpdateAdmissionStatusSchema),
  updateAdmissionStatus
);

// Academic Structures
apiRouter.get('/academic/courses', getAcademicCourses);
apiRouter.put(
  '/academic/courses/:id',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'HOD_CSE', 'DEAN_ACADEMICS']),
  updateAcademicCourse
);
apiRouter.get('/academic/timetable', getTimetable);
apiRouter.post(
  '/academic/timetable',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'HOD_CSE', 'DEAN_ACADEMICS']),
  createTimetableSlot
);
apiRouter.put(
  '/academic/timetable/:id',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'HOD_CSE', 'DEAN_ACADEMICS']),
  updateTimetableSlot
);
apiRouter.delete(
  '/academic/timetable/:id',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'HOD_CSE', 'DEAN_ACADEMICS']),
  deleteTimetableSlot
);
apiRouter.get('/academic/attendance', getAttendanceSummary);
apiRouter.get('/academic/attendance/sessions', getAttendanceSessions);
apiRouter.get('/academic/attendance/roster', getAttendanceRoster);
apiRouter.post(
  '/academic/attendance/session',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'HOD_CSE', 'DEAN_ACADEMICS']),
  markAttendanceSession
);
apiRouter.get('/academic/documents', getDocuments);

// Academic Resources & Announcements Automation Module
apiRouter.get('/resources/template', downloadResourceTemplate);
apiRouter.get('/resources/audit-logs', getResourceAuditLogs);
apiRouter.get('/resources/error-report/:requestId', downloadResourceErrorReport);
apiRouter.get('/resources', getResources);
apiRouter.get('/resources/:id', getResourceById);
apiRouter.post(
  '/resources',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN', 'REGISTRAR']),
  validateRequest(CreateResourceSchema),
  createResource
);
apiRouter.put(
  '/resources/:id',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  updateResource
);
apiRouter.delete(
  '/resources/:id',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  deleteResource
);
apiRouter.post(
  '/resources/validate',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  validateRequest(ValidateResourceUploadSchema),
  validateResourceUpload
);
apiRouter.post(
  '/resources/confirm-import',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  validateRequest(ConfirmResourceImportSchema),
  confirmResourceImport
);
apiRouter.post(
  '/resources/bulk',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  bulkUploadResources
);
apiRouter.post(
  '/resources/exclude-deficiencies',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  excludeDeficiencies
);
apiRouter.post(
  '/resources/publish',
  requireRole(['SUPER_ADMIN', 'FAC_MEMBER', 'FACULTY', 'HOD_CSE', 'HOD', 'DEAN_ACADEMICS', 'ACADEMIC_ADMIN']),
  publishResources
);

// Examinations
apiRouter.get(
  '/examinations/marks',
  requireRole([
    'SUPER_ADMIN',
    'COE_OFFICER',
    'COE',
    'HOD_CSE',
    'HOD',
    'FAC_MEMBER',
    'FACULTY',
    'DEAN_ACADEMICS',
    'STUDENT',
    'STUDENT_REP',
  ]),
  getExaminationMarks
);
apiRouter.patch(
  '/examinations/marks/:id',
  requireRole(['SUPER_ADMIN', 'COE_OFFICER', 'COE', 'HOD_CSE', 'HOD', 'FAC_MEMBER', 'FACULTY']),
  validateRequest(UpdateMarkCellSchema),
  updateMarkCell
);
apiRouter.post(
  '/examinations/commit',
  requireRole(['SUPER_ADMIN', 'COE_OFFICER', 'COE']),
  commitLedger
);

// Faculty Bulk Examination Marks Upload (Scoped & RBAC Protected)
apiRouter.get('/examinations/faculty/scope', requireFacultyGradingPermission, getFacultyScope);
apiRouter.get('/examinations/faculty/template', requireFacultyGradingPermission, downloadFacultyMarksTemplate);
apiRouter.post('/examinations/faculty/validate-upload', requireFacultyGradingPermission, validateFacultyMarksUpload);
apiRouter.post('/examinations/faculty/confirm-import', requireFacultyGradingPermission, confirmFacultyMarksImport);
apiRouter.post('/examinations/faculty/error-report', requireFacultyGradingPermission, downloadFacultyMarksErrorReport);

// Fees & Payments
apiRouter.get('/fees', getFees);
apiRouter.post(
  '/fees/:id/pay',
  requireRole(['SUPER_ADMIN', 'BURSAR_FINANCE']),
  validateRequest(RecordFeePaymentSchema),
  recordFeePayment
);

// Hostel & Living
apiRouter.get('/hostels', getHostels);
apiRouter.post(
  '/hostels/:id/allocate',
  requireRole(['SUPER_ADMIN', 'HOSTEL_WARDEN', 'REGISTRAR']),
  validateRequest(AllocateHostelBedSchema),
  allocateHostelBed
);

// Library
apiRouter.get('/library/books', getLibraryBooks);
apiRouter.post(
  '/library/books/:id/issue',
  requireRole(['SUPER_ADMIN', 'LIBRARIAN']),
  validateRequest(IssueLibraryBookSchema),
  issueLibraryBook
);
apiRouter.post(
  '/library/books/:id/return',
  requireRole(['SUPER_ADMIN', 'LIBRARIAN']),
  returnLibraryBook
);

// Faculty HR
apiRouter.get('/faculty', getFaculty);

// Notices & Circulars
apiRouter.get('/notices', getNotices);
apiRouter.post(
  '/notices',
  requireRole(['SUPER_ADMIN', 'DEAN_ACADEMICS', 'REGISTRAR', 'ACADEMIC_ADMIN', 'HOD_CSE', 'HOD', 'FAC_MEMBER']),
  validateRequest(CreateNoticeSchema),
  createNotice
);

// Security Active Sessions (Super Admin & Security Officers only)
apiRouter.get('/sessions', requireRole(['SUPER_ADMIN']), getSessions);
apiRouter.post('/sessions/:id/revoke', requireRole(['SUPER_ADMIN']), revokeSession);
apiRouter.post('/sessions/:id/unlock', requireRole(['SUPER_ADMIN']), unlockSession);
apiRouter.post('/sessions/terminate-all', requireRole(['SUPER_ADMIN']), terminateAllOtherSessions);

// System Audit Logs (Auditors, Super Admins, Registrars)
apiRouter.get('/audit-logs', requireRole(['SUPER_ADMIN', 'COE_OFFICER', 'COE', 'REGISTRAR', 'DEAN_ACADEMICS', 'BURSAR_FINANCE']), getAuditLogs);

