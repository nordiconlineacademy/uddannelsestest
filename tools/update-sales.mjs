// Opdaterer salgstallene (sales:N) i index.html, som giver de mest solgte uddannelser bonus i anbefalingen.
//
//   ssh root@<server> "cd /opt/noabackoffice && docker compose -f docker-compose.prod.yml exec -T backend \
//       python scripts/export_site_sales.py" | node tools/update-sales.mjs
//
// Læser JSON ({"familiebehandler": 140, ...}) fra stdin, ændrer kun tallene i index.html og viser, hvad der er ændret.
// Kør bagefter:  node --test tests/recommendation.test.mjs   (tjekker at alle uddannelser stadig kan blive anbefalet)
import fs from 'node:fs';

const file = new URL('../index.html', import.meta.url);
const input = fs.readFileSync(0, 'utf8');
const start = input.indexOf('{');
if (start < 0) { console.error('Ingen JSON på stdin.'); process.exit(1); }
const sales = JSON.parse(input.slice(start, input.lastIndexOf('}') + 1));

let html = fs.readFileSync(file, 'utf8');
const keys = [...html.matchAll(/^  ([a-z]+): \{ title:"[^"]+", category:"[^"]+", sales:(\d+),/gm)].map((m) => m[1]);
if (keys.length === 0) { console.error('Fandt ingen uddannelser i index.html.'); process.exit(1); }

const missing = keys.filter((k) => !Number.isInteger(sales[k]));
if (missing.length) { console.error('Mangler tal for: ' + missing.join(', ')); process.exit(1); }
const unknown = Object.keys(sales).filter((k) => !keys.includes(k));
if (unknown.length) console.warn('Ignorerer ukendte nøgler: ' + unknown.join(', '));

const changes = [];
html = html.replace(/^(  )([a-z]+)(: \{ title:"[^"]+", category:"[^"]+", sales:)(\d+)(,)/gm, (m, a, key, b, old, c) => {
  if (Number(old) !== sales[key]) changes.push(`${key.padEnd(22)} ${String(old).padStart(4)} → ${sales[key]}`);
  return a + key + b + sales[key] + c;
});

fs.writeFileSync(file, html);
console.log(changes.length ? 'Opdateret:\n  ' + changes.join('\n  ') : 'Ingen ændringer — tallene var allerede aktuelle.');
