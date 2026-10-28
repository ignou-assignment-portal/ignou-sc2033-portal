import { IGNOUCourse, IGNOUProgramme } from '../types';
import { IGNOU_PROGRAMMES } from './ignouMasterData';

/**
 * Extended IGNOU Catalog containing popular Master, Bachelor, Diploma & Certificate programmes
 * and official course titles from IGNOU (ignou.ac.in).
 */
const RAW_EXTENDED_IGNOU_PROGRAMMES: IGNOUProgramme[] = [
  ...IGNOU_PROGRAMMES,
  {
    code: 'BCA',
    name: 'Bachelor of Computer Applications',
    level: 'Bachelor',
    department: 'School of Computer and Information Sciences (SOCIS)',
    courses: [
      { code: 'BCS-011', title: 'Computer Basics and PC Software', credits: 3, programme: 'BCA' },
      { code: 'BCS-012', title: 'Basic Mathematics', credits: 4, programme: 'BCA' },
      { code: 'BCSL-013', title: 'Computer Basics and PC Software Lab', credits: 2, programme: 'BCA' },
      { code: 'FEG-02', title: 'Foundation Course in English-2', credits: 4, programme: 'BCA' },
      { code: 'ECO-01', title: 'Business Organisation', credits: 4, programme: 'BCA' },
      { code: 'MCS-011', title: 'Problem Solving and Programming', credits: 3, programme: 'BCA' },
      { code: 'MCS-012', title: 'Computer Organisation and Assembly Language Programming', credits: 4, programme: 'BCA' },
      { code: 'MCS-013', title: 'Discrete Mathematics', credits: 2, programme: 'BCA' },
      { code: 'MCS-014', title: 'Systems Analysis and Design', credits: 3, programme: 'BCA' },
      { code: 'MCS-015', title: 'Communication Skills', credits: 2, programme: 'BCA' },
      { code: 'MCSL-016', title: 'Internet Concepts and Web Design', credits: 2, programme: 'BCA' },
      { code: 'MCSL-017', title: 'C and Assembly Language Programming Lab', credits: 2, programme: 'BCA' },
      { code: 'BCS-031', title: 'Programming in C++', credits: 3, programme: 'BCA' },
      { code: 'BCS-040', title: 'Statistical Techniques', credits: 4, programme: 'BCA' },
      { code: 'BCS-041', title: 'Fundamentals of Computer Networks', credits: 4, programme: 'BCA' },
      { code: 'BCS-042', title: 'Introduction to Algorithm Design', credits: 2, programme: 'BCA' },
      { code: 'MCS-021', title: 'Data and File Structures', credits: 4, programme: 'BCA' },
      { code: 'MCS-022', title: 'Operating System Concepts and Networking Management', credits: 4, programme: 'BCA' },
      { code: 'MCS-023', title: 'Introduction to Database Management Systems', credits: 3, programme: 'BCA' },
      { code: 'MCS-024', title: 'Object Oriented Technologies and Java Programming', credits: 3, programme: 'BCA' },
      { code: 'BCS-051', title: 'Introduction to Software Engineering', credits: 3, programme: 'BCA' },
      { code: 'BCS-052', title: 'Network Programming and Administration', credits: 3, programme: 'BCA' },
      { code: 'BCS-053', title: 'Web Programming', credits: 2, programme: 'BCA' },
      { code: 'BCS-054', title: 'Computer Oriented Numerical Techniques', credits: 3, programme: 'BCA' },
      { code: 'BCS-055', title: 'Business Communication', credits: 2, programme: 'BCA' },
      { code: 'BCS-062', title: 'E-Commerce', credits: 2, programme: 'BCA' },
      { code: 'BCSL-021', title: 'C Language Programming Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-022', title: 'Assembly Language Programming Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-032', title: 'C++ Programming Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-033', title: 'Data and File Structures Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-034', title: 'DBMS Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-043', title: 'Java Programming Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-044', title: 'Statistical Techniques Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-045', title: 'Algorithm Design Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-056', title: 'Network Programming Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-057', title: 'Web Programming Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSL-058', title: 'Computer Oriented Numerical Techniques Lab', credits: 1, programme: 'BCA' },
      { code: 'BCSP-064', title: 'BCA Project Work', credits: 8, programme: 'BCA' },
    ],
  },
  {
    code: 'MCA',
    name: 'Master of Computer Applications',
    level: 'Master',
    department: 'School of Computer and Information Sciences (SOCIS)',
    courses: [
      { code: 'MCS-211', title: 'Design and Analysis of Algorithms', credits: 4, programme: 'MCA' },
      { code: 'MCS-212', title: 'Discrete Mathematics', credits: 4, programme: 'MCA' },
      { code: 'MCS-213', title: 'Software Engineering', credits: 4, programme: 'MCA' },
      { code: 'MCS-214', title: 'Professional Skills and Ethics', credits: 2, programme: 'MCA' },
      { code: 'MCS-215', title: 'Security and Cyber Laws', credits: 2, programme: 'MCA' },
      { code: 'MCS-218', title: 'Data Communication and Computer Networks', credits: 4, programme: 'MCA' },
      { code: 'MCS-219', title: 'Object Oriented Analysis and Design', credits: 4, programme: 'MCA' },
      { code: 'MCS-220', title: 'Web Technologies', credits: 4, programme: 'MCA' },
      { code: 'MCS-221', title: 'Data Warehousing and Data Mining', credits: 4, programme: 'MCA' },
      { code: 'MCS-224', title: 'Artificial Intelligence and Machine Learning', credits: 4, programme: 'MCA' },
      { code: 'MCS-225', title: 'Accountancy and Financial Management', credits: 4, programme: 'MCA' },
      { code: 'MCS-226', title: 'Data Science and Big Data', credits: 4, programme: 'MCA' },
      { code: 'MCS-227', title: 'Cloud Computing and IoT', credits: 4, programme: 'MCA' },
      { code: 'MCSL-216', title: 'DAA and Web Technologies Lab', credits: 2, programme: 'MCA' },
      { code: 'MCSL-217', title: 'Software Engineering Lab', credits: 2, programme: 'MCA' },
      { code: 'MCSL-222', title: 'Data Warehousing and Python Lab', credits: 2, programme: 'MCA' },
      { code: 'MCSL-223', title: 'AI and Machine Learning Lab', credits: 2, programme: 'MCA' },
      { code: 'MCSL-228', title: 'Data Science and Cloud Computing Lab', credits: 2, programme: 'MCA' },
      { code: 'MCSP-232', title: 'MCA Project Work', credits: 6, programme: 'MCA' },
    ],
  },
  {
    code: 'BLIS',
    name: 'Bachelor of Library and Information Science',
    level: 'Bachelor',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'BLI-221', title: 'Library, Information and Society', credits: 4, programme: 'BLIS' },
      { code: 'BLI-222', title: 'Information Sources and Services', credits: 4, programme: 'BLIS' },
      { code: 'BLI-223', title: 'Organising and Managing Information', credits: 4, programme: 'BLIS' },
      { code: 'BLI-224', title: 'ICT Fundamentals', credits: 4, programme: 'BLIS' },
      { code: 'BLIE-225', title: 'Communication Skills', credits: 4, programme: 'BLIS' },
      { code: 'BLIE-226', title: 'Management of Library and Information Centre', credits: 4, programme: 'BLIS' },
      { code: 'BLIE-227', title: 'Document Processing Practice', credits: 4, programme: 'BLIS' },
      { code: 'BLIE-228', title: 'Information Products and Services', credits: 4, programme: 'BLIS' },
      { code: 'BLIE-229', title: 'ICT in Libraries', credits: 4, programme: 'BLIS' },
    ],
  },
  {
    code: 'MLIS',
    name: 'Master of Library and Information Science',
    level: 'Master',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'MLI-101', title: 'Information, Communication and Society', credits: 4, programme: 'MLIS' },
      { code: 'MLI-102', title: 'Management of Library and Information Centres', credits: 4, programme: 'MLIS' },
      { code: 'MLII-101', title: 'Information Sources, Systems and Services', credits: 4, programme: 'MLIS' },
      { code: 'MLII-102', title: 'Information Processing and Retrieval', credits: 4, programme: 'MLIS' },
      { code: 'MLII-103', title: 'Fundamentals of Information Communication Technologies', credits: 4, programme: 'MLIS' },
      { code: 'MLII-104', title: 'Information Communication Technologies - Applications', credits: 4, programme: 'MLIS' },
    ],
  },
  {
    code: 'BCOMG',
    name: 'Bachelor of Commerce (General)',
    level: 'Bachelor',
    department: 'School of Management Studies (SOMS)',
    courses: [
      { code: 'BCOC-131', title: 'Financial Accounting', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-132', title: 'Business Organisation and Management', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-133', title: 'Business Law', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-134', title: 'Business Mathematics and Statistics', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-135', title: 'Company Law', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-136', title: 'Income Tax Law and Practice', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-137', title: 'Corporate Accounting', credits: 6, programme: 'BCOMG' },
      { code: 'BCOC-138', title: 'Cost Accounting', credits: 6, programme: 'BCOMG' },
      { code: 'BCOE-141', title: 'Principles of Marketing', credits: 6, programme: 'BCOMG' },
      { code: 'BCOE-142', title: 'Management Accounting', credits: 6, programme: 'BCOMG' },
      { code: 'BCOE-143', title: 'Fundamentals of Financial Management', credits: 6, programme: 'BCOMG' },
      { code: 'BCOE-144', title: 'Office Management and Secretarial Practice', credits: 6, programme: 'BCOMG' },
      { code: 'BCOLA-138', title: 'Business Communication', credits: 6, programme: 'BCOMG' },
    ],
  },
  {
    code: 'MBA',
    name: 'Master of Business Administration',
    level: 'Master',
    department: 'School of Management Studies (SOMS)',
    courses: [
      { code: 'MMPC-001', title: 'Management Functions and Organisational Processes', credits: 4, programme: 'MBA' },
      { code: 'MMPC-002', title: 'Human Resource Management', credits: 4, programme: 'MBA' },
      { code: 'MMPC-003', title: 'Business Environment', credits: 4, programme: 'MBA' },
      { code: 'MMPC-004', title: 'Accounting for Managers', credits: 4, programme: 'MBA' },
      { code: 'MMPC-005', title: 'Quantitative Analysis for Managerial Applications', credits: 4, programme: 'MBA' },
      { code: 'MMPC-006', title: 'Marketing Management', credits: 4, programme: 'MBA' },
      { code: 'MMPC-007', title: 'Business Communication', credits: 4, programme: 'MBA' },
      { code: 'MMPC-008', title: 'Information Systems for Managers', credits: 4, programme: 'MBA' },
      { code: 'MMPC-009', title: 'Management of Machines and Materials', credits: 4, programme: 'MBA' },
      { code: 'MMPC-010', title: 'Managerial Economics', credits: 4, programme: 'MBA' },
      { code: 'MMPC-011', title: 'Social Processes and Behavioural Issues', credits: 4, programme: 'MBA' },
      { code: 'MMPC-012', title: 'Strategic Management', credits: 4, programme: 'MBA' },
      { code: 'MMPC-013', title: 'Business Laws', credits: 4, programme: 'MBA' },
      { code: 'MMPC-014', title: 'Financial Management', credits: 4, programme: 'MBA' },
      { code: 'MMPC-015', title: 'Research Methodology for Management Decisions', credits: 4, programme: 'MBA' },
    ],
  },
  {
    code: 'DTS',
    name: 'Diploma in Tourism Studies',
    level: 'Diploma',
    department: 'School of Tourism and Hospitality Services Management (SOTHSM)',
    courses: [
      { code: 'TS-1', title: 'Foundation Course in Tourism', credits: 8, programme: 'DTS' },
      { code: 'TS-2', title: 'Tourism Development: Products, Operations and Case Studies', credits: 8, programme: 'DTS' },
      { code: 'TS-3', title: 'Management in Tourism', credits: 8, programme: 'DTS' },
    ],
  },
  {
    code: 'BTS',
    name: 'Bachelor of Arts (Tourism Studies)',
    level: 'Bachelor',
    department: 'School of Tourism and Hospitality Services Management (SOTHSM)',
    courses: [
      { code: 'TS-1', title: 'Foundation Course in Tourism', credits: 8, programme: 'BTS' },
      { code: 'TS-2', title: 'Tourism Development: Products, Operations and Case Studies', credits: 8, programme: 'BTS' },
      { code: 'TS-3', title: 'Management in Tourism', credits: 8, programme: 'BTS' },
      { code: 'TS-4', title: 'Indian Culture: Perspective for Tourism', credits: 8, programme: 'BTS' },
      { code: 'TS-5', title: 'Ecology, Environment and Tourism', credits: 8, programme: 'BTS' },
      { code: 'TS-6', title: 'Tourism Marketing', credits: 8, programme: 'BTS' },
      { code: 'TS-7', title: 'Human Resource Development in Tourism', credits: 8, programme: 'BTS' },
    ],
  },
  {
    code: 'PGDRD',
    name: 'Post Graduate Diploma in Rural Development',
    level: 'Diploma',
    department: 'School of Continuing Education (SOCE)',
    courses: [
      { code: 'MRDE-101', title: 'Rural Development - Indian Context', credits: 6, programme: 'PGDRD' },
      { code: 'MRDE-102', title: 'Rural Development Programmes', credits: 6, programme: 'PGDRD' },
      { code: 'MRDE-103', title: 'Land Reforms and Rural Development', credits: 6, programme: 'PGDRD' },
      { code: 'RDD-5', title: 'Research Methodology in Rural Development', credits: 6, programme: 'PGDRD' },
      { code: 'RDD-6', title: 'Rural Health Care', credits: 6, programme: 'PGDRD' },
      { code: 'RDD-7', title: 'Communication and Extension in Rural Development', credits: 6, programme: 'PGDRD' },
    ],
  },
  {
    code: 'DNHE',
    name: 'Diploma in Nutrition and Health Education',
    level: 'Diploma',
    department: 'School of Continuing Education (SOCE)',
    courses: [
      { code: 'DNHE-1', title: 'Nutrition for the Community', credits: 8, programme: 'DNHE' },
      { code: 'DNHE-2', title: 'Public Health and Hygiene', credits: 8, programme: 'DNHE' },
      { code: 'DNHE-3', title: 'Nutrition and Health Education', credits: 8, programme: 'DNHE' },
      { code: 'DNHE-4', title: 'Project Work in Nutrition & Health', credits: 8, programme: 'DNHE' },
    ],
  },
  {
    code: 'BSCG',
    name: 'Bachelor of Science (General)',
    level: 'Bachelor',
    department: 'School of Sciences (SOS)',
    courses: [
      { code: 'BBYCT-131', title: 'Biodiversity (Microbes, Algae, Fungi and Archegoniates)', credits: 4, programme: 'BSCG' },
      { code: 'BBYCL-132', title: 'Biodiversity Laboratory', credits: 2, programme: 'BSCG' },
      { code: 'BBYCT-133', title: 'Plant Ecology and Taxonomy', credits: 4, programme: 'BSCG' },
      { code: 'BCHCT-131', title: 'Atomic Structure, Bonding, General Organic Chemistry', credits: 4, programme: 'BSCG' },
      { code: 'BCHCL-132', title: 'Chemistry Laboratory 1', credits: 2, programme: 'BSCG' },
      { code: 'BPHCT-131', title: 'Mechanics', credits: 4, programme: 'BSCG' },
      { code: 'BPHCL-132', title: 'Mechanics Laboratory', credits: 2, programme: 'BSCG' },
      { code: 'BMTC-131', title: 'Calculus', credits: 6, programme: 'BSCG' },
      { code: 'BMTC-132', title: 'Differential Equations', credits: 6, programme: 'BSCG' },
      { code: 'BZYCT-131', title: 'Animal Diversity', credits: 4, programme: 'BSCG' },
      { code: 'BZYCL-132', title: 'Animal Diversity Laboratory', credits: 2, programme: 'BSCG' },
    ],
  },
  {
    code: 'MCOM',
    name: 'Master of Commerce',
    level: 'Master',
    department: 'School of Management Studies (SOMS)',
    courses: [
      // 1st Year (Fresh)
      { code: 'IBO-01', title: 'International Business Environment', credits: 6, programme: 'MCOM' },
      { code: 'IBO-02', title: 'International Marketing Management', credits: 6, programme: 'MCOM' },
      { code: 'IBO-03', title: "India's Foreign Trade", credits: 6, programme: 'MCOM' },
      { code: 'IBO-04', title: 'Export Import Procedures and Documentation', credits: 6, programme: 'MCOM' },
      { code: 'IBO-05', title: 'International Marketing Logistics', credits: 6, programme: 'MCOM' },
      { code: 'IBO-06', title: 'International Business Finance', credits: 6, programme: 'MCOM' },
      // 2nd Year (Re-Registration: MCOM 2)
      { code: 'MCO-01', title: 'Organisation Theory and Behaviour', credits: 6, programme: 'MCOM' },
      { code: 'MCO-03', title: 'Research Methodology and Statistical Analysis', credits: 6, programme: 'MCOM' },
      { code: 'MCO-04', title: 'Business Environment', credits: 6, programme: 'MCOM' },
      { code: 'MCO-05', title: 'Accounting for Managerial Decisions', credits: 6, programme: 'MCOM' },
      { code: 'MCO-06', title: 'Marketing Management', credits: 6, programme: 'MCOM' },
      { code: 'MCO-07', title: 'Financial Management', credits: 6, programme: 'MCOM' },
    ],
  },
  {
    code: 'BAM',
    name: 'Bachelor of Arts (Multidisciplinary)',
    level: 'Bachelor',
    department: 'School of Humanities and Social Sciences (SOH/SOSS)',
    courses: [
      // 1st Year (Fresh)
      { code: 'BEGC-131', title: 'Individual & Society', credits: 6, programme: 'BAM' },
      { code: 'BEGC-132', title: 'Selections from Indian Writing', credits: 6, programme: 'BAM' },
      { code: 'BPSC-131', title: 'Introduction to Political Theory', credits: 6, programme: 'BAM' },
      { code: 'BPSC-132', title: 'Indian Government and Politics', credits: 6, programme: 'BAM' },
      // 2nd Year (Re-Registration: BAM 2)
      { code: 'BECE-141', title: 'Microeconomics', credits: 6, programme: 'BAM' },
      { code: 'BECE-142', title: 'Macroeconomics', credits: 6, programme: 'BAM' },
      { code: 'BPSC-133', title: 'Comparative Government and Politics', credits: 6, programme: 'BAM' },
      { code: 'BPSC-134', title: 'Introduction to International Relations', credits: 6, programme: 'BAM' },
      // 3rd Year (Re-Registration: BAM 3)
      { code: 'BECE-015', title: 'Elementary Mathematical Methods in Economics', credits: 8, programme: 'BAM' },
      { code: 'BECE-016', title: 'Economic Development: Comparative Analysis & Contemporary Issues', credits: 8, programme: 'BAM' },
      { code: 'BPSE-141', title: 'Gandhi and the Contemporary World', credits: 6, programme: 'BAM' },
      { code: 'BPSE-142', title: "India's Foreign Policy in a Globalising World", credits: 6, programme: 'BAM' },
    ],
  },
];

// Ensure unique programme codes strictly
export const EXTENDED_IGNOU_PROGRAMMES: IGNOUProgramme[] = (() => {
  const seen = new Set<string>();
  const result: IGNOUProgramme[] = [];
  for (const prog of RAW_EXTENDED_IGNOU_PROGRAMMES) {
    const code = prog.code.trim().toUpperCase();
    if (!seen.has(code)) {
      seen.add(code);
      result.push(prog);
    }
  }
  return result;
})();

// Flat dictionary of all known course codes for fast normalized lookup
export const GLOBAL_IGNOU_COURSE_DICTIONARY: Record<string, { title: string; credits: number; programme: string }> = {};

EXTENDED_IGNOU_PROGRAMMES.forEach((p) => {
  p.courses.forEach((c) => {
    const norm = c.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    GLOBAL_IGNOU_COURSE_DICTIONARY[norm] = {
      title: c.title,
      credits: c.credits,
      programme: p.code,
    };
    GLOBAL_IGNOU_COURSE_DICTIONARY[c.code.toUpperCase()] = {
      title: c.title,
      credits: c.credits,
      programme: p.code,
    };
  });
});

/**
 * Format a course code into standard hyphenated IGNOU style
 * e.g., 'BEGC101' -> 'BEGC-101', 'MEG01' -> 'MEG-01'
 */
export const formatIgnouCourseCode = (input: string): string => {
  const clean = String(input ?? '').trim().toUpperCase();
  if (!clean) return '';
  if (clean.includes('-')) return clean;

  const match = clean.match(/^([A-Z]+)(\d+.*)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return clean;
};

/**
 * Clean course title to proper Title Case
 */
export const cleanIgnouTitle = (title: string): string => {
  if (!title) return '';
  return title
    .replace(/^course\s*\d*\s*[:\-]\s*/i, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .split(' ')
    .map((word) => {
      if (!word) return '';
      // Keep roman numerals and common abbreviations uppercase
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x|ict|pc|c\+\+|it|ai|iot|csr)$/i.test(word)) {
        return word.toUpperCase();
      }
      if (/^(and|of|in|to|for|the|on|at|by|from|with)$/i.test(word)) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Lookup course info from the local catalog
 */
export const lookupCatalogCourse = (courseCode: string, progCode?: string): { title: string; credits: number; programme: string } | null => {
  const raw = courseCode.trim().toUpperCase();
  const norm = raw.replace(/[^A-Z0-9]/g, '');
  const formatted = formatIgnouCourseCode(raw);

  if (GLOBAL_IGNOU_COURSE_DICTIONARY[raw]) return GLOBAL_IGNOU_COURSE_DICTIONARY[raw];
  if (GLOBAL_IGNOU_COURSE_DICTIONARY[norm]) return GLOBAL_IGNOU_COURSE_DICTIONARY[norm];
  if (GLOBAL_IGNOU_COURSE_DICTIONARY[formatted]) return GLOBAL_IGNOU_COURSE_DICTIONARY[formatted];

  // Check in EXTENDED_IGNOU_PROGRAMMES
  for (const p of EXTENDED_IGNOU_PROGRAMMES) {
    if (progCode && p.code.toUpperCase() !== progCode.toUpperCase()) continue;
    for (const c of p.courses) {
      if (
        c.code.toUpperCase() === raw ||
        c.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === norm ||
        c.code.toUpperCase() === formatted
      ) {
        return {
          title: c.title,
          credits: c.credits,
          programme: p.code,
        };
      }
    }
  }

  return null;
};

/**
 * Lookup programme info supporting year suffixes (e.g., "MCOM 2", "BAM 3", "BAG 2")
 */
export const lookupProgrammeWithYear = (rawProgCode: string): IGNOUProgramme | null => {
  if (!rawProgCode) return null;
  const clean = rawProgCode.trim().toUpperCase();
  const match = clean.match(/^([A-Z]+)[-_\s]*([1-3])?$/i);
  const baseCode = match ? match[1].toUpperCase() : clean;

  const found = EXTENDED_IGNOU_PROGRAMMES.find(
    (p) => p.code.toUpperCase() === baseCode || p.code.toUpperCase() === clean
  );
  return found || null;
};

/**
 * Returns year-specific courses for a programme and academic year
 * e.g., MCOM 2 returns 2nd year MCO-* courses; BAM 3 returns 3rd year BECE-015/016, BPSE-141/142
 */
export const getYearSpecificCourseCodes = (
  rawProgCode: string,
  academicYear?: string
): string[] => {
  const clean = String(rawProgCode || '').trim().toUpperCase();
  const match = clean.match(/^([A-Z]+)[-_\s]*([1-3])?$/i);
  const base = match ? match[1].toUpperCase() : clean;
  const yearDigit = match && match[2] ? parseInt(match[2], 10) : null;

  let effectiveYear: '1st Year' | '2nd Year' | '3rd Year' = '1st Year';
  if (yearDigit === 3 || academicYear === '3rd Year') {
    effectiveYear = '3rd Year';
  } else if (yearDigit === 2 || academicYear === '2nd Year') {
    effectiveYear = '2nd Year';
  }

  // Explicit mappings for MCOM and BAM
  if (base === 'MCOM') {
    if (effectiveYear === '2nd Year') {
      return ['MCO-01', 'MCO-03', 'MCO-04', 'MCO-05', 'MCO-06', 'MCO-07'];
    }
    return ['IBO-01', 'IBO-02', 'IBO-03', 'IBO-04', 'IBO-05', 'IBO-06'];
  }

  if (base === 'BAM') {
    if (effectiveYear === '3rd Year') {
      return ['BECE-015', 'BECE-016', 'BPSE-141', 'BPSE-142', 'BHDE-141', 'BHDE-142'];
    }
    if (effectiveYear === '2nd Year') {
      return ['BECE-141', 'BECE-142', 'BPSC-133', 'BPSC-134', 'BHDC-133', 'BHDC-134'];
    }
    return ['BEGC-131', 'BEGC-132', 'BPSC-131', 'BPSC-132', 'BHDC-131', 'BHDC-132'];
  }

  // Generic fallback from catalog
  const prog = lookupProgrammeWithYear(rawProgCode);
  if (!prog || !prog.courses || prog.courses.length === 0) return [];

  const allCodes = prog.courses.map((c) => c.code);
  if (allCodes.length <= 6) return allCodes;

  // Segment by year if catalog has many courses
  const total = allCodes.length;
  if (effectiveYear === '1st Year') {
    return allCodes.slice(0, Math.ceil(total / 3));
  } else if (effectiveYear === '2nd Year') {
    return allCodes.slice(Math.ceil(total / 3), Math.ceil((2 * total) / 3));
  } else {
    return allCodes.slice(Math.ceil((2 * total) / 3));
  }
};

