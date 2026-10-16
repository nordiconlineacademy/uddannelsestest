# uddannelsestest.dk

Statisk side (én `index.html`, ingen build). Deployes af Netlify ved push til `main`.

## Hvordan det hænger sammen
1. Besøgende svarer på 6 spørgsmål → **pointmodel** giver 1-3 relevante uddannelser, en vejledende interesseprofil og en begrundelse pr. uddannelse.
   - Spørgsmål 1 er **interesseområdet** (terapi, kreativ, tech, medie, sundhed, HR). Alle uddannelser i området får et fast feltbonus (`FIELD_BONUS`), så hovedinteressen vejer tungt.
   - Spørgsmål 2 er en **opfølgning, der afhænger af spørgsmål 1** (`BRANCHES`): emnet inden for området. For tech, sundhed og HR (ét kursus hver) spørger vi i stedet om en sekundær interesse, som kun giver lave point og skaber alternativer.
   - Spørgsmål 3 (mål), 4 (situation), 5 (erfaring) og 6 (opgave der giver energi) finjusterer. Vægtene til 3 og 5 er udledt af 1.031 studerendes egne motivationssvar; erfaring udelukker aldrig en uddannelse.
   - Salgsbonus (kvadratrod af gennemførte ordrer, maks. `BOOST_MAX`) fremhæver de mest solgte. Se `isRelevantAlternative()` for hvilke alternativer der må vises.
   - Profilen følger altid det anbefalede interesseområde og er formuleret som et bud ("Dine svar peger på …"), ikke som en personlighedstest.
2. Før resultatet vises udfylder de navn, e-mail og (valgfrit) køn, og kan sige ja til nyheder.
3. Browseren sender til Klaviyo (DK-kontoen): altid eventet **"Uddannelsestest gennemført"**; kun ved samtykke også
   tilmelding til brochure-listen for den anbefalede uddannelse (`EDU_LISTS`). Hvis kaldet blokeres (annonceblokker m.m.),
   sendes det i stedet via relæet `netlify/functions/klaviyo.mjs`.
4. Backoffice henter eventet og opretter et lead af typen `uddannelsestest` (fanen "Uddannelsestest.dk" under leads).
   **Event-egenskaberne** (`Email`, `Fornavn`, `Efternavn`, `Køn`, `Anbefaling`, `Alternativ` (kan være tom), `Tredje valg`, `Profil`, `Svar`, `Test-version`, `Samtykke marketing`)
   er kontrakten mellem `sendLead()` i `index.html` og `sync_test_leads` i noabackoffice — ændres de ét sted, skal begge rettes.

## Tests
```
node --test tests/recommendation.test.mjs tests/klaviyo-relay.test.mjs tests/personas.test.mjs   # Node 18+, ingen afhængigheder
LINKS=1 node --test tests/recommendation.test.mjs                           # tjekker også at alle 16 links virker
```
`tests/personas.mjs` er 33 fiktive personer (bygget på de studerendes motivationssvar) med den uddannelse, en studievejleder ville anbefale — **kladde, skal gennemlæses af Kristoffer og Mikkel**. Testene sikrer bl.a. at hovedinteressen vejer tungt, at sekundære interesser kun påvirker alternativer, at profil og begrundelser aldrig modsiger resultatet, at alle uddannelser kan blive anbefalet, at alle svarmuligheder har point, at hver uddannelse har en
Klaviyo-liste, og at relæet kun videresender de to kald, siden selv sender.

## Testversion
`TEST_VERSION` i `index.html` (nu `v2`) sendes med hver besvarelse og står i leadets noter ("Testversion: v2"). Ændres spørgsmål eller svarnavne, så hæv versionen,
så analysen i backoffice (`scripts/analyze_test_leads.py`) aldrig blander gamle og nye svar. Leads uden versionslinje er `v1` (første udgave).

## Tilføje eller fjerne en uddannelse
1. `educations{}` i `index.html` (titel, kategori, `sales`, beskrivelse, link) + interesseområde i `FIELDS` + emne-svar og vægte i `WEIGHTS`/`BRANCHES` + liste-id i `EDU_LISTS`.
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

## Simulation

`node tools/simulate.mjs` kører alle 8.160 svarkombinationer med og uden salgsbonus og viser førstevalg pr. uddannelse, afvigelser fra interesseområdet og tætte resultater. Kør den, før vægte ændres.

`node tools/check-links.mjs` henter alle 16 uddannelsessider og tjekker status/titel. `tools/check-results-in-browser.js` indsættes i browserens konsol og kører alle 8.160 kombinationer gennem resultatsiden (sender intet til Klaviyo).
