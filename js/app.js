(function () {
  "use strict";

  /* ---------- Datos ---------- */
  var BANCO = window.BANCO || [];
  var PREGUNTAS = {}, CASOS = {}, BLOQUES = {}, CALENDARIOS = {};
  BANCO.forEach(function (t) {
    t.preguntas.forEach(function (p) { p.tema = t.id; PREGUNTAS[p.id] = p; });
    t.casos.forEach(function (c) { c.tema = t.id; CASOS[c.id] = c; });
    t.bloques.forEach(function (b) { BLOQUES[b.id] = b.nombre; });
    Object.keys(t.calendarios || {}).forEach(function (k) { CALENDARIOS[k] = t.calendarios[k]; });
  });
  var ORIGENES = [["oficiales", "Oficiales"], ["votaciones", "Votaciones"], ["autoevaluacion", "Autoevaluación"], ["practicas", "Clases prácticas"]];
  var NOMBRE_ORIGEN = {}; ORIGENES.forEach(function (o) { NOMBRE_ORIGEN[o[0]] = o[1]; });
  var LONGITUDES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  var RITMO = 67; /* 1 min 7 s por pregunta */
  var LETRAS = "abcd";
  var K_SESION = "test-c1-sesion", K_VISTAS = "test-c1-vistas", K_AJUSTES = "test-c1-ajustes";

  var ICONOS = {
    atras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5M11 5l-7 7 7 7"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
    bien: '<svg class="marca" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="var(--ok-borde)"/><path d="M8 14.5l4 4 8-9" fill="none" stroke="var(--blanco)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mal: '<svg class="marca" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="var(--mal-borde)"/><path d="M9.5 9.5l9 9M18.5 9.5l-9 9" fill="none" stroke="var(--blanco)" stroke-width="3" stroke-linecap="round"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    casa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 11L12 3.5 20.5 11M6 9v11h12V9M10 20v-6h4v6"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    elegida: '<svg class="marca" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="14" cy="14" r="6" fill="currentColor"/></svg>',
    calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
  };

  /* ---------- Almacenamiento: si el navegador lo bloquea, la app sigue funcionando ---------- */
  function leer(k, porDefecto) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function borrar(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }

  /* ---------- Utilidades ---------- */
  var raiz = document.getElementById("app");
  var dialogo = document.getElementById("dialogo");
  var aviso = document.getElementById("aviso");

  function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function rico(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function barajar(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function coma(n) { return n.toFixed(2).replace(".", ","); }
  function reloj(s) {
    s = Math.max(0, Math.round(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    function d(n) { return (n < 10 ? "0" : "") + n; }
    return (h ? h + ":" + d(m) : d(m)) + ":" + d(x);
  }
  function duracion(n) {
    var s = n * RITMO, m = Math.floor(s / 60), x = s % 60;
    return m + " min" + (x ? " " + x + " s" : "");
  }
  function anunciar(t) { aviso.textContent = ""; setTimeout(function () { aviso.textContent = t; }, 30); }

  /* ---------- Estado ---------- */
  var ajustes = Object.assign({
    modo: "examen", bloques: null, origenes: ORIGENES.map(function (o) { return o[0]; }), n: 10, tiempo: "libre", caso: null
  }, leer(K_AJUSTES, {}));
  /* Temas que solo se practican en Supuestos: no aparecen en Examen ni entran en sus preguntas. */
  var SOLO_SUPUESTOS = { contratos: 1 };
  if (!ajustes.bloques) ajustes.bloques = [];
  /* Si en una sesión anterior se marcó algún bloque de esos temas, se quita. */
  BANCO.forEach(function (t) {
    if (SOLO_SUPUESTOS[t.id]) ajustes.bloques = ajustes.bloques.filter(function (b) { return !t.bloques.some(function (x) { return x.id === b; }); });
  });
  ajustes.caso = null; /* Al abrir la app no hay ningún supuesto elegido. */

  var ses = null;        /* examen en curso o corregido */
  var verFiltro = "todas";
  var casoPlegado = false;
  var scrollCaso = { lista: 0, texto: 0 };
  var temasAbiertos = {};
  var intervalo = null;
  var saliendo = false; // el reloj se para mientras está abierto el aviso de salir
  var observador = null;

  /* Los bloques de un tema que ya tienen preguntas de examen. */
  function bloquesDe(t) {
    var s = {};
    t.preguntas.forEach(function (p) { if (!p.caso) s[p.bloque] = 1; });
    return t.bloques.map(function (b) { return b.id; }).filter(function (b) { return s[b]; });
  }
  function guardarSesion() { if (ses) guardar(K_SESION, ses); }
  function guardarAjustes() { guardar(K_AJUSTES, ajustes); }

  /* ---------- Generar examen ---------- */
  function poolExamen() {
    var ya = {}; /* Si la misma pregunta está en dos tests, solo cuenta una vez. */
    return Object.keys(PREGUNTAS).map(function (id) { return PREGUNTAS[id]; }).filter(function (p) {
      if (p.caso || SOLO_SUPUESTOS[p.tema] || ajustes.bloques.indexOf(p.bloque) < 0 || ajustes.origenes.indexOf(p.origen) < 0) return false;
      var k = p.dup || p.id;
      if (ya[k]) return false;
      ya[k] = 1;
      return true;
    });
  }
  /* Reparto proporcional al número de preguntas de cada tema, y dentro de cada tema primero las no vistas. */
  function generar(pool, n) {
    var vistas = {}; leer(K_VISTAS, []).forEach(function (id) { vistas[id] = 1; });
    var libres = pool.filter(function (p) { return !p.sigueA; });
    var porBloque = {};
    libres.forEach(function (p) { (porBloque[p.bloque] = porBloque[p.bloque] || []).push(p); });
    var claves = Object.keys(porBloque), total = libres.length;
    var cuotas = claves.map(function (b) {
      var exacta = n * porBloque[b].length / total;
      return { b: b, n: Math.min(Math.floor(exacta), porBloque[b].length), resto: exacta - Math.floor(exacta) };
    });
    var faltan = n - cuotas.reduce(function (a, c) { return a + c.n; }, 0);
    cuotas.sort(function (x, y) { return y.resto - x.resto; });
    for (var vuelta = 0; faltan > 0 && vuelta < 4; vuelta++) {
      cuotas.forEach(function (c) { if (faltan > 0 && c.n < porBloque[c.b].length) { c.n++; faltan--; } });
    }
    var elegidas = [];
    cuotas.forEach(function (c) {
      var g = barajar(porBloque[c.b].slice());
      g.sort(function (x, y) { return (vistas[x.id] ? 1 : 0) - (vistas[y.id] ? 1 : 0); });
      elegidas = elegidas.concat(g.slice(0, c.n));
    });
    barajar(elegidas);
    /* Las que dependen de "la pregunta anterior" siempre salen justo detrás de ella. */
    pool.filter(function (p) { return p.sigueA; }).forEach(function (p) {
      var i = elegidas.findIndex(function (x) { return x.id === p.sigueA; });
      if (i < 0 || elegidas.length < 2) return;
      /* Entra quitando la última que no tenga pareja, para no dejar una pregunta suelta. */
      var quita = -1;
      for (var k = elegidas.length - 1; k >= 0 && quita < 0; k--) {
        var x = elegidas[k], siguiente = elegidas[k + 1];
        if (k !== i && !x.sigueA && !(siguiente && siguiente.sigueA === x.id)) quita = k;
      }
      if (quita < 0) return;
      elegidas.splice(i + 1, 0, p);
      elegidas.splice(quita > i ? quita + 1 : quita, 1);
    });
    return elegidas.map(function (p) { return p.id; });
  }

  function empezar(modo, ids, casoId, tiempo) {
    ses = {
      modo: modo, ids: ids, caso: casoId || null, pos: 0, resp: {}, fin: false,
      tiempo: tiempo, total: tiempo === "ritmo" ? ids.length * RITMO : 0, seg: 0, parado: false, agotado: false
    };
    var vistas = leer(K_VISTAS, []);
    ids.forEach(function (id) { if (vistas.indexOf(id) < 0) vistas.push(id); });
    guardar(K_VISTAS, vistas);
    casoPlegado = false; verFiltro = "todas"; scrollCaso = { lista: 0, texto: 0 };
    guardarSesion(); arrancarReloj(); pintar();
  }

  /* ---------- Reloj ---------- */
  function arrancarReloj() {
    clearInterval(intervalo);
    intervalo = setInterval(function () {
      if (!ses || ses.fin || ses.parado || saliendo || document.hidden) return;
      ses.seg++;
      var el = document.getElementById("reloj-t");
      if (ses.tiempo === "ritmo") {
        var r = ses.total - ses.seg;
        if (el) { el.textContent = reloj(r); el.classList.toggle("largo", el.textContent.length > 5); }
        var caja = document.getElementById("reloj");
        if (caja) caja.classList.toggle("poco", r <= 60);
        if (r <= 0) { ses.agotado = true; terminar(); return; }
      } else if (el) { el.textContent = reloj(ses.seg); el.classList.toggle("largo", el.textContent.length > 5); }
      if (ses.seg % 10 === 0) guardarSesion();
    }, 1000);
  }
  function textoReloj() { return ses.tiempo === "ritmo" ? reloj(ses.total - ses.seg) : reloj(ses.seg); }
  function htmlReloj() {
    var poco = ses.tiempo === "ritmo" && ses.total - ses.seg <= 60;
    var etiqueta = ses.tiempo === "ritmo" ? "Tiempo restante" : "Tiempo transcurrido";
    return '<div class="controles"><span id="reloj" class="reloj' + (poco ? " poco" : "") + '" role="timer" aria-label="' + etiqueta + '">' + ICONOS.reloj + '<span id="reloj-t"' + (textoReloj().length > 5 ? ' class="largo"' : "") + ">" + textoReloj() + "</span></span>" +
      '<button class="btn-pausa" data-a="pausar" aria-label="Pausar">' + ICONOS.pausa + "</button></div>";
  }

  /* ---------- Fin de examen ---------- */
  function terminar() {
    ses.fin = true; clearInterval(intervalo); verFiltro = "todas";
    guardarSesion(); pintar(); window.scrollTo(0, 0);
  }
  function salirAlInicio() { ses = null; borrar(K_SESION); clearInterval(intervalo); pintar(); window.scrollTo(0, 0); }

  function calcular(ids) {
    var c = { a: 0, f: 0, b: 0, resta: 0 };
    ids.forEach(function (id) {
      var r = ses.resp[id];
      if (r === undefined || r === null) c.b++;
      else if (r === PREGUNTAS[id].correcta) c.a++;
      else { c.f++; c.resta += 1 / (PREGUNTAS[id].opciones.length - 1); }
    });
    /* Cada fallo resta lo que valdría acertar al azar: un tercio con 4 respuestas, medio con 3, uno entero con 2. */
    c.neta = c.a - c.resta;
    return c;
  }

  /* ---------- Pintado ---------- */
  function pintar() {
    if (!ses) return pintarInicio();
    if (ses.fin) return ses.modo === "supuesto" ? pintarResultadosCaso() : pintarResultados();
    if (ses.parado) return pintarPausa();
    return ses.modo === "supuesto" ? pintarCaso() : pintarExamen();
  }

  /* ---------- Inicio ---------- */
  function pintarInicio() {
    var guardada = leer(K_SESION, null);
    var enCurso = guardada && !guardada.fin && guardada.ids.every(function (id) { return PREGUNTAS[id]; });
    var h = '<div class="fondo"></div><main class="pagina sobre-violeta">';
    h += '<h1 class="pagina-titulo">Test de oposición C1 AGE</h1>';
    if (enCurso) {
      h += '<div class="resumir"><button class="btn btn-principal" data-a="retomar">Retomar examen (' + guardada.ids.length + ' preguntas)</button></div>';
    }
    h += '<div class="pestanas" role="tablist" aria-label="Tipo de prueba">';
    h += '<button class="pestana" role="tab" aria-selected="' + (ajustes.modo === "examen") + '" data-a="modo" data-v="examen">Examen</button>';
    h += '<button class="pestana" role="tab" aria-selected="' + (ajustes.modo === "supuesto") + '" data-a="modo" data-v="supuesto">Supuestos</button>';
    h += "</div>";
    h += ajustes.modo === "examen" ? formExamen() : formSupuesto();
    h += "</main>";
    raiz.innerHTML = h;
    raiz.querySelectorAll("[data-parcial]").forEach(function (c) { c.indeterminate = true; });
  }

  function formExamen() {
    var todas = Object.keys(PREGUNTAS).map(function (id) { return PREGUNTAS[id]; }).filter(function (p) { return !p.caso && !SOLO_SUPUESTOS[p.tema]; });
    var pool = poolExamen();
    var maxN = pool.length;
    if (ajustes.n > maxN) {
      var valido = LONGITUDES.filter(function (l) { return l <= maxN; }).pop();
      if (valido) ajustes.n = valido;
    }
    var h = '<div class="panel"><fieldset><legend>Temas</legend>';
    BANCO.forEach(function (t) {
      if (SOLO_SUPUESTOS[t.id]) return;
      var propios = bloquesDe(t);
      var marcados = propios.filter(function (b) { return ajustes.bloques.indexOf(b) >= 0; }).length;
      var abierto = temasAbiertos[t.id];
      var total = todas.filter(function (p) { return p.tema === t.id && ajustes.origenes.indexOf(p.origen) >= 0; }).length;
      h += '<div class="tema"><div class="tema-cab"><input type="checkbox" data-a="tema" value="' + t.id + '" aria-label="Marcar todo: ' + esc(t.nombre) + '"' + (marcados && marcados === propios.length ? " checked" : "") + (marcados && marcados < propios.length ? " data-parcial" : "") + ">";
      h += '<button type="button" class="tema-abrir" data-a="tema-abrir" data-v="' + t.id + '" aria-expanded="' + !!abierto + '" aria-controls="t-' + t.id + '"><span>' + esc(t.nombre) + "<small>" + marcados + " de " + propios.length + " marcados · " + total + " preguntas</small></span>" + ICONOS.flecha + "</button></div>";
      h += '<div class="tema-dentro" id="t-' + t.id + '"' + (abierto ? "" : " hidden") + ">";
      t.bloques.forEach(function (b) {
        if (propios.indexOf(b.id) < 0) return;
        var cuantas = todas.filter(function (p) { return p.bloque === b.id && ajustes.origenes.indexOf(p.origen) >= 0; }).length;
        h += '<label class="check' + (ajustes.bloques.indexOf(b.id) >= 0 ? " marcado" : "") + '"><input type="checkbox" data-a="bloque" value="' + b.id + '"' + (ajustes.bloques.indexOf(b.id) >= 0 ? " checked" : "") + "><span>" + esc(b.nombre) + "</span><b>" + cuantas + "</b></label>";
      });
      h += "</div></div>";
    });
    h += "</fieldset></div>";
    h += '<div class="panel"><fieldset><legend>Procedencia</legend><p class="nota">Se aplica a todos los temas que elijas.</p>';
    ORIGENES.forEach(function (o) {
      var cuantas = todas.filter(function (p) { return p.origen === o[0] && (!ajustes.bloques.length || ajustes.bloques.indexOf(p.bloque) >= 0); }).length;
      h += '<label class="check' + (ajustes.origenes.indexOf(o[0]) >= 0 ? " marcado" : "") + '"><input type="checkbox" data-a="origen" value="' + o[0] + '"' + (ajustes.origenes.indexOf(o[0]) >= 0 ? " checked" : "") + "><span>" + o[1] + "</span><b>" + cuantas + "</b></label>";
    });
    h += "</fieldset></div>";
    h += '<div class="panel"><fieldset><legend>Número de preguntas</legend><div class="rejilla">';
    LONGITUDES.forEach(function (l) {
      var off = l > maxN;
      h += '<label class="chip' + (ajustes.n === l && !off ? " marcado" : "") + '"><input type="radio" name="n" data-a="n" value="' + l + '"' + (ajustes.n === l && !off ? " checked" : "") + (off ? " disabled" : "") + "><span>" + l + "</span></label>";
    });
    h += '</div><p class="nota">Hay ' + maxN + " preguntas con estos filtros. Si marcas varios temas, se reparten en proporción a las preguntas de cada uno.</p></fieldset></div>";
    h += panelTiempo(ajustes.n);
    var puede = maxN >= 10 && ajustes.n <= maxN;
    h += '<div class="acciones"><button class="btn btn-principal" data-a="empezar-examen"' + (puede ? "" : " disabled") + ">Empezar examen</button>";
    if (!puede) h += '<p class="pagina-sub">' + (ajustes.bloques.length ? "Con estos filtros no llegas a 10 preguntas. Marca más temas o procedencias." : "Abre un tema y marca lo que quieres incluir.") + "</p>";
    var vistas = leer(K_VISTAS, []).length;
    if (vistas) h += '<button class="btn btn-linea" data-a="olvidar">Olvidar las preguntas ya vistas (' + vistas + ")</button>";
    h += "</div>";
    return h;
  }

  function panelTiempo(n) {
    var h = '<div class="panel"><fieldset><legend>Tiempo</legend>';
    h += '<label class="check' + (ajustes.tiempo === "libre" ? " marcado" : "") + '"><input type="radio" name="tiempo" data-a="tiempo" value="libre"' + (ajustes.tiempo === "libre" ? " checked" : "") + "><span>Cronómetro libre, sin límite</span><b></b></label>";
    h += '<label class="check' + (ajustes.tiempo === "ritmo" ? " marcado" : "") + '"><input type="radio" name="tiempo" data-a="tiempo" value="ritmo"' + (ajustes.tiempo === "ritmo" ? " checked" : "") + "><span>Ritmo de examen: 1 min 7 s por pregunta</span><b>" + (n ? duracion(n) : "") + "</b></label>";
    return h + "</fieldset></div>";
  }

  function formSupuesto() {
    var lista = Object.keys(CASOS).map(function (k) { return CASOS[k]; });
    if (ajustes.caso && !CASOS[ajustes.caso]) ajustes.caso = null;
    var n = ajustes.caso ? idsCaso(ajustes.caso).length : 0;
    /* Igual que en Examen: un desplegable por tema y, dentro, sus supuestos. */
    var h = '<div class="panel"><fieldset><legend>Temas</legend><p class="nota">Abre un tema y elige un ejercicio de clase o un supuesto. Respondes a todas y corriges al final. Si hay enunciado, lo tienes siempre a la vista.</p>';
    BANCO.forEach(function (t) {
      var suyos = lista.filter(function (c) { return c.tema === t.id; });
      if (!suyos.length) return;
      var ejercicios = suyos.filter(esEjercicio).sort(function (x, y) { return numero(x) - numero(y); });
      var otros = suyos.filter(function (c) { return !esEjercicio(c); });
      var clave = "s-" + t.id;
      var elegido = suyos.filter(function (c) { return c.id === ajustes.caso; })[0];
      var abierto = !!temasAbiertos[clave]; /* Cerrado hasta que lo abras. */
      var preguntas = suyos.reduce(function (a, c) { return a + idsCaso(c.id).length; }, 0);
      h += '<div class="tema"><div class="tema-cab sin-check">';
      h += '<button type="button" class="tema-abrir" data-a="tema-abrir" data-v="' + clave + '" aria-expanded="' + abierto + '" aria-controls="t-' + clave + '"><span>' + esc(t.nombre) + "<small>" + ejercicios.length + " ejercicios · " + otros.length + " supuestos · " + preguntas + " preguntas" + (elegido ? " · elegido: " + esc(titulo(elegido)) : "") + "</small></span>" + ICONOS.flecha + "</button></div>";
      h += '<div class="tema-dentro" id="t-' + clave + '"' + (abierto ? "" : " hidden") + ">";
      [["Ejercicios de clase", ejercicios], ["Supuestos prácticos", otros]].forEach(function (g) {
        if (!g[1].length) return;
        h += '<p class="grupo-titulo">' + g[0] + "</p>";
        g[1].forEach(function (c) {
          h += '<label class="check' + (ajustes.caso === c.id ? " marcado" : "") + '"><input type="radio" name="caso" data-a="caso" value="' + c.id + '"' + (ajustes.caso === c.id ? " checked" : "") + "><span>" + esc(titulo(c)) + "</span><b>" + idsCaso(c.id).length + "</b></label>";
        });
      });
      h += "</div></div>";
    });
    h += "</fieldset></div>";
    h += panelTiempo(n);
    h += '<div class="acciones"><button class="btn btn-principal" data-a="empezar-caso"' + (ajustes.caso ? "" : " disabled") + ">Empezar supuesto</button></div>";
    return h;
  }
  function titulo(c) {
    return c.titulo.replace(/^(Ejercicio(?: nº)? \d+)\s*\.?-\s*/, "$1 · ").replace(/([a-záéíóúñ])\.$/, "$1"); /* "Motivación." pierde el punto; "AA.PP." no. */
  }
  function esEjercicio(c) { return /^Ejercicio/.test(c.titulo); }
  function numero(c) { return parseInt((c.titulo.match(/\d+/) || [0])[0], 10); }
  function idsCaso(cid) {
    return Object.keys(PREGUNTAS).filter(function (id) { return PREGUNTAS[id].caso === cid; })
      .sort(function (a, b) { return PREGUNTAS[a].n - PREGUNTAS[b].n; });
  }

  /* ---------- Examen pregunta a pregunta ---------- */
  function pintarExamen() {
    var id = ses.ids[ses.pos], p = PREGUNTAS[id], r = ses.resp[id], respondida = r !== undefined;
    var ultima = ses.pos === ses.ids.length - 1;
    var pct = Math.round((ses.pos + 1) / ses.ids.length * 100);
    var numero = (ses.pos + 1 < 10 ? "0" : "") + (ses.pos + 1);
    var h = '<div class="fondo"></div><div class="fija examen">';
    h += '<header class="cabecera"><div class="controles"><button class="btn-cuadrado" data-a="atras" aria-label="Pregunta anterior"' + (ses.pos ? "" : " disabled") + ">" + ICONOS.atras + '</button><button class="btn-cuadrado" data-a="salir" aria-label="Volver a inicio">' + ICONOS.casa + "</button></div>";
    h += '<div class="cuenta" aria-label="Pregunta ' + (ses.pos + 1) + " de " + ses.ids.length + '">' + numero + " de " + ses.ids.length + "</div>" + htmlReloj() + "</header>";
    h += '<div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Avance del examen"><i style="width:' + pct + '%"></i></div>';
    h += '<div class="pila"><div class="tarjeta"><div class="tarjeta-cuerpo" data-scroll>';
    h += '<div class="col-preg" data-scroll><div class="etiqueta"><span>' + esc(BLOQUES[p.bloque]) + "</span></div>";
    h += '<h1 class="enunciado" id="enunciado" tabindex="-1">' + esc(p.enunciado) + "</h1>";
    if (p.calendario) h += '<button class="btn-apoyo" data-a="calendario" data-v="' + p.calendario + '">' + ICONOS.calendario + "Ver calendario</button>";
    h += '</div><div class="col-opc" data-scroll>' + htmlOpciones(p, r, respondida);
    h += '</div></div></div><div class="pista-scroll" id="pista" hidden aria-hidden="true">Desliza para ver más</div></div>';
    h += '<div class="pie"><button class="btn btn-secundario" data-a="blanco"' + (respondida ? " disabled" : "") + ">Dejar en blanco</button>";
    h += '<button class="btn btn-principal" data-a="siguiente"' + (respondida ? "" : " disabled") + ">" + (ultima ? "Ver resultados" : "Siguiente") + "</button></div>";
    h += "</div>";
    raiz.innerHTML = h;
    prepararPista();
    var e = document.getElementById("enunciado"); if (e) e.focus({ preventScroll: true });
  }

  function htmlOpciones(p, r, respondida) {
    var h = '<div class="opciones" role="group" aria-label="Opciones de respuesta">';
    p.opciones.forEach(function (o, i) {
      var cl = "opcion", icono = "", sr = "";
      if (respondida && r !== null) {
        if (i === p.correcta) { cl += " bien"; icono = ICONOS.bien; sr = '<span class="solo-lector">. Respuesta correcta</span>'; }
        else if (i === r) { cl += " mal"; icono = ICONOS.mal; sr = '<span class="solo-lector">. Tu respuesta, incorrecta</span>'; }
      }
      h += '<button class="' + cl + '" data-a="responder" data-v="' + i + '"' + (respondida ? " disabled" : "") + '><span class="letra">' + LETRAS[i] + ")</span><span>" + esc(o) + sr + "</span>" + icono + "</button>";
    });
    return h + "</div>";
  }

  /* Solo las preguntas que no caben hacen scroll, y avisan de que hay más abajo. */
  function prepararPista() {
    var pista = document.getElementById("pista"); if (!pista) return;
    var zonas = [].slice.call(raiz.querySelectorAll("[data-scroll]"));
    function mira() {
      pista.hidden = !zonas.some(function (z) {
        var estilo = getComputedStyle(z).overflowY;
        return (estilo === "auto" || estilo === "scroll") && z.scrollHeight - z.clientHeight - z.scrollTop > 6;
      });
    }
    function revisa() {
      zonas.forEach(function (z) {
        var estilo = getComputedStyle(z).overflowY;
        if ((estilo === "auto" || estilo === "scroll") && z.scrollHeight > z.clientHeight + 6) z.tabIndex = 0;
        else z.removeAttribute("tabindex");
      });
      mira();
    }
    zonas.forEach(function (z) { z.addEventListener("scroll", mira, { passive: true }); });
    if (observador) observador.disconnect();
    if (window.ResizeObserver) {
      observador = new ResizeObserver(revisa);
      zonas.forEach(function (z) {
        observador.observe(z);
        [].forEach.call(z.children, function (c) { observador.observe(c); });
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(revisa);
    revisa();
  }

  function responder(i) {
    var id = ses.ids[ses.pos], p = PREGUNTAS[id];
    if (ses.resp[id] !== undefined) return;
    ses.resp[id] = i; guardarSesion();
    /* Se actualiza en su sitio: repintar toda la pantalla hacía saltar el scroll arriba y se notaba lento. */
    var cont = raiz.querySelector(".opciones"), cuerpo = raiz.querySelector(".tarjeta-cuerpo");
    if (cont && cuerpo) {
      var y = cuerpo.scrollTop;
      cont.outerHTML = htmlOpciones(p, i, true);
      cuerpo.scrollTop = y;
      var bl = raiz.querySelector('[data-a="blanco"]'); if (bl) bl.disabled = true;
      var sg = raiz.querySelector('[data-a="siguiente"]'); if (sg) sg.disabled = false;
    } else pintar();
    anunciar(i === p.correcta ? "Correcta." : "Incorrecta. La correcta es la " + LETRAS[p.correcta] + ".");
    var b = raiz.querySelector('[data-a="siguiente"]'); if (b) b.focus({ preventScroll: true });
  }
  function siguiente() {
    if (ses.pos >= ses.ids.length - 1) return terminar();
    ses.pos++; guardarSesion(); pintar();
  }

  /* ---------- Pausa ---------- */
  function pintarPausa() {
    var que = ses.modo === "supuesto" ? "el supuesto, tapado" : "la pregunta, tapada";
    raiz.innerHTML = '<div class="fondo"></div><div class="fija"><div class="pausa"><h1 class="pagina-titulo">En pausa</h1><p>El reloj está parado y ' + que + '.</p><p class="cuenta">' + textoReloj() +
      '</p><button class="btn btn-principal" data-a="pausar" id="reanudar">Reanudar</button><button class="btn btn-secundario" data-a="guardar-salir">Guardar y salir</button></div></div>';
    document.getElementById("reanudar").focus();
  }

  /* ---------- Supuesto: enunciado arriba, preguntas abajo ---------- */
  function recordarScroll() {
    var lista = raiz.querySelector(".lista-preg"), texto = raiz.querySelector(".caso-texto");
    if (lista) scrollCaso.lista = lista.scrollTop;
    if (texto) scrollCaso.texto = texto.scrollTop;
  }
  function pintarCaso() {
    var c = CASOS[ses.caso];
    var hechas = ses.ids.filter(function (id) { return ses.resp[id] !== undefined && ses.resp[id] !== null; }).length;
    var pct = Math.round(hechas / ses.ids.length * 100);
    recordarScroll();
    var h = '<div class="fondo"></div><div class="fija' + (c.corto ? " estrecha" : "") + '">';
    h += '<header class="cabecera"><button class="btn-cuadrado" data-a="salir" aria-label="Volver a inicio">' + ICONOS.casa + "</button>";
    h += '<div class="cuenta" aria-label="' + hechas + " de " + ses.ids.length + ' respondidas">' + hechas + " de " + ses.ids.length + "</div>" + htmlReloj() + "</header>";
    h += '<div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Preguntas respondidas"><i style="width:' + pct + '%"></i></div>';
    h += abrirReparto(c);
    h += '<section class="lista-preg" aria-label="Preguntas" tabindex="0">' + consigna(c);
    ses.ids.forEach(function (id, n) {
      var p = PREGUNTAS[id], r = ses.resp[id];
      h += '<article class="preg"><h3><span>' + (n + 1) + ".</span> " + esc(p.enunciado) + "</h3>";
      if (p.calendario) h += '<button class="btn-apoyo" data-a="calendario" data-v="' + p.calendario + '">' + ICONOS.calendario + "Ver calendario</button>";
      h += '<div class="opciones" role="group" aria-label="Opciones de la pregunta ' + (n + 1) + '">';
      p.opciones.forEach(function (o, i) {
        h += '<button class="opcion' + (r === i ? " elegida" : "") + '" aria-pressed="' + (r === i) + '" data-a="marcar" data-id="' + id + '" data-v="' + i + '"><span class="letra">' + LETRAS[i] + ")</span><span>" + esc(o) + "</span>" + (r === i ? ICONOS.elegida : "") + "</button>";
      });
      h += "</div></article>";
    });
    h += "</section></div>";
    h += '<div class="pie pie-uno"><button class="btn btn-principal" data-a="corregir">Corregir</button></div></div>';
    raiz.innerHTML = h;
    var nueva = raiz.querySelector(".lista-preg"), texto = raiz.querySelector(".caso-texto");
    if (nueva) nueva.scrollTop = scrollCaso.lista;
    if (texto) texto.scrollTop = scrollCaso.texto;
  }
  function abrirReparto(c) {
    if (c.corto) return '<div class="reparto solo">';
    return '<div class="reparto' + (casoPlegado ? " plegado" : "") + '">' + panelCaso(c);
  }
  function consigna(c) {
    if (!c.corto) return "";
    return '<div class="consigna"><h2>' + esc(titulo(c)) + "</h2>" + (c.texto ? "<p>" + esc(c.texto) + "</p>" : "") + "</div>";
  }
  function panelCaso(c) {
    var h = '<section class="caso" aria-label="Enunciado del supuesto"><div class="caso-cab"><span>' + esc(titulo(c)) + "</span>";
    h += '<button class="enlace plegar" data-a="plegar" aria-expanded="' + !casoPlegado + '">' + (casoPlegado ? "Mostrar" : "Plegar") + "</button></div>";
    if (!casoPlegado) h += '<div class="caso-texto" tabindex="0">' + c.texto.split("\n").map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + "</div>";
    return h + "</section>";
  }

  /* ---------- Resultados ---------- */
  function textoResta(ids) {
    var k = {}; ids.forEach(function (id) { k[PREGUNTAS[id].opciones.length] = 1; });
    var ns = Object.keys(k);
    if (ns.length === 1 && ns[0] === "4") return "Cada fallo resta un tercio de acierto y las preguntas en blanco no restan, como en el examen.";
    if (ns.length === 1 && ns[0] === "3") return "Hay tres respuestas, así que cada fallo resta medio acierto. Las preguntas en blanco no restan.";
    if (ns.length === 1 && ns[0] === "2") return "Hay dos respuestas, así que cada fallo resta un acierto entero. Las preguntas en blanco no restan.";
    return "Cada fallo resta según las respuestas que tenga la pregunta: un tercio de acierto con cuatro, medio con tres y uno entero con dos. Las preguntas en blanco no restan.";
  }
  function htmlMarcador(ids) {
    var c = calcular(ids), n = ids.length;
    var h = '<div class="marcador"><div class="dato ok"><b>' + c.a + '</b>Aciertos</div><div class="dato ko"><b>' + c.f + '</b>Fallos</div><div class="dato nu"><b>' + c.b + "</b>En blanco</div></div>";
    h += '<p class="neta">Puntuación: <b>' + coma(Math.max(c.neta, 0) / n * 10) + '</b> sobre 10</p><p class="nota">' + textoResta(ids) + (ses.seg ? " Tiempo: " + reloj(ses.seg) + "." : "") + "</p>";
    if (ses.agotado) h += '<p class="nota">Se acabó el tiempo. Las preguntas sin responder cuentan como en blanco.</p>';
    return h;
  }
  function htmlFiltros(ids) {
    var c = calcular(ids);
    var op = [["todas", "Todas", ids.length], ["falladas", "Falladas", c.f], ["blanco", "En blanco", c.b]];
    return '<div class="filtros" role="group" aria-label="Filtrar resultados">' + op.map(function (o) {
      return '<button class="filtro" data-a="filtro" data-v="' + o[0] + '" aria-pressed="' + (verFiltro === o[0]) + '">' + o[1] + " (" + o[2] + ")</button>";
    }).join("") + "</div>";
  }
  function estado(id) {
    var r = ses.resp[id];
    if (r === undefined || r === null) return "blanco";
    return r === PREGUNTAS[id].correcta ? "acierto" : "fallo";
  }
  function htmlResultado(id, n) {
    var p = PREGUNTAS[id], r = ses.resp[id], e = estado(id);
    var rotulo = { acierto: ["estado-ok", "Acertada"], fallo: ["estado-ko", "Fallada"], blanco: ["estado-nu", "En blanco"] }[e];
    var h = '<article class="resultado" data-estado="' + e + '"><div class="resultado-cab"><span>Pregunta ' + (n + 1) + " · " + esc(NOMBRE_ORIGEN[p.origen] || "") + '</span><span class="' + rotulo[0] + '">' + rotulo[1] + "</span></div>";
    h += '<p class="resultado-q">' + esc(p.enunciado) + "</p>";
    if (p.calendario) h += '<button class="btn-apoyo" data-a="calendario" data-v="' + p.calendario + '">' + ICONOS.calendario + "Ver calendario</button>";
    p.opciones.forEach(function (o, i) {
      var cl = "", nota = "", icono = "";
      if (i === p.correcta) { cl = " bien"; icono = ICONOS.bien; nota = e === "acierto" ? "Tu respuesta, correcta" : "Respuesta correcta"; }
      else if (i === r) { cl = " mal"; icono = ICONOS.mal; nota = "Tu respuesta"; }
      h += '<div class="linea' + cl + '"><b>' + LETRAS[i] + ")</b><span>" + (nota ? "<small>" + nota + "</small>" : "") + esc(o) + "</span>" + icono + "</div>";
    });
    h += '<button class="acordeon" data-a="acordeon" aria-expanded="false" aria-controls="j-' + id + '"><span>Ver justificación</span>' + ICONOS.flecha + "</button>";
    h += '<div class="justificacion" id="j-' + id + '" hidden><p class="precepto">' + esc(p.precepto) + "</p>";
    p.opciones.forEach(function (o, i) {
      h += '<div class="razon' + (i === p.correcta ? " es" : "") + '"><b class="l">' + LETRAS[i] + ")</b><span>" + rico(p.justificaciones[i]) + "</span></div>";
    });
    if (p.ojo) h += '<p class="ojo"><b>Ojo:</b> ' + rico(p.ojo) + "</p>";
    if (p.revisar) h += '<p class="revisar"><b>Por confirmar:</b> ' + rico(p.revisar) + " Comprueba esta respuesta con tu academia.</p>";
    return h + "</div></article>";
  }
  /* Una barra por tema entero y, debajo, su desglose con lo peor primero. */
  function datosEst(ids) {
    var c = calcular(ids), n = ids.length;
    return { n: n, bl: c.b, pa: Math.round(c.a / n * 100), pf: Math.round(c.f / n * 100) };
  }
  function filaEst(nombre, d, total) {
    var pb = 100 - d.pa - d.pf;
    var h = '<div class="est-fila' + (total ? " est-total" : "") + '"><div class="est-nombre">' + esc(nombre) + "<span>" + d.n + (d.n === 1 ? " pregunta" : " preguntas") + "</span></div>";
    h += '<div class="barra" role="img" aria-label="' + d.pa + " por ciento de aciertos, " + d.pf + " por ciento de fallos, " + pb + ' por ciento en blanco"><i class="a" style="width:' + d.pa + '%"></i><i class="f" style="width:' + d.pf + '%"></i><i class="b" style="width:' + pb + '%"></i></div>';
    return h + '<div class="est-datos"><span class="a">' + d.pa + ' % aciertos</span><span class="f">' + d.pf + " % fallos</span>" + (d.bl ? '<span class="b">' + pb + " % en blanco</span>" : "") + "</div></div>";
  }
  function htmlEstadistica(ids) {
    var h = '<section class="panel"><h2>Cómo vas por temas</h2><p class="nota">Dentro de cada tema, de peor a mejor.</p><div class="estadistica">';
    BANCO.forEach(function (t) {
      var delTema = ids.filter(function (id) { return PREGUNTAS[id].tema === t.id; });
      if (!delTema.length) return;
      var grupos = {};
      delTema.forEach(function (id) { var b = PREGUNTAS[id].bloque; (grupos[b] = grupos[b] || []).push(id); });
      var filas = Object.keys(grupos).map(function (b) { return { b: b, d: datosEst(grupos[b]) }; })
        .sort(function (x, y) { return (x.d.pa - y.d.pa) || (y.d.pf - x.d.pf); });
      h += '<div class="est-tema">' + filaEst(t.nombre, datosEst(delTema), true) + '<div class="est-desglose">';
      filas.forEach(function (f) { h += filaEst(BLOQUES[f.b], f.d, false); });
      h += "</div></div>";
    });
    return h + "</div></section>";
  }
  function pintarResultados() {
    var h = '<div class="fondo"></div><main class="pagina sobre-violeta"><h1 class="pagina-titulo">Resultados</h1>';
    h += '<section class="panel">' + htmlMarcador(ses.ids) + "</section>";
    h += '<section class="panel"><h2>Tus respuestas</h2>' + htmlFiltros(ses.ids) + '<div class="lista-res">';
    ses.ids.forEach(function (id, n) { h += htmlResultado(id, n); });
    h += "</div></section>" + htmlEstadistica(ses.ids);
    h += '<div class="acciones"><button class="btn btn-principal" data-a="nuevo">Nuevo examen</button></div></main>';
    raiz.innerHTML = h;
    aplicarFiltro();
  }
  function pintarResultadosCaso() {
    var c = CASOS[ses.caso];
    var h = '<div class="fondo"></div><div class="fija' + (c.corto ? " estrecha" : "") + '"><header class="cabecera"><button class="btn-cuadrado" data-a="nuevo" aria-label="Volver al inicio">' + ICONOS.atras + '</button><h1 class="cuenta">Resultados</h1><span></span></header>';
    h += abrirReparto(c);
    h += '<section class="lista-preg" aria-label="Resultados" tabindex="0">' + consigna(c) + '<div class="panel" style="padding:0">' + htmlMarcador(ses.ids) + htmlFiltros(ses.ids) + '</div><div class="lista-res">';
    ses.ids.forEach(function (id, n) { h += htmlResultado(id, n); });
    h += "</div>" + htmlEstadistica(ses.ids).replace('class="panel"', 'class="panel" style="padding:0"') + "</section></div>";
    h += '<div class="pie pie-uno"><button class="btn btn-principal" data-a="nuevo">Volver al inicio</button></div></div>';
    raiz.innerHTML = h;
    aplicarFiltro();
  }
  function aplicarFiltro() {
    var quiero = { todas: null, falladas: "fallo", blanco: "blanco" }[verFiltro];
    raiz.querySelectorAll(".resultado").forEach(function (a) { a.hidden = quiero && a.dataset.estado !== quiero; });
    raiz.querySelectorAll(".filtro").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === verFiltro); });
  }

  /* ---------- Calendario, dibujado con los datos ---------- */
  function htmlCalendario(k) {
    var cal = CALENDARIOS[k]; if (!cal) return "";
    var h = "<h2>" + esc(cal.titulo) + '</h2><p class="nota">En rojo y subrayado, domingos y festivos. Los sábados también son inhábiles (art. 30.2 de la Ley 39/2015).</p><div class="meses">';
    cal.meses.forEach(function (m) {
      var primero = new Date(Date.UTC(cal.year, m - 1, 1));
      var dias = new Date(Date.UTC(cal.year, m, 0)).getUTCDate();
      var nombre = primero.toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
      var hueco = (primero.getUTCDay() + 6) % 7;
      h += '<table class="mes"><caption>' + nombre + " " + cal.year + "</caption><thead><tr>";
      ["L", "M", "X", "J", "V", "S", "D"].forEach(function (d) { h += '<th scope="col">' + d + "</th>"; });
      h += "</tr></thead><tbody><tr>";
      for (var i = 0; i < hueco; i++) h += "<td></td>";
      for (var d = 1; d <= dias; d++) {
        var col = (hueco + d - 1) % 7;
        var fecha = cal.year + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
        var festivo = cal.festivos.indexOf(fecha) >= 0, domingo = col === 6;
        h += '<td class="' + (festivo || domingo ? "rojo" : "") + (festivo ? " festivo" : "") + '"' + (festivo ? ' aria-label="' + d + ', festivo"' : "") + ">" + d + "</td>";
        if (col === 6 && d < dias) h += "</tr><tr>";
      }
      h += "</tr></tbody></table>";
    });
    return h + '</div><div class="dialogo-acciones"><button class="btn btn-claro" data-a="cerrar">Cerrar</button></div>';
  }
  function abrirDialogo(html) {
    dialogo.innerHTML = html;
    if (dialogo.showModal) dialogo.showModal(); else dialogo.setAttribute("open", "");
    var titulo = dialogo.querySelector("h2");
    if (titulo) { titulo.tabIndex = -1; titulo.focus({ preventScroll: true }); }
    dialogo.scrollTop = 0;
  }
  function cerrarDialogo() { saliendo = false; if (dialogo.close) dialogo.close(); else dialogo.removeAttribute("open"); }

  function dialogoSalir() {
    saliendo = true;
    abrirDialogo('<h2>¿Quieres salir?</h2><p class="nota">El reloj está parado mientras decides. Tu examen queda guardado en este dispositivo y puedes retomarlo luego.</p><div class="dialogo-acciones">' +
      '<button class="btn btn-claro" data-a="cerrar">Seguir con el examen</button>' +
      '<button class="btn btn-claro" data-a="guardar-salir">Guardar y salir</button>' +
      '<button class="btn btn-claro" data-a="terminar-ya">Terminar y corregir</button>' +
      '<button class="enlace" data-a="descartar">Descartar este examen</button></div>');
  }

  /* ---------- Eventos ---------- */
  function clic(e) {
    var b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
    var a = b.dataset.a, v = b.dataset.v;
    switch (a) {
      case "modo": ajustes.modo = v; guardarAjustes(); pintar(); break;
      case "tema-abrir": temasAbiertos[v] = b.getAttribute("aria-expanded") !== "true"; repintarInicio('[data-a="tema-abrir"][data-v="' + v + '"]'); break;
      case "olvidar": borrar(K_VISTAS); pintar(); anunciar("Preguntas vistas olvidadas."); break;
      case "empezar-examen":
        guardarAjustes();
        empezar("examen", generar(poolExamen(), ajustes.n), null, ajustes.tiempo);
        break;
      case "empezar-caso": guardarAjustes(); empezar("supuesto", idsCaso(ajustes.caso), ajustes.caso, ajustes.tiempo); break;
      case "retomar": ses = leer(K_SESION, null); arrancarReloj(); pintar(); break;
      case "responder": responder(+v); break;
      case "blanco": ses.resp[ses.ids[ses.pos]] = null; guardarSesion(); siguiente(); break;
      case "siguiente": siguiente(); break;
      case "atras": if (ses.pos > 0) { ses.pos--; guardarSesion(); pintar(); } break;
      case "salir": dialogoSalir(); break;
      case "pausar":
        if (!ses.parado) recordarScroll();
        ses.parado = !ses.parado; guardarSesion(); pintar();
        anunciar(ses.parado ? "En pausa." : "Reanudado.");
        break;
      case "marcar":
        var id = b.dataset.id, i = +v;
        if (ses.resp[id] === i) delete ses.resp[id]; else ses.resp[id] = i;
        guardarSesion(); pintar();
        break;
      case "plegar": casoPlegado = !casoPlegado; pintar(); break;
      case "corregir":
        var faltan = ses.ids.length - ses.ids.filter(function (x) { return ses.resp[x] !== undefined && ses.resp[x] !== null; }).length;
        if (faltan) {
          abrirDialogo("<h2>Te quedan " + faltan + (faltan === 1 ? " pregunta" : " preguntas") + ' sin responder</h2><p class="nota">Contarán como en blanco.</p><div class="dialogo-acciones"><button class="btn btn-claro" data-a="cerrar">Seguir respondiendo</button><button class="btn btn-claro" data-a="terminar-ya">Corregir igualmente</button></div>');
        } else terminar();
        break;
      case "calendario": abrirDialogo(htmlCalendario(v)); break;
      case "cerrar": cerrarDialogo(); break;
      case "guardar-salir": guardarSesion(); cerrarDialogo(); ses = null; clearInterval(intervalo); pintar(); window.scrollTo(0, 0); break;
      case "terminar-ya": cerrarDialogo(); terminar(); break;
      case "descartar": cerrarDialogo(); salirAlInicio(); break;
      case "nuevo": salirAlInicio(); break;
      case "filtro": verFiltro = v; aplicarFiltro(); break;
      case "acordeon": alternar(b); break;
    }
  }
  /* Solo un acordeón abierto a la vez. El botón pulsado no se mueve de su sitio en la pantalla,
     aunque se cierre otro que estaba abierto más arriba. */
  function alternar(b) {
    var abrir = b.getAttribute("aria-expanded") !== "true";
    var antes = b.getBoundingClientRect().top;
    raiz.querySelectorAll('.acordeon[aria-expanded="true"]').forEach(function (o) {
      o.setAttribute("aria-expanded", "false"); o.querySelector("span").textContent = "Ver justificación";
      document.getElementById(o.getAttribute("aria-controls")).hidden = true;
    });
    if (abrir) {
      b.setAttribute("aria-expanded", "true"); b.querySelector("span").textContent = "Ocultar justificación";
      document.getElementById(b.getAttribute("aria-controls")).hidden = false;
    }
    var dif = b.getBoundingClientRect().top - antes;
    if (!dif) return;
    var zona = b.closest(".lista-preg");
    if (zona) zona.scrollTop += dif;
    else window.scrollTo({ top: window.scrollY + dif, behavior: "instant" });
  }
  function repintarInicio(selector) {
    var y = window.scrollY; pintar(); window.scrollTo(0, y);
    var igual = raiz.querySelector(selector); if (igual) igual.focus({ preventScroll: true });
  }
  function cambio(e) {
    var c = e.target; var a = c.dataset && c.dataset.a; if (!a) return;
    function lista(arr, val, on) { var s = arr.filter(function (x) { return x !== val; }); if (on) s.push(val); return s; }
    if (a === "tema") {
      BANCO.forEach(function (t) {
        if (t.id !== c.value) return;
        bloquesDe(t).forEach(function (b) { ajustes.bloques = lista(ajustes.bloques, b, c.checked); });
      });
    }
    else if (a === "bloque") ajustes.bloques = lista(ajustes.bloques, c.value, c.checked);
    else if (a === "origen") ajustes.origenes = lista(ajustes.origenes, c.value, c.checked);
    else if (a === "n") ajustes.n = +c.value;
    else if (a === "tiempo") ajustes.tiempo = c.value;
    else if (a === "caso") ajustes.caso = c.value;
    else return;
    guardarAjustes();
    /* Primero se marca en el momento (sin depender de :has) y los contadores se repintan después del toque. */
    var cj = c.closest(".check, .chip");
    if (c.type === "radio") raiz.querySelectorAll('input[name="' + c.name + '"]').forEach(function (r) { var q = r.closest(".check, .chip"); if (q) q.classList.toggle("marcado", r.checked); });
    else if (cj) cj.classList.toggle("marcado", c.checked);
    var sel = 'input[data-a="' + a + '"][value="' + c.value + '"]';
    setTimeout(function () { repintarInicio(sel); }, 0);
  }
  function teclas(e) {
    if (!ses || ses.fin || ses.parado || ses.modo !== "examen" || dialogo.open) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase(), i = LETRAS.indexOf(k);
    var p = PREGUNTAS[ses.ids[ses.pos]];
    if (i >= 0 && k.length === 1 && i < p.opciones.length && ses.resp[p.id] === undefined) { e.preventDefault(); responder(i); }
  }

  raiz.addEventListener("click", clic);
  dialogo.addEventListener("click", clic);
  dialogo.addEventListener("close", function () { saliendo = false; });
  raiz.addEventListener("change", cambio);
  document.addEventListener("keydown", teclas);
  window.addEventListener("pagehide", guardarSesion);
  pintar();
})();
