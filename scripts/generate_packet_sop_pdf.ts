import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function buildPacketSOPPDF(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Colors
  const navy = [15, 23, 42]; // #0f172a
  const indigo = [67, 56, 202]; // #4338ca
  const teal = [13, 148, 136]; // #0d9488
  const grayText = [71, 85, 105]; // #475569
  const lightBg = [248, 250, 252]; // #f8fafc

  let y = 14;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(leftMargin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('INDIRA GANDHI NATIONAL OPEN UNIVERSITY (IGNOU)', pageWidth / 2, y + 6, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Study Centre SC-2033 | S.D. Jain Girls' College, Dimapur, Nagaland", pageWidth / 2, y + 12, { align: 'center' });
  doc.text("Regional Centre: RC-20 Kohima | Assignment Operations Division", pageWidth / 2, y + 17, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('STANDARD OPERATING PROCEDURE (SOP) | DOCUMENT REF: IGNOU/SC-2033/SOP/PKT-2026', pageWidth / 2, y + 21, { align: 'center' });

  y += 28;

  // Document Title Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(67, 56, 202);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COURSE ASSIGNMENT PACKET DISPATCH & EVALUATION LIFECYCLE', pageWidth / 2, y + 6, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Recording, Allotment, Verification & SED Award Protocol (Formed -> Dispatched -> Evaluated)', pageWidth / 2, y + 10.5, { align: 'center' });

  y += 18;

  // Section 1: Executive Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. PURPOSE & EXECUTIVE OVERVIEW', leftMargin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const purposeText =
    "This statutory Standard Operating Procedure governs the intake-to-award evaluation pipeline at Study Centre SC-2033. It establishes the mandatory three-stage protocol for lotting student assignment scripts into physical Course Packets, dispatching them to empanelled Academic Counsellors, logging marks, and transmitting SED award lists to Regional Centre Kohima (RC-20).";
  const splitPurpose = doc.splitTextToSize(purposeText, contentWidth);
  doc.text(splitPurpose, leftMargin, y);
  y += splitPurpose.length * 4 + 2;

  // Section 2: Summary Matrix Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. PACKET RECORDING LIFECYCLE MATRIX', leftMargin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Stage', 'Packet Status', 'Script Status in Ledger', 'Mandatory Fields Recorded', 'Physical / Digital Artifact']],
    body: [
      [
        'Stage 1:\nFORMED',
        'Formed\n(Lot Sealed)',
        'Pending Allotment\n(Script locked to packet)',
        '• Packet Number (PKT-JUL26-XXX-01)\n• Course & Programme Code\n• Script Count (Standard 20 scripts)\n• Candidate Enrollment IDs\n• Lot Creation Date\n• Evaluator: Unallotted',
        '• Course Packet Label\n• Internal Inventory Registry',
      ],
      [
        'Stage 2:\nDISPATCHED',
        'Dispatched\n(With Evaluator)',
        'Allotted\n(Assigned to Counsellor)',
        '• Empanelled Evaluator Code\n• Evaluator Name & Mobile\n• Dispatch / Handover Date\n• Expected Return Date (+15 days)\n• Handover Mode (Desk / Post)\n• Coordinator Sign-off',
        '• Printable 2-Copy Dispatch Slip\n  (1 Study Centre copy, 1 packet copy)\n• Google Sheets Course_Ledger row sync',
      ],
      [
        'Stage 3:\nEVALUATED',
        'Evaluated\n(Closed Packet)',
        'Evaluated /\nMarks Locked',
        '• Actual Return Receipt Date\n• Numeric Marks (0 - 100)\n• IGNOU Grade (A to E)\n• 4-Digit Coordinator Security Lock\n• Evaluator Honorarium Bill Ref',
        '• SED Continuous Award Sheet\n• Counsellor Remuneration Bill (₹25/script)\n• Student Portal Online Sync',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'top',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 34 },
      3: { cellWidth: 54 },
      4: { cellWidth: 44 },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Section 3: Stage-by-Stage Operational Rules
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DETAILED OPERATIONAL & RECORDING PROCEDURES', leftMargin, y);
  y += 5;

  // Box for Stage 1
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftMargin, y, contentWidth, 24, 'FD');
  doc.setTextColor(13, 148, 136);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('STAGE 1: PACKET FORMATION & CANDIDATE SCRIPT LOTTING', leftMargin + 3, y + 4.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const s1Lines = [
    '1. Lotting Threshold: Front counter scripts are bundled in standard lots of 20 candidate scripts (or remainder pool).',
    '2. Canonical Packet Number: Generated as PKT-{SESSION_CODE}-{COURSE_CLEAN}-{INDEX} (e.g. PKT-JUL26-MPS001-01).',
    '3. Candidate Deduplication: Each student script enrollment is bound to the packet lot, preventing duplicate dispatch.',
    '4. Initial State: Status is "Formed", Allotted_Evaluator is "Unallotted", and candidate scripts remain "Pending Allotment".',
  ];
  let s1Y = y + 9;
  s1Lines.forEach((line) => {
    doc.text(line, leftMargin + 3, s1Y);
    s1Y += 3.5;
  });
  y += 28;

  // Box for Stage 2
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftMargin, y, contentWidth, 26, 'FD');
  doc.setTextColor(67, 56, 202);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('STAGE 2: COUNSELLOR ALLOTMENT & PHYSICAL DISPATCH', leftMargin + 3, y + 4.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const s2Lines = [
    '1. Evaluator Verification: Only empanelled counsellors listed in Evaluators_Master with valid codes are eligible.',
    '2. Timeline: System calculates Expected Return Date (+15 days default from date of handover/dispatch).',
    '3. Universal Propagation: Immediately updates candidate rows in Evaluation Master, Course Ledger, and Google Sheets.',
    '4. Printable 2-Copy Dispatch Slip: Printed at time of handover. Counsellor signs Copy 1 (retained by Study Centre Desk);',
    '   Copy 2 is attached to the physical parcel envelope for the counsellor\'s grading reference.',
  ];
  let s2Y = y + 9;
  s2Lines.forEach((line) => {
    doc.text(line, leftMargin + 3, s2Y);
    s2Y += 3.5;
  });
  y += 30;

  // Box for Stage 3
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftMargin, y, contentWidth, 26, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('STAGE 3: SCRIPT RETURN, MARKS ENTRY & SED AWARD TRANSMISSION', leftMargin + 3, y + 4.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const s3Lines = [
    '1. Physical Intake & Verification: Desk staff verify 20 returned scripts against the attached dispatch slip.',
    '2. Continuous Assessment Grading: Numeric marks (0-100) are entered. System auto-calculates letter grades (A to E).',
    '3. Status Lock: Status advances to "Evaluated". Academic Coordinator locks marks with 4-digit PIN against alteration.',
    '4. Downstream Completion: (a) Generates Regional Centre SED Award Sheet; (b) Generates Counsellor Honorarium Bill',
    '   at statutory rates (₹25/script x 20 = ₹500); (c) Transmits evaluation data to Google Sheets Course_Ledger permanently.',
  ];
  let s3Y = y + 9;
  s3Lines.forEach((line) => {
    doc.text(line, leftMargin + 3, s3Y);
    s3Y += 3.5;
  });
  y += 31;

  // Section 4: Sign-off & Verification Footer
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PREPARED & VERIFIED BY:', leftMargin, y);
  doc.text('APPROVED & ISSUED BY:', pageWidth / 2 + 10, y);

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Assignment Desk In-Charge / Official', leftMargin, y);
  doc.text("Co-ordinator / Assistant Co-ordinator", pageWidth / 2 + 10, y);
  doc.text("Study Centre SC-2033 (Dimapur)", leftMargin, y + 3.5);
  doc.text("IGNOU Study Centre SC-2033 (S.D. Jain Girls' College)", pageWidth / 2 + 10, y + 3.5);

  // Footer page numbering & watermark
  const footerY = pageHeight - 8;
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Official Statutory Document | IGNOU Study Centre SC-2033 Dimapur, Nagaland | Generated via Assignment Operations Portal', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

// Write to public/documents
const outputDir = path.join(process.cwd(), 'public', 'documents');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = buildPacketSOPPDF();
const outputPath = path.join(outputDir, 'IGNOU_SC2033_Packet_Dispatch_SOP.pdf');
const buffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outputPath, buffer);

console.log('PDF successfully generated at:', outputPath);
