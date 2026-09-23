// ==========================================================
// NUVORA — app.js (página principal, index.html)
// Requiere que catalog-data.js esté cargado antes que este archivo.
// ==========================================================

// ===== Hero slider =====
// Sin controles de navegación visibles (ni dots ni contador): el hero
// avanza solo y comunica que es dinámico con la propia transición entre
// fotos. Pausa en hover/foco para no competir con la lectura, y respeta
// prefers-reduced-motion quedándose fijo en el primer slide.
const heroSlides = document.querySelectorAll('.hero-slide');
const HERO_INTERVAL = 6000;
let heroIndex = 0;
let heroTimer;

function showHeroSlide(i) {
  if (i === heroIndex) return;

  // Si algún slide quedó con la clase .prev de una transición anterior
  // (no la del slide activo actual), lo reseteamos SIN animación.
  // Si no hacemos esto, al sacarle la clase .prev más adelante el navegador
  // anima su transform de vuelta y ese slide "viejo" cruza toda la pantalla,
  // superponiéndose con el que está entrando en ese momento.
  heroSlides.forEach((s, n) => {
    if (n !== heroIndex && s.classList.contains('prev')) {
      s.classList.add('no-anim');
      s.classList.remove('prev');
      void s.offsetWidth; // fuerza el reflow para que el cambio se aplique sin transición
      s.classList.remove('no-anim');
    }
  });

  heroSlides.forEach((s, n) => {
    s.classList.toggle('prev', n === heroIndex);
    const esActivo = n === i;
    s.classList.toggle('active', esActivo);

    // Los slides que no se ven quedan afuera del árbol de accesibilidad:
    // sin esto, un lector de pantalla (o el tabulado) llegaba a los otros
    // tres títulos y botones aunque estuvieran clip-path'eados a nada.
    s.setAttribute('aria-hidden', esActivo ? 'false' : 'true');
    const cta = s.querySelector('.hero-cta');
    if (cta) cta.tabIndex = esActivo ? 0 : -1;
  });

  heroIndex = i;

  // Si el botón metálico (React + WebGL, ver js/metallic-button.js) está
  // activo, le avisamos qué slide quedó visible para que sólo ese shader
  // anime y los otros tres se pausen — si ese script no cargó (sin red,
  // CDN bloqueado), este guard hace que esta línea no haga nada.
  if (window.NuvoraMetallicButtons && typeof window.NuvoraMetallicButtons.setActiveSlide === 'function') {
    window.NuvoraMetallicButtons.setActiveSlide(i);
  }
}

function nextHeroSlide() {
  showHeroSlide((heroIndex + 1) % heroSlides.length);
}
/* Si el sistema pide movimiento reducido, el hero no avanza solo: queda
   en el primer slide y sólo cambia si la persona lo pide. */
const heroQuieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startHeroAutoplay() {
  if (heroQuieto) return;
  heroTimer = setInterval(nextHeroSlide, HERO_INTERVAL);
}
function stopHeroAutoplay() {
  clearInterval(heroTimer);
}

const heroSliderEl = document.querySelector('.hero-slider');
if (heroSliderEl) {
  heroSliderEl.addEventListener('mouseenter', stopHeroAutoplay);
  heroSliderEl.addEventListener('mouseleave', startHeroAutoplay);
}
startHeroAutoplay();

/* El primer slide trae su foto por CSS inline (se precarga en el <head>,
   es la imagen más pesada del primer pintado). Los otros tres se
   guardan como data-bg para no competir por ancho de banda con ella:
   recién se piden después del evento load, con tiempo de sobra antes
   de que el autoplay (cada 6 s) llegue a mostrarlos. Sin JS estos
   slides nunca se muestran (sólo showHeroSlide los activa), así que
   no perderse su foto no cambia nada para quien navega sin JS. */
window.addEventListener('load', () => {
  heroSlides.forEach((s, n) => {
    if (n === 0) return;
    const bg = s.dataset.bg;
    if (bg) s.style.backgroundImage = `url('${bg}')`;
  });
});

// El primer slide ya viene con .active puesto en el HTML (para que se vea
// algo apenas carga la página), así que el navegador nunca "ve" el cambio
// de estado y el texto no anima su entrada. Lo forzamos: lo ocultamos un
// instante y lo volvemos a mostrar ya con la transición enganchada.
const firstHeroSlide = heroSlides[0];
if (firstHeroSlide) {
  firstHeroSlide.classList.add('no-anim');
  firstHeroSlide.classList.remove('active');
  void firstHeroSlide.offsetWidth;
  firstHeroSlide.classList.remove('no-anim');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => firstHeroSlide.classList.add('active'));
  });
}

// ===== Menú mobile (hamburguesa) =====
const heroBurger = document.getElementById('heroBurger');
const mobileNav = document.getElementById('mobileNav');

if (heroBurger && mobileNav) {
  // El ícono son dos líneas dibujadas por CSS que se cruzan al abrir:
  // antes era el emoji ☰, que se ve distinto en cada sistema.
  const closeMobileNav = () => {
    mobileNav.classList.remove('open');
    heroBurger.classList.remove('is-open');
    heroBurger.setAttribute('aria-label', 'Abrir menú');
    heroBurger.setAttribute('aria-expanded', 'false');
  };

  heroBurger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    heroBurger.classList.toggle('is-open', isOpen);
    heroBurger.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    heroBurger.setAttribute('aria-expanded', String(isOpen));
  });

  mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobileNav));
}

/* ---------- Nav sobre secciones claras ----------
   La cápsula translúcida es legible sobre el hero oscuro, pero no
   sobre las secciones crema. Cuando el hero sale de vista, el nav
   pasa a su estado sólido (.scrolled). Con IntersectionObserver en
   vez de un listener de scroll: no corre en cada píxel y no hay
   cálculo de posiciones. Sólo cambia color, nunca el layout. */
function initNavScroll() {
  const nav = document.querySelector('.hero-nav');
  const hero = document.querySelector('.hero-slider');
  if (!nav || !hero) return;

  if (!('IntersectionObserver' in window)) {
    nav.classList.add('scrolled');   // sin soporte, gana la legibilidad
    return;
  }

  new IntersectionObserver(
    ([entry]) => nav.classList.toggle('scrolled', !entry.isIntersecting),
    { rootMargin: '-120px 0px 0px 0px' }
  ).observe(hero);
}

/* ---------- Escenas que reaccionan al scroll ----------
   Hoy la única es el Cierre. La estructura queda igual igual: la
   escena registra su contenedor y una función que recibe el progreso
   de ese tramo, de 0 a 1, y un único listener la actualiza dentro de
   un requestAnimationFrame.

   El movimiento se escribe con ese progreso y sin transiciones CSS:
   así sigue al dedo en lugar de arrastrarse detrás. Las únicas
   transiciones que quedan son las de los encadenados, que sí son
   tiempo de película y no posición de scroll.

   Progressive enhancement: si el sistema pide movimiento reducido no
   se registra nada y no se agrega .js-escenas, que es la clase que
   activa el pin en el CSS. Sin ella —y sin JS— cada sección es un
   bloque normal de un alto de pantalla, con su contenido visible. */

/* Un solo pulso de scroll para toda la página. Las escenas lo usan
   para su progreso y el nav para saber sobre qué fondo está parado;
   si mañana algo más lo necesita, se suscribe acá y no agrega otro
   listener. Las escenas pueden estar apagadas (movimiento reducido)
   y el pulso sigue corriendo para el nav, que no es decoración. */
const suscriptoresScroll = [];
let pulsoPendiente = false;
let pulsoIniciado = false;

function suscribirScroll(fn) {
  if (typeof fn === 'function') suscriptoresScroll.push(fn);
}

function correrSuscriptores() {
  pulsoPendiente = false;
  suscriptoresScroll.forEach((fn) => fn());
}

function pedirPulso() {
  if (pulsoPendiente) return;
  pulsoPendiente = true;
  requestAnimationFrame(correrSuscriptores);
}

function iniciarPulsoScroll() {
  if (pulsoIniciado || !suscriptoresScroll.length) return;
  pulsoIniciado = true;
  window.addEventListener('scroll', pedirPulso, { passive: true });
  window.addEventListener('resize', pedirPulso, { passive: true });
  // El pin recién existe una vez puesta la clase .js-escenas: el
  // primer cálculo va en el frame siguiente, con las alturas ya
  // definitivas.
  requestAnimationFrame(correrSuscriptores);
}

const escenas = [];

function movimientoReducido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function limitar01(n) {
  return n < 0 ? 0 : (n > 1 ? 1 : n);
}

function registrarEscena(stage, onProgress) {
  if (stage && typeof onProgress === 'function') escenas.push({ stage: stage, onProgress: onProgress });
}

function actualizarEscenas() {
  const alto = window.innerHeight;
  escenas.forEach((e) => {
    const rect = e.stage.getBoundingClientRect();
    const recorrido = e.stage.offsetHeight - alto;
    const avance = recorrido <= 0 ? 0 : limitar01(-rect.top / recorrido);
    e.onProgress(avance);
  });
}

function initEscenas() {
  if (!escenas.length || movimientoReducido()) return;
  document.documentElement.classList.add('js-escenas');
  suscribirScroll(actualizarEscenas);
}


/* ---------- Contraste del nav ----------
   La cápsula es translúcida, así que su legibilidad depende de lo que
   tenga abajo. Debajo del hero hay secciones claras y oscuras
   alternadas: sin esto, sobre las oscuras el texto quedaba negro
   sobre negro. Mira qué sección está pasando por detrás de la
   cápsula —con su rectángulo real, no con una altura fija— y
   devuelve el texto a claro cuando corresponde. */
function initNavContrast() {
  const nav = document.querySelector('.hero-nav');
  const capsula = nav && nav.querySelector('.hero-nav-inner');
  const oscuras = document.querySelectorAll('[data-nav-dark]');
  if (!nav || !capsula || !oscuras.length) return;

  let estado = null;

  suscribirScroll(() => {
    // Decide la sección que está bajo el CENTRO de la cápsula. Con
    // "cualquier solape" alcanzaba que asomara el último píxel de la
    // sección de arriba para teñir toda la barra.
    const c = capsula.getBoundingClientRect();
    const medio = (c.top + c.bottom) / 2;

    let oscuro = false;
    for (let i = 0; i < oscuras.length; i++) {
      const r = oscuras[i].getBoundingClientRect();
      if (r.top <= medio && r.bottom >= medio) { oscuro = true; break; }
    }
    if (oscuro === estado) return;
    estado = oscuro;
    nav.classList.toggle('over-dark', oscuro);
  });
}


/* ---------- Video de Nosotros ----------
   Es video de ambiente: arranca solo, sin sonido y en loop, y eso ya
   lo resuelve el HTML. Lo único que hace falta en JS es respetar a
   quien pidió movimiento reducido en su sistema: ahí se queda quieto
   en su poster, que es exactamente lo que la sección era antes de
   tener video. Sin JS el video igual reproduce. */
function initAboutVideo() {
  if (!movimientoReducido()) return;
  const video = document.querySelector('.about-media video');
  if (!video) return;
  video.removeAttribute('autoplay');
  video.removeAttribute('loop');
  video.pause();
}


/* ---------- Cierre ----------
   La única escena que quedó con movimiento: el auto se aleja, el
   cuadro se cierra y queda la marca. La frase y el botón se ocultan
   de verdad (visibility en el CSS), no sólo en opacidad: un link
   invisible pero enfocable sería una trampa. */
function initClosingScene() {
  const stage = document.getElementById('closingStage');
  if (!stage) return;

  const frame = stage.querySelector('.closing-frame');
  const barras = stage.querySelector('.closing-bars');
  const media = document.getElementById('closingMedia');
  const foto = media && media.querySelector('img');
  if (!frame || !foto) return;

  let terminado = false;

  registrarEscena(stage, (avance) => {
    foto.style.transform = 'translate3d(0, ' + (-avance * 12).toFixed(2) + '%, 0) scale(' + (1 - avance * 0.55).toFixed(3) + ')';
    // Recién se apaga en el último tramo: antes de eso se aleja a la vista.
    foto.style.opacity = Math.max(1 - Math.max(avance - 0.45, 0) * 2.2, 0).toFixed(3);

    // El cuadro se cierra sobre el final, como cerró la Experiencia.
    if (barras) barras.style.setProperty('--bar', (6 + 44 * limitar01((avance - 0.72) / 0.24)).toFixed(2) + '%');

    const fin = avance > 0.82;
    if (fin === terminado) return;
    terminado = fin;
    frame.classList.toggle('is-ended', fin);
  });
}


/* ---------- Estados del catálogo ----------
   Cuatro situaciones distintas que, si no se separan, se ven todas igual
   (una grilla vacía) y hacen que el sitio parezca roto:

     cargando       → todavía no llegó la respuesta
     error          → no se pudo cargar. Se ofrece reintentar de verdad.
     sin-stock      → cargó bien y no hay autos publicados. No es un error.
     sin-resultados → hay autos, pero los filtros no dejan ninguno.

   Los tres últimos comparten estructura para que se vean como parte del
   mismo sistema y no como tres pantallas improvisadas. */
function bloqueEstado(clase, titulo, texto, accion) {
  const caja = el('div', 'estado-catalogo ' + clase);
  const h = el('p', 'estado-catalogo-titulo');
  h.textContent = titulo;
  caja.appendChild(h);

  if (texto) {
    const p = el('p', 'estado-catalogo-texto');
    p.textContent = texto;
    caja.appendChild(p);
  }
  if (accion) {
    const btn = el('button', 'estado-catalogo-accion');
    btn.type = 'button';
    btn.textContent = accion.texto;
    btn.addEventListener('click', accion.alTocar);
    caja.appendChild(btn);
  }
  return caja;
}

/* Skeletons: ocupan exactamente el mismo espacio que las tarjetas reales
   (el contenedor de la foto ya tiene aspect-ratio 3/2), así que cuando
   llegan los datos no se mueve nada de la página. */
function pintarSkeletons(grid, cantidad) {
  grid.innerHTML = '';
  grid.setAttribute('aria-busy', 'true');
  for (let i = 0; i < cantidad; i++) {
    const s = el('div', 'car-card car-card--skeleton');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML =
      '<div class="car-card-media"></div>' +
      '<div class="car-card-body">' +
      '<div class="sk-linea sk-linea--titulo"></div>' +
      '<div class="sk-linea sk-linea--dato"></div>' +
      '<div class="sk-linea sk-linea--precio"></div>' +
      '</div>';
    grid.appendChild(s);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Respaldo visual de las fotos que no cargan. Se engancha antes que
  // nada para cubrir también las imágenes del HTML estático.
  initFotoRespaldo();

  /* El catálogo se dibuja DESPUÉS de una llamada a la red. Sin esto, el
     visitante ve un hueco vacío —y con conexión lenta, varios segundos—
     justo donde va lo importante. Los skeletons ya vienen escritos en el
     HTML (se ven en el primer paint, antes de que corra nada de esto), así
     que acá sólo se pintan si por algún motivo no están: no se los vuelve
     a dibujar para no reiniciarles la animación. */
  const gridInicial = document.getElementById('vehicles-grid');
  const contadorInicial = document.getElementById('resultsCount');
  if (gridInicial && !gridInicial.querySelector('.car-card--skeleton')) pintarSkeletons(gridInicial, 6);
  if (contadorInicial) contadorInicial.textContent = 'Buscando vehículos…';

  // El catálogo puede venir de Supabase (lo que carga el panel) o del
  // stock de demo de catalog-data.js. Catalogo.cargar() decide y siempre
  // devuelve la misma forma de datos — ver js/catalog-api.js.
  // Si ese archivo no está, se usa el estático como siempre.
  const cars = window.Catalogo ? await Catalogo.cargar() : buildCatalog();
  initConfigContent(cars);
  // Datos estructurados de la concesionaria (ver 1d en catalog-data.js):
  // el canonical de la home ya va fijo en el HTML porque es una URL
  // única que no depende de datos dinámicos.
  injectJsonLd(buildAutoDealerJsonLd(), 'ld-autodealer');
  initNavScroll();

  initFeaturedCarousel(cars);
  initCatalog(cars);
  initFiltersToggle();

  initAboutVideo();
  initClosingScene();
  initEscenas();

  // El contraste del nav no depende de las escenas: va siempre.
  initNavContrast();
  iniciarPulsoScroll();

  initMedicionHome(cars);
});

/* ---------- Medición de la home ----------
   Los eventos de catálogo y filtros se enganchan dentro de initCatalog,
   donde está el estado. Acá quedan los de la página: ver el catálogo y
   los CTA del hero. */
function initMedicionHome(cars) {
  /* catalog_view: no es "cargó la home", es "el catálogo entró en
     pantalla". Esa diferencia es la que hace útil el embudo — mucha gente
     entra y se va sin llegar a los autos, y eso hay que poder verlo.
     Se dispara UNA sola vez por carga (unaVezPor), aunque se scrollee
     para arriba y para abajo varias veces. */
  const seccion = document.getElementById('vehiculos');
  if (seccion) {
    const medir = () => Analytics.track('catalog_view',
      { results_count: cars.length }, { unaVezPor: 'home' });

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          medir();
          obs.disconnect();   // ya está: no hace falta seguir observando
        });
      }, { threshold: 0.2 });
      obs.observe(seccion);
    } else {
      medir();   // sin soporte, se cuenta al cargar
    }
  }

  /* CTA del hero. Los cuatro slides comparten la clase .hero-cta, pero
     dos de ellos son acciones comerciales distintas y merecen su propio
     evento: "Cotizá tu usado" es una permuta y "Consultá financiación"
     es una consulta de crédito. Se distinguen por su texto, que es lo
     que realmente vio la persona al tocar. */
  document.querySelectorAll('.hero-cta').forEach((cta) => {
    cta.addEventListener('click', () => {
      const texto = (cta.textContent || '').replace(/\s+/g, ' ').replace(/→/g, '').trim();
      const destino = cta.getAttribute('href') || '';

      let evento = 'hero_cta_click';
      if (/financiaci/i.test(texto)) evento = 'financing_click';
      else if (/cotiz|tasa|usado/i.test(texto)) evento = 'trade_in_click';

      Analytics.track(evento, {
        cta_label: texto,
        cta_target: destino,
        page_section: 'hero'
      });
    });
  });
}

/* ---------- Toggle de filtros (mobile) ----------
   Sólo existe #filtersToggle/#filtersPanel en el DOM cuando hay algo
   que abrir; en desktop igual están presentes pero .filters-panel es
   "display:contents" y el botón .filters-toggle-row es display:none,
   así que este listener no tiene ningún efecto visual ahí. */
function initFiltersToggle() {
  const toggle = document.getElementById('filtersToggle');
  const panel = document.getElementById('filtersPanel');
  const searchBtn = document.getElementById('searchBtn');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Al tocar "Buscar vehículos" en mobile, el panel se cierra: el
  // scroll a resultados que ya hace initCatalog es la confirmación.
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }
}

/* ---------- Carrusel de Destacados ----------
   Sin flechas: .featured-track ya es scroll-snap nativo (funciona igual
   en mobile con swipe), así que un control extra sólo para desktop era
   redundante. */
function initFeaturedCarousel(allCars) {
  const track = document.getElementById('featuredTrack');
  if (!track) return;

  // Con datos de la base manda el tilde "Destacado" del panel; con el
  // stock de demo, la selección curada de catalog-data.js.
  const featured = window.Catalogo
    ? Catalogo.destacados(allCars)
    : getFeatured(allCars);

  track.innerHTML = '';
  featured.forEach((c) => {
    const card = el('a', 'floating-card');
    card.href = Rutas.rutaVehiculo(c);
    const badge = cardBadge(c);
    const linea = cardLine(c);
    // Mismo criterio que createCarCard: nada del stock entra sin escapar.
    card.innerHTML = `
      <div class="floating-card-media">
        <img src="${escHtml(c.photos[0])}" alt="${escHtml(c.name + (c.year ? ' ' + c.year : ''))}" loading="lazy" decoding="async">
        ${badge ? `<span class="badge ${escHtml(badge.cls)}">${escHtml(badge.text)}</span>` : ''}
      </div>
      <div class="floating-card-body">
        <div class="floating-card-top">
          <div class="floating-card-name">${escHtml(c.name)}</div>
          ${linea ? `<div class="floating-card-line">${escHtml(linea)}</div>` : ''}
        </div>
        <div class="floating-card-price-row">
          ${priceBlock(c)}
        </div>
      </div>`;
    track.appendChild(card);
  });
}

/* ---------- Catálogo: filtros, orden, paginado ----------
   Los filtros se arman a partir del stock publicado: si una opción
   no tiene ni un vehículo que la cumpla, no se muestra. Así nunca
   queda un filtro que devuelve "no encontramos nada" por diseño. */

const YEAR_RANGES = [
  { value: 'new', label: '2023 en adelante', test: (y) => y >= 2023 },
  { value: 'mid', label: '2019 – 2022', test: (y) => y >= 2019 && y <= 2022 },
  { value: 'old', label: 'Hasta 2018', test: (y) => y <= 2018 }
];

/* Los tramos se eligen según el stock que se publique: si quedan casi
   todos los autos en una sola opción, el filtro deja de servir para
   filtrar. Revisar estos cortes cuando cambie el rango de precios del
   stock real (hoy son cinco tramos parejos sobre el stock cargado). */
const PRICE_RANGES = [
  { value: 'a', max: 15000000, test: (n) => n < 15000000 },
  { value: 'b', min: 15000000, max: 20000000, test: (n) => n >= 15000000 && n < 20000000 },
  { value: 'c', min: 20000000, max: 25000000, test: (n) => n >= 20000000 && n < 25000000 },
  { value: 'd', min: 25000000, max: 30000000, test: (n) => n >= 25000000 && n < 30000000 },
  { value: 'e', min: 30000000, test: (n) => n >= 30000000 }
];

function priceRangeLabel(r) {
  if (!r.min) return 'Hasta ' + money(r.max);
  if (!r.max) return 'Más de ' + money(r.min);
  return money(r.min) + ' – ' + money(r.max);
}

function initCatalog(allCars) {
  const grid = document.getElementById('vehicles-grid');
  const resultsRow = document.getElementById('resultsRow');
  const resultsCount = document.getElementById('resultsCount');
  const showMoreRow = document.getElementById('showMoreRow');
  const showMoreBtn = document.getElementById('showMoreBtn');
  const clearBtn = document.getElementById('clearFilters');
  const searchBtn = document.getElementById('searchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const fMarca = document.getElementById('fMarca');
  const fModelo = document.getElementById('fModelo');
  const fAno = document.getElementById('fAno');
  const fPrecio = document.getElementById('fPrecio');
  const fComb = document.getElementById('fComb');
  const fTrans = document.getElementById('fTrans');

  // Si el catálogo se llegara a sacar de index.html en el futuro, que
  // falte este bloque no rompa el resto de la página.
  if (!grid || !resultsRow || !resultsCount || !showMoreRow || !showMoreBtn ||
      !clearBtn || !searchBtn || !sortSelect || !fMarca || !fModelo ||
      !fAno || !fPrecio || !fComb || !fTrans) return;

  const state = { marca: '', modelo: '', ano: '', precio: '', comb: '', trans: '', sort: '', shown: 12 };

  // — Opciones que salen del stock real —
  [...new Set(allCars.map((c) => c.marca))].sort().forEach((m) => fMarca.appendChild(new Option(m, m)));

  // Las unidades 'proximamente' (ver sección 5 de catalog-data.js) traen
  // year/priceNum/comb/trans vacíos: se excluyen acá para que no generen
  // opciones de filtro fantasma ni matcheen un rango por coerción (''>=0).
  const conYear = allCars.filter((c) => typeof c.year === 'number' && isFinite(c.year));
  const conPrecio = allCars.filter((c) => typeof c.priceNum === 'number' && isFinite(c.priceNum));

  const yearRanges = YEAR_RANGES.filter((r) => conYear.some((c) => r.test(c.year)));
  yearRanges.forEach((r) => fAno.appendChild(new Option(r.label, r.value)));

  const priceRanges = PRICE_RANGES.filter((r) => conPrecio.some((c) => r.test(c.priceNum)));
  priceRanges.forEach((r) => fPrecio.appendChild(new Option(priceRangeLabel(r), r.value)));

  [...new Set(allCars.map((c) => c.comb).filter(Boolean))].sort().forEach((f) => fComb.appendChild(new Option(f, f)));
  [...new Set(allCars.map((c) => c.trans).filter(Boolean))].sort().forEach((t) => fTrans.appendChild(new Option(t, t)));

  function refreshModeloOptions() {
    const current = fModelo.value;
    fModelo.innerHTML = '<option value="">Todos</option>';
    const modelos = [...new Set(allCars.filter((c) => !state.marca || c.marca === state.marca).map((c) => c.modelo))];
    modelos.forEach((m) => fModelo.appendChild(new Option(m, m)));
    if (modelos.includes(current)) fModelo.value = current;
  }
  refreshModeloOptions();

  function inYear(y) {
    if (!state.ano) return true;
    // Sin año real (unidad 'proximamente'), nunca matchea un filtro de año.
    if (typeof y !== 'number' || !isFinite(y)) return false;
    const range = YEAR_RANGES.find((r) => r.value === state.ano);
    return range ? range.test(y) : true;
  }
  function inPrice(c) {
    if (!state.precio) return true;
    // Sin precio real, nunca matchea un filtro de precio (evita que
    // priceNum vacío "gane" por coerción el rango "Hasta $X").
    if (typeof c.priceNum !== 'number' || !isFinite(c.priceNum)) return false;
    const range = PRICE_RANGES.find((r) => r.value === state.precio);
    return range ? range.test(c.priceNum) : true;
  }
  function getFiltered() {
    let list = allCars.filter((c) =>
      (!state.marca || c.marca === state.marca) &&
      (!state.modelo || c.modelo === state.modelo) &&
      inYear(c.year) && inPrice(c) &&
      (!state.comb || c.comb === state.comb) &&
      (!state.trans || c.trans === state.trans)
    );
    if (state.sort) {
      // Un vehículo puede no tener el dato por el que se está ordenando:
      // sin precio ("Consultar precio") o sin ficha técnica completa. Esos
      // valores vacíos, al restarse, se comportan como 0 y se irían al
      // primer puesto del orden por precio. Se separan y van al final.
      const campo = { pa: 'priceNum', pd: 'priceNum', yd: 'year', ka: 'km' }[state.sort];
      const tieneDato = (c) => typeof c[campo] === 'number' && isFinite(c[campo]);

      const completos = list.filter(tieneDato);
      const sinDato   = list.filter((c) => !tieneDato(c));

      if (state.sort === 'pa') completos.sort((a, b) => a.priceNum - b.priceNum);
      else if (state.sort === 'pd') completos.sort((a, b) => b.priceNum - a.priceNum);
      else if (state.sort === 'yd') completos.sort((a, b) => b.year - a.year);
      else if (state.sort === 'ka') completos.sort((a, b) => a.km - b.km);

      list = completos.concat(sinDato);
    }
    return list;
  }

  function hayFiltros() {
    return !!(state.marca || state.modelo || state.ano || state.precio || state.comb || state.trans);
  }

  /* Un filtro con valor se distingue del resto sin tener que leerlo.
     De paso alimenta el contador del toggle mobile ("Filtrar vehículos ·2"),
     que no existe en desktop así que el hidden/textContent no afecta nada ahí. */
  function marcarFiltrosActivos() {
    let activos = 0;
    [fMarca, fModelo, fAno, fPrecio, fComb, fTrans].forEach((sel) => {
      const campo = sel.closest('.filter-field');
      const on = !!sel.value;
      if (campo) campo.classList.toggle('is-active', on);
      if (on) activos++;
    });
    const countEl = document.getElementById('filtersCount');
    if (countEl) {
      countEl.textContent = String(activos);
      countEl.hidden = activos === 0;
    }
  }

  /* Limpia los filtros sin dejar rastro en el estado ni en los <select>.
     Se usa desde el botón de arriba y desde el estado "sin resultados". */
  function limpiarFiltros() {
    state.marca = state.modelo = state.ano = state.precio = state.comb = state.trans = '';
    state.shown = 12;
    fMarca.value = fModelo.value = fAno.value = fPrecio.value = fComb.value = fTrans.value = '';
    refreshModeloOptions();
    render();
  }

  /* Vuelve a consultar de verdad (forzar descarta la caché) sin recargar
     la página: se mantienen el scroll, los filtros y todo lo demás. */
  async function reintentar(boton) {
    if (!window.Catalogo) { location.reload(); return; }

    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Reintentando…';
    pintarSkeletons(grid, 3);
    resultsCount.textContent = 'Buscando vehículos…';

    try {
      const frescos = await Catalogo.cargar({ forzar: true });
      // allCars es la lista con la que se armó este catálogo: se
      // reemplaza su contenido en el lugar para no perder la referencia
      // que usan los filtros y el resto de las funciones de este scope.
      allCars.length = 0;
      frescos.forEach((c) => allCars.push(c));
      render();
    } catch (e) {
      console.error('[catalogo] falló el reintento:', e);
      boton.disabled = false;
      boton.textContent = textoOriginal;
      render();
    }
  }

  function render() {
    marcarFiltrosActivos();
    const filtered = getFiltered();
    const n = filtered.length;
    const origen = window.Catalogo ? Catalogo.origen() : 'demo';

    grid.innerHTML = '';
    grid.removeAttribute('aria-busy');
    // "Limpiar filtros" sólo aparece cuando hay algo que limpiar.
    clearBtn.hidden = !hayFiltros();

    /* Sin ningún vehículo cargado (error o stock vacío) los filtros y el
       orden no pueden hacer nada: dejarlos a la vista invita a tocarlos y
       a sacar la conclusión equivocada ("filtré mal"). Se esconden hasta
       que haya catálogo, y vuelven solos al reintentar. */
    const hayCatalogo = origen !== 'error' && allCars.length > 0;
    const barra = document.querySelector('.search-bar');
    const orden = document.getElementById('sortSelect');
    if (barra) barra.hidden = !hayCatalogo;
    if (orden && orden.parentElement) orden.parentElement.hidden = !hayCatalogo;

    /* 1. No se pudo cargar. Es lo único que se ofrece reintentar, y hay
          que decirlo: mostrar "0 vehículos" acá sería mentir, porque no
          sabemos cuántos hay. */
    if (origen === 'error') {
      resultsCount.textContent = 'No se pudo cargar el catálogo';
      const bloque = bloqueEstado('estado-catalogo--error',
        'No pudimos cargar los vehículos.',
        'Puede ser un problema momentáneo de conexión.',
        { texto: 'Intentar nuevamente', alTocar: (ev) => reintentar(ev.currentTarget) });
      grid.appendChild(bloque);
      showMoreRow.hidden = true;
      return;
    }

    /* 2. Cargó bien y no hay stock publicado. No es un error y no tiene
          que parecerlo: el contacto sigue disponible. */
    if (!allCars.length) {
      resultsCount.textContent = 'Sin vehículos publicados';
      const bloque = bloqueEstado('estado-catalogo--vacio',
        'Estamos actualizando nuestro stock.',
        'En breve vamos a publicar las unidades disponibles. Mientras tanto, escribinos y te contamos qué tenemos.',
        { texto: 'Consultar por WhatsApp', alTocar: () => {
            Analytics.track('whatsapp_click', { source: 'empty_stock', page_section: 'home' });
            window.open(waLink('nav'), '_blank', 'noopener');
          } });
      grid.appendChild(bloque);
      showMoreRow.hidden = true;
      return;
    }

    resultsCount.textContent = n === 1 ? '1 vehículo encontrado' : n + ' vehículos encontrados';

    /* 3. Hay stock, pero los filtros no dejan nada. Distinto del anterior:
          acá la salida es aflojar la búsqueda, no esperar. */
    if (!n) {
      const bloque = bloqueEstado('estado-catalogo--sin-resultados',
        'No encontramos vehículos con estos filtros.',
        'Probá con una búsqueda más amplia.',
        hayFiltros() ? { texto: 'Limpiar filtros', alTocar: limpiarFiltros } : null);
      grid.appendChild(bloque);
      showMoreRow.hidden = true;
      return;
    }

    /* 4. Camino normal. */
    filtered.slice(0, state.shown).forEach((c) => grid.appendChild(createCarCard(c)));
    showMoreRow.hidden = n <= state.shown;
  }

  /* filter_use: qué filtro se tocó y con qué valor. Los valores salen de
     <select> armados con el propio stock (marcas, modelos, combustibles),
     así que nunca hay texto escrito por el visitante. Elegir "Todas" se
     mide como 'todos' en vez de cadena vacía, porque limpiar un filtro
     también dice algo. */
  function medirFiltro(nombre, valor) {
    Analytics.track('filter_use', {
      filter_name: nombre,
      filter_value: valor || 'todos',
      results_count: getFiltered().length
    });
  }

  fMarca.addEventListener('change', () => { state.marca = fMarca.value; state.modelo = ''; state.shown = 12; refreshModeloOptions(); render(); medirFiltro('marca', fMarca.value); });
  fModelo.addEventListener('change', () => { state.modelo = fModelo.value; state.shown = 12; render(); medirFiltro('modelo', fModelo.value); });
  fAno.addEventListener('change', () => { state.ano = fAno.value; state.shown = 12; render(); medirFiltro('ano', fAno.options[fAno.selectedIndex].text); });
  fPrecio.addEventListener('change', () => { state.precio = fPrecio.value; state.shown = 12; render(); medirFiltro('precio', fPrecio.options[fPrecio.selectedIndex].text); });
  fComb.addEventListener('change', () => { state.comb = fComb.value; state.shown = 12; render(); medirFiltro('combustible', fComb.value); });
  fTrans.addEventListener('change', () => { state.trans = fTrans.value; state.shown = 12; render(); medirFiltro('transmision', fTrans.value); });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    render();
    Analytics.track('sort_catalog', {
      sort_by: sortSelect.value || 'default',
      results_count: getFiltered().length
    });
  });

  showMoreBtn.addEventListener('click', () => {
    state.shown += 12;
    render();
    // shown_count dice hasta dónde llegó scrolleando: mide profundidad
    // de exploración del catálogo.
    Analytics.track('show_more', {
      shown_count: state.shown,
      results_count: getFiltered().length
    });
  });

  /* El catálogo ya filtra en vivo, así que "Buscar vehículos" no vuelve a
     calcular nada: lleva al usuario a los resultados y los reanuncia. Antes
     era un botón que parecía buscar y no hacía nada. */
  searchBtn.addEventListener('click', () => {
    // search_vehicles: no hay búsqueda por texto en el sitio (los filtros
    // son todos <select>), así que lo que se mide es la combinación
    // aplicada: cuántos filtros activos y cuántos resultados dio. Un
    // filters_active alto con results_count 0 es la señal de que el stock
    // no cubre lo que la gente busca.
    Analytics.track('search_vehicles', {
      filters_active: [state.marca, state.modelo, state.ano, state.precio, state.comb, state.trans].filter(Boolean).length,
      results_count: getFiltered().length
    });

    state.shown = 12;
    // Vaciar y reescribir el contador fuerza el anuncio del aria-live
    // aunque la cantidad de resultados no haya cambiado.
    resultsCount.textContent = '';
    requestAnimationFrame(() => {
      render();
      resultsRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  clearBtn.addEventListener('click', () => {
    Analytics.track('clear_filters', {
      filters_active: [state.marca, state.modelo, state.ano, state.precio, state.comb, state.trans].filter(Boolean).length
    });
    limpiarFiltros();
  });

  render();
}

// ===== Ripple del botón metálico del hero (.hero-cta) =====
// Sólo el destello del click: el resto del efecto (veta animada, aro
// de sombra) es CSS puro. Respeta prefers-reduced-motion.
(function heroCtaRipple() {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  document.querySelectorAll('.hero-cta').forEach((btn) => {
    btn.addEventListener('pointerdown', (ev) => {
      // Si React ya tomó el control de este botón (ver
      // js/metallic-button.js), el ripple lo pone ese componente —
      // evita el doble destello.
      if (btn.classList.contains('is-metallic-ready')) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'hero-cta-ripple';
      ripple.style.left = (ev.clientX - rect.left) + 'px';
      ripple.style.top = (ev.clientY - rect.top) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
})();
