// Indsæt i browserens konsol (F12) på uddannelsestest.dk eller en lokal kopi, og tryk Enter.
// Kører ALLE svarkombinationer gennem selve resultatsiden og tjekker for hvert vist kort: titel, beskrivelse, "Det får du", begrundelser,
// link (rigtig uddannelse, UTM, ny fane), at alternativkort kun vises ved match, og at profilen er udfyldt.
// Sender intet til Klaviyo og opretter ingen leads (leadformularen bruges ikke; fetch blokeres under kørslen).
// Tager ca. 15 sekunder. Ret siden bagefter ved at genindlæse den.
(function () {
  history.pushState = function () {};
  Element.prototype.scrollIntoView = function () {};
  window.fetch = function () { throw new Error('Ingen netværkskald under testen'); };

  const stats = { kombinationer: 0, fejl: [], pr_uddannelse: {} };
  const txt = (id) => document.getElementById(id).textContent.trim();
  const prefixes = ['res', 'alt', 'alt2'];

  function check(a) {
    Object.keys(answers).forEach((k) => delete answers[k]);
    Object.assign(answers, a);
    showResult();
    stats.kombinationer++;
    const matches = getMatches(a);
    matches.forEach((m, i) => {
      const p = prefixes[i], e = educations[m.key], fejl = [];
      if (txt(p + '-title') !== e.title) fejl.push('titel');
      if (!txt(p + '-desc')) fejl.push('beskrivelse');
      if (!txt(p + '-gain').includes(PITCH[m.key])) fejl.push('pitch');
      if (document.getElementById(p + '-why').children.length < 1) fejl.push('begrundelser');
      const link = document.getElementById(p + '-link');
      let u = null;
      try { u = new URL(link.href); } catch (x) { fejl.push('link mangler'); }
      if (u) {
        if (u.origin + u.pathname !== e.url) fejl.push('forkert link ' + u.pathname);
        if (u.searchParams.get('utm_source') !== 'uddannelsestest.dk') fejl.push('utm');
        if (link.target !== '_blank') fejl.push('target');
      }
      if (/undefined|null|NaN/.test(document.getElementById(p + '-why').textContent + txt(p + '-gain') + txt(p + '-title'))) fejl.push('"undefined" i teksten');
      const s = (stats.pr_uddannelse[m.key] = stats.pr_uddannelse[m.key] || { vist: 0, fejl: 0 });
      s.vist++;
      if (fejl.length) { s.fejl++; if (stats.fejl.length < 20) stats.fejl.push(m.key + ' plads ' + (i + 1) + ': ' + fejl.join(', ') + ' ' + JSON.stringify(a)); }
    });
    if (document.getElementById('alt-card').hidden !== !matches[1]) stats.fejl.push('alternativkort vises forkert ' + JSON.stringify(a));
    if (document.getElementById('alt2-card').hidden !== !matches[2]) stats.fejl.push('tredje kort vises forkert ' + JSON.stringify(a));
    if (!txt('profile-title') || !txt('profile-lead')) stats.fejl.push('profil mangler ' + JSON.stringify(a));
  }

  const t0 = performance.now();
  Object.keys(WEIGHTS[1]).forEach((f) => BRANCHES[f].forEach((q2) =>
    Object.keys(WEIGHTS[3]).forEach((q3) => Object.keys(WEIGHTS[4]).forEach((q4) =>
      Object.keys(WEIGHTS[5]).forEach((q5) => Object.keys(WEIGHTS[6]).forEach((q6) =>
        check({ 1: f, 2: q2, 3: q3, 4: q4, 5: q5, 6: q6 })))))));
  stats.sekunder = Math.round((performance.now() - t0) / 1000);
  stats.vandret_scroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  console.log(stats.fejl.length ? 'FEJL FUNDET' : 'Ingen fejl', stats);
  return stats;
})();
