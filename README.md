# uddannelsestest.dk

Statisk side (én `index.html`, ingen build). Deployes af Netlify ved push til `main`.

## Hvordan det hænger sammen
1. Besøgende svarer på 6 spørgsmål → **pointmodel** (`WEIGHTS` + bonus efter salg) giver førstevalg og alternativ.
2. Før resultatet vises udfylder de navn, e-mail og (valgfrit) køn, og kan sige ja til nyheder.
3. Browseren sender til Klaviyo (DK-kontoen): altid eventet **"Uddannelsestest gennemført"**; kun ved samtykke også
   tilmelding til brochure-listen for den anbefalede uddannelse (`EDU_LISTS`). Hvis kaldet blokeres (annonceblokker m.m.),
   sendes det i stedet via relæet `netlify/functions/klaviyo.mjs`.
4. Backoffice henter eventet og opretter et lead af typen `uddannelsestest` (fanen "Uddannelsestest.dk" under leads).
   **Event-egenskaberne** (`Email`, `Fornavn`, `Efternavn`, `Køn`, `Anbefaling`, `Alternativ`, `Svar`, `Samtykke marketing`)
   er kontrakten mellem `sendLead()` i `index.html` og `sync_test_leads` i noabackoffice — ændres de ét sted, skal begge rettes.

## Tests
```
node --test tests/recommendation.test.mjs tests/klaviyo-relay.test.mjs      # Node 18+, ingen afhængigheder
LINKS=1 node --test tests/recommendation.test.mjs                           # tjekker også at alle 16 links virker
```
Testene sikrer bl.a. at alle uddannelser kan blive anbefalet, at alle svarmuligheder har point, at hver uddannelse har en
Klaviyo-liste, og at relæet kun videresender de to kald, siden selv sender.

## Tilføje eller fjerne en uddannelse
1. `educations{}` i `index.html` (titel, kategori, `sales`, beskrivelse, link) + vægte i `WEIGHTS` + liste-id i `EDU_LISTS`.
2. Samme liste-id i `ALLOWED_LISTS` i `netlify/functions/klaviyo.mjs`.
3. I noabackoffice: `SITE_EDUCATIONS` i `app/services/uddannelsestest_stats.py` og testen af titler i `tests/test_sync_klaviyo_uddannelsestest.py`.
4. Kør testene ovenfor.

## Opdatere salgstallene (et par gange om året)
```
ssh root@<server> "cd /opt/noabackoffice && docker compose -f docker-compose.prod.yml exec -T backend python scripts/export_site_sales.py" | node tools/update-sales.mjs
node --test tests/recommendation.test.mjs
```
Tallene er gennemførte ordrer seneste 12 mdr. De bruges til et bonuspoint, så de mest solgte uddannelser fremhæves.

## Justere pointmodellen med rigtige data
Når der er ca. 200-300 gennemførte tests: `docker compose -f docker-compose.prod.yml exec -T backend python scripts/analyze_test_leads.py`
viser svarfordelingen og anbefalingerne mod salg.

## Måling (GA4)
Sæt `GA_MEASUREMENT_ID` (G-XXXXXXXXXX) øverst i scriptet i `index.html`. GA4 indlæses kun efter samtykke til "Statistik" i
Cookiebot. Hændelser: `quiz_start`, `quiz_step` (step), `quiz_gate_view`, `quiz_lead_submit`, `quiz_result`, `quiz_click_education`.

## Samtykke
Cookiebot (auto-blocking, NOA's konto). Intercom aktiveres kun ved samtykke til "Præferencer", GA4 til "Statistik".
`privatliv.html` viser Cookiebots cookieliste.
