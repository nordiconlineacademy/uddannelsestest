// Kør: node --test tests/recommendation.test.mjs   (Node 18+, ingen afhængigheder)
// Tjek af links mod onlineuddannelse.dk (netværk):  LINKS=1 node --test tests/recommendation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blockStart = html.indexOf('/* ANBEFALING:START');
const blockEnd = html.indexOf('/* ANBEFALING:SLUT');
assert.ok(blockStart > 0 && blockEnd > blockStart, 'ANBEFALING-blokken mangler i index.html');
const answers = {};
const NAMES = 'educations, WEIGHTS, BRANCHES, FIELDS, FIELD_OF, FIELD_DIM, SECOND_FIELD, getRecommendation, getMatches, buildProfile, explain, profileDimension, rankAll, PITCH, REASONS, PROFILES, MOTIV, TEMPO, EXPERIENCE, CHIPS, POPULAR, THIRD_MATCH_MAX_GAP';
const { educations, WEIGHTS, BRANCHES, FIELDS, FIELD_OF, FIELD_DIM, SECOND_FIELD, getRecommendation, getMatches, buildProfile, explain, profileDimension, rankAll, PITCH, REASONS, PROFILES, MOTIV, TEMPO, EXPERIENCE, CHIPS, POPULAR, THIRD_MATCH_MAX_GAP } =
  new Function('answers', html.slice(blockStart, blockEnd) + '; return {' + NAMES + '};')(answers);

const options = {};
for (const m of html.matchAll(/data-q="(\d)" data-v="([a-z_]+)"/g)) (options[m[1]] ??= new Set()).add(m[2]);
const lists = new Function(html.match(/const EDU_LISTS = \{[\s\S]*?\};/)[0] + '; return EDU_LISTS;')();

// Alle gyldige svarkombinationer: spørgsmål 2 afhænger af spørgsmål 1 (BRANCHES).
function everyCombination(fn) {
  for (const f of Object.keys(WEIGHTS[1])) for (const q2 of BRANCHES[f]) for (const q3 of Object.keys(WEIGHTS[3])) for (const q4 of Object.keys(WEIGHTS[4]))
    for (const q5 of Object.keys(WEIGHTS[5])) for (const q6 of Object.keys(WEIGHTS[6])) fn({ 1: f, 2: q2, 3: q3, 4: q4, 5: q5, 6: q6 });
}
const setAnswers = (a) => { for (const k of Object.keys(answers)) delete answers[k]; Object.assign(answers, a); };
const w = (q, a, k) => ((WEIGHTS[q][a[q]] || {})[k]) || 0;

const FIELD_SALES = { terapi: 303, kreativ: 127, tech: 22, medie: 84, sundhed: 46, business: 51 }; // gennemførte ordrer pr. felt, 12 mdr. (okt. 2026)
let simCache;
function simulate() {
  if (simCache) return simCache;
  const perField = {};
  everyCombination((a) => { perField[a[1]] = (perField[a[1]] || 0) + 1; });
  const fsTot = Object.values(FIELD_SALES).reduce((x, y) => x + y, 0);
  const uniform = {}, real = {}; let outsideUniform = 0; const infield = {}; let n = 0;
  everyCombination((a) => {
    n++; setAnswers(a); const p = getMatches(a)[0].key;
    uniform[p] = (uniform[p] || 0) + 1 / perField[a[1]]; real[p] = (real[p] || 0) + FIELD_SALES[a[1]] / fsTot / perField[a[1]];
    const inside = FIELDS[a[1]].includes(p); if (!inside) outsideUniform += 1 / perField[a[1]];
    (infield[a[1]] ??= { n: 0, in: 0 }).n++; if (inside) infield[a[1]].in++;
  });
  const nf = Object.keys(perField).length; Object.keys(uniform).forEach(k => uniform[k] /= nf);
  return (simCache = { uniform, real, outsideShare: outsideUniform / nf, infield, n });
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

test('hver uddannelse hører til præcis ét interesseområde, og hvert område kan vælges i spørgsmål 1', () => {
  const all = Object.values(FIELDS).flat();
  assert.deepEqual([...all].sort(), Object.keys(educations).sort(), 'alle 16 uddannelser skal have et område');
  assert.equal(new Set(all).size, all.length, 'en uddannelse hører til to områder');
  assert.deepEqual(Object.keys(FIELDS).sort(), Object.keys(WEIGHTS[1]).sort());
  assert.deepEqual(Object.keys(FIELDS).sort(), Object.keys(FIELD_DIM).sort());
});

test('svarmulighederne i siden og vægtene er helt ens (ingen svar uden point, ingen døde vægte)', () => {
  assert.deepEqual(Object.keys(options).sort(), Object.keys(WEIGHTS).sort());
  for (const q of Object.keys(WEIGHTS)) {
    assert.deepEqual([...options[q]].sort(), Object.keys(WEIGHTS[q]).sort(), 'spørgsmål ' + q);
    for (const wt of Object.values(WEIGHTS[q])) for (const k of Object.keys(wt)) assert.ok(educations[k], 'ukendt uddannelse i vægte: ' + k);
  }
});

test('spørgsmål 2: hver gren i siden har præcis de svar, som BRANCHES (og logikken) forventer', () => {
  assert.deepEqual(Object.keys(BRANCHES).sort(), Object.keys(WEIGHTS[1]).sort());
  for (const [field, expected] of Object.entries(BRANCHES)) {
    const start = html.indexOf('data-branch="' + field + '"');
    assert.ok(start > 0, 'mangler gruppe for ' + field);
    const end = html.indexOf('\n              </div>', start);
    const inGroup = [...html.slice(start, end).matchAll(/data-q="2" data-v="([a-z_]+)"/g)].map(m => m[1]);
    assert.deepEqual(inGroup.sort(), [...expected].sort(), 'gren ' + field);
    for (const v of expected) assert.ok(WEIGHTS[2][v], 'ingen vægte til ' + v);
  }
});

test('emnet i spørgsmål 2 giver kun point inden for det valgte interesseområde; sekundære interesser giver lave point', () => {
  for (const [field, answersInBranch] of Object.entries(BRANCHES)) {
    for (const v of answersInBranch) {
      for (const [k, pts] of Object.entries(WEIGHTS[2][v])) {
        if (v.startsWith('x_')) assert.ok(pts <= 1.2, `sekundær interesse ${v} giver for mange point til ${k} (${pts})`);
        else assert.equal(FIELD_OF[k] === field || ['t_praksis', 't_ved', 'k_ved', 'm_ved'].includes(v) || FIELD_OF[k] === field, true, `${v} peger uden for området`);
      }
    }
  }
  for (const x of Object.keys(SECOND_FIELD)) assert.ok(WEIGHTS[2][x], x);
});

test('alle uddannelser har en Klaviyo-liste (ellers bliver samtykke ikke til en tilmelding)', () => {
  for (const k of Object.keys(educations)) assert.match(lists[k] || '', /^[A-Za-z0-9]{6}$/, 'mangler liste: ' + k);
});

test('alle uddannelser kan blive førstevalg, og salgsbonussen virker uden at overdøve valget af felt', () => {
  const s = simulate();
  for (const k of Object.keys(educations)) {
    assert.ok((s.uniform[k] || 0) >= 0.005, k + ' bliver (næsten) aldrig anbefalet (lige store felter)');
    assert.ok((s.real[k] || 0) >= 0.005, k + ' bliver (næsten) aldrig anbefalet (felter som i salg)');
  }
  const bestSeller = Object.keys(educations).sort((a, b) => educations[b].sales - educations[a].sales)[0];
  assert.ok(s.real[bestSeller] < 0.25, 'den mest solgte må ikke fylde mere end en fjerdedel');
});

test('hovedinteressen vejer tungt: førstevalget ligger næsten altid i det valgte interesseområde', () => {
  const s = simulate();
  assert.ok(s.outsideShare <= 0.03, 'førstevalg uden for valgt område: ' + (100 * s.outsideShare).toFixed(1) + '%');
  for (const [field, v] of Object.entries(s.infield)) assert.ok(v.in / v.n >= 0.9, field + ': kun ' + Math.round(100 * v.in / v.n) + '% lander i feltet');
});

test('afvigende førstevalg kræver, at BÅDE emne (spørgsmål 2) og opgave (spørgsmål 6) peger tydeligt på den anbefalede uddannelse — og hovedinteressen vises stadig', () => {
  let outside = 0, n = 0;
  everyCombination((a) => {
    n++; setAnswers(a);
    const m = getMatches(a); const first = m[0].key;
    if (FIELDS[a[1]].includes(first)) return;
    outside++;
    // åbenlyst irrelevant = hverken emne eller opgave støtter den anbefalede uddannelse
    assert.ok(w(2, a, first) >= 1.0 || w(6, a, first) >= 1.5, 'åbenlyst irrelevant førstevalg ' + first + ' for ' + JSON.stringify(a));
    assert.ok(m.some(x => FIELDS[a[1]].includes(x.key)), 'hovedinteressen er ikke blandt de viste for ' + JSON.stringify(a));
  });
  assert.ok(outside / n < 0.02, 'for mange afvigende førstevalg: ' + (100 * outside / n).toFixed(1) + '%');
});

test('sekundære interesser påvirker alternativerne, ikke hovedinteressen', () => {
  // Teknologi som hovedinteresse: "også draget af at hjælpe mennesker" må ikke give Coach som førstevalg, men Coach må gerne vises som alternativ
  const a = { 1: 'tech', 2: 'x_terapi', 3: 'job', 4: 'job_og_studie', 5: 'nystart', 6: 'analysere' };
  setAnswers(a); const m = getMatches(a).map(x => x.key);
  assert.equal(m[0], 'programmor');
  assert.ok(m.includes('coach') || m.includes('selvvaerd') || m.includes('familiebehandler'), 'den sekundære interesse bør give et alternativ');
  // Sundhed + sekundær interesse i at hjælpe mennesker
  const b = { 1: 'sundhed', 2: 'x_terapi', 3: 'selvstaendig', 4: 'familie', 5: 'nystart', 6: 'lytte' };
  setAnswers(b); assert.equal(getMatches(b)[0].key, 'kostvejleder');
});

test('uddannelser uden for hoved- og sekundærinteressen vises kun, når to svar peger tydeligt på dem', () => {
  everyCombination((a) => {
    setAnswers(a);
    const f2 = SECOND_FIELD[a[2]];
    getMatches(a).slice(1).forEach((x) => {
      const f = FIELD_OF[x.key];
      if (f === a[1] || f === f2) return;
      assert.ok(w(2, a, x.key) >= 1.5 && w(6, a, x.key) >= 1.5, 'irrelevant alternativ ' + x.key + ' for ' + JSON.stringify(a));
    });
  });
});

test('alle seks spørgsmål kan ændre resultatet (de viste uddannelser)', () => {
  const valid = (q, c) => (q === '2' ? BRANCHES[c[1]] : Object.keys(WEIGHTS[q]));
  for (const q of Object.keys(WEIGHTS)) {
    let changes = 0;
    everyCombination((c) => {
      setAnswers(c); const base = getMatches(c).map(x => x.key).join();
      for (const v of valid(q, c)) { setAnswers({ ...c, [q]: v }); if (getMatches(answers).map(x => x.key).join() !== base) { changes++; break; } }
    });
    assert.ok(changes > 0, 'spørgsmål ' + q + ' påvirker aldrig resultatet');
  }
});

test('hvert spørgsmål 3-6 ændrer de viste uddannelser i mindst hver tiende enkeltændring (de er ikke med for at fylde)', () => {
  for (const q of ['3', '4', '5', '6']) {
    let changed = 0, total = 0;
    everyCombination((c) => {
      setAnswers(c); const base = getMatches(c).map(x => x.key).join();
      for (const v of Object.keys(WEIGHTS[q])) { if (v === c[q]) continue; setAnswers({ ...c, [q]: v }); total++; if (getMatches(answers).map(x => x.key).join() !== base) changed++; }
    });
    assert.ok(changed / total >= 0.1, 'spørgsmål ' + q + ' ændrer kun ' + (100 * changed / total).toFixed(1) + '% af de viste matches');
  }
});

// ───────────────────────── Resultatsiden: profil, 1-3 matches, begrundelser ─────────────────────────
test('begrundelser, profil-tekster og pitch dækker præcis siden\'s svarmuligheder og uddannelser', () => {
  for (const q of Object.keys(WEIGHTS)) assert.deepEqual(Object.keys(REASONS[q]).sort(), Object.keys(WEIGHTS[q]).sort(), 'REASONS spørgsmål ' + q);
  assert.deepEqual(Object.keys(MOTIV).sort(), Object.keys(WEIGHTS[3]).sort());
  assert.deepEqual(Object.keys(TEMPO).sort(), Object.keys(WEIGHTS[4]).sort());
  assert.deepEqual(Object.keys(EXPERIENCE).sort(), Object.keys(WEIGHTS[5]).sort());
  assert.deepEqual(Object.keys(CHIPS[6]).sort(), Object.keys(WEIGHTS[6]).sort());
  assert.deepEqual(Object.keys(CHIPS[5]).sort(), Object.keys(WEIGHTS[5]).sort());
  assert.deepEqual(Object.keys(CHIPS[3]).sort(), Object.keys(WEIGHTS[3]).sort());
  assert.deepEqual(Object.keys(PITCH).sort(), Object.keys(educations).sort());
  for (const [k, t] of Object.entries(PITCH)) assert.ok(t.length > 30 && t.length <= 140 && t.endsWith('.'), 'pitch ' + k);
});

test('1-3 forskellige matches; der vises ikke tre, hvis der ikke er tre relevante; tredje kun når den ligger tæt på førstepladsen', () => {
  const counts = { 1: 0, 2: 0, 3: 0 }; let n = 0;
  everyCombination((a) => {
    setAnswers(a); n++;
    const m = getMatches(a); const { score } = rankAll(a);
    assert.ok(m.length >= 1 && m.length <= 3);
    assert.equal(new Set(m.map(x => x.key)).size, m.length, 'dubletter');
    counts[m.length]++;
    if (m.length === 3) assert.ok(score[m[0].key] - score[m[2].key] <= THIRD_MATCH_MAX_GAP + 1e-9, 'tredje match ligger for langt fra førstepladsen');
  });
  assert.ok(counts[1] > 0, 'der bør findes tilfælde med kun ét relevant match (fx teknologi uden sekundær interesse)');
  assert.ok(counts[3] / n > 0.2 && counts[3] / n < 0.7, 'tredje match vises i ' + Math.round(100 * counts[3] / n) + '% af tilfældene');
});

test('de to første matches er altid præcis getRecommendation() (Klaviyo: Anbefaling og Alternativ; alternativ kan mangle)', () => {
  everyCombination((a) => {
    setAnswers(a);
    const rec = getRecommendation(); const m = getMatches(a);
    assert.equal(m[0].key, rec[0]); assert.equal(m[1] ? m[1].key : undefined, rec[1]);
    if (rec[1]) assert.notEqual(rec[0], rec[1]);
  });
});

test('hver begrundelse stammer fra et svar, brugeren faktisk gav, og som reelt gav point til uddannelsen', () => {
  everyCombination((a) => {
    setAnswers(a);
    getMatches(a).forEach((m, i) => {
      const max = i === 0 ? 3 : 2;
      assert.ok(m.reasons.length >= 1 && m.reasons.length <= max, m.key + ' har ' + m.reasons.length + ' begrundelser');
      assert.equal(new Set(m.reasons).size, m.reasons.length);
      for (const text of m.reasons) {
        const src = Object.keys(REASONS).filter(q => text === REASONS[q][a[q]] && w(q, a, m.key) > 0);
        assert.ok(src.length === 1, 'begrundelsen "' + text + '" for ' + m.key + ' kan ikke føres tilbage til brugerens svar');
      }
      assert.equal(m.pitch, PITCH[m.key]);
    });
  });
});

test('begrundelserne er de stærkeste svar først, og ved lige vægt går spørgsmål 1 før 2 før 6', () => {
  const a = { 1: 'terapi', 2: 't_par', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' };
  // Parterapeut: feltet terapi 5 · t_par 3,5 · lytte 2 · professionel .7 · opkvalificering .4
  assert.deepEqual(explain('parterapeut', a), [REASONS[1].terapi, REASONS[2].t_par, REASONS[6].lytte]);
  const prog = explain('programmor', { ...a, 1: 'tech', 2: 'x_ingen', 6: 'analysere' });
  assert.equal(prog[0], REASONS[1].tech);
});

test('interesseprofilen er komplet og følger altid det anbefalede interesseområde (ingen modstrid mellem profil og resultat)', () => {
  const seen = new Set();
  everyCombination((a) => {
    setAnswers(a);
    const p = buildProfile(a); const first = getMatches(a)[0].key;
    assert.ok(p.name && p.lead);
    assert.equal(p.drivers.length, 3); assert.equal(p.chips.length, 3);
    assert.ok([...p.drivers, ...p.chips].every(t => typeof t === 'string' && t.length > 2));
    assert.equal(p.name, PROFILES[FIELD_DIM[FIELD_OF[first]]].name, 'profilen modsiger førstevalget ' + first);
    assert.equal(profileDimension(a), FIELD_DIM[FIELD_OF[first]]);
    seen.add(p.name);
  });
  assert.deepEqual([...seen].sort(), Object.values(PROFILES).map(p => p.name).sort(), 'ikke alle profiler kan opnås');
});

test('profilen lover ikke mere, end seks svar kan bære: ingen påstande om personlighed eller evner, og den siger det selv', () => {
  for (const p of Object.values(PROFILES)) {
    assert.match(p.lead, /^Dine svar peger på/, 'profilen skal formuleres som et vejledende bud: ' + p.name);
    assert.doesNotMatch(p.name + ' ' + p.lead, /personlighed|evne|talent|født|type\b|er god til|er dygtig|egner dig/i, 'påstand om personlighed eller evner i: ' + p.name);
  }
  for (const text of [...Object.values(MOTIV), ...Object.values(TEMPO), ...Object.values(EXPERIENCE), ...Object.values(CHIPS).flatMap(o => Object.values(o))]) {
    assert.doesNotMatch(text, /personlighed|talent|evne|er god til|er dygtig/i, text);
  }
  for (const v of Object.values(CHIPS[6])) assert.match(v, /^Energi af /);
  for (const v of Object.values(CHIPS[5])) assert.match(v, /^Erfaring: /);
  for (const v of Object.values(CHIPS[3])) assert.match(v, /^Mål: /);
  assert.match(html, /Profilen er vejledende og bygger kun på dine seks svar\. Den er ikke en personlighedstest\./);
});

test('"populær" gælder de tre mest solgte uddannelser', () => {
  const top3 = Object.keys(educations).sort((a, b) => educations[b].sales - educations[a].sales).slice(0, 3);
  assert.deepEqual([...POPULAR].sort(), [...top3].sort());
});

test('resultatsiden har pladser til alle tre kort, profil, begrundelser og afsender-note (og de gamle id\'er er bevaret)', () => {
  for (const id of ['profile-card', 'profile-title', 'profile-lead', 'profile-drivers', 'profile-chips',
    'res-title', 'res-cat', 'res-desc', 'res-why', 'res-gain', 'res-traits', 'res-link',
    'alt-card', 'alt-title', 'alt-cat', 'alt-desc', 'alt-why', 'alt-gain', 'alt-traits', 'alt-link',
    'alt2-card', 'alt2-title', 'alt2-cat', 'alt2-desc', 'alt2-why', 'alt2-gain', 'alt2-traits', 'alt2-link']) {
    assert.ok(html.includes('id="' + id + '"'), 'mangler #' + id);
  }
  assert.match(html, /Alle uddannelser i testen udbydes af Nordic Online Academy ApS/, 'afsender skal fremgå af resultatsiden');
  assert.match(html, /Alle uddannelser udbydes af Nordic Online Academy ApS \(onlineuddannelse\.dk\)\./, 'afsender skal fremgå af footeren');
  assert.doesNotMatch(html, /\d\d?\s?%\s?match/i, 'ingen fiktive matchprocenter');
});

test('resultatet afsløres først efter leadformularen: resultatkortene er tomme i markup, og showResult kaldes kun fra formularen', () => {
  for (const id of ['res-title', 'alt-title', 'alt2-title', 'profile-title']) assert.match(html, new RegExp('id="' + id + '"></div>'), id + ' skal være tom, før formularen er udfyldt');
  const calls = html.match(/showResult\(\)/g) || [];
  assert.equal(calls.length, 2, 'showResult() må kun findes som definition og som ét kald (efter formularen)'); // definition + ét kald
  const submit = html.slice(html.indexOf("getElementById('gate-form').addEventListener('submit'"));
  assert.ok(submit.indexOf('sendLead(d)') > 0 && submit.indexOf('showResult();') > submit.indexOf('sendLead(d)'));
  assert.ok(/id="next-6" disabled aria-disabled="true" onclick="goTo\('gate'\)"/.test(html), 'sidste spørgsmål skal føre til formularen, ikke til resultatet');
});

test('Klaviyo-eventet har stadig Anbefaling og Alternativ (kan være tom) — og Profil, Tredje valg og Test-version', () => {
  for (const key of ['Anbefaling:educations[pk].title', "Alternativ:ak?educations[ak].title:''", "'Tredje valg':", 'Profil:profilNavn', "'Test-version':TEST_VERSION", "'Samtykke marketing':d.consent", "Svar:Object.assign({},answers)"]) {
    assert.ok(html.includes(key), 'mangler i sendLead: ' + key);
  }
  assert.match(html, /const TEST_VERSION = 'v2'/);
});

test('spørgsmål 5 bruger den aftalte formulering og svarmuligheder, uden hjælpetekst', () => {
  assert.ok(html.includes('Hvor meget erfaring har du inden for det område, du interesserer dig for?'));
  for (const label of ['Ingen, jeg starter helt fra bunden', 'Lidt, fra arbejde, hobby eller privat', 'Meget, jeg arbejder allerede professionelt inden for området']) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Så foreslår vi det niveau/);
  assert.doesNotMatch(html, /id="q5-hint"/);
});

test('erfaring udelukker aldrig en uddannelse: ingen uddannelse får minuspoint, og vægtene er lette', () => {
  for (const [v, wt] of Object.entries(WEIGHTS[5])) for (const [k, p] of Object.entries(wt)) assert.ok(p > 0 && p <= 1, `erfaring ${v}/${k}: ${p}`);
  // samme svar med forskellig erfaring ændrer højst rækkefølgen af de viste — og kun sjældent førstevalget
  let firstChanged = 0, total = 0;
  everyCombination((c) => { setAnswers(c); const base = getMatches(c)[0].key; for (const v of Object.keys(WEIGHTS[5])) { if (v === c[5]) continue; setAnswers({ ...c, 5: v }); total++; if (getMatches(answers)[0].key !== base) firstChanged++; } });
  assert.ok(firstChanged / total < 0.06, 'erfaring ændrer førstevalget i ' + (100 * firstChanged / total).toFixed(1) + '% af tilfældene');
});

test('forgreningen: spørgsmål 2 vises efter spørgsmål 1, og et ændret hovedvalg nulstiller svaret', () => {
  assert.ok(html.includes('function prepareStep(step)'));
  assert.ok(html.includes('g.hidden = g.dataset.branch!==f'));
  assert.ok(html.includes('delete answers[2]'), 'svaret på spørgsmål 2 skal nulstilles, når hovedinteressen ændres');
});

test('HR formuleres som HR og arbejdsliv — ikke som ledelse og forretning', () => {
  assert.ok(html.includes('HR og arbejdsliv'));
  assert.doesNotMatch(html, /Ledelse og forretning|Mennesker og ledelse/);
});

test('Dekoratør beskrives som butiks- og vinduesdekoration', () => {
  assert.match(educations.dekoratoer.desc, /butik/i);
  assert.match(PITCH.dekoratoer, /butik/i);
  assert.ok(html.includes('Butikker og vinduer'));
});

test('linkene virker (kun med LINKS=1)', { skip: !process.env.LINKS }, async () => {
  for (const [k, e] of Object.entries(educations)) {
    const r = await fetch(e.url, { redirect: 'follow' });
    assert.equal(r.status, 200, k + ' → ' + e.url + ' gav ' + r.status);
  }
});

test('"Tag testen igen" rydder det gamle resultat og alle valg', () => {
  const reset = html.slice(html.indexOf('function resetQuiz()'), html.indexOf('function clearResult()'));
  assert.ok(reset.includes('clearResult()'), 'resetQuiz skal rydde resultatet');
  assert.ok(reset.includes("setAttribute('aria-pressed','false')"), 'valgte knapper skal nulstilles for skærmlæsere');
  const clear = html.slice(html.indexOf('function clearResult()'));
  for (const id of ['res-title', 'alt-title', 'alt2-title', 'profile-title', 'res-why', 'alt-why', 'alt2-why']) assert.ok(clear.slice(0, 900).includes("'" + id + "'"), id + ' skal ryddes');
});

test('tastatur: "Næste" er rigtigt deaktiveret, til der er svaret, og alle svarmuligheder er rigtige knapper i naturlig tabrækkefølge', () => {
  for (let i = 1; i <= 6; i++) assert.ok(html.includes('id="next-' + i + '" disabled aria-disabled="true"'), 'next-' + i + ' skal starte deaktiveret');
  assert.ok(html.includes('function setNext(btn, enabled)') && html.includes('btn.disabled = !enabled'));
  assert.equal((html.match(/classList\.(add|remove|toggle)\('disabled'/g) || []).length, 1, 'kun setNext() må ændre klassen "disabled"');
  assert.ok(!html.includes('<div class="opt"'), 'svarmuligheder skal være <button>');
  assert.ok(!/class="opt"[^>]*tabindex="-1"/.test(html), 'ingen svarmulighed må være udelukket fra tabrækkefølgen');
});
