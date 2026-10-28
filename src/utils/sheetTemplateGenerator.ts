/**
 * Google Sheets Database Template Generator & Schema Definitions
 * Study Centre SC-2033, S.D. Jain Girls' College, Dimapur
 */

export interface SheetColumnDefinition {
  key: string;
  label: string;
  description: string;
  required: boolean;
  example: string;
}

export interface SheetSchema {
  id: string;
  title: string;
  aliases: string[];
  description: string;
  accentColor: string;
  columns: SheetColumnDefinition[];
  sampleRows: Record<string, string>[];
}

export const INTAKE_REGISTER_SCHEMA: SheetSchema = {
  id: 'Intake_Register',
  title: 'Intake_Register',
  aliases: ['Intake_Register', 'IntakeRegister', '1_Assignment_Intake_Register', 'Intake_Desk'],
  description: 'Front-counter student walk-in intake register for assignment and practical script submissions.',
  accentColor: '#0f766e',
  columns: [
    { key: 'Timestamp', label: 'Timestamp', description: 'Submission date-time formatted as YYYY-MM-DD or ISO timestamp', required: true, example: '2026-07-15 11:30 AM' },
    { key: 'Token_No', label: 'Token_No', description: 'Receipt intake token number (e.g. SC2033-JUL26-0001)', required: true, example: 'SC2033-JUL26-0001' },
    { key: 'Session', label: 'Session', description: 'Academic cycle session name (e.g. July 2026, January 2027)', required: true, example: 'July 2026' },
    { key: 'Enrollment_No', label: 'Enrollment_No', description: '9 or 10-digit IGNOU Student Enrollment Number', required: true, example: '2401928371' },
    { key: 'Candidate_Name', label: 'Candidate_Name', description: 'Full name of candidate as per IGNOU admission registry', required: true, example: 'Pooja Sharma' },
    { key: 'Contact', label: 'Contact', description: '10-digit mobile contact number', required: true, example: '9862123456' },
    { key: 'Email', label: 'Email', description: 'Student email address for e-acknowledgment', required: false, example: 'pooja.sharma@gmail.com' },
    { key: 'Programme', label: 'Programme', description: 'IGNOU Programme Code (e.g. BAG, BCOMG, MEG, BAPCH)', required: true, example: 'BAG' },
    { key: 'Courses', label: 'Courses', description: 'Comma-separated course codes submitted in this intake part', required: true, example: 'BEGC-131, BEGC-132, BSOG-171' },
    { key: 'Practical_Courses', label: 'Practical_Courses', description: 'Comma-separated practical course codes (if any)', required: false, example: 'BPCL-007' },
    { key: 'Assignment_Courses', label: 'Assignment_Courses', description: 'Comma-separated assignment/TMA course codes', required: false, example: 'BEGC-131, BEGC-132' },
    { key: 'Submission_Date', label: 'Submission_Date', description: 'Physical submission date (YYYY-MM-DD)', required: true, example: '2026-07-15' },
    { key: 'Submission_Mode', label: 'Submission_Mode', description: 'In-Person (Desk), Registered Post, Speed Post, Courier', required: false, example: 'In-Person (Desk)' },
    { key: 'Consignment_No', label: 'Consignment_No', description: 'Postal tracking / speed post article barcode if mailed', required: false, example: 'ED123456789IN' },
    { key: 'Official', label: 'Official', description: 'Name or ID of desk counter official receiving scripts', required: true, example: 'Desk Official Counter 1' },
    { key: 'Remarks', label: 'Remarks', description: 'Institutional remarks or notes', required: false, example: 'Walk-in part 1 verified with ID' },
  ],
  sampleRows: [
    {
      Timestamp: '2026-07-15 10:30 AM',
      Token_No: 'SC2033-JUL26-0001',
      Session: 'July 2026',
      Enrollment_No: '2401928371',
      Candidate_Name: 'Pooja Sharma',
      Contact: '9862123456',
      Email: 'pooja.sharma@gmail.com',
      Programme: 'BAG',
      Courses: 'BEGC-131, BEGC-132, BSOG-171',
      Practical_Courses: '',
      Assignment_Courses: 'BEGC-131, BEGC-132, BSOG-171',
      Submission_Date: '2026-07-15',
      Submission_Mode: 'In-Person (Desk)',
      Consignment_No: '',
      Official: 'Desk Official Counter 1',
      Remarks: 'Regular submission verified',
    },
    {
      Timestamp: '2026-07-16 11:15 AM',
      Token_No: 'SC2033-JUL26-0002',
      Session: 'July 2026',
      Enrollment_No: '2301827364',
      Candidate_Name: 'Rohan Verma',
      Contact: '9436123456',
      Email: 'rohan.v@gmail.com',
      Programme: 'BCOMG',
      Courses: 'BCOLA-138, BCOE-141',
      Practical_Courses: '',
      Assignment_Courses: 'BCOLA-138, BCOE-141',
      Submission_Date: '2026-07-16',
      Submission_Mode: 'In-Person (Desk)',
      Consignment_No: '',
      Official: 'Desk Official Counter 1',
      Remarks: 'Verified against re-reg ledger',
    },
  ],
};

export const COURSE_LEDGER_SCHEMA: SheetSchema = {
  id: 'Course_Ledger',
  title: 'Course_Ledger',
  aliases: ['Course_Ledger', 'CourseLedger', '2_Course_Evaluation_Master', 'EvaluationLedger'],
  description: 'Unpacked course-level evaluation ledger where scripts are tracked, allotted to evaluators, and marks are entered.',
  accentColor: '#1e1b4b',
  columns: [
    { key: 'Sub_ID', label: 'Sub_ID', description: 'Unique submission identifier: SUB_ENROLLMENT_COURSE_SESSION', required: true, example: 'SUB_2401928371_BEGC-131_JULY2026' },
    { key: 'Session', label: 'Session', description: 'Academic session cycle', required: true, example: 'July 2026' },
    { key: 'Enrollment_No', label: 'Enrollment_No', description: 'Student Enrollment Number', required: true, example: '2401928371' },
    { key: 'Candidate_Name', label: 'Candidate_Name', description: 'Full student name', required: true, example: 'Pooja Sharma' },
    { key: 'Contact_No', label: 'Contact_No', description: 'Mobile phone number', required: true, example: '9862123456' },
    { key: 'Email_ID', label: 'Email_ID', description: 'Candidate email address', required: false, example: 'pooja.sharma@gmail.com' },
    { key: 'Programme_Code', label: 'Programme_Code', description: 'Academic degree programme code', required: true, example: 'BAG' },
    { key: 'Course_Code', label: 'Course_Code', description: 'Individual course code', required: true, example: 'BEGC-131' },
    { key: 'Component_Type', label: 'Component_Type', description: 'Assignment (TMA) or Practical', required: false, example: 'Assignment' },
    { key: 'Allotted_Evaluator', label: 'Allotted_Evaluator', description: 'Name of academic counsellor allotted this script', required: false, example: 'Dr. Temjen Jamir' },
    { key: 'Evaluator_Code', label: 'Evaluator_Code', description: 'Empanelled Evaluator Code', required: false, example: 'EV-2033-01' },
    { key: 'Marks', label: 'Marks', description: 'Evaluated assignment/practical marks (0-100)', required: false, example: '78' },
    { key: 'Grade', label: 'Grade', description: 'IGNOU 5-point letter grade (A, B, C, D, E)', required: false, example: 'B' },
    { key: 'Status', label: 'Status', description: 'Pending Allotment, Allotted, Evaluated, Marks Locked', required: true, example: 'Pending Allotment' },
    { key: 'Is_Locked', label: 'Is_Locked', description: 'TRUE if marks are finalized and locked by Coordinator', required: false, example: 'FALSE' },
    { key: 'Submission_Date', label: 'Submission_Date', description: 'Original physical receipt date', required: false, example: '2026-07-15' },
    { key: 'Submission_Mode', label: 'Submission_Mode', description: 'Intake channel mode', required: false, example: 'In-Person (Desk)' },
  ],
  sampleRows: [
    {
      Sub_ID: 'SUB_2401928371_BEGC-131_JULY2026',
      Session: 'July 2026',
      Enrollment_No: '2401928371',
      Candidate_Name: 'Pooja Sharma',
      Contact_No: '9862123456',
      Email_ID: 'pooja.sharma@gmail.com',
      Programme_Code: 'BAG',
      Course_Code: 'BEGC-131',
      Component_Type: 'Assignment',
      Allotted_Evaluator: 'Dr. Temjen Jamir',
      Evaluator_Code: 'EV-2033-01',
      Marks: '76',
      Grade: 'B',
      Status: 'Evaluated',
      Is_Locked: 'FALSE',
      Submission_Date: '2026-07-15',
      Submission_Mode: 'In-Person (Desk)',
    },
    {
      Sub_ID: 'SUB_2401928371_BEGC-132_JULY2026',
      Session: 'July 2026',
      Enrollment_No: '2401928371',
      Candidate_Name: 'Pooja Sharma',
      Contact_No: '9862123456',
      Email_ID: 'pooja.sharma@gmail.com',
      Programme_Code: 'BAG',
      Course_Code: 'BEGC-132',
      Component_Type: 'Assignment',
      Allotted_Evaluator: 'Unallotted',
      Evaluator_Code: '',
      Marks: '',
      Grade: '—',
      Status: 'Pending Allotment',
      Is_Locked: 'FALSE',
      Submission_Date: '2026-07-15',
      Submission_Mode: 'In-Person (Desk)',
    },
  ],
};

export const EVALUATORS_MASTER_SCHEMA: SheetSchema = {
  id: 'Evaluators_Master',
  title: 'Evaluators_Master',
  aliases: ['Evaluators_Master', 'EvaluatorsMaster', '3_Evaluators_Directory', 'Evaluators'],
  description: 'Master directory of empanelled academic counsellors with IFSC, bank details, and course specializations.',
  accentColor: '#312e81',
  columns: [
    { key: 'Evaluator_Code', label: 'Evaluator_Code', description: 'Empanelled Evaluator Code', required: true, example: 'EV-2033-01' },
    { key: 'Evaluator_Name', label: 'Evaluator_Name', description: 'Full name and honorific of Academic Counsellor', required: true, example: 'Dr. Temjen Jamir' },
    { key: 'Department', label: 'Department', description: 'Academic discipline / department', required: true, example: 'Department of English' },
    { key: 'Designation', label: 'Designation', description: 'Academic designation / post', required: true, example: 'Associate Professor' },
    { key: 'Phone_Number', label: 'Phone_Number', description: '10-digit mobile phone contact', required: true, example: '9436012345' },
    { key: 'Email_ID', label: 'Email_ID', description: 'Official email address', required: true, example: 't.jamir@sdjain.edu.in' },
    { key: 'Account_Number', label: 'Account_Number', description: 'Bank Savings/Current Account Number for remuneration', required: true, example: '30982341567' },
    { key: 'IFSC_Code', label: 'IFSC_Code', description: '11-character Bank Branch IFSC Code', required: true, example: 'SBIN0000072' },
    { key: 'Bank_Name', label: 'Bank_Name', description: 'Bank name and branch', required: true, example: 'State Bank of India, Dimapur Main' },
    { key: 'PAN_Number', label: 'PAN_Number', description: '10-character Permanent Account Number for TDS / F&AD', required: true, example: 'ABCDE1234F' },
    { key: 'Course_Specialization', label: 'Course_Specialization', description: 'Comma-separated course codes eligible to evaluate', required: true, example: 'BEGC-131, BEGC-132, MEG-01, MEG-02' },
    { key: 'Status', label: 'Status', description: 'Active or Inactive counsellor status', required: false, example: 'Active' },
  ],
  sampleRows: [
    {
      Evaluator_Code: 'EV-2033-01',
      Evaluator_Name: 'Dr. Temjen Jamir',
      Department: 'Department of English',
      Designation: 'Associate Professor',
      Phone_Number: '9436012345',
      Email_ID: 't.jamir@sdjain.edu.in',
      Account_Number: '30982341567',
      IFSC_Code: 'SBIN0000072',
      Bank_Name: 'State Bank of India, Dimapur Main',
      PAN_Number: 'ABCDE1234F',
      Course_Specialization: 'BEGC-131, BEGC-132, MEG-01, MEG-02, MEG-03',
      Status: 'Active',
    },
    {
      Evaluator_Code: 'EV-2033-02',
      Evaluator_Name: 'Mrs. Neeta Agarwal',
      Department: 'Department of Commerce',
      Designation: 'Assistant Professor',
      Phone_Number: '9862145678',
      Email_ID: 'n.agarwal@sdjain.edu.in',
      Account_Number: '91827364512',
      IFSC_Code: 'HDFC0001234',
      Bank_Name: 'HDFC Bank, Circular Road Dimapur',
      PAN_Number: 'FGHIJ5678K',
      Course_Specialization: 'BCOLA-138, BCOE-141, BCOE-142, MCO-01',
      Status: 'Active',
    },
  ],
};

export const FRESH_ADMISSIONS_SCHEMA: SheetSchema = {
  id: 'Fresh_Admissions',
  title: 'Fresh_Admissions',
  aliases: ['Fresh_Admissions', 'FreshAdmissions', 'Fresh_Admission_Master', '1st_Year_Admissions', 'Fresh'],
  description: 'Master registry for 1st-Year student fresh admissions across all academic cycles (Jan 2024 to Jan 2026 and future sessions).',
  accentColor: '#047857',
  columns: [
    { key: 'Enrollment_No', label: 'Enrollment_No', description: '9 or 10-digit IGNOU Student Enrollment Number', required: true, example: '2401102911' },
    { key: 'Student_Name', label: 'Student_Name', description: 'Official full name as registered in IGNOU admission portal', required: true, example: 'Imtikumzuk Ao' },
    { key: 'Programme_Code', label: 'Programme_Code', description: 'Degree programme code (e.g. BAG, BCOMG, MEG, MPS)', required: true, example: 'BAG' },
    { key: 'Registered_Courses', label: 'Registered_Courses', description: 'Comma-separated course codes for 1st Year (Sem 1 & 2)', required: true, example: 'BPSC-131, BPSC-132, BHIC-131, BEGC-131' },
    { key: 'Student_Phone', label: 'Student_Phone', description: '10-digit mobile phone contact', required: false, example: '9436014411' },
    { key: 'Student_Email', label: 'Student_Email', description: 'Student email address for communications', required: false, example: 'imti.ao@example.com' },
    { key: 'Session', label: 'Session', description: 'Admission cycle session (e.g. January 2024, July 2025, July 2026, or any future session)', required: true, example: 'January 2024' },
    { key: 'Admission_Year', label: 'Admission_Year', description: 'Year of fresh admission (e.g. 2024, 2025, 2026)', required: true, example: '2024' },
    { key: 'Academic_Year', label: 'Academic_Year', description: 'Always 1st Year for fresh admissions', required: true, example: '1st Year' },
    { key: 'Semester_No', label: 'Semester_No', description: 'Semester number (1 or 2 for annual/sem cycles)', required: false, example: '1' },
    { key: 'Status', label: 'Status', description: 'Admission verification status (Confirmed / Provisional)', required: true, example: 'Confirmed' },
    { key: 'Fee_Reference', label: 'Fee_Reference', description: 'IGNOU Samarth admission fee payment transaction ID', required: false, example: 'IGN-FEE-2024-2911' },
    { key: 'Remarks', label: 'Remarks', description: 'Regional Centre Kohima verification notes', required: false, example: 'Verified with Samarth ID card' },
  ],
  sampleRows: [
    {
      Enrollment_No: '2401102911',
      Student_Name: 'Imtikumzuk Ao',
      Programme_Code: 'BAG',
      Registered_Courses: 'BPSC-131, BPSC-132, BHIC-131, BEGC-131',
      Student_Phone: '9436014411',
      Student_Email: 'imti.ao@example.com',
      Session: 'January 2024',
      Admission_Year: '2024',
      Academic_Year: '1st Year',
      Semester_No: '1',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-FEE-2024-2911',
      Remarks: 'RC Kohima confirmed cohort',
    },
    {
      Enrollment_No: '2452201010',
      Student_Name: 'Arenla Pongen',
      Programme_Code: 'BAEGH',
      Registered_Courses: 'BEGC-101, BEGC-102, BEGC-103, BEGC-104',
      Student_Phone: '9862010101',
      Student_Email: 'arenla.p@example.com',
      Session: 'July 2024',
      Admission_Year: '2024',
      Academic_Year: '1st Year',
      Semester_No: '1',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-FEE-2024-1010',
      Remarks: 'Regular honours admission',
    },
    {
      Enrollment_No: '2501103030',
      Student_Name: 'Zubeni Kikon',
      Programme_Code: 'BAG',
      Registered_Courses: 'BPSC-131, BPSC-132, BHIC-131, BEGC-131',
      Student_Phone: '9366030301',
      Student_Email: 'zubeni.k@example.com',
      Session: 'January 2025',
      Admission_Year: '2025',
      Academic_Year: '1st Year',
      Semester_No: '1',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-FEE-2025-3030',
      Remarks: 'Identity verified',
    },
    {
      Enrollment_No: '2550184040',
      Student_Name: 'Alongba Chang',
      Programme_Code: 'MPS',
      Registered_Courses: 'MPS-001, MPS-002, MPS-003, MPS-004',
      Student_Phone: '9436084040',
      Student_Email: 'alongba.c@example.com',
      Session: 'July 2025',
      Admission_Year: '2025',
      Academic_Year: '1st Year',
      Semester_No: '1',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-FEE-2025-4040',
      Remarks: 'Master degree 1st year',
    },
    {
      Enrollment_No: '2601928371',
      Student_Name: 'Pooja Sharma',
      Programme_Code: 'BAG',
      Registered_Courses: 'BEGC-131, BEGC-132, BSOG-171, BPSC-131',
      Student_Phone: '9862123456',
      Student_Email: 'pooja.sharma@gmail.com',
      Session: 'January 2026',
      Admission_Year: '2026',
      Academic_Year: '1st Year',
      Semester_No: '1',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-FEE-2026-8371',
      Remarks: 'Current academic cycle',
    },
    {
      Enrollment_No: '2604740340',
      Student_Name: 'Liyani Enie',
      Programme_Code: 'MPS',
      Registered_Courses: 'MPS-001, MPS-002, MPS-003, MPS-004',
      Student_Phone: '9366767694',
      Student_Email: 'liyani.e@example.com',
      Session: 'July 2026',
      Admission_Year: '2026',
      Academic_Year: '1st Year',
      Semester_No: '1',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-FEE-2026-0340',
      Remarks: 'Active intake counter verified',
    },
  ],
};

export const RE_REGISTRATIONS_SCHEMA: SheetSchema = {
  id: 'Re_Registrations',
  title: 'Re_Registrations',
  aliases: ['Re_Registrations', 'ReRegistrations', 'Re_Registration_Master', '2nd_3rd_Year_RR', 'ReReg'],
  description: 'Master registry for 2nd and 3rd Year re-registrations and intermediate semester cycles.',
  accentColor: '#d97706',
  columns: [
    { key: 'Enrollment_No', label: 'Enrollment_No', description: '9 or 10-digit IGNOU Student Enrollment Number', required: true, example: '2301827364' },
    { key: 'Student_Name', label: 'Student_Name', description: 'Full student name matching original admission', required: true, example: 'Rohan Verma' },
    { key: 'Programme_Code', label: 'Programme_Code', description: 'Enrolled degree programme code', required: true, example: 'BCOMG' },
    { key: 'Registered_Courses', label: 'Registered_Courses', description: 'Comma-separated approved course codes for this re-registration cycle', required: true, example: 'BCOLA-138, BCOE-141, BCOE-142' },
    { key: 'Student_Phone', label: 'Student_Phone', description: '10-digit mobile contact number', required: false, example: '9436123456' },
    { key: 'Student_Email', label: 'Student_Email', description: 'Student email address', required: false, example: 'rohan.v@gmail.com' },
    { key: 'Session', label: 'Session', description: 'Re-registration session cycle (e.g. January 2024, July 2025, July 2026, or future sessions)', required: true, example: 'January 2024' },
    { key: 'Academic_Year', label: 'Academic_Year', description: 'Cadre year level (2nd Year or 3rd Year)', required: true, example: '2nd Year' },
    { key: 'Semester_No', label: 'Semester_No', description: 'Semester number (3, 4, 5, or 6)', required: false, example: '3' },
    { key: 'Status', label: 'Status', description: 'Re-registration status (Confirmed / Provisional)', required: true, example: 'Confirmed' },
    { key: 'Fee_Reference', label: 'Fee_Reference', description: 'Re-registration fee transaction confirmation ID', required: false, example: 'IGN-RR-2024-7364' },
    { key: 'Remarks', label: 'Remarks', description: 'Study centre remarks', required: false, example: '2nd Year re-reg verified' },
  ],
  sampleRows: [
    {
      Enrollment_No: '2301827364',
      Student_Name: 'Rohan Verma',
      Programme_Code: 'BCOMG',
      Registered_Courses: 'BCOLA-138, BCOE-141, BCOE-142',
      Student_Phone: '9436123456',
      Student_Email: 'rohan.v@gmail.com',
      Session: 'January 2024',
      Academic_Year: '2nd Year',
      Semester_No: '3',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-RR-2024-7364',
      Remarks: '2nd Year Re-Reg verified',
    },
    {
      Enrollment_No: '2201830549',
      Student_Name: 'S. Lamtang Phon',
      Programme_Code: 'BAG',
      Registered_Courses: 'BEGS-185, BEGS-156, BHIE-143, BHIE-144, BEGE-142',
      Student_Phone: '6200191237',
      Student_Email: 'lamtang.p@example.com',
      Session: 'July 2024',
      Academic_Year: '3rd Year',
      Semester_No: '5',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-RR-2024-0549',
      Remarks: 'Final 3rd Year Re-Reg',
    },
    {
      Enrollment_No: '2401102911',
      Student_Name: 'Imtikumzuk Ao',
      Programme_Code: 'BAG',
      Registered_Courses: 'BPSC-133, BPSC-134, BHIC-132',
      Student_Phone: '9436014411',
      Student_Email: 'imti.ao@example.com',
      Session: 'January 2025',
      Academic_Year: '2nd Year',
      Semester_No: '3',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-RR-2025-2911',
      Remarks: 'Progressed from Jan 2024 fresh admission',
    },
    {
      Enrollment_No: '2452201010',
      Student_Name: 'Arenla Pongen',
      Programme_Code: 'BAEGH',
      Registered_Courses: 'BEGC-105, BEGC-106, BEGC-107, BEGC-108',
      Student_Phone: '9862010101',
      Student_Email: 'arenla.p@example.com',
      Session: 'July 2025',
      Academic_Year: '2nd Year',
      Semester_No: '3',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-RR-2025-1010',
      Remarks: '2nd Year honours re-registration',
    },
    {
      Enrollment_No: '2501103030',
      Student_Name: 'Zubeni Kikon',
      Programme_Code: 'BAG',
      Registered_Courses: 'BPSC-133, BPSC-134, BHIC-132',
      Student_Phone: '9366030301',
      Student_Email: 'zubeni.k@example.com',
      Session: 'January 2026',
      Academic_Year: '2nd Year',
      Semester_No: '3',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-RR-2026-3030',
      Remarks: 'Progressed from Jan 2025 cohort',
    },
    {
      Enrollment_No: '2550752120',
      Student_Name: 'Sajida Sultana Siddiquey',
      Programme_Code: 'MCOM',
      Registered_Courses: 'MCO-03, MCO-07, MCO-15, IBO-02',
      Student_Phone: '9362636574',
      Student_Email: 'sajida.s@example.com',
      Session: 'July 2026',
      Academic_Year: '2nd Year',
      Semester_No: '3',
      Status: 'Confirmed',
      Fee_Reference: 'IGN-RR-2026-2120',
      Remarks: 'Master final year re-registration',
    },
  ],
};

export const STUDENT_REGISTRATIONS_SCHEMA: SheetSchema = {
  id: 'Student_Registrations',
  title: 'Student_Registrations',
  aliases: ['Student_Registrations', 'StudentRegistrations', 'Fresh_Admissions', 'Re_Registrations', 'Admissions_Master'],
  description: 'Unified student admissions and re-registration registry (legacy single-tab format).',
  accentColor: '#047857',
  columns: [
    { key: 'Enrollment_No', label: 'Enrollment_No', description: '9 or 10-digit IGNOU Enrollment Number', required: true, example: '2401928371' },
    { key: 'Student_Name', label: 'Student_Name', description: 'Student official full name', required: true, example: 'Pooja Sharma' },
    { key: 'Programme_Code', label: 'Programme_Code', description: 'Enrolled Degree Programme Code', required: true, example: 'BAG' },
    { key: 'Registered_Courses', label: 'Registered_Courses', description: 'Comma-separated list of approved courses for this session', required: true, example: 'BEGC-131, BEGC-132, BSOG-171, BPSC-131' },
    { key: 'Student_Phone', label: 'Student_Phone', description: 'Registered mobile number', required: false, example: '9862123456' },
    { key: 'Student_Email', label: 'Student_Email', description: 'Registered email address', required: false, example: 'pooja.sharma@gmail.com' },
    { key: 'Session', label: 'Session', description: 'Registration academic cycle session', required: true, example: 'July 2026' },
    { key: 'Admission_Year', label: 'Admission_Year', description: 'Year of admission (e.g. 2024, 2025, 2026)', required: false, example: '2026' },
    { key: 'Registration_Type', label: 'Registration_Type', description: 'Fresh (1st Year) or Re-Registration (2nd/3rd Year)', required: true, example: 'Fresh' },
    { key: 'Status', label: 'Status', description: 'Active or Completed', required: false, example: 'Active' },
  ],
  sampleRows: [
    ...FRESH_ADMISSIONS_SCHEMA.sampleRows.slice(0, 3).map((r) => ({
      Enrollment_No: r.Enrollment_No,
      Student_Name: r.Student_Name,
      Programme_Code: r.Programme_Code,
      Registered_Courses: r.Registered_Courses,
      Student_Phone: r.Student_Phone,
      Student_Email: r.Student_Email,
      Session: r.Session,
      Admission_Year: r.Admission_Year,
      Registration_Type: 'Fresh',
      Status: r.Status,
    })),
    ...RE_REGISTRATIONS_SCHEMA.sampleRows.slice(0, 3).map((r) => ({
      Enrollment_No: r.Enrollment_No,
      Student_Name: r.Student_Name,
      Programme_Code: r.Programme_Code,
      Registered_Courses: r.Registered_Courses,
      Student_Phone: r.Student_Phone,
      Student_Email: r.Student_Email,
      Session: r.Session,
      Admission_Year: '2024',
      Registration_Type: 'Re-Registration',
      Status: r.Status,
    })),
  ],
};

export const ALL_SCHEMAS: SheetSchema[] = [
  INTAKE_REGISTER_SCHEMA,
  COURSE_LEDGER_SCHEMA,
  EVALUATORS_MASTER_SCHEMA,
  FRESH_ADMISSIONS_SCHEMA,
  RE_REGISTRATIONS_SCHEMA,
];

/**
 * Generates CSV string for a given SheetSchema
 */
export function generateCsvForSchema(schema: SheetSchema, includeSampleData: boolean = true): string {
  const headers = schema.columns.map((col) => `"${col.key}"`).join(',');
  if (!includeSampleData || !schema.sampleRows || schema.sampleRows.length === 0) {
    return headers;
  }

  const rows = schema.sampleRows.map((row) => {
    return schema.columns
      .map((col) => {
        const val = row[col.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Triggers instant browser download of a CSV template
 */
export function downloadCsvTemplate(
  schema: SheetSchema,
  sessionName: string = 'July 2026',
  includeSampleData: boolean = true
): void {
  const csvContent = generateCsvForSchema(schema, includeSampleData);
  const cleanSession = sessionName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `IGNOU_SC2033_${schema.title}_${cleanSession}_Template.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads all 5 schema CSVs sequentially
 */
export function downloadAllTemplates(sessionName: string = 'July 2026'): void {
  ALL_SCHEMAS.forEach((schema, idx) => {
    setTimeout(() => {
      downloadCsvTemplate(schema, sessionName, true);
    }, idx * 250);
  });
}

/**
 * Generates tailored Google Apps Script code for multi-session operations,
 * separate Fresh Admissions & Re-Registrations tabs, and dynamic future session discovery.
 */
export function generateTailoredAppsScript(sessionName: string = 'July 2026'): string {
  return `/**
 * =========================================================================
 * IGNOU STUDY CENTRE SC-2033 | S.D. JAIN GIRLS' COLLEGE, DIMAPUR
 * Universal Multi-Session Operations & Admissions Cloud Engine
 * Academic Session: ${sessionName} (with auto-discovery of all historical & future sessions)
 * =========================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Spreadsheet (with Intake_Register, Course_Ledger, Evaluators_Master,
 *    Fresh_Admissions, and Re_Registrations tabs).
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any code in Code.gs and paste this entire script.
 * 4. Click 'Save' (Floppy icon).
 * 5. Click 'Deploy' -> 'New deployment'.
 * 6. Select type: 'Web app'.
 * 7. Description: 'IGNOU SC-2033 Multi-Session DB API'.
 * 8. Execute as: 'Me (your email)'.
 * 9. Who has access: 'Anyone' (Required for the web app to read and write records).
 * 10. Click 'Deploy', authorize permissions, and copy the Web App URL (ends in /exec).
 *
 * NOTE ON FUTURE SESSIONS:
 * To add any new academic session in the future (e.g. January 2027, July 2027, January 2028),
 * you DO NOT need to touch this code! Simply enter rows with the new session name into your
 * Fresh_Admissions, Re_Registrations, or Intake_Register tabs. This engine automatically
 * scans and includes all unique sessions in 'availableSessions'.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    status: "success",
    timestamp: new Date().toISOString(),
    session: "${sessionName}",
    studyCentre: "SC-2033",
    intakes: [],
    courseLedger: [],
    evaluatorsMaster: [],
    freshAdmissions: [],
    reRegistrations: [],
    studentRegistrations: [],
    availableSheets: [],
    availableSessions: []
  };

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    result.availableSheets.push(sheets[i].getName());
  }

  // 1. Fetch Intake Register
  var intakeSheet = findSheetByAliases(ss, ["Intake_Register", "IntakeRegister", "1_Assignment_Intake_Register", "Intakes"]);
  if (intakeSheet) {
    result.intakes = getSheetDataAsObjects(intakeSheet);
  }

  // 2. Fetch Course Ledger
  var ledgerSheet = findSheetByAliases(ss, ["Course_Ledger", "CourseLedger", "2_Course_Evaluation_Master", "Ledger"]);
  if (ledgerSheet) {
    result.courseLedger = getSheetDataAsObjects(ledgerSheet);
  }

  // 3. Fetch Evaluators Master
  var evalSheet = findSheetByAliases(ss, ["Evaluators_Master", "EvaluatorsMaster", "3_Evaluators_Directory", "Evaluators"]);
  if (evalSheet) {
    result.evaluatorsMaster = getSheetDataAsObjects(evalSheet);
  }

  // 4. Fetch Fresh Admissions (1st Year)
  var freshSheet = findSheetByAliases(ss, ["Fresh_Admissions", "FreshAdmissions", "Fresh_Admission_Master", "Fresh"]);
  if (freshSheet) {
    result.freshAdmissions = getSheetDataAsObjects(freshSheet);
  }

  // 5. Fetch Re-Registrations (2nd/3rd Year)
  var reRegSheet = findSheetByAliases(ss, ["Re_Registrations", "ReRegistrations", "Re_Registration_Master", "ReReg"]);
  if (reRegSheet) {
    result.reRegistrations = getSheetDataAsObjects(reRegSheet);
  }

  // 6. Fetch unified legacy Student_Registrations if separate tabs aren't present
  var legacyRegSheet = findSheetByAliases(ss, ["Student_Registrations", "StudentRegistrations", "Admissions_Master"]);
  if (legacyRegSheet && result.freshAdmissions.length === 0 && result.reRegistrations.length === 0) {
    result.studentRegistrations = getSheetDataAsObjects(legacyRegSheet);
  } else {
    result.studentRegistrations = [].concat(result.freshAdmissions, result.reRegistrations);
  }

  // 7. Dynamic Session Discovery: Scan all rows across all sheets for session labels
  var sessionMap = {};
  // Baseline sessions
  var baseline = ["January 2024", "July 2024", "January 2025", "July 2025", "January 2026", "July 2026", "January 2027", "July 2027", "${sessionName}"];
  for (var b = 0; b < baseline.length; b++) {
    if (baseline[b]) sessionMap[baseline[b].trim()] = true;
  }

  var allRecordSets = [result.freshAdmissions, result.reRegistrations, result.studentRegistrations, result.intakes, result.courseLedger];
  for (var sIdx = 0; sIdx < allRecordSets.length; sIdx++) {
    var set = allRecordSets[sIdx];
    if (Array.isArray(set)) {
      for (var r = 0; r < set.length; r++) {
        var sessVal = set[r].Session || set[r].session;
        if (sessVal && String(sessVal).trim()) {
          sessionMap[String(sessVal).trim()] = true;
        }
      }
    }
  }
  result.availableSessions = Object.keys(sessionMap);

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid JSON: " + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var action = payload.action || "PING";

  // Diagnostic Ping / Test Connection
  if (action === "PING") {
    var sheetNames = [];
    var sheets = ss.getSheets();
    for (var s = 0; s < sheets.length; s++) {
      sheetNames.push(sheets[s].getName());
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      reachable: true,
      action: "PING",
      session: "${sessionName}",
      sheets: sheetNames,
      spreadsheetName: ss.getName(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Record Intake & Auto-Unpack Course Ledger
  if (action === "ADD_INTAKE" || action === "RECORD_INTAKE") {
    var item = payload.intake || payload.record || payload;
    var intakeSheet = getOrCreateSheet(ss, "Intake_Register", [
      "Timestamp", "Token_No", "Session", "Enrollment_No", "Candidate_Name", "Contact", "Email", "Programme", "Courses", "Official"
    ]);

    var enrollment = String(item.enrollmentNo || "").trim();
    var candidate = String(item.candidateName || "").trim();
    var contact = String(item.contact || "").trim();
    var prog = String(item.programme || "").trim().toUpperCase();
    var session = String(item.session || "${sessionName}").trim();
    var tokenNo = String(item.tokenNo || "").trim();
    var official = String(item.handledBy || "Desk Official").trim();
    var timestamp = item.submissionDate || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    var courses = Array.isArray(item.courses) ? item.courses.join(", ") : String(item.courses || "");

    intakeSheet.appendRow([
      timestamp, tokenNo, session, "'" + enrollment, candidate, contact, item.email || "", prog, courses, official
    ]);

    // Unpack Course Ledger
    var ledgerSheet = getOrCreateSheet(ss, "Course_Ledger", [
      "Sub_ID", "Session", "Enrollment_No", "Candidate_Name", "Contact_No", "Programme_Code", "Course_Code", "Allotted_Evaluator", "Marks", "Grade", "Status"
    ]);

    var rawCourses = Array.isArray(item.courses) ? item.courses : courses.split(",");
    for (var c = 0; c < rawCourses.length; c++) {
      var courseCode = String(rawCourses[c]).trim().toUpperCase();
      if (!courseCode) continue;
      var subId = "SUB_" + enrollment + "_" + courseCode.replace(/[^a-zA-Z0-9]/g, "") + "_" + session.replace(/\\s+/g, "").toUpperCase();
      ledgerSheet.appendRow([
        subId, session, "'" + enrollment, candidate, contact, prog, courseCode, "Unallotted", "", "—", "Pending Allotment"
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: action,
      tokenNo: tokenNo,
      message: "Intake record added and course scripts unpacked."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Update Marks or Allot Evaluator
  if (action === "UPDATE_MARKS" || action === "ALLOT_EVALUATOR") {
    var ledger = findSheetByAliases(ss, ["Course_Ledger", "CourseLedger"]);
    if (ledger) {
      var data = ledger.getDataRange().getValues();
      var targetSubId = String(payload.subId || "").trim();
      var targetEnr = String(payload.enrollmentNo || "").replace(/^'/, '').trim();
      var targetCourse = String(payload.courseCode || "").trim().toUpperCase();

      for (var row = 1; row < data.length; row++) {
        var rowSubId = String(data[row][0] || "").trim();
        var rowEnr = String(data[row][2] || "").replace(/^'/, '').trim();
        var rowCourse = String(data[row][6] || data[row][7] || "").trim().toUpperCase();

        if ((targetSubId && rowSubId === targetSubId) || (targetEnr && targetCourse && rowEnr === targetEnr && rowCourse === targetCourse)) {
          if (action === "UPDATE_MARKS") {
            ledger.getRange(row + 1, 9).setValue(payload.marks !== undefined ? payload.marks : "");
            ledger.getRange(row + 1, 10).setValue(payload.grade || "");
            ledger.getRange(row + 1, 11).setValue("Marks Locked");
          } else if (action === "ALLOT_EVALUATOR") {
            ledger.getRange(row + 1, 8).setValue(payload.evaluator || "Allotted");
            ledger.getRange(row + 1, 11).setValue("Allotted");
          }
          break;
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Add / Sync Student Admission (Fresh vs Re-Registration)
  if (action === "ADD_REGISTRATION" || action === "SYNC_ADMISSIONS") {
    var reg = payload.registration || payload.record || payload;
    var cadre = String(reg.cadre || reg.Registration_Type || "").toUpperCase();
    var isFresh = cadre.indexOf("FRESH") !== -1 || cadre.indexOf("1ST") !== -1;

    var targetSheetName = isFresh ? "Fresh_Admissions" : "Re_Registrations";
    var headers = isFresh
      ? ["Enrollment_No", "Student_Name", "Programme_Code", "Registered_Courses", "Student_Phone", "Student_Email", "Session", "Admission_Year", "Academic_Year", "Semester_No", "Status", "Fee_Reference", "Remarks"]
      : ["Enrollment_No", "Student_Name", "Programme_Code", "Registered_Courses", "Student_Phone", "Student_Email", "Session", "Academic_Year", "Semester_No", "Status", "Fee_Reference", "Remarks"];

    var targetSheet = getOrCreateSheet(ss, targetSheetName, headers);
    var regEnr = "'" + String(reg.enrollmentNo || reg.Enrollment_No || "").trim();
    var regName = String(reg.studentName || reg.Student_Name || "").trim();
    var regProg = String(reg.programmeCode || reg.Programme_Code || "").trim().toUpperCase();
    var regCourses = Array.isArray(reg.courseCodes) ? reg.courseCodes.join(", ") : String(reg.registeredCourses || reg.Registered_Courses || "");
    var regPhone = String(reg.studentPhone || reg.Student_Phone || "").trim();
    var regEmail = String(reg.studentEmail || reg.Student_Email || "").trim();
    var regSess = String(reg.session || reg.Session || "${sessionName}").trim();
    var regYear = String(reg.academicYear || reg.Academic_Year || (isFresh ? "1st Year" : "2nd Year")).trim();
    var regSem = String(reg.semesterNo || reg.Semester_No || "").trim();
    var regStatus = String(reg.status || reg.Status || "Confirmed").trim();
    var regFee = String(reg.feeReference || reg.Fee_Reference || "").trim();
    var regRemarks = String(reg.remarks || reg.Remarks || "").trim();

    if (isFresh) {
      var admYear = String(reg.admissionYear || reg.Admission_Year || regSess.replace(/[^0-9]/g, "") || "2024").trim();
      targetSheet.appendRow([regEnr, regName, regProg, regCourses, regPhone, regEmail, regSess, admYear, regYear, regSem, regStatus, regFee, regRemarks]);
    } else {
      targetSheet.appendRow([regEnr, regName, regProg, regCourses, regPhone, regEmail, regSess, regYear, regSem, regStatus, regFee, regRemarks]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action, sheet: targetSheetName }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper utilities
function findSheetByAliases(ss, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var sheet = ss.getSheetByName(aliases[i]);
    if (sheet) return sheet;
  }
  return null;
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#1e1b4b").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheetDataAsObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      var key = String(headers[h]).trim();
      if (key) obj[key] = data[i][h];
    }
    rows.push(obj);
  }
  return rows;
}
`;
}
