// Renders the sharing assets from the real scene and content.json:
//   public/og-image.jpg      1200×630, WhatsApp / social preview
//   public/invite-story.jpg  1080×1920, for WhatsApp status / Instagram
//   public/invite.pdf        A5, English then Tamil, for printing
// Run with `npm run capture` after editing src/content.json.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';
import { mapsUrl, muhurthamTime, receptionTime } from '../src/lib/content.js';

const root = resolve(import.meta.dirname, '..');
const out = (f) => resolve(root, 'public', f);
const content = JSON.parse(readFileSync(resolve(root, 'src/content.json'), 'utf8'));
const en = content.text.en;
const ta = content.text.ta;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Noto+Serif+Tamil:wght@400;600&display=block">';

// ---------- overlays drawn over the live scene ----------

const overlayCss = `
  #app, .bar, .poster { display: none !important; }
  .share { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center;
    color: #fff8ea; font-family: 'Cormorant Garamond', Georgia, serif; text-align: center; }
  .share .s-kicker { color: #f0c27a; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; margin: 0; }
  .share .s-names { font-style: italic; font-weight: 600; line-height: 1; margin: 0; text-shadow: 0 2px 30px rgba(0,0,0,.5); }
  .share .s-amp { color: #f0c27a; }
  .share .s-rule { width: 42%; height: 1px; background: rgba(255,214,150,.5); }
  .share .s-ev strong { display: block; color: #f0c27a; font-weight: 700; }
`;

function ogOverlay() {
  return `<div class="share" style="justify-content:center;gap:18px;background:
      linear-gradient(to bottom, rgba(14,8,5,.05) 0%, rgba(14,8,5,.52) 30%, rgba(14,8,5,.6) 72%, rgba(14,8,5,.25) 100%);">
    <p class="s-kicker" style="font-size:22px">${esc(en.kicker)}</p>
    <h1 class="s-names" style="font-size:104px">${esc(en.groom)} <span class="s-amp">&amp;</span> ${esc(en.bride)}</h1>
    <div class="s-rule"></div>
    <div style="display:flex;gap:64px;font-size:27px;font-weight:600;line-height:1.3">
      <div class="s-ev"><strong>${esc(en.reception.title)}</strong>${esc(en.reception.date)}<br>${esc(receptionTime(content, en))}</div>
      <div class="s-ev"><strong>${esc(en.muhurtham.title)}</strong>${esc(en.muhurtham.date)}<br>${esc(muhurthamTime(content, en))}<br>${esc(en.muhurtham.lagnam)}</div>
    </div>
    <p style="margin:6px 0 0;font-size:26px;font-weight:600;color:#f3e6cc">${esc(en.venue)}</p>
  </div>`;
}

function storyOverlay() {
  const couple = content.couple.photo
    ? `<div style="flex:1;min-height:0;width:100%;display:flex;justify-content:center;align-items:center;margin:8px 0 10px">
        <img src="${esc(content.couple.photo)}" style="max-width:100%;max-height:100%;filter:drop-shadow(0 6px 18px rgba(0,0,0,.5))">
      </div>`
    : '<div style="flex:1"></div>';
  return `<div class="share" style="padding:44px 18px 30px;background:
      linear-gradient(to bottom, rgba(14,8,5,.6), rgba(14,8,5,.15) 34%, rgba(14,8,5,.1) 55%, rgba(14,8,5,.82) 80%);">
    <div>
      <p class="s-kicker" style="font-size:10px">${esc(en.kicker)}</p>
      <h1 class="s-names" style="font-size:36px;margin-top:8px">${esc(en.groom)} <span class="s-amp" style="font-size:26px">&amp;</span><br>${esc(en.bride)}</h1>
      <p style="margin:8px 0 0;font-size:14px;font-style:italic">${esc(en.invite)}</p>
    </div>
    ${couple}
    <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:12.5px;font-weight:600;line-height:1.3">
      <div class="s-ev"><strong style="font-size:16px">${esc(en.reception.title)}</strong>${esc(en.reception.date)}<br>${esc(receptionTime(content, en))}</div>
      <div class="s-ev"><strong style="font-size:16px">${esc(en.muhurtham.title)}</strong>${esc(en.muhurtham.date)}<br>${esc(muhurthamTime(content, en))}<br>${esc(en.muhurtham.lagnam)}</div>
      <div style="grid-column:1/-1;margin-top:6px;padding-top:8px;border-top:1px solid rgba(255,214,150,.5);color:#f3e6cc;font-size:13.5px">${esc(en.venue)}</div>
    </div>
  </div>`;
}

// ---------- printable A5 ----------

function printPage(t) {
  return `<section class="page" lang="${t.lang}">
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><path d="M32 6c9 9 9 17 0 26-9-9-9-17 0-26ZM32 58c-9-9-9-17 0-26 9 9 9 17 0 26ZM6 32c9-9 17-9 26 0-9 9-17 9-26 0ZM58 32c-9 9-17 9-26 0 9-9 17-9 26 0Z"/><circle cx="32" cy="32" r="4"/></g><g fill="currentColor"><circle cx="16" cy="16" r="1.6"/><circle cx="48" cy="16" r="1.6"/><circle cx="16" cy="48" r="1.6"/><circle cx="48" cy="48" r="1.6"/></g></svg>
    <p class="kicker">${esc(t.kicker)}</p>
    <h1 class="names">${esc(t.groomFull)}<span class="amp">&amp;</span>${esc(t.brideFull)}</h1>
    <p class="invite">${esc(t.invite)}</p>
    <div class="events">
      <div class="ev"><h2>${esc(t.reception.title)}</h2><p>${esc(t.reception.date)}</p><p>${esc(receptionTime(content, t))}</p></div>
      <div class="ev"><h2>${esc(t.muhurtham.title)}</h2><p>${esc(t.muhurtham.date)}</p><p>${esc(muhurthamTime(content, t))}</p><p>${esc(t.muhurtham.lagnam)}</p></div>
    </div>
    <div class="venue"><span>${esc(t.venueLabel)}</span>${esc(t.venue)}</div>
    <p class="small">${esc(t.print.map)}: ${esc(mapsUrl(content))}</p>
    <p class="signoff">${esc(t.details.signoff)}</p>
  </section>`;
}

const printHtml = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #3a2414; font-family: 'Cormorant Garamond', Georgia, serif; }
  .page { width: 148mm; height: 210mm; padding: 13mm 12mm; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; page-break-after: always; position: relative; background: #fffaf0; }
  .page::before { content: ''; position: absolute; inset: 6mm; border: 0.6mm solid #c98f38; border-radius: 3mm; }
  .page::after { content: ''; position: absolute; inset: 7.6mm; border: 0.25mm solid #c98f38; border-radius: 2mm; }
  .page[lang=ta] { font-family: 'Noto Serif Tamil', serif; }
  .mark { width: 15mm; color: #c98f38; }
  .kicker { margin: 3mm 0 0; font-size: 11pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #9a5a14; }
  [lang=ta] .kicker { letter-spacing: 0; font-size: 10.5pt; }
  .names { margin: 4mm 0 2mm; display: flex; flex-direction: column; font-size: 29pt; font-style: italic; font-weight: 600; line-height: 1.1; color: #5a1e10; }
  [lang=ta] .names { font-style: normal; font-size: 21pt; line-height: 1.5; }
  .amp { font-size: 20pt; color: #c98f38; }
  .invite { margin: 0 0 6mm; font-size: 14pt; font-style: italic; }
  [lang=ta] .invite { font-style: normal; font-size: 11pt; line-height: 1.7; }
  .events { display: grid; grid-template-columns: 1fr 1fr; gap: 0; width: 100%; border-top: .3mm solid #c98f38; border-bottom: .3mm solid #c98f38; }
  .ev { padding: 4mm 2mm; }
  .ev + .ev { border-left: .3mm solid #c98f38; }
  .ev h2 { margin: 0 0 1.5mm; font-size: 16pt; color: #9a5a14; }
  [lang=ta] .ev h2 { font-size: 12pt; }
  .ev p { margin: 0; font-size: 13pt; font-weight: 700; line-height: 1.3; }
  [lang=ta] .ev p { font-size: 10pt; line-height: 1.6; font-weight: 600; }
  .venue { margin: 6mm 0 3mm; font-size: 15pt; font-weight: 700; line-height: 1.3; }
  .venue span { display: block; font-size: 10pt; letter-spacing: .18em; text-transform: uppercase; color: #9a5a14; }
  [lang=ta] .venue { font-size: 11.5pt; line-height: 1.7; }
  [lang=ta] .venue span { letter-spacing: 0; }
  .small { margin: 1mm 0; font-size: 10pt; word-break: break-all; }
  [lang=ta] .small { font-size: 8.5pt; }
  .signoff { margin: 5mm 0 0; font-size: 14pt; font-style: italic; }
  [lang=ta] .signoff { font-style: normal; font-size: 11pt; }
</style></head><body>${printPage(en)}${printPage(ta)}</body></html>`;

// ---------- run ----------

async function shoot(browser, base, { width, height, scale, chapter, file, overlay }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`${base}?tier=high&capture`);
  await page.waitForFunction(() => window.__world, null, { timeout: 60000 });
  await page.addStyleTag({ content: overlayCss });
  await page.evaluate(
    ({ chapter, overlay }) => {
      window.__world.setStory({ chapter, camera: chapter, time: chapter });
      window.__world.snap();
      document.body.insertAdjacentHTML('beforeend', overlay);
    },
    { chapter, overlay },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('.share img')].map((i) => i.decode().catch(() => {}))));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
  await page.close();
  console.log('wrote', file);
}

await build({ root, logLevel: 'warn' });
const server = await preview({ root, preview: { port: 4321, strictPort: false }, logLevel: 'warn' });
const base = server.resolvedUrls.local[0];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  await shoot(browser, base, { width: 1200, height: 630, scale: 1, chapter: 0, file: out('og-image.jpg'), overlay: ogOverlay() });
  await shoot(browser, base, { width: 360, height: 640, scale: 3, chapter: 2, file: out('invite-story.jpg'), overlay: storyOverlay() });

  const page = await browser.newPage();
  await page.setContent(printHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: out('invite.pdf'), format: 'A5', printBackground: true, preferCSSPageSize: true });
  console.log('wrote', out('invite.pdf'));
} finally {
  await browser.close();
  server.httpServer.close();
}

// Rebuild so dist/ carries the fresh images.
await build({ root, logLevel: 'warn' });
console.log('dist/ rebuilt with the new sharing assets');
