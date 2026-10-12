// Kør: node --test tests/recommendation.test.mjs   (Node 18+, ingen afhængigheder)
// Tjek af links mod onlineuddannelse.dk (netværk):  LINKS=1 node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blockStart = html.indexOf('/* ANBEFALING:START');
const blockEnd = html.indexOf('/* ANBEFALING:SLUT');
assert.ok(blockStart > 0 && blockEnd > blockStart, 'ANBEFALING-blokken mangler i index.html');
const answers = {};
const { educations, WEIGHTS, getRecommendation } =
  new Function('answers', html.slice(blockStart, blockEnd) + '; return {educations, WEIGHTS, getRecommendation};')(answers);

const options = {};
for (const m of html.matchAll(/data-q="(\d)" data-v="([a-z_]+)"/g)) (options[m[1]] ??= new Set()).add(m[2]);
const lists = new Function(html.match(/const EDU_LISTS = \{[\s\S]*?\};/)[0] + '; return EDU_LISTS;')();

function simulate() {
  const prim = {}; let n = 0;
  const qs = Object.keys(WEIGHTS);
  const go = (i) => {
    if (i === qs.length) { n++; const [p] = getRecommendation(); prim[p] = (prim[p] || 0) + 1; return; }
    for (const v of Object.keys(WEIGHTS[qs[i]])) { answers[qs[i]] = v; go(i + 1); }
  };
  go(0);
  return { prim, n };
}

test('hver uddannelse har titel, kategori, beskrivelse, tags, salgstal og et gyldigt link', () => {
  for (const [k, e] of Object.entries(educations)) {
    assert.ok(e.title && e.category && e.desc && e.traits.length >= 3, k);
    assert.ok(Number.isFinite(e.sales) && e.sales >= 0, k + ' sales');
    assert.match(e.url, /^https:\/\/onlineuddannelse\.dk\/online-uddannelser\/[a-z0-9-]+\/$/, k);
  }
  const urls = Object.values(educations).map(e => e.url);
  assert.equal(new Set(urls).size, urls.length, 'to uddannelser deler samme link');
});

test('svarmulighederne i siden og vægtene er helt ens (ingen svar uden point, ingen døde vægte)', () => {
  assert.deepEqual(Object.keys(options).sort(), Object.keys(WEIGHTS).sort());
  for (const q of Object.keys(WEIGHTS)) {
    assert.deepEqual([...options[q]].sort(), Object.keys(WEIGHTS[q]).sort(), 'spørgsmål ' + q);
    for (const w of Object.values(WEIGHTS[q])) for (const k of Object.keys(w)) assert.ok(educations[k], 'ukendt uddannelse i vægte: ' + k);
  }
});

test('alle uddannelser har en Klaviyo-liste (ellers bliver samtykke ikke til en tilmelding)', () => {
  for (const k of Object.keys(educations)) assert.match(lists[k] || '', /^[A-Za-z0-9]{6}$/, 'mangler liste: ' + k);
});

test('alle uddannelser kan blive førstevalg, og de mest solgte fylder mest', () => {
  const { prim, n } = simulate();
  for (const k of Object.keys(educations)) assert.ok((prim[k] || 0) / n >= 0.003, k + ' bliver (næsten) aldrig anbefalet');
  const bestSeller = Object.keys(educations).sort((a, b) => educations[b].sales - educations[a].sales)[0];
  const mostRecommended = Object.keys(prim).sort((a, b) => prim[b] - prim[a])[0];
  assert.equal(mostRecommended, bestSeller);
});

test('alle seks spørgsmål kan ændre resultatet', () => {
  const qs = Object.keys(WEIGHTS);
  for (const q of qs) {
    let changes = 0; const others = qs.filter(x => x !== q);
    const go = (i) => {
      if (i === others.length) { const s = new Set(); for (const v of Object.keys(WEIGHTS[q])) { answers[q] = v; s.add(getRecommendation()[0]); } if (s.size > 1) changes++; return; }
      for (const v of Object.keys(WEIGHTS[others[i]])) { answers[others[i]] = v; go(i + 1); }
    };
    go(0);
    assert.ok(changes > 0, 'spørgsmål ' + q + ' påvirker aldrig resultatet');
  }
});

test('primær og alternativ er altid to forskellige uddannelser', () => {
  const qs = Object.keys(WEIGHTS);
  const go = (i) => { if (i === qs.length) { const [p, a] = getRecommendation(); assert.notEqual(p, a); return; } for (const v of Object.keys(WEIGHTS[qs[i]])) { answers[qs[i]] = v; go(i + 1); } };
  go(0);
});

test('linkene virker (kun med LINKS=1)', { skip: !process.env.LINKS }, async () => {
  for (const [k, e] of Object.entries(educations)) {
    const r = await fetch(e.url, { redirect: 'follow' });
    assert.equal(r.status, 200, k + ' → ' + e.url + ' gav ' + r.status);
  }
});
