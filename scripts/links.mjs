// Prints a personal invitation link for each guest.
//   npm run links -- "Ravi Uncle" "Priya & Karthik"
//   npm run links -- guests.txt        (one name per line)

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isPlaceholder } from '../src/lib/content.js';

const root = resolve(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(resolve(root, 'src/content.json'), 'utf8'));
const base = isPlaceholder(content.site.url) ? 'http://localhost:5173/' : content.site.url.replace(/\/?$/, '/');

const args = process.argv.slice(2);
const names = args.length === 1 && existsSync(args[0])
  ? readFileSync(args[0], 'utf8').split('\n')
  : args;
const guests = names.map((n) => n.trim()).filter(Boolean);

if (!guests.length) {
  console.log('Usage: npm run links -- "Ravi Uncle" "Priya"   or   npm run links -- guests.txt');
  process.exit(1);
}
if (isPlaceholder(content.site.url)) console.log('(site.url is not set yet, so these links point at localhost)\n');
for (const name of guests) console.log(`${name}\t${base}?to=${encodeURIComponent(name)}`);
