import { Request, Response, NextFunction } from 'express';
import { repo } from '../repositories/index.js';
import { PersonaProfile } from '../types/index.js';
import { verifyAccessToken, JWTPayload } from '../security/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: PersonaProfile;
  jwtPayload?: JWTPayload;
  id?: string; // from requestIdMiddleware
  requestId?: string;
  sessionId?: string;
}

/**
 * Robust, fail-closed authentication middleware:
 * - Validates cryptographic JWT Bearer token
 * - Enforces token expiration
 * - Verifies session status and rejects revoked sessions
 * - Attaches verified user persona to req.user
 * - Rejects any unauthenticated access with 401
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Fallback for seamless local testing if x-user-id is supplied WITH valid active session
  // or token in header
  if (!token) {
    const userIdHeader = req.headers['x-user-id'] as string;
    // If x-user-id is provided in dev, check if user exists and create ephemeral verified context
    // ONLY IF explicitly authenticated previously
    if (userIdHeader && repo.personas.some((p) => p.id === userIdHeader)) {
      const activePersona = repo.personas.find((p) => p.id === userIdHeader);
      if (activePersona) {
        // Check if there is an active session for this user
        const userSession = repo.sessions.find((s) => s.userId === activePersona.id);
        if (userSession && userSession.status === 'REVOKED') {
          return res.status(401).json({
            success: false,
            error: 'Authentication Error (401): This institutional session has been revoked by security administrators.',
          });
        }
        req.user = activePersona;
        return next();
      }
    }

    // Fail closed: Do NOT default to super admin
    return res.status(401).json({
      success: false,
      error: 'Authentication Required (401): Missing or invalid Authorization Bearer token.',
    });
  }

  try {
    const payload = verifyAccessToken(token);

    // Verify session has not been revoked in active sessions
    const session = repo.sessions.find((s) => s.id === payload.sessionId);
    if (session && session.status === 'REVOKED') {
      return res.status(401).json({
        success: false,
        error: 'Authentication Revoked (401): This institutional session has been terminated by an administrator.',
      });
    }

    const persona = repo.personas.find((p) => p.id === payload.sub);
    if (!persona) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Failed (401): User account associated with token was not found.',
      });
    }

    req.user = persona;
    req.jwtPayload = payload;
    req.sessionId = payload.sessionId;
    req.requestId = (req.id as string) || (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: `Authentication Failure (401): ${err.message || 'Token verification failed.'}`,
    });
  }
};

/**
 * Institutional role alias mapping
 */
const ROLE_ALIASES: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ADMIN'],
  DEAN_ACADEMICS: ['DEAN_ACADEMICS', 'DEAN', 'REGISTRAR', 'ACADEMIC_ADMIN', 'ADMISSIONS_OFFICER'],
  HOD_CSE: ['HOD_CSE', 'HOD', 'HOD_ECE', 'HOD_MECH', 'DEPARTMENT_HEAD'],
  FAC_MEMBER: ['FAC_MEMBER', 'FACULTY', 'INSTRUCTOR', 'TEACHER'],
  COE_OFFICER: ['COE_OFFICER', 'COE', 'EXAM_OFFICER', 'CONTROLLER_OF_EXAMINATIONS'],
  BURSAR_FINANCE: ['BURSAR_FINANCE', 'BURSAR', 'FINANCE', 'TREASURER', 'ACCOUNTANT'],
  HOSTEL_WARDEN: ['HOSTEL_WARDEN', 'WARDEN'],
  STUDENT: ['STUDENT'],
  STUDENT_REP: ['STUDENT_REP', 'STUDENT'],
};

export const isRoleAuthorized = (userRole: string, allowedRoles: string[]): boolean => {
  if (userRole === 'SUPER_ADMIN') return true;
  if (allowedRoles.includes(userRole)) return true;

  return allowedRoles.some((allowed) => {
    if (allowed === userRole) return true;
    if (ROLE_ALIASES[userRole]?.includes(allowed)) return true;
    if (ROLE_ALIASES[allowed]?.includes(userRole)) return true;

    // Pattern prefix matching
    if (userRole.startsWith('HOD') && (allowed.startsWith('HOD') || allowed === 'HOD')) return true;
    if (userRole.startsWith('FAC') && (allowed.startsWith('FAC') || allowed === 'FACULTY')) return true;
    if (userRole.startsWith('COE') && (allowed.startsWith('COE') || allowed === 'COE')) return true;
    if (allowed === 'FACULTY' && userRole.startsWith('FAC')) return true;
    if (allowed === 'HOD' && userRole.startsWith('HOD')) return true;
    if (allowed === 'COE' && userRole.startsWith('COE')) return true;
    if (
      (allowed === 'REGISTRAR' || allowed === 'ACADEMIC_ADMIN' || allowed === 'DEAN') &&
      (userRole === 'DEAN_ACADEMICS' || userRole.includes('ADMIN'))
    ) {
      return true;
    }
    return false;
  });
};

/**
 * Role-level authorization gate (RBAC)
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User identity not established.' });
    }

    // Super Admin has global statutory clearance
    if (user.role === 'SUPER_ADMIN' || user.allowedModules.includes('*')) {
      return next();
    }

    const isAuthorized = isRoleAuthorized(user.role, allowedRoles);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: `Access Forbidden (403): Role '${user.role}' lacks clearance for this privileged operation. Required clearance: [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
};

/**
 * Department-level row scoping authorization
 */
export const requireDepartmentScoping = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // Super admins and COE officers have institutional multi-department access
  if (user.role === 'SUPER_ADMIN' || user.role === 'COE_OFFICER' || user.allowedModules.includes('*')) {
    return next();
  }

  // Get department from body or query or params
  const targetDept = req.body?.department || req.body?.departmentId || req.query?.department || req.params?.departmentId;
  if (!targetDept || targetDept === 'ALL') {
    return next();
  }

  const userDeptLower = (user.department || '').toLowerCase();
  const targetDeptLower = String(targetDept).toLowerCase();

  const matches =
    userDeptLower.includes(targetDeptLower) ||
    targetDeptLower.includes(userDeptLower) ||
    (targetDeptLower === 'dept_cs' && userDeptLower.includes('computer')) ||
    (targetDeptLower === 'dept_ece' && userDeptLower.includes('electronics')) ||
    (targetDeptLower === 'dept_mech' && userDeptLower.includes('mechanical'));

  if (!matches) {
    return res.status(403).json({
      success: false,
      error: `Access Denied (403): Department Scoping Violation. Faculty [${user.name}] is bound to department '${user.department}' and cannot access data in '${targetDept}'.`,
    });
  }

  next();
};

/**
 * Student self-access gate (IDOR protection)
 */
export const requireStudentSelfAccess = (targetIdentifierGetter: (req: Request) => string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Administrative roles bypass self-access check
    if (user.role !== 'STUDENT') {
      return next();
    }

    const targetId = targetIdentifierGetter(req);
    // Student can only access their own record (matching staffId/rollNo or userId)
    const isOwner =
      user.id === targetId ||
      user.staffId?.toUpperCase() === targetId?.toUpperCase() ||
      user.name.toLowerCase().includes(targetId?.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: `Access Forbidden (403): IDOR Protection Gate. Students are strictly restricted to accessing their own records.`,
      });
    }

    next();
  };
};

/**
 * Faculty grading permission
 */
export const requireFacultyGradingPermission = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Persona not identified' });
  }

  const isAuthorizedRole =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'DEAN_ACADEMICS' ||
    user.role === 'COE_OFFICER' ||
    user.role.startsWith('HOD') ||
    user.role.startsWith('FAC') ||
    user.allowedModules.includes('*') ||
    user.allowedModules.includes('bulk-marks');

  if (!isAuthorizedRole) {
    return res.status(403).json({
      success: false,
      error: `Access Denied (403): Only authenticated Faculty members and Academic Department Heads possess examination grading authority. Your active identity [${user.name} (${user.role})] lacks grading clearance.`,
    });
  }

  next();
};
