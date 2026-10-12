// Relæ til Klaviyos offentlige client-API. Bruges kun som fallback, når browseren ikke kan nå
// a.klaviyo.com direkte (annonceblokkere, privatlivsbrowsere). Funktionen er IKKE en åben proxy:
// den videresender kun de to kald, siden selv laver, og kun til de kendte uddannelses-lister.
// Ingen hemmelige nøgler — company_id er den samme offentlige nøgle, som ligger i index.html.

const COMPANY_ID = 'RtCNbE';
const REVISION = '2024-10-15';
const EVENT_NAME = 'Uddannelsestest gennemført';
const SOURCE = 'uddannelsestest.dk';
const MAX_BODY_BYTES = 12 * 1024;

// Skal være identisk med EDU_LISTS i index.html (tests/klaviyo-relay.test.mjs tjekker det).
export const ALLOWED_LISTS = new Set([
  'XpgTt7', 'SpB2yZ', 'Urirfn', 'T6hzYb', 'Tp8QWi', 'YatsTR', 'XZMsnY', 'RN6Yj7',
  'UrhVkq', 'RByK2j', 'TTB29R', 'RCvDye', 'VLdXnr', 'VxwMtd', 'V4kvrd', 'SYmvdA',
]);

const EMAIL_RE = /^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,}$/;
const ORIGIN_OK = [/^https:\/\/(www\.)?uddannelsestest\.dk$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/];

function profileEmail(attrs) {
  return attrs?.profile?.data?.attributes?.email;
}

/** Returnerer en fejltekst, eller null hvis kaldet har præcis den form, siden selv sender. */
export function validate(path, body) {
  if (path !== 'events' && path !== 'subscriptions') return 'ukendt path';
  const data = body?.data;
  const attrs = data?.attributes;
  if (!data || !attrs || typeof attrs !== 'object') return 'mangler data';
  const email = profileEmail(attrs);
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return 'ugyldig e-mail';

  if (path === 'events') {
    if (data.type !== 'event') return 'forkert type';
    if (attrs.metric?.data?.attributes?.name !== EVENT_NAME) return 'forkert metric';
    if (!attrs.properties || typeof attrs.properties !== 'object') return 'mangler properties';
    return null;
  }
  if (data.type !== 'subscription') return 'forkert type';
  if (attrs.custom_source !== SOURCE) return 'forkert kilde';
  const list = data.relationships?.list?.data;
  if (list?.type !== 'list' || !ALLOWED_LISTS.has(list.id)) return 'ukendt liste';
  return null;
}

const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST kun' });
  const origin = req.headers.get('origin') || '';
  if (!ORIGIN_OK.some((re) => re.test(origin))) return json(403, { error: 'forkert oprindelse' });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'for stor' });
  let payload;
  try { payload = JSON.parse(raw); } catch { return json(400, { error: 'ugyldig JSON' }); }

  const problem = validate(payload?.path, payload?.body);
  if (problem) return json(400, { error: problem });

  try {
    const res = await fetch(`https://a.klaviyo.com/client/${payload.path}/?company_id=${COMPANY_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json', revision: REVISION },
      body: JSON.stringify(payload.body),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? json(202, { ok: true }) : json(502, { error: 'klaviyo ' + res.status });
  } catch {
    return json(502, { error: 'klaviyo utilgængelig' });
  }
};
