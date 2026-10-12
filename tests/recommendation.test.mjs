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
const { educations, WEIGHTS, getRecommendation, getMatches, buildProfile, explain, profileDimension, PITCH, REASONS, PROFILES, MOTIV, TEMPO, LEARN, CHIPS, POPULAR } =
  new Function('answers', html.slice(blockStart, blockEnd) +
    '; return {educations, WEIGHTS, getRecommendation, getMatches, buildProfile, explain, profileDimension, PITCH, REASONS, PROFILES, MOTIV, TEMPO, LEARN, CHIPS, POPULAR};')(answers);

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

// ───────────────────────── Resultatsiden: profil, op til tre matches, begrundelser ─────────────────────────
function everyCombination(fn) {
  const qs = Object.keys(WEIGHTS);
  const go = (i) => { if (i === qs.length) { fn({ ...answers }); return; } for (const v of Object.keys(WEIGHTS[qs[i]])) { answers[qs[i]] = v; go(i + 1); } };
  go(0);
}

test('begrundelser, profil-tekster og pitch dækker præcis siden\'s svarmuligheder og uddannelser', () => {
  for (const q of Object.keys(WEIGHTS)) assert.deepEqual(Object.keys(REASONS[q]).sort(), Object.keys(WEIGHTS[q]).sort(), 'REASONS spørgsmål ' + q);
  assert.deepEqual(Object.keys(MOTIV).sort(), Object.keys(WEIGHTS[2]).sort());
  assert.deepEqual(Object.keys(TEMPO).sort(), Object.keys(WEIGHTS[4]).sort());
  assert.deepEqual(Object.keys(LEARN).sort(), Object.keys(WEIGHTS[5]).sort());
  assert.deepEqual(Object.keys(CHIPS[6]).sort(), Object.keys(WEIGHTS[6]).sort());
  assert.deepEqual(Object.keys(CHIPS[5]).sort(), Object.keys(WEIGHTS[5]).sort());
  assert.deepEqual(Object.keys(CHIPS[2]).sort(), Object.keys(WEIGHTS[2]).sort());
  assert.deepEqual(Object.keys(PITCH).sort(), Object.keys(educations).sort());
  for (const [k, t] of Object.entries(PITCH)) assert.ok(t.length > 30 && t.length <= 140 && t.endsWith('.'), 'pitch ' + k);
});

test('de to første matches er altid præcis getRecommendation() (Klaviyo-kontrakten: Anbefaling/Alternativ)', () => {
  everyCombination((a) => {
    Object.assign(answers, a);
    const [p, s] = getRecommendation();
    const m = getMatches(a);
    assert.equal(m[0].key, p); assert.equal(m[1].key, s);
  });
});

test('2-3 forskellige matches, og den tredje vises kun når den er tæt på (og i en rimelig andel af tilfældene)', () => {
  let thirds = 0, n = 0;
  everyCombination((a) => {
    n++;
    const m = getMatches(a);
    assert.ok(m.length === 2 || m.length === 3);
    assert.equal(new Set(m.map(x => x.key)).size, m.length, 'dubletter');
    if (m.length === 3) thirds++;
  });
  assert.ok(thirds / n > 0.55 && thirds / n < 0.95, 'tredje match vises i ' + Math.round(100 * thirds / n) + '% af tilfældene');
});

test('hver begrundelse stammer fra et svar, brugeren faktisk gav, og som reelt gav point til uddannelsen', () => {
  everyCombination((a) => {
    for (const m of getMatches(a)) {
      const max = m.key === getMatches(a)[0].key ? 3 : 2;
      assert.ok(m.reasons.length >= 1 && m.reasons.length <= max, m.key + ' har ' + m.reasons.length + ' begrundelser');
      assert.equal(new Set(m.reasons).size, m.reasons.length);
      for (const text of m.reasons) {
        const src = Object.keys(REASONS).filter(q => text === REASONS[q][a[q]] && (WEIGHTS[q][a[q]][m.key] || 0) > 0);
        assert.ok(src.length === 1, 'begrundelsen "' + text + '" for ' + m.key + ' kan ikke føres tilbage til brugerens svar');
      }
      assert.equal(m.pitch, PITCH[m.key]);
    }
  });
});

test('begrundelserne er de stærkeste svar først, og ved lige vægt går spørgsmål 1 før 3 før 6', () => {
  const a = { 1: 'terapi', 2: 'job', 3: 'par', 4: 'ledig', 5: 'teori', 6: 'empatisk' };
  // Parterapeut: terapi 3, par 3, empatisk 2.5, teori 1.2, job 0, ledig 0 → de tre stærkeste
  assert.deepEqual(explain('parterapeut', a), [REASONS[1].terapi, REASONS[3].par, REASONS[6].empatisk]);
  // Programmør med samme svar: kun job (1.5), ledig (.8) og teori (0) giver point → færre, svagere begrundelser
  const prog = explain('programmor', a);
  assert.ok(prog.length >= 1 && prog.length <= 3);
  assert.equal(prog[0], REASONS[2].job);
});

test('interesseprofilen er altid komplet: navn, indledning, 3 drivere og 3 kendetegn', () => {
  const seen = new Set();
  everyCombination((a) => {
    const p = buildProfile(a);
    assert.ok(p.name && p.lead);
    assert.equal(p.drivers.length, 3); assert.equal(p.chips.length, 3);
    assert.ok([...p.drivers, ...p.chips].every(t => typeof t === 'string' && t.length > 2));
    seen.add(p.name);
  });
  assert.deepEqual([...seen].sort(), Object.values(PROFILES).map(p => p.name).sort(), 'ikke alle profiler kan opnås');
});

test('profilen følger hovedinteressen, og er den samme som svarene siger', () => {
  const base = { 2: 'selvstaendig', 4: 'job_og_studie', 5: 'praksis' };
  assert.equal(buildProfile({ ...base, 1: 'terapi', 3: 'enkelt', 6: 'empatisk' }).name, PROFILES.omsorg.name);
  assert.equal(buildProfile({ ...base, 1: 'kreativ', 3: 'kreativt', 6: 'aestetisk' }).name, PROFILES.skaber.name);
  assert.equal(buildProfile({ ...base, 1: 'tech', 3: 'data', 6: 'analytisk' }).name, PROFILES.analyse.name);
  assert.equal(buildProfile({ ...base, 1: 'medie', 3: 'kreativt', 6: 'fortaeller' }).name, PROFILES.fortaeller.name);
  assert.equal(buildProfile({ ...base, 1: 'sundhed', 3: 'blandet', 6: 'empatisk' }).name, PROFILES.sundhed.name);
  assert.equal(buildProfile({ ...base, 1: 'business', 3: 'blandet', 6: 'analytisk' }).name, PROFILES.leder.name);
  // Uenighed mellem spørgsmålene: spørgsmål 1 (vægt 3) afgør ved lige point
  assert.equal(profileDimension({ ...base, 1: 'tech', 3: 'par', 6: 'empatisk' }), 'omsorg'); // omsorg 4 > analyse 3
  assert.equal(profileDimension({ ...base, 1: 'terapi', 3: 'data', 6: 'aestetisk' }), 'omsorg'); // 3 hver → spørgsmål 1 vinder
});

test('"populær" gælder de tre mest solgte uddannelser', () => {
  const top3 = Object.keys(educations).sort((a, b) => educations[b].sales - educations[a].sales).slice(0, 3);
  assert.deepEqual([...POPULAR].sort(), [...top3].sort());
});

test('resultatsiden har pladser til alle tre kort, profil og begrundelser (og de gamle id\'er er bevaret)', () => {
  for (const id of ['profile-card', 'profile-title', 'profile-lead', 'profile-drivers', 'profile-chips',
    'res-title', 'res-cat', 'res-desc', 'res-why', 'res-gain', 'res-traits', 'res-link',
    'alt-title', 'alt-cat', 'alt-desc', 'alt-why', 'alt-gain', 'alt-traits', 'alt-link',
    'alt2-card', 'alt2-title', 'alt2-cat', 'alt2-desc', 'alt2-why', 'alt2-gain', 'alt2-traits', 'alt2-link']) {
    assert.ok(html.includes('id="' + id + '"'), 'mangler #' + id);
  }
});

test('Klaviyo-eventet har stadig Anbefaling og Alternativ — og nu også Profil og Tredje valg', () => {
  for (const key of ['Anbefaling:educations[pk].title', 'Alternativ:educations[ak].title', "'Tredje valg':", 'Profil:profilNavn', "'Samtykke marketing':d.consent"]) {
    assert.ok(html.includes(key), 'mangler i sendLead: ' + key);
  }
});
