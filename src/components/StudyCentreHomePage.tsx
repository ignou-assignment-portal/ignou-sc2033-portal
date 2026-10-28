import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ThemeSelector } from './ThemeSelector';
import { InstitutionalSeal } from './InstitutionalSeal';
import {
  ShieldAlert,
  Lock,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileCheck2,
  CheckCircle2,
  Search,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Award,
  AlertCircle,
  FileText,
  HelpCircle,
  Users,
  Printer,
  Compass,
  BarChart3,
  Layers,
  Inbox,
  TrendingUp,
  Package,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/helpers';
import { NewDatabaseSetupWizard } from './NewDatabaseSetupWizard';

interface StudyCentreHomePageProps {
  onOpenGatekeeper: () => void;
}

export const StudyCentreHomePage: React.FC<StudyCentreHomePageProps> = ({
  onOpenGatekeeper,
}) => {
  const {
    settings,
    currentSession,
    allIntakes,
    allProgrammes,
    isAuthenticated,
    openReceiptModal,
    studentRegistrations,
  } = useApp();

  // Universal Registration Status Search State
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regHasSearched, setRegHasSearched] = useState(false);

  // Universal Assignment Intake Status Search State
  const [intakeSearchQuery, setIntakeSearchQuery] = useState('');
  const [intakeHasSearched, setIntakeHasSearched] = useState(false);
  const [verifiedViaQr, setVerifiedViaQr] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Auto-detect mobile QR code verification deep-link (?verify=TOKEN or ?enrol=ENROL or #verify=TOKEN)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get('verify') || params.get('token');
      const enrolParam = params.get('enrol');
      
      let hashParam = '';
      if (window.location.hash) {
        const match = window.location.hash.match(/[#&?](?:verify|token|enrol)=([^&]+)/i);
        if (match) {
          hashParam = decodeURIComponent(match[1]);
        }
      }

      const rawTarget = (verifyParam || hashParam || '').trim();
      if (rawTarget) {
        setIntakeSearchQuery(rawTarget);
        setIntakeHasSearched(true);
        setVerifiedViaQr(true);

        setTimeout(() => {
          const targetEl = document.getElementById('student-verification');
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      } else if (enrolParam) {
        const cleanEnrol = enrolParam.trim();
        setRegSearchQuery(cleanEnrol);
        setRegHasSearched(true);
        setIntakeSearchQuery(cleanEnrol);
        setIntakeHasSearched(true);

        setTimeout(() => {
          const targetEl = document.getElementById('student-verification');
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      }
    } catch (e) {
      console.warn('Error reading verification URL params:', e);
    }
  }, [allIntakes, studentRegistrations]);

  // Tracker State for Registered Programmes & Candidate / Script Submissions
  const [trackerSession, setTrackerSession] = useState<string>('ALL');
  const [trackerSearchQuery, setTrackerSearchQuery] = useState<string>('');
  const [expandedProgrammes, setExpandedProgrammes] = useState<Record<string, boolean>>({});

  const toggleExpandProgramme = (code: string) => {
    setExpandedProgrammes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  // Perform search across studentRegistrations (Fresh Admissions & Re-Registrations)
  const regSearchResults = useMemo(() => {
    const q = regSearchQuery.trim().toUpperCase();
    if (!q) return [];
    return (studentRegistrations || []).filter((item) => {
      const enroll = (item.enrollmentNo || '').toUpperCase();
      const name = (item.studentName || '').toUpperCase();
      const prog = (item.programmeCode || '').toUpperCase();
      const sess = (item.session || '').toUpperCase();
      const yr = (item.academicYear || '').toUpperCase();
      return enroll.includes(q) || name.includes(q) || prog.includes(q) || sess.includes(q) || yr.includes(q);
    });
  }, [regSearchQuery, studentRegistrations]);

  const handleRegSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regSearchQuery.trim()) {
      setRegHasSearched(true);
    }
  };

  // Perform search across allIntakes (Universal across all sessions)
  const intakeSearchResults = useMemo(() => {
    const q = intakeSearchQuery.trim().toUpperCase();
    if (!q) return [];
    return (allIntakes || []).filter((item) => {
      const enroll = (item.enrollmentNo || '').toUpperCase();
      const name = (item.studentName || (item as any).candidateName || '').toUpperCase();
      const token = (item.tokenNo || '').toUpperCase();
      const prog = (item.programmeCode || (item as any).programme || '').toUpperCase();
      return enroll.includes(q) || name.includes(q) || token.includes(q) || prog.includes(q);
    });
  }, [intakeSearchQuery, allIntakes]);

  const handleIntakeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intakeSearchQuery.trim()) {
      setIntakeHasSearched(true);
    }
  };

  // Available sessions in submission register
  const availableSubmissionSessions = useMemo(() => {
    const s = new Set<string>();
    for (const item of allIntakes) {
      if (item.session && item.session.trim()) {
        s.add(item.session.trim());
      }
    }
    return Array.from(s);
  }, [allIntakes]);

  // Intake records filtered by tracker session
  const activeTrackerIntakes = useMemo(() => {
    if (trackerSession === 'ALL') return allIntakes;
    return allIntakes.filter(
      (item) => (item.session || '').trim().toLowerCase() === trackerSession.trim().toLowerCase()
    );
  }, [allIntakes, trackerSession]);

  // Registered Programmes & Statistics dynamically derived exclusively from actual assignment submissions
  interface RegisteredProgrammeStat {
    code: string;
    name: string;
    level: string;
    department?: string;
    candidatesCount: number;
    candidateEnrollments: Set<string>;
    totalScripts: number;
    courseCounts: Record<string, number>;
    inPersonCount: number;
    postalCount: number;
    latestSubmissionDate: string;
  }

  const registeredProgrammeStats = useMemo(() => {
    const map = new Map<string, RegisteredProgrammeStat>();

    for (const item of activeTrackerIntakes) {
      const rawCode = (item.programmeCode || (item as any).programme || '').trim().toUpperCase();
      if (!rawCode) continue;

      if (!map.has(rawCode)) {
        const found = allProgrammes.find((p) => p.code.trim().toUpperCase() === rawCode);
        map.set(rawCode, {
          code: rawCode,
          name: found ? found.name : `Programme ${rawCode}`,
          level: found ? found.level : 'Degree',
          department: found?.department,
          candidatesCount: 0,
          candidateEnrollments: new Set<string>(),
          totalScripts: 0,
          courseCounts: {},
          inPersonCount: 0,
          postalCount: 0,
          latestSubmissionDate: '',
        });
      }

      const stat = map.get(rawCode)!;
      const enroll = (item.enrollmentNo || '').trim();
      if (enroll) {
        stat.candidateEnrollments.add(enroll);
      }

      const courses = item.courseCodes || (item as any).courses || [];
      const scriptCount = Array.isArray(courses) ? courses.length : 0;
      stat.totalScripts += scriptCount;

      const modeStr = (item.submissionMode || '').toLowerCase();
      const isPostal = modeStr.includes('post') || modeStr.includes('courier');
      if (isPostal) {
        stat.postalCount += scriptCount;
      } else {
        stat.inPersonCount += scriptCount;
      }

      if (Array.isArray(courses)) {
        for (const c of courses) {
          const cClean = (c || '').trim().toUpperCase();
          if (cClean) {
            stat.courseCounts[cClean] = (stat.courseCounts[cClean] || 0) + 1;
          }
        }
      }

      if (item.submissionDate) {
        if (!stat.latestSubmissionDate || item.submissionDate > stat.latestSubmissionDate) {
          stat.latestSubmissionDate = item.submissionDate;
        }
      }
    }

    const list = Array.from(map.values()).map((s) => ({
      ...s,
      candidatesCount: s.candidateEnrollments.size || 1,
    }));

    // Sort by totalScripts descending, then candidate count
    list.sort((a, b) => b.totalScripts - a.totalScripts || b.candidatesCount - a.candidatesCount);
    return list;
  }, [activeTrackerIntakes, allProgrammes]);

  // Filtered by Tracker Search Query
  const filteredProgrammeStats = useMemo(() => {
    const q = trackerSearchQuery.trim().toUpperCase();
    if (!q) return registeredProgrammeStats;
    return registeredProgrammeStats.filter((p) => {
      const matchCode = p.code.includes(q);
      const matchName = p.name.toUpperCase().includes(q);
      const matchCourse = Object.keys(p.courseCounts).some((c) => c.includes(q));
      return matchCode || matchName || matchCourse;
    });
  }, [registeredProgrammeStats, trackerSearchQuery]);

  // Overall Totals for Tracker
  const trackerTotals = useMemo(() => {
    const uniqueCandidates = new Set<string>();
    let totalScripts = 0;
    let inPersonScripts = 0;
    let postalScripts = 0;
    const coursesSet = new Set<string>();

    for (const item of activeTrackerIntakes) {
      if (item.enrollmentNo && item.enrollmentNo.trim()) {
        uniqueCandidates.add(item.enrollmentNo.trim());
      }
      const courses = item.courseCodes || (item as any).courses || [];
      const count = Array.isArray(courses) ? courses.length : 0;
      totalScripts += count;

      const modeStr = (item.submissionMode || '').toLowerCase();
      const isPostal = modeStr.includes('post') || modeStr.includes('courier');
      if (isPostal) {
        postalScripts += count;
      } else {
        inPersonScripts += count;
      }

      if (Array.isArray(courses)) {
        for (const c of courses) {
          if (c && c.trim()) coursesSet.add(c.trim().toUpperCase());
        }
      }
    }

    return {
      candidatesCount: uniqueCandidates.size,
      scriptsCount: totalScripts,
      programmesCount: registeredProgrammeStats.length,
      coursesCount: coursesSet.size,
      inPersonScripts,
      postalScripts,
    };
  }, [activeTrackerIntakes, registeredProgrammeStats]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* 1. Top Institutional Banner */}
      <div className="bg-zinc-950 text-zinc-200 text-xs border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs">
            <span className="font-extrabold tracking-widest text-amber-400">IGNOU</span>
            <span className="text-zinc-600">•</span>
            <span className="font-medium text-zinc-300">
              Indira Gandhi National Open University (Central University)
            </span>
            <span className="hidden md:inline text-zinc-600">•</span>
            <span className="hidden md:inline text-zinc-400">
              Regional Centre: {settings.regionalCentreCode || 'RC-20 Kohima'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Desk Hours: Friday & Saturday 2:00 PM to 4:00 PM (Except Holidays)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Institutional Navigation Bar */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Centre Identity */}
          <div className="flex items-center gap-3.5">
            <InstitutionalSeal
              size="md"
              className="hover:scale-105 transition-transform duration-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-zinc-950 leading-tight">
                  IGNOU STUDY CENTRE 2033
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                  Dimapur, Nagaland
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-medium leading-tight mt-0.5">
                {settings.institutionName || "S.D. Jain Girls' College, Dimapur"} • Nagaland - 797112
              </p>
            </div>
          </div>

          {/* Quick Nav Links & Terminal Security Gatekeeper Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-zinc-700 mr-2">
              <a href="#tracker" className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 hover:text-indigo-900 transition flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Intake Tracker</span>
              </a>
              <a href="#student-verification" className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 hover:text-indigo-900 transition">
                Verify Intake
              </a>
              <a href="#assignment-intake" className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 hover:text-indigo-900 transition">
                Intake Protocol
              </a>
              <a href="#about-centre" className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 hover:text-indigo-900 transition">
                About Centre
              </a>
              <a href="#contact-location" className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 hover:text-indigo-900 transition">
                Contact & Location
              </a>
            </nav>

            {/* Theme Selector */}
            <ThemeSelector variant="dropdown" />

            {/* The Dedicated Terminal Security Gatekeeper Button */}
            <button
              id="btn-home-terminal-gatekeeper"
              onClick={onOpenGatekeeper}
              className="group relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-linear-to-r from-zinc-900 via-indigo-950 to-zinc-900 hover:from-indigo-950 hover:to-indigo-900 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-indigo-900/20 border border-indigo-800/60 transition-all transform active:scale-98 cursor-pointer"
              title="Click to visit Terminal Security Gatekeeper login page"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition shrink-0">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight">Terminal Security Gatekeeper</span>
                  <span className="hidden md:inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-zinc-300 font-normal hidden sm:block">
                  Staff & Coordinator Authentication
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition shrink-0" />
            </button>

            {/* If user is already authenticated, show Return to Terminal */}
            {isAuthenticated && (
              <button
                onClick={onOpenGatekeeper}
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Return to Active Session</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Executive Hero & Dual Universal Search Hub */}
      <section id="student-verification" className="relative bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 text-white py-10 sm:py-14 overflow-hidden border-b border-slate-800">
        {/* Subtle atmospheric ambient glow */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Institutional Top Kicker */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-900/70 border border-indigo-700/60 text-indigo-200 font-semibold backdrop-blur-xs">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>IGNOU Study Centre 2033</span>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-300 font-medium hidden sm:inline">
                {settings.institutionName || "S.D. Jain Girls' College, Dimapur"}
              </span>
              <span className="text-slate-600 hidden md:inline">•</span>
              <span className="text-amber-300 hidden md:inline font-medium">
                RC-20 Kohima
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Cycle: {currentSession}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 font-medium hidden sm:inline-flex">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Zero-Fee Non-Financial Intake</span>
              </span>
            </div>
          </div>

          {/* Headline & Mission */}
          <div className="pt-6 pb-8 max-w-3xl">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Assignment Operations & Universal Student Verification
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Official intake verification desk for <strong>IGNOU SC-2033</strong>. Search student admission status across Fresh and Re-Registration cohorts, or verify physical assignment intake receipts and tokens recorded across all academic sessions.
            </p>
          </div>

          {/* SIDE-BY-SIDE DUAL UNIVERSAL SEARCH HUB */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* CARD 1: Universal Student Registration Status Search */}
            <div
              id="registration-search-card"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900 relative transition-all duration-200 hover:shadow-indigo-950/20"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Registration Status
                    </h2>
                    <p className="text-xs text-slate-500">
                      Fresh Admissions (1st Yr) & Re-Registrations (2nd / 3rd Yr)
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg shrink-0">
                  {studentRegistrations.length} Profiles
                </span>
              </div>

              {/* Registration Search Input Box */}
              <form onSubmit={handleRegSearchSubmit} className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter Enrolment No. (e.g. 2400030588) or Student Name..."
                    value={regSearchQuery}
                    onChange={(e) => {
                      setRegSearchQuery(e.target.value);
                      if (!regHasSearched) setRegHasSearched(true);
                    }}
                    className="w-full pl-10 pr-20 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs"
                  />
                  {regSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setRegSearchQuery('');
                        setRegHasSearched(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Sample Test Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-400">Quick Test:</span>
                    {studentRegistrations.slice(0, 3).map((item) => (
                      <button
                        key={item.enrollmentNo}
                        type="button"
                        onClick={() => {
                          setRegSearchQuery(item.enrollmentNo);
                          setRegHasSearched(true);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700 border border-slate-200 text-[11px] font-mono font-medium transition cursor-pointer"
                      >
                        {item.enrollmentNo}
                      </button>
                    ))}
                    {studentRegistrations.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegSearchQuery('2400030588');
                          setRegHasSearched(true);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700 border border-slate-200 text-[11px] font-mono font-medium transition cursor-pointer"
                      >
                        2400030588
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs inline-flex items-center gap-1 ml-auto"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Status</span>
                  </button>
                </div>
              </form>

              {/* Registration Search Results */}
              {regHasSearched && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                  {regSearchResults.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1.5">
                      <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-900">
                        No Registration Record Found for &ldquo;{regSearchQuery}&rdquo;
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed max-w-md mx-auto">
                        Candidate not found in current 2024–2026 Fresh or Re-Registration master.
                        <strong className="text-slate-800 block mt-1">Past Student Walk-In Policy:</strong>
                        If you are an existing or past student admitted prior to Jan 2024, assignment submission is permitted directly at Desk Counter 1 as a walk-in candidate without pre-registration!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                        <span>Matching Students: <strong>{regSearchResults.length}</strong></span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Official Admission Record
                        </span>
                      </div>

                      {regSearchResults.map((reg) => (
                        <div
                          key={reg.id}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 transition shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 pb-2">
                            <div>
                              <span className="font-bold text-slate-950 text-sm block">{reg.studentName}</span>
                              <span className="font-mono text-indigo-950 font-bold text-xs">{reg.enrollmentNo}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Programme</span>
                              <span className="text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                {reg.programmeCode}
                              </span>
                            </div>
                          </div>

                          {/* Zero-Pill Unboxed Metadata with subtle bullets */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-600">
                            <span className="font-semibold text-slate-900">
                              {reg.cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span>{reg.academicYear}</span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="font-medium text-slate-800">Cycle: {reg.session}</span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {reg.status || 'Confirmed'}
                            </span>
                          </div>

                          {/* Enrolled Courses */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Registered Courses ({reg.courseCodes.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {reg.courseCodes.map((code, idx) => (
                                <span
                                  key={`${code}-${idx}`}
                                  className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10.5px] text-slate-500">
                            <span>Centre: SC-{reg.studyCentreCode || '2033'} · RC-{reg.regionalCentreCode || '20'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIntakeSearchQuery(reg.enrollmentNo);
                                setIntakeHasSearched(true);
                              }}
                              className="text-indigo-700 hover:text-indigo-950 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Intake Submissions</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CARD 2: Universal Assignment Intake & Receipt Status Search */}
            <div
              id="intake-search-card"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900 relative transition-all duration-200 hover:shadow-emerald-950/20"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Assignment Intake Status
                    </h2>
                    <p className="text-xs text-slate-500">
                      Official stamped receipts & tokens recorded across all sessions
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                  {allIntakes.length} Intake Receipts
                </span>
              </div>

              {/* Intake Search Input Box */}
              <form onSubmit={handleIntakeSearchSubmit} className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter Enrolment No. or Token No. (e.g. SC2033-JUL26-0001)..."
                    value={intakeSearchQuery}
                    onChange={(e) => {
                      setIntakeSearchQuery(e.target.value);
                      if (!intakeHasSearched) setIntakeHasSearched(true);
                    }}
                    className="w-full pl-10 pr-20 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
                  />
                  {intakeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setIntakeSearchQuery('');
                        setIntakeHasSearched(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Sample Test Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-400">Quick Test:</span>
                    {allIntakes.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIntakeSearchQuery(item.tokenNo || item.enrollmentNo);
                          setIntakeHasSearched(true);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 text-[11px] font-mono font-medium transition cursor-pointer"
                      >
                        {item.tokenNo || item.enrollmentNo}
                      </button>
                    ))}
                    {allIntakes.length === 0 && (
                      <span className="text-slate-400 italic">Ready for intake entry</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs inline-flex items-center gap-1 ml-auto"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Verify Intake</span>
                  </button>
                </div>
              </form>

              {/* Intake Search Results */}
              {intakeHasSearched && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                  {verifiedViaQr && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                            <span>Digital QR Verification Authenticated</span>
                            <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-900 rounded text-[10px] font-mono font-bold">
                              SC-2033
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Official assignment submission acknowledgment validated from Study Centre 2033 intake ledger.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVerifiedViaQr(false)}
                        className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold p-1 cursor-pointer"
                        title="Dismiss notification"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {intakeSearchResults.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1.5">
                      <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-900">
                        No Intake Records Found for &ldquo;{intakeSearchQuery}&rdquo;
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed max-w-md mx-auto">
                        Please verify that the Enrolment Number or Token Number is entered correctly. If you recently submitted your physical scripts, allow up to 24 hours for synchronization, or visit Desk Counter 1 at S.D. Jain Girls&apos; College with your physical slip.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                        <span>Matching Intake Records: <strong>{intakeSearchResults.length}</strong></span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Official Stamped Entry
                        </span>
                      </div>

                      {intakeSearchResults.map((rec) => {
                        const studentName = rec.studentName || (rec as any).candidateName || 'Candidate';
                        const programmeCode = rec.programmeCode || (rec as any).programme || '—';
                        const coursesList = rec.courseCodes || (rec as any).courses || [];

                        return (
                          <div
                            key={rec.id}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-400 transition shadow-2xs space-y-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 pb-2">
                              <div>
                                <span className="font-bold text-slate-950 text-sm block">{studentName}</span>
                                <span className="font-mono text-indigo-950 font-bold text-xs">{rec.enrollmentNo}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                                  {rec.tokenNo}
                                </span>
                                <span className="text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded shadow-2xs">
                                  {rec.session}
                                </span>
                              </div>
                            </div>

                            {/* Zero-Pill Unboxed Metadata with subtle bullets */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-600">
                              <span className="font-semibold text-slate-900">Prog: {programmeCode}</span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span>Date: {formatDate(rec.submissionDate)}</span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span>Mode: {rec.submissionMode || 'In-Person (Desk)'}</span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="text-emerald-700 font-semibold">{rec.status || 'Received'}</span>
                            </div>

                            {/* Course Badges */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                Verified Courses ({coursesList.length} scripts):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {coursesList.map((course, cIdx) => {
                                  const isPrac = (rec.practicalCourses || []).includes(course);
                                  return (
                                    <span
                                      key={`${course}-${cIdx}`}
                                      className={`px-2 py-0.5 border rounded text-[11px] font-mono font-bold ${
                                        isPrac
                                          ? 'bg-purple-50 text-purple-900 border-purple-200'
                                          : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                      }`}
                                    >
                                      {course} {isPrac ? '(Lab)' : '(TMA)'}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10.5px] text-slate-500">
                              <span>Intake Desk: SC-{settings.centreCode} • Non-Financial</span>
                              <button
                                type="button"
                                onClick={() => openReceiptModal(rec)}
                                className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>View Official Slip</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-8 mt-8 border-t border-slate-800/80">
            <a
              href="#tracker"
              className="group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-left overflow-hidden">
                <span className="text-xs font-bold text-white block truncate">Submission Tracker</span>
                <span className="text-[11px] text-slate-400 block truncate">Programmes & script tally</span>
              </div>
            </a>

            <a
              href="#assignment-intake"
              className="group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left overflow-hidden">
                <span className="text-xs font-bold text-white block truncate">Intake Protocol</span>
                <span className="text-[11px] text-slate-400 block truncate">Submission rules & guidelines</span>
              </div>
            </a>

            <a
              href="#about-centre"
              className="group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-left overflow-hidden">
                <span className="text-xs font-bold text-white block truncate">Study Centre 2033</span>
                <span className="text-[11px] text-slate-400 block truncate">S.D. Jain Girls' College</span>
              </div>
            </a>

            <button
              type="button"
              onClick={() => setShowSetupWizard(true)}
              className="group p-3.5 rounded-xl bg-slate-900/90 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-700/60 transition flex items-center gap-3 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="text-left overflow-hidden">
                <span className="text-xs font-bold text-emerald-300 block truncate">Google Sheets Setup</span>
                <span className="text-[11px] text-slate-400 block truncate">Database wizard</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Centre Operational Metrics Strip */}
      <section className="bg-slate-50 border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">Registered Students</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{studentRegistrations.length}</span>
                <span className="text-xs text-indigo-700 font-semibold">Fresh & Re-Reg</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Admissions master source</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">Intake Receipts</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{allIntakes.length}</span>
                <span className="text-xs text-emerald-700 font-semibold">Acknowledged</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Official tokens recorded</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">Academic Programmes</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{allProgrammes.length}</span>
                <span className="text-xs text-amber-700 font-semibold">Active Degrees</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">B.A., B.Com., M.A. & Diplomas</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">Desk Policy</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-black text-emerald-700">Zero-Fee Desk</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Non-financial intake receipt</p>
            </div>
          </div>
        </div>
      </section>


      {/* 5. Registered Programmes & Candidate / Scripts Intake Tracker (Actual Submission Register) */}
      <section id="tracker" className="py-12 sm:py-16 bg-zinc-900 text-white border-b border-zinc-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>SC-2033 Official Submission Register</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Learner & Assignment Scripts Tracker
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl">
                Real-time tracker displaying registered programmes, candidate counts, and assignment scripts received from learners based directly on the actual SC-2033 counter submission register.
              </p>
            </div>

            {/* Quick Session Filter Toggles */}
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/80 p-1.5 rounded-2xl border border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setTrackerSession('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  trackerSession === 'ALL'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                All Cycles ({allIntakes.length})
              </button>
              {availableSubmissionSessions.map((sess) => (
                <button
                  key={sess}
                  type="button"
                  onClick={() => setTrackerSession(sess)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    trackerSession === sess
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {sess}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2 font-medium">
                <span>Candidates Received</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                {trackerTotals.candidatesCount}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Unique learners registered in intake register
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/80"></div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2 font-medium">
                <span>Scripts Received</span>
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                {trackerTotals.scriptsCount}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Physical course booklets received & logged
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/80"></div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2 font-medium">
                <span>Registered Programmes</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-300 tracking-tight font-mono">
                {trackerTotals.programmesCount}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Derived exclusively from assignment submissions
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/80"></div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2 font-medium">
                <span>Intake Channels</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-lg sm:text-xl font-black text-white tracking-tight font-mono">
                {trackerTotals.inPersonScripts} <span className="text-xs font-normal text-zinc-400">Desk</span> / {trackerTotals.postalScripts} <span className="text-xs font-normal text-zinc-400">Post</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Across {trackerTotals.coursesCount} distinct course modules
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500/80"></div>
            </div>
          </div>

          {/* Search / Filter bar for programmes within tracker */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter programme or course (e.g. MEG, BAG)..."
                value={trackerSearchQuery}
                onChange={(e) => setTrackerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 font-mono"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 w-full sm:w-auto justify-between sm:justify-end">
              <span>
                Active Registered Programmes:{' '}
                <strong className="text-white">{filteredProgrammeStats.length}</strong>
              </span>
              <a
                href="#student-verification"
                className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition"
              >
                <span>Verify Your Slip</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Registered Programmes Cards Grid */}
          {filteredProgrammeStats.length === 0 ? (
            <div className="p-8 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-3xl text-center space-y-2">
              <Inbox className="w-8 h-8 text-zinc-500 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-300">
                No programmes matching &ldquo;{trackerSearchQuery}&rdquo;
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                No assignment submissions match your search query for the selected cycle. Clear the filter or select &quot;All Cycles&quot;.
              </p>
              {trackerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTrackerSearchQuery('')}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-xl font-semibold transition cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProgrammeStats.map((prog) => {
                const isExpanded = !!expandedProgrammes[prog.code];
                const scriptSharePercent = trackerTotals.scriptsCount > 0
                  ? Math.round((prog.totalScripts / trackerTotals.scriptsCount) * 100)
                  : 0;
                const avgPerCandidate = (prog.totalScripts / (prog.candidatesCount || 1)).toFixed(1);

                return (
                  <div
                    key={prog.code}
                    className="bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-5 transition flex flex-col justify-between shadow-md"
                  >
                    <div>
                      {/* Card Header: Code & Level */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm sm:text-base text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                            {prog.code}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {prog.level}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {scriptSharePercent}% of total scripts
                        </span>
                      </div>

                      {/* Programme Name */}
                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 mb-3">
                        {prog.name}
                      </h3>

                      {/* Scripts & Candidate Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/90 rounded-xl border border-zinc-800/80 mb-3 text-center">
                        <div>
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Candidates</span>
                          <span className="text-base font-black text-white font-mono">{prog.candidatesCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Scripts</span>
                          <span className="text-base font-black text-emerald-400 font-mono">{prog.totalScripts}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Avg/Learner</span>
                          <span className="text-base font-black text-amber-300 font-mono">{avgPerCandidate}</span>
                        </div>
                      </div>

                      {/* Visual Intake Share Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Centre Intake Volume Share</span>
                          <span className="font-mono text-zinc-300">{prog.totalScripts} / {trackerTotals.scriptsCount} scripts</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.max(scriptSharePercent, 6)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Channel breakdown */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-3 border-b border-zinc-800/80">
                        <span>Desk Counter: <strong className="text-zinc-200">{prog.inPersonCount}</strong></span>
                        <span>Postal / Speed Post: <strong className="text-zinc-200">{prog.postalCount}</strong></span>
                      </div>

                      {/* Submitted Courses Badges */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">
                            Courses Received ({Object.keys(prog.courseCounts).length}):
                          </span>
                          {Object.keys(prog.courseCounts).length > 3 && (
                            <button
                              type="button"
                              onClick={() => toggleExpandProgramme(prog.code)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Show Less' : 'View All'}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(prog.courseCounts)
                            .slice(0, isExpanded ? undefined : 4)
                            .map(([cCode, count]) => (
                              <span
                                key={cCode}
                                className="px-2 py-0.5 bg-zinc-900 text-zinc-200 border border-zinc-700/80 rounded-md font-mono text-[11px] flex items-center gap-1.5"
                              >
                                <span className="font-bold text-white">{cCode}</span>
                                <span className="bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded text-[10px] font-bold">
                                  {count}
                                </span>
                              </span>
                            ))}
                          {!isExpanded && Object.keys(prog.courseCounts).length > 4 && (
                            <button
                              type="button"
                              onClick={() => toggleExpandProgramme(prog.code)}
                              className="px-2 py-0.5 bg-zinc-900 text-amber-400 border border-zinc-800 rounded-md font-mono text-[10px] font-bold cursor-pointer"
                            >
                              +{Object.keys(prog.courseCounts).length - 4} more
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 mt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>
                        Latest:{' '}
                        <strong className="text-zinc-200">
                          {prog.latestSubmissionDate ? formatDate(prog.latestSubmissionDate) : 'Logged'}
                        </strong>
                      </span>
                      <a
                        href="#student-verification"
                        className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-0.5 transition"
                      >
                        <span>Check Receipt</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Info Note */}
          <div className="mt-8 p-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Counter 1 Operating Hours: <strong>Friday & Saturday 2:00 PM to 4:00 PM (Except Holidays)</strong>. Submissions are entered immediately into the electronic intake register.
              </span>
            </div>
            <a
              href="#student-verification"
              className="px-3.5 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl font-bold transition text-xs shrink-0 inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify Your Enrollment</span>
            </a>
          </div>
        </div>
      </section>

      {/* 6. About Study Centre SC-2033 & Host College */}
      <section id="about-centre" className="py-12 sm:py-16 bg-zinc-100/80 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Institutional Profile</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                About IGNOU Study Centre 2033, Dimapur
              </h2>

              <div className="space-y-3 text-sm text-zinc-700 leading-relaxed">
                <p>
                  IGNOU Study Centre 2033 is a recognized study centre established under the jurisdiction of the Regional Centre Kohima (RC-20) of Indira Gandhi National Open University. Since, December 2014, the centre has been dedicated to extending quality higher education and distance learning opportunities to thousands of girls’ students across Nagaland and neighbouring regions.
                </p>
                <p>
                  The centre is hosted at the esteemed campus of S.D. Jain Girls&apos; College, Dimapur, situated centrally at Jain Temple Road. The host college provides institutional infrastructure, lecture halls for academic counselling sessions, evaluation cells, and administrative support for distance learners.
                </p>
                <p>
                  Under the coordination of the coordinator, the centre functions as a single-window service hub for student inquiries, assignment intake desk operations, continuous evaluation, and terminal award submissions.
                </p>
              </div>

              {/* Key Service Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1">
                    <FileCheck2 className="w-4 h-4 text-indigo-700" />
                    <span>Assignment Counter Desk</span>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Instant physical verification, multi-course enrollment logging, and official computer-printed non-financial receipts.
                  </p>
                </div>

                <div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1">
                    <Award className="w-4 h-4 text-indigo-700" />
                    <span>Evaluation & SED Awards</span>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Systematic packet bundling, evaluator allotment, grade award sheets, and marks transmission to Regional Centre Kohima.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Centre Highlights Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-zinc-300 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-950">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Study Centre Key Facts</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900">
                    Active Registry
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Study Centre Code:</span>
                    <span className="font-mono font-bold text-indigo-950">SC-2033</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Regional Centre:</span>
                    <span className="font-semibold text-zinc-900">RC-20 Kohima</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Host Institution:</span>
                    <span className="font-semibold text-zinc-900 text-right">{settings.institutionName || "S.D. Jain Girls' College, Dimapur"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Coordinator:</span>
                    <span className="font-semibold text-zinc-900">{settings.coordinatorName || 'Dr. Sant K. Gupta'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Current Academic Cycle:</span>
                    <span className="font-bold text-indigo-900">{currentSession}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Counter Nature:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Strictly Zero-Fee</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-500 font-medium">Registered Programmes:</span>
                    <span className="font-bold text-zinc-900">{registeredProgrammeStats.length} Programmes Active in Submissions</span>
                  </div>
                </div>

                {/* Coordinator Message Box */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Coordinator&apos;s Advisory to Students</span>
                  </div>
                  <p className="text-zinc-700 text-[11px] leading-relaxed">
                    &ldquo;All learners are advised to submit handwritten assignments well before term-end deadlines. Always collect your computer-generated official receipt at Desk Counter 1 and keep it safe until grades reflect on your IGNOU Grade Card.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Assignment Intake Protocol & Student Guidelines */}
      <section id="assignment-intake" className="py-12 sm:py-16 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold uppercase tracking-wider">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Standard Operating Procedure</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              Assignment Submission Protocol
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600">
              Follow these standard 4 steps when preparing and submitting course assignments at Study Centre 2033.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 relative space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-zinc-950">Script Preparation</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Assignments must be original handwritten work on A4 ruled/plain sheets. Staple or tag each course assignment separately.
              </p>
              <div className="text-[11px] text-zinc-500 bg-white p-2 rounded-lg border border-zinc-200">
                <strong>Mandatory Cover:</strong> Enrolment No, Candidate Name, Programme, Course Code & SC-2033.
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 relative space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                2
              </div>
              <h3 className="text-sm font-bold text-zinc-950">Desk Counter 1 Intake</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Present your physical scripts at Counter 1 during operating hours (Friday & Saturday 2:00 PM to 4:00 PM except Holidays). Outstation students may send via Speed Post.
              </p>
              <div className="text-[11px] text-zinc-500 bg-white p-2 rounded-lg border border-zinc-200">
                <strong>Zero-Fee:</strong> No submission charges or processing fees are ever collected at the counter.
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 relative space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-zinc-950">Official Receipt</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                The intake desk official inputs your courses into the central register and generates an instant stamped Computerized Acknowledgment Slip.
              </p>
              <div className="text-[11px] text-zinc-500 bg-white p-2 rounded-lg border border-zinc-200">
                <strong>Proof of Submission:</strong> Retain this stamped receipt safely until term-end exam results.
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 relative space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                4
              </div>
              <h3 className="text-sm font-bold text-zinc-950">Evaluation & Award</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Scripts are bundled and assigned to authorized Academic Counsellors. Evaluated marks are verified and sent to Regional Centre Kohima.
              </p>
              <div className="text-[11px] text-zinc-500 bg-white p-2 rounded-lg border border-zinc-200">
                <strong>SED Transmission:</strong> Final awards are reflected on the official IGNOU grade portal.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Contact Information, Location & Desk Hours */}
      <section id="contact-location" className="py-12 sm:py-16 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contact Details */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contact & Location</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                  Reach Study Centre SC-2033
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                  Have questions regarding your assignment status, course counselling, or submission receipts? Contact our desk.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Physical Location */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <MapPin className="w-4 h-4 text-indigo-700" />
                    <span>Desk Location</span>
                  </div>
                  <p className="text-xs text-zinc-700 font-medium leading-relaxed">
                    IGNOU Study Centre 2033<br />
                    {settings.institutionName || "S.D. Jain Girls' College Campus"}<br />
                    Jain Temple Road,<br />
                    Dimapur, Nagaland - 797112
                  </p>
                </div>

                {/* Operating Timings */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Clock className="w-4 h-4 text-indigo-700" />
                    <span>Desk Operating Timings</span>
                  </div>
                  <p className="text-xs text-zinc-700 font-medium leading-relaxed">
                    <strong>Friday & Saturday:</strong> 2:00 PM to 4:00 PM (Except Holidays)<br />
                    <strong>Other Days:</strong> Closed<br />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Operating hours: Friday & Saturday 2:00 PM to 4:00 PM except Holidays.
                    </span>
                  </p>
                </div>

                {/* Study Centre Officials & Administrative Staff Directory */}
                <div className="sm:col-span-2 space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-700 shrink-0" />
                      <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                        Study Centre Officials & Staff
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">SC-2033 Administration</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. Co-ordinator */}
                    <div className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl space-y-2 transition shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
                          Co-ordinator
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Executive Head</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-950">Dr. Sant Kumar Gupta</h4>
                        <div className="text-xs text-slate-700 font-medium font-mono mt-1">
                          M: 9436013686
                        </div>
                      </div>
                    </div>

                    {/* 2. Asst Co-ordinator */}
                    <div className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl space-y-2 transition shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200">
                          Asst Co-ordinator
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Academic Operations</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-950">Shri Raju Deb</h4>
                        <div className="text-xs text-slate-700 font-medium font-mono mt-1">
                          M: 9856827642, 8787768196
                        </div>
                      </div>
                    </div>

                    {/* 3. Clerical Assistants */}
                    <div className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 sm:col-span-2 transition shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                          Clerical Assistants
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Counter Intake & Register Desk</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <div className="text-xs font-bold text-slate-900">Shri Binay Shankar Singh</div>
                          <div className="text-xs text-slate-700 font-mono font-medium">M: 8787500493</div>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <div className="text-xs font-bold text-slate-900">Ms Ariale</div>
                          <div className="text-xs text-slate-700 font-mono font-medium">M: 8974460993</div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Support Staff - Peons */}
                    <div className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 sm:col-span-2 transition shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          Peons
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Script Handling & Dispatch Support</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">Shri Shambu Gautam</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">Smti Parmila Mahato</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">Smti Bimala Gautam</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Security Gatekeeper Access Box */}
            <div className="lg:col-span-5">
              <div className="bg-linear-to-b from-zinc-900 to-indigo-950 text-white rounded-3xl p-6 shadow-2xl border border-zinc-700/80 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-white">
                      Terminal Security Gatekeeper
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Restricted Administrative & Staff Area
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  This gatekeeper secures the institutional operations workspace. Study Centre officials, desk intake operators, and academic counsellors must provide their institutional PIN to authenticate.
                </p>

                <div className="space-y-2 text-xs text-zinc-300 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Desk Official Terminal (Intake Desk & Receipts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Course Ledger & Evaluator Allotment Packets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Marks Entry & SED Award Sheet Generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Remuneration Billing & Sanction Vouchers</span>
                  </div>
                </div>

                <button
                  id="btn-gatekeeper-footer"
                  onClick={onOpenGatekeeper}
                  className="w-full py-3.5 px-4 bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-sm rounded-xl shadow-lg hover:shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-zinc-950" />
                  <span>Click Here: Terminal Security Gatekeeper</span>
                  <ChevronRight className="w-4 h-4 text-zinc-950" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Institutional Footer */}
      <footer className="bg-zinc-950 text-zinc-400 text-xs py-8 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-900 flex items-center justify-center font-black text-white text-xs border border-indigo-700">
                2033
              </div>
              <div>
                <span className="font-bold text-white block">IGNOU Study Centre 2033</span>
                <span className="text-[11px] text-zinc-400">
                  {settings.institutionName || "S.D. Jain Girls' College, Dimapur"} • Nagaland
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <a
                href="#tracker"
                className="hover:text-amber-400 flex items-center gap-1 transition font-semibold"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Intake Tracker</span>
              </a>
              <span>•</span>
              <a
                href="#student-verification"
                className="hover:text-white flex items-center gap-1 transition"
              >
                <span>Verify Intake</span>
              </a>
              <span>•</span>
              <a
                href="http://www.ignou.ac.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 transition"
              >
                <span>IGNOU HQ Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <a
                href="http://rckohima.ignou.ac.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 transition"
              >
                <span>RC Kohima</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowSetupWizard(true)}
                className="hover:text-amber-400 text-zinc-400 flex items-center gap-1 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                <span>Sheets DB Setup Guide</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500">
            <p>
              © {new Date().getFullYear()} Indira Gandhi National Open University (IGNOU) SC-2033. All rights reserved.
            </p>
            <p>
              Coordinator: {settings.coordinatorName || 'Dr. Sant K. Gupta'} • S.D. Jain Girls&apos; College, Dimapur
            </p>
          </div>
        </div>
      </footer>

      {/* Fresh Google Sheets Database Setup Wizard Modal */}
      {showSetupWizard && (
        <NewDatabaseSetupWizard
          isOpen={showSetupWizard}
          onClose={() => setShowSetupWizard(false)}
          defaultSession={currentSession}
        />
      )}
    </div>
  );
};
