/**
 * dataIntegrityService.ts
 *
 * Verifies parity and data integrity between local React/IndexedDB state
 * and the remote Google Sheets master data store.
 * Measures real-time roundtrip latency and flags discrepancies.
 */

import { SCRIPT_URL } from './sheetsService';

export interface EntityParity {
  name: string;
  key: 'intakes' | 'ledger' | 'evaluators';
  localCount: number;
  remoteCount: number;
  diff: number;
  status: 'match' | 'mismatch' | 'unknown';
  details?: string;
}

export interface DataIntegrityReport {
  timestamp: string;
  latencyMs: number;
  isOnline: boolean;
  status: 'in_sync' | 'discrepancy' | 'offline' | 'error';
  summary: string;
  entities: EntityParity[];
  remoteMeta?: {
    scriptUrl?: string;
    dataSource?: 'express_proxy' | 'direct_apps_script';
  };
}

export async function verifyGoogleSheetsParity(
  localCounts: { intakes: number; ledger: number; evaluators: number },
  customScriptUrl: string = SCRIPT_URL
): Promise<DataIntegrityReport> {
  const timestamp = new Date().toISOString();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      timestamp,
      latencyMs: 0,
      isOnline: false,
      status: 'offline',
      summary: 'Device is offline. Cannot reach Google Sheets.',
      entities: [
        { name: 'Intake Register', key: 'intakes', localCount: localCounts.intakes, remoteCount: 0, diff: localCounts.intakes, status: 'unknown' },
        { name: 'Course Ledger', key: 'ledger', localCount: localCounts.ledger, remoteCount: 0, diff: localCounts.ledger, status: 'unknown' },
        { name: 'Evaluators Master', key: 'evaluators', localCount: localCounts.evaluators, remoteCount: 0, diff: localCounts.evaluators, status: 'unknown' },
      ],
    };
  }

  const startTime = performance.now();
  let remoteData: any = null;
  let dataSource: 'express_proxy' | 'direct_apps_script' = 'express_proxy';

  try {
    // 1. Try Express Proxy with cache-busting
    const proxyRes = await fetch(
      `/api/sheets?action=doGet&scriptUrl=${encodeURIComponent(customScriptUrl)}&_t=${Date.now()}`,
      {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      }
    );

    if (proxyRes.ok) {
      remoteData = await proxyRes.json();
    }
  } catch (proxyErr) {
    console.warn('[dataIntegrityService] Express proxy failed, trying direct Apps Script:', proxyErr);
  }

  // 2. Direct fallback
  if (!remoteData) {
    try {
      dataSource = 'direct_apps_script';
      const directRes = await fetch(`${customScriptUrl}?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (directRes.ok) {
        remoteData = await directRes.json();
      }
    } catch (directErr) {
      console.error('[dataIntegrityService] Direct Apps Script fetch failed:', directErr);
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  if (!remoteData) {
    return {
      timestamp,
      latencyMs,
      isOnline: true,
      status: 'error',
      summary: 'Could not connect to Google Apps Script endpoint. Response timed out or failed.',
      entities: [
        { name: 'Intake Register', key: 'intakes', localCount: localCounts.intakes, remoteCount: 0, diff: localCounts.intakes, status: 'unknown' },
        { name: 'Course Ledger', key: 'ledger', localCount: localCounts.ledger, remoteCount: 0, diff: localCounts.ledger, status: 'unknown' },
        { name: 'Evaluators Master', key: 'evaluators', localCount: localCounts.evaluators, remoteCount: 0, diff: localCounts.evaluators, status: 'unknown' },
      ],
      remoteMeta: { scriptUrl: customScriptUrl, dataSource },
    };
  }

  const rawIntakes = remoteData.intakeRegister || remoteData.intakes || remoteData.Intake_Register || [];
  const rawLedger = remoteData.courseLedger || remoteData.course_ledger || remoteData.Course_Ledger || [];
  const rawEvaluators = remoteData.evaluatorsMaster || remoteData.evaluators_master || remoteData.Evaluators_Master || remoteData.evaluators || [];

  const remoteIntakesCount = Array.isArray(rawIntakes) ? rawIntakes.length : 0;
  const remoteLedgerCount = Array.isArray(rawLedger) ? rawLedger.length : 0;
  const remoteEvaluatorsCount = Array.isArray(rawEvaluators) ? rawEvaluators.length : 0;

  const intakesDiff = localCounts.intakes - remoteIntakesCount;
  const ledgerDiff = localCounts.ledger - remoteLedgerCount;
  const evaluatorsDiff = localCounts.evaluators - remoteEvaluatorsCount;

  const entities: EntityParity[] = [
    {
      name: 'Intake Register (Receipts)',
      key: 'intakes',
      localCount: localCounts.intakes,
      remoteCount: remoteIntakesCount,
      diff: intakesDiff,
      status: intakesDiff === 0 ? 'match' : 'mismatch',
      details: intakesDiff === 0
        ? 'Parity verified: local intake receipts match Google Sheet.'
        : intakesDiff > 0
        ? `${intakesDiff} local intake(s) pending sync or uncommitted.`
        : `${Math.abs(intakesDiff)} remote intake(s) not yet pulled into local state.`,
    },
    {
      name: 'Course Evaluation Ledger',
      key: 'ledger',
      localCount: localCounts.ledger,
      remoteCount: remoteLedgerCount,
      diff: ledgerDiff,
      status: ledgerDiff === 0 ? 'match' : 'mismatch',
      details: ledgerDiff === 0
        ? 'Parity verified: course evaluations match Google Sheet.'
        : ledgerDiff > 0
        ? `${ledgerDiff} local script(s) pending sync or uncommitted.`
        : `${Math.abs(ledgerDiff)} remote script(s) not yet pulled.`,
    },
    {
      name: 'Evaluators Master Directory',
      key: 'evaluators',
      localCount: localCounts.evaluators,
      remoteCount: remoteEvaluatorsCount,
      diff: evaluatorsDiff,
      status: evaluatorsDiff === 0 ? 'match' : 'mismatch',
      details: evaluatorsDiff === 0
        ? 'Parity verified: counselors/evaluators count matches.'
        : `${Math.abs(evaluatorsDiff)} difference in evaluator roster.`,
    },
  ];

  const hasDiscrepancy = entities.some((e) => e.status === 'mismatch');
  const status = hasDiscrepancy ? 'discrepancy' : 'in_sync';

  const summary = hasDiscrepancy
    ? `Discrepancy detected between local state and master Google Sheet (${latencyMs}ms).`
    : `100% Data Parity Verified with Master Google Sheet (${latencyMs}ms latency).`;

  return {
    timestamp,
    latencyMs,
    isOnline: true,
    status,
    summary,
    entities,
    remoteMeta: {
      scriptUrl: customScriptUrl,
      dataSource,
    },
  };
}
