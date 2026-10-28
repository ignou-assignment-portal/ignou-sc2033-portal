import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  ExternalLink,
  BookOpen,
  Calendar,
  Filter,
  RefreshCw,
  TableProperties
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FRESH_ADMISSIONS_SCHEMA, RE_REGISTRATIONS_SCHEMA } from '../utils/sheetTemplateGenerator';

interface SheetDataEntryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'fresh' | 'rereg' | 'converter' | 'bestpractices';
}

export const SheetDataEntryGuideModal: React.FC<SheetDataEntryGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'fresh',
}) => {
  const { currentSession, availableSessions, showToast } = useApp();

  const [activeGuideTab, setActiveGuideTab] = useState<'fresh' | 'rereg' | 'converter' | 'bestpractices'>(initialTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Converter state
  const [converterTarget, setConverterTarget] = useState<'fresh' | 'rereg'>('fresh');
  const [converterSession, setConverterSession] = useState<string>(currentSession || 'January 2026');
  const [rawInputText, setRawInputText] = useState<string>('');
  const [detectedCount, setDetectedCount] = useState<number>(0);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveGuideTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const copyToClipboard = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast(`${label} copied to clipboard! Paste directly into Google Sheets with Ctrl+V.`, 'success');
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      showToast('Could not copy to clipboard. Please copy manually.', 'error');
    }
  };

  // Convert schema columns & sample rows to TSV for instant Google Sheets pasting
  const getHeadersTsv = (schema: typeof FRESH_ADMISSIONS_SCHEMA) => {
    return schema.columns.map((c) => c.key).join('\t');
  };

  const getRowsTsv = (schema: typeof FRESH_ADMISSIONS_SCHEMA, sessionFilter?: string) => {
    const rows = sessionFilter
      ? schema.sampleRows.filter((r) => r.Session === sessionFilter)
      : schema.sampleRows;
    return rows
      .map((row) => schema.columns.map((c) => String(row[c.key] ?? '')).join('\t'))
      .join('\n');
  };

  // Intelligent parser for raw Samarth / RC Excel pasted lines
  const parsedConvertedRows = useMemo(() => {
    if (!rawInputText.trim()) return [];

    const lines = rawInputText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const results: Array<Record<string, string>> = [];

    lines.forEach((line, index) => {
      // Split by tab or multiple spaces / commas
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map((t) => t.trim());
      } else if (line.includes(',')) {
        tokens = line.split(',').map((t) => t.trim());
      } else {
        tokens = line.split(/\s{2,}/).map((t) => t.trim());
      }

      // If tokens count is low, try intelligent regex pattern matching
      let enr = '';
      let name = '';
      let prog = '';
      let coursesRaw = '';
      let phone = '';
      let email = '';
      let fee = `SAMARTH-PASTE-${index + 1}`;

      // 1. Enrollment: 9-10 digits
      const enrMatch = line.match(/\b\d{9,10}\b/);
      if (enrMatch) enr = enrMatch[0];

      // 2. Programme: BAG, BCOMG, BSCG, BCA, MEG, MCOM, MPS, MCA, etc.
      const progMatch = line.match(/\b(BAG|BCOMG|BSCG|BCA|BTS|BLIS|MEG|MCOM|MPS|MAH|MCA|MSW|PGDDM|DNHE|CFN)\b/i);
      if (progMatch) prog = progMatch[0].toUpperCase();

      // 3. Phone: 10-digit mobile starting with 6,7,8,9
      const phoneMatch = line.match(/\b[6-9]\d{9}\b/);
      if (phoneMatch) phone = phoneMatch[0];

      // 4. Email: standard email regex
      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];

      // If token count matches standard Samarth column exports
      if (tokens.length >= 4) {
        if (!enr && /^\d{9,10}$/.test(tokens[0])) enr = tokens[0];
        if (!name && tokens[1] && isNaN(Number(tokens[1]))) name = tokens[1].replace(/["']/g, '');
        if (!prog && tokens[2] && tokens[2].length <= 8) prog = tokens[2].toUpperCase();
        if (tokens[3]) coursesRaw = tokens.slice(3).join(' ');
      } else {
        // Fallback name extraction: words without numbers
        const cleanWords = line
          .replace(enr, '')
          .replace(phone, '')
          .replace(email, '')
          .replace(prog, '')
          .replace(/[,;\t]/g, ' ')
          .trim();
        const candidateName = cleanWords.match(/[A-Za-z\s]{3,30}/);
        if (candidateName) name = candidateName[0].trim();
        coursesRaw = line;
      }

      // 5. Standardize Course Codes to comma-separated with spaces (e.g. BPSC-131, BPSC-132)
      const courseRegex = /\b([A-Z]{2,6})[- ]?(\d{1,4}[A-Z]?)\b/gi;
      const extractedCourses: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = courseRegex.exec(coursesRaw)) !== null) {
        const prefix = match[1].toUpperCase();
        const suffix = match[2].toUpperCase();
        const code = `${prefix}-${suffix}`;
        if (!['JAN', 'JUL', 'JULY', 'JANUARY', 'SEM', 'YEAR', 'SC2033', 'RC'].includes(prefix)) {
          if (!extractedCourses.includes(code)) {
            extractedCourses.push(code);
          }
        }
      }

      const formattedCourses = extractedCourses.length > 0
        ? extractedCourses.join(', ')
        : 'BPSC-131, BPSC-132, BEGAE-182, BHDLA-135';

      const isFresh = converterTarget === 'fresh';
      results.push({
        Enrollment_No: enr || `2401${String(index + 1).padStart(6, '0')}`,
        Student_Name: name || `Student ${index + 1}`,
        Programme_Code: prog || 'BAG',
        Registered_Courses: formattedCourses,
        Student_Phone: phone || '9876543210',
        Student_Email: email || `${(name || 'student').toLowerCase().replace(/\s+/g, '')}@example.com`,
        Session: converterSession,
        Admission_Year: isFresh ? converterSession.split(' ')[1] || '2026' : undefined as any,
        Academic_Year: isFresh ? '1st Year' : '2nd Year',
        Semester_No: '1',
        Status: 'Confirmed',
        Fee_Reference: fee,
        Remarks: `Pasted from Samarth / RC report on ${new Date().toLocaleDateString('en-GB')}`
      });
    });

    return results;
  }, [rawInputText, converterTarget, converterSession]);

  React.useEffect(() => {
    setDetectedCount(parsedConvertedRows.length);
  }, [parsedConvertedRows]);

  const copyConvertedTsv = () => {
    if (parsedConvertedRows.length === 0) {
      showToast('No valid rows to copy. Paste some text from Samarth or RC Excel first.', 'error');
      return;
    }
    const schema = converterTarget === 'fresh' ? FRESH_ADMISSIONS_SCHEMA : RE_REGISTRATIONS_SCHEMA;
    const tsvData = parsedConvertedRows
      .map((row) => schema.columns.map((c) => String(row[c.key] ?? '')).join('\t'))
      .join('\n');

    copyToClipboard(
      tsvData,
      'converted-tsv',
      `All ${parsedConvertedRows.length} converted ${converterTarget === 'fresh' ? 'Fresh' : 'Re-Reg'} rows`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-zinc-200 overflow-hidden flex flex-col text-zinc-900">
        {/* Header */}
        <div className="bg-linear-to-r from-zinc-950 via-indigo-950 to-zinc-900 p-5 sm:p-6 text-white border-b border-zinc-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Google Sheets Reference & Formatter</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Fresh Admissions & Re-Registrations Data Entry Guide
                </h2>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Exact column rules, comma-separated course list formats, 1-click TSV templates, and Samarth/RC paste converter.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t border-zinc-800/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveGuideTab('fresh')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'fresh'
                  ? 'bg-amber-400 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>1. Fresh_Admissions Tab Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('rereg')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'rereg'
                  ? 'bg-amber-400 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>2. Re_Registrations Tab Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('converter')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'converter'
                  ? 'bg-amber-400 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>3. Samarth / RC Excel Paste Cleaner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('bestpractices')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeGuideTab === 'bestpractices'
                  ? 'bg-amber-400 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>4. Formatting Rules & Future Cycles</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: FRESH ADMISSIONS GUIDE */}
          {activeGuideTab === 'fresh' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <h3 className="font-black text-emerald-950 text-base">
                      Google Sheet Tab: <code>Fresh_Admissions</code>
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                    Tracks new students enrolled for the first time (<strong>1st Year / 1st Semester</strong>).
                    Pre-populated for <strong>January 2024 to January 2026</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        getHeadersTsv(FRESH_ADMISSIONS_SCHEMA),
                        'fresh-headers',
                        'Fresh Admissions Headers'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    {copiedId === 'fresh-headers' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Header Row (A1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        getRowsTsv(FRESH_ADMISSIONS_SCHEMA),
                        'fresh-all-tsv',
                        'All Fresh Admission Sample Rows'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {copiedId === 'fresh-all-tsv' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Sample Data Rows (A2)</span>
                  </button>
                </div>
              </div>

              {/* Column-by-Column Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                    Column-by-Column Specification Matrix:
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    13 Required & Standard Columns (A through M)
                  </span>
                </div>

                <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Col</th>
                          <th className="py-2.5 px-3">Column Name</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-4">Required Format & Rule</th>
                          <th className="py-2.5 px-3">Sample Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                        {[
                          { col: 'A', key: 'Enrollment_No', req: 'Required', rule: "9 or 10-digit numeric ID. Format cell as Plain Text ('2401234567) so leading zeros aren't lost.", sample: '2401876543' },
                          { col: 'B', key: 'Student_Name', req: 'Required', rule: 'Full student name as recorded on IGNOU Samarth registration slip.', sample: 'Rahul Kumar Sharma' },
                          { col: 'C', key: 'Programme_Code', req: 'Required', rule: 'Standard IGNOU programme code in UPPERCASE (e.g., BAG, BCOMG, BSCG, BCA, MEG, MPS).', sample: 'BAG' },
                          { col: 'D', key: 'Registered_Courses', req: 'Required', rule: 'Comma-separated course codes with a space after each comma (e.g., BPSC-131, BPSC-132).', sample: 'BPSC-131, BPSC-132, BEGAE-182, BHDLA-135' },
                          { col: 'E', key: 'Student_Phone', req: 'Recommended', rule: '10-digit mobile number for SMS receipt delivery and submission alerts.', sample: '9876543210' },
                          { col: 'F', key: 'Student_Email', req: 'Optional', rule: 'Student email address for electronic dispatch records.', sample: 'rahul.sharma@gmail.com' },
                          { col: 'G', key: 'Session', req: 'Required', rule: 'Academic session cycle name: January 2024, July 2024, January 2025, July 2025, January 2026, or future cycle.', sample: 'January 2024' },
                          { col: 'H', key: 'Admission_Year', req: 'Required', rule: '4-digit admission calendar year.', sample: '2024' },
                          { col: 'I', key: 'Academic_Year', req: 'Required', rule: 'Set to "1st Year" for Fresh admissions, or "1st Sem" for semester programmes.', sample: '1st Year' },
                          { col: 'J', key: 'Semester_No', req: 'Required', rule: 'Numeric semester level: "1" for fresh admissions.', sample: '1' },
                          { col: 'K', key: 'Status', req: 'Required', rule: 'Set to "Confirmed" or "Provisional".', sample: 'Confirmed' },
                          { col: 'L', key: 'Fee_Reference', req: 'Recommended', rule: 'Bank transaction ID or Samarth fee challan reference.', sample: 'FEE-JAN24-9871' },
                          { col: 'M', key: 'Remarks', req: 'Optional', rule: 'Free-text notes (e.g. SC-2033 Verified, Direct Samarth Import).', sample: 'SC-2033 Verified' },
                        ].map((item, idx) => (
                          <tr key={item.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                            <td className="py-2 px-3 text-center font-bold text-zinc-500 bg-zinc-100/50">{item.col}</td>
                            <td className="py-2 px-3 font-bold text-indigo-950 font-sans">{item.key}</td>
                            <td className="py-2 px-3 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.req === 'Required' ? 'bg-rose-100 text-rose-800' : item.req === 'Recommended' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
                              }`}>
                                {item.req}
                              </span>
                            </td>
                            <td className="py-2 px-4 font-sans text-zinc-600 leading-relaxed">{item.rule}</td>
                            <td className="py-2 px-3 text-emerald-800 font-mono text-[10.5px] truncate max-w-[200px]" title={item.sample}>
                              {item.sample}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Cycle-by-Cycle Quick Copy Toolbar */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
                <span className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Copy Sample Rows by Cycle (January 2024 to January 2026):
                </span>
                <p className="text-[11px] text-zinc-500">
                  Click any cycle button below to copy ready-to-paste TSV data directly into cell <code>A2</code> of your <code>Fresh_Admissions</code> Google Sheet:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {['January 2024', 'July 2024', 'January 2025', 'July 2025', 'January 2026'].map((sess) => (
                    <button
                      key={sess}
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          getRowsTsv(FRESH_ADMISSIONS_SCHEMA, sess),
                          `fresh-${sess}`,
                          `Fresh Admissions (${sess})`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                    >
                      {copiedId === `fresh-${sess}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-500" />}
                      <span>Copy {sess}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RE-REGISTRATIONS GUIDE */}
          {activeGuideTab === 'rereg' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-600" />
                    <h3 className="font-black text-indigo-950 text-base">
                      Google Sheet Tab: <code>Re_Registrations</code>
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-900 mt-1 leading-relaxed">
                    Tracks continuing students re-registering for their <strong>2nd Year, 3rd Year</strong>, or next semester.
                    Pre-configured for all cycles from <strong>January 2024 to January 2026</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        getHeadersTsv(RE_REGISTRATIONS_SCHEMA),
                        'rereg-headers',
                        'Re-Registration Headers'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    {copiedId === 'rereg-headers' ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Header Row (A1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        getRowsTsv(RE_REGISTRATIONS_SCHEMA),
                        'rereg-all-tsv',
                        'All Re-Registration Sample Rows'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {copiedId === 'rereg-all-tsv' ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Sample Data Rows (A2)</span>
                  </button>
                </div>
              </div>

              {/* Column-by-Column Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                    Re-Registration Column Matrix:
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    12 Columns (A through L)
                  </span>
                </div>

                <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Col</th>
                          <th className="py-2.5 px-3">Column Name</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-4">Required Format & Rule</th>
                          <th className="py-2.5 px-3">Sample Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                        {[
                          { col: 'A', key: 'Enrollment_No', req: 'Required', rule: 'Existing student 9 or 10-digit enrollment number.', sample: '2201987654' },
                          { col: 'B', key: 'Student_Name', req: 'Required', rule: 'Candidate full name as in student master record.', sample: 'Pooja Verma' },
                          { col: 'C', key: 'Programme_Code', req: 'Required', rule: 'Registered programme code (e.g. BAG, MPS, BCOMG, MEG).', sample: 'BAG' },
                          { col: 'D', key: 'Registered_Courses', req: 'Required', rule: '2nd or 3rd year specific course codes, comma-separated with spaces (e.g., BPSC-133, BPSC-134).', sample: 'BPSC-133, BPSC-134, BSOG-173, BANS-183' },
                          { col: 'E', key: 'Student_Phone', req: 'Recommended', rule: '10-digit mobile number.', sample: '9812345678' },
                          { col: 'F', key: 'Student_Email', req: 'Optional', rule: 'Registered student email address.', sample: 'pooja.verma@example.com' },
                          { col: 'G', key: 'Session', req: 'Required', rule: 'Re-Registration cycle: January 2024, July 2024, January 2025, July 2025, January 2026, or future session.', sample: 'January 2024' },
                          { col: 'H', key: 'Academic_Year', req: 'Required', rule: 'Set to "2nd Year" or "3rd Year" (or "3rd Sem", "4th Sem").', sample: '2nd Year' },
                          { col: 'I', key: 'Semester_No', req: 'Required', rule: 'Numeric level: "2" or "3" for Bachelor/Master continuing cohorts.', sample: '2' },
                          { col: 'J', key: 'Status', req: 'Required', rule: 'Set to "Confirmed" or "Provisional".', sample: 'Confirmed' },
                          { col: 'K', key: 'Fee_Reference', req: 'Recommended', rule: 'Samarth Re-Reg bank reference or transaction slip number.', sample: 'REREG-JAN24-8842' },
                          { col: 'L', key: 'Remarks', req: 'Optional', rule: 'Free-text re-registration remarks.', sample: '2nd Year Re-Reg Confirmed' },
                        ].map((item, idx) => (
                          <tr key={item.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                            <td className="py-2 px-3 text-center font-bold text-zinc-500 bg-zinc-100/50">{item.col}</td>
                            <td className="py-2 px-3 font-bold text-indigo-950 font-sans">{item.key}</td>
                            <td className="py-2 px-3 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.req === 'Required' ? 'bg-rose-100 text-rose-800' : item.req === 'Recommended' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
                              }`}>
                                {item.req}
                              </span>
                            </td>
                            <td className="py-2 px-4 font-sans text-zinc-600 leading-relaxed">{item.rule}</td>
                            <td className="py-2 px-3 text-indigo-800 font-mono text-[10.5px] truncate max-w-[200px]" title={item.sample}>
                              {item.sample}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Cycle-by-Cycle Quick Copy Toolbar */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
                <span className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Copy Re-Registration Rows by Cycle:
                </span>
                <p className="text-[11px] text-zinc-500">
                  Click any cycle to copy clean TSV rows directly into cell <code>A2</code> of your <code>Re_Registrations</code> Google Sheet tab:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {['January 2024', 'July 2024', 'January 2025', 'July 2025', 'January 2026'].map((sess) => (
                    <button
                      key={sess}
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          getRowsTsv(RE_REGISTRATIONS_SCHEMA, sess),
                          `rereg-${sess}`,
                          `Re-Registrations (${sess})`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                    >
                      {copiedId === `rereg-${sess}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-500" />}
                      <span>Copy {sess}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMARTH / RC EXCEL PASTE CLEANER & CONVERTER */}
          {activeGuideTab === 'converter' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-amber-950 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Samarth & Regional Centre Excel Direct Paste Cleaner:</span>
                </div>
                <p className="text-amber-900 leading-relaxed text-[11.5px]">
                  Copy-paste any raw student rows directly from your official IGNOU Samarth portal exports or Regional Centre Excel spreadsheets below.
                  This tool extracts enrollment numbers, cleans names, standardizes course codes into the comma-separated format (e.g. <code>BPSC-131, BPSC-132</code>),
                  and outputs clean Google Sheets TSV rows.
                </p>
              </div>

              {/* Target Tab & Session Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Destination Tab:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConverterTarget('fresh')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        converterTarget === 'fresh'
                          ? 'bg-emerald-950 text-white border-emerald-950 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200'
                      }`}
                    >
                      Fresh_Admissions
                    </button>
                    <button
                      type="button"
                      onClick={() => setConverterTarget('rereg')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        converterTarget === 'rereg'
                          ? 'bg-indigo-950 text-white border-indigo-950 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200'
                      }`}
                    >
                      Re_Registrations
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Target Academic Session:
                  </label>
                  <select
                    value={converterSession}
                    onChange={(e) => setConverterSession(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="January 2024">January 2024</option>
                    <option value="July 2024">July 2024</option>
                    <option value="January 2025">January 2025</option>
                    <option value="July 2025">July 2025</option>
                    <option value="January 2026">January 2026</option>
                    <option value="July 2026">July 2026</option>
                    <option value="January 2027">January 2027</option>
                    {availableSessions
                      .filter((s) => !['January 2024', 'July 2024', 'January 2025', 'July 2025', 'January 2026', 'July 2026', 'January 2027'].includes(s))
                      .map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Paste Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-800">
                    Paste Raw Lines from Samarth / RC Excel Here:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRawInputText(
                        `2401876543\tRahul Kumar\tBAG\tBPSC131 BPSC132 BEGAE182 BHDLA135\t9876543210\trahul@example.com\n2401876544\tSneha Patel\tBCOMG\tBCOC-131, BCOC-132, BEGAE-182\t9823456781\tsneha@example.com\n2401876545\tAmit Sharma\tMPS\tMPS-001 MPS-002 MPS-003 MPS-004\t9811223344\tamit@example.com`
                      );
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Load Sample Samarth Lines
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                  placeholder="Paste rows copied from Excel or Samarth here (tabs, spaces, or commas supported)..."
                  className="w-full p-3 font-mono text-xs bg-zinc-50 border border-zinc-300 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Converted Preview & 1-Click Copy */}
              {detectedCount > 0 && (
                <div className="space-y-3 pt-2 border-t border-zinc-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-zinc-900">
                        {detectedCount} Student Record{detectedCount > 1 ? 's' : ''} Successfully Converted
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={copyConvertedTsv}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      {copiedId === 'converted-tsv' ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                      <span>Copy Converted TSV for Google Sheets</span>
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold sticky top-0 border-b border-zinc-200 text-[10.5px]">
                        <tr>
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Enrollment</th>
                          <th className="py-2 px-2.5">Name</th>
                          <th className="py-2 px-2.5">Prog</th>
                          <th className="py-2 px-3 text-indigo-700">Registered_Courses (Formatted)</th>
                          <th className="py-2 px-2.5">Session</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-[11px]">
                        {parsedConvertedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-indigo-50/30">
                            <td className="py-1.5 px-2.5 text-zinc-400">{i + 1}</td>
                            <td className="py-1.5 px-2.5 font-bold text-zinc-900">{r.Enrollment_No}</td>
                            <td className="py-1.5 px-2.5 font-sans font-medium text-zinc-800">{r.Student_Name}</td>
                            <td className="py-1.5 px-2.5 font-bold text-emerald-800">{r.Programme_Code}</td>
                            <td className="py-1.5 px-3 text-indigo-900 font-bold">{r.Registered_Courses}</td>
                            <td className="py-1.5 px-2.5 text-zinc-600 font-sans">{r.Session}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-zinc-500 italic">
                    Tip: After clicking <strong>Copy Converted TSV</strong>, switch to your Google Sheet, click cell <strong>A2</strong> (just below row 1 headers) in your <code>{converterTarget === 'fresh' ? 'Fresh_Admissions' : 'Re_Registrations'}</code> tab, and press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong>).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FORMATTING RULES & FUTURE CYCLES */}
          {activeGuideTab === 'bestpractices' && (
            <div className="space-y-4 animate-in fade-in duration-200 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule 1 */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">1</span>
                    <span>Formatting Enrollment Numbers (Leading Zeros)</span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11.5px]">
                    Some IGNOU enrollment numbers start with zeros (e.g. <code>092100345</code>). If typed directly as a number, Google Sheets may drop the leading zero.
                  </p>
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] font-mono text-zinc-800">
                    In Google Sheets: Select column A &gt; Click <strong>Format</strong> &gt; <strong>Number</strong> &gt; select <strong>Plain Text</strong>.
                    Or prefix with a single quote: <code>'092100345</code>.
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">2</span>
                    <span>Standardized Course Codes with Comma & Space</span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11.5px]">
                    Always write courses in the <code>Registered_Courses</code> column separated by a comma and a space:
                  </p>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] font-mono text-emerald-900">
                    Correct: <code>BPSC-131, BPSC-132, BEGAE-182, BHDLA-135</code><br />
                    Avoid: <code>BPSC131/132</code> or unspaced lists.
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">3</span>
                    <span>Adding Future Sessions (July 2026, Jan 2027, etc.)</span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11.5px]">
                    To introduce any new academic session, you do <strong>not</strong> need code modifications. Simply enter the session name in the <code>Session</code> column of your Google Sheets tab:
                  </p>
                  <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-[11px] font-mono text-indigo-950">
                    Example: <code>January 2027</code> or <code>July 2027</code><br />
                    The web app auto-harvests new session names on every sync and populates them into the session dropdowns!
                  </div>
                </div>

                {/* Rule 4 */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">4</span>
                    <span>Separate Tabs: Fresh vs Re-Registration</span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11.5px]">
                    Keep newly admitted students in the <code>Fresh_Admissions</code> tab and continuing students transitioning to subsequent semesters in <code>Re_Registrations</code>.
                  </p>
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] font-sans text-zinc-700">
                    This keeps statutory eligibility rules clean and lets the desk automatically distinguish between 1st Year submissions and re-registration assignments.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Format: Comma-separated courses • Plain Text enrollment numbers • Auto-discovered future sessions</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Google Sheets</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
