// تقرير قراءة فقط عن المسائل المحلية والنسخة الاحتياطية، واختياريًا Firestore.
// الاستخدام: npm run audit:data  أو  npm run audit:data -- --live
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  try {
    return Object.fromEntries(readFileSync(join(root, '.env.local'), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const splitAt = line.indexOf('=');
        return [line.slice(0, splitAt).trim(), line.slice(splitAt + 1).trim()];
      }));
  } catch {
    return {};
  }
}

function summarize(lessons, { checkFields = true } = {}) {
  const ids = lessons.map((lesson) => String(lesson?.id ?? '').trim()).filter(Boolean);
  const counts = new Map();
  const numeric = new Set();
  const incomplete = [];
  lessons.forEach((lesson, index) => {
    const id = String(lesson?.id ?? '').trim();
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    const numericId = Number(id);
    if (Number.isSafeInteger(numericId) && numericId > 0) numeric.add(numericId);
    if (checkFields && (!id || !String(lesson?.title ?? '').trim() || !String(lesson?.bookName ?? '').trim() || !String(lesson?.chapterName ?? '').trim())) {
      incomplete.push(id || `row-${index + 1}`);
    }
  });
  const maxId = [...numeric].reduce((maximum, id) => Math.max(maximum, id), 0);
  const gaps = [];
  if (maxId <= 100_000) {
    for (let id = 1; id <= maxId; id += 1) if (!numeric.has(id)) gaps.push(id);
  }
  return {
    count: lessons.length,
    uniqueIdCount: new Set(ids).size,
    maxNumericId: numeric.size ? maxId : null,
    missingNumericIds: gaps,
    duplicateIds: [...counts].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count })),
    incompleteRows: incomplete,
  };
}

function loadLocalIds() {
  const source = readFileSync(join(root, 'src', 'data', 'lessons.ts'), 'utf8');
  return [...source.matchAll(/"id"\s*:\s*(\d+)/g)].map(([, id]) => ({ id }));
}

function loadLocalLessons() {
  const source = readFileSync(join(root, 'src', 'data', 'lessons.ts'), 'utf8');
  const declaration = source.indexOf('export const lessonsData');
  const equals = source.indexOf('=', declaration);
  const start = source.indexOf('[', equals);
  const end = source.lastIndexOf(']');
  if (declaration < 0 || equals < 0 || start < 0 || end < start) throw new Error('تعذر قراءة مصفوفة المسائل المحلية');
  return JSON.parse(source.slice(start, end + 1));
}

function compareContent(referenceLessons, comparedLessons) {
  const referenceById = new Map(referenceLessons.map((lesson) => [String(lesson?.id ?? ''), lesson]));
  const comparedById = new Map(comparedLessons.map((lesson) => [String(lesson?.id ?? ''), lesson]));
  const differences = [];

  for (const [id, reference] of referenceById) {
    const compared = comparedById.get(id);
    if (!compared) continue;
    const fields = [...new Set([...Object.keys(reference ?? {}), ...Object.keys(compared ?? {})])]
      .filter((field) => field !== '_docId')
      .filter((field) => JSON.stringify(reference?.[field] ?? null) !== JSON.stringify(compared?.[field] ?? null));
    if (fields.length) differences.push({
      id,
      fields: fields.map((field) => {
        const display = (value, exists) => {
          if (!exists) return '[غير موجود]';
          if (typeof value === 'string' && value.length > 120) return `${value.slice(0, 120)}…`;
          return value;
        };
        return {
          field,
          reference: display(reference?.[field], Object.hasOwn(reference ?? {}, field)),
          compared: display(compared?.[field], Object.hasOwn(compared ?? {}, field)),
        };
      }),
    });
  }

  return {
    sharedIdCount: [...referenceById.keys()].filter((id) => comparedById.has(id)).length,
    differentLessonCount: differences.length,
    differences,
  };
}

function loadLatestBackup() {
  const dir = join(root, 'backups');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => /^firestore-backup-.*\.json$/i.test(name))
    .sort((a, b) => {
      const stamp = (name) => name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})/)?.[1] ?? '';
      return stamp(b).localeCompare(stamp(a)) || statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs;
    });
  for (const name of files) {
    try {
      const payload = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      if (Array.isArray(payload?.collections?.lessons)) return { name, lessons: payload.collections.lessons };
    } catch {
      // تجاوز ملف احتياطي تالف والبحث عن الملف التالي.
    }
  }
  return null;
}

async function loadLiveLessons() {
  const env = readEnv();
  const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
  const missingKeys = required.filter((key) => !env[key]);
  if (missingKeys.length) return { error: `مفاتيح Firebase ناقصة: ${missingKeys.join(', ')}` };

  try {
    const lessons = [];
    let nextPageToken = '';
    do {
      const url = new URL(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.VITE_FIREBASE_PROJECT_ID)}/databases/(default)/documents/lessons`);
      url.searchParams.set('pageSize', '1000');
      url.searchParams.set('key', env.VITE_FIREBASE_API_KEY);
      if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error(`Firestore REST returned HTTP ${response.status}`);
      const payload = await response.json();
      const decode = (value) => {
        if ('stringValue' in value) return value.stringValue;
        if ('integerValue' in value) return Number(value.integerValue);
        if ('doubleValue' in value) return value.doubleValue;
        if ('booleanValue' in value) return value.booleanValue;
        if ('nullValue' in value) return null;
        if ('timestampValue' in value) return value.timestampValue;
        if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
        if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, nested]) => [key, decode(nested)]));
        return undefined;
      };
      for (const document of payload.documents ?? []) {
        const data = Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key, decode(value)]));
        lessons.push({ _docId: document.name.split('/').at(-1), ...data });
      }
      nextPageToken = payload.nextPageToken ?? '';
    } while (nextPageToken);
    return {
      source: 'server',
      lessons,
    };
  } catch (error) {
    return { error: String(error?.code || error?.message || 'تعذرت قراءة Firestore').slice(0, 180) };
  }
}

const localLessons = loadLocalLessons();
const local = loadLocalIds();
const backup = loadLatestBackup();
const localIds = new Set(local.map((lesson) => String(lesson.id)));
const backupIds = new Set(backup?.lessons.map((lesson) => String(lesson?.id ?? '')) ?? []);
const report = {
  generatedAt: new Date().toISOString(),
  local: { ...summarize(local, { checkFields: false }), fieldValidation: 'معرّفات الملف المحلي فقط' },
  backup: backup ? { file: backup.name, ...summarize(backup.lessons) } : null,
  localOnlyIds: backup ? [...localIds].filter((id) => !backupIds.has(id)).sort((a, b) => Number(a) - Number(b)) : [],
  backupOnlyIds: backup ? [...new Set(backup.lessons.map((lesson) => String(lesson?.id ?? '')))].filter((id) => id && !localIds.has(id)).sort((a, b) => Number(a) - Number(b)) : [],
  localVsBackupContent: backup ? compareContent(localLessons, backup.lessons) : null,
};

if (process.argv.includes('--live')) {
  const live = await loadLiveLessons();
  report.live = live.lessons
    ? { source: live.source, ...summarize(live.lessons) }
    : { unavailable: live.error };
  if (live.lessons && live.source === 'server') {
    const liveIds = new Set(live.lessons.map((lesson) => String(lesson?.id ?? '')));
    report.liveOnlyIds = [...liveIds].filter((id) => id && !localIds.has(id)).sort((a, b) => Number(a) - Number(b));
    report.localOnlyVsLiveIds = [...localIds].filter((id) => !liveIds.has(id)).sort((a, b) => Number(a) - Number(b));
    report.localVsLiveContent = compareContent(localLessons, live.lessons);
  }
}

console.log(JSON.stringify(report, null, 2));
