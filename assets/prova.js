/* Nuovi Spazi — la PROVA dell'area riservata.
   Nel prototipo gli annunci che uno crea, e i "nascondi"/"venduto" che tocca, restano solo nel suo browser:
   - stato degli annunci veri (nascosto, venduto) -> localStorage
   - annunci di prova con le foto -> IndexedDB (le foto non stanno nei 5 MB del localStorage)
   Sul sito vero la stessa interfaccia parla con un piccolo servizio (Cloudflare) protetto da password. */
(function () {
  'use strict';
  var CHIAVE = 'nuovi-spazi:prova:stato';
  var DB = 'nuovi-spazi-prova', TAB = 'annunci';
  var WA = '393332303830', TEL = 'tel:+393332303830';

  function leggi() { try { return JSON.parse(localStorage.getItem(CHIAVE)) || {}; } catch (e) { return {}; } }
  function scrivi(s) { try { localStorage.setItem(CHIAVE, JSON.stringify(s)); return true; } catch (e) { return false; } }

  var dbp = null;
  function apri() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, ko) {
      if (!window.indexedDB) { ko(new Error('IndexedDB non disponibile')); return; }
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(TAB, { keyPath: 'id' }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ko(r.error); };
    });
    return dbp;
  }
  function fai(modo, fn) {
    return apri().then(function (db) {
      return new Promise(function (ok, ko) {
        var t = db.transaction(TAB, modo), req = fn(t.objectStore(TAB));
        t.oncomplete = function () { ok(req ? req.result : undefined); };
        t.onerror = t.onabort = function () { ko(t.error); };
      });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function euro(n) { return new Intl.NumberFormat('it-IT').format(n) + ' €'; }
  function prezzoTesto(a) {
    if (a.su_richiesta || !a.prezzo) return 'Prezzo su richiesta';
    return euro(a.prezzo) + (a.contratto === 'affitto' ? ' al mese' : '');
  }
  function fatti(a) {
    var f = [];
    if (a.mq) f.push(new Intl.NumberFormat('it-IT').format(a.mq) + ' m²');
    if (a.locali) f.push(a.locali + (Number(a.locali) === 1 ? ' locale' : ' locali'));
    return f.join(' · ');
  }
  // le foto di prova sono Blob: un URL per foto, rifatto a ogni pagina
  var urls = new Map();
  function urlFoto(blob) {
    if (!urls.has(blob)) urls.set(blob, URL.createObjectURL(blob));
    return urls.get(blob);
  }

  var SEGNO = '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="58" cy="64" r="50" fill="#75C5F0"/>' +
              '<circle cx="80" cy="38" r="22" fill="#FFFFFF"/><circle cx="83" cy="35" r="11" fill="#D8170F"/></svg>';

  /* stesso markup di scheda() in build.py */
  function card(a, base) {
    base = base || '';
    var url = base + 'anteprima.html?id=' + encodeURIComponent(a.id);
    var etichette = '<span class="etichette"><span class="etichetta etichetta--scura">Prova</span>' +
      (a.contratto === 'affitto' ? '<span class="etichetta">In affitto</span>' : '') + '</span>';
    var box = a.foto && a.foto.length
      ? '<div class="scheda__foto"><img src="' + urlFoto(a.foto[0].blob) + '" alt="' + esc(a.titolo) + '" loading="lazy">' + etichette + '</div>'
      : '<div class="scheda__foto scheda__foto--vuota"><div>' + SEGNO + '<p>Annuncio senza foto</p></div>' + etichette + '</div>';
    return '<li class="scheda scheda--prova" data-id="' + esc(a.id) + '" data-categoria="' + esc(a.categoria) + '" data-contratto="' + esc(a.contratto) + '">' +
      '<a class="scheda__link" href="' + url + '">' + box +
      '<div class="scheda__riga"><h3 class="scheda__titolo">' + esc(a.titolo) + '</h3><span class="scheda__prezzo">' + esc(prezzoTesto(a)) + '</span></div>' +
      '<div class="scheda__riga scheda__riga--tenue"><span class="zona">' + esc(a.zona) + '</span><span>' + esc(fatti(a)) + '</span></div>' +
      '</a></li>';
  }

  var SCALA = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F', 'G'];
  var ICONA_WA = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42Z"/></svg>';

  /* la pagina dell'annuncio di prova: stesse classi di src/scheda.html */
  function pagina(a) {
    var n = (a.foto || []).length;
    var galleria = n
      ? '<section class="galleria" id="foto" aria-label="Foto (' + n + ')" data-galleria><div class="galleria__binario" tabindex="0" aria-label="Foto: si scorrono col dito o con le frecce">' +
        a.foto.map(function (f, i) {
          return '<figure class="galleria__foto"><button type="button" data-apri="' + i + '" aria-label="Ingrandisci la foto ' + (i + 1) + ' di ' + n + '">' +
            '<img src="' + urlFoto(f.blob) + '" width="' + (f.w || 1600) + '" height="' + (f.h || 1200) + '" alt="' + esc(a.titolo) + ', foto ' + (i + 1) + '"></button></figure>';
        }).join('') +
        '</div><div class="giro"><div class="galleria__comandi" hidden>' +
        '<button type="button" class="tondo" data-prec aria-label="Foto precedente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>' +
        '<span class="galleria__conta" data-conta aria-live="polite">1 / ' + n + '</span>' +
        '<button type="button" class="tondo" data-succ aria-label="Foto successiva"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>' +
        '<button type="button" class="galleria__grande" data-apri="0">Schermo intero</button>' +
        '<button type="button" class="tondo galleria__chiudi" data-chiudi aria-label="Chiudi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>' +
        '</div></div></section>'
      : '';
    var dati = [['Contratto', a.contratto === 'affitto' ? 'Affitto' : 'Vendita'], ['Tipologia', a.tipologia],
      ['Superficie', a.mq ? a.mq + ' m²' : ''], ['Locali', a.locali], ['Bagni', a.bagni],
      ['Classe energetica', a.classe ? (a.classe === 'NC' ? 'Non classificabile' : a.classe === 'in attesa' ? 'In attesa di certificazione' : 'Classe ' + a.classe + (a.ipe ? ' · ' + a.ipe : '')) : '']]
      .filter(function (d) { return d[1]; })
      .map(function (d) { return '<div><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>'; }).join('');
    var descr = String(a.descrizione || '').split(/\n\s*\n/).filter(Boolean).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
    var energia = '';
    if (a.classe && SCALA.indexOf(a.classe) >= 0) {
      energia = '<section id="energia"><h2>Classe energetica</h2><div class="scala" role="img" aria-label="Classe ' + esc(a.classe) + '">' +
        SCALA.map(function (c, i) { return '<span class="c' + (i + 1) + (c === a.classe ? ' questa' : '') + '">' + esc(c) + '</span>'; }).join('') +
        '</div>' + (a.ipe ? '<p class="energia__testo">' + esc(a.ipe) + '</p>' : '') + '</section>';
    }
    var testoWa = 'Buongiorno, mi interessa l’immobile «' + a.titolo + '» che ho visto sul vostro sito.';
    var wa = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(testoWa);
    return '<div class="fascia carta immobile__testa"><div class="giro"><a class="indietro" href="./#immobili">← Tutti gli immobili</a>' +
      '<header class="immobile__capo"><h1>' + esc(a.titolo) + '</h1><p class="zona">' + esc(a.zona) + '</p>' +
      '<p class="immobile__prezzo"><strong>' + esc(prezzoTesto(a)) + '</strong> <span>' + (a.contratto === 'affitto' ? 'in affitto' : 'in vendita') + '</span></p>' +
      (a.venduto ? '<p class="etichette"><span class="etichetta etichetta--venduto">Venduto</span></p>' : '') + '</header></div>' +
      galleria + '</div>' +
      '<div class="giro immobile__corpo"><div>' +
      '<section class="dati"><h2>In breve</h2><dl>' + dati + '</dl></section>' +
      (descr ? '<section class="descrizione"><h2>Descrizione</h2>' + descr + '</section>' : '') + energia +
      '</div><aside class="contatto-immobile"><h2>Ti interessa?</h2><p>Scrivici o chiamaci per una visita o per i documenti: ti risponde direttamente l’agenzia.</p>' +
      '<div class="azioni"><a class="bottone bottone--cielo" href="' + wa + '">' + ICONA_WA + 'Scrivi su WhatsApp</a><a class="bottone bottone--contorno" href="' + TEL + '">Chiama</a></div></aside></div>';
  }

  window.NSProva = {
    stato: leggi,
    imposta: function (id, campo, valore) {
      var s = leggi(); s[id] = s[id] || {}; s[id][campo] = valore;
      if (!s[id].nascosto && !s[id].venduto) delete s[id];
      return scrivi(s);
    },
    azzera: function () { try { localStorage.removeItem(CHIAVE); } catch (e) {} },
    elenca: function () { return fai('readonly', function (t) { return t.getAll(); }).then(function (r) { return (r || []).sort(function (x, y) { return y.creato - x.creato; }); }).catch(function () { return []; }); },
    prendi: function (id) { return fai('readonly', function (t) { return t.get(id); }).catch(function () { return null; }); },
    salva: function (a) { return fai('readwrite', function (t) { t.put(a); }); },
    elimina: function (id) { return fai('readwrite', function (t) { t.delete(id); }); },
    svuota: function () { return fai('readwrite', function (t) { t.clear(); }).catch(function () {}); },
    card: card, pagina: pagina, prezzoTesto: prezzoTesto, fatti: fatti, urlFoto: urlFoto, esc: esc
  };
})();
