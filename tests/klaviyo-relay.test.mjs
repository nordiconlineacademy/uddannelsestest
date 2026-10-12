// Kør: node --test tests/klaviyo-relay.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import relay, { validate, ALLOWED_LISTS } from '../netlify/functions/klaviyo.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const siteLists = new Function(html.match(/const EDU_LISTS = \{[\s\S]*?\};/)[0] + '; return EDU_LISTS;')();

const profile = (email = 'a@example.com') => ({ data: { type: 'profile', attributes: { email, first_name: 'A', last_name: 'B' } } });
const eventBody = (over = {}) => ({ data: { type: 'event', attributes: { properties: { Email: 'a@example.com' }, metric: { data: { type: 'metric', attributes: { name: 'Uddannelsestest gennemført' } } }, profile: profile(), ...over } } });
const subBody = (listId = 'XpgTt7', over = {}) => ({ data: { type: 'subscription', attributes: { custom_source: 'uddannelsestest.dk', profile: profile(), ...over }, relationships: { list: { data: { type: 'list', id: listId } } } } });

const call = (payload, { origin = 'https://uddannelsestest.dk', method = 'POST', raw } = {}) =>
  relay(new Request('https://uddannelsestest.dk/.netlify/functions/klaviyo', { method, headers: { origin, 'content-type': 'application/json' }, body: method === 'POST' ? (raw ?? JSON.stringify(payload)) : undefined }));

test('de tilladte lister er præcis siden\'s lister', () => {
  assert.deepEqual([...ALLOWED_LISTS].sort(), Object.values(siteLists).sort());
});

test('gyldigt event og gyldig tilmelding godkendes', () => {
  assert.equal(validate('events', eventBody()), null);
  assert.equal(validate('subscriptions', subBody()), null);
});

test('afviser alt andet end siden selv sender', () => {
  assert.ok(validate('profiles', eventBody()), 'ukendt path');
  assert.ok(validate('events', eventBody({ metric: { data: { type: 'metric', attributes: { name: 'Placed Order' } } } })), 'forkert metric');
  assert.ok(validate('events', eventBody({ profile: profile('ikke-en-mail') })), 'ugyldig e-mail');
  assert.ok(validate('subscriptions', subBody('ABCDEF')), 'ukendt liste');
  assert.ok(validate('subscriptions', subBody('XpgTt7', { custom_source: 'andet' })), 'forkert kilde');
  assert.ok(validate('events', {}), 'tom krop');
  assert.ok(validate('events', null), 'null');
});

test('afviser forkert oprindelse, metode, ugyldig JSON og for stor krop — uden at kalde Klaviyo', async () => {
  let calls = 0; const orig = globalThis.fetch; globalThis.fetch = async () => { calls++; return new Response(null, { status: 202 }); };
  try {
    assert.equal((await call({ path: 'events', body: eventBody() }, { origin: 'https://ondsindet.example' })).status, 403);
    assert.equal((await call({ path: 'events', body: eventBody() }, { origin: '' })).status, 403);
    assert.equal((await call(null, { method: 'GET' })).status, 405);
    assert.equal((await call(null, { raw: '{ikke json' })).status, 400);
    assert.equal((await call(null, { raw: 'x'.repeat(13 * 1024) })).status, 413);
    assert.equal((await call({ path: 'events', body: eventBody({ profile: profile('x') }) })).status, 400);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = orig; }
});

test('videresender et gyldigt kald til Klaviyo med company_id og revision', async () => {
  const seen = []; const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { seen.push({ url: String(url), init }); return new Response(null, { status: 202 }); };
  try {
    const res = await call({ path: 'subscriptions', body: subBody('T6hzYb') });
    assert.equal(res.status, 202);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, 'https://a.klaviyo.com/client/subscriptions/?company_id=RtCNbE');
    assert.equal(seen[0].init.headers.revision, '2024-10-15');
    assert.equal(JSON.parse(seen[0].init.body).data.relationships.list.data.id, 'T6hzYb');
  } finally { globalThis.fetch = orig; }
});

test('giver 502 hvis Klaviyo svarer fejl eller er nede', async () => {
  const orig = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 500 });
    assert.equal((await call({ path: 'events', body: eventBody() })).status, 502);
    globalThis.fetch = async () => { throw new TypeError('netværk'); };
    assert.equal((await call({ path: 'events', body: eventBody() })).status, 502);
  } finally { globalThis.fetch = orig; }
});

test('siden falder tilbage til relæet ved blokeret kald (TypeError), men ikke ved fx 400 fra Klaviyo', () => {
  assert.match(html, /e instanceof TypeError\) \? klaviyoRelay\(path, body\)/);
  assert.match(html, /\/\.netlify\/functions\/klaviyo/);
});
