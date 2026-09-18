import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  studentService,
  admissionService,
  bulkResourceService,
  examinationService,
  feesService,
  hostelService,
  libraryService,
  securityService,
} from '../services/index.js';
import { facultyMarksService } from '../services/facultyMarksService.js';
import { academicResourceService } from '../services/academicResourceService.js';
import { repo } from '../repositories/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeToken,
} from '../security/jwt.js';
import { lockoutManager } from '../security/lockout.js';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  verifyEmailWithToken,
} from '../security/passwords.js';
import { setupMfa, verifyMfa } from '../security/mfa.js';
import {
  verifyPaymentSignature,
  validatePaymentWebhook,
} from '../security/payments.js';
import { validateUploadedFile } from '../security/files.js';
import { ActiveSession, AttendanceSessionRecord, AttendanceStudentEntry, CourseStructure, TimetableSlot } from '../types/index.js';

export const getPersonas = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.personas });
};

export const loginUser = (req: AuthenticatedRequest, res: Response) => {
  const { identifier, password, role, personaId, mfaCode } = req.body;
  const ip =
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const lookupKey = identifier || personaId || role || 'unknown';

  // 1. Account Lockout Check
  const lockStatus = lockoutManager.isLocked(lookupKey);
  if (lockStatus.locked) {
    const waitSec = lockStatus.remainingSeconds || 900;
    repo.logAudit({
      actorId: 'anonymous',
      actorName: 'Anonymous Visitor',
      actorRole: 'GUEST',
      action: 'IAM_LOGIN_LOCKED',
      entity: 'User',
      entityId: lookupKey,
      details: `Authentication blocked by statutory security policy: Account temporarily locked due to repeated failed logins. Retry in ${waitSec}s.`,
      severity: 'WARNING',
      ipAddress: ip,
      requestId: req.requestId,
    });
    return res.status(423).json({
      success: false,
      error: `Account is temporarily locked due to consecutive failed authentication attempts. Please retry in ${waitSec} seconds.`,
      retryAfterSeconds: waitSec,
    });
  }

  // 2. Identify persona
  let persona;
  if (personaId) {
    persona = repo.personas.find((p) => p.id === personaId);
  } else if (identifier) {
    const term = String(identifier).trim().toLowerCase();
    const userPrefix = term.includes('@') ? term.split('@')[0] : term;
    persona = repo.personas.find(
      (p) =>
        p.id.toLowerCase() === term ||
        p.email.toLowerCase() === term ||
        p.email.toLowerCase().replace('@nexusuniv.edu', '@hogward.edu') === term ||
        p.email.toLowerCase().replace('@hogward.edu', '@nexusuniv.edu') === term ||
        p.email.toLowerCase().split('@')[0] === userPrefix ||
        p.staffId.toLowerCase() === term ||
        (term === '2301031800159' && p.id === 'user_student') ||
        (term === '2601031800001' && p.id === 'user_student') ||
        (term === '21cs042' && p.id === 'user_student') ||
        (role && p.role === role)
    );

    // If identifier matches an enrolled student roll number or registration number
    if (!persona) {
      const studentMatch = repo.students.find(
        (s) =>
          s.rollNo.toLowerCase() === term ||
          (s.registrationNo && s.registrationNo.toLowerCase() === term)
      );
      if (studentMatch) {
        persona = repo.personas.find((p) => p.id === 'user_student' || p.role === 'STUDENT');
      }
    }
  } else if (role) {
    persona = repo.personas.find((p) => p.role === role);
  }

  // 3. Credentials Validation
  if (!persona) {
    const failStatus = lockoutManager.recordFailure(lookupKey);
    const attemptNum = 5 - failStatus.remainingAttempts;
    repo.logAudit({
      actorId: 'anonymous',
      actorName: 'Unknown',
      actorRole: 'GUEST',
      action: 'IAM_LOGIN_FAILED',
      entity: 'User',
      entityId: lookupKey,
      details: `Authentication failure: Institutional credentials not found. Attempt ${attemptNum}/5.`,
      severity: 'WARNING',
      ipAddress: ip,
      requestId: req.requestId,
    });
    return res.status(401).json({
      success: false,
      error: failStatus.locked
        ? 'Account has been temporarily locked due to 5 consecutive authentication failures.'
        : 'Invalid institutional credentials or designated role profile not found.',
      remainingAttempts: failStatus.remainingAttempts,
    });
  }

  if (password && persona.password && password !== persona.password) {
    const failStatus = lockoutManager.recordFailure(lookupKey);
    const attemptNum = 5 - failStatus.remainingAttempts;
    repo.logAudit({
      actorId: persona.id,
      actorName: persona.name,
      actorRole: persona.role,
      action: 'IAM_LOGIN_FAILED',
      entity: 'User',
      entityId: persona.id,
      details: `Incorrect security passcode entered for account ${persona.name} (${persona.role}). Attempt ${attemptNum}/5.`,
      severity: 'WARNING',
      ipAddress: ip,
      requestId: req.requestId,
    });
    return res.status(401).json({
      success: false,
      error: failStatus.locked
        ? 'Account has been temporarily locked due to 5 consecutive authentication failures.'
        : 'Incorrect security passcode for this institutional account.',
      remainingAttempts: failStatus.remainingAttempts,
    });
  }

  // 4. MFA Validation if enabled
  if (persona.mfaEnabled) {
    if (!mfaCode) {
      return res.status(200).json({
        success: true,
        requiresMfa: true,
        userId: persona.id,
        message: 'Two-factor authentication required. Please enter TOTP code or backup code.',
      });
    }
    const mfaValid = verifyMfa(persona.id, mfaCode);
    if (!mfaValid.success) {
      const failStatus = lockoutManager.recordFailure(lookupKey);
      return res.status(401).json({
        success: false,
        error: mfaValid.error || 'Invalid two-factor authentication code.',
        remainingAttempts: failStatus.remainingAttempts,
      });
    }
  }

  // 5. Successful login: reset lockout counter
  lockoutManager.recordSuccess(lookupKey);

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const accessToken = generateAccessToken(persona, sessionId);
  const refreshToken = generateRefreshToken(persona.id, sessionId);

  // Register in active sessions
  const newSession: ActiveSession = {
    id: sessionId,
    userId: persona.id,
    userName: persona.name,
    role: persona.role,
    device: (req.headers['user-agent'] as string) || 'Mozilla/5.0 Institutional Workstation',
    browser: 'Chrome/Institutional',
    location: 'Campus Network',
    ipAddress: ip,
    loginTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
    lastActive: new Date().toISOString().replace('T', ' ').substring(0, 16),
    status: 'ACTIVE',
    isCurrentSession: true,
  };
  repo.sessions.unshift(newSession);

  repo.logAudit({
    actorId: persona.id,
    actorName: persona.name,
    actorRole: persona.role,
    action: 'IAM_LOGIN_SUCCESS',
    entity: 'Session',
    entityId: sessionId,
    details: `Authenticated user ${persona.name} (${persona.roleLabel}) into ${persona.role} clearance zone. Issued cryptographically signed JWT token.`,
    severity: 'INFO',
    ipAddress: ip,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: persona,
    token: accessToken,
    accessToken,
    refreshToken,
    sessionId,
    message: `Authenticated as ${persona.name} (${persona.roleLabel})`,
  });
};

export const refreshTokenHandler = (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required.' });
  }

  try {
    const rotated = rotateRefreshToken(refreshToken);
    res.json({
      success: true,
      accessToken: rotated.newAccessToken,
      refreshToken: rotated.newRefreshToken,
      token: rotated.newAccessToken,
      user: rotated.user,
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Invalid, expired, or previously rotated refresh token. Re-authentication required.',
    });
  }
};

export const forgotPasswordHandler = (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Institutional email address is required.' });
  }

  const persona = repo.personas.find((p) => p.email.toLowerCase() === email.toLowerCase());
  const token = createPasswordResetToken(persona ? persona.id : 'unknown', email);

  repo.logAudit({
    actorId: 'system',
    actorName: 'IAM Password Recovery',
    actorRole: 'SYSTEM',
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'User',
    entityId: email,
    details: `Password reset token generated for ${email}. Token valid for 15 minutes.`,
    severity: 'INFO',
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    requestId: req.requestId,
  });

  // In production, token is sent via email; return confirmation
  res.json({
    success: true,
    message: 'If an account exists with this email, password reset instructions have been dispatched.',
    resetToken: token, // Provided for testing in development sandbox
  });
};

export const resetPasswordHandler = (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Token and newPassword are required.' });
  }

  const result = consumePasswordResetToken(token);
  if (!result.valid || !result.userId) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Invalid, expired, or already consumed password reset token.',
    });
  }

  const user = repo.personas.find((p) => p.id === result.userId);
  if (user) {
    user.password = newPassword;
  }

  repo.logAudit({
    actorId: result.userId,
    actorName: user?.name || 'User',
    actorRole: user?.role || 'STUDENT',
    action: 'PASSWORD_RESET_COMPLETED',
    entity: 'User',
    entityId: result.userId,
    details: 'Institutional account passcode was updated successfully via one-time reset token.',
    severity: 'INFO',
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    requestId: req.requestId,
  });

  res.json({ success: true, message: 'Institutional passcode updated successfully. Please log in.' });
};

export const verifyEmailHandler = (req: AuthenticatedRequest, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Verification token is required.' });
  }

  const email = verifyEmailWithToken(token);
  if (!email) {
    return res.status(400).json({ success: false, error: 'Invalid or expired email verification token.' });
  }

  res.json({ success: true, message: `Email address ${email} has been verified successfully.` });
};

export const setupMfaHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const result = setupMfa(req.user.id, req.user.email);
  res.json({ success: true, data: result });
};

export const verifyMfaHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'MFA code is required.' });
  }

  const check = verifyMfa(req.user.id, code);
  if (!check.success) {
    return res.status(400).json({ success: false, error: check.error || 'Invalid code' });
  }

  res.json({ success: true, message: 'Two-factor authentication verified successfully.' });
};

export const logoutUser = (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    revokeToken(token);
  }

  if (req.user) {
    if (req.sessionId) {
      const sess = repo.sessions.find((s) => s.id === req.sessionId);
      if (sess) sess.status = 'REVOKED';
    }

    repo.logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'IAM_LOGOUT',
      entity: 'Session',
      entityId: req.sessionId || `sess_${Date.now()}`,
      details: `Terminated active IAM session and invalidated JWT token for ${req.user.name} (${req.user.roleLabel}).`,
      severity: 'INFO',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '10.240.12.88',
      requestId: req.requestId,
    });
  }
  res.json({ success: true, message: 'Session securely terminated.' });
};

export const getStudents = (req: AuthenticatedRequest, res: Response) => {
  const { search, department, status } = req.query;
  let data = studentService.getAll({
    search: search as string,
    department: department as string,
    status: status as string,
  });

  // Authorization: Student self-access isolation
  if (req.user?.role === 'STUDENT') {
    data = data.filter(
      (s) =>
        s.rollNo === req.user?.staffId ||
        s.id === req.user?.id ||
        s.name.toLowerCase() === req.user?.name.toLowerCase()
    );
  } else if (
    req.user?.role === 'FACULTY' &&
    req.user.department &&
    req.user.department !== 'ALL'
  ) {
    // Authorization: Department-level row scoping
    data = data.filter(
      (s) =>
        s.department === req.user?.department ||
        s.departmentId === req.user?.department ||
        (req.user?.department && req.user.department.toLowerCase().includes(s.department.toLowerCase()))
    );
  }

  res.json({ success: true, data, count: data.length });
};

export const getStudentById = (req: AuthenticatedRequest, res: Response) => {
  const student = studentService.getById(req.params.id as string);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  // Student self-access check
  if (
    req.user?.role === 'STUDENT' &&
    student.rollNo !== req.user?.staffId &&
    student.id !== req.user?.id &&
    student.name.toLowerCase() !== req.user?.name.toLowerCase()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Students are restricted to accessing their own academic record.',
    });
  }

  // Department row scoping check for faculty
  if (
    req.user?.role === 'FACULTY' &&
    req.user.department &&
    req.user.department !== 'ALL' &&
    student.department !== req.user.department &&
    student.departmentId !== req.user.department
  ) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Faculty clearance is scoped strictly to designated academic department.',
    });
  }

  res.json({ success: true, data: student });
};

export const createStudent = (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = studentService.create(req.body, req.user);
    res.status(201).json({ success: true, data: student });
  } catch (err: any) {
    const status = err.message.includes('already registered') || err.message.includes('Conflict') ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
};

export const deleteStudent = (req: AuthenticatedRequest, res: Response) => {
  try {
    studentService.delete(req.params.id as string, req.user);
    res.json({ success: true, message: 'Student successfully deleted (soft-deleted)' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getAdmissions = (req: AuthenticatedRequest, res: Response) => {
  const data = admissionService.getAll();
  res.json({ success: true, data, count: data.length });
};

export const createAdmission = (req: AuthenticatedRequest, res: Response) => {
  try {
    const app = admissionService.create(req.body, req.user);
    res.status(201).json({ success: true, data: app });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const updateAdmissionStatus = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const app = admissionService.updateStatus(req.params.id as string, status, req.user);
    res.json({ success: true, data: app });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getAcademicCourses = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.courses });
};

export const updateAcademicCourse = (req: AuthenticatedRequest, res: Response) => {
  try {
    const courseId = req.params.id as string;
    const courseIndex = repo.courses.findIndex((c) => c.id === courseId || c.code === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ success: false, error: 'Course not found in registry' });
    }

    const currentCourse = repo.courses[courseIndex];
    const updatedCourse: CourseStructure = {
      ...currentCourse,
      ...req.body,
      id: currentCourse.id, // preserve ID
      code: req.body.code || currentCourse.code,
      title: req.body.title || currentCourse.title,
      modules: req.body.modules || currentCourse.modules || [],
      arrearDetails: req.body.arrearDetails ? {
        ...(currentCourse.arrearDetails || {}),
        ...req.body.arrearDetails,
      } : currentCourse.arrearDetails,
    };

    repo.courses[courseIndex] = updatedCourse;

    repo.logAudit({
      actorId: req.user?.id || 'SYS',
      actorName: req.user?.name || 'Faculty Member',
      actorRole: req.user?.role || 'FAC_MEMBER',
      action: 'COURSE_SYLLABUS_UPDATED',
      entity: 'COURSE_STRUCTURE',
      entityId: updatedCourse.id,
      severity: 'INFO',
      details: `Faculty/Admin updated syllabus & arrear guidelines for ${updatedCourse.code} (${updatedCourse.title})`,
      ipAddress: '127.0.0.1',
    });

    res.json({ success: true, data: updatedCourse });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTimetable = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.timetable });
};

export const createTimetableSlot = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { day, startTime, endTime, courseCode, subject, faculty, room, batch, type } = req.body;
    if (!day || !startTime || !endTime || !courseCode || !room) {
      return res.status(400).json({ success: false, error: 'Missing required timetable slot fields' });
    }

    const newSlot: TimetableSlot = {
      id: `tt_${Date.now()}`,
      day,
      startTime,
      endTime,
      courseCode,
      courseName: subject || courseCode,
      subject: subject || courseCode,
      faculty: faculty || req.user?.name || 'Assigned Faculty',
      instructor: faculty || req.user?.name || 'Assigned Faculty',
      room,
      batch: batch || 'Batch CSE-A (Sem 6)',
      type: type || 'Lecture',
    };

    repo.timetable.push(newSlot);

    repo.logAudit({
      actorId: req.user?.id || 'SYS',
      actorName: req.user?.name || 'Faculty Member',
      actorRole: req.user?.role || 'FAC_MEMBER',
      action: 'TIMETABLE_SLOT_CREATED',
      entity: 'TIMETABLE_SLOT',
      entityId: newSlot.id,
      severity: 'INFO',
      details: `Created timetable slot for ${newSlot.courseCode} on ${newSlot.day} (${newSlot.startTime} - ${newSlot.endTime}) in ${newSlot.room}`,
      ipAddress: '127.0.0.1',
    });

    res.status(201).json({ success: true, data: newSlot });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateTimetableSlot = (req: AuthenticatedRequest, res: Response) => {
  try {
    const slotId = req.params.id as string;
    const slotIndex = repo.timetable.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) {
      return res.status(404).json({ success: false, error: 'Timetable slot not found' });
    }

    const current = repo.timetable[slotIndex];
    const updated: TimetableSlot = {
      ...current,
      ...req.body,
      id: current.id,
    };

    repo.timetable[slotIndex] = updated;

    repo.logAudit({
      actorId: req.user?.id || 'SYS',
      actorName: req.user?.name || 'Faculty Member',
      actorRole: req.user?.role || 'FAC_MEMBER',
      action: 'TIMETABLE_SLOT_UPDATED',
      entity: 'TIMETABLE_SLOT',
      entityId: updated.id,
      severity: 'INFO',
      details: `Rescheduled/Updated slot for ${updated.courseCode} on ${updated.day} (${updated.startTime} - ${updated.endTime}) in ${updated.room}`,
      ipAddress: '127.0.0.1',
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteTimetableSlot = (req: AuthenticatedRequest, res: Response) => {
  try {
    const slotId = req.params.id as string;
    const slotIndex = repo.timetable.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) {
      return res.status(404).json({ success: false, error: 'Timetable slot not found' });
    }

    const [deleted] = repo.timetable.splice(slotIndex, 1);

    repo.logAudit({
      actorId: req.user?.id || 'SYS',
      actorName: req.user?.name || 'Faculty Member',
      actorRole: req.user?.role || 'FAC_MEMBER',
      action: 'TIMETABLE_SLOT_DELETED',
      entity: 'TIMETABLE_SLOT',
      entityId: deleted.id,
      severity: 'INFO',
      details: `Cancelled/Deleted slot for ${deleted.courseCode} on ${deleted.day}`,
      ipAddress: '127.0.0.1',
    });

    res.json({ success: true, data: deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAttendanceSummary = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.attendance });
};

export const getAttendanceSessions = (req: AuthenticatedRequest, res: Response) => {
  const { courseCode } = req.query;
  let sessions = repo.attendanceSessions || [];
  if (courseCode) {
    sessions = sessions.filter((s) => s.courseCode === courseCode);
  }
  res.json({ success: true, data: sessions });
};

export const getAttendanceRoster = (req: AuthenticatedRequest, res: Response) => {
  const { courseCode, division } = req.query;
  const students = repo.students
    .filter((s) => !s.isDeleted && (s.departmentId === 'dept_cs' || s.department.includes('Computer')))
    .map((s) => {
      const hasSwipe = Math.random() > 0.08;
      const isLate = hasSwipe && Math.random() < 0.1;
      const minute = isLate ? Math.floor(Math.random() * 8) + 11 : Math.floor(Math.random() * 10);
      const second = Math.floor(Math.random() * 59);
      const timeStr = `${isLate ? '10' : '09'}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')} AM`;
      return {
        studentId: s.id,
        rollNo: s.rollNo,
        registrationNo: s.registrationNo,
        name: s.name,
        email: s.email,
        department: s.department,
        currentAttendancePct: s.attendancePercent || 90,
        rfidTagId: `RFID-${s.rollNo}`,
        rfidStatus: hasSwipe ? (isLate ? 'LATE_SCAN' : 'VALID_SCAN') : 'NO_SIGNAL',
        rfidTimestamp: hasSwipe ? timeStr : undefined,
        suggestedStatus: hasSwipe ? (isLate ? 'LATE' : 'PRESENT') : 'ABSENT',
      };
    });
  res.json({ success: true, data: students });
};

export const markAttendanceSession = (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      courseCode,
      courseName,
      department,
      semester,
      division,
      hall,
      date,
      timeSlot,
      topic,
      records,
    } = req.body;

    if (!courseCode || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Course code and student records are required.' });
    }

    const presentCount = records.filter((r: any) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r: any) => r.status === 'ABSENT').length;
    const lateCount = records.filter((r: any) => r.status === 'LATE').length;
    const totalStudents = records.length;
    const turnoutPercentage = totalStudents > 0 ? Number(((presentCount / totalStudents) * 100).toFixed(1)) : 0;

    const newSession: AttendanceSessionRecord = {
      id: `att_sess_${Date.now()}`,
      courseCode,
      courseName: courseName || courseCode,
      department: department || 'Computer Science & Engineering',
      semester: semester || 6,
      division: division || 'A',
      facultyId: req.user?.id || 'user_faculty_cse',
      facultyName: req.user?.name || 'Dr. P. Sundaram',
      hall: hall || 'LH-302',
      date: date || new Date().toISOString().split('T')[0],
      timeSlot: timeSlot || '10:00 AM - 11:00 AM',
      topic: topic || 'Regular Lecture Session',
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      turnoutPercentage,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isSealed: true,
      ledgerTxId: `TX-ATT-${Date.now()}-${courseCode}`,
      records,
    };

    repo.attendanceSessions.unshift(newSession);

    const courseSummary = repo.attendance.find((a) => a.courseCode === courseCode);
    if (courseSummary) {
      courseSummary.totalLectures = (courseSummary.totalLectures || 0) + 1;
      courseSummary.averageAttendance = Number(
        (((courseSummary.averageAttendance * (courseSummary.totalLectures - 1)) + turnoutPercentage) / courseSummary.totalLectures).toFixed(1)
      );
    }

    repo.logAudit({
      actorId: req.user?.id || 'user_faculty_cse',
      actorName: req.user?.name || 'Faculty Member',
      actorRole: req.user?.role || 'FAC_MEMBER',
      action: 'ATTENDANCE_SESSION_COMMITTED',
      entity: 'ATTENDANCE_SESSION',
      entityId: newSession.id,
      severity: 'INFO',
      details: `Faculty sealed lecture attendance session for ${courseCode} (${newSession.topic}): ${presentCount}/${totalStudents} Present (${turnoutPercentage}% Turnout)`,
      ipAddress: '127.0.0.1',
    });

    res.json({ success: true, data: newSession });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getResources = (req: AuthenticatedRequest, res: Response) => {
  const { type, department, course, division, batch, search, studentPerspectiveId } = req.query;
  const list = academicResourceService.getAll({
    user: req.user,
    type: type as string,
    department: department as string,
    course: course as string,
    division: division as string,
    batch: batch as string,
    search: search as string,
    studentPerspectiveId: studentPerspectiveId as string,
  });
  res.json({ success: true, data: list, count: list.length });
};

export const getResourceById = (req: AuthenticatedRequest, res: Response) => {
  const resource = academicResourceService.getById(req.params.id as string);
  if (!resource) {
    return res.status(404).json({ success: false, error: 'Resource not found' });
  }
  res.json({ success: true, data: resource });
};

export const createResource = (req: AuthenticatedRequest, res: Response) => {
  try {
    const resource = academicResourceService.create(req.body, req.user);
    res.status(201).json({ success: true, data: resource });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const updateResource = (req: AuthenticatedRequest, res: Response) => {
  try {
    const resource = academicResourceService.update(req.params.id as string, req.body, req.user);
    res.json({ success: true, data: resource });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const deleteResource = (req: AuthenticatedRequest, res: Response) => {
  try {
    academicResourceService.delete(req.params.id as string, req.user);
    res.json({ success: true, message: 'Resource successfully deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const validateResourceUpload = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileData, fileName, fileType } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: 'Spreadsheet file data payload is required.' });
    }

    // Inspect file buffer for MIME type and magic bytes
    let buffer: Buffer;
    if (fileData.startsWith('data:')) {
      const base64Part = fileData.split(',')[1] || '';
      buffer = Buffer.from(base64Part, 'base64');
    } else {
      buffer = Buffer.from(fileData, 'base64');
    }

    const declaredType = (fileType as any) || (fileName?.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx');
    const fileCheck = validateUploadedFile(buffer, declaredType);
    if (!fileCheck.valid) {
      return res.status(400).json({ success: false, error: `File security rejection: ${fileCheck.error}` });
    }

    const result = academicResourceService.parseAndValidateWorkbook({
      fileData,
      fileName: fileName || 'academic_resources.xlsx',
      fileType: fileType || (fileName?.endsWith('.csv') ? 'csv' : 'xlsx'),
      actor: req.user,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const confirmResourceImport = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId, importOnlyValid, excludedRowNumbers } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Request ID is required to commit staged import.' });
    }
    const result = academicResourceService.confirmImport({
      requestId,
      importOnlyValid: importOnlyValid !== false,
      excludedRowNumbers,
      actor: req.user,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const downloadResourceTemplate = (req: AuthenticatedRequest, res: Response) => {
  const format = (req.query.format as string) || 'csv';
  const content = academicResourceService.generateTemplate();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="academic_resources_template_2026.csv"');
  res.send(content);
};

export const downloadResourceErrorReport = (req: AuthenticatedRequest, res: Response) => {
  const requestId = req.params.requestId as string;
  const content = academicResourceService.generateErrorReport(requestId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="error_report_${requestId}.csv"`);
  res.send(content);
};

export const getResourceAuditLogs = (req: AuthenticatedRequest, res: Response) => {
  const logs = academicResourceService.getAuditLogs();
  res.json({ success: true, data: logs, count: logs.length });
};

export const bulkUploadResources = (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = req.body.items || [];
    const data = bulkResourceService.bulkUpload(items, req.user);
    res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const excludeDeficiencies = (req: AuthenticatedRequest, res: Response) => {
  const result = bulkResourceService.excludeDeficiencies(req.user);
  res.json({ success: true, count: result.count });
};

export const publishResources = (req: AuthenticatedRequest, res: Response) => {
  const result = bulkResourceService.publishAll(req.user);
  res.json({ success: true, count: result.count });
};

export const getExaminationMarks = (req: AuthenticatedRequest, res: Response) => {
  let marks = examinationService.getAllMarks();
  if (req.user?.role === 'STUDENT' || req.user?.role === 'STUDENT_REP') {
    marks = marks.filter(
      (m) =>
        m.rollNo === req.user?.staffId ||
        m.studentId === req.user?.id ||
        (m.studentName && req.user?.name && m.studentName.toLowerCase().includes(req.user.name.toLowerCase()))
    );
  }
  res.json({ success: true, data: marks });
};

export const updateMarkCell = (req: AuthenticatedRequest, res: Response) => {
  try {
    const mark = examinationService.updateMarkCell(req.params.id as string, req.body, req.user);
    res.json({ success: true, data: mark });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const commitLedger = (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = examinationService.commitLedger(req.user);
    res.json({ success: true, message: `Committed ${result.count} marks to COE Master Ledger` });
  } catch (err: any) {
    res.status(422).json({ success: false, error: err.message });
  }
};

// ==========================================
// FACULTY BULK MARKS UPLOAD CONTROLLERS
// ==========================================

export const getFacultyScope = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Persona not identified' });
    }
    const scope = facultyMarksService.getAcademicScope(req.user);
    res.json({ success: true, data: scope });
  } catch (err: any) {
    const status = err.message.includes('403') || err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
};

export const downloadFacultyMarksTemplate = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Persona not identified' });
    }
    const params = {
      academicYear: (req.query.academicYear as string) || '2025-2026',
      term: (req.query.term as string) || 'Spring 2026 (Even Semester)',
      examId: (req.query.examId as string) || 'EXAM-2026-END',
      courseId: (req.query.courseId as string) || 'dept_cs_btech',
      subjectCode: (req.query.subjectCode as string) || 'CS601',
      division: (req.query.division as string) || 'Division A',
    };
    const { buffer, filename } = facultyMarksService.generateExcelTemplate(params, req.user);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    const status = err.message.includes('403') || err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
};

export const validateFacultyMarksUpload = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Persona not identified' });
    }
    const result = facultyMarksService.validateUpload(req.body, req.user);
    res.json({ success: true, data: result });
  } catch (err: any) {
    const status = err.message.includes('403') || err.message.includes('Forbidden') ? 403 : 422;
    res.status(status).json({ success: false, error: err.message });
  }
};

export const confirmFacultyMarksImport = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Persona not identified' });
    }
    const result = facultyMarksService.confirmImport(req.body, req.user);
    res.json({ success: true, data: result });
  } catch (err: any) {
    const status = err.message.includes('403') || err.message.includes('Forbidden') ? 403 : 422;
    res.status(status).json({ success: false, error: err.message });
  }
};

export const downloadFacultyMarksErrorReport = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows, examName, subjectCode } = req.body;
    const { buffer, filename } = facultyMarksService.generateErrorReport(
      rows || [],
      examName || 'Exam',
      subjectCode || 'Subject'
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getFees = (req: AuthenticatedRequest, res: Response) => {
  // Least privilege access control:
  // Super Admin and Bursar/Finance have full university fees access
  // Students have self-access isolation (their own challans only)
  // Other roles without financial clearance have no access to student fee ledgers
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'BURSAR_FINANCE' && req.user?.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied (403): Fee platform and treasury accounts are restricted to Bursar (Finance) and Super Admin only.',
    });
  }

  let list = feesService.getAll();
  // Authorization: Student self-access isolation
  if (req.user?.role === 'STUDENT') {
    list = list.filter(
      (f) =>
        f.rollNo === req.user?.staffId ||
        f.studentName.toLowerCase() === req.user?.name.toLowerCase()
    );
  }
  res.json({ success: true, data: list });
};

export const recordFeePayment = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'BURSAR_FINANCE') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied (403): Only Bursar / Treasury Officer and Super Admin can record fee payments.',
      });
    }

    const amount = Number(req.body.amount || 0);
    const { orderId, paymentId, signature } = req.body;

    // Cryptographic signature check if external gateway payment details are supplied
    if (signature && orderId && paymentId) {
      const isSigValid = verifyPaymentSignature(orderId, paymentId, signature);
      if (!isSigValid) {
        return res.status(400).json({
          success: false,
          error: 'Payment transaction rejected: Cryptographic signature mismatch. Possible payload tampering.',
        });
      }
    }

    const data = feesService.recordPayment(req.params.id as string, amount, req.user);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const handlePaymentWebhook = (req: AuthenticatedRequest, res: Response) => {
  const signature = (req.headers['x-razorpay-signature'] as string) || '';
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || '';

  const webhookCheck = validatePaymentWebhook(rawBody, signature, idempotencyKey);
  if (!webhookCheck.valid) {
    return res.status(400).json({ success: false, error: webhookCheck.error });
  }

  repo.logAudit({
    actorId: 'payment_gateway',
    actorName: 'Payment Gateway Webhook',
    actorRole: 'SYSTEM',
    action: 'PAYMENT_WEBHOOK_PROCESSED',
    entity: 'FeeChallan',
    entityId: `WH_${Date.now()}`,
    details: `Processed verified payment gateway event. Idempotency key: ${idempotencyKey || 'none'}.`,
    severity: 'INFO',
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    requestId: req.requestId,
  });

  res.json({ success: true, message: 'Webhook signature authenticated and processed.' });
};

export const getHostels = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: hostelService.getAll() });
};

export const allocateHostelBed = (req: AuthenticatedRequest, res: Response) => {
  try {
    const room = hostelService.allocateBed(req.params.id as string, req.body, req.user);
    res.json({ success: true, data: room });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getLibraryBooks = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: libraryService.getAll() });
};

export const issueLibraryBook = (req: AuthenticatedRequest, res: Response) => {
  try {
    const book = libraryService.issueBook(req.params.id as string, req.body.studentName || 'Student', req.user);
    res.json({ success: true, data: book });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const returnLibraryBook = (req: AuthenticatedRequest, res: Response) => {
  try {
    const book = libraryService.returnBook(req.params.id as string, req.user);
    res.json({ success: true, data: book });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getFaculty = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.faculty });
};

export const getNotices = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.notices });
};

export const createNotice = (req: AuthenticatedRequest, res: Response) => {
  const newNotice = {
    id: `not_${Date.now()}`,
    circularNo: `CIRC-2026/${Math.floor(100 + Math.random() * 900)}`,
    title: req.body.title || 'Official Circular',
    category: req.body.category || 'Academic',
    targetAudience: req.body.targetAudience || 'All Campus',
    publishedDate: new Date().toISOString().substring(0, 10),
    content: req.body.content || '',
    priority: req.body.priority || 'Standard',
    issuer: req.user?.roleLabel || 'Dean Secretariat',
  };
  repo.notices.unshift(newNotice);
  repo.logAudit({
    actorId: req.user?.id || 'admin',
    actorName: req.user?.name || 'Dean Secretariat',
    actorRole: req.user?.role || 'SUPER_ADMIN',
    action: 'CIRCULAR_BROADCAST',
    entity: 'NoticeCircular',
    entityId: newNotice.id,
    details: `Broadcasted circular #${newNotice.circularNo}: "${newNotice.title}" to ${newNotice.targetAudience}.`,
    severity: 'INFO',
    ipAddress: '127.0.0.1',
  });
  res.status(201).json({ success: true, data: newNotice });
};

export const getDocuments = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.documents });
};

export const getSessions = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: securityService.getSessions() });
};

export const revokeSession = (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = securityService.revokeSession(req.params.id as string, req.user);
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const unlockSession = (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = securityService.unlockSession(req.params.id as string, req.user);
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const terminateAllOtherSessions = (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id || 'user_super_admin';
    const result = securityService.terminateAllOtherSessions(currentUserId, req.user);
    res.json({ success: true, message: `Terminated ${result.count} remote sessions` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getAuditLogs = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: repo.auditLogs });
};
