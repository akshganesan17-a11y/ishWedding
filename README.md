# Akash & Iswaryalakshmi: wedding invitation

A mobile-first 3D wedding invitation. Guests scroll down a South Indian river at golden hour, past lamp-lit ghats at dusk, to a sunrise behind the temple gopuram, and end on the venue with buttons for Google Maps and the calendar.

It is a static site (Vite, vanilla JavaScript, three.js). Host it anywhere that serves files, such as GitHub Pages or Vercel.

## Edit the invitation

All text lives in **`src/content.json`**: names, dates, times, venue, links and both languages. You never need to touch code to change wording.

Anything in `[BRACKETS]` is a placeholder. Replace the whole thing, brackets included. Remaining:

| Field | What to put |
| --- | --- |
| `site.url` | The final public URL (WhatsApp needs it to show the preview image) |
| `music.src` | Optional. Put an mp3 in `public/audio/` and write e.g. `"audio/song.mp3"`. The speaker button appears automatically. |

Tamil text is listed for review in **`TAMIL_REVIEW.md`**.

After changing text, regenerate the preview image, story image and printable PDF:

```bash
npm run capture
```

## Develop

```bash
npm install
npx playwright install chromium   # once, for `npm run capture`
npm run dev                        # http://localhost:5173
```

Useful URL flags while testing: `?tier=high`, `?tier=medium`, `?tier=low` force a quality tier.

## Build

```bash
npm run build      # outputs dist/ with relative paths
npm run preview    # serve dist/ locally
```

## Deploy

### Vercel

1. Push this folder to a GitHub repository.
2. On vercel.com, choose **Add New → Project** and import the repository.
3. Vercel detects Vite. Keep the defaults: build command `npm run build`, output directory `dist`.
4. Click **Deploy**. Copy the URL it gives you into `site.url` in `src/content.json`, commit and push; Vercel redeploys automatically.

Or from the terminal: `npx vercel` (first time) then `npx vercel --prod`.

### GitHub Pages

1. Push this folder to a GitHub repository with the default branch `main`.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and publishes on every push to `main`. The first run can also be started from the **Actions** tab.
4. The site appears at `https://<username>.github.io/<repository>/`. Put that URL in `site.url`, commit and push.

Paths are relative, so the site works under a sub-path like `/<repository>/` without extra settings.

### Before sharing on WhatsApp

1. Fill `site.url`, then `npm run capture` and deploy.
2. Paste the link into a WhatsApp chat with yourself to check the preview. WhatsApp caches previews; if you change the image later, add `?v=2` to the link you share.

## How it works

- **Instant poster.** The names, dates and venue are rendered into `index.html` at build time, with an SVG river scene behind them. Guests can read everything before any JavaScript or 3D loads.
- **Quality tiers** (`src/quality.js`). WebGL2 support, device memory, CPU cores, GPU name, a short CPU probe and a frame-time probe pick one of:
  - **High:** planar water reflections, dense palms, bloom.
  - **Medium:** cheaper water, fewer plants, capped at 30 fps.
  - **Low:** the animated poster only. The 3D code is never downloaded.

  While running, the scene lowers resolution and effects if the frame rate drops, and falls back to the poster if it cannot hold 20 fps.
- **Reduced motion.** With `prefers-reduced-motion`, the camera cuts between fixed views with a short cross-fade, and petals and poster animations are off.
- **Scene** (`src/scene/`). Everything is generated in code, with textures drawn on canvas:
  - terrain, river and sky
  - coconut palms and banana trees with wind
  - the gopuram
  - the ghat, mandapam, kolam and kuthu vilakku lamps
  - jasmine and marigold petals

  Post-processing adds bloom and ACES tone mapping. Scroll position drives the camera path and the time of day (`src/scene/timeline.js`).
- **Calendar.** `invite.ics` (English) and `invite-ta.ics` (Tamil) are generated from `content.json` at build time, with both events in the Asia/Kolkata time zone.

## Credits

The scene is original and written for this invitation. The mood was inspired by "Sakura River Valley" by Meng To. That scene is not part of the open-source ThreeUI Community catalogue, so no ThreeUI code or assets are used here.

## Personal links

Add `?to=` and a name to the link and the invitation opens with "Dear <name>," (or "அன்புள்ள <name>," in Tamil), and the browser tab shows their name too:

```
https://your-site/?to=Ravi%20Uncle
```

To make links for many guests at once, list one name per line in a text file and run:

```bash
npm run links -- guests.txt
npm run links -- "Ravi Uncle" "Priya & Karthik"   # or names directly
```

It prints each name with its link, ready to paste into WhatsApp. Set `site.url` first so the links point at the live site. The WhatsApp preview card (image, title, dates) is the same for everyone; the greeting appears once the guest opens the link.
