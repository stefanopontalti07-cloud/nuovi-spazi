/* Nuovi Spazi — area riservata (PROVA) e anteprima dell'annuncio di prova.
   Tutto resta nel browser (assets/prova.js). Sul sito vero: stessa interfaccia, ma dietro una password
   e con un piccolo servizio che salva annunci e foto per tutti. */
(function () {
  'use strict';
  var P = window.NSProva;
  if (!P) return;
  var esc = P.esc;
  var LATO_MAX = 1600, QUALITA = 0.82;

  /* ---------------- anteprima.html ---------------- */
  var dove = document.querySelector('[data-scheda-prova]');
  if (dove) {
    var id = new URLSearchParams(location.search).get('id');
    (id ? P.prendi(id) : Promise.resolve(null)).then(function (a) {
      if (!a) {
        dove.innerHTML = '<div class="giro"><h1 style="margin-top:28px;font-size:1.8rem">Annuncio di prova non trovato</h1>' +
          '<p class="gestione__intro">Non c’è più, o è stato creato su un altro dispositivo. <a href="area-riservata.html">Creane uno nell’area riservata</a>.</p></div>';
        return;
      }
      document.title = a.titolo + ' (prova) | Nuovi Spazi';
      dove.innerHTML = P.pagina(a);
      if (window.NSSito) window.NSSito.attivaGalleria(dove.querySelector('[data-galleria]'));
    });
    return;
  }

  /* ---------------- area-riservata.html ---------------- */
  var elenco = document.querySelector('[data-elenco]');
  var modulo = document.querySelector('[data-modulo]');
  if (!elenco || !modulo) return;
  var anteprime = modulo.querySelector('[data-anteprime]');
  var campoFile = modulo.querySelector('[data-file]');
  var errore = modulo.querySelector('[data-errore]');
  var annulla = modulo.querySelector('[data-annulla]');
  var titoloModulo = document.querySelector('[data-titolo-modulo]');
  var invia = modulo.querySelector('[data-invia]');
  var foto = [];          // [{blob, w, h}] dell'annuncio che si sta scrivendo
  var inModifica = null;  // id dell'annuncio di prova in modifica

  function interruttore(id, campo, attivo, etichetta, rosso) {
    return '<button type="button" class="interruttore' + (rosso ? ' interruttore--rosso' : '') + '" data-id="' + esc(id) + '" data-campo="' + campo + '" aria-pressed="' + attivo + '">' + etichetta + '</button>';
  }

  function disegna() {
    var stato = P.stato();
    P.elenca().then(function (prove) {
      var righe = prove.map(function (a) {
        var img = a.foto && a.foto.length ? '<img src="' + P.urlFoto(a.foto[0].blob) + '" alt="' + esc(a.titolo) + '">' : '<span class="vuota"></span>';
        return '<li>' + img + '<div><p class="elenco__titolo">' + esc(a.titolo) + ' <span class="etichetta etichetta--scura">Prova</span></p>' +
          '<p class="elenco__sotto">' + esc(P.prezzoTesto(a)) + ' · ' + esc(a.zona) + '</p></div>' +
          '<div class="elenco__comandi">' +
          interruttore(a.id, 'nascosto', !a.nascosto, 'In vetrina') +
          interruttore(a.id, 'venduto', !!a.venduto, a.contratto === 'affitto' ? 'Affittato' : 'Venduto', true) +
          '<a class="interruttore" href="anteprima.html?id=' + encodeURIComponent(a.id) + '">Apri</a>' +
          '<button type="button" class="interruttore" data-modifica="' + esc(a.id) + '">Modifica</button>' +
          '<button type="button" class="interruttore" data-elimina="' + esc(a.id) + '">Elimina</button></div></li>';
      });
      (window.NS_ANNUNCI || []).forEach(function (a) {
        var s = stato[a.id] || {};
        var img = a.copertina ? '<img src="' + esc(a.copertina) + '" alt="' + esc(a.titolo) + '" loading="lazy">' : '<span class="vuota"></span>';
        righe.push('<li>' + img + '<div><p class="elenco__titolo">' + esc(a.titolo) + '</p>' +
          '<p class="elenco__sotto">' + esc(a.prezzo) + ' · ' + esc(a.zona) + '</p></div>' +
          '<div class="elenco__comandi">' +
          interruttore(a.id, 'nascosto', !s.nascosto, 'In vetrina') +
          interruttore(a.id, 'venduto', !!s.venduto, a.contratto === 'affitto' ? 'Affittato' : 'Venduto', true) +
          '<a class="interruttore" href="' + esc(a.url) + '">Apri</a></div></li>');
      });
      elenco.innerHTML = righe.join('');
    });
  }

  elenco.addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.campo) {
      var attivo = b.getAttribute('aria-pressed') === 'true';
      var id = b.dataset.id;
      // "In vetrina" acceso = non nascosto
      var valore = b.dataset.campo === 'nascosto' ? attivo : !attivo;
      b.setAttribute('aria-pressed', String(!attivo));
      if (id.indexOf('prova-') === 0) {
        P.prendi(id).then(function (a) { if (!a) return; a[b.dataset.campo] = valore; return P.salva(a); });
      } else {
        P.imposta(id, b.dataset.campo, valore);
      }
    } else if (b.dataset.elimina) {
      if (confirm('Eliminare questo annuncio di prova?')) P.elimina(b.dataset.elimina).then(disegna);
    } else if (b.dataset.modifica) {
      P.prendi(b.dataset.modifica).then(carica);
    }
  });

  /* --- foto: rimpicciolite sul telefono prima di essere salvate --- */
  function rimpicciolisci(file) {
    var disegnaSu = function (sorgente, w, h) {
      var k = Math.min(1, LATO_MAX / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(sorgente, 0, 0, c.width, c.height);
      return new Promise(function (ok) {
        c.toBlob(function (blob) { ok({ blob: blob, w: c.width, h: c.height }); }, 'image/jpeg', QUALITA);
      });
    };
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        return disegnaSu(bmp, bmp.width, bmp.height);
      });
    }
    return new Promise(function (ok, ko) {
      var img = new Image();
      img.onload = function () { ok(disegnaSu(img, img.naturalWidth, img.naturalHeight)); };
      img.onerror = ko;
      img.src = URL.createObjectURL(file);
    });
  }

  function mostraFoto() {
    anteprime.innerHTML = foto.map(function (f, i) {
      return '<figure class="' + (i === 0 ? 'copertina' : '') + '"><img src="' + P.urlFoto(f.blob) + '" alt="Foto ' + (i + 1) + '">' +
        '<div class="comandi-foto">' + (i === 0 ? '<button type="button" disabled>Copertina</button>' : '<button type="button" data-copertina="' + i + '">Copertina</button>') +
        '<button type="button" data-togli="' + i + '" aria-label="Togli la foto ' + (i + 1) + '">Togli</button></div></figure>';
    }).join('');
  }
  anteprime.addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.copertina) { var f = foto.splice(Number(b.dataset.copertina), 1)[0]; foto.unshift(f); }
    if (b.dataset.togli) foto.splice(Number(b.dataset.togli), 1);
    mostraFoto();
  });
  campoFile.addEventListener('change', function () {
    var file = [].slice.call(campoFile.files || []).slice(0, 20);
    if (!file.length) return;
    invia.disabled = true;
    invia.textContent = 'Preparo le foto…';
    file.reduce(function (catena, f) {
      return catena.then(function () { return rimpicciolisci(f).then(function (r) { foto.push(r); mostraFoto(); }).catch(function () {}); });
    }, Promise.resolve()).then(function () {
      invia.disabled = false;
      invia.textContent = inModifica ? 'Salva le modifiche' : 'Pubblica in vetrina';
      campoFile.value = '';
    });
  });

  /* --- modulo --- */
  function carica(a) {
    if (!a) return;
    inModifica = a.id;
    var f = modulo.elements;
    f.contratto.value = a.contratto;
    f.tipologia.value = a.categoria + '|' + a.tipologia;
    f.titolo.value = a.titolo; f.zona.value = a.zona;
    f.prezzo.value = a.prezzo || ''; f.su_richiesta.checked = !!a.su_richiesta;
    f.mq.value = a.mq || ''; f.locali.value = a.locali || ''; f.bagni.value = a.bagni || '';
    f.classe.value = a.classe || ''; f.ipe.value = a.ipe || ''; f.descrizione.value = a.descrizione || '';
    foto = (a.foto || []).slice();
    mostraFoto();
    titoloModulo.textContent = 'Modifica annuncio';
    invia.textContent = 'Salva le modifiche';
    annulla.hidden = false;
    document.getElementById('nuovo').scrollIntoView({ behavior: 'smooth' });
  }
  function pulisci() {
    modulo.reset(); foto = []; mostraFoto(); inModifica = null;
    titoloModulo.textContent = 'Nuovo annuncio';
    invia.textContent = 'Pubblica in vetrina';
    annulla.hidden = true; errore.hidden = true;
  }
  annulla.addEventListener('click', pulisci);

  modulo.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = modulo.elements;
    var manca = [];
    if (!f.titolo.value.trim()) manca.push('il titolo');
    if (!f.zona.value.trim()) manca.push('la zona');
    if (!f.prezzo.value && !f.su_richiesta.checked) manca.push('il prezzo (o la spunta «su richiesta»)');
    if (!foto.length) manca.push('almeno una foto');
    if (manca.length) {
      errore.textContent = 'Manca ' + manca.join(', ') + '.';
      errore.hidden = false;
      return;
    }
    errore.hidden = true;
    var tip = f.tipologia.value.split('|');
    var id = inModifica || ('prova-' + Date.now());
    var dati = {
      id: id, creato: Date.now(), contratto: f.contratto.value, categoria: tip[0], tipologia: tip[1],
      titolo: f.titolo.value.trim(), zona: f.zona.value.trim(),
      prezzo: f.prezzo.value ? Number(f.prezzo.value) : null, su_richiesta: f.su_richiesta.checked,
      mq: f.mq.value || null, locali: f.locali.value || null, bagni: f.bagni.value || null,
      classe: f.classe.value, ipe: f.ipe.value.trim(), descrizione: f.descrizione.value.trim(), foto: foto
    };
    var fatto = function () { location.href = 'anteprima.html?id=' + encodeURIComponent(id); };
    (inModifica ? P.prendi(id) : Promise.resolve(null)).then(function (vecchio) {
      if (vecchio) { dati.creato = vecchio.creato; dati.nascosto = vecchio.nascosto; dati.venduto = vecchio.venduto; }
      return P.salva(dati);
    }).then(fatto).catch(function () {
      errore.textContent = 'Questo browser non riesce a salvare la prova (succede nelle finestre anonime). Riprova da una finestra normale.';
      errore.hidden = false;
    });
  });

  var pulisciTutto = document.querySelector('[data-pulisci]');
  if (pulisciTutto) pulisciTutto.addEventListener('click', function () {
    P.azzera();
    P.svuota().then(function () {
      pulisci(); disegna();
      var esito = document.querySelector('[data-esito]');
      if (esito) esito.textContent = 'Fatto: la vetrina è tornata com’era.';
    });
  });

  disegna();
})();
