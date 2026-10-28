import {
  IGNOUProgramme,
  Evaluator,
  SystemSettings,
  IntakeRecord,
  CoursePacket,
  RemunerationBill,
  AssignmentSubmission,
  RegistrationReceipt,
  CourseEvaluationRecord,
  AuditLogEntry,
  StudentRegistrationRecord,
} from '../types';

export const IGNOU_PROGRAMMES: IGNOUProgramme[] = [
  {
    code: 'BAEGH',
    name: 'Bachelor of Arts (Honours) English',
    level: 'Bachelor',
    department: 'School of Humanities (SOH)',
    courses: [
      { code: 'BEGC-101', title: 'Indian Classical Literature', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-102', title: 'European Classical Literature', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-103', title: 'Indian Writing in English', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-104', title: 'British Poetry and Drama: 14th to 17th Centuries', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-105', title: 'American Literature', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-106', title: 'Popular Literature', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-107', title: 'British Poetry and Drama: 17th and 18th Centuries', credits: 6, programme: 'BAEGH' },
      { code: 'BEGC-108', title: 'British Literature: 18th Century', credits: 6, programme: 'BAEGH' },
    ],
  },
  {
    code: 'BAFEDU',
    name: 'Bachelor of Arts in Education',
    level: 'Bachelor',
    department: 'School of Education (SOE)',
    courses: [
      { code: 'BESC-131', title: 'Education: Concept, Nature and Perspectives', credits: 6, programme: 'BAFEDU' },
      { code: 'BESC-132', title: 'Structure and Processes of Education', credits: 6, programme: 'BAFEDU' },
      { code: 'BESC-133', title: 'Curriculum, Teaching-Learning and Assessment', credits: 6, programme: 'BAFEDU' },
      { code: 'BESC-134', title: 'Education in Contemporary India', credits: 6, programme: 'BAFEDU' },
    ],
  },
  {
    code: 'BAFEG',
    name: 'Bachelor of Arts (Foundation Course in English)',
    level: 'Bachelor',
    department: 'School of Humanities (SOH)',
    courses: [
      { code: 'BEGF-101', title: 'Foundation Course in English-1', credits: 4, programme: 'BAFEG' },
      { code: 'FEG-02', title: 'Foundation Course in English-2', credits: 4, programme: 'BAFEG' },
      { code: 'BEGC-131', title: 'Individual & Society', credits: 6, programme: 'BAFEG' },
      { code: 'BEGC-132', title: 'Selections from Indian Writing: Cultural Diversity', credits: 6, programme: 'BAFEG' },
    ],
  },
  {
    code: 'BAFHI',
    name: 'Bachelor of Arts (Foundation Course in Hindi)',
    level: 'Bachelor',
    department: 'School of Humanities (SOH)',
    courses: [
      { code: 'BHDF-101', title: 'Foundation Course in Hindi', credits: 4, programme: 'BAFHI' },
      { code: 'FHD-02', title: 'Hindi Foundation Course-2', credits: 4, programme: 'BAFHI' },
      { code: 'BHIC-131', title: 'History of India from the Earliest Times to c. 300 CE', credits: 6, programme: 'BAFHI' },
      { code: 'BHIC-132', title: 'History of India from c. 300 to 1206', credits: 6, programme: 'BAFHI' },
    ],
  },
  {
    code: 'BAFPS',
    name: 'Bachelor of Arts (Political Science Specialization)',
    level: 'Bachelor',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'BPSC-131', title: 'Introduction to Political Theory', credits: 6, programme: 'BAFPS' },
      { code: 'BPSC-132', title: 'Indian Government and Politics', credits: 6, programme: 'BAFPS' },
      { code: 'BPSC-133', title: 'Comparative Government and Politics', credits: 6, programme: 'BAFPS' },
      { code: 'BPSC-134', title: 'Introduction to International Relations', credits: 6, programme: 'BAFPS' },
    ],
  },
  {
    code: 'BAG',
    name: 'Bachelor of Arts (General)',
    level: 'Bachelor',
    department: 'School of Humanities / Social Sciences',
    courses: [
      { code: 'BPSC-131', title: 'Introduction to Political Theory', credits: 6, programme: 'BAG' },
      { code: 'BPSC-132', title: 'Indian Government and Politics', credits: 6, programme: 'BAG' },
      { code: 'BHIC-131', title: 'History of India from the Earliest Times to c. 300 CE', credits: 6, programme: 'BAG' },
      { code: 'BHIC-132', title: 'History of India from c. 300 to 1206', credits: 6, programme: 'BAG' },
      { code: 'BEGC-131', title: 'Individual & Society', credits: 6, programme: 'BAG' },
      { code: 'BEGC-132', title: 'Selections from Indian Writing: Cultural Diversity', credits: 6, programme: 'BAG' },
      { code: 'BSOC-131', title: 'Introduction to Sociology', credits: 6, programme: 'BAG' },
      { code: 'BESC-131', title: 'Education: Concept, Nature and Perspectives', credits: 6, programme: 'BAG' },
      { code: 'BAPI-003', title: 'Economics and Marketing of Organic Produce (Assignment & Practical)', credits: 4, programme: 'BAG' },
    ],
  },
  {
    code: 'BAHDH',
    name: 'Bachelor of Arts (Honours) Hindi',
    level: 'Bachelor',
    department: 'School of Humanities (Hindi)',
    courses: [
      { code: 'BHDC-101', title: 'हिंदी साहित्य का इतिहास (रीतिकाल तक)', credits: 6, programme: 'BAHDH' },
      { code: 'BHDC-102', title: 'हिंदी साहित्य का इतिहास (आधुनिक काल)', credits: 6, programme: 'BAHDH' },
      { code: 'BHDC-103', title: 'आदिकालीन एवं मध्यकालीन हिंदी कविता', credits: 6, programme: 'BAHDH' },
      { code: 'BHDC-104', title: 'आधुनिक हिंदी कविता (छायावाद तक)', credits: 6, programme: 'BAHDH' },
    ],
  },
  {
    code: 'BAHIH',
    name: 'Bachelor of Arts (Honours) History',
    level: 'Bachelor',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'BHIC-101', title: 'History of India-I', credits: 6, programme: 'BAHIH' },
      { code: 'BHIC-102', title: 'Social Formations and Cultural Patterns of the Ancient World', credits: 6, programme: 'BAHIH' },
      { code: 'BHIC-103', title: 'History of India-II', credits: 6, programme: 'BAHIH' },
      { code: 'BHIC-104', title: 'Social Formations and Cultural Patterns of the Medieval World', credits: 6, programme: 'BAHIH' },
    ],
  },
  {
    code: 'BAM',
    name: 'Bachelor of Arts (Multidisciplinary / Media)',
    level: 'Bachelor',
    department: 'School of Journalism and New Media Studies',
    courses: [
      { code: 'BEGA-102', title: 'Writing for Radio and Television', credits: 4, programme: 'BAM' },
      { code: 'BANC-131', title: 'Anthropology and Human Diversity', credits: 6, programme: 'BAM' },
      { code: 'BPAG-171', title: 'Disaster Management', credits: 6, programme: 'BAM' },
      { code: 'BEGG-171', title: 'Creative Writing', credits: 6, programme: 'BAM' },
    ],
  },
  {
    code: 'BAPHI',
    name: 'Bachelor of Arts (Honours) Philosophy',
    level: 'Bachelor',
    department: 'School of Interdisciplinary Studies',
    courses: [
      { code: 'BPYC-131', title: 'Indian Philosophy: Orthodox and Heterodox Systems', credits: 6, programme: 'BAPHI' },
      { code: 'BPYC-132', title: 'Western Philosophy: Ancient, Medieval and Modern', credits: 6, programme: 'BAPHI' },
      { code: 'BPYC-133', title: 'Logic', credits: 6, programme: 'BAPHI' },
      { code: 'BPYC-134', title: 'Ethics', credits: 6, programme: 'BAPHI' },
    ],
  },
  {
    code: 'BASOH',
    name: 'Bachelor of Arts (Honours) Sociology',
    level: 'Bachelor',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'BSOC-101', title: 'Introduction to Sociology-I', credits: 6, programme: 'BASOH' },
      { code: 'BSOC-102', title: 'Sociology of India-I', credits: 6, programme: 'BASOH' },
      { code: 'BSOC-103', title: 'Introduction to Sociology-II', credits: 6, programme: 'BASOH' },
      { code: 'BSOC-104', title: 'Sociology of India-II', credits: 6, programme: 'BASOH' },
    ],
  },
  {
    code: 'BBA',
    name: 'Bachelor of Business Administration',
    level: 'Bachelor',
    department: 'School of Management Studies (SOMS)',
    courses: [
      { code: 'BBA-101', title: 'Principles of Management', credits: 6, programme: 'BBA' },
      { code: 'BBA-102', title: 'Business Economics', credits: 6, programme: 'BBA' },
      { code: 'BBA-103', title: 'Financial Accounting for Managers', credits: 6, programme: 'BBA' },
      { code: 'BBA-104', title: 'Business Communication', credits: 4, programme: 'BBA' },
    ],
  },
  {
    code: 'BCOM',
    name: 'Bachelor of Commerce',
    level: 'Bachelor',
    department: 'School of Management Studies',
    courses: [
      { code: 'BCOC-131', title: 'Financial Accounting', credits: 6, programme: 'BCOM' },
      { code: 'BCOC-132', title: 'Business Organisation and Management', credits: 6, programme: 'BCOM' },
      { code: 'BCOC-133', title: 'Business Law', credits: 6, programme: 'BCOM' },
      { code: 'BCOC-134', title: 'Business Mathematics and Statistics', credits: 6, programme: 'BCOM' },
      { code: 'BCOLA-138', title: 'Business Communication', credits: 6, programme: 'BCOM' },
      { code: 'BCOS-183', title: 'Computer Application in Business', credits: 4, programme: 'BCOM' },
    ],
  },
  {
    code: 'BCOMF',
    name: 'Bachelor of Commerce (Finance & Retailing Operations)',
    level: 'Bachelor',
    department: 'School of Management Studies (SOMS)',
    courses: [
      { code: 'BRL-101', title: 'Overview of Retailing', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-102', title: 'Retail Marketing and Communication', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-103', title: 'Store Operations-I', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-104', title: 'IT Tutorial in Retail', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-105', title: 'Customer Service Management', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-106', title: 'Managing Operations', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-107', title: 'Buying and Merchandising', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-108', title: 'Human Resources in Retail', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-111', title: 'Retailing Concepts and Practices', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-112', title: 'Customer Value Management', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-113', title: 'Retail Logistics and Supply Chain Management', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-114', title: 'Visual Merchandising and Store Design', credits: 4, programme: 'BCOMF' },
      { code: 'BRL-115', title: 'IT Applications in Retail Management', credits: 4, programme: 'BCOMF' },
    ],
  },
  {
    code: 'MAH',
    name: 'Master of Arts in History',
    level: 'Master',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'MHI-01', title: 'Ancient and Medieval Societies', credits: 8, programme: 'MAH' },
      { code: 'MHI-02', title: 'Modern World', credits: 8, programme: 'MAH' },
      { code: 'MHI-03', title: 'Historians and History Writing', credits: 8, programme: 'MAH' },
      { code: 'MHI-04', title: 'Political Structures in India', credits: 8, programme: 'MAH' },
      { code: 'MHI-05', title: 'History of Indian Economy', credits: 8, programme: 'MAH' },
      { code: 'MHI-06', title: 'Evolution of Social Structures in India through the Ages', credits: 8, programme: 'MAH' },
      { code: 'MHI-08', title: 'History of Ecology and Environment: India', credits: 8, programme: 'MAH' },
      { code: 'MHI-09', title: 'Indian National Movement', credits: 8, programme: 'MAH' },
      { code: 'MHI-10', title: 'Urbanisation in India', credits: 8, programme: 'MAH' },
    ],
  },
  {
    code: 'MAHI',
    name: 'Master of Arts in Hindi / History',
    level: 'Master',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'MHI-01', title: 'Ancient and Medieval Societies', credits: 8, programme: 'MAHI' },
      { code: 'MHI-02', title: 'Modern World', credits: 8, programme: 'MAHI' },
      { code: 'MHI-03', title: 'Historiography', credits: 8, programme: 'MAHI' },
      { code: 'MHI-06', title: 'Evolution of Social Structures in India', credits: 8, programme: 'MAHI' },
    ],
  },
  {
    code: 'MCOM',
    name: 'Master of Commerce',
    level: 'Master',
    department: 'School of Management Studies (SOMS)',
    courses: [
      { code: 'IBO-01', title: 'International Business Environment', credits: 6, programme: 'MCOM' },
      { code: 'IBO-02', title: 'International Marketing Management', credits: 6, programme: 'MCOM' },
      { code: 'IBO-03', title: 'India’s Foreign Trade', credits: 6, programme: 'MCOM' },
      { code: 'IBO-04', title: 'Export Import Procedures & Documentation', credits: 6, programme: 'MCOM' },
      { code: 'IBO-05', title: 'International Marketing Logistics', credits: 6, programme: 'MCOM' },
      { code: 'IBO-06', title: 'International Business Finance', credits: 6, programme: 'MCOM' },
      { code: 'MCO-01', title: 'Organisation Theory and Behaviour', credits: 6, programme: 'MCOM' },
      { code: 'MCO-03', title: 'Research Methodology & Statistical Analysis', credits: 6, programme: 'MCOM' },
    ],
  },
  {
    code: 'MEG',
    name: 'Master of Arts in English',
    level: 'Master',
    department: 'School of Humanities (SOH)',
    courses: [
      { code: 'MEG-01', title: 'British Poetry', credits: 8, programme: 'MEG' },
      { code: 'MEG-02', title: 'British Drama', credits: 8, programme: 'MEG' },
      { code: 'MEG-03', title: 'British Novel', credits: 8, programme: 'MEG' },
      { code: 'MEG-04', title: 'Aspects of Language', credits: 8, programme: 'MEG' },
      { code: 'MEG-05', title: 'Literary Criticism & Theory', credits: 8, programme: 'MEG' },
      { code: 'MEG-06', title: 'American Literature', credits: 8, programme: 'MEG' },
      { code: 'MEG-07', title: 'Indian English Literature', credits: 8, programme: 'MEG' },
      { code: 'MEG-10', title: 'English Studies in India', credits: 8, programme: 'MEG' },
    ],
  },
  {
    code: 'MHD',
    name: 'Master of Arts in Hindi',
    level: 'Master',
    department: 'School of Humanities (Hindi)',
    courses: [
      { code: 'MHD-02', title: 'आधुनिक हिंदी कविता (Modern Hindi Poetry)', credits: 8, programme: 'MHD' },
      { code: 'MHD-03', title: 'उपन्यास एवं कहानी (Fiction & Short Story)', credits: 8, programme: 'MHD' },
      { code: 'MHD-04', title: 'नाटक एवं अन्य गद्य विधाएँ (Drama & Prose)', credits: 8, programme: 'MHD' },
      { code: 'MHD-06', title: 'हिंदी भाषा और साहित्य का इतिहास', credits: 8, programme: 'MHD' },
    ],
  },
  {
    code: 'MPS',
    name: 'Master of Arts in Political Science',
    level: 'Master',
    department: 'School of Social Sciences (SOSS)',
    courses: [
      { code: 'MPS-001', title: 'Political Theory', credits: 8, programme: 'MPS' },
      { code: 'MPS-002', title: 'International Relations: Theory and Problems', credits: 8, programme: 'MPS' },
      { code: 'MPS-003', title: 'India: Democracy and Development', credits: 8, programme: 'MPS' },
      { code: 'MPS-004', title: 'Comparative Politics: Issues and Trends', credits: 8, programme: 'MPS' },
      { code: 'MPSE-001', title: 'India and the World', credits: 4, programme: 'MPS' },
      { code: 'MPSE-003', title: 'Western Political Thought', credits: 4, programme: 'MPS' },
    ],
  },
];

export const INITIAL_EVALUATORS: Evaluator[] = [
  {
    id: 'ev-1',
    evaluatorCode: 'EV-101',
    name: 'Dr. Alok Nath Mukherjee',
    designation: 'Associate Professor',
    department: 'Department of English',
    collegeInstitution: 'Dimapur Government College',
    contactPhone: '+91 98112 45871',
    email: 'an.mukherjee@dimapurcollege.edu.in',
    eligibleCourses: ['MEG-01', 'MEG-02', 'MEG-03', 'BEGC-131', 'BEGC-132'],
    bankName: 'State Bank of India',
    accountNumber: '30982746195',
    ifscCode: 'SBIN0001067',
    panNumber: 'ABCPM8945K',
    status: 'Active',
    lastSyncedAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'ev-2',
    evaluatorCode: 'EV-102',
    name: 'Prof. Suniti Deshpande',
    designation: 'Professor & Head',
    department: 'Department of Political Science',
    collegeInstitution: 'Kohima Science College, Jotsoma',
    contactPhone: '+91 98710 33490',
    email: 'suniti.deshpande@ksc.edu.in',
    eligibleCourses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004', 'BPSC-131', 'BPSC-132'],
    bankName: 'Punjab National Bank',
    accountNumber: '0145000100492817',
    ifscCode: 'PUNB0014500',
    panNumber: 'AKRPD3211L',
    status: 'Active',
    lastSyncedAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'ev-3',
    evaluatorCode: 'EV-103',
    name: 'Dr. Rameshwar Prasad Verma',
    designation: 'Associate Professor',
    department: 'Department of Commerce & Finance',
    collegeInstitution: "S.D. Jain Girls' College, Dimapur",
    contactPhone: '+91 94150 78210',
    email: 'rp.verma@sdjain.edu.in',
    eligibleCourses: ['IBO-01', 'IBO-02', 'IBO-03', 'IBO-04', 'BCOC-131', 'BCOC-132'],
    bankName: 'Canara Bank',
    accountNumber: '1182101039482',
    ifscCode: 'CNRB0001182',
    panNumber: 'BKLPV4589M',
    status: 'Active',
    lastSyncedAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'ev-4',
    evaluatorCode: 'EV-104',
    name: 'Dr. Meenakshi Sundaram',
    designation: 'Assistant Professor (Sr. Scale)',
    department: 'Department of History',
    collegeInstitution: 'Nagaland University, Kohima Campus',
    contactPhone: '+91 98991 67204',
    email: 'm.sundaram@nagalanduniv.edu.in',
    eligibleCourses: ['MHI-01', 'MHI-02', 'MHI-04', 'BHIC-131', 'BHIC-132'],
    bankName: 'Bank of Baroda',
    accountNumber: '29810100034918',
    ifscCode: 'BARB0KOHIMA',
    panNumber: 'CMSPS7124R',
    status: 'Active',
    lastSyncedAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'ev-5',
    evaluatorCode: 'EV-105',
    name: 'Dr. Harish Chandra Pandey',
    designation: 'Associate Professor',
    department: 'Department of Hindi Literature',
    collegeInstitution: 'Patkai Christian College, Seithekema',
    contactPhone: '+91 99104 55678',
    email: 'hcpandey@patkai.edu.in',
    eligibleCourses: ['MHD-02', 'MHD-03', 'MHD-04', 'MHD-06'],
    bankName: 'State Bank of India',
    accountNumber: '20491823901',
    ifscCode: 'SBIN0004289',
    panNumber: 'AHCPP1029T',
    status: 'Active',
    lastSyncedAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'ev-6',
    evaluatorCode: 'EV-106',
    name: 'Dr. Priya V. Nair',
    designation: 'Assistant Professor',
    department: 'School of Journalism & Mass Comm.',
    collegeInstitution: 'Fazl Ali College, Mokokchung',
    contactPhone: '+91 97118 90321',
    email: 'priya.nair@fazlali.edu.in',
    eligibleCourses: ['BEGA-102', 'BPAG-171', 'BEGG-171', 'BSOC-131'],
    bankName: 'HDFC Bank',
    accountNumber: '50100239104812',
    ifscCode: 'HDFC0000249',
    panNumber: 'BKLPN6719P',
    status: 'Active',
    lastSyncedAt: '2026-09-01T10:30:00Z',
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  centreCode: 'SC-2033',
  centreName: "SC-2033 (S.D. Jain Girls' College, Dimapur)",
  institutionName: "SC-2033 (S.D. Jain Girls' College, Dimapur)",
  hostInstitution: "S.D. Jain Girls' College, Dimapur",
  collegeName: "S.D. Jain Girls' College, Dimapur",
  regionalCentreCode: 'RC-20 Kohima (Regional Centre Kohima)',
  regionalCentre: 'RC-20 Kohima',
  coordinatorName: 'Dr. Sant Kumar Gupta',
  coordinatorDesignation: 'Coordinator, IGNOU SC-2033',
  coordinatorContact: '+91 9436013686 | sant.k.gupta@gmail.com',
  coordinatorPhone: '9436013686',
  coordinatorEmail: 'sant.k.gupta@gmail.com',
  remunerationRatePerScript: 27.50, // Rs. 27.50 per assignment script as per official IGNOU study centre evaluation guidelines
  conveyanceAllowancePerPacket: 0.00, // Default 0.00 conveyance allowance
  coordinationChargesPerScript: 0.00, // Default 0.00 coordination charges
  availableSessions: [
    'January 2024',
    'July 2024',
    'January 2025',
    'July 2025',
    'January 2026',
    'July 2026',
    'January 2027',
    'July 2027',
  ],
  defaultSession: 'July 2026',
  adminPin: '2033',
  lastBackupDate: '2026-09-07T05:30:00Z',
};

export const INITIAL_INTAKE_RECORDS: IntakeRecord[] = [];
export const INITIAL_PACKETS: CoursePacket[] = [];
export const INITIAL_BILLS: RemunerationBill[] = [];
export const INITIAL_ASSIGNMENT_SUBMISSIONS: AssignmentSubmission[] = [];
export const INITIAL_REGISTRATION_RECEIPTS: RegistrationReceipt[] = [];
export const INITIAL_COURSE_EVALUATIONS: CourseEvaluationRecord[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-09-24T18:30:15.000Z',
    action: 'USER_LOGIN',
    category: 'AUTHENTICATION',
    actor: 'Dr. Sant K. Gupta (Coordinator)',
    role: 'ADMIN',
    session: 'July 2026',
    summary: 'Master Administrator authenticated via Terminal PIN (2033)',
    details: { authMethod: 'Admin Security PIN', client: 'Operations Terminal 1' },
    status: 'SUCCESS',
  },
  {
    id: 'audit-002',
    timestamp: '2026-09-24T18:35:22.000Z',
    action: 'MARKS_LOCKED',
    category: 'MARKS_EVALUATION',
    actor: 'Dr. Sant K. Gupta (Coordinator)',
    role: 'ADMIN',
    session: 'July 2026',
    targetIdentifier: 'SUB_2401928371_MEG01_JUL2026',
    summary: 'Statutory verification: Marks locked at 78 (Grade B) for Aarav Sharma (Enrollment: 2401928371, Course: MEG-01)',
    details: { marks: 78, grade: 'B', evaluator: 'Dr. Alok Nath Mukherjee (EV-101)' },
    status: 'SUCCESS',
  },
  {
    id: 'audit-003',
    timestamp: '2026-09-24T17:15:00.000Z',
    action: 'EVALUATOR_ALLOTTED',
    category: 'MARKS_EVALUATION',
    actor: 'Dr. Sant K. Gupta (Coordinator)',
    role: 'ADMIN',
    session: 'July 2026',
    targetIdentifier: 'EV-101 (MEG-01, MEG-02)',
    summary: 'Allocated Academic Counsellor Dr. Alok Nath Mukherjee (EV-101) to 4 candidate scripts',
    details: { evaluatorCode: 'EV-101', scriptCount: 4, courses: ['MEG-01', 'MEG-02'] },
    status: 'SUCCESS',
  },
  {
    id: 'audit-004',
    timestamp: '2026-09-24T16:45:10.000Z',
    action: 'USER_LOGIN',
    category: 'AUTHENTICATION',
    actor: 'Desk Official (Intake Counter)',
    role: 'OFFICIAL',
    session: 'July 2026',
    summary: 'Desk Official logged into Terminal Counter via Official PIN (1001)',
    details: { authMethod: 'Official Security PIN', client: 'Counter Desk A' },
    status: 'SUCCESS',
  },
  {
    id: 'audit-005',
    timestamp: '2026-09-24T16:50:42.000Z',
    action: 'INTAKE_CREATED',
    category: 'ASSIGNMENT_INTAKE',
    actor: 'Desk Official (Intake Counter)',
    role: 'OFFICIAL',
    session: 'July 2026',
    targetIdentifier: 'SC2033-JUL26-0001 (Enr: 2401928371)',
    summary: 'Registered in-person assignment intake for candidate Aarav Sharma (Enrollment: 2401928371, Courses: MEG-01, MEG-02, MEG-03, MEG-04)',
    details: { mode: 'In-Person (Desk)', tokenNo: 'SC2033-JUL26-0001', coursesCount: 4 },
    status: 'SUCCESS',
  },
  {
    id: 'audit-006',
    timestamp: '2026-09-24T16:52:18.000Z',
    action: 'INTAKE_DATE_CHANGED',
    category: 'ASSIGNMENT_INTAKE',
    actor: 'Desk Official (Intake Counter)',
    role: 'OFFICIAL',
    session: 'July 2026',
    targetIdentifier: '2401928371',
    summary: 'Calibrated submission intake date for Aarav Sharma to 2026-08-15',
    details: { previousDate: '2026-08-14', newDate: '2026-08-15' },
    status: 'SUCCESS',
  },
  {
    id: 'audit-007',
    timestamp: '2026-09-24T15:20:00.000Z',
    action: 'SHEETS_SYNCED',
    category: 'SYSTEM_SETTINGS',
    actor: 'Automated Sync Service',
    role: 'SYSTEM',
    session: 'July 2026',
    summary: 'Synchronized intake registers and evaluator roster with institutional Google Spreadsheet backend',
    details: { syncStatus: 'Complete', rowCount: 18 },
    status: 'SUCCESS',
  },
];

export const REAL_SC2033_STUDENTS_ROSTER = [
  { enrollmentNo: '2604740340', studentName: 'LIYANI ENIE', programmeCode: 'MPS', studentPhone: '9366767694', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601620608', studentName: 'VIJAY KUMAR', programmeCode: 'MPS', studentPhone: '9612627667', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601620300', studentName: 'RULIKA ACHUMI', programmeCode: 'MPS', studentPhone: '7630006224', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2604741820', studentName: 'TATONGMONGLA JAMIR', programmeCode: 'MPS', studentPhone: '9856521746', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601101578', studentName: 'HASHMITHA NUNISA', programmeCode: 'MPS', studentPhone: '8822382839', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601623485', studentName: 'RINGTHAIDI SINGYUNG', programmeCode: 'MPS', studentPhone: '8787460144', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2651332193', studentName: 'TH. MALA DEVI', programmeCode: 'MCOM', studentPhone: '6009569550', courses: ['MCO-01', 'MCO-04', 'MCO-05', 'MCO-21'], session: 'July 2026' },
  { enrollmentNo: '2201830549', studentName: 'S. LAMTANG PHON', programmeCode: 'BAG', studentPhone: '6200191237', courses: ['BEGS-185', 'BEGS-156', 'BHIE-143', 'BHIE-144', 'BEGE-142', 'BEGE-145', 'BEGC-133', 'BSKG-178', 'BHDG-175'], session: 'July 2026' },
  { enrollmentNo: '2601623470', studentName: 'HAMPAIDI KHEMPRAI', programmeCode: 'MPS', studentPhone: '6901604857', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2550752120', studentName: 'SAJIDA SULTANA SIDDIQUEY', programmeCode: 'MCOM', studentPhone: '9362636574', courses: ['MCO-03', 'MCO-07', 'MCO-15', 'IBO-02'], session: 'July 2026' },
  { enrollmentNo: '2300751095', studentName: 'ESTHER PHOM', programmeCode: 'BAG', studentPhone: '9612384504', courses: ['BHIC-134'], session: 'July 2026' },
  { enrollmentNo: '2452208180', studentName: 'SULTANA PARVIN', programmeCode: 'MCOM', studentPhone: '8798585925', courses: ['IBO-01', 'IBO-06'], session: 'July 2026' },
  { enrollmentNo: '2552351300', studentName: 'SNEHA GUPTA', programmeCode: 'MCOM', studentPhone: '6009290278', courses: ['MCO-03', 'MCO-07', 'MCO-15', 'IBO-02'], session: 'July 2026' },
  { enrollmentNo: '2552351384', studentName: 'PRIYANKA BISWAS', programmeCode: 'MCOM', studentPhone: '9089335601', courses: ['MCO-03', 'MCO-07', 'MCO-15', 'IBO-02'], session: 'July 2026' },
  { enrollmentNo: '2501975306', studentName: 'SAHINA KHATUN', programmeCode: 'MEG', studentPhone: '7005083843', courses: ['MEG-07', 'MEG-10', 'MEG-14', 'MEG-15'], session: 'July 2026' },
  { enrollmentNo: '2500631266', studentName: 'RAMBUN NRING', programmeCode: 'MEG', studentPhone: '8119024639', courses: ['MEG-04', 'MEG-07', 'MEG-10', 'MEG-14'], session: 'July 2026' },
  { enrollmentNo: '2450175894', studentName: 'NAOLEI KONYAK', programmeCode: 'BAEGH', studentPhone: '8787361968', courses: ['BPCS-186', 'BPCG-173', 'BPAG-174', 'BSSS-183', 'BEGC-105', 'BEGC-106', 'BEGC-107', 'BEGC-108', 'BEGC-109', 'BEGC-110'], session: 'July 2026' },
  { enrollmentNo: '2300509688', studentName: 'ALOINO Y AWOMI', programmeCode: 'BAG', studentPhone: '8974275109', courses: ['BESE-141', 'BESE-142', 'BHDE-141', 'BHDE-144', 'BEGS-185', 'BPCG-173', 'BPAS-186', 'BGDG-172'], session: 'July 2026' },
  { enrollmentNo: '2603715132', studentName: 'KIMNEILHAI KIPGEN', programmeCode: 'BAHDH', studentPhone: '8798508450', courses: ['BHDC-101', 'BHDC-102', 'BHDC-103', 'BHDC-104', 'BPCG-171', 'BPCG-172', 'BHDAE-182', 'BEVAE-181'], session: 'July 2026' },
  { enrollmentNo: '2604425544', studentName: 'NENGDEICHING MISAO', programmeCode: 'BAM', studentPhone: '8787621332', courses: ['BEGG-171', 'BSOC-131', 'BSOC-132', 'BECC-101', 'BPAC-101', 'BEVAE-181', 'BEDSV-101'], session: 'July 2026' },
  { enrollmentNo: '2450176165', studentName: 'PRINCESH MOMIN', programmeCode: 'BAFHI', studentPhone: '7085703965', courses: ['BEGS-186', 'BEGM-162', 'BHIC-110', 'BHIC-111', 'BHIC-112', 'BHIC-113', 'BCOS-186'], session: 'July 2026' },
  { enrollmentNo: '2353174645', studentName: 'SUSHMITA ROY', programmeCode: 'BAPSH', studentPhone: '6009362619', courses: ['BPSE-142', 'BPSE-143', 'BPSE-145', 'BPSC-111'], session: 'July 2026' },
  { enrollmentNo: '2601365755', studentName: 'VIZANU K ZHIMO', programmeCode: 'MPS', studentPhone: '7085809151', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601620450', studentName: 'SRUTI BASUMATARY', programmeCode: 'MPS', studentPhone: '7085711642', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601620613', studentName: 'CHANDENO YANTHAN', programmeCode: 'MPS', studentPhone: '6009910419', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], session: 'July 2026' },
  { enrollmentNo: '2601615010', studentName: 'ANISHA TASMIN', programmeCode: 'MEG', studentPhone: '9862483561', courses: ['MEG-01', 'MEG-02', 'MEG-03', 'MEG-05', 'MEG-07'], session: 'July 2026' },
  { enrollmentNo: '2601789028', studentName: 'PRIYA PARVEEN', programmeCode: 'MEG', studentPhone: '9366771659', courses: ['MEG-01', 'MEG-02', 'MEG-03', 'MEG-05', 'MEG-07'], session: 'July 2026' },
  { enrollmentNo: '2601788989', studentName: 'ROJITA SINGH', programmeCode: 'MEG', studentPhone: '8794476902', courses: ['MEG-01', 'MEG-02', 'MEG-03', 'MEG-05', 'MEG-06'], session: 'July 2026' },
  { enrollmentNo: '2352267466', studentName: 'SUSHMITA PAUL', programmeCode: 'MCOM', studentPhone: '6009512478', courses: ['IBO-01', 'IBO-06'], session: 'July 2026' },
  { enrollmentNo: '2651819010', studentName: 'VIPENI G YEPTHO', programmeCode: 'BAM', studentPhone: '9863114861', courses: ['BESC-131', 'BGDG-172', 'BEGC-131'], session: 'July 2026' },
  { enrollmentNo: '2101910933', studentName: 'KANHAIYA SHAH', programmeCode: 'BAG', studentPhone: '7085874423', courses: ['BAPI-003'], session: 'July 2026' },
  { enrollmentNo: '2651888161', studentName: 'MD REHAN', programmeCode: 'BCOMF', studentPhone: '8787333845', courses: ['BECC-101', 'BCOC-132', 'BRL-101'], session: 'July 2026' },
];

function buildRegistrations(): StudentRegistrationRecord[] {
  const records: StudentRegistrationRecord[] = [];

  // 1. Generate core authentic SC-2033 roster mappings across active cycles
  REAL_SC2033_STUDENTS_ROSTER.forEach((s, idx) => {
    const isMaster = ['MPS', 'MEG', 'MCOM', 'MHD', 'MBA', 'MCA'].includes(s.programmeCode);
    const enrPrefix = s.enrollmentNo.slice(0, 2);

    let cadre: 'FRESH' | 'RE_REGISTRATION' = 'FRESH';
    let academicYear: '1st Year' | '2nd Year' | '3rd Year' = '1st Year';
    let session = s.session || 'July 2026';
    let sessionCycle: 'January' | 'July' = 'July';
    let sessionYear = 2026;

    if (enrPrefix === '26') {
      cadre = 'FRESH';
      academicYear = '1st Year';
      session = idx % 2 === 0 ? 'January 2026' : 'July 2026';
      sessionCycle = session.includes('Jan') ? 'January' : 'July';
      sessionYear = 2026;
    } else if (enrPrefix === '25') {
      if (idx % 2 === 0) {
        cadre = 'RE_REGISTRATION';
        academicYear = '2nd Year';
        session = idx % 4 === 0 ? 'January 2026' : 'July 2026';
        sessionCycle = session.includes('Jan') ? 'January' : 'July';
        sessionYear = 2026;
      } else {
        cadre = 'FRESH';
        academicYear = '1st Year';
        session = idx % 3 === 0 ? 'January 2025' : 'July 2025';
        sessionCycle = session.includes('Jan') ? 'January' : 'July';
        sessionYear = 2025;
      }
    } else if (enrPrefix === '24') {
      if (idx % 2 === 0) {
        cadre = 'RE_REGISTRATION';
        academicYear = '2nd Year';
        session = idx % 3 === 0 ? 'January 2025' : 'July 2025';
        sessionCycle = session.includes('Jan') ? 'January' : 'July';
        sessionYear = 2025;
      } else {
        cadre = 'FRESH';
        academicYear = '1st Year';
        session = idx % 4 === 0 ? 'January 2024' : 'July 2024';
        sessionCycle = session.includes('Jan') ? 'January' : 'July';
        sessionYear = 2024;
      }
    } else {
      cadre = 'RE_REGISTRATION';
      academicYear = isMaster ? '2nd Year' : '3rd Year';
      session = idx % 2 === 0 ? 'January 2024' : 'July 2024';
      sessionCycle = session.includes('Jan') ? 'January' : 'July';
      sessionYear = 2024;
    }

    records.push({
      id: `REG-${s.enrollmentNo}-${session.replace(/\s+/g, '').toUpperCase()}-${cadre === 'FRESH' ? 'F' : 'RR'}`,
      cadre,
      academicYear,
      enrollmentNo: s.enrollmentNo,
      studentName: s.studentName,
      programmeCode: s.programmeCode,
      programmeName: s.programmeCode,
      session,
      sessionCycle,
      sessionYear,
      courseCodes: s.courses,
      studentPhone: s.studentPhone,
      studentEmail: `${s.studentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`,
      registrationDate: `${sessionYear}-${sessionCycle === 'January' ? '01' : '07'}-15`,
      status: 'Confirmed',
      feeReference: `IGN-FEE-${sessionYear}-${s.enrollmentNo.slice(-4)}`,
      studyCentreCode: '2033',
      regionalCentreCode: 'RC-20',
      createdAt: `${sessionYear}-${sessionCycle === 'January' ? '01' : '07'}-15T10:00:00.000Z`,
      updatedAt: `${sessionYear}-${sessionCycle === 'January' ? '01' : '07'}-15T10:00:00.000Z`,
    });
  });

  // 2. Pre-seed explicit historical student records for every single cycle:
  // Jan 2024, Jul 2024, Jan 2025, Jul 2025, Jan 2026
  const historicalSeed: Array<{
    session: string;
    cadre: 'FRESH' | 'RE_REGISTRATION';
    academicYear: '1st Year' | '2nd Year' | '3rd Year';
    enr: string;
    name: string;
    prog: string;
    courses: string[];
    phone: string;
  }> = [
    // January 2024
    { session: 'January 2024', cadre: 'FRESH', academicYear: '1st Year', enr: '2401102911', name: 'IMTIKUMZUK AO', prog: 'BAG', courses: ['BPSC-131', 'BPSC-132', 'BHIC-131', 'BEGC-131'], phone: '9436014411' },
    { session: 'January 2024', cadre: 'FRESH', academicYear: '1st Year', enr: '2401102922', name: 'NEIKETHONO KENSE', prog: 'MEG', courses: ['MEG-01', 'MEG-02', 'MEG-03'], phone: '9436014422' },
    { session: 'January 2024', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2301827364', name: 'ROHAN VERMA', prog: 'BCOMG', courses: ['BCOLA-138', 'BCOE-141', 'BCOE-142'], phone: '9436123456' },
    { session: 'January 2024', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2301984210', name: 'SANGITA DAS', prog: 'MPS', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], phone: '9862145671' },

    // July 2024
    { session: 'July 2024', cadre: 'FRESH', academicYear: '1st Year', enr: '2452201010', name: 'ARENLA PONGEN', prog: 'BAEGH', courses: ['BEGC-101', 'BEGC-102', 'BEGC-103', 'BEGC-104'], phone: '9862010101' },
    { session: 'July 2024', cadre: 'FRESH', academicYear: '1st Year', enr: '2452201020', name: 'SURESH SHARMA', prog: 'MCOM', courses: ['IBO-01', 'IBO-02', 'IBO-03', 'IBO-04'], phone: '9862010102' },
    { session: 'July 2024', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2350198421', name: 'ANANYA CHATTERJEE', prog: 'BAG', courses: ['BSOC-131', 'BESC-131', 'BEGC-132'], phone: '9436214567' },
    { session: 'July 2024', cadre: 'RE_REGISTRATION', academicYear: '3rd Year', enr: '2201830549', name: 'S. LAMTANG PHON', prog: 'BAG', courses: ['BEGS-185', 'BEGS-156', 'BHIE-143', 'BHIE-144'], phone: '6200191237' },

    // January 2025
    { session: 'January 2025', cadre: 'FRESH', academicYear: '1st Year', enr: '2501103030', name: 'ZUBENI KIKON', prog: 'BAG', courses: ['BPSC-131', 'BPSC-132', 'BHIC-131', 'BEGC-131'], phone: '9366030301' },
    { session: 'January 2025', cadre: 'FRESH', academicYear: '1st Year', enr: '2501103040', name: 'MANOJ PRASAD', prog: 'BCOMG', courses: ['BCOC-131', 'BCOC-132', 'BECC-101'], phone: '9366030302' },
    { session: 'January 2025', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2401102911', name: 'IMTIKUMZUK AO', prog: 'BAG', courses: ['BPSC-133', 'BPSC-134', 'BHIC-132'], phone: '9436014411' },
    { session: 'January 2025', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2401102922', name: 'NEIKETHONO KENSE', prog: 'MEG', courses: ['MEG-04', 'MEG-05', 'MEG-07'], phone: '9436014422' },

    // July 2025
    { session: 'July 2025', cadre: 'FRESH', academicYear: '1st Year', enr: '2550184040', name: 'ALONGBA CHANG', prog: 'MPS', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], phone: '9436084040' },
    { session: 'July 2025', cadre: 'FRESH', academicYear: '1st Year', enr: '2550184050', name: 'RANI DEVI', prog: 'MEG', courses: ['MEG-01', 'MEG-02', 'MEG-03', 'MEG-05'], phone: '9436084050' },
    { session: 'July 2025', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2452201010', name: 'ARENLA PONGEN', prog: 'BAEGH', courses: ['BEGC-105', 'BEGC-106', 'BEGC-107', 'BEGC-108'], phone: '9862010101' },
    { session: 'July 2025', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2452201020', name: 'SURESH SHARMA', prog: 'MCOM', courses: ['IBO-05', 'IBO-06', 'MCO-01', 'MCO-03'], phone: '9862010102' },

    // January 2026
    { session: 'January 2026', cadre: 'FRESH', academicYear: '1st Year', enr: '2601928371', name: 'POOJA SHARMA', prog: 'BAG', courses: ['BEGC-131', 'BEGC-132', 'BSOG-171', 'BPSC-131'], phone: '9862123456' },
    { session: 'January 2026', cadre: 'FRESH', academicYear: '1st Year', enr: '2601928388', name: 'BENDANGTOSHI JAMIR', prog: 'MPS', courses: ['MPS-001', 'MPS-002', 'MPS-003', 'MPS-004'], phone: '9862123488' },
    { session: 'January 2026', cadre: 'RE_REGISTRATION', academicYear: '2nd Year', enr: '2501103030', name: 'ZUBENI KIKON', prog: 'BAG', courses: ['BPSC-133', 'BPSC-134', 'BHIC-132'], phone: '9366030301' },
    { session: 'January 2026', cadre: 'RE_REGISTRATION', academicYear: '3rd Year', enr: '2401102911', name: 'IMTIKUMZUK AO', prog: 'BAG', courses: ['BESE-141', 'BESE-142', 'BHDE-141'], phone: '9436014411' },
  ];

  historicalSeed.forEach((h) => {
    const sessionCycle: 'January' | 'July' = h.session.includes('Jan') ? 'January' : 'July';
    const yearMatch = h.session.match(/\d{4}/);
    const sessionYear = yearMatch ? parseInt(yearMatch[0], 10) : 2024;

    records.push({
      id: `REG-${h.enr}-${h.session.replace(/\s+/g, '').toUpperCase()}-${h.cadre === 'FRESH' ? 'F' : 'RR'}`,
      cadre: h.cadre,
      academicYear: h.academicYear,
      enrollmentNo: h.enr,
      studentName: h.name,
      programmeCode: h.prog,
      programmeName: h.prog,
      session: h.session,
      sessionCycle,
      sessionYear,
      courseCodes: h.courses,
      studentPhone: h.phone,
      studentEmail: `${h.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`,
      registrationDate: `${sessionYear}-${sessionCycle === 'January' ? '01' : '07'}-15`,
      status: 'Confirmed',
      feeReference: `IGN-FEE-${sessionYear}-${h.enr.slice(-4)}`,
      studyCentreCode: '2033',
      regionalCentreCode: 'RC-20',
      createdAt: `${sessionYear}-${sessionCycle === 'January' ? '01' : '07'}-15T10:00:00.000Z`,
      updatedAt: `${sessionYear}-${sessionCycle === 'January' ? '01' : '07'}-15T10:00:00.000Z`,
    });
  });

  return records;
}

export const INITIAL_STUDENT_REGISTRATIONS: StudentRegistrationRecord[] = buildRegistrations();

