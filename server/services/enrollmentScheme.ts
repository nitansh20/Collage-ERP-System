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
  admissionYear: string;
  fullYear: number;
  degreeLevelCode: string;
  degreeLevelName: string;
  branchCode: string;
  branchName: string;
  branchShort: string;
  collegeCode: string;
  collegeName: string;
  serialNumber: string;
  serialInt: number;
  prefix: string;
  isValid: boolean;
  errors: string[];
}

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

export function generateEnrollmentNumber(params: {
  year: number | string;
  degreeLevel: DegreeLevelCode;
  branchCode: string;
  collegeCode?: string;
  serial: number;
}): string {
  const yyStr = String(params.year).slice(-2).padStart(2, '0');
  const llStr = String(params.degreeLevel).padStart(2, '0');
  const bbStr = String(params.branchCode).padStart(2, '0');
  const ccStr = String(params.collegeCode || UNIVERSITY_COLLEGE_CONFIG.code).padStart(2, '0');
  const serialStr = String(params.serial).padStart(5, '0');

  return `${yyStr}${llStr}${bbStr}${ccStr}${serialStr}`;
}
