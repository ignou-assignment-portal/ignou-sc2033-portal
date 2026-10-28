/**
 * Server-side IGNOU Course and Programme Lookup Service
 * Resolves official Course Titles & Programme Information from ignou.ac.in
 */

import { EXTENDED_IGNOU_PROGRAMMES, GLOBAL_IGNOU_COURSE_DICTIONARY, formatIgnouCourseCode, cleanIgnouTitle } from '../data/ignouComprehensiveCatalog';

// In-memory cache for fast repeated lookups
const memoryCache = new Map<string, { title: string; credits: number; programme: string; source: string }>();

// Additional known programmes database
const KNOWN_PROGRAMMES: Record<string, { name: string; level: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate'; department: string }> = {
  BCA: { name: 'Bachelor of Computer Applications', level: 'Bachelor', department: 'School of Computer and Information Sciences (SOCIS)' },
  MCA: { name: 'Master of Computer Applications', level: 'Master', department: 'School of Computer and Information Sciences (SOCIS)' },
  BLIS: { name: 'Bachelor of Library and Information Science', level: 'Bachelor', department: 'School of Social Sciences (SOSS)' },
  MLIS: { name: 'Master of Library and Information Science', level: 'Master', department: 'School of Social Sciences (SOSS)' },
  BCOMG: { name: 'Bachelor of Commerce (General)', level: 'Bachelor', department: 'School of Management Studies (SOMS)' },
  MCOM: { name: 'Master of Commerce', level: 'Master', department: 'School of Management Studies (SOMS)' },
  MAH: { name: 'Master of Arts (History)', level: 'Master', department: 'School of Social Sciences (SOSS)' },
  MBA: { name: 'Master of Business Administration', level: 'Master', department: 'School of Management Studies (SOMS)' },
  DTS: { name: 'Diploma in Tourism Studies', level: 'Diploma', department: 'School of Tourism and Hospitality Services Management (SOTHSM)' },
  BTS: { name: 'Bachelor of Arts (Tourism Studies)', level: 'Bachelor', department: 'School of Tourism and Hospitality Services Management (SOTHSM)' },
  PGDRD: { name: 'Post Graduate Diploma in Rural Development', level: 'Diploma', department: 'School of Continuing Education (SOCE)' },
  DNHE: { name: 'Diploma in Nutrition and Health Education', level: 'Diploma', department: 'School of Continuing Education (SOCE)' },
  BSCG: { name: 'Bachelor of Science (General)', level: 'Bachelor', department: 'School of Sciences (SOS)' },
  BAG: { name: 'Bachelor of Arts (General)', level: 'Bachelor', department: 'School of Humanities / Social Sciences' },
  BAEGH: { name: 'Bachelor of Arts (Honours) English', level: 'Bachelor', department: 'School of Humanities (SOH)' },
  MEG: { name: 'Master of Arts (English)', level: 'Master', department: 'School of Humanities (SOH)' },
  MPS: { name: 'Master of Arts (Political Science)', level: 'Master', department: 'School of Social Sciences (SOSS)' },
  MSO: { name: 'Master of Arts (Sociology)', level: 'Master', department: 'School of Social Sciences (SOSS)' },
  MPA: { name: 'Master of Arts (Public Administration)', level: 'Master', department: 'School of Social Sciences (SOSS)' },
  MEC: { name: 'Master of Arts (Economics)', level: 'Master', department: 'School of Social Sciences (SOSS)' },
  DECE: { name: 'Diploma in Early Childhood Care and Education', level: 'Diploma', department: 'School of Continuing Education (SOCE)' },
  PGDCA: { name: 'Post Graduate Diploma in Computer Applications', level: 'Diploma', department: 'School of Computer and Information Sciences (SOCIS)' },
  BAPAH: { name: 'Bachelor of Arts (Honours) Public Administration', level: 'Bachelor', department: 'School of Social Sciences (SOSS)' },
  BAHDH: { name: 'Bachelor of Arts (Honours) Hindi', level: 'Bachelor', department: 'School of Humanities (Hindi)' },
  BAPCH: { name: 'Bachelor of Arts (Honours) Psychology', level: 'Bachelor', department: 'School of Social Sciences (SOSS)' },
  BASOH: { name: 'Bachelor of Arts (Honours) Sociology', level: 'Bachelor', department: 'School of Social Sciences (SOSS)' },
};

/**
 * Fetch course title live by searching ignou.ac.in archives and question papers
 */
export async function fetchCourseTitleFromIgnouWeb(courseCode: string): Promise<string | null> {
  const code = formatIgnouCourseCode(courseCode);
  const rawCode = courseCode.trim().toUpperCase();

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:ignou.ac.in ' + code)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const html = await res.text();
    const snippetMatches = html.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi);

    if (!snippetMatches || snippetMatches.length === 0) return null;

    // Pattern 1: CODE : TITLE (e.g. "MCS-011 : PROBLEM SOLVING AND PROGRAMMING")
    const escapedCode = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedRaw = rawCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(
      `(?:${escapedCode}|${escapedRaw})\\s*[:\\-]\\s*([A-Za-z0-9&,/\\x27\\-\\s]{4,70}?)(?=\\s*(?:Time|Maximum|Weightage|Note|Question|\\.|\\n|$))`,
      'i'
    );

    for (const snippet of snippetMatches) {
      const cleanSnippet = snippet.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
      const match = cleanSnippet.match(regex);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Discard candidates that are just metadata words or school names
        if (
          candidate.length > 3 &&
          !/^(time|maximum|weightage|bachelor|master|certificate|diploma|note)/i.test(candidate)
        ) {
          return cleanIgnouTitle(candidate);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[IGNOU Web Lookup] Timeout or error querying ignou.ac.in for ${courseCode}:`, err.message);
  }

  return null;
}

/**
 * Resolve Course Info with multi-layer resolution:
 * 1. Cache
 * 2. Extended Catalog
 * 3. Live search on ignou.ac.in
 * 4. Algorithmic fallback
 */
export async function resolveCourse(
  courseCode: string,
  programmeCode?: string,
  forceLive = false
): Promise<{ code: string; title: string; credits: number; programme: string; source: string; verified: boolean }> {
  const cleanCode = formatIgnouCourseCode(courseCode);
  const cacheKey = `${cleanCode}_${programmeCode || 'ANY'}`;

  if (!forceLive && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!;
    return {
      code: cleanCode,
      ...cached,
      verified: true,
    };
  }

  // 1. Check local catalog
  const catalogEntry = GLOBAL_IGNOU_COURSE_DICTIONARY[cleanCode] || GLOBAL_IGNOU_COURSE_DICTIONARY[courseCode.trim().toUpperCase()];
  if (catalogEntry && !forceLive) {
    const result = {
      code: cleanCode,
      title: catalogEntry.title,
      credits: catalogEntry.credits || 6,
      programme: programmeCode || catalogEntry.programme || 'IGNOU',
      source: 'ignou.ac.in catalog',
      verified: true,
    };
    memoryCache.set(cacheKey, {
      title: result.title,
      credits: result.credits,
      programme: result.programme,
      source: result.source,
    });
    return result;
  }

  // 2. Try live lookup from ignou.ac.in
  const liveTitle = await fetchCourseTitleFromIgnouWeb(cleanCode);
  if (liveTitle) {
    const credits = /lab|practical|project/i.test(liveTitle) ? 2 : 4;
    const result = {
      code: cleanCode,
      title: liveTitle,
      credits,
      programme: programmeCode || 'IGNOU',
      source: 'ignou.ac.in',
      verified: true,
    };
    memoryCache.set(cacheKey, {
      title: result.title,
      credits: result.credits,
      programme: result.programme,
      source: result.source,
    });
    return result;
  }

  // 3. If catalog entry exists but live didn't find anything better, use catalog
  if (catalogEntry) {
    const result = {
      code: cleanCode,
      title: catalogEntry.title,
      credits: catalogEntry.credits || 6,
      programme: programmeCode || catalogEntry.programme || 'IGNOU',
      source: 'ignou.ac.in catalog',
      verified: true,
    };
    memoryCache.set(cacheKey, {
      title: result.title,
      credits: result.credits,
      programme: result.programme,
      source: result.source,
    });
    return result;
  }

  // 4. Algorithmic fallback based on standard code prefix
  const prefix = cleanCode.split('-')[0] || cleanCode.slice(0, 4);
  const progPrefix = programmeCode ? `${programmeCode.toUpperCase()} ` : '';
  const fallbackTitle = `${progPrefix}Course Module ${cleanCode}`;

  return {
    code: cleanCode,
    title: fallbackTitle,
    credits: 6,
    programme: programmeCode || 'IGNOU',
    source: 'inferred',
    verified: false,
  };
}

/**
 * Resolve Programme Details
 */
export function resolveProgramme(progCode: string): { code: string; name: string; level: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate'; department: string; isStandard: boolean } {
  const clean = progCode.trim().toUpperCase();

  // Check extended catalog
  const found = EXTENDED_IGNOU_PROGRAMMES.find((p) => p.code.toUpperCase() === clean);
  if (found) {
    return {
      code: found.code,
      name: found.name,
      level: found.level,
      department: found.department,
      isStandard: true,
    };
  }

  // Check known programmes
  if (KNOWN_PROGRAMMES[clean]) {
    const k = KNOWN_PROGRAMMES[clean];
    return {
      code: clean,
      name: k.name,
      level: k.level,
      department: k.department,
      isStandard: true,
    };
  }

  // Infer level
  let level: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate' = 'Bachelor';
  if (clean.startsWith('M') || clean.startsWith('PG')) {
    level = 'Master';
  } else if (clean.startsWith('D') || clean.includes('DIP')) {
    level = 'Diploma';
  } else if (clean.startsWith('C') || clean.includes('CERT')) {
    level = 'Certificate';
  }

  return {
    code: clean,
    name: `${clean} Programme`,
    level,
    department: 'IGNOU Academic Division',
    isStandard: false,
  };
}
