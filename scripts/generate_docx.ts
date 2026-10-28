import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
} from 'docx';

async function createBlueprintDocument() {
  const primaryNavy = '1E293B';
  const accentIndigo = '312E81';
  const tableBorderColor = 'CBD5E1';
  const headerBg = 'F1F5F9';
  const alertBg = 'FEF3C7';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'IGNOU SC-2033 Web Application System Blueprint',
                    color: '64748B',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Indira Gandhi National Open University · Study Centre 2033 · Confidential Operational Document · Page ',
                    color: '94A3B8',
                    size: 16,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: '94A3B8',
                    size: 16,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'INDIRA GANDHI NATIONAL OPEN UNIVERSITY',
                bold: true,
                size: 32,
                color: primaryNavy,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: 'STUDY CENTRE 2033 (SC-2033)',
                bold: true,
                size: 26,
                color: '4338CA',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
            children: [
              new TextRun({
                text: 'ACADEMIC ASSIGNMENT INTAKE, EVALUATION & FINANCIAL GOVERNANCE SYSTEM',
                bold: true,
                size: 22,
                color: '334155',
                font: 'Arial',
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Application Name:', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'IGNOU SC-2033 Assignment Management & Governance Suite', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Target Users:', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Centre Coordinator, Desk Officials, Evaluators, Regional Observers', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Deployment Architecture:', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Progressive Web App (PWA) · React 19 SPA · Offline Cache · Google Sheets Sync', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Security Model:', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Dual-Role RBAC (Coordinator PIN Challenge) · Isolated Desk Kiosk Mode', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Section 1: Executive Overview
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '1. Executive Overview & Purpose',
                bold: true,
                size: 26,
                color: primaryNavy,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'The IGNOU Study Centre 2033 (SC-2033) web application was engineered to replace manual paper ledgers, fragmented spreadsheets, and error-prone handwritten receipts with a unified, tamper-evident digital operating platform. Every year, thousands of students physically submit handwritten assignment responses across hundreds of IGNOU course codes.',
                size: 21,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'This system provides complete end-to-end statutory governance covering the entire assignment lifecycle: from the moment a student hands over physical scripts at the front intake counter, through academic evaluator allotment, grade entry, marks locking, SED Form II award sheet generation for the Regional Evaluation Centre, and statutory evaluator remuneration billing.',
                size: 21,
              }),
            ],
          }),

          // Section 2: Dual Role-Based Operating Paradigm
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '2. Role-Based Access Control (RBAC) & Persona Isolation',
                bold: true,
                size: 26,
                color: primaryNavy,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'The web application implements strict institutional role separation to prevent operational clutter, unauthorized mark tampering, and premature bill modifications:',
                size: 21,
              }),
            ],
          }),

          // RBAC Comparison Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Functional Module', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Desk Official Mode', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Coordinator Mode (Admin)', bold: true, size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Stage 1: Student Intake & Desk', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Primary Intake)', bold: true, color: '166534', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Full Oversight)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Stage 2: Evaluation Master', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Allotment / Draft Marks)', bold: true, color: '166534', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Full Oversight)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Master Marks Locking', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PIN REQUIRED (Coordinator Protection)', bold: true, color: '92400E', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Direct Execution)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Stage 3: SED Award Sheets', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'HIDDEN from Navigation Menu', color: '991B1B', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Form II Gazette Generation)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Stage 4: Remuneration & Bills', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'HIDDEN from Navigation Menu', color: '991B1B', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (PIN Sanction & Voucher)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Secondary Tracking Registers', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'HIDDEN from Navigation Menu', color: '991B1B', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (5 Registers & Evaluators)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Forensic Audit Trail', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'FORBIDDEN & Completely Hidden', bold: true, color: '991B1B', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Immutable Event History)', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'System & Centre Settings', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'FORBIDDEN (Redirects to Intake)', color: '991B1B', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ALLOWED (Sync, Rates, Session Cycles)', size: 19 })] })] }),
                ],
              }),
            ],
          }),

          // Section 3: The 4 Statutory Stages
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '3. Core Operational Lifecycle: The 4 Statutory Stages',
                bold: true,
                size: 26,
                color: primaryNavy,
              }),
            ],
          }),

          // Stage 1
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'Stage 1: Student Intake & Desk Operation',
                bold: true,
                size: 22,
                color: '0369A1',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '• Rapid Physical Intake: Enables counter staff to register student submissions in seconds using barcode/QR scanning or keyboard entry.\n• Validation Checks: Validates 9-10 digit IGNOU enrollment numbers, student names, programme codes, and course codes against the built-in IGNOU Master curriculum registry.\n• Duplicate Prevention: Flags duplicate submissions for the same course in the same academic cycle (e.g., TEE DEC-2024 / JUN-2025).\n• Triplicate Receipt Slip: Generates instantaneous printable acknowledgment slips: Student Copy (with verification QR code), Centre Archive Copy, and Assignment Packet Identification Tag.',
                size: 20,
              }),
            ],
          }),

          // Stage 2
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'Stage 2: Evaluation Master & Academic Grading',
                bold: true,
                size: 22,
                color: '0369A1',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '• Course-Wise Allotment: Groups received physical scripts into batches/packets and assigns approved IGNOU academic evaluators from the verified directory.\n• Script Limits & Deadlines: Enforces approved evaluation quotas per faculty member and monitors return turnaround times.\n• Marks Entry Matrix: Structured numerical scoring interface ensuring marks comply with max scale (e.g., 0-100) and grade calculation formulas.\n• Master Marks Locking: Once evaluated, scripts are finalized via Coordinator PIN challenge. Once locked, grades cannot be altered without an auditable unlock exception logged in the security ledger.',
                size: 20,
              }),
            ],
          }),

          // Stage 3
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'Stage 3: SED Award Sheets (Form II Gazette Format)',
                bold: true,
                size: 22,
                color: '0369A1',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '• Standard IGNOU SED Form II: Formats marks into statutory Student Evaluation Division (SED) award sheets ready for regional centre submission.\n• Course & Batch Tabulation: Automatically arranges candidate enrollments, marks in figures, marks in words, status (Pass/Fail), and evaluator credentials.\n• High-Fidelity PDF & Excel Export: Produces official multi-page award sheets complete with institutional headers, study centre seal, and coordinator signatures.\n• Dispatch Docket Log: Logs Speed Post/Courier tracking numbers, date of dispatch, and regional evaluation centre consignment receipts.',
                size: 20,
              }),
            ],
          }),

          // Stage 4
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'Stage 4: Remuneration Billing & Financial Settlement',
                bold: true,
                size: 22,
                color: '0369A1',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '• Automated Voucher Generation: Computes evaluation remuneration based on IGNOU statutory remuneration rules (per script rate, e.g., ₹25-₹35, plus approved postal/conveyance allowances).\n• Tax & Bank Profiling: Stores IFSC codes, bank account details, and PAN numbers securely for Direct Benefit Transfer (DBT).\n• Sanction Order Generation: Formats printable remuneration claim vouchers with statutory certificate of evaluation.\n• Coordinator Protection: Desk officials are barred from creating or releasing payment vouchers without Coordinator PIN authentication.',
                size: 20,
              }),
            ],
          }),

          // Section 4: Key Supporting Features
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '4. Key Architectural & Supporting Features',
                bold: true,
                size: 26,
                color: primaryNavy,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'A. Progressive Web App (PWA) & Offline Capability\n• 100% Offline Resilience: Operates smoothly during internet outages at the front counter. Submissions and evaluations are cached in browser storage and queue-synced when connection returns.\n• Dual-Location In-App Install Button: Prominently displayed in both the top Header navigation bar and the left Sidebar navigation rail with warm amber accent styling.\n• Interactive Guide: Includes step-by-step modal guide for iOS Safari ("Add to Home Screen") and Desktop Chrome/Edge dock pinning.\n• "App Guide" State: Automatically updates label to "App Guide" when running as an installed standalone desktop or mobile application.\n\nB. Google Sheets Cloud Synchronization Bridge\n• Zero-Cost Cloud Database: Connects to a master Google Spreadsheet via a secure Google Apps Script webhook (`Code.gs`).\n• Bi-Directional Sync: Pushes physical intake records, evaluation results, and bills directly to institutionally shared Google Sheets in real time.\n• Single-Click Sync & Auto-Recovery: Provides quick manual sync triggers in both header and sidebar, accompanied by visual connection indicators.\n\nC. Forensic Security Audit Trail\n• Immutable Ledger: Records every single mutation (intake, mark edit, lock, unlock challenge, bill sanction, data export) with millisecond timestamps, user persona, and before/after values.\n• Confidential to Coordinator: Desk officials cannot view the forensic trail, guaranteeing that counter staff cannot audit administrator oversight or tamper with logs.\n\nD. Kiosk Mode & Terminal URL Protection\n• Direct URL Lock: Supports `?mode=desk_terminal` for counter kiosk laptops, locking the UI into Desk Official mode without role-switcher controls.\n• Auto-Redirection Guard: Bypassing attempts to access settings, remuneration, or audit logs automatically redirect the terminal to Stage 1 (Intake Desk).',
                size: 20,
              }),
            ],
          }),

          // Section 5: Technical Specifications
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '5. Technology Stack & Implementation Architecture',
                bold: true,
                size: 26,
                color: primaryNavy,
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Layer / Component', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Technology / Implementation', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Key Responsibility', bold: true, size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Frontend Core', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'React 19 + TypeScript 5.8', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Component hierarchy, state stores, type safety', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Build & Bundler', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Vite 6 + ESBuild + TSX', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Instant HMR, production bundling, server proxy', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Styling & Design', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tailwind CSS v4 (Design Constitution)', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Zero-pill metadata, high density, accessible tokens', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Document Generation', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'jsPDF + AutoTable + docx', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'SED Form II PDF, Remuneration Bills, Word Blueprint', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Offline & PWA', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Service Worker + Web App Manifest', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Standalone installation, background caching', size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cloud Synchronization', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Google Apps Script Webhook', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bi-directional spreadsheet sync without database fees', size: 19 })] })] }),
                ],
              }),
            ],
          }),

          // Sign-off section
          new Paragraph({
            spacing: { before: 500, after: 100 },
            children: [
              new TextRun({
                text: '6. Institutional Sign-Off & Verification',
                bold: true,
                size: 24,
                color: primaryNavy,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'This system blueprint certifies the operational architecture and governance safeguards implemented for Indira Gandhi National Open University (IGNOU) Study Centre 2033. All workflows strictly conform to IGNOU statutory assignment handling norms, evaluation remuneration frameworks, and regional centre award transmission requirements.',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: '________________________________________\n',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: 'Study Centre Coordinator / Regional Director\nIGNOU Study Centre 2033\nDate of Commissioning: October 2026',
                size: 20,
                color: '475569',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve('public/IGNOU_SC2033_Web_App_Blueprint.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document generated successfully at ${outputPath} (${buffer.length} bytes)`);
}

createBlueprintDocument().catch((err) => {
  console.error('Error creating blueprint document:', err);
  process.exit(1);
});
