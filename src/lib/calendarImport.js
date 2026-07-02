// Parses pasted calendar text into draft events for review before import.
// Supports two inputs: a real iCalendar (.ics) feed (strict, reliable), and
// free text copy-pasted from a race calendar webpage (heuristic, best
// effort - the user always reviews/edits the result before confirming).

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Deterministic UUID-shaped id derived from a seed string, so re-importing
// the same external event (same team + external uid) upserts the same row
// instead of creating a duplicate.
export async function deterministicUuid(seed) {
  const hex = await sha256Hex(seed);
  const bytes = hex.slice(0, 32);
  return `${bytes.slice(0, 8)}-${bytes.slice(8, 12)}-4${bytes.slice(13, 16)}-a${bytes.slice(17, 20)}-${bytes.slice(20, 32)}`;
}

function unfoldIcsLines(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .reduce((lines, line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseIcsDate(value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? 'Z' : ''}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isIcsText(text) {
  return /BEGIN:VCALENDAR/i.test(text) || /BEGIN:VEVENT/i.test(text);
}

export function parseIcs(text) {
  const lines = unfoldIcsLines(text);
  const events = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.summary && current?.start) {
        events.push({
          title: current.summary,
          start: current.start,
          end: current.end || current.start,
          location: current.location || '',
          externalUid: current.uid || null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const key = rawKey.split(';')[0].toUpperCase();

    if (key === 'SUMMARY') current.summary = value.replace(/\\,/g, ',').replace(/\\n/gi, ' ');
    else if (key === 'LOCATION') current.location = value.replace(/\\,/g, ',');
    else if (key === 'UID') current.uid = value;
    else if (key === 'DTSTART') current.start = parseIcsDate(value);
    else if (key === 'DTEND') current.end = parseIcsDate(value);
  }

  return events.filter((e) => e.start);
}

const MONTHS = {
  jan: 0, january: 0, januar: 0,
  feb: 1, february: 1, februar: 1,
  mar: 2, march: 2, mär: 2, maerz: 2, märz: 2,
  apr: 3, april: 3,
  may: 4, mai: 4,
  jun: 5, june: 5, juni: 5,
  jul: 6, july: 6, juli: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, okt: 9, oktober: 9,
  nov: 10, november: 10,
  dec: 11, december: 11, dez: 11, dezember: 11,
};

const DATE_PATTERNS = [
  // 12.07.2026 / 12/07/2026 / 12-07-2026
  { re: /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/, toISO: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
  // 2026-07-12
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, toISO: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
  // July 12, 2026 / July 12 2026
  {
    re: /\b([A-Za-zäöü]{3,})\s+(\d{1,2}),?\s+(\d{4})\b/,
    toISO: (m) => {
      const month = MONTHS[m[1].toLowerCase()];
      if (month === undefined) return null;
      return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    },
  },
  // 12 July 2026
  {
    re: /\b(\d{1,2})\.?\s+([A-Za-zäöü]{3,})\s+(\d{4})\b/,
    toISO: (m) => {
      const month = MONTHS[m[2].toLowerCase()];
      if (month === undefined) return null;
      return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    },
  },
];

// Best-effort scan of arbitrary pasted text: finds a date on each line and
// treats the rest of that line as the event title. Always meant to be
// reviewed/edited by the user before import, not treated as fully reliable.
export function parseFreeText(text) {
  const events = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern.re);
      if (!match) continue;
      const iso = pattern.toISO(match);
      if (!iso) continue;
      const date = new Date(`${iso}T09:00:00`);
      if (Number.isNaN(date.getTime())) continue;

      const title = line.replace(match[0], '').replace(/[-–|:•]+/g, ' ').trim() || 'Termin';
      events.push({
        title,
        start: date.toISOString(),
        end: date.toISOString(),
        location: '',
        externalUid: null,
      });
      break;
    }
  }
  return events;
}

export function parseCalendarText(text) {
  return isIcsText(text) ? parseIcs(text) : parseFreeText(text);
}
