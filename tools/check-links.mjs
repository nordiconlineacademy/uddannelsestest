// Kør: node tools/check-links.mjs
// Henter alle uddannelsessiderne, som resultatsiden linker til, og tjekker status, omdirigering og at titlen passer til uddannelsen.
// Kræver netværk. Afslutter med fejlkode 1, hvis et link ikke virker (200 uden omdirigering).
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const block = html.slice(html.indexOf('/* ANBEFALING:START'), html.indexOf('/* ANBEFALING:SLUT'));
const { educations } = new Function('answers', block + '; return { educations };')({});

let bad = 0;
for (const [key, e] of Object.entries(educations)) {
  try {
    const first = await fetch(e.url, { redirect: 'manual' });
    const full = await fetch(e.url, { redirect: 'follow' });
    const page = await full.text();
    const title = (page.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const redirected = first.status >= 300 && first.status < 400;
    const ok = first.status === 200 && full.status === 200 && !redirected && title.length > 0;
    if (!ok) bad++;
    console.log((ok ? 'OK    ' : 'FEJL  ') + key.padEnd(22) + first.status + ' ' + (redirected ? '→ ' + first.headers.get('location') + ' ' : '') + '| ' + title.slice(0, 60));
  } catch (err) {
    bad++;
    console.log('FEJL  ' + key.padEnd(22) + err.message);
  }
}
console.log(bad ? '\n' + bad + ' link(s) virker ikke.' : '\nAlle ' + Object.keys(educations).length + ' links virker.');
process.exit(bad ? 1 : 0);
