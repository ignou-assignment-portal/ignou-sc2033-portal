import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IntakeRecord, CoursePacket, Evaluator, ScriptEntry } from '../types';
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

export interface PacketSlipPDFOptions {
  studyCentreName?: string;
  studyCentreCode?: string;
  regionalCentre?: string;
  coordinatorName?: string;
  courseTitle?: string;
  reportRef?: string;
}

/**
 * Generates an official IGNOU Evaluation Packet Dispatch Memo & Docket Slip in A4 portrait PDF format.
 * Includes complete institutional header, docket metadata, evaluator details, itemized candidate scripts table with marks box,
 * statutory guidelines, and tri-signature blocks.
 */
export function generatePacketDispatchSlipPDF(
  packet: CoursePacket,
  evaluator: Evaluator | null,
  scripts: ScriptEntry[],
  options: PacketSlipPDFOptions = {}
): jsPDF {
  const {
    studyCentreName = "S.D. Jain Girls' College, Dimapur - 797112, Nagaland",
    studyCentreCode = 'SC-2033',
    regionalCentre = 'RC-20 Kohima',
    coordinatorName = 'Dr. Sant K. Gupta',
    courseTitle = '',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableWidth = pageWidth - margin * 2; // 186mm

  let currentY = 14;

  // 1. INSTITUTIONAL HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('INDIRA GANDHI NATIONAL OPEN UNIVERSITY', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5.5;
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(`IGNOU STUDY CENTRE ${studyCentreCode}`, pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(studyCentreName, pageWidth / 2, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Regional Centre: ${regionalCentre}  •  Academic Session: ${packet.session}`, pageWidth / 2, currentY, { align: 'center' });

  // 2. DOCKET TITLE BANNER
  currentY += 5;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, usableWidth, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EVALUATION PACKET DISPATCH MEMO & ENVELOPE DOCKET SLIP', pageWidth / 2, currentY + 4.8, { align: 'center' });

  currentY += 10;

  // 3. METADATA GRID BOX (4 Columns x 2 Rows)
  const metaBoxHeight = 25;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, usableWidth, metaBoxHeight, 1.5, 1.5, 'FD');

  const col1 = margin + 3;
  const col2 = margin + 49;
  const col3 = margin + 98;
  const col4 = margin + 144;

  const row1Y = currentY + 4.5;
  const row2Y = currentY + 9.5;
  const row3Y = currentY + 15.5;
  const row4Y = currentY + 20.5;

  // Labels Row 1
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PACKET DOCKET NO.', col1, row1Y);
  doc.text('COURSE CODE', col2, row1Y);
  doc.text('PROGRAMME', col3, row1Y);
  doc.text('TOTAL ENCLOSED SCRIPTS', col4, row1Y);

  // Values Row 1
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(packet.packetNumber || '-', col1, row2Y);
  const displayCourse = courseTitle ? `${packet.courseCode} (${courseTitle.slice(0, 16)})` : packet.courseCode;
  doc.text(displayCourse, col2, row2Y);
  doc.text(packet.programmeCode || '-', col3, row2Y);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(`${packet.scriptCount} Physical Scripts`, col4, row2Y);

  // Labels Row 2
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPATCH DATE', col1, row3Y);
  doc.text('EXPECTED RETURN DATE', col2, row3Y);
  doc.text('PACKET STATUS', col3, row3Y);
  doc.text('DISPATCH MODE / NOTES', col4, row3Y);

  // Values Row 2
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  const dispatchDate = packet.assignedDate ? formatDate(packet.assignedDate) : formatDate(new Date().toISOString());
  const returnDate = packet.expectedReturnDate ? formatDate(packet.expectedReturnDate) : 'Within 15 Days';
  doc.text(dispatchDate, col1, row4Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text(returnDate, col2, row4Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(packet.status, col3, row4Y);
  doc.text((packet.notes || 'Cloth / Sealed Envelope').slice(0, 24), col4, row4Y);

  currentY += metaBoxHeight + 3.5;

  // 4. EVALUATOR PROFILE BOX
  const evalBoxHeight = 15;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, usableWidth, evalBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ALLOTTED ACADEMIC COUNSELLOR / EVALUATOR DETAILS', col1, currentY + 3.5);
  if (evaluator) {
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.text(`Code: ${evaluator.evaluatorCode}`, margin + usableWidth - 3, currentY + 3.5, { align: 'right' });
  }

  if (evaluator) {
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Name: ${evaluator.name}`, col1, currentY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Designation: ${evaluator.designation || 'Academic Counsellor'}, ${evaluator.collegeInstitution || "S.D. Jain Girls' College"}`, col1, currentY + 12);
    doc.text(`Phone: ${evaluator.contactPhone || '-'}  •  Email: ${evaluator.email || '-'}`, col3, currentY + 8);
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('No evaluator currently assigned. Packet formed for internal examination records and subsequent allotment.', col1, currentY + 9);
  }

  currentY += evalBoxHeight + 4;

  // 5. ITEMIZED SCRIPTS TABLE (with Marks Box & Evaluator Remarks)
  const tableData = scripts.length > 0
    ? scripts.map((s, idx) => [
        String(idx + 1),
        s.enrollmentNo || '-',
        s.studentName || '-',
        s.tokenNo || '-',
        s.submissionDate ? formatDate(s.submissionDate) : '-',
        s.marks !== null && s.marks !== undefined ? String(s.marks) : '',
        '',
      ])
    : [[
        '1',
        '-',
        `Standard Packet Allocation (${packet.scriptCount} Scripts)`,
        '-',
        dispatchDate,
        '',
        '',
      ]];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Enrollment No.', 'Candidate Name', 'Intake Token / Receipt', 'Receipt Date', 'Marks (100)', 'Evaluator Remarks']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold', halign: 'left' },
      2: { cellWidth: 50, halign: 'left' },
      3: { cellWidth: 32, halign: 'left' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 22, halign: 'center', fillColor: [254, 252, 232] }, // amber-50
      6: { cellWidth: 22, halign: 'left' },
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 5;

  // Check if remaining space on current page is enough for Guidelines + Signatures (~42mm)
  if (finalY + 45 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 5;
  }

  // 6. GUIDELINES BOX
  const guidelinesBoxHeight = 17;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, finalY, usableWidth, guidelinesBoxHeight, 1, 1, 'FD');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('STATUTORY GUIDELINES FOR ACADEMIC COUNSELLOR / EVALUATOR:', margin + 3, finalY + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`1. Verify enclosed physical scripts match docket count (${packet.scriptCount} scripts). Report any discrepancy immediately.`, margin + 3, finalY + 7.2);
  doc.text('2. Evaluate strictly in accordance with IGNOU scheme & marking keys using red ink.', margin + 3, finalY + 10.5);
  doc.text(`3. Record marks on script cover & SED award list. Return to Study Centre on or before ${returnDate}.`, margin + 3, finalY + 13.8);

  finalY += guidelinesBoxHeight + 8;

  // Check if remaining space is enough for Signatures (~24mm)
  if (finalY + 25 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 12;
  }

  // 7. TRI-SIGNATURE STATUTORY BLOCKS
  const sigColWidth = usableWidth / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  // Signature 1: Study Centre Official
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, finalY + 10, margin + sigColWidth - 10, finalY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Study Centre Official', margin + 4, finalY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text('Packet Handover & Dispatch', margin + 4, finalY + 17.5);
  doc.text(`Date: ${dispatchDate}`, margin + 4, finalY + 21);

  // Signature 2: Evaluator / Counsellor
  const sig2X = margin + sigColWidth + 4;
  doc.line(sig2X, finalY + 10, sig2X + sigColWidth - 14, finalY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(evaluator ? evaluator.name : 'Academic Counsellor', sig2X, finalY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature & Receipt Acknowledged', sig2X, finalY + 17.5);
  doc.text(`Contact: ${evaluator?.contactPhone || '—'}`, sig2X, finalY + 21);

  // Signature 3: Centre Coordinator
  const sig3X = margin + sigColWidth * 2 + 4;
  doc.line(sig3X, finalY + 10, sig3X + sigColWidth - 8, finalY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(coordinatorName, sig3X, finalY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Coordinator, ${studyCentreCode}`, sig3X, finalY + 17.5);
  doc.text("Official Seal & Date", sig3X, finalY + 21);

  // 8. ADD PAGE NUMBERS & AUDIT FOOTER TO ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `IGNOU Study Centre ${studyCentreCode} • Packet Ref: ${packet.packetNumber} • Course: ${packet.courseCode} (${packet.programmeCode})`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 15,
      pageHeight - 6
    );
  }

  return doc;
}

/**
 * Downloads the official IGNOU Packet Dispatch Memo & Docket Slip PDF directly to the user's browser.
 */
export function downloadPacketDispatchSlipPDF(
  packet: CoursePacket,
  evaluator: Evaluator | null,
  scripts: ScriptEntry[],
  options: PacketSlipPDFOptions = {}
): void {
  const doc = generatePacketDispatchSlipPDF(packet, evaluator, scripts, options);
  const cleanPacketNo = (packet.packetNumber || 'PACKET').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `IGNOU_SC2033_Dispatch_Slip_${cleanPacketNo}.pdf`;
  doc.save(filename);
}

