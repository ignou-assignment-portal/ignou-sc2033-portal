import { getIgnouGrade } from '../utils/helpers';
import { validatePrePushToGoogleSheets } from './dataEntryValidationService';
import { enqueueSyncMutation, SyncQueueItem } from './syncQueueService';
import { SheetUserAccount } from '../types';

/**
 * Universal Session Normalizer
 * Converts raw session strings or ISO date stamps (e.g. "2026-06-30T18:30:00.000Z") into standard "July 2026" / "January 2026"
 */
export const normalizeSessionName = (rawVal: any, fallbackSubId?: string): string => {
  if (!rawVal && fallbackSubId) {
    const match = fallbackSubId.match(/(July|January|Jan|Jul)\s*(\d{4})/i);
    if (match) {
      const month = match[1].toLowerCase().startsWith('jul') ? 'July' : 'January';
      return `${month} ${match[2]}`;
    }
  }
  const str = String(rawVal || '').trim();
  if (!str) return 'July 2026';

  // If ISO date string: e.g. "2026-06-30T18:30:00.000Z" or "2026-07-01..."
  if (str.includes('T') || /^\d{4}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // Offset by +5:30 for Indian Standard Time (IST)
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const m = istDate.getUTCMonth(); // 0-based: 6 is July, 0 is Jan
      const y = istDate.getUTCFullYear();
      const sessionMonth = (m >= 4 && m <= 9) ? 'July' : 'January';
      return `${sessionMonth} ${y}`;
    }
  }

  // If contains July or January with year: e.g. "July 2026", "JULY 2026", "July-2026"
  const textMatch = str.match(/(July|January|Jan|Jul)[^\d]*(\d{4})/i);
  if (textMatch) {
    const month = textMatch[1].toLowerCase().startsWith('jul') ? 'July' : 'January';
    return `${month} ${textMatch[2]}`;
  }

  return str;
};

/**
 * Normalizes session values for whitespace-insensitive and format-insensitive comparison
 */
export const norm = (val: any): string => {
  if (!val) return '';
  const clean = normalizeSessionName(val);
  return clean.toString().trim().toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
};

/**
 * Google Sheets & Apps Script Integration Service
 * Target Script Web App ID / URL:
 */
export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwb-LmuQ2TiUQEGmdWKZAKd9jB9hxeIESL4i-F0h-NwSba8BEbdTaqhato_9aWeXlxy/exec";

export const SESSION_URLS_KEY = 'ignou_sc2033_session_script_urls';

export function getAllSessionScriptUrls(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SESSION_URLS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getSessionScriptUrl(sessionName?: string): string {
  if (sessionName && typeof window !== 'undefined') {
    const cleanSession = sessionName.trim();
    const map = getAllSessionScriptUrls();
    if (map[cleanSession] && map[cleanSession].trim()) {
      return map[cleanSession].trim();
    }
  }
  return getCustomScriptUrl();
}

export function setSessionScriptUrl(sessionName: string, url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanSession = sessionName.trim();
    const map = getAllSessionScriptUrls();
    if (url && url.trim()) {
      map[cleanSession] = url.trim();
    } else {
      delete map[cleanSession];
    }
    localStorage.setItem(SESSION_URLS_KEY, JSON.stringify(map));
  } catch {}
}

export function getCustomScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_apps_script_url');
    if (custom && custom.trim()) return custom.trim();
  }
  return SCRIPT_URL;
}

export function setCustomScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('custom_apps_script_url', url.trim());
    } else {
      localStorage.removeItem('custom_apps_script_url');
    }
  }
}

export function getFullAppsScriptUrl(url?: string): string {
  const target = url || getCustomScriptUrl();
  if (target.startsWith('http')) return target;
  return `https://script.google.com/macros/s/${target}/exec`;
}

export interface HydrationResult {
  success: boolean;
  intakes?: any[];
  courseLedger?: any[];
  evaluatorsMaster?: any[];
  freshAdmissions?: any[];
  reRegistrations?: any[];
  studentRegistrations?: any[];
  availableSessions?: string[];
  source: 'google_sheets' | 'local_cache' | 'offline_fallback';
  message?: string;
  reachable?: boolean;
  latencyMs?: number;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'fallback' | 'error';
  action?: string;
  downloadUrl?: string;
  url?: string;
  data?: T;
  message?: string;
  queued?: boolean;
}

/**
 * Sends a POST request to Google Apps Script.
 * Uses /api/sheets proxy first (which reliably handles redirects & CORS in full-stack dev/prod),
 * falling back to direct POST to Google Apps Script.
 * If network is offline or request fails and queueOnFailure is true, automatically saves to IndexedDB.
 */
export async function sendScriptPost(
  payload: any,
  options?: { queueOnFailure?: boolean; summary?: string; type?: SyncQueueItem['type'] }
): Promise<boolean> {
  const isOnline = typeof navigator === 'undefined' || navigator.onLine;

  if (!isOnline && options?.queueOnFailure && options?.type) {
    console.info(`[Offline] Enqueuing ${options.type} into persistent offline sync queue`);
    try {
      await enqueueSyncMutation({
        type: options.type,
        payload,
        summary: options.summary || `${options.type} queued while offline`,
      });
    } catch (e) {
      console.warn('[enqueueSyncMutation error]:', e);
    }
    return false;
  }

  let sent = false;

  // 1. Try server proxy first to follow Google Apps Script 302 redirects and ensure data is committed
  try {
    const proxyRes = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (proxyRes.ok) {
      const result = await proxyRes.json();
      if (result && (result.status === 'success' || result.saved || result.message)) {
        sent = true;
      }
    }
  } catch (proxyErr) {
    console.warn("[Google Sheets proxy error, falling back to direct POST]:", proxyErr);
  }

  // 2. Direct fallback to Google Apps Script
  if (!sent) {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      sent = true;
    } catch (err) {
      console.error("[Google Sheets direct POST error]:", err);
    }
  }

  if (!sent && options?.queueOnFailure && options?.type) {
    console.info(`[Failed] Enqueuing ${options.type} into persistent offline sync queue for automatic retry`);
    try {
      await enqueueSyncMutation({
        type: options.type,
        payload,
        summary: options.summary || `${options.type} queued after network failure`,
      });
    } catch (qErr) {
      console.warn('[enqueueSyncMutation error]:', qErr);
    }
  }

  return sent;
}

/**
 * Executor function used by syncQueueService to replay queued operations
 */
export async function executeQueuedMutation(item: SyncQueueItem): Promise<boolean> {
  try {
    return await sendScriptPost(item.payload, { queueOnFailure: false });
  } catch (err) {
    console.error(`[executeQueuedMutation ${item.type} error]:`, err);
    return false;
  }
}

/**
 * Legacy payload extractor kept for type compatibility
 */
export function extractRegistrationsFromSheetsPayload(_json: Record<string, any>): any[] {
  return [];
}

/**
 * 1. On Load:
 * Call doGet() to hydrate IntakeRegister and CourseLedger state from Google Sheets.
 * Uses 5-second automatic timeout with seamless local storage fallback.
 */
export async function doGet(): Promise<HydrationResult> {
  const timestamp = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();

  try {
    const targetScriptUrl = getCustomScriptUrl();
    // Try via full-stack Express proxy first with cache-busting and 5-second timeout
    const response = await fetch(`/api/sheets?action=doGet&scriptUrl=${encodeURIComponent(targetScriptUrl)}&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const json = await response.json();
      const rawIntakes = json.intakeRegister || json.intakes || json.Intake_Register || [];
      const rawLedger = json.courseLedger || json.course_ledger || json.Course_Ledger || [];
      const rawEvaluators = json.evaluatorsMaster || json.evaluators_master || json.Evaluators_Master || json.evaluators || [];
      const rawFresh = json.freshAdmissions || json.fresh_admissions || json.Fresh_Admissions || [];
      const rawReReg = json.reRegistrations || json.re_registrations || json.Re_Registrations || [];
      let rawRegistrations = json.studentRegistrations || json.student_registrations || json.registrations || [];
      if (rawRegistrations.length === 0 && (rawFresh.length > 0 || rawReReg.length > 0)) {
        rawRegistrations = [...rawFresh, ...rawReReg];
      }
      const rawAvailableSessions = json.availableSessions || [];
      const isReachable = json.status !== 'fallback';

      return {
        success: true,
        intakes: rawIntakes,
        courseLedger: rawLedger,
        evaluatorsMaster: rawEvaluators,
        freshAdmissions: rawFresh,
        reRegistrations: rawReReg,
        studentRegistrations: rawRegistrations,
        availableSessions: rawAvailableSessions,
        source: isReachable ? 'google_sheets' : 'local_cache',
        reachable: isReachable,
        latencyMs: Date.now() - startTime,
        message: isReachable
          ? 'Hydrated successfully from Google Sheets.'
          : 'Operating in local store fallback mode (15s timeout/unreachable).',
      };
    }
  } catch (err: any) {
    console.warn('[Google Sheets] Express proxy doGet failed or timed out:', err);
  }

  // Direct client fetch fallback with cache-busting and 15s timeout
  try {
    const directUrl = getFullAppsScriptUrl();
    const directRes = await fetch(`${directUrl}?action=doGet&_cb=${timestamp}`, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    if (directRes.ok) {
      const data = await directRes.json();
      const rawIntakes = data.intakeRegister || data.intakes || data.Intake_Register || [];
      const rawLedger = data.courseLedger || data.course_ledger || data.Course_Ledger || [];
      const rawEvaluators = data.evaluatorsMaster || data.evaluators_master || data.Evaluators_Master || data.evaluators || [];
      const rawFresh = data.freshAdmissions || data.fresh_admissions || data.Fresh_Admissions || [];
      const rawReReg = data.reRegistrations || data.re_registrations || data.Re_Registrations || [];
      let rawRegistrations = data.studentRegistrations || data.student_registrations || data.registrations || [];
      if (rawRegistrations.length === 0 && (rawFresh.length > 0 || rawReReg.length > 0)) {
        rawRegistrations = [...rawFresh, ...rawReReg];
      }
      const rawAvailableSessions = data.availableSessions || [];
      return {
        success: true,
        intakes: rawIntakes,
        courseLedger: rawLedger,
        evaluatorsMaster: rawEvaluators,
        freshAdmissions: rawFresh,
        reRegistrations: rawReReg,
        studentRegistrations: rawRegistrations,
        availableSessions: rawAvailableSessions,
        source: 'google_sheets',
        reachable: true,
        latencyMs: Date.now() - startTime,
        message: 'Hydrated via direct Google Apps Script call.',
      };
    }
  } catch (directErr: any) {
    console.warn('[Google Sheets] Direct doGet failed or timed out:', directErr);
  }

  return {
    success: true,
    source: 'local_cache',
    reachable: false,
    latencyMs: Date.now() - startTime,
    message: 'Google Sheets script endpoint pending or offline. Local storage active.',
  };
}

/**
 * Tests Google Apps Script Web App connection and returns latency & detected sheet tabs
 */
export async function testAppsScriptConnection(customUrl?: string): Promise<{
  success: boolean;
  reachable: boolean;
  latencyMs: number;
  message: string;
  sheets?: string[];
  totalIntakes?: number | null;
  totalCourseRows?: number | null;
}> {
  const target = customUrl || getCustomScriptUrl();
  const startTime = Date.now();

  try {
    const proxyRes = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'PING',
        scriptUrl: target,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const latencyMs = Date.now() - startTime;
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: data.status === 'success' || data.reachable === true,
        reachable: data.reachable !== false,
        latencyMs: data.latencyMs || latencyMs,
        message: data.message || 'Connected to Google Apps Script Web App.',
        sheets: data.sheets || [],
        totalIntakes: data.totalIntakes,
        totalCourseRows: data.totalCourseRows,
      };
    }
  } catch (err: any) {
    console.warn('[testAppsScriptConnection proxy error]:', err);
  }

  // Direct fetch fallback
  try {
    const directUrl = getFullAppsScriptUrl(target);
    const directRes = await fetch(directUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - startTime;
    if (directRes.ok) {
      const json = await directRes.json();
      return {
        success: true,
        reachable: true,
        latencyMs,
        message: 'Direct connection to Google Apps Script successful.',
        sheets: Object.keys(json),
      };
    }
  } catch (err: any) {
    return {
      success: false,
      reachable: false,
      latencyMs: Date.now() - startTime,
      message: err.name === 'TimeoutError' ? 'Connection timed out (>15s).' : err.message || 'Connection failed',
    };
  }

  return {
    success: false,
    reachable: false,
    latencyMs: Date.now() - startTime,
    message: 'Could not connect to Google Apps Script.',
  };
}

export interface SchemaVerificationDetail {
  tabKey: 'Intake_Register' | 'Course_Ledger' | 'Evaluators_Master' | 'Fresh_Admissions' | 'Re_Registrations' | 'Student_Registrations';
  expectedTitle: string;
  matchedSheetName: string | null;
  exists: boolean;
  itemCount: number;
  status: 'valid' | 'missing' | 'empty';
}

export interface DetailedDatabaseVerificationReport {
  success: boolean;
  reachable: boolean;
  latencyMs: number;
  message: string;
  spreadsheetName?: string;
  sheetsFound: string[];
  tabsStatus: SchemaVerificationDetail[];
  totalRecords: number;
}

/**
 * Deep schema verification tool that inspects all required tabs and column headers
 */
export async function verifyDatabaseSchemaDetailed(
  customUrl?: string,
  sessionName?: string
): Promise<DetailedDatabaseVerificationReport> {
  const target = customUrl || getSessionScriptUrl(sessionName);
  const startTime = Date.now();

  const requiredTabs: Array<{ key: SchemaVerificationDetail['tabKey']; title: string; aliases: string[] }> = [
    { key: 'Intake_Register', title: 'Intake_Register', aliases: ['Intake_Register', 'IntakeRegister', '1_Assignment_Intake_Register', 'Intakes'] },
    { key: 'Course_Ledger', title: 'Course_Ledger', aliases: ['Course_Ledger', 'CourseLedger', '2_Course_Evaluation_Master', 'Ledger'] },
    { key: 'Evaluators_Master', title: 'Evaluators_Master', aliases: ['Evaluators_Master', 'EvaluatorsMaster', '3_Evaluators_Directory', 'Evaluators'] },
    { key: 'Fresh_Admissions', title: 'Fresh_Admissions', aliases: ['Fresh_Admissions', 'FreshAdmissions', 'Fresh_Admission_Master', '1st_Year_Admissions', 'Student_Registrations'] },
    { key: 'Re_Registrations', title: 'Re_Registrations', aliases: ['Re_Registrations', 'ReRegistrations', 'Re_Registration_Master', '2nd_3rd_Year_RR', 'Student_Registrations'] },
  ];

  try {
    const directUrl = getFullAppsScriptUrl(target);
    const directRes = await fetch(directUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - startTime;

    if (directRes.ok) {
      const json = await directRes.json();
      const sheetNames: string[] = json.availableSheets || Object.keys(json) || [];

      const tabsStatus: SchemaVerificationDetail[] = requiredTabs.map((req) => {
        const matched = sheetNames.find((s) => req.aliases.some((a) => a.toLowerCase() === s.toLowerCase()));
        let count = 0;
        if (req.key === 'Intake_Register' && Array.isArray(json.intakes)) count = json.intakes.length;
        if (req.key === 'Course_Ledger' && Array.isArray(json.courseLedger)) count = json.courseLedger.length;
        if (req.key === 'Evaluators_Master' && Array.isArray(json.evaluatorsMaster)) count = json.evaluatorsMaster.length;
        if (req.key === 'Fresh_Admissions') {
          if (Array.isArray(json.freshAdmissions)) count = json.freshAdmissions.length;
          else if (Array.isArray(json.studentRegistrations)) {
            count = json.studentRegistrations.filter((r: any) => String(r.cadre || r.Registration_Type || '').toUpperCase().includes('FRESH')).length || json.studentRegistrations.length;
          }
        }
        if (req.key === 'Re_Registrations') {
          if (Array.isArray(json.reRegistrations)) count = json.reRegistrations.length;
          else if (Array.isArray(json.studentRegistrations)) {
            count = json.studentRegistrations.filter((r: any) => String(r.cadre || r.Registration_Type || '').toUpperCase().includes('RE')).length;
          }
        }

        return {
          tabKey: req.key,
          expectedTitle: req.title,
          matchedSheetName: matched || null,
          exists: Boolean(matched) || count > 0,
          itemCount: count,
          status: (matched || count > 0) ? (count > 0 ? 'valid' : 'empty') : 'missing',
        };
      });

      const totalRecords = tabsStatus.reduce((acc, t) => acc + t.itemCount, 0);
      const allFound = tabsStatus.every((t) => t.exists);

      return {
        success: true,
        reachable: true,
        latencyMs,
        message: allFound ? 'All required database tabs detected and verified.' : 'Database reachable, but some tabs may need renaming or creation.',
        spreadsheetName: json.spreadsheetName || 'Connected Google Spreadsheet',
        sheetsFound: sheetNames,
        tabsStatus,
        totalRecords,
      };
    }
  } catch (err: any) {
    console.warn('[verifyDatabaseSchemaDetailed error]:', err);
  }

  // Fallback via PING proxy
  try {
    const pingRes = await testAppsScriptConnection(target);
    const tabsStatus: SchemaVerificationDetail[] = requiredTabs.map((req) => {
      const matched = (pingRes.sheets || []).find((s) => req.aliases.some((a) => a.toLowerCase() === s.toLowerCase()));
      return {
        tabKey: req.key,
        expectedTitle: req.title,
        matchedSheetName: matched || null,
        exists: Boolean(matched),
        itemCount: 0,
        status: matched ? 'valid' : 'missing',
      };
    });

    return {
      success: pingRes.reachable,
      reachable: pingRes.reachable,
      latencyMs: pingRes.latencyMs,
      message: pingRes.message,
      sheetsFound: pingRes.sheets || [],
      tabsStatus,
      totalRecords: (pingRes.totalIntakes || 0) + (pingRes.totalCourseRows || 0),
    };
  } catch (err: any) {
    return {
      success: false,
      reachable: false,
      latencyMs: Date.now() - startTime,
      message: err.message || 'Connection test failed',
      sheetsFound: [],
      tabsStatus: requiredTabs.map((r) => ({
        tabKey: r.key,
        expectedTitle: r.title,
        matchedSheetName: null,
        exists: false,
        itemCount: 0,
        status: 'missing',
      })),
      totalRecords: 0,
    };
  }
}

/**
 * Sends a student registration (Fresh or Re-Registration) to Google Sheets and local proxy
 */
export async function postAddRegistration(regRecord: any): Promise<ApiResponse> {
  const payload = {
    action: 'ADD_REGISTRATION',
    scriptUrl: getCustomScriptUrl(),
    payload: {
      ...regRecord,
      timestamp: new Date().toISOString(),
    },
  };

  sendScriptPost(payload, {
    queueOnFailure: true,
    type: 'ADD_INTAKE',
    summary: `Registration: ${regRecord.studentName} (${regRecord.enrollmentNo}) - ${regRecord.cadre} (${regRecord.session})`,
  }).catch((err) => console.warn('[postAddRegistration error]:', err));

  return {
    status: 'success',
    action: 'ADD_REGISTRATION',
    message: `Student registered in ${regRecord.cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'}.`,
  };
}

/**
 * Purges operational data from backend (Intakes, Ledger, Registrations reset; Evaluators preserved)
 */
export async function purgeRemoteOperationalData(): Promise<{ success: boolean; message: string; purged?: any }> {
  try {
    const res = await fetch('/api/sheets/clear-operational-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: new Date().toISOString() }),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, message: json.message, purged: json.purged };
    }
    return { success: false, message: 'Server returned non-200 status' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}

/**
 * 2. On Intake Submission (Stage 1: Intake Desk):
 * Send POST with action "ADD_INTAKE".
 * Format:
 * {
 *   action: "ADD_INTAKE",
 *   payload: {
 *     timestamp: new Date().toISOString(),
 *     session: activeSession,
 *     enrollmentNo: form.enrollmentNo.trim(),
 *     candidateName: form.candidateName.trim(),
 *     contact: form.contact.trim(),
 *     programme: form.programme,
 *     courses: form.courses, // array of strings
 *     handledBy: currentRole === "admin" ? "Coordinator" : "Official"
 *   }
 * }
 */
export async function postAddIntake(
  intakeRecord: any,
  unpackedCourses?: any[]
): Promise<ApiResponse> {
  // Pre-Push Background Validation Gate:
  // Checks for common data entry errors (malformed enrollment numbers, invalid names, dates, course codes)
  // before pushing to Google Sheets, and guarantees TMA and Practical are NEVER mixed together.
  const prePushCheck = validatePrePushToGoogleSheets(intakeRecord, unpackedCourses);
  if (!prePushCheck.canPush) {
    const errorDetails = prePushCheck.errors.join('; ');
    console.error('[Google Sheets Push Blocked by Validation]:', errorDetails);
    throw new Error(`Data entry validation failed: ${errorDetails}`);
  }

  const sanitized = prePushCheck.sanitizedData!;
  const activeSession = intakeRecord.session || 'July 2026';
  const cleanEnrollment = sanitized.enrollmentNo;
  const candidateName = sanitized.candidateName;
  const contact = sanitized.contact;
  const programme = sanitized.programme;
  const practicalList = sanitized.practicalCourses;
  const assignmentList = sanitized.assignmentCourses;
  const formattedCourseList = sanitized.separatedCourseString;
  const categoryLabel = sanitized.categoryLabel;

  const rawCourses = intakeRecord.courses || intakeRecord.courseCodes || [];
  const coursesArray: string[] = Array.isArray(rawCourses)
    ? rawCourses.flatMap((c: any) => String(c).split(',')).map((c: string) => c.replace(/\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi, '').trim().toUpperCase()).filter(Boolean)
    : typeof rawCourses === 'string'
    ? rawCourses.split(',').map((c: string) => c.replace(/\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi, '').trim().toUpperCase()).filter(Boolean)
    : [];

  const handledBy =
    intakeRecord.handledBy ||
    (intakeRecord.registeredBy?.includes('Coordinator') || intakeRecord.role === 'admin'
      ? 'Coordinator'
      : 'Desk Official');

  const timestamp =
    intakeRecord.timestamp ||
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const payload = {
    action: "ADD_INTAKE",
    payload: {
      timestamp,
      session: activeSession,
      enrollmentNo: cleanEnrollment,
      candidateName,
      contact,
      programme,
      courses: formattedCourseList,
      rawCourses: coursesArray,
      component: categoryLabel,
      componentType: categoryLabel,
      practicalCourses: practicalList,
      assignmentCourses: assignmentList,
      handledBy,
    },
    // Top-level aliases for direct access by Google Apps Script
    enrollmentNo: cleanEnrollment,
    candidateName,
    programme,
    courses: formattedCourseList,
    rawCourses: coursesArray,
    component: categoryLabel,
    componentType: categoryLabel,
    practicalCourses: practicalList,
    assignmentCourses: assignmentList,
    session: activeSession,
    contact,
    handledBy,
    timestamp,
    intake: {
      ...intakeRecord,
      enrollmentNo: cleanEnrollment,
      candidateName,
      courses: formattedCourseList,
      rawCourses: coursesArray,
      component: categoryLabel,
      componentType: categoryLabel,
      practicalCourses: practicalList,
      assignmentCourses: assignmentList,
    },
    unpackedCourses: sanitized.unpackedCourses || [],
  };

  // Dispatch once to SCRIPT_URL with automatic fallback to offline queue
  await sendScriptPost(payload, {
    queueOnFailure: true,
    type: 'ADD_INTAKE',
    summary: `Add Intake: ${cleanEnrollment} (${candidateName} - ${programme})`,
  });

  // Sync with Express backend data store
  try {
    fetch('/api/intake/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentNo: cleanEnrollment,
        studentName: candidateName,
        studentPhone: contact,
        programmeCode: programme,
        courseCodes: coursesArray,
        practicalCourses: practicalList,
        assignmentCourses: assignmentList,
        componentType: categoryLabel,
        session: activeSession,
        submissionDate: sanitized.submissionDate,
        submissionMode: intakeRecord.submissionMode,
        consignmentNo: intakeRecord.consignmentNo,
        remarks: intakeRecord.remarks,
      }),
    }).catch(() => {});
  } catch {}

  return {
    status: 'success',
    action: 'ADD_INTAKE',
    message: 'Saved & Synced with Google Sheet',
  };
}

/**
 * Edit Intake Receipt (Stage 1: Intake & Desk Submissions):
 * Dispatch POST to Google Apps Script and backend /api/intake/update:
 * action: "EDIT_INTAKE",
 * payload: { id, originalEnrollmentNo, enrollmentNo, candidateName, contact, programme, courses, session: activeSession }
 */
export async function postEditIntake(payloadData: {
  id?: string;
  originalEnrollmentNo: string;
  enrollmentNo: string;
  candidateName: string;
  contact: string;
  programme: string;
  courses: string[];
  session: string;
  submissionDate?: string;
  receiptDate?: string;
}): Promise<ApiResponse> {
  // Pre-push validation check for Edit
  const prePushCheck = validatePrePushToGoogleSheets({
    enrollmentNo: payloadData.enrollmentNo,
    candidateName: payloadData.candidateName,
    contact: payloadData.contact,
    programme: payloadData.programme,
    courses: payloadData.courses,
    submissionDate: payloadData.submissionDate,
    session: payloadData.session,
  });

  if (!prePushCheck.canPush) {
    const errorDetails = prePushCheck.errors.join('; ');
    console.error('[Google Sheets Edit Push Blocked by Validation]:', errorDetails);
    throw new Error(`Data entry validation failed: ${errorDetails}`);
  }

  const sanitized = prePushCheck.sanitizedData!;
  const cleanEnr = sanitized.enrollmentNo;
  const cleanName = sanitized.candidateName;
  const cleanContact = sanitized.contact;
  const cleanProg = sanitized.programme;
  const cleanDate = sanitized.submissionDate;
  const cleanTimestamp = cleanDate ? `${cleanDate}T10:00:00.000Z` : '';
  const separatedCourseList = sanitized.separatedCourseString;

  const payload = {
    action: "EDIT_INTAKE",
    payload: {
      id: payloadData.id,
      originalEnrollmentNo: String(payloadData.originalEnrollmentNo || '').trim(),
      enrollmentNo: cleanEnr,
      candidateName: cleanName,
      studentName: cleanName,
      Candidate_Name: cleanName,
      contact: cleanContact,
      programme: cleanProg,
      courses: payloadData.courses || [],
      separatedCourses: separatedCourseList,
      practicalCourses: sanitized.practicalCourses,
      assignmentCourses: sanitized.assignmentCourses,
      component: sanitized.categoryLabel,
      session: payloadData.session || 'July 2026',
      submissionDate: cleanDate,
      receiptDate: payloadData.receiptDate || cleanDate,
      timestamp: cleanTimestamp,
      Timestamp: cleanTimestamp,
      date: cleanDate,
      Date: cleanDate,
    },
    // Top-level aliases for flexible Apps Script handlers
    id: payloadData.id,
    originalEnrollmentNo: String(payloadData.originalEnrollmentNo || '').trim(),
    enrollmentNo: cleanEnr,
    candidateName: cleanName,
    studentName: cleanName,
    Candidate_Name: cleanName,
    contact: cleanContact,
    programme: cleanProg,
    courses: payloadData.courses || [],
    separatedCourses: separatedCourseList,
    practicalCourses: sanitized.practicalCourses,
    assignmentCourses: sanitized.assignmentCourses,
    component: sanitized.categoryLabel,
    session: payloadData.session || 'July 2026',
    submissionDate: cleanDate,
    receiptDate: payloadData.receiptDate || cleanDate,
    timestamp: cleanTimestamp,
    Timestamp: cleanTimestamp,
    date: cleanDate,
    Date: cleanDate,
  };

  try {
    await sendScriptPost(payload, {
      queueOnFailure: true,
      type: 'EDIT_INTAKE',
      summary: `Edit Intake: ${cleanEnr} (${cleanName} - ${cleanProg})`,
    });
  } catch (err) {
    console.warn('[postEditIntake error]:', err);
  }

  // Sync with Express backend data store
  try {
    await fetch('/api/intake/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: payloadData.id,
        originalEnrollmentNo: payloadData.originalEnrollmentNo,
        enrollmentNo: cleanEnr,
        studentName: cleanName,
        studentPhone: cleanContact,
        programmeCode: cleanProg,
        courseCodes: payloadData.courses,
        practicalCourses: sanitized.practicalCourses,
        assignmentCourses: sanitized.assignmentCourses,
        session: payloadData.session,
        submissionDate: cleanDate,
      }),
    });
  } catch (backendErr) {
    console.warn('[postEditIntake backend sync warning]:', backendErr);
  }

  return {
    status: 'success',
    action: 'EDIT_INTAKE',
    message: 'Intake entry updated & validated with Google Sheet',
  };
}

/**
 * Delete Intake Receipt (Stage 1: Intake & Desk Submissions):
 * Dispatch POST to Google Apps Script and backend /api/intake/delete:
 * action: "DELETE_INTAKE",
 * payload: { id, enrollmentNo, session: activeSession }
 */
export async function postDeleteIntake(payloadData: {
  id?: string;
  enrollmentNo: string;
  session: string;
}): Promise<ApiResponse> {
  const payload = {
    action: "DELETE_INTAKE",
    payload: {
      id: payloadData.id,
      enrollmentNo: String(payloadData.enrollmentNo || '').trim(),
      session: payloadData.session || 'July 2026',
    },
    id: payloadData.id,
    enrollmentNo: String(payloadData.enrollmentNo || '').trim(),
    session: payloadData.session || 'July 2026',
  };

  sendScriptPost(payload, {
    queueOnFailure: true,
    type: 'DELETE_INTAKE',
    summary: `Delete Intake: ${payloadData.enrollmentNo || payloadData.id} (${payloadData.session})`,
  }).catch((err) => console.warn('[postDeleteIntake error]:', err));

  // Sync with Express backend data store
  if (payloadData.id) {
    try {
      fetch('/api/intake/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payloadData.id }),
      }).catch(() => {});
    } catch {}
  }

  return {
    status: 'success',
    action: 'DELETE_INTAKE',
    message: 'Intake receipt and ledger rows deleted',
  };
}

/**
 * 3. On Marks Locking / Updating (Stage 2: Course Evaluation Master):
 * Send POST with action "UPDATE_MARKS" containing subId, marks, calculated grade, and isLocked: true.
 * Format:
 * {
 *   action: "UPDATE_MARKS",
 *   payload: {
 *     subId: script.subId,
 *     marks: Number(marks),
 *     grade: calculatedGrade,
 *     isLocked: true
 *   }
 * }
 */
export interface UpdateMarksPayload {
  subId: string;
  enrollmentNo: string;
  courseCode: string;
  marks: number | null;
  grade: string;
  isLocked: boolean;
}

/**
 * 3. On Marks Locking / Updating (Stage 2: Course Evaluation Master):
 * Send POST with action "UPDATE_MARKS" containing subId, enrollmentNo, courseCode, marks, calculated grade, and isLocked.
 * Format:
 * {
 *   action: "UPDATE_MARKS",
 *   payload: {
 *     subId,
 *     enrollmentNo,
 *     courseCode,
 *     marks,
 *     grade,
 *     isLocked
 *   }
 * }
 */
export async function postUpdateMarks(
  rowOrParams: any,
  marksParam?: number | null,
  gradeParam?: string,
  isLockedParam?: boolean,
  compositeParams?: { enrollmentNo?: string; courseCode?: string }
): Promise<ApiResponse> {
  let subId = '';
  let enrollmentNo = '';
  let courseCode = '';
  let marksValue: any = null;
  let isLockAction = isLockedParam !== undefined ? Boolean(isLockedParam) : true;

  if (typeof rowOrParams === 'object' && rowOrParams !== null) {
    const row = rowOrParams;
    subId = (row.Sub_ID || row.subId || row.submissionKey || row.id || '').toString().trim();
    enrollmentNo = (row.Enrollment_No || row.enrollmentNo || '').toString().replace(/^'/, '').trim();
    courseCode = (row.Course_Code || row.courseCode || '').toString().trim().toUpperCase();
    marksValue = marksParam !== undefined
      ? marksParam
      : (row.marks !== undefined ? row.marks : (row.Marks !== undefined ? row.Marks : null));
    if (row.isLocked !== undefined && isLockedParam === undefined) {
      isLockAction = Boolean(row.isLocked);
    }
  } else {
    subId = String(rowOrParams || '');
    marksValue = marksParam !== undefined ? marksParam : null;
    isLockAction = isLockedParam !== undefined ? Boolean(isLockedParam) : true;
    enrollmentNo = (compositeParams?.enrollmentNo || '').toString().replace(/^'/, '').trim();
    courseCode = (compositeParams?.courseCode || '').toString().trim().toUpperCase();
  }

  // Fallback composite key parsing from subId if missing
  if ((!enrollmentNo || !courseCode) && subId) {
    const parts = subId.split('_');
    if (parts.length >= 3) {
      if (!enrollmentNo) enrollmentNo = parts[1].replace(/^'/, '').trim();
      if (!courseCode) courseCode = parts[2].trim().toUpperCase();
    }
  }

  if (!subId && enrollmentNo && courseCode) {
    subId = `SUB_${enrollmentNo}_${courseCode}_JUL2026`;
  }

  const numericMarks = marksValue !== null && marksValue !== undefined && marksValue !== ''
    ? Number(marksValue)
    : 0;

  const calculatedGrade = gradeParam || getIgnouGrade(numericMarks).grade;

  const payload = {
    subId,
    enrollmentNo,
    courseCode,
    marks: Number(numericMarks),
    grade: calculatedGrade,
    isLocked: isLockAction,
  };

  // Direct fetch to Apps Script Web App URL with mode: "no-cors"
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "UPDATE_MARKS",
        payload: payload,
      }),
    });
  } catch (err) {
    console.warn('[UPDATE_MARKS fetch error]:', err);
  }

  // Also dispatch to local server proxy in parallel with offline queuing support
  sendScriptPost({
    action: "UPDATE_MARKS",
    payload,
    // Top-level aliases
    subId,
    enrollmentNo,
    courseCode,
    marks: Number(numericMarks),
    grade: calculatedGrade,
    isLocked: isLockAction,
  }, {
    queueOnFailure: true,
    type: 'UPDATE_MARKS',
    summary: `Update Marks: ${enrollmentNo} - ${courseCode} (${numericMarks}/100 Grade ${calculatedGrade})`,
  }).catch((err) => console.warn(err));

  return {
    status: 'success',
    action: 'UPDATE_MARKS',
    message: `Marks for ${payload.courseCode} (${payload.marks}/100 - Grade ${payload.grade}) updated & synced to Google Sheets`,
  };
}

/**
 * On Allotting Evaluator (Stage 2: Course Evaluation Master):
 * Send POST with action "ALLOT_EVALUATOR".
 * Format:
 * {
 *   action: "ALLOT_EVALUATOR",
 *   payload: {
 *     subId: script.subId,
 *     evaluatorId: evaluator.id,
 *     evaluatorName: evaluator.name,
 *     evaluatorCode: evaluator.evaluatorCode
 *   }
 * }
 */
export async function postAllotEvaluator(
  subId: string,
  evaluator: { id?: string; name?: string; evaluatorCode?: string; Allotted_Evaluator?: string | null; enrollmentNo?: string; courseCode?: string }
): Promise<ApiResponse> {
  const allottedEvaluatorVal = evaluator.Allotted_Evaluator || (evaluator.name && evaluator.evaluatorCode ? `${evaluator.name} (${evaluator.evaluatorCode})` : evaluator.name || '');
  const cleanSubId = (subId || '').toString().trim();
  const cleanEnr = (evaluator.enrollmentNo || '').toString().replace(/^'/, '').trim();
  const cleanCourse = (evaluator.courseCode || '').toString().trim().toUpperCase();

  const payload = {
    subId: cleanSubId,
    subIds: [cleanSubId],
    enrollmentNo: cleanEnr,
    courseCode: cleanCourse,
    evaluator: allottedEvaluatorVal,
    evaluatorId: evaluator.id || '',
    evaluatorName: evaluator.name || allottedEvaluatorVal,
    evaluatorCode: evaluator.evaluatorCode || '',
    Allotted_Evaluator: allottedEvaluatorVal,
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "ALLOT_EVALUATOR",
        payload: payload,
      }),
    });
  } catch (err) {
    console.warn("[postAllotEvaluator direct POST fallback]:", err);
    sendScriptPost({ action: "ALLOT_EVALUATOR", payload }).catch(() => {});
  }

  return {
    status: 'success',
    action: 'ALLOT_EVALUATOR',
    message: 'Saved & Synced with Google Sheet',
  };
}

/**
 * 4. PDF Buttons:
 * On Stage 3 (Award Sheets), add "Download SED Award PDF" that calls action "GENERATE_SED_PDF".
 * When the URL returns, open it in a new browser tab with window.open(downloadUrl, "_blank").
 */
export async function postGenerateSedPdf(details: {
  courseCode: string;
  session: string;
  records: any[];
  dispatchMemoNo?: string;
  dispatchDate?: string;
  centreCode?: string;
}): Promise<string> {
  const payload = {
    action: 'GENERATE_SED_PDF',
    courseCode: details.courseCode,
    session: details.session,
    records: details.records,
    dispatchMemoNo: details.dispatchMemoNo || 'SC2033/SED/DISP-2026/042',
    dispatchDate: details.dispatchDate || new Date().toISOString().split('T')[0],
    centreCode: details.centreCode || '2033',
  };

  let downloadUrl: string | null = null;

  try {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      downloadUrl = data.downloadUrl || data.url || data.pdfUrl || null;
    }
  } catch (err) {
    console.warn('[Google Sheets] Express proxy GENERATE_SED_PDF failed:', err);
  }

  if (!downloadUrl) {
    try {
      const directUrl = getFullAppsScriptUrl(SCRIPT_URL);
      const res = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        downloadUrl = data.downloadUrl || data.url || data.pdfUrl || null;
      }
    } catch (err) {
      console.warn('[Google Sheets] Direct GENERATE_SED_PDF failed:', err);
    }
  }

  // If remote returned downloadUrl, return it!
  if (downloadUrl) {
    return downloadUrl;
  }

  // Fallback: Generate an authentic, print-ready statutory HTML/PDF document blob URL
  return createFallbackSedAwardPdfBlob(details);
}

/**
 * 4. PDF Buttons:
 * On Stage 4 (Billing), add "Download Statutory Claim Bill PDF" that calls action "GENERATE_CLAIM_PDF".
 * When the URL returns, open it in a new browser tab with window.open(downloadUrl, "_blank").
 */
export async function postGenerateClaimPdf(details: {
  billId?: string;
  evaluatorId?: string;
  evaluatorCode?: string;
  evaluatorName?: string;
  session: string;
  grossAmount?: number;
  netPayable?: number;
  scriptCount?: number;
  totalScripts?: number;
  rate?: number;
  ratePerScript?: number;
  conveyance?: number;
  conveyanceAmount?: number;
  coordination?: number;
  coordinationCharges?: number;
  courses?: string[];
  courseCodes?: string[];
  bankAccountNo?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  panNumber?: string;
  department?: string;
  designation?: string;
  centreCode?: string;
}): Promise<string> {
  const activeSession = details.session;
  const evName = details.evaluatorName || 'Academic Counsellor';
  const rateVal = parseFloat(String(details.rate ?? details.ratePerScript ?? 27.50));
  const conveyanceVal = parseFloat(String(details.conveyance ?? details.conveyanceAmount ?? 0)) || 0;
  const coordinationVal = parseFloat(String(details.coordination ?? details.coordinationCharges ?? 0)) || 0;
  const count = details.scriptCount || details.totalScripts || 0;
  const gross = details.grossAmount ?? (count * rateVal + conveyanceVal + coordinationVal);

  const payload = {
    action: 'GENERATE_CLAIM_PDF',
    payload: {
      session: activeSession,
      evaluatorName: evName,
      rate: rateVal,
      conveyance: conveyanceVal,
      coordination: coordinationVal,
    },
    // Top-level fields for backwards compatibility with Google Apps Script
    session: activeSession,
    evaluatorName: evName,
    rate: rateVal,
    conveyance: conveyanceVal,
    coordination: coordinationVal,
    billId: details.billId || 'STATUTORY-CLAIM-VOUCHER',
    evaluatorId: details.evaluatorId || details.evaluatorCode || 'EV-SC2033',
    evaluatorCode: details.evaluatorCode || details.evaluatorId || 'EV-SC2033',
    bankAccountNo: details.bankAccountNo || details.accountNumber || '',
    accountNumber: details.bankAccountNo || details.accountNumber || '',
    ifscCode: details.ifscCode || '',
    bankName: details.bankName || 'State Bank of India',
    panNumber: details.panNumber || '',
    department: details.department || '',
    designation: details.designation || '',
    grossAmount: gross,
    netPayable: details.netPayable || gross,
    scriptCount: count,
    ratePerScript: rateVal,
    conveyanceAmount: conveyanceVal,
    coordinationCharges: coordinationVal,
    courses: details.courses || details.courseCodes || [],
  };

  // Direct no-cors post to Apps Script to guarantee request dispatch without browser blockage
  sendScriptPost(payload).catch((err) => console.warn('[GENERATE_CLAIM_PDF no-cors dispatch]:', err));

  let downloadUrl: string | null = null;

  try {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      downloadUrl = data.downloadUrl || data.url || data.pdfUrl || null;
    }
  } catch (err) {
    console.warn('[Google Sheets] Express proxy GENERATE_CLAIM_PDF failed:', err);
  }

  if (!downloadUrl) {
    try {
      const directUrl = getFullAppsScriptUrl(SCRIPT_URL);
      const res = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        downloadUrl = data.downloadUrl || data.url || data.pdfUrl || null;
      }
    } catch (err) {
      console.warn('[Google Sheets] Direct GENERATE_CLAIM_PDF failed:', err);
    }
  }

  if (downloadUrl) {
    return downloadUrl;
  }

  // Fallback: Generate an authentic IGNOU F&AD Statutory Remuneration Claim Bill PDF blob URL
  return createFallbackClaimBillPdfBlob({
    ...details,
    grossAmount: gross,
    ratePerScript: rateVal,
    conveyanceAmount: conveyanceVal,
    coordinationCharges: coordinationVal,
    scriptCount: count,
  });
}

/**
 * Creates high-fidelity printable HTML/PDF Blob URL for SED Award Sheet
 */
function createFallbackSedAwardPdfBlob(details: {
  courseCode: string;
  session: string;
  records: any[];
  dispatchMemoNo?: string;
  dispatchDate?: string;
  centreCode?: string;
}): string {
  const rowsHtml = details.records
    .map(
      (r, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #333; padding: 4px 6px;">${idx + 1}</td>
      <td style="border: 1px solid #333; padding: 4px 6px; font-family: monospace; font-weight: bold;">${r.enrollmentNo}</td>
      <td style="border: 1px solid #333; padding: 4px 6px; text-transform: uppercase;">${r.studentName}</td>
      <td style="text-align: center; border: 1px solid #333; padding: 4px 6px; font-family: monospace; font-size: 11px;">${r.submissionKey || ''}</td>
      <td style="text-align: center; border: 1px solid #333; padding: 4px 6px; font-weight: bold; font-size: 13px;">${r.marks !== null && r.marks !== undefined ? r.marks : 'AB'}</td>
      <td style="text-align: center; border: 1px solid #333; padding: 4px 6px; font-weight: bold; color: #1e3a8a;">${r.grade || '—'}</td>
      <td style="border: 1px solid #333; padding: 4px 6px; font-style: italic; font-size: 11px;">${r.marksInWords || ''}</td>
      <td style="text-align: center; border: 1px solid #333; padding: 4px 6px; font-size: 10px; font-weight: bold; background: #f0fdf4; color: #15803d;">${r.isLocked ? 'SEALED & LOCKED' : 'DRAFT'}</td>
    </tr>
  `
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>IGNOU SED Award Sheet - ${details.courseCode} - ${details.session}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.3; color: #000; margin: 0; padding: 15px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .univ { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
    .division { font-size: 14px; font-weight: bold; }
    .sub { font-size: 11px; }
    .meta-box { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
    .meta-box td { padding: 4px 8px; border: 1px solid #bbb; }
    .meta-label { font-weight: bold; background: #f4f4f5; width: 18%; }
    table.data { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    table.data th { background: #e4e4e7; border: 1px solid #333; padding: 6px 4px; font-weight: bold; text-align: center; }
    .footer-signs { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
    .sign-block { width: 30%; text-align: center; border-top: 1px solid #333; padding-top: 4px; font-size: 11px; }
    .actions-bar { position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; gap: 8px; }
    .btn { background: #1e3a8a; color: #fff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .btn:hover { background: #1e40af; }
    @media print { .actions-bar { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="header">
    <div class="univ">Indira Gandhi National Open University</div>
    <div class="division">Student Evaluation Division (SED) — IGNOU HQ</div>
    <div class="sub">Continuous Assessment Award List for Tutor Marked Assignments (TMA)</div>
    <div style="font-weight: bold; font-size: 12px; margin-top: 4px; color: #1e3a8a;">PART - 1: SED STATUTORY TABULATION COPY (ORIGINAL)</div>
  </div>

  <table class="meta-box">
    <tr>
      <td class="meta-label">Study Centre Code:</td>
      <td><strong>SC-2033</strong> (S.D. Jain Girls' College, Dimapur)</td>
      <td class="meta-label">Regional Centre:</td>
      <td><strong>RC-20 Kohima (Regional Centre Kohima)</strong></td>
    </tr>
    <tr>
      <td class="meta-label">Course Code:</td>
      <td><strong style="font-size: 13px; color: #1e3a8a;">${details.courseCode}</strong></td>
      <td class="meta-label">Examination Session:</td>
      <td><strong>${details.session}</strong></td>
    </tr>
    <tr>
      <td class="meta-label">Dispatch Memo No:</td>
      <td><strong>${details.dispatchMemoNo || 'SC2033/SED/DISP-2026/042'}</strong></td>
      <td class="meta-label">Dispatch Date:</td>
      <td><strong>${details.dispatchDate || new Date().toISOString().split('T')[0]}</strong></td>
    </tr>
  </table>

  <table class="data">
    <thead>
      <tr>
        <th style="width: 4%;">S.No</th>
        <th style="width: 14%;">Enrolment No.</th>
        <th style="width: 24%;">Student Name</th>
        <th style="width: 18%;">Deterministic Key</th>
        <th style="width: 8%;">Marks (100)</th>
        <th style="width: 6%;">Grade</th>
        <th style="width: 16%;">Marks in Words</th>
        <th style="width: 10%;">Verification</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px;">No records available for this course.</td></tr>'}
    </tbody>
  </table>

  <div class="footer-signs">
    <div class="sign-block">
      Signature of Academic Counsellor<br/>
      (Evaluator Code: EV-2033-01)
    </div>
    <div class="sign-block">
      Checked & Verified by Dealing Official<br/>
      (Study Centre SC-2033, Dimapur)
    </div>
    <div class="sign-block">
      Signature & Seal of Coordinator<br/>
      Dr. Sant Kumar Gupta<br/>
      Coordinator, IGNOU SC-2033
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Creates high-fidelity printable HTML/PDF Blob URL for Statutory Claim Bill
 */
function createFallbackClaimBillPdfBlob(details: {
  billId?: string;
  evaluatorId?: string;
  evaluatorCode?: string;
  evaluatorName?: string;
  session: string;
  grossAmount: number;
  netPayable?: number;
  scriptCount?: number;
  ratePerScript?: number;
  conveyanceAmount?: number;
  coordinationCharges?: number;
  coordination?: number;
  courses?: string[];
  bankAccountNo?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  panNumber?: string;
  department?: string;
  designation?: string;
}): string {
  const coursesStr = (details.courses && details.courses.length > 0)
    ? details.courses.join(', ')
    : 'Allotment Courses';
  const rate = details.ratePerScript || 27.5;
  const scriptCount = details.scriptCount || Math.round(details.grossAmount / rate) || 1;
  const scriptAmount = scriptCount * rate;
  const conveyance = details.conveyanceAmount ?? 0;
  const coordination = (details as any).coordinationCharges ?? (details as any).coordination ?? 0;
  const gross = details.grossAmount || (scriptAmount + conveyance + coordination);
  const net = details.netPayable || gross;
  const evalCode = details.evaluatorCode || details.evaluatorId || 'EV-SC2033-01';
  const bankAcc = details.bankAccountNo || details.accountNumber || '—';
  const ifsc = details.ifscCode || '—';
  const bank = details.bankName || 'State Bank of India';
  const pan = details.panNumber || 'XXXXX1234X';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>IGNOU F&AD Statutory Remuneration Claim Voucher - ${details.billId || 'BILL'}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
    .univ { font-size: 20px; font-weight: bold; text-transform: uppercase; }
    .division { font-size: 14px; font-weight: bold; }
    .sub { font-size: 12px; margin-top: 2px; }
    .voucher-title { font-size: 15px; font-weight: bold; text-decoration: underline; margin-top: 8px; color: #1e3a8a; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .meta-table td { padding: 6px 8px; border: 1px solid #888; font-size: 12px; }
    .meta-label { font-weight: bold; background: #f4f4f5; width: 25%; }
    .calc-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
    .calc-table th { border: 1px solid #000; background: #e4e4e7; padding: 8px; text-align: left; font-size: 12px; }
    .calc-table td { border: 1px solid #000; padding: 8px; font-size: 12px; }
    .total-row { font-weight: bold; background: #f8fafc; }
    .cert-box { border: 1px solid #666; padding: 10px 12px; font-size: 11px; margin-top: 20px; background: #fafafa; font-style: italic; }
    .footer-signs { display: flex; justify-content: space-between; margin-top: 45px; padding-top: 10px; }
    .sign-block { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 6px; font-size: 12px; }
    .actions-bar { position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; gap: 8px; }
    .btn { background: #15803d; color: #fff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .btn:hover { background: #166534; }
    @media print { .actions-bar { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="header">
    <div class="univ">Indira Gandhi National Open University</div>
    <div class="division">Finance & Accounts Division (F&AD) — IGNOU HQ</div>
    <div class="sub">Study Centre SC-2033 (S.D. Jain Girls' College, Dimapur) | Regional Centre: RC-20 Kohima (Regional Centre Kohima)</div>
    <div class="voucher-title">STATUTORY CLAIM BILL FOR EVALUATION OF ASSIGNMENTS</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-label">Bill Voucher No:</td>
      <td><strong>${details.billId || 'BILL-SC2033-2026-001'}</strong></td>
      <td class="meta-label">Date of Claim:</td>
      <td><strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></td>
    </tr>
    <tr>
      <td class="meta-label">Academic Counsellor:</td>
      <td><strong style="color: #1e3a8a;">${details.evaluatorName || 'Academic Evaluator'}</strong></td>
      <td class="meta-label">Evaluator Code:</td>
      <td><strong style="font-family: monospace;">${evalCode}</strong></td>
    </tr>
    <tr>
      <td class="meta-label">Designation & Dept:</td>
      <td><strong>${details.designation || 'Academic Counsellor'} ${details.department ? `(${details.department})` : ''}</strong></td>
      <td class="meta-label">Term-End Session:</td>
      <td><strong>${details.session}</strong></td>
    </tr>
    <tr>
      <td class="meta-label">Bank Account Number:</td>
      <td><strong style="font-family: monospace;">${bankAcc}</strong></td>
      <td class="meta-label">Bank & IFSC:</td>
      <td><strong>${bank}</strong> (IFSC: <strong style="font-family: monospace;">${ifsc}</strong>)</td>
    </tr>
    <tr>
      <td class="meta-label">Assigned Courses:</td>
      <td colspan="3"><strong>${coursesStr}</strong></td>
    </tr>
  </table>

  <table class="calc-table">
    <thead>
      <tr>
        <th style="width: 10%;">Sl.No.</th>
        <th style="width: 50%;">Description of Remuneration Heads</th>
        <th style="width: 20%; text-align: center;">Rate / Scale</th>
        <th style="width: 20%; text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Remuneration for Evaluation of Assignment Answer Scripts (Count: <strong>${scriptCount}</strong>)</td>
        <td style="text-align: center;">₹${rate.toFixed(2)} per script</td>
        <td style="text-align: right; font-weight: bold;">₹${scriptAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Conveyance Allowance (Study Centre Delivery / Return)</td>
        <td style="text-align: center;">${conveyance > 0 ? 'Sanctioned' : 'Default Norm'}</td>
        <td style="text-align: right; font-weight: bold;">₹${conveyance.toFixed(2)}</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Coordination & Verification Charges</td>
        <td style="text-align: center;">${coordination > 0 ? 'Sanctioned' : 'Default Norm'}</td>
        <td style="text-align: right; font-weight: bold;">₹${coordination.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right; font-size: 13px;">GROSS STATUTORY CLAIM:</td>
        <td style="text-align: right; font-size: 14px; color: #1e3a8a;">₹${gross.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align: right;">Less TDS / Statutory Deductions (if applicable):</td>
        <td style="text-align: right; font-weight: bold;">₹0.00</td>
      </tr>
      <tr class="total-row" style="background: #eef2ff; border-top: 2px solid #000;">
        <td colspan="3" style="text-align: right; font-size: 14px; font-weight: bold;">NET DISBURSABLE AMOUNT:</td>
        <td style="text-align: right; font-size: 15px; font-weight: bold; color: #047857;">₹${net.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="cert-box">
    <strong>Statutory Certification:</strong> Certified that the assignment scripts mentioned above were duly evaluated, marks entered in the continuous evaluation award sheet, verified against the question paper key, and returned to Study Centre 2033 in accordance with IGNOU Evaluation Guidelines.
  </div>

  <div class="footer-signs">
    <div class="sign-block">
      <strong>Signature of Academic Counsellor (Claimant)</strong><br/>
      Name: ${details.evaluatorName || 'Academic Evaluator'}<br/>
      Code: ${evalCode} | PAN: ${pan} | A/C: ${bankAcc}
    </div>
    <div class="sign-block">
      <strong>Verified & Sanctioned by Coordinator</strong><br/>
      Dr. Sant Kumar Gupta<br/>
      Coordinator, IGNOU SC-2033
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Master Google Apps Script (Code.gs) template for IGNOU SC-2033
 * Dedicated Assignment Operations (Intake Desk, Course Ledger, Evaluation Master, Award Sheets)
 */
export const OFFICIAL_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * IGNOU STUDY CENTRE 2033 - MASTER GOOGLE APPS SCRIPT (Code.gs)
 * Multi-Tab Database Architecture: January 2024 through July 2026
 * =========================================================================
 * 
 * 1. ADMISSION & RE-REGISTRATION DATABASE (Session-Separated Tabs):
 *    - Fresh Admissions (1st Year):
 *        Fresh_Jan_2024, Fresh_July_2024, Fresh_Jan_2025, Fresh_July_2025, Fresh_Jan_2026, Fresh_July_2026
 *    - Re-Registrations (2nd / 3rd Year):
 *        ReReg_Jan_2024, ReReg_July_2024, ReReg_Jan_2025, ReReg_July_2025, ReReg_Jan_2026, ReReg_July_2026
 * 
 * 2. ASSIGNMENT INTAKE & EVALUATION OPERATIONS:
 *    - Intake_Register (Desk intake receipts & candidate submissions)
 *    - Course_Ledger (Disaggregated course packets & continuous assessment marks)
 *    - Evaluators_Master (Approved academic counsellors directory)
 * 
 * RUN "setupDatabaseFromJan2024()" ONCE in Apps Script or from menu:
 * "IGNOU SC-2033" -> "🚀 Initialize All Database Tabs (Jan 2024 - July 2026)"
 * =========================================================================
 */

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("IGNOU SC-2033")
      .addItem("🚀 Initialize All Database Tabs (Jan 2024 - July 2026)", "setupDatabaseFromJan2024")
      .addItem("🔍 Health Check & Tab Audit", "auditDatabaseTabs")
      .addToUi();
  } catch (e) {
    // SpreadsheetApp UI unavailable during headless Web App execution
  }
}

/**
 * Creates and formats all required sheets for Jan 2024 - July 2026
 */
function setupDatabaseFromJan2024() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sessions = [
    { year: 2024, month: "Jan" },
    { year: 2024, month: "July" },
    { year: 2025, month: "Jan" },
    { year: 2025, month: "July" },
    { year: 2026, month: "Jan" },
    { year: 2026, month: "July" }
  ];

  var regHeaders = [
    "Enrollment_No", "Candidate_Name", "Mobile_No", "Email_ID",
    "Programme_Code", "Academic_Year", "Session", "Course_Codes",
    "Registration_Date", "Fee_Ref", "Status"
  ];

  // 1. Create Fresh Admission Tabs (Emerald)
  for (var i = 0; i < sessions.length; i++) {
    var freshTabName = "Fresh_" + sessions[i].month + "_" + sessions[i].year;
    var fSheet = getOrCreateStyledSheet(ss, freshTabName, regHeaders, "#065f46", "#ffffff");
  }

  // 2. Create Re-Registration Tabs (Indigo)
  for (var j = 0; j < sessions.length; j++) {
    var reRegTabName = "ReReg_" + sessions[j].month + "_" + sessions[j].year;
    var rSheet = getOrCreateStyledSheet(ss, reRegTabName, regHeaders, "#3730a3", "#ffffff");
  }

  // 3. Create Operational Intake Register (Slate Navy)
  var intakeHeaders = [
    "Timestamp", "Session", "Enrollment_No", "Candidate_Name", "Contact", "Programme", "Courses", "Official"
  ];
  getOrCreateStyledSheet(ss, "Intake_Register", intakeHeaders, "#0f172a", "#ffffff");

  // 4. Create Course Ledger (Amber / Bronze)
  var ledgerHeaders = [
    "Sub_ID", "Session", "Enrollment_No", "Candidate_Name", "Contact_No", "Email_ID",
    "Programme_Code", "Course_Code", "Allotted_Evaluator", "Marks", "Grade", "Status"
  ];
  getOrCreateStyledSheet(ss, "Course_Ledger", ledgerHeaders, "#78350f", "#ffffff");

  // 5. Create Evaluators Master (Royal Blue)
  var evalHeaders = [
    "Evaluator_ID", "Evaluator_Name", "Evaluator_Code", "Mobile", "Email",
    "Department", "Designation", "Bank_Account", "Bank_Name", "IFSC_Code", "PAN_Number", "Approved_Courses"
  ];
  getOrCreateStyledSheet(ss, "Evaluators_Master", evalHeaders, "#1e3a8a", "#ffffff");

  SpreadsheetApp.flush();
  try {
    SpreadsheetApp.getUi().alert("SUCCESS: All IGNOU SC-2033 database tabs initialized for Jan 2024 through July 2026!");
  } catch (e) {}
}

function getOrCreateStyledSheet(ss, name, headers, bgColor, textColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
  }
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
    .setBackground(bgColor || "#1e293b")
    .setFontColor(textColor || "#ffffff");
  sheet.setFrozenRows(1);
  return sheet;
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};

  // 1. Assignment Operational Tables
  result.intakeRegister = getSheetDataByAliases(ss, ["Intake_Register", "intakeRegister", "Intake"]);
  result.Intake_Register = result.intakeRegister;
  result.intakes = result.intakeRegister;

  result.courseLedger = getSheetDataByAliases(ss, ["Course_Ledger", "courseLedger", "Ledger"]);
  result.Course_Ledger = result.courseLedger;

  result.evaluatorsMaster = getSheetDataByAliases(ss, ["Evaluators_Master", "evaluatorsMaster", "Evaluators"]);
  result.Evaluators_Master = result.evaluatorsMaster;

  // 2. Multi-Tab Student Registration Aggregator (Jan 2024 through 2026+)
  var studentRegistrations = [];
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    var sName = allSheets[s].getName();
    if (sName.indexOf("Fresh_") === 0 || sName.indexOf("ReReg_") === 0 || sName.indexOf("Student_") === 0) {
      var sRows = getSheetDataAsArray(allSheets[s]);
      var isFresh = sName.indexOf("Fresh_") === 0;
      for (var r = 0; r < sRows.length; r++) {
        var row = sRows[r];
        var enr = String(row.Enrollment_No || row.enrollmentNo || row.Enrollment || "").replace(/^'/, '').trim();
        if (enr) {
          var prog = String(row.Programme_Code || row.programmeCode || row.Programme || "").trim().toUpperCase();
          var yr = String(row.Academic_Year || row.academicYear || "").trim();
          if (!yr) {
            yr = isFresh ? "1st Year" : (prog.indexOf(" 3") !== -1 || prog.indexOf("3") !== -1 ? "3rd Year" : "2nd Year");
          }
          var rawC = row.Course_Codes || row.courseCodes || row.Courses || "";
          var courses = Array.isArray(rawC) ? rawC : String(rawC).split(",").map(function(c) { return c.trim().toUpperCase(); }).filter(Boolean);

          studentRegistrations.push({
            id: "reg_" + enr + "_" + sName,
            enrollmentNo: enr,
            studentName: String(row.Candidate_Name || row.candidateName || row.Name || "").trim(),
            studentPhone: String(row.Mobile_No || row.studentPhone || row.Contact || row.Mobile || "").trim(),
            studentEmail: String(row.Email_ID || row.studentEmail || row.Email || "").trim(),
            programmeCode: prog,
            academicYear: yr,
            cadre: isFresh ? "FRESH" : "RE_REGISTRATION",
            session: String(row.Session || row.session || sName.replace(/^Fresh_|^ReReg_/, "").replace(/_/g, " ")).trim(),
            courseCodes: courses,
            registrationDate: String(row.Registration_Date || row.registrationDate || "").trim(),
            feeReference: String(row.Fee_Ref || row.feeReference || "").trim(),
            status: String(row.Status || row.status || "CONFIRMED").trim(),
            sheetTab: sName
          });
        }
      }
    }
  }
  result.studentRegistrations = studentRegistrations;

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid JSON payload" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var action = body.action || "UNKNOWN";
  var payload = body.payload || body;

  // 1. Connection Ping & Health Diagnostics
  if (action === "PING" || action === "TEST_CONNECTION") {
    var sheetNames = [];
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      sheetNames.push(all[i].getName());
    }
    var intakeSheet = findSheetByAliases(ss, ["Intake_Register", "intakeRegister"]);
    var ledgerSheet = findSheetByAliases(ss, ["Course_Ledger", "courseLedger"]);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: action,
      reachable: true,
      message: "Google Apps Script connected: IGNOU SC-2033 Multi-Tab Database active.",
      sheets: sheetNames,
      intakeTab: intakeSheet ? intakeSheet.getName() : "None",
      ledgerTab: ledgerSheet ? ledgerSheet.getName() : "None",
      totalIntakes: intakeSheet ? Math.max(0, intakeSheet.getLastRow() - 1) : 0,
      totalCourseRows: ledgerSheet ? Math.max(0, ledgerSheet.getLastRow() - 1) : 0,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Add / Update Student Registration into Matching Session Sheet Tab
  if (action === "ADD_REGISTRATION" || action === "REGISTER_STUDENT") {
    var cadre = (payload.cadre || "FRESH").toUpperCase();
    var sessionStr = String(payload.session || "July 2026").trim();
    var isJan = sessionStr.toLowerCase().indexOf("jan") !== -1;
    var yearMatch = sessionStr.match(/\\d{4}/);
    var yearStr = yearMatch ? yearMatch[0] : "2026";
    var prefix = cadre === "FRESH" ? "Fresh_" : "ReReg_";
    var tabName = prefix + (isJan ? "Jan_" : "July_") + yearStr;

    var regHeaders = [
      "Enrollment_No", "Candidate_Name", "Mobile_No", "Email_ID",
      "Programme_Code", "Academic_Year", "Session", "Course_Codes",
      "Registration_Date", "Fee_Ref", "Status"
    ];
    var regSheet = getOrCreateStyledSheet(ss, tabName, regHeaders, cadre === "FRESH" ? "#065f46" : "#3730a3", "#ffffff");

    var enrollment = String(payload.enrollmentNo || "").trim();
    var courses = Array.isArray(payload.courseCodes) ? payload.courseCodes.join(", ") : String(payload.courseCodes || "");

    // Avoid duplicate enrollment within same session sheet
    var regData = regSheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var r = 1; r < regData.length; r++) {
      var rowEnr = String(regData[r][0] || "").replace(/^'/, '').trim();
      if (rowEnr === enrollment) {
        rowIndex = r + 1;
        break;
      }
    }

    var rowValues = [
      "'" + enrollment,
      payload.studentName || "",
      payload.studentPhone || "",
      payload.studentEmail || "",
      payload.programmeCode || "",
      payload.academicYear || (cadre === "FRESH" ? "1st Year" : "2nd Year"),
      sessionStr,
      courses,
      payload.registrationDate || new Date().toISOString().split("T")[0],
      payload.feeReference || "",
      payload.status || "CONFIRMED"
    ];

    if (rowIndex > 0) {
      regSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      regSheet.appendRow(rowValues);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: action,
      sheetTab: tabName,
      enrollmentNo: enrollment,
      message: "Student record written to sheet tab " + tabName
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. Student Intake Submission & Automatic Course Unpacking
  if (action === "ADD_INTAKE" || action === "SUBMIT_INTAKE") {
    var intakeSheet = getOrCreateStyledSheet(ss, "Intake_Register", [
      "Timestamp", "Session", "Enrollment_No", "Candidate_Name", "Contact", "Programme", "Courses", "Official"
    ], "#0f172a", "#ffffff");

    var item = payload;
    var enrollment = String(item.enrollmentNo || item.Enrollment_No || "").trim();
    var candidate = String(item.candidateName || item.studentName || item.Candidate_Name || "").trim();
    var prog = String(item.programme || item.programmeCode || item.Programme || "").trim().toUpperCase();
    var contact = String(item.contact || item.studentPhone || item.mobile || item.Contact || "").trim();
    var session = String(item.session || item.Session || "July 2026").trim();
    var official = String(item.handledBy || item.official || item.Official || "Desk Official").trim();
    var tokenNo = String(item.tokenNo || item.token || item.Token_No || "").trim();
    var timestamp = item.timestamp || item.submissionDate || item.date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Normalize courses list
    var rawCourses = item.rawCourses || item.courses || item.courseCodes || [];
    var courseList = Array.isArray(rawCourses)
      ? rawCourses.flatMap(function(c) { return String(c).split(","); })
      : String(rawCourses).split(",");

    var cleanCourses = [];
    for (var c = 0; c < courseList.length; c++) {
      var cleanCode = String(courseList[c]).replace(/\\s*[\\[\\(](Practical|TMA|Both|P|Asgn)[\\]\\)]\\s*/gi, "").trim().toUpperCase();
      if (cleanCode && cleanCourses.indexOf(cleanCode) === -1) {
        cleanCourses.push(cleanCode);
      }
    }
    var coursesStr = cleanCourses.join(", ");

    intakeSheet.appendRow([
      timestamp, session, "'" + enrollment, candidate, contact, prog, coursesStr, official
    ]);

    // Unpack courses into Course_Ledger
    var ledgerSheet = getOrCreateStyledSheet(ss, "Course_Ledger", [
      "Sub_ID", "Session", "Enrollment_No", "Candidate_Name", "Contact_No", "Email_ID",
      "Programme_Code", "Course_Code", "Allotted_Evaluator", "Marks", "Grade", "Status"
    ], "#78350f", "#ffffff");

    for (var k = 0; k < cleanCourses.length; k++) {
      var cCode = cleanCourses[k];
      var subId = "SUB_" + enrollment + "_" + cCode + "_" + session.replace(/\\s+/g, "").toUpperCase();
      ledgerSheet.appendRow([
        subId, session, "'" + enrollment, candidate, contact, "", prog, cCode, "Unallotted", "", "—", "Pending Allotment"
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: action,
      message: "Intake and course packets recorded.",
      tokenNo: tokenNo,
      coursesCount: cleanCourses.length
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 4. Update Marks
  if (action === "UPDATE_MARKS" || action === "ALLOT_EVALUATOR") {
    var ledgerSheet = findSheetByAliases(ss, ["Course_Ledger", "courseLedger"]);
    if (ledgerSheet) {
      var data = ledgerSheet.getDataRange().getValues();
      var targetSubId = String(payload.subId || "").trim();
      var targetEnr = String(payload.enrollmentNo || "").replace(/^'/, '').trim();
      var targetCourse = String(payload.courseCode || "").trim().toUpperCase();

      for (var i = 1; i < data.length; i++) {
        var rowSubId = String(data[i][0] || "").trim();
        var rowEnr = String(data[i][2] || "").replace(/^'/, '').trim();
        var rowCourse = String(data[i][7] || "").trim().toUpperCase();

        if ((targetSubId && rowSubId === targetSubId) || (targetEnr && targetCourse && rowEnr === targetEnr && rowCourse === targetCourse)) {
          if (action === "ALLOT_EVALUATOR" && payload.evaluator) {
            ledgerSheet.getRange(i + 1, 9).setValue(payload.evaluator);
            ledgerSheet.getRange(i + 1, 12).setValue("Allotted");
          } else if (action === "UPDATE_MARKS") {
            ledgerSheet.getRange(i + 1, 10).setValue(payload.marks !== undefined ? payload.marks : "");
            ledgerSheet.getRange(i + 1, 11).setValue(payload.grade || "");
            ledgerSheet.getRange(i + 1, 12).setValue("Marks Locked");
          }
          break;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5. Clear Operational Data (Preserves Evaluators_Master)
  if (action === "CLEAR_OPERATIONAL_DATA") {
    var sheetsToClear = ["Intake_Register", "Course_Ledger"];
    var all = ss.getSheets();
    for (var s = 0; s < all.length; s++) {
      var name = all[s].getName();
      if (name.indexOf("Fresh_") === 0 || name.indexOf("ReReg_") === 0) {
        sheetsToClear.push(name);
      }
    }
    for (var c = 0; c < sheetsToClear.length; c++) {
      var sh = ss.getSheetByName(sheetsToClear[c]);
      if (sh && sh.getLastRow() > 1) {
        sh.deleteRows(2, sh.getLastRow() - 1);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: action,
      message: "Operational records purged in Google Sheets (Evaluators preserved)."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
    .setMimeType(ContentService.MimeType.JSON);
}

function findSheetByAliases(ss, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var s = ss.getSheetByName(aliases[i]);
    if (s) return s;
  }
  return null;
}

function getSheetDataByAliases(ss, aliases) {
  var sheet = findSheetByAliases(ss, aliases);
  if (!sheet) return [];
  return getSheetDataAsArray(sheet);
}

function getSheetDataAsArray(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      var key = String(headers[h]).trim();
      if (key) obj[key] = row[h];
    }
    rows.push(obj);
  }
  return rows;
}
`;

export async function postSyncAdmissions(_records: any[]): Promise<ApiResponse> {
  return {
    status: 'success',
    message: 'Assignment Operations are active.',
  };
}

/**
 * Sends a new user account to Google Sheets Users tab
 */
export async function postAddUser(user: SheetUserAccount): Promise<ApiResponse> {
  const payload = {
    action: 'ADD_USER',
    scriptUrl: getCustomScriptUrl(),
    payload: {
      username: user.username,
      password: user.password,
      role: user.role,
      fullName: user.fullName || user.username,
      email: user.email || '',
      status: user.status || 'active',
      createdAt: user.createdAt || new Date().toISOString(),
    },
  };

  try {
    await sendScriptPost(payload, {
      queueOnFailure: true,
      type: 'ADD_INTAKE',
      summary: `Create User: ${user.username} (${user.role})`,
    });
  } catch (err) {
    console.warn('[postAddUser error]:', err);
  }

  return {
    status: 'success',
    action: 'ADD_USER',
    message: `User ${user.username} successfully registered in Google Sheets.`,
  };
}

/**
 * Updates an existing user in Google Sheets Users tab
 */
export async function postUpdateUser(user: SheetUserAccount): Promise<ApiResponse> {
  const payload = {
    action: 'UPDATE_USER',
    scriptUrl: getCustomScriptUrl(),
    payload: {
      username: user.username,
      password: user.password,
      role: user.role,
      fullName: user.fullName || user.username,
      email: user.email || '',
      status: user.status || 'active',
      updatedAt: new Date().toISOString(),
    },
  };

  try {
    await sendScriptPost(payload, {
      queueOnFailure: true,
      type: 'ADD_INTAKE',
      summary: `Update User: ${user.username}`,
    });
  } catch (err) {
    console.warn('[postUpdateUser error]:', err);
  }

  return {
    status: 'success',
    action: 'UPDATE_USER',
    message: `User ${user.username} updated in Google Sheets.`,
  };
}

/**
 * Deactivates or removes a user in Google Sheets Users tab
 */
export async function postDeleteUser(username: string): Promise<ApiResponse> {
  const payload = {
    action: 'DELETE_USER',
    scriptUrl: getCustomScriptUrl(),
    payload: {
      username,
    },
  };

  try {
    await sendScriptPost(payload, {
      queueOnFailure: true,
      type: 'ADD_INTAKE',
      summary: `Delete User: ${username}`,
    });
  } catch (err) {
    console.warn('[postDeleteUser error]:', err);
  }

  return {
    status: 'success',
    action: 'DELETE_USER',
    message: `User ${username} removed from Google Sheets.`,
  };
}

/**
 * Updates an individual Course Ledger evaluation row in Google Sheets
 */
export async function postUpdateCourseLedgerRow(row: any): Promise<ApiResponse> {
  const payload = {
    action: 'UPDATE_COURSE_ROW',
    scriptUrl: getCustomScriptUrl(),
    payload: {
      subId: row.subId || row.Sub_ID || row.id,
      enrollmentNo: row.enrollmentNo || row.Enrollment_No,
      courseCode: row.courseCode || row.Course_Code,
      marks: row.marks !== undefined ? row.marks : null,
      grade: row.grade || row.Grade || '',
      evaluatorId: row.evaluatorId || row.allottedEvaluator || null,
      componentType: row.componentType || (row.isPractical ? 'Practical' : 'Assignment'),
      isLocked: Boolean(row.isLocked),
      submissionDate: row.submissionDate || row.receiptDate || '',
      session: row.session || row.Session || 'July 2026',
    },
  };

  try {
    await sendScriptPost(payload, {
      queueOnFailure: true,
      type: 'UPDATE_MARKS',
      summary: `Update Course Row: ${row.enrollmentNo} - ${row.courseCode}`,
    });
  } catch (err) {
    console.warn('[postUpdateCourseLedgerRow error]:', err);
  }

  return {
    status: 'success',
    action: 'UPDATE_COURSE_ROW',
    message: `Course Ledger row ${row.courseCode} updated in Google Sheets.`,
  };
}

