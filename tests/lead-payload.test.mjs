// Kør: node --test tests/lead-payload.test.mjs   (Node 18+, ingen afhængigheder)
// Tester det, der sendes til Klaviyo (stabile ID'er, samtykke, unique_id) og udbakken (genforsøg uden datatab). Intet netværk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validate } from '../netlify/functions/klaviyo.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cut = (from, to) => html.slice(html.indexOf(from), html.indexOf(to));
const answers = {};
const rec = new Function('answers', cut('/* ANBEFALING:START', '/* ANBEFALING:SLUT') + '; return { educations, WEIGHTS, BRANCHES, getMatches, buildProfile, profileDimension };')(answers);
const { buildLeadCalls, createOutbox } = new Function(cut('/* LEAD:START', '/* LEAD:SLUT') + '; return { buildLeadCalls, createOutbox };')();
const lists = new Function(html.match(/const EDU_LISTS = \{[\s\S]*?\};/)[0] + '; return EDU_LISTS;')();
const titles = Object.fromEntries(Object.entries(rec.educations).map(([k, e]) => [k, e.title]));

const setAnswers = (a) => { for (const k of Object.keys(answers)) delete answers[k]; Object.assign(answers, a); };
const person = { first: 'Anna', last: 'Hansen', email: 'anna@example.com', gender: 'Kvinde', consent: false };
const NOW = '2026-10-16T10:00:00.000Z';
function calls(a, d = {}, over = {}) {
  setAnswers(a);
  return buildLeadCalls({ ...person, ...d }, {
    answers, matches: rec.getMatches(answers), titles, lists, profileKey: rec.profileDimension(answers), profileName: rec.buildProfile(answers).name,
    testVersion: 'v2', consentVersion: '2026-10-12', eventName: 'Uddannelsestest gennemført', now: NOW, submissionId: 'sub-1', tracking: { utm_source: 'meta' }, ...over,
  });
}
const A = { 1: 'tech', 2: 'x_kreativ', 3: 'job', 4: 'job_og_studie', 5: 'professionel', 6: 'lede' };
const props = (c) => c[0].body.data.attributes.properties;

test('stabile ID\'er for interesse, profil, match og mål — ikke visningstekster', () => {
  const p = props(calls(A));
  assert.equal(p.lead_source, 'uddannelsestest.dk');
  assert.equal(p.primary_interest, 'tech');
  assert.equal(p.secondary_interest, 'kreativ');
  assert.equal(p.education_goal, 'job');
  assert.equal(p.test_version, 'v2');
  assert.equal(p.test_completed_at, NOW);
  assert.ok(rec.educations[p.primary_match], 'primary_match er en uddannelsesnøgle');
  assert.ok(['omsorg', 'skaber', 'analyse', 'fortaeller', 'sundhed', 'leder'].includes(p.interest_profile));
  assert.deepEqual([p.answer_q1, p.answer_q2, p.answer_q3, p.answer_q4, p.answer_q5, p.answer_q6], ['tech', 'x_kreativ', 'job', 'job_og_studie', 'professionel', 'lede']);
});

test('sekundært interesseområde er tomt, når spørgsmål 2 ikke er et "hvad ellers"-svar', () => {
  assert.equal(props(calls({ ...A, 1: 'terapi', 2: 't_par' })).secondary_interest, '');
  assert.equal(props(calls({ ...A, 2: 'x_ingen' })).secondary_interest, '');
});

test('de eksisterende danske egenskaber sendes uændret (bagudkompatibelt med flows og ældre sync)', () => {
  const p = props(calls(A, { gender: 'Mand' }));
  const m = rec.getMatches(answers);
  assert.equal(p.Anbefaling, titles[m[0].key]);
  assert.equal(p.Alternativ, m[1] ? titles[m[1].key] : '');
  assert.equal(p['Tredje valg'], m[2] ? titles[m[2].key] : '');
  assert.equal(p['Test-version'], 'v2');
  assert.equal(p['Samtykke tekst version'], '2026-10-12');
  assert.equal(p['Køn'], 'Mand');
  assert.deepEqual(p.Svar, A);
  assert.equal(p.Email, 'anna@example.com');
  assert.equal(p.utm_source, 'meta');
});

test('uden samtykke: kun event, ingen listetilmelding, og samtykke-tidspunkt er tomt', () => {
  const c = calls(A, { consent: false });
  assert.deepEqual(c.map((x) => x.path), ['events']);
  assert.equal(props(c).consent_marketing, false);
  assert.equal(props(c).consent_given_at, '');
  assert.equal(props(c)['Samtykke marketing'], false);
});

test('med samtykke: event + tilmelding til listen for førstevalget, samtykke dokumenteret med version og tidspunkt', () => {
  const c = calls(A, { consent: true });
  assert.deepEqual(c.map((x) => x.path), ['events', 'subscriptions']);
  const key = props(c).primary_match;
  assert.equal(c[1].body.data.relationships.list.data.id, lists[key]);
  assert.equal(c[1].body.data.attributes.custom_source, 'uddannelsestest.dk');
  assert.equal(props(c).consent_marketing, true);
  assert.equal(props(c).consent_text_version, '2026-10-12');
  assert.equal(props(c).consent_given_at, NOW);
});

test('eventet har unique_id og tidspunkt, så et genforsøg ikke tælles to gange', () => {
  const e = calls(A)[0].body.data.attributes;
  assert.equal(e.unique_id, 'sub-1');
  assert.equal(e.time, NOW);
  assert.equal(e.properties.submission_id, 'sub-1');
});

test('profilen får de stabile egenskaber og e-mail, men aldrig de enkelte svar-detaljer som fri tekst', () => {
  const prof = calls(A)[0].body.data.attributes.profile.data.attributes;
  assert.equal(prof.email, 'anna@example.com');
  assert.equal(prof.properties.primary_interest, 'tech');
  assert.equal(prof.properties.interest_profile, rec.profileDimension(answers));
  assert.equal(prof.properties.answer_q1, undefined, 'detaljerede svar ligger kun på eventet (historik pr. test), ikke på profilen');
});

test('alle 8.160 svarkombinationer giver gyldige, relæ-godkendte kald med stabile nøgler', () => {
  let n = 0;
  const { WEIGHTS, BRANCHES } = rec;
  for (const f of Object.keys(WEIGHTS[1])) for (const q2 of BRANCHES[f]) for (const q3 of Object.keys(WEIGHTS[3])) for (const q4 of Object.keys(WEIGHTS[4]))
    for (const q5 of Object.keys(WEIGHTS[5])) for (const q6 of Object.keys(WEIGHTS[6])) {
      const c = calls({ 1: f, 2: q2, 3: q3, 4: q4, 5: q5, 6: q6 }, { consent: n % 2 === 0 });
      const p = props(c);
      assert.ok(rec.educations[p.primary_match], 'primary_match');
      for (const k of [p.secondary_match, p.third_match]) assert.ok(k === '' || rec.educations[k], 'sekundær/tredje');
      assert.notEqual(p.primary_match, p.secondary_match);
      assert.equal(validate('events', c[0].body), null);
      if (c[1]) assert.equal(validate('subscriptions', c[1].body), null);
      assert.ok(JSON.stringify(c).length < 12 * 1024, 'under relæets grænse');
      n++;
    }
  assert.equal(n, 8160);
});

// ── Udbakken ──
function memoryStorage(initial) {
  const s = { v: initial ?? null, getItem: () => s.v, setItem: (_k, v) => { s.v = v; }, removeItem: () => { s.v = null; } };
  return s;
}
let idn = 0;
const mkOutbox = (storage, post, now = () => 1_000_000) => createOutbox(storage, post, now, () => 'id' + ++idn);
const two = () => calls(A, { consent: true });

test('udbakke: lykket afsendelse efterlader ingenting', async () => {
  const st = memoryStorage(); const sent = [];
  const ob = mkOutbox(st, async (p, b) => { sent.push(p); });
  await ob.send(two());
  assert.deepEqual(sent, ['events', 'subscriptions']);
  assert.equal(st.v, null);
});

test('udbakke: Klaviyo-fejl mister ingen data — kaldene ligger klar og sendes ved næste åbning med samme unique_id', async () => {
  const st = memoryStorage();
  const down = mkOutbox(st, async () => { throw Object.assign(new Error('Klaviyo 503'), { status: 503 }); });
  const res = await down.send(two());
  assert.ok(res.every((r) => r.status === 'rejected'));
  const saved = JSON.parse(st.v);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].body.data.attributes.unique_id, 'sub-1');

  const bodies = [];
  const up = mkOutbox(st, async (p, b) => { bodies.push(b); });
  await up.flush();
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].data.attributes.unique_id, 'sub-1');
  assert.equal(st.v, null);
});

test('udbakke: kun det fejlede kald bliver liggende', async () => {
  const st = memoryStorage();
  const ob = mkOutbox(st, async (p) => { if (p === 'subscriptions') throw new TypeError('Failed to fetch'); });
  await ob.send(two());
  const saved = JSON.parse(st.v);
  assert.deepEqual(saved.map((x) => x.path), ['subscriptions']);
  assert.equal(saved[0].tries, 1);
});

test('udbakke: ugyldige kald (4xx) droppes, men 429 og 408 prøves igen', async () => {
  const st = memoryStorage();
  await mkOutbox(st, async () => { throw Object.assign(new Error('Klaviyo 400'), { status: 400 }); }).send(two());
  assert.equal(st.v, null);
  await mkOutbox(st, async () => { throw Object.assign(new Error('Klaviyo 429'), { status: 429 }); }).send(two());
  assert.equal(JSON.parse(st.v).length, 2);
});

test('udbakke: giver op efter 8 forsøg og efter 7 døgn, og beholder højst 5 kald', async () => {
  const st = memoryStorage(); let t = 1_000_000;
  const fail = async () => { throw new TypeError('Failed to fetch'); };
  const ob = mkOutbox(st, fail, () => t);
  await ob.send(two());
  for (let i = 0; i < 7; i++) await ob.flush();
  assert.equal(st.v, null, '1 + 7 forsøg = 8');

  await ob.send(two()); t += 8 * 24 * 3600 * 1000;
  await ob.flush();
  assert.equal(st.v, null, 'for gammelt');

  for (let i = 0; i < 4; i++) await ob.send(two());
  assert.equal(JSON.parse(st.v).length <= 5, true);
});

test('udbakke: ødelagt eller utilgængelig lagring vælter ikke afsendelsen', async () => {
  const sent = [];
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  await mkOutbox(broken, async (p) => { sent.push(p); }).send(two());
  assert.deepEqual(sent, ['events', 'subscriptions']);
  const junk = memoryStorage('{ikke json');
  await mkOutbox(junk, async () => {}).flush();
  assert.equal(junk.v, null);
});
