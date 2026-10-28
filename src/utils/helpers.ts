/**
 * IGNOU SC-2033 Utility Functions
 */

export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  return `₹${num.toFixed(2)}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const trimmed = String(dateString).trim();
    // Parse YYYY-MM-DD directly into local year, month, day to avoid UTC timezone shifts
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    // Parse DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const trimmed = String(dateString).trim();
    // If it's only a date string without time (YYYY-MM-DD), format as date to prevent arbitrary midnight conversions
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return formatDate(trimmed);
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Standard IGNOU 5-Point Grading System
 * A: 80% and above (Excellent)
 * B: 60% to 79.9% (Very Good)
 * C: 50% to 59.9% (Good)
 * D: 40% to 49.9% (Satisfactory - Pass)
 * E: Below 40% (Unsatisfactory - Fail)
 */
export function calculateIGNOUGrade(marks: number | null | undefined): {
  grade: string;
  label: string;
  badgeClass: string;
} {
  if (marks === null || marks === undefined) {
    return { grade: '—', label: 'Pending', badgeClass: 'bg-zinc-100 text-zinc-600' };
  }
  const numericVal = Number(marks);
  if (isNaN(numericVal)) {
    return { grade: '—', label: 'Pending', badgeClass: 'bg-zinc-100 text-zinc-600' };
  }
  if (numericVal >= 80) {
    return { grade: 'A', label: 'Excellent', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  if (numericVal >= 60) {
    return { grade: 'B', label: 'Very Good', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
  }
  if (numericVal >= 50) {
    return { grade: 'C', label: 'Good', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
  }
  if (numericVal >= 40) {
    return { grade: 'D', label: 'Satisfactory', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' };
  }
  return { grade: 'E', label: 'Unsatisfactory / Failed', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
}

/**
 * Standard IGNOU grade getter alias
 */
export const getIgnouGrade = calculateIGNOUGrade;

/**
 * Generates deterministic primary key format: SUB_ENR_COURSE_TERM
 * e.g., 'SUB_2401928371_MEG01_JUL2026'
 */
export function generateDeterministicSubmissionKey(
  enrollmentNo: string,
  courseCode: string,
  session?: string,
  componentType?: 'Assignment' | 'Practical' | string
): string {
  const cleanEnr = String(enrollmentNo || '').trim();
  const cleanCourse = String(courseCode || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const safeSession = String(session || 'July 2026').trim();

  // For session like "July 2026", parts: "JUL" + "2026" => "JUL2026"
  const parts = safeSession.split(/\s+/);
  let cleanTerm = safeSession.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (parts.length >= 2) {
    const month = parts[0].substring(0, 3).toUpperCase();
    const year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
    cleanTerm = `${month}${year}`;
  }
  const typeSuffix = componentType === 'Practical' ? '_PRAC' : '';
  return `SUB_${cleanEnr}_${cleanCourse}${typeSuffix}_${cleanTerm}`;
}

export function generateSessionCode(session?: string): string {
  const safeSession = String(session || 'July 2026').trim();
  // 'July 2026' -> 'JUL26', 'Jan 2027' -> 'JAN27'
  const parts = safeSession.split(/\s+/);
  if (parts.length >= 2) {
    const month = parts[0].substring(0, 3).toUpperCase();
    const year = parts[1].slice(-2);
    return `${month}${year}`;
  }
  return safeSession.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'JUL26';
}

export function maskAccountNumber(acc: string): string {
  if (!acc || acc.length < 5) return acc;
  const lastFour = acc.slice(-4);
  return '••••••••' + lastFour;
}

export function maskPAN(pan: string): string {
  if (!pan || pan.length < 6) return pan;
  return pan.substring(0, 3) + '••••' + pan.slice(-1);
}

/**
 * Converts numerical marks (0-100) into statutory IGNOU words format:
 * e.g., 74 -> "Seventy-Four Only" or digits style "Seven Four Only"
 */
export function marksToWords(marks: number | null | undefined, style: 'cardinal' | 'digits' = 'cardinal'): string {
  if (marks === null || marks === undefined || isNaN(marks)) {
    return 'Absent (AB)';
  }
  if (marks < 0) return 'Zero Only';
  if (marks > 100) return 'One Hundred Only';
  if (marks === 0) return 'Zero Only';

  const digitWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

  if (style === 'digits') {
    const s = String(marks);
    const words = s.split('').map((ch) => digitWords[parseInt(ch, 10)]).join(' ');
    return `${words} Only`;
  }

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (marks === 100) return 'One Hundred Only';
  if (marks < 10) return `${ones[marks]} Only`;
  if (marks < 20) return `${teens[marks - 10]} Only`;

  const t = Math.floor(marks / 10);
  const o = marks % 10;
  const word = o > 0 ? `${tens[t]}-${ones[o]}` : tens[t];
  return `${word} Only`;
}

/**
 * Converts currency amounts to Indian Rupees in words (e.g. 825 -> "Eight Hundred Twenty-Five Rupees Only")
 */
export function amountToIndianWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + (n % 10 > 0 ? '-' + ones[n % 10] : '') + ' ';
    } else if (n >= 10) {
      str += teens[n - 10] + ' ';
    } else if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const integerPart = Math.floor(amount);
  const paisePart = Math.round((amount - integerPart) * 100);

  const thousands = Math.floor(integerPart / 1000);
  const remainder = integerPart % 1000;

  let result = '';
  if (thousands > 0) {
    result += convertBelowThousand(thousands) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertBelowThousand(remainder) + ' ';
  }

  const rupeesStr = result.trim() ? `Rupees ${result.trim()}` : 'Rupees Zero';
  if (paisePart > 0) {
    const paiseWords = convertBelowThousand(paisePart);
    return `${rupeesStr} and ${paiseWords} Paise Only`;
  }

  return `${rupeesStr} Only`;
}

/**
 * Detects if a course has BOTH Assignment and Practical components.
 * e.g., BAPI-003 under BAG (and other programmes) has both theory assignment and practical submissions.
 */
export function isDualComponentCourse(courseCode?: string, title?: string): boolean {
  const c = String(courseCode || '').trim().toUpperCase();
  const t = String(title || '').trim().toLowerCase();

  // Explicit courses with both Assignment and Practical:
  // e.g. BAPI-003 (Organic Farming / Production), BAPI-001, BAPI-002, BPVI-001, etc.
  if (['BAPI-003', 'BAPI-001', 'BAPI-002', 'BPVI-001', 'BPVI-002', 'BPVI-003', 'BPVI-004', 'BPVI-005'].includes(c)) {
    return true;
  }

  if (t.includes('assignment & practical') || t.includes('assignment and practical') || (t.includes('practical') && t.includes('theory'))) {
    return true;
  }

  return false;
}

/**
 * Detects if an IGNOU course code or title represents a Practical / Lab / Project course
 * Standard IGNOU conventions:
 * - Code pattern: BCSL-*, MCSL-*, BBYCL-*, BCHCL-*, BPHCL-*, BZYCL-*, CITL-*, BPCL-*, MPCL-*, CHE-03(L), etc.
 * - Suffix with 'P' (Practical / Project) or 'L' (Lab), e.g. BLIS-224P, DECE-4, etc.
 * - Title containing "Lab", "Laboratory", "Practical", "Practicum", "Field Work", "Viva", "Project"
 */
export function isPracticalCourse(courseCode?: string, title?: string, componentType?: string): boolean {
  if (componentType) {
    const ct = String(componentType).trim().toLowerCase();
    if (ct === 'practical') return true;
    if (ct === 'assignment' || ct === 'theory' || ct === 'tma') return false;
  }

  const c = String(courseCode || '').trim().toUpperCase();
  const t = String(title || '').trim().toLowerCase();

  if (!c && !t) return false;

  // BRL (Bachelor in Retailing under BCOMF / Retail Operations) courses (BRL-101 to BRL-115)
  // are strictly theory courses evaluated through Tutor Marked Assignments (TMA).
  if (/^BRL[-_]?\d+/i.test(c)) return false;

  // 1. Explicit IGNOU Lab / Practical code prefixes
  // Computer Science: BCSL, MCSL, CITL, PGDCL
  // Sciences: BBYCL (Botany), BCHCL (Chemistry), BPHCL (Physics), BZYCL (Zoology), BGGCL (Geography), BGYCL (Geology)
  // Psychology: BPCL, MPCL
  if (/^(BCSL|MCSL|CITL|BPCL|MPCL|BBYCL|BCHCL|BPHCL|BZYCL|BGGCL|BGYCL|PGDCL)[-_]?\d+/i.test(c)) return true;
  // Project / Practical courses: BCSP, MCSP, etc.
  if (/^(BCSP|MCSP)[-_]?\d+/i.test(c)) return true;
  if (/[-_]P$/i.test(c) || /\(L\)$/i.test(c) || /\(P\)$/i.test(c) || /[-_]LAB$/i.test(c) || /[-_]L$/i.test(c)) return true;
  
  // Specific common IGNOU practical codes
  if (['BLIE-227', 'BLIE-229', 'MLII-101', 'MLII-102', 'MLII-103', 'MLII-104', 'DNHE-4', 'DECE-4'].includes(c)) {
    return true;
  }

  // 2. Title based detection
  if (
    t.includes('lab') ||
    t.includes('laboratory') ||
    t.includes('practical') ||
    t.includes('practicum') ||
    t.includes('project work') ||
    t.includes('field work') ||
    t.includes('practice')
  ) {
    return true;
  }

  return false;
}

export function getCourseType(courseCode?: string, title?: string, componentType?: string): 'Practical' | 'Theory' {
  return isPracticalCourse(courseCode, title, componentType) ? 'Practical' : 'Theory';
}

/**
 * Detects degree level and standard duration for IGNOU programmes:
 * - Bachelor degree programmes: 3 years (1st, 2nd, 3rd year)
 * - Master degree programmes: 2 years (1st, 2nd year)
 * - Diploma: 1 year
 * - Certificate: 6 months
 */

export function parseProgrammeWithYear(rawProgCode: string): {
  baseCode: string;
  yearNumber: number;
  academicYear: '1st Year' | '2nd Year' | '3rd Year';
  formattedCode: string;
} {
  const clean = String(rawProgCode || '').trim().toUpperCase();
  // Check for trailing number: e.g. "MCOM 2", "MCOM-2", "MCOM2", "BAM 3", "BAM-3"
  const match = clean.match(/^([A-Z]+)[-_\s]*([1-3])$/i);
  if (match) {
    const baseCode = match[1].toUpperCase();
    const yearNumber = parseInt(match[2], 10);
    const academicYear: '1st Year' | '2nd Year' | '3rd Year' =
      yearNumber === 3 ? '3rd Year' : yearNumber === 2 ? '2nd Year' : '1st Year';
    return {
      baseCode,
      yearNumber,
      academicYear,
      formattedCode: yearNumber > 1 ? `${baseCode} ${yearNumber}` : baseCode,
    };
  }

  return {
    baseCode: clean,
    yearNumber: 1,
    academicYear: '1st Year',
    formattedCode: clean,
  };
}

export function formatProgrammeWithYear(baseProgCode: string, academicYear: string): string {
  const parsed = parseProgrammeWithYear(baseProgCode);
  const base = parsed.baseCode;
  if (academicYear === '2nd Year') return `${base} 2`;
  if (academicYear === '3rd Year') return `${base} 3`;
  return base;
}

export function getProgrammeDurationInfo(
  progCode: string,
  level?: string
): {
  level: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate';
  durationYears: number;
  maxYearLevels: Array<'1st Year' | '2nd Year' | '3rd Year'>;
  description: string;
} {
  const parsed = parseProgrammeWithYear(progCode);
  const p = parsed.baseCode;
  const lvl = String(level || '').toLowerCase();

  if (
    lvl.includes('master') ||
    p.startsWith('M') ||
    ['MBA', 'MCA', 'MEG', 'MPS', 'MCOM', 'MHD', 'MAH', 'MAPC', 'MSO', 'MSW', 'MLIS'].includes(p)
  ) {
    return {
      level: 'Master',
      durationYears: 2,
      maxYearLevels: ['1st Year', '2nd Year'],
      description: 'Master Degree Programme (2 Years Duration: 1st Year Fresh, 2nd Year Re-Reg)',
    };
  }

  if (
    lvl.includes('bachelor') ||
    p.startsWith('B') ||
    ['BAG', 'BCOMG', 'BSCG', 'BCA', 'BAEGH', 'BAHDH', 'BAPSH', 'BAM', 'BCOMF', 'BLIS', 'BTS', 'BAFEDU', 'BAFEG', 'BAFHI'].includes(p)
  ) {
    return {
      level: 'Bachelor',
      durationYears: 3,
      maxYearLevels: ['1st Year', '2nd Year', '3rd Year'],
      description: 'Bachelor Degree Programme (3 Years Duration: 1st Year Fresh, 2nd & 3rd Year Re-Reg)',
    };
  }

  if (lvl.includes('diploma') || p.startsWith('D') || p.startsWith('PGD')) {
    return {
      level: 'Diploma',
      durationYears: 1,
      maxYearLevels: ['1st Year'],
      description: 'Diploma Programme (1 Year Duration)',
    };
  }

  return {
    level: 'Bachelor',
    durationYears: 3,
    maxYearLevels: ['1st Year', '2nd Year', '3rd Year'],
    description: 'Bachelor Degree Programme (3 Years Duration)',
  };
}

/**
 * Calculates academic assignment submission session eligibility:
 * - Admission is done in January and July session every year.
 * - Re-registration is done in January or July session in next year.
 * - Fresh students submit assignment in next session either in January or July.
 * - Re-registered students submit their assignments for 2nd or 3rd year courses.
 */
export function getAssignmentSubmissionEligibility(
  cadre: 'FRESH' | 'RE_REGISTRATION' | string,
  session: string,
  academicYear?: string
): {
  admittedSession: string;
  eligibleSubmissionSessions: string[];
  description: string;
  isSubmissionEligibleInSession: (currentSession: string) => boolean;
} {
  const s = String(session || 'July 2026').trim();
  const isJan = s.toLowerCase().includes('jan');
  const yearMatch = s.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

  let eligible: string[] = [];
  let description = '';

  if (cadre === 'FRESH') {
    if (isJan) {
      // Fresh Jan session: submits in July of same year or subsequent January
      eligible = [`July ${year}`, `January ${year + 1}`];
      description = `Fresh Admission (${s}) — Eligible to submit assignments in ${eligible[0]} or ${eligible[1]}`;
    } else {
      // Fresh July session: submits in January or July of next year
      eligible = [`January ${year + 1}`, `July ${year + 1}`];
      description = `Fresh Admission (${s}) — Eligible to submit assignments in ${eligible[0]} or ${eligible[1]}`;
    }
  } else {
    const yr = academicYear || '2nd Year';
    if (isJan) {
      eligible = [`July ${year}`, `January ${year + 1}`];
      description = `Re-Registration ${yr} (${s}) — Eligible to submit assignments in ${eligible[0]} or ${eligible[1]}`;
    } else {
      eligible = [`January ${year + 1}`, `July ${year + 1}`];
      description = `Re-Registration ${yr} (${s}) — Eligible to submit assignments in ${eligible[0]} or ${eligible[1]}`;
    }
  }

  const isSubmissionEligibleInSession = (targetSession: string): boolean => {
    if (!targetSession) return true;
    const cleanTarget = targetSession.trim().toLowerCase();
    return eligible.some((e) => cleanTarget.includes(e.toLowerCase()) || e.toLowerCase().includes(cleanTarget));
  };

  return {
    admittedSession: s,
    eligibleSubmissionSessions: eligible,
    description,
    isSubmissionEligibleInSession,
  };
}

