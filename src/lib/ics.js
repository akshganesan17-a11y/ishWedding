import { eventTimes, mapsUrl } from './content.js';

// Builds invite.ics with both events in Asia/Kolkata. India has no DST, so
// the VTIMEZONE is a single STANDARD block at +05:30.

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const d = (date) => date.replace(/-/g, '');
const hms = ({ h, m }) => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;

// RFC 5545 lines must be folded at 75 octets.
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      len = 0;
    }
    cur += ch;
    len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function vevent(uid, e, summary, location, description, alarm) {
  const lines = ['BEGIN:VEVENT', `UID:${uid}`, 'DTSTAMP:20260901T000000Z'];
  if (e.allDay) {
    const next = new Date(`${e.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${d(e.date)}`, `DTEND;VALUE=DATE:${d(next.toISOString().slice(0, 10))}`);
  } else {
    lines.push(
      `DTSTART;TZID=Asia/Kolkata:${d(e.date)}T${hms(e.start)}`,
      `DTEND;TZID=Asia/Kolkata:${d(e.date)}T${hms(e.end)}`,
    );
  }
  lines.push(
    `SUMMARY:${esc(summary)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description)}`,
    'BEGIN:VALARM',
    `TRIGGER:${alarm}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(summary)}`,
    'END:VALARM',
    'END:VEVENT',
  );
  return lines;
}

export function buildIcs(c, t) {
  const times = eventTimes(c);
  const maps = mapsUrl(c);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Akash & Iswaryalakshmi//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...vevent(
      'reception-20261029@akash-iswaryalakshmi',
      times.reception,
      t.calendar.reception,
      t.venue,
      [times.reception.allDay ? t.calendar.timeTba : '', maps].filter(Boolean).join('\n'),
      '-PT3H',
    ),
    ...vevent('muhurtham-20261030@akash-iswaryalakshmi', times.muhurtham, t.calendar.muhurtham, t.venue, `${t.muhurtham.lagnam}\n${maps}`,
      // The evening before, rather than in the small hours.
      '-PT10H'),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
