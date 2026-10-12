// Kør: node --test tests/personas.test.mjs
// Tjekker, at anbefalingen rammer det, personerne i personas.mjs forventer (kladde, til gennemlæsning af studievejlederne).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PERSONAS } from './personas.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const answers = {};
const { educations, WEIGHTS, BRANCHES, rankAll, getMatches } =
  new Function('answers', html.slice(html.indexOf('/* ANBEFALING:START'), html.indexOf('/* ANBEFALING:SLUT')) + '; return {educations, WEIGHTS, BRANCHES, rankAll, getMatches};')(answers);

const run = (p) => { for (const k of Object.keys(answers)) delete answers[k]; Object.assign(answers, p.svar); return getMatches(p.svar).map(m => m.key); };

test('personaernes svar er gyldige (hører til den valgte gren og findes i spørgsmålene)', () => {
  for (const p of PERSONAS) {
    for (const q of Object.keys(WEIGHTS)) assert.ok(WEIGHTS[q][p.svar[q]], `persona ${p.id}: ugyldigt svar til spørgsmål ${q}`);
    assert.ok(BRANCHES[p.svar[1]].includes(p.svar[2]), `persona ${p.id}: svar 2 passer ikke til feltet`);
    for (const k of p.forventet) assert.ok(educations[k], `persona ${p.id}: ukendt uddannelse ${k}`);
  }
  assert.equal(new Set(PERSONAS.map(p => p.id)).size, PERSONAS.length);
});

test('hver uddannelse er repræsenteret af mindst én persona', () => {
  const covered = new Set(PERSONAS.flatMap(p => p.forventet));
  for (const k of Object.keys(educations)) assert.ok(covered.has(k), 'ingen persona for ' + k);
});

test('anbefalingen rammer personaernes forventede uddannelse', () => {
  let primary = 0, top3 = 0; const misses = [];
  for (const p of PERSONAS) {
    const got = run(p);
    if (p.forventet.includes(got[0])) primary++; else misses.push(`#${p.id} "${p.tekst}" → ${got.join(', ')} (forventet ${p.forventet.join(' / ')})`);
    if (p.forventet.some(k => got.includes(k))) top3++;
  }
  console.log(`personas: førstevalg rammer ${primary}/${PERSONAS.length}, forventet uddannelse i top 3: ${top3}/${PERSONAS.length}`);
  misses.forEach(m => console.log('  ✗ ' + m));
  assert.ok(top3 / PERSONAS.length >= 0.95, 'forventet uddannelse er i top 3 for for få personer');
  assert.ok(primary / PERSONAS.length >= 0.85, 'førstevalget rammer for få personer');
});
