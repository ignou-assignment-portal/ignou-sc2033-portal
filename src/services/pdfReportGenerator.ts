import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IntakeRecord } from '../types';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';
import { formatDate } from '../utils/helpers';

export interface PDFReportOptions {
  studyCentreName?: string;
  studyCentreCode?: string;
  regionalCentre?: string;
  reportRef?: string;
  preparedBy?: string;
  programmeFilter?: string | null;
}

/**
 * Compiles all student intake data for the current session into a high-fidelity
 * downloadable PDF summary report based on official IGNOU Study Centre statutory standards.
 */
export function generateStudentIntakePDF(
  sessionName: string,
  records: IntakeRecord[],
  options: PDFReportOptions = {}
): jsPDF {
  const {
    studyCentreName = "S.D. Jain Girls' College, Dimapur",
    studyCentreCode = 'SC-2033',
    regionalCentre = 'Regional Centre Kohima (RC-20)',
    reportRef,
    preparedBy = 'Intake Desk Official',
    programmeFilter,
  } = options;

  // Filter records if programme filter applied
  const filteredRecords = programmeFilter
    ? records.filter((r) => {
        const prog = (r.programmeCode || (r as any).Programme || '').trim().toUpperCase();
        return prog === programmeFilter.trim().toUpperCase();
      })
    : records;

  // Sort records: by submission date descending, then tokenNo
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const dateA = a.submissionDate || '';
    const dateB = b.submissionDate || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.tokenNo || '').localeCompare(b.tokenNo || '');
  });

  // Calculate metrics
  const totalIntakes = sortedRecords.length;
  const uniqueEnrollments = new Set(
    sortedRecords.map((r) => (r.enrollmentNo || (r as any).Enrollment_No || '').trim())
  ).size;
  const totalScripts = sortedRecords.reduce((sum, r) => {
    const courses = r.courseCodes || (r as any).Courses || [];
    return sum + (Array.isArray(courses) ? courses.length : String(courses).split(',').length);
  }, 0);

  // Group by Programme for summary table
  const progMap = new Map<
    string,
    { title: string; intakes: number; students: Set<string>; scripts: number }
  >();

  sortedRecords.forEach((r) => {
    const pCode = (r.programmeCode || (r as any).Programme || 'UNKNOWN').trim().toUpperCase();
    if (!progMap.has(pCode)) {
      const match = IGNOU_PROGRAMMES.find((p) => p.code.toUpperCase() === pCode);
      progMap.set(pCode, {
        title: match ? match.name : `${pCode} Programme`,
        intakes: 0,
        students: new Set<string>(),
        scripts: 0,
      });
    }
    const item = progMap.get(pCode)!;
    item.intakes += 1;
    const enr = (r.enrollmentNo || (r as any).Enrollment_No || '').trim();
    if (enr) item.students.add(enr);
    const courses = r.courseCodes || (r as any).Courses || [];
    item.scripts += Array.isArray(courses) ? courses.length : String(courses).split(',').length;
  });

  const cleanSessionSlug = sessionName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const refNo = reportRef || `SC2033/ASGN-REP/${cleanSessionSlug || '2026'}/${new Date().getFullYear()}`;
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Create Document (Portrait, A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Bar (Deep Navy Accent)
  doc.setFillColor(30, 27, 75); // #1E1B4B
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Institution Branding in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INDIRA GANDHI NATIONAL OPEN UNIVERSITY (IGNOU)', margin, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Study Centre ${studyCentreCode} • ${studyCentreName} • ${regionalCentre}`,
    margin,
    16
  );

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(254, 240, 138); // Yellow accent
  doc.text(
    `STUDENT INTAKE & ASSIGNMENT SUBMISSION SUMMARY REPORT — ${sessionName.toUpperCase()}`,
    margin,
    23
  );

  // Metadata Bar below header
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reference No: ${refNo}`, margin, 34);
  doc.text(`Generated On: ${generatedAt}`, pageWidth - margin - 45, 34);

  // Executive Metrics Summary Box
  const summaryBoxY = 38;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, summaryBoxY, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const colWidth = (pageWidth - margin * 2) / 4;
  const metrics = [
    { label: 'TOTAL INTAKES', value: String(totalIntakes) },
    { label: 'UNIQUE CANDIDATES', value: String(uniqueEnrollments) },
    { label: 'ASSIGNMENT SCRIPTS', value: String(totalScripts) },
    { label: 'ACTIVE PROGRAMMES', value: String(progMap.size) },
  ];

  metrics.forEach((m, idx) => {
    const xPos = margin + idx * colWidth + 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(m.label, xPos, summaryBoxY + 6);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(m.value, xPos, summaryBoxY + 13);
  });

  let currentY = summaryBoxY + 23;

  // SECTION 1: Programme-wise Summary Table
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text('1. Programme-wise Assignment Intake Distribution', margin, currentY);

  const progTableData = Array.from(progMap.entries()).map(([code, pData], idx) => {
    const share = totalIntakes > 0 ? ((pData.intakes / totalIntakes) * 100).toFixed(1) + '%' : '0%';
    return [
      String(idx + 1),
      code,
      pData.title,
      String(pData.intakes),
      String(pData.students.size),
      String(pData.scripts),
      share,
    ];
  });

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: margin, right: margin },
    head: [['#', 'Prog Code', 'Programme Name', 'Intakes', 'Candidates', 'Scripts', 'Share']],
    body: progTableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [49, 46, 129], // Indigo 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // SECTION 2: Complete Student Intake Master Roster
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text('2. Comprehensive Student Intake Master Roster', margin, currentY);

  const studentTableData = sortedRecords.map((r, idx) => {
    const rawCourses = r.courseCodes || (r as any).Courses || [];
    const coursesArr = Array.isArray(rawCourses)
      ? rawCourses
      : String(rawCourses).split(',').map((c) => c.trim());
    const coursesStr = coursesArr.join(', ');
    const token = r.tokenNo || r.receiptNumber || r.id || '-';
    const enr = r.enrollmentNo || (r as any).Enrollment_No || '-';
    const name = r.studentName || (r as any).Candidate_Name || '-';
    const prog = r.programmeCode || (r as any).Programme || '-';
    const date = r.submissionDate ? formatDate(r.submissionDate) : '-';
    const mode = r.submissionMode || 'In-Person';
    const status = r.status || 'Received';

    return [
      String(idx + 1),
      token,
      enr,
      name,
      prog,
      `${coursesStr} (${coursesArr.length})`,
      mode,
      date,
      status,
    ];
  });

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: margin, right: margin },
    head: [['#', 'Receipt/Token', 'Enrollment No', 'Candidate Name', 'Prog', 'Registered Courses (Count)', 'Mode', 'Date', 'Status']],
    body: studentTableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 14, fontStyle: 'bold', halign: 'center' },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 20, fontSize: 6.5 },
      7: { cellWidth: 18, fontSize: 6.5, halign: 'center' },
      8: { cellWidth: 16, fontSize: 6.5, halign: 'center' },
    },
  });

  // Institutional Sign-off Block on the last page
  let finalY = (doc as any).lastAutoTable.finalY + 12;

  // If there's not enough room on the current page for the signature block, add a new page
  if (finalY > doc.internal.pageSize.getHeight() - 35) {
    doc.addPage();
    finalY = 25;
  }

  // Certification Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Certification: Certified that all assignment intake entries detailed above have been physically verified against',
    margin,
    finalY
  );
  doc.text(
    'authentic TMA/CMA scripts deposited at the Assignment Intake Counter of IGNOU Study Centre 2033.',
    margin,
    finalY + 4
  );

  // Signatures Row
  finalY += 16;
  const sigColWidth = (pageWidth - margin * 2) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Signature 1: Counter Official
  doc.line(margin, finalY, margin + sigColWidth - 10, finalY);
  doc.text(`Compiled by: ${preparedBy}`, margin, finalY + 4);
  doc.text('Intake Counter Official (SC-2033)', margin, finalY + 8);

  // Signature 2: Assistant Coordinator
  doc.line(margin + sigColWidth, finalY, margin + sigColWidth * 2 - 10, finalY);
  doc.text('Verified by: Asst. Coordinator', margin + sigColWidth, finalY + 4);
  doc.text('Records & Evaluations Desk', margin + sigColWidth, finalY + 8);

  // Signature 3: Centre Coordinator
  doc.line(margin + sigColWidth * 2, finalY, margin + sigColWidth * 3 - 5, finalY);
  doc.text('Approved by: Centre Coordinator', margin + sigColWidth * 2, finalY + 4);
  doc.text(`Officer-in-Charge, ${studyCentreCode}`, margin + sigColWidth * 2, finalY + 8);

  // Add Page Numbers & Confidentiality in Footer to All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `IGNOU Study Centre ${studyCentreCode} • Session ${sessionName} Intake Summary • Confidential Official Record`,
      margin,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 18,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  return doc;
}

/**
 * Convenience method to generate and automatically trigger browser download
 * of the compiled session PDF report.
 */
export function downloadStudentIntakePDF(
  sessionName: string,
  records: IntakeRecord[],
  options: PDFReportOptions = {}
): void {
  const doc = generateStudentIntakePDF(sessionName, records, options);
  const cleanSession = sessionName.replace(/\s+/g, '_').toLowerCase();
  const filename = `IGNOU_SC2033_Intake_Summary_${cleanSession}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
