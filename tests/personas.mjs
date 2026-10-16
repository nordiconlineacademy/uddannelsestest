// Fiktive personer til at tjekke, at anbefalingen rammer det, en studievejleder ville anbefale.
// De er skrevet ud fra mønstrene i 1.031 studerendes motivationssvar ("Udfyld din motivation" i Thinkific) — omskrevet og fuldt anonymiseret.
// STATUS: KLADDE — skal gennemlæses og rettes af Kristoffer og Mikkel (forventet = hvad de ville anbefale).
//
// svar: 1 felt, 2 emne/opfølgning, 3 mål, 4 livssituation, 5 erfaring, 6 opgave (samme nøgler som i index.html).
// forventet: de uddannelser, der er et godt førstevalg for personen (første er det bedste).
export const PERSONAS = [
  { id: 1, tekst: 'Pædagog (38) vil videre til familiebehandling og skifte spor i sit arbejdsliv', svar: { 1: 'terapi', 2: 't_fam', 3: 'job', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['familiebehandler'] },
  { id: 2, tekst: 'Pædagog (45) der arbejder med udsatte familier og vil have en dybere faglighed', svar: { 1: 'terapi', 2: 't_fam', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['familiebehandler'] },
  { id: 3, tekst: 'Ung mor (31) uden faglig baggrund, vil hjælpe børn og familier', svar: { 1: 'terapi', 2: 't_fam', 3: 'job', 4: 'familie', 5: 'nystart', 6: 'lytte' }, forventet: ['familiebehandler'] },
  { id: 4, tekst: 'Socialrådgiver (34) der har set parforhold gå i stykker og vil støtte par', svar: { 1: 'terapi', 2: 't_par', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['parterapeut'] },
  { id: 5, tekst: 'Kvinde (41) uden faglig baggrund, nysgerrig på parforhold og kommunikation', svar: { 1: 'terapi', 2: 't_par', 3: 'personlig', 4: 'job_og_studie', 5: 'nystart', 6: 'lytte' }, forventet: ['parterapeut'] },
  { id: 6, tekst: 'Lærer (36) der vil styrke seksualundervisningen på sin skole', svar: { 1: 'terapi', 2: 't_sex', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['sexolog'] },
  { id: 7, tekst: 'Nyuddannet psykoterapeut der vil udvide med seksualitet og intimitet', svar: { 1: 'terapi', 2: 't_sex', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['sexolog'] },
  { id: 8, tekst: 'Forælder til et barn med autisme der arbejder i en skole og vil forstå mere', svar: { 1: 'terapi', 2: 't_boern', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'erfaring', 6: 'lytte' }, forventet: ['adhd'] },
  { id: 9, tekst: 'Specialpædagog der vil have ADHD og autisme som ekstra gren', svar: { 1: 'terapi', 2: 't_boern', 3: 'job', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['adhd', 'familiebehandler'] },
  { id: 10, tekst: 'Højskolelærer der vil hjælpe unge med deres selvværd', svar: { 1: 'terapi', 2: 't_selv', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'erfaring', 6: 'lytte' }, forventet: ['selvvaerd'] },
  { id: 11, tekst: 'Kvinde (40) der vil blive selvstændig stresscoach, starter fra bunden', svar: { 1: 'terapi', 2: 't_udv', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'nystart', 6: 'lytte' }, forventet: ['coach'] },
  { id: 12, tekst: 'Leder (43), ledig efter en stressperiode, vil coache andre', svar: { 1: 'terapi', 2: 't_udv', 3: 'job', 4: 'ledig', 5: 'erfaring', 6: 'lytte' }, forventet: ['coach'] },
  { id: 13, tekst: 'Terapeut med sexolog- og parterapeutuddannelse der vil samle det i egen praksis', svar: { 1: 'terapi', 2: 't_praksis', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'professionel', 6: 'lytte' }, forventet: ['terapiiv'] },
  { id: 14, tekst: 'Uddannet terapeut der vil drive egen klinik og lære forretningsdelen', svar: { 1: 'terapi', 2: 't_praksis', 3: 'selvstaendig', 4: 'familie', 5: 'professionel', 6: 'lytte' }, forventet: ['terapiiv'] },
  { id: 15, tekst: 'Detailleder (9 år) efter stress, vil skifte karriere til HR', svar: { 1: 'business', 2: 'x_ingen', 3: 'job', 4: 'karriereskifte', 5: 'erfaring', 6: 'lede' }, forventet: ['hr'] },
  { id: 16, tekst: 'Salgsmedarbejder der drømmer om at arbejde med rekruttering', svar: { 1: 'business', 2: 'x_ingen', 3: 'job', 4: 'ledig', 5: 'erfaring', 6: 'lede' }, forventet: ['hr'] },
  { id: 17, tekst: 'HR-assistent der vil opkvalificere sig i sit nuværende job', svar: { 1: 'business', 2: 'x_ingen', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lede' }, forventet: ['hr'] },
  { id: 18, tekst: 'Hobbyfotograf (44) der vil blive bedre til kamera og lys', svar: { 1: 'medie', 2: 'm_foto', 3: 'personlig', 4: 'job_og_studie', 5: 'erfaring', 6: 'visuelt' }, forventet: ['fotograf'] },
  { id: 19, tekst: 'Vil leve af fotografering og starte fra bunden', svar: { 1: 'medie', 2: 'm_foto', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'nystart', 6: 'visuelt' }, forventet: ['fotograf'] },
  { id: 20, tekst: 'Vil lave film og videoer til virksomheder', svar: { 1: 'medie', 2: 'm_video', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'nystart', 6: 'visuelt' }, forventet: ['videograf'] },
  { id: 21, tekst: 'Hobbyforfatter med flere manuskripter der gerne vil udgive', svar: { 1: 'medie', 2: 'm_tekst', 3: 'personlig', 4: 'familie', 5: 'erfaring', 6: 'skrive' }, forventet: ['forfatter'] },
  { id: 22, tekst: 'Boligentusiast der vil gøre sin passion til en uddannelse', svar: { 1: 'kreativ', 2: 'k_hjem', 3: 'personlig', 4: 'job_og_studie', 5: 'nystart', 6: 'visuelt' }, forventet: ['indretningskonsulent'] },
  { id: 23, tekst: 'Selvstændig boligstylist der vil supplere med en formel uddannelse', svar: { 1: 'kreativ', 2: 'k_hjem', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'erfaring', 6: 'visuelt' }, forventet: ['indretningskonsulent'] },
  { id: 24, tekst: 'Politibetjent der vil udvide sit CV med indretning og elsker at tegne', svar: { 1: 'kreativ', 2: 'k_proj', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'erfaring', 6: 'visuelt' }, forventet: ['indretningsarkitekt'] },
  { id: 25, tekst: 'Driver et renoveringsfirma sammen med sin mand og vil gå dybere i planløsninger', svar: { 1: 'kreativ', 2: 'k_proj', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'professionel', 6: 'visuelt' }, forventet: ['indretningsarkitekt'] },
  { id: 26, tekst: 'Butiksejer der vil blive bedre til at dekorere vinduer og øge salget', svar: { 1: 'kreativ', 2: 'k_butik', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'erfaring', 6: 'visuelt' }, forventet: ['dekoratoer'] },
  { id: 27, tekst: 'Salgsassistent med mange års erfaring der vil blive dekoratør', svar: { 1: 'kreativ', 2: 'k_butik', 3: 'job', 4: 'job_og_studie', 5: 'professionel', 6: 'visuelt' }, forventet: ['dekoratoer'] },
  { id: 28, tekst: 'Arbejder meget i Excel og vil lære at programmere for at udvide sine løsninger', svar: { 1: 'tech', 2: 'x_ingen', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'erfaring', 6: 'analysere' }, forventet: ['programmor'] },
  { id: 29, tekst: 'Ledig der vil ind i tech og starter fra bunden', svar: { 1: 'tech', 2: 'x_ingen', 3: 'job', 4: 'ledig', 5: 'nystart', 6: 'analysere' }, forventet: ['programmor'] },
  { id: 30, tekst: 'Fitnessentusiast der vil rådgive andre om kost og træning', svar: { 1: 'sundhed', 2: 'x_ingen', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'nystart', 6: 'analysere' }, forventet: ['kostvejleder'] },
  { id: 31, tekst: 'Mor på barsel der vil starte som selvstændig kostvejleder', svar: { 1: 'sundhed', 2: 'x_terapi', 3: 'selvstaendig', 4: 'familie', 5: 'nystart', 6: 'lytte' }, forventet: ['kostvejleder'] },
  { id: 32, tekst: 'Tech først, men også draget af ledelse og HR', svar: { 1: 'tech', 2: 'x_business', 3: 'job', 4: 'ledig', 5: 'nystart', 6: 'analysere' }, forventet: ['programmor', 'hr'] },
  { id: 33, tekst: 'Sundhedsinteresseret der også gerne vil hjælpe mennesker med personlig udvikling', svar: { 1: 'sundhed', 2: 'x_terapi', 3: 'personlig', 4: 'job_og_studie', 5: 'erfaring', 6: 'lytte' }, forventet: ['kostvejleder', 'coach'] },
  // Blandede profiler og "ved ikke endnu"
  { id: 34, tekst: 'Vil bygge og kode, men er også draget af at skabe og designe', svar: { 1: 'tech', 2: 'x_kreativ', 3: 'job', 4: 'job_og_studie', 5: 'nystart', 6: 'visuelt' }, forventet: ['programmor'] },
  { id: 35, tekst: 'Brænder for sundhed og krop, og vil gerne formidle det i tekst og på video', svar: { 1: 'sundhed', 2: 'x_medie', 3: 'selvstaendig', 4: 'job_og_studie', 5: 'erfaring', 6: 'skrive' }, forventet: ['kostvejleder'] },
  { id: 36, tekst: 'Vil arbejde med HR, men har også lyst til at hjælpe mennesker 1:1', svar: { 1: 'business', 2: 'x_terapi', 3: 'job', 4: 'job_og_studie', 5: 'erfaring', 6: 'lytte' }, forventet: ['hr', 'coach'] },
  { id: 37, tekst: 'Vil hjælpe mennesker, men ved ikke hvilken retning og starter fra bunden', svar: { 1: 'terapi', 2: 't_ved', 3: 'personlig', 4: 'karriereskifte', 5: 'nystart', 6: 'lytte' }, forventet: ['coach', 'selvvaerd', 'familiebehandler'] },
  { id: 38, tekst: 'Vil skabe og designe, men ved ikke om det er hjem eller butik', svar: { 1: 'kreativ', 2: 'k_ved', 3: 'personlig', 4: 'job_og_studie', 5: 'nystart', 6: 'visuelt' }, forventet: ['indretningskonsulent', 'dekoratoer'] },
  { id: 39, tekst: 'Vil fortælle og vise, men ved ikke om det er foto eller video', svar: { 1: 'medie', 2: 'm_ved', 3: 'personlig', 4: 'job_og_studie', 5: 'nystart', 6: 'visuelt' }, forventet: ['fotograf', 'videograf'] },
  { id: 40, tekst: 'Afklaret teknologi-interesse, vil planlægge og lede projekter', svar: { 1: 'tech', 2: 'x_ingen', 3: 'opkvalificering', 4: 'job_og_studie', 5: 'professionel', 6: 'lede' }, forventet: ['programmor'] }
];
