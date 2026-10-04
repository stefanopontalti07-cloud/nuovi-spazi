/* Nuovi Spazi — vetrina (filtri, annunci di prova), galleria foto, condividi, mappa a due click.
   La pagina funziona anche senza JavaScript: qui si aggiungono comodità, non si sblocca il contenuto. */
(function () {
  'use strict';
  var fermo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var prova = window.NSProva;
  var stato = prova ? prova.stato() : {};

  /* ---------- vetrina ---------- */
  var griglia = document.querySelector('[data-griglia]');
  if (griglia) {
    var filtri = [].slice.call(document.querySelectorAll('.filtro'));
    var scelta = 'tutti';

    var visibile = function (li, f) {
      if (li.dataset.nascosto === '1') return false;
      return f === 'tutti' || li.dataset.categoria === f || (f === 'affitto' && li.dataset.contratto === 'affitto');
    };
    var conta = function () {
      var schede = [].slice.call(griglia.querySelectorAll('.scheda'));
      filtri.forEach(function (b) {
        var n = schede.filter(function (li) { return visibile(li, b.dataset.filtro); }).length;
        var s = b.querySelector('span'); if (s) s.textContent = n;
        b.hidden = n === 0 && b.dataset.filtro !== 'tutti';
      });
      var c = document.querySelector('[data-conta]');
      if (c) c.textContent = schede.filter(function (li) { return visibile(li, 'tutti'); }).length;
    };
    var mostra = function (f) {
      scelta = f;
      var i = 0;
      griglia.classList.remove('entra');
      [].forEach.call(griglia.querySelectorAll('.scheda'), function (li) {
        var si = visibile(li, f);
        li.hidden = !si;
        if (si) li.style.setProperty('--i', i++);
      });
      void griglia.offsetWidth;            // riparte l'animazione d'entrata
      if (!fermo) griglia.classList.add('entra');
      filtri.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filtro === f)); });
    };
    filtri.forEach(function (b) { b.addEventListener('click', function () { mostra(b.dataset.filtro); }); });

    // la prova dell'area riservata: annunci nascosti o venduti, e annunci nuovi
    [].forEach.call(griglia.querySelectorAll('.scheda'), function (li) {
      var s = stato[li.dataset.id];
      if (!s) return;
      if (s.nascosto) { li.dataset.nascosto = '1'; li.hidden = true; }
      if (s.venduto) segnaVenduto(li);
    });
    conta();
    if (prova) {
      prova.elenca().then(function (nuovi) {
        if (!nuovi.length) return;
        var html = nuovi.map(function (a) { return prova.card(a, ''); }).join('');
        griglia.insertAdjacentHTML('afterbegin', html);
        nuovi.forEach(function (a) {
          var li = griglia.querySelector('.scheda[data-id="' + a.id + '"]');
          if (li && a.nascosto) { li.dataset.nascosto = '1'; li.hidden = true; }
          if (li && a.venduto) segnaVenduto(li);
        });
        conta(); mostra(scelta);
      });
    }
  }

  function segnaVenduto(li) {
    li.classList.add('scheda--venduto');
    var foto = li.querySelector('.scheda__foto');
    if (!foto) return;
    var et = foto.querySelector('.etichette');
    if (!et) { et = document.createElement('span'); et.className = 'etichette'; foto.appendChild(et); }
    et.insertAdjacentHTML('afterbegin', '<span class="etichetta etichetta--venduto">' + (li.dataset.contratto === 'affitto' ? 'Affittato' : 'Venduto') + '</span>');
  }

  /* ---------- pagina dell'immobile: "venduto" dalla prova ---------- */
  var immobile = document.querySelector('[data-immobile]');
  if (immobile && stato[immobile.dataset.immobile] && stato[immobile.dataset.immobile].venduto) {
    var capo = immobile.querySelector('.immobile__capo');
    if (capo) capo.insertAdjacentHTML('beforeend', '<p class="etichette"><span class="etichetta etichetta--venduto">Venduto (prova)</span></p>');
  }

  /* ---------- galleria ---------- */
  function attivaGalleria(g) {
    if (!g || g.dataset.attiva) return;
    g.dataset.attiva = '1';
    var binario = g.querySelector('.galleria__binario');
    var foto = [].slice.call(g.querySelectorAll('.galleria__foto'));
    var comandi = g.querySelector('.galleria__comandi');
    var conta = g.querySelector('[data-conta]');
    var chiudi = g.querySelector('[data-chiudi]');
    if (!binario || !foto.length) return;
    if (comandi) comandi.hidden = false;
    var ora = 0, tornaA = null;
    // le foto a destra, fuori schermo, il browser non le carica finche' non ci si arriva:
    // a pagina caricata le chiediamo una alla volta, nei momenti liberi, cosi' scorrendo sono gia' pronte
    var pigre = [].slice.call(binario.querySelectorAll('img[loading="lazy"]'));
    var prossima = function () {
      var img = pigre.shift();
      if (!img) return;
      img.loading = 'eager';
      (window.requestIdleCallback || function (f) { return setTimeout(f, 200); })(prossima);
    };
    if (document.readyState === 'complete') prossima(); else window.addEventListener('load', prossima);

    var aggiorna = function (i) { ora = i; if (conta) conta.textContent = (i + 1) + ' / ' + foto.length; };
    // la foto "attuale" e' la prima da sinistra di cui si vede almeno meta' (sul computer se ne vedono due);
    // in fondo al binario, quando non si scorre piu', e' l'ultima
    var bersaglio = null, sblocca = null;   // durante uno scorrimento chiesto dai bottoni il contatore non si ricalcola
    var calcola = function () {
      if (bersaglio !== null) return;
      var x = binario.scrollLeft + (parseFloat(getComputedStyle(binario).paddingLeft) || 0);
      if (binario.scrollLeft >= binario.scrollWidth - binario.clientWidth - 2) { aggiorna(foto.length - 1); return; }
      for (var i = 0; i < foto.length; i++) {
        if (foto[i].offsetLeft + foto[i].offsetWidth / 2 > x) { aggiorna(i); return; }
      }
    };
    var inAttesa = false;
    binario.addEventListener('scroll', function () {
      if (inAttesa) return;
      inAttesa = true;
      requestAnimationFrame(function () { inAttesa = false; calcola(); });
    }, { passive: true });
    var vai = function (i, subito) {
      i = Math.max(0, Math.min(foto.length - 1, i));
      var pad = parseFloat(getComputedStyle(binario).paddingLeft) || 0;
      bersaglio = i;
      clearTimeout(sblocca);
      sblocca = setTimeout(function () { bersaglio = null; }, subito || fermo ? 60 : 700);
      binario.scrollTo({ left: foto[i].offsetLeft - pad, behavior: subito || fermo ? 'auto' : 'smooth' });
      aggiorna(i);
    };
    var prec = g.querySelector('[data-prec]'), succ = g.querySelector('[data-succ]');
    if (prec) prec.addEventListener('click', function () { vai(ora - 1); });
    if (succ) succ.addEventListener('click', function () { vai(ora + 1); });

    var apri = function (i, da) {
      tornaA = da || null;
      g.classList.add('galleria--piena');
      document.body.classList.add('blocca');
      g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true');
      requestAnimationFrame(function () { vai(i, true); if (chiudi) chiudi.focus({ preventScroll: true }); });
    };
    var esci = function () {
      if (!g.classList.contains('galleria--piena')) return;
      var i = ora;
      g.classList.remove('galleria--piena');
      document.body.classList.remove('blocca');
      g.removeAttribute('role'); g.removeAttribute('aria-modal');
      // preventScroll: se no il browser riporta la galleria sulla foto da cui si era aperto
      requestAnimationFrame(function () { vai(i, true); if (tornaA) tornaA.focus({ preventScroll: true }); });
    };
    [].forEach.call(g.querySelectorAll('[data-apri]'), function (b) {
      b.addEventListener('click', function () {
        if (g.classList.contains('galleria--piena')) return;
        apri(b.closest('.galleria__foto') ? foto.indexOf(b.closest('.galleria__foto')) : ora, b);
      });
    });
    if (chiudi) chiudi.addEventListener('click', esci);
    document.addEventListener('keydown', function (ev) {
      var piena = g.classList.contains('galleria--piena');
      if (ev.key === 'Escape' && piena) esci();
      if ((piena || document.activeElement === binario) && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
        ev.preventDefault(); vai(ora + (ev.key === 'ArrowRight' ? 1 : -1));
      }
    });
  }
  [].forEach.call(document.querySelectorAll('[data-galleria]'), attivaGalleria);

  /* ---------- condividi ---------- */
  [].forEach.call(document.querySelectorAll('[data-condividi]'), function (b) {
    var testo = b.textContent;
    b.addEventListener('click', function () {
      var dati = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(dati).catch(function () {}); return; }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          b.textContent = 'Link copiato';
          setTimeout(function () { b.textContent = testo; }, 2200);
        });
      }
    });
  });

  /* ---------- mappa a due click (automazioni/prodotti/privacy-sito) ---------- */
  [].forEach.call(document.querySelectorAll('.due-click'), function (box) {
    var b = box.querySelector('.due-click__bottone');
    if (!b) return;
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.dataset.src;
      f.title = box.dataset.titolo || 'Mappa';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      box.appendChild(f);
      box.querySelector('.due-click__dentro').hidden = true;
      f.focus();
    });
  });

  /* ---------- menu del telefono: si chiude scegliendo una voce ---------- */
  [].forEach.call(document.querySelectorAll('.menu-tel'), function (d) {
    d.addEventListener('click', function (ev) { if (ev.target.closest('a')) d.open = false; });
    document.addEventListener('click', function (ev) { if (d.open && !d.contains(ev.target)) d.open = false; });
  });

  window.NSSito = { attivaGalleria: attivaGalleria };
})();
