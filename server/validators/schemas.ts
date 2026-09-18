import { z } from 'zod';

// Regex constants
export const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const ROLL_NO_REGEX = /^[A-Z0-9\-]{5,20}$/;
export const PHONE_REGEX = /^(\+?[0-9\s\-]{8,18})$/;

// Path parameter schemas
export const IdParamSchema = z
  .object({
    id: z.string().min(1).max(64).regex(ID_REGEX, 'Invalid ID format'),
  })
  .strict();

export const RequestIdParamSchema = z
  .object({
    requestId: z.string().min(1).max(64).regex(ID_REGEX, 'Invalid Request ID format'),
  })
  .strict();

// Auth Schemas
export const LoginSchema = z
  .object({
    identifier: z.string().min(1).max(100).optional(),
    password: z.string().max(100).optional(),
    role: z.string().max(50).optional(),
    personaId: z.string().max(64).optional(),
    mfaCode: z.string().max(20).optional(),
  })
  .strict();

export const RefreshTokenSchema = z
  .object({
    refreshToken: z.string().min(10).max(256),
  })
  .strict();

export const ForgotPasswordSchema = z
  .object({
    email: z.string().email('Invalid email address').max(120),
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(10).max(128),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .strict();

export const VerifyEmailSchema = z
  .object({
    token: z.string().min(10).max(128),
  })
  .strict();

export const MfaVerifySchema = z
  .object({
    code: z.string().min(6).max(20),
  })
  .strict();

// Student Schemas
export const CreateStudentSchema = z
  .object({
    name: z.string().min(2).max(100),
    rollNo: z.string().regex(ROLL_NO_REGEX, 'Invalid Roll Number format'),
    department: z.string().min(2).max(100),
    departmentId: z.string().min(2).max(50),
    program: z.string().min(2).max(100),
    courseCode: z.string().min(2).max(50),
    division: z.string().min(1).max(50),
    batch: z.string().min(1).max(50),
    semester: z.number().int().min(1).max(12),
    cgpa: z.number().min(0).max(10),
    email: z.string().email().max(120),
    phone: z.string().regex(PHONE_REGEX, 'Invalid phone number format'),
    status: z.enum(['ACTIVE', 'PROBATION', 'SUSPENDED', 'ALUMNI']).default('ACTIVE'),
    attendancePercentage: z.number().min(0).max(100).default(100),
    feeStatus: z.enum(['PAID', 'PENDING', 'PARTIAL', 'OVERDUE']).default('PENDING'),
  })
  .strict();

export const StudentQuerySchema = z
  .object({
    search: z.string().max(100).optional(),
    department: z.string().max(50).optional(),
    status: z.string().max(50).optional(),
  })
  .strict();

// Admission Schemas
export const CreateAdmissionSchema = z
  .object({
    applicantName: z.string().min(2).max(100),
    email: z.string().email().max(120),
    phone: z.string().regex(PHONE_REGEX).max(20),
    programApplied: z.string().min(2).max(100),
    departmentId: z.string().min(2).max(50),
    entranceScore: z.number().min(0).max(100),
    qualifyingPercentage: z.number().min(0).max(100),
    category: z.string().max(50).default('General'),
    allottedQuota: z.string().max(50).default('Merit General'),
    remarks: z.string().max(500).optional(),
  })
  .strict();

export const UpdateAdmissionStatusSchema = z
  .object({
    status: z.enum(['SUBMITTED', 'DOCUMENT_VERIFIED', 'SEAT_OFFERED', 'ADMITTED', 'REJECTED', 'WITHDRAWN']),
  })
  .strict();

// Examination Marks Schemas
export const UpdateMarkCellSchema = z
  .object({
    internalMarks: z.number().min(0).max(40).optional(),
    theoryMarks: z.number().min(0).max(60).optional(),
    remarks: z.string().max(250).optional(),
  })
  .strict();

// Fees & Payments Schemas
export const RecordFeePaymentSchema = z
  .object({
    amount: z.number().positive('Payment amount must be greater than zero').max(500000),
    orderId: z.string().max(64).optional(),
    paymentId: z.string().max(64).optional(),
    signature: z.string().max(128).optional(),
  })
  .strict();

export const PaymentWebhookSchema = z
  .object({
    eventId: z.string().min(1).max(64),
    timestamp: z.number(),
    challanId: z.string().min(1).max(64),
    amount: z.number().positive(),
    currency: z.string().max(10).default('INR'),
    status: z.enum(['captured', 'failed']),
  })
  .strict();

// Academic Resources Schemas
export const CreateResourceSchema = z
  .object({
    title: z.string().min(3).max(150),
    category: z.enum(['Lecture Notes', 'Learning Materials', 'Announcements']),
    courseCode: z.string().min(2).max(50),
    courseName: z.string().min(2).max(120),
    department: z.string().min(2).max(100),
    semester: z.number().int().min(1).max(12),
    subject: z.string().max(100).optional(),
    division: z.string().max(50).optional(),
    batch: z.string().max(50).optional(),
    driveUrl: z.string().url().max(500).optional().or(z.literal('')),
    description: z.string().max(500).optional(),
    announcementContent: z.string().max(2000).optional(),
    isGlobal: z.boolean().optional().default(false),
    priority: z.enum(['NORMAL', 'URGENT', 'STATUTORY']).optional().default('NORMAL'),
  })
  .strict();

export const ResourceValidationUploadSchema = z
  .object({
    fileData: z.string().min(1, 'Spreadsheet data is required'),
    fileName: z.string().min(1).max(150).optional(),
    fileType: z.enum(['xlsx', 'csv', 'sheet']).optional(),
  })
  .strict();

export const ValidateResourceUploadSchema = ResourceValidationUploadSchema;

export const ConfirmResourceImportSchema = z
  .object({
    requestId: z.string().min(1).max(64),
    importOnlyValid: z.boolean().optional().default(true),
    excludedRowNumbers: z.array(z.number().int().positive()).optional(),
  })
  .strict();

// Hostel Schemas
export const AllocateHostelBedSchema = z
  .object({
    studentId: z.string().min(1).max(64),
    studentName: z.string().min(2).max(100),
    rollNo: z.string().regex(ROLL_NO_REGEX),
  })
  .strict();

// Library Schemas
export const IssueLibraryBookSchema = z
  .object({
    studentName: z.string().min(2).max(100),
    studentRollNo: z.string().regex(ROLL_NO_REGEX).optional(),
  })
  .strict();

// Notice Schema
export const CreateNoticeSchema = z
  .object({
    title: z.string().min(3).max(200),
    category: z.string().min(2).max(50),
    targetAudience: z.string().min(2).max(100),
    content: z.string().min(5).max(4000),
    priority: z.enum(['Standard', 'Urgent', 'Statutory', 'Confidential']).default('Standard'),
  })
  .strict();
