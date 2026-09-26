import {
  googleCalendarUrl,
  isPlaceholder,
  mapsUrl,
  muhurthamTime,
  receptionTime,
} from '../lib/content.js';

// Renders the whole invitation as an HTML string. Used at build time to
// prerender English into index.html (so text shows before any JS runs) and
// at runtime to switch language.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const icon = {
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  place: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.3 6-10.5a6 6 0 1 0-12 0C6 15.7 12 21 12 21Z"/></svg>',
  speaker:
    '<svg class="i-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>' +
    '<svg class="i-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>',
  kolam:
    '<svg class="kolam-mark" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><path d="M32 6c9 9 9 17 0 26-9-9-9-17 0-26ZM32 58c-9-9-9-17 0-26 9 9 9 17 0 26ZM6 32c9-9 17-9 26 0-9 9-17 9-26 0ZM58 32c-9 9-17 9-26 0 9-9 17-9 26 0Z"/><circle cx="32" cy="32" r="4"/></g><g fill="currentColor"><circle cx="16" cy="16" r="1.6"/><circle cx="48" cy="16" r="1.6"/><circle cx="16" cy="48" r="1.6"/><circle cx="48" cy="48" r="1.6"/></g></svg>',
};

export function renderApp(c, lang, { guest = '' } = {}) {
  const t = c.text[lang];
  const ics = lang === 'ta' ? 'invite-ta.ics' : 'invite.ics';
  const hasMusic = !isPlaceholder(c.music.src);
  const other = lang === 'ta' ? 'en' : 'ta';
  const hasCouple = Boolean(c.couple.photo);
  const couple = hasCouple
    ? `<div class="couple"><img src="${esc(c.couple.photo)}" alt="${esc(t.groom)} &amp; ${esc(t.bride)}" decoding="async" fetchpriority="high"></div>`
    : '';

  return `
<header class="bar">
  <a class="bar-btn skip" href="#details" data-action="skip">${esc(t.ui.skip)}</a>
  <div class="bar-end">
    <button class="bar-btn lang" type="button" data-action="lang" data-lang="${other}" lang="${other}" aria-label="${esc(t.ui.langSwitchLabel)}">${esc(t.ui.langSwitch)}</button>
    <button class="bar-btn icon-btn music" type="button" data-action="music" aria-pressed="false" aria-label="${esc(t.ui.musicPlay)}" data-label-play="${esc(t.ui.musicPlay)}" data-label-pause="${esc(t.ui.musicPause)}"${hasMusic ? '' : ' hidden'}>${icon.speaker}</button>
  </div>
</header>

<main class="story">
  <section class="ch ch-welcome" id="welcome" data-ch="0">
    <div class="panel panel-welcome${hasCouple ? ' has-couple' : ''}">
      ${guest ? `<p class="greeting">${esc(t.greeting.replace('{name}', guest))}</p>` : ''}
      <p class="kicker">${esc(t.kicker)}</p>
      <h1 class="names">
        <span class="name">${esc(t.groom)}</span>
        <span class="amp" aria-label="and">&amp;</span>
        <span class="name">${esc(t.bride)}</span>
      </h1>
      <p class="invite">${esc(t.invite)}</p>
      <p class="dates-short">${esc(t.datesShort)}</p>
      <p class="full-names">${esc(t.groomFull)} · ${esc(t.brideFull)}</p>
      ${couple}
      <div class="scroll-hint" aria-hidden="true"><span>${esc(t.scrollHint)}</span><i></i></div>
    </div>
  </section>

  <section class="ch ch-event" id="reception" data-ch="1">
    <div class="panel"><div class="card">
      <p class="eyebrow">${esc(t.reception.eyebrow)}</p>
      <h2 class="title">${esc(t.reception.title)}</h2>
      <p class="date">${esc(t.reception.date)}</p>
      <dl class="facts">
        <div><dt>${icon.clock}<span class="sr">${esc(t.timeLabel)}</span></dt><dd>${esc(receptionTime(c, t))}</dd></div>
        <div><dt>${icon.place}<span class="sr">${esc(t.venueLabel)}</span></dt><dd>${esc(t.venue)}</dd></div>
      </dl>
      <p class="note">${esc(t.reception.note)}</p>
    </div></div>
  </section>

  <section class="ch ch-event" id="muhurtham" data-ch="2">
    <div class="panel"><div class="card">
      <p class="eyebrow">${esc(t.muhurtham.eyebrow)}</p>
      <h2 class="title">${esc(t.muhurtham.title)}</h2>
      <p class="date">${esc(t.muhurtham.date)}</p>
      <dl class="facts">
        <div><dt>${icon.clock}<span class="sr">${esc(t.timeLabel)}</span></dt><dd>${esc(muhurthamTime(c, t))}<span class="lagnam">${esc(t.muhurtham.lagnam)}</span></dd></div>
        <div><dt>${icon.place}<span class="sr">${esc(t.venueLabel)}</span></dt><dd>${esc(t.venue)}</dd></div>
      </dl>
      <p class="note">${esc(t.muhurtham.note)}</p>
    </div></div>
  </section>

  <section class="ch ch-details" id="details" data-ch="3" tabindex="-1">
    <div class="panel card card-details">
      ${icon.kolam}
      <p class="eyebrow">${esc(t.details.eyebrow)}</p>
      <h2 class="title title-sm">${esc(t.details.title)}</h2>
      <ul class="summary">
        <li><strong>${esc(t.reception.title)}</strong><span>${esc(t.reception.date)}</span><span>${esc(receptionTime(c, t))}</span></li>
        <li><strong>${esc(t.muhurtham.title)}</strong><span>${esc(t.muhurtham.date)}</span><span>${esc(muhurthamTime(c, t))}</span><span>${esc(t.muhurtham.lagnam)}</span></li>
      </ul>
      <p class="venue-line">${icon.place}<span>${esc(t.venue)}</span></p>
      <div class="actions">
        <a class="btn btn-primary" href="${esc(mapsUrl(c))}" target="_blank" rel="noopener">${icon.pin}<span>${esc(t.details.maps)}</span></a>
        <a class="btn" href="${ics}" download="akash-iswaryalakshmi-wedding.ics" type="text/calendar">${icon.cal}<span>${esc(t.details.calendar)}</span></a>
      </div>
      <p class="gcal">${esc(t.details.googleCal)}
        <a href="${esc(googleCalendarUrl(c, t, 'reception'))}" target="_blank" rel="noopener">${esc(t.reception.title)}</a> ·
        <a href="${esc(googleCalendarUrl(c, t, 'muhurtham'))}" target="_blank" rel="noopener">${esc(t.muhurtham.title)}</a>
      </p>
      <p class="printable"><a href="invite.pdf" target="_blank" rel="noopener">${esc(t.details.printable)}</a></p>
      <p class="signoff">${esc(t.details.signoff)}</p>
    </div>
  </section>
</main>`;
}
