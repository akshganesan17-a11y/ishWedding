// Pure helpers over content.json. No DOM access: this module also runs in
// Node at build time (vite.config.js) to prerender the page and invite.ics.

export const isPlaceholder = (v) => typeof v !== 'string' || v.trim() === '' || /^\[.*\]$/.test(v.trim());

export function parseTime(hhmm) {
  if (isPlaceholder(hhmm)) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function tamilPeriod(h, t) {
  if (h < 12) return t.morning;
  if (h < 16) return t.noon;
  if (h < 20) return t.evening;
  return t.night;
}

const clock = (h, m) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;

// Formats "19:00" as "7:00 PM" (en) or "மாலை 7:00" (ta). A range shares
// one period marker when both ends fall in the same period.
export function formatTime(start, end, t) {
  const a = parseTime(start);
  if (!a) return start;
  const b = end ? parseTime(end) : null;
  if (t.lang === 'ta') {
    const pa = tamilPeriod(a.h, t.time);
    if (!b) return `${pa} ${clock(a.h, a.m)}`;
    const pb = tamilPeriod(b.h, t.time);
    return pa === pb
      ? `${pa} ${clock(a.h, a.m)} – ${clock(b.h, b.m)}`
      : `${pa} ${clock(a.h, a.m)} – ${pb} ${clock(b.h, b.m)}`;
  }
  const sa = a.h < 12 ? t.time.am : t.time.pm;
  if (!b) return `${clock(a.h, a.m)} ${sa}`;
  const sb = b.h < 12 ? t.time.am : t.time.pm;
  return `${clock(a.h, a.m)} ${sa} ${t.time.to} ${clock(b.h, b.m)} ${sb}`;
}

export function receptionTime(c, t) {
  const r = c.events.reception;
  return `${formatTime(r.start, null, t)} ${t.reception.timeSuffix} (${t.timeZone})`;
}

export const muhurthamTime = (c, t) =>
  `${formatTime(c.events.muhurtham.start, c.events.muhurtham.end, t)} (${t.timeZone})`;

export function mapsUrl(c) {
  if (!isPlaceholder(c.venue.mapsUrl)) return c.venue.mapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.venue.mapsQuery)}`;
}

// Event start/end as local (Asia/Kolkata) wall-clock parts. When the
// reception time is still a placeholder the event is all-day.
export function eventTimes(c) {
  const r = c.events.reception;
  const m = c.events.muhurtham;
  const rs = parseTime(r.start);
  const addMin = ({ h, m: mm }, d) => {
    const t = h * 60 + mm + d;
    return { h: Math.floor(t / 60) % 24, m: t % 60 };
  };
  return {
    reception: rs
      ? { date: r.date, start: rs, end: addMin(rs, r.durationMinutes || 180) }
      : { date: r.date, allDay: true },
    muhurtham: { date: m.date, start: parseTime(m.start), end: parseTime(m.end) },
  };
}

const compactDate = (d) => d.replace(/-/g, '');
const hm = ({ h, m }) => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;

export function googleCalendarUrl(c, t, which) {
  const e = eventTimes(c)[which];
  let dates;
  if (e.allDay) {
    const next = new Date(`${e.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    dates = `${compactDate(e.date)}/${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
  } else {
    dates = `${compactDate(e.date)}T${hm(e.start)}/${compactDate(e.date)}T${hm(e.end)}`;
  }
  const details = e.allDay ? t.calendar.timeTba : '';
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: t.calendar[which],
    dates,
    ctz: 'Asia/Kolkata',
    location: t.venue,
    details: [details, mapsUrl(c)].filter(Boolean).join('\n'),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
