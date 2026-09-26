import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { isPlaceholder } from './src/lib/content.js';
import { buildIcs } from './src/lib/ics.js';
import { renderApp } from './src/ui/render.js';

const contentPath = resolve(import.meta.dirname, 'src/content.json');
const loadContent = () => JSON.parse(readFileSync(contentPath, 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function metaTags(c) {
  const t = c.text.en;
  const base = isPlaceholder(c.site.url) ? '' : c.site.url.replace(/\/?$/, '/');
  const abs = (p) => base + p;
  return [
    `<title>${esc(t.pageTitle)}</title>`,
    `<meta name="description" content="${esc(t.shareDescription)}">`,
    `<meta name="theme-color" content="${esc(c.site.themeColor)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(t.shareTitle)}">`,
    `<meta property="og:description" content="${esc(t.shareDescription)}">`,
    `<meta property="og:image" content="${esc(abs('og-image.jpg'))}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(t.shareTitle)}">`,
    base ? `<meta property="og:url" content="${esc(base)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(t.shareTitle)}">`,
    `<meta name="twitter:description" content="${esc(t.shareDescription)}">`,
    `<meta name="twitter:image" content="${esc(abs('og-image.jpg'))}">`,
  ]
    .filter(Boolean)
    .join('\n    ');
}

// Prerenders content.json into index.html and emits the calendar files, so
// the invitation text and OG tags exist without JavaScript.
function invitation() {
  const icsFiles = (c) => ({
    'invite.ics': buildIcs(c, c.text.en),
    'invite-ta.ics': buildIcs(c, c.text.ta),
  });
  return {
    name: 'invitation',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const c = loadContent();
        return html.replace('<!--meta-->', metaTags(c)).replace('<!--app-->', renderApp(c, 'en'));
      },
    },
    configureServer(server) {
      server.watcher.add(contentPath);
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^.*\//, '');
        const files = icsFiles(loadContent());
        if (!files[name]) return next();
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(files[name]);
      });
    },
    handleHotUpdate({ file, server }) {
      if (file === contentPath) server.ws.send({ type: 'full-reload' });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(icsFiles(loadContent()))) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [invitation()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  server: { host: true },
});
