export type DegreeLevelCode = '01' | '02' | '03';

export const DEGREE_LEVEL_CONFIG: Record<DegreeLevelCode, { code: DegreeLevelCode; name: string; shortTitle: string }> = {
  '01': { code: '01', name: 'BACHELORS (B.Tech / B.E.)', shortTitle: 'Bachelors' },
  '02': { code: '02', name: 'MASTERS (M.Tech / M.S.)', shortTitle: 'Masters' },
  '03': { code: '03', name: 'PHD (Doctor of Philosophy)', shortTitle: 'PhD' },
};

export interface DepartmentConfig {
  id: string;
  name: string;
  shortCode: string;
  numericCode: string; // 2 digits: '03' = CSE, '04' = ECE, '02' = MECH, '01' = CIVIL
}

export const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  dept_cs: { id: 'dept_cs', name: 'Computer Science & Engineering', shortCode: 'CSE', numericCode: '03' },
  dept_ece: { id: 'dept_ece', name: 'Electronics & Communication', shortCode: 'ECE', numericCode: '04' },
  dept_mech: { id: 'dept_mech', name: 'Mechanical Engineering', shortCode: 'MECH', numericCode: '02' },
  dept_civil: { id: 'dept_civil', name: 'Civil Engineering', shortCode: 'CIVIL', numericCode: '01' },
  dept_it: { id: 'dept_it', name: 'Information Technology', shortCode: 'IT', numericCode: '05' },
};

export const UNIVERSITY_COLLEGE_CONFIG = {
  code: '18', // Fixed-width string configuration (leading zero survives as string)
  name: 'Hogward College of Engineering & Technology',
  university: 'Hogward University',
};

export interface ParsedEnrollment {
  raw: string;
  admissionYear: string; // '26' | '23'
  fullYear: number; // 2026 | 2023
  degreeLevelCode: string; // '01'
  degreeLevelName: string; // 'BACHELORS'
  branchCode: string; // '03'
  branchName: string; // 'Computer Science & Engineering'
  branchShort: string; // 'CSE'
  collegeCode: string; // '18'
  collegeName: string;
  serialNumber: string; // '00001' | '00159'
  serialInt: number; // 1 | 159
  prefix: string; // 8-digit unique intake prefix: (year, level, branch, college)
  isValid: boolean;
  errors: string[];
}

/**
 * Validates and parses the university's 13-digit enrollment scheme:
 * Format: [YY][LL][BB][CC][SSSSS]
 * - YY: Admission year (2 digits, e.g. 26 = 2026, 23 = 2023)
 * - LL: Degree level (01 = Bachelors, 02 = Masters, 03 = PhD)
 * - BB: Branch code (03 = CSE, from Department.numericCode)
 * - CC: College code within university (fixed-width string configuration '18')
 * - SSSSS: Per-intake serial running within (year, level, branch, college) prefix (5 digits)
 */
export function parseEnrollmentNumber(input: string): ParsedEnrollment {
  const clean = String(input || '').trim();
  const errors: string[] = [];

  if (!/^\d{13}$/.test(clean)) {
    return {
      raw: clean,
      admissionYear: clean.slice(0, 2) || '00',
      fullYear: 2000 + parseInt(clean.slice(0, 2) || '00', 10),
      degreeLevelCode: clean.slice(2, 4) || '00',
      degreeLevelName: 'Unknown',
      branchCode: clean.slice(4, 6) || '00',
      branchName: 'Unknown',
      branchShort: 'UNK',
      collegeCode: clean.slice(6, 8) || '00',
      collegeName: 'Unknown College',
      serialNumber: clean.slice(8, 13) || '00000',
      serialInt: parseInt(clean.slice(8, 13) || '0', 10),
      prefix: clean.slice(0, 8),
      isValid: false,
      errors: ['Enrollment number must be exactly 13 numeric digits.'],
    };
  }

  const yy = clean.slice(0, 2);
  const ll = clean.slice(2, 4) as DegreeLevelCode;
  const bb = clean.slice(4, 6);
  const cc = clean.slice(6, 8);
  const sssss = clean.slice(8, 13);

  const fullYear = 2000 + parseInt(yy, 10);
  const degreeInfo = DEGREE_LEVEL_CONFIG[ll];
  if (!degreeInfo) {
    errors.push(`Invalid degree level code '${ll}'. Allowed: 01 (Bachelors), 02 (Masters), 03 (PhD).`);
  }

  const dept = Object.values(DEPARTMENT_CONFIGS).find((d) => d.numericCode === bb);
  if (!dept) {
    errors.push(`Unrecognized branch numeric code '${bb}'. Expected configured department.`);
  }

  if (cc !== UNIVERSITY_COLLEGE_CONFIG.code) {
    // Non-standard college code within university
  }

  return {
    raw: clean,
    admissionYear: yy,
    fullYear,
    degreeLevelCode: ll,
    degreeLevelName: degreeInfo ? degreeInfo.name : `Level ${ll}`,
    branchCode: bb,
    branchName: dept ? dept.name : `Branch ${bb}`,
    branchShort: dept ? dept.shortCode : bb,
    collegeCode: cc,
    collegeName: cc === UNIVERSITY_COLLEGE_CONFIG.code ? UNIVERSITY_COLLEGE_CONFIG.name : `Affiliated College ${cc}`,
    serialNumber: sssss,
    serialInt: parseInt(sssss, 10),
    prefix: clean.slice(0, 8),
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a 13-digit university enrollment number
 */
export function generateEnrollmentNumber(params: {
  year: number | string; // e.g. 2026 or '26'
  degreeLevel: DegreeLevelCode; // '01' | '02' | '03'
  branchCode: string; // '03' (CSE)
  collegeCode?: string; // defaults to '18'
  serial: number; // e.g. 159 -> '00159'
}): string {
  const yyStr = String(params.year).slice(-2).padStart(2, '0');
  const llStr = String(params.degreeLevel).padStart(2, '0');
  const bbStr = String(params.branchCode).padStart(2, '0');
  const ccStr = String(params.collegeCode || UNIVERSITY_COLLEGE_CONFIG.code).padStart(2, '0');
  const serialStr = String(params.serial).padStart(5, '0');

  return `${yyStr}${llStr}${bbStr}${ccStr}${serialStr}`;
}

/**
 * Natural text-order sorting as specified by the university:
 * Fixed-width digits sort correctly as text — which division roll order depends on.
 */
export function sortByDivisionRollOrder<T extends { rollNo: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.rollNo.localeCompare(b.rollNo));
}

/**
 * Detailed segmented breakdown pills for visual inspection
 */
export function getEnrollmentSegmentPills(enrollmentNumber: string) {
  const parsed = parseEnrollmentNumber(enrollmentNumber);
  return [
    {
      label: 'Admission Year',
      code: parsed.admissionYear,
      meaning: `${parsed.fullYear} Intake`,
      description: '2-digit year of admission (26 = 2026, 23 = 2023)',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: 'Degree Level',
      code: parsed.degreeLevelCode,
      meaning: parsed.degreeLevelName.split(' ')[0],
      description: '01 = BACHELORS, 02 = MASTERS, 03 = PHD (avoids serial collisions)',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Branch / Dept',
      code: parsed.branchCode,
      meaning: parsed.branchShort,
      description: `Department.numericCode (${parsed.branchName})`,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      label: 'College Code',
      code: parsed.collegeCode,
      meaning: 'College 18',
      description: `Fixed-width string configuration: ${parsed.collegeName}`,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: 'Intake Serial',
      code: parsed.serialNumber,
      meaning: `#${parsed.serialInt}`,
      description: '5-digit serial unique within (year, level, branch, college) prefix',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  ];
}
