// ==========================================================
// NUVORA — ficha.js (página individual del vehículo)
// Requiere que catalog-data.js esté cargado antes que este archivo.
// ==========================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Algunos navegadores (sobre todo en mobile) heredan o restauran la
  // posición de scroll de la página anterior al entrar a esta ficha.
  // La ficha siempre tiene que arrancar arriba del todo.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  initFotoRespaldo();
  initMobileMenuFicha();

  const cars = window.Catalogo ? await Catalogo.cargar() : buildCatalog();
  initConfigContent(cars);

  // El vehículo sale de la URL, no de ningún estado guardado en memoria:
  // por eso entrar directo desde un link de WhatsApp, recargar o abrir la
  // dirección en otra pestaña llevan siempre al mismo vehículo.
  // refDeLaUrl() lee /vehiculos/<slug>, ficha.html?v=<slug> y el viejo
  // ficha.html?id=<n> indistintamente (ver js/rutas.js).
  const ref = Rutas.refDeLaUrl();
  const car = Rutas.buscarVehiculo(cars, ref);

  if (!car) {
    showNotFound();
    return;
  }

  renderFicha(car, cars);

  // Por si cargar la galería/specs corrió el layout después del primer
  // scrollTo, lo reforzamos una vez más en el siguiente frame.
  requestAnimationFrame(() => window.scrollTo(0, 0));

  /* Foco al título del vehículo. Al venir del catálogo el foco quedaba en
     el <body> de una página nueva: con lector de pantalla no se anunciaba
     qué auto se abrió. preventScroll para no pelear con el scrollTo de
     arriba. El tabindex="-1" lo hace enfocable por código sin meterlo en
     el recorrido del tabulador. */
  const titulo = document.getElementById('fichaTitle');
  if (titulo) {
    titulo.setAttribute('tabindex', '-1');
    enfocarSinAnillo(titulo);
  }
});

/* Mueve el foco sin dibujar el anillo rojo.

   :focus-visible no alcanza: cuando el foco lo mueve el código y todavía
   no hubo ninguna interacción del visitante, Chrome igual lo considera
   "visible" y pinta el anillo. Para quien vino con el mouse eso se ve
   como un recuadro rojo salido de la nada alrededor del título.

   La marca se saca en cuanto el elemento pierde el foco, así que si
   después alguien vuelve con el tabulador —ahí sí hace falta ver dónde
   está parado— el anillo aparece normalmente. */
function enfocarSinAnillo(nodo) {
  if (!nodo) return;
  nodo.dataset.focoSilencioso = '1';
  nodo.addEventListener('blur', () => { delete nodo.dataset.focoSilencioso; }, { once: true });
  nodo.focus({ preventScroll: true });
}

/* ---------- Menú mobile (igual que en index.html) ---------- */
function initMobileMenuFicha() {
  const heroBurger = document.getElementById('heroBurger');
  const mobileNav = document.getElementById('mobileNav');
  if (!heroBurger || !mobileNav) return;

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

/* ---------- Vehículo no encontrado (id inválido o inexistente) ---------- */
function showNotFound() {
  // Motivo real para no indexar: este id no corresponde a ningún
  // vehículo del stock actual (se vendió y se borró, o el link está
  // mal escrito). No es contenido duplicado ni thin content "por las
  // dudas": es un recurso que hoy no existe.
  setNoindex();
  document.title = `Vehículo no disponible | ${dealershipConfig.name}`;
  document.getElementById('fichaContent').innerHTML = `
    <div class="ficha-not-found" tabindex="-1" role="status">
      <h2>Este vehículo ya no está disponible</h2>
      <p>
        Puede que se haya vendido, que lo hayamos dado de baja del catálogo,
        o que el link esté incompleto. El resto del stock sigue publicado.
      </p>
      <a href="index.html#vehiculos" class="btn-dark">Ver catálogo completo</a>
    </div>`;

  /* A propósito NO se redirige al catálogo ni a otro vehículo: quien llegó
     por un link guardado tiene que entender qué pasó con ESE auto, no
     aparecer de golpe en otro lado. Se mueve el foco al mensaje para que
     un lector de pantalla lo anuncie en vez de dejarlo arriba de una
     página que cambió por completo. */
  enfocarSinAnillo(document.querySelector('.ficha-not-found'));
}

/* ---------- Armar la ficha completa ---------- */
function renderFicha(car, allCars) {
  // Unidad 'proximamente' (ver sección 5 de catalog-data.js): todavía no
  // tiene ficha técnica completa, así que no se indexa mientras tanto.
  // Sigue siendo accesible por link directo.
  if (car.status === 'proximamente') setNoindex();

  // Título y meta description de la pestaña / buscadores (ver limitación
  // de vista previa en WhatsApp explicada aparte: esto ayuda a Google,
  // que sí ejecuta JS, pero no a las tarjetas de redes sociales).
  document.title = `${car.name}${car.year ? ' ' + car.year : ''} usado | ${dealershipConfig.name}`;
  const metaDesc = document.getElementById('pageDescription');
  const detallesFicha = [car.year, kmLabel(car.km), car.trans].filter(Boolean).join(', ');
  const descripcionFicha = car.status === 'proximamente'
    ? `${car.name}. Próximamente disponible en ${dealershipConfig.name}.`
    : `${car.name}${detallesFicha ? ' ' + detallesFicha : ''}. ${car.price}. Usado seleccionado en ${dealershipConfig.name}.`;
  if (metaDesc) metaDesc.setAttribute('content', descripcionFicha);

  // Canonical propio de esta unidad (nunca uno genérico compartido: ver
  // el comentario en ficha.html). Siempre apunta a la URL pública
  // /vehiculos/<slug>, aunque se haya llegado por un link viejo con ?id=:
  // así Google consolida todas las variantes en una sola dirección.
  // La imagen de portada real del auto reemplaza acá al fallback genérico
  // de Open Graph.
  const rutaFicha = Rutas.rutaCanonica(car);
  setCanonical(rutaFicha);
  const imagenFicha = (car.photos && car.photos[0]) || SITE_CONFIG.ogImage;
  setMetaTag('property', 'og:title', document.title);
  setMetaTag('property', 'og:description', descripcionFicha);
  setMetaTag('property', 'og:image', absoluteUrl(imagenFicha));
  setMetaTag('property', 'og:url', absoluteUrl(rutaFicha));
  setMetaTag('name', 'twitter:title', document.title);
  setMetaTag('name', 'twitter:description', descripcionFicha);
  setMetaTag('name', 'twitter:image', absoluteUrl(imagenFicha));

  // Dos bloques de datos estructurados, que describen cosas distintas:
  // quién vende (AutoDealer, igual que en la home) y qué se vende en esta
  // página concreta (Vehicle + Offer, ver 1e en catalog-data.js).
  injectJsonLd(buildAutoDealerJsonLd(), 'ld-autodealer');
  injectJsonLd(buildVehicleJsonLd(car), 'ld-vehiculo');

  const badge = document.getElementById('fichaBadge');
  const badgeData = cardBadge(car);
  if (badgeData) {
    badge.hidden = false;
    badge.textContent = badgeData.text;
    badge.className = 'badge ' + badgeData.cls;
  } else {
    badge.hidden = true;
  }

  document.getElementById('fichaTitle').textContent = car.name;
  document.getElementById('fichaPrice').textContent = car.price;

  /* Precio anterior tachado. La pastilla roja con el porcentaje se sacó:
     el porcentaje no agrega nada que el par de precios no diga ya. */
  const oldPriceEl = document.getElementById('fichaOldPrice');
  if (car.oldPrice) {
    oldPriceEl.hidden = false;
    oldPriceEl.textContent = car.oldPrice;
  } else {
    oldPriceEl.hidden = true;
  }

  // Sellos de confianza: salen de la configuración de la concesionaria,
  // o del propio vehículo si trae su lista.
  const pills = document.getElementById('fichaPills');
  if (pills) {
    pills.innerHTML = '';
    (car.badges || []).forEach((texto) => {
      // textContent y no el(…, html): estos sellos son texto plano, no
      // hace falta interpretarlos como HTML y así no hay nada que escapar.
      const pill = el('span', 'ficha-pill');
      pill.textContent = texto;
      pills.appendChild(pill);
    });
    pills.hidden = !(car.badges && car.badges.length);
  }

  // Descripción de la unidad
  const descEl = document.getElementById('fichaDescription');
  if (descEl) {
    descEl.textContent = car.desc;
    descEl.hidden = !car.desc;
  }

  const specs = [
    ['Año', car.year], ['Kilómetros', kmLabel(car.km)], ['Transmisión', car.trans], ['Motor', car.motor],
    ['Combustible', car.comb], ['Tracción', car.tracc], ['Segmento', car.seg], ['Consumo', car.cons],
    ['Pasajeros', car.pas], ['Puertas', car.pue]
  ].filter(([, v]) => v !== '' && v !== undefined && v !== null);
  // Los VALORES salen del stock (motor, tracción, segmento los escribe
  // quien carga el vehículo): van escapados. Las etiquetas son literales
  // de este archivo, pero se escapan igual por consistencia.
  document.getElementById('fichaSpecs').innerHTML = specs
    .map(([k, v]) => `<div class="ficha-spec"><div class="ficha-spec-k">${escHtml(k)}</div><div class="ficha-spec-v">${escHtml(v)}</div></div>`)
    .join('');

  /* Los dos CTA de WhatsApp de la ficha se miden por separado: consultar
     y coordinar una visita son intenciones distintas, y saber cuál
     convierte más cambia qué se pone primero. */
  const wa = document.getElementById('fichaWa');
  const waVisita = document.getElementById('fichaWaVisit');
  wa.href = waLink('vehiculo', car);
  waVisita.href = waLink('visita', car);

  /* Vendido o reservado: la ficha sigue online —hay links compartidos y
     resultados de Google apuntando acá— pero NO puede seguir ofreciendo
     la unidad como si estuviera a la venta. Se avisa y se cambia lo que
     proponen los botones: "agendar visita" a un auto vendido es una
     promesa que la concesionaria no puede cumplir.
     Tampoco se redirige a otro vehículo: quien llegó buscando ESTE tiene
     que entender qué pasó. */
  if (car.status === 'vendido' || car.status === 'reservado') {
    const vendido = car.status === 'vendido';
    const aviso = el('p', 'ficha-aviso-estado');
    aviso.setAttribute('role', 'status');
    aviso.textContent = vendido
      ? 'Esta unidad ya se vendió. Podemos avisarte cuando entre algo parecido.'
      : 'Esta unidad está reservada. Consultanos por disponibilidad o por unidades similares.';

    const acciones = wa.closest('.ficha-actions');
    if (acciones && acciones.parentNode) acciones.parentNode.insertBefore(aviso, acciones);

    if (vendido) {
      wa.textContent = 'Consultar por unidades similares';
      // Agendar una visita a un auto que ya no está carece de sentido.
      waVisita.hidden = true;
    }
  }

  wa.addEventListener('click', () => {
    Analytics.track('whatsapp_click', Object.assign(
      Analytics.paramsVehiculo(car),
      { source: 'vehicle_detail', page_section: 'ficha' }
    ));
  });
  waVisita.addEventListener('click', () => {
    Analytics.track('whatsapp_click', Object.assign(
      Analytics.paramsVehiculo(car),
      { source: 'vehicle_visit', page_section: 'ficha' }
    ));
  });

  // Cuota estimada "desde": plazo máximo y sin anticipo, que es el piso
  // real de la simulación. Se muestra junto al precio porque es la
  // pregunta que sigue inmediatamente después de verlo.
  const quota = document.getElementById('fichaQuota');
  if (quota) {
    // Sin precio (unidad 'proximamente') no hay capital que simular.
    if (car.priceNum) {
      const meses = FINANCING_CONFIG.term.max;
      const capital = Math.min(car.priceNum, FINANCING_CONFIG.amount.max);
      document.getElementById('fichaQuotaValue').textContent = 'Desde ' + money(cuotaFrancesa(capital, meses)) + ' por mes';
      document.getElementById('fichaQuotaNote').textContent = meses + ' cuotas, sin anticipo · simulación orientativa';
      quota.hidden = false;
    } else {
      quota.hidden = true;
    }
  }

  /* view_vehicle: el evento más propenso a duplicarse, porque cualquier
     re-render de la ficha lo volvería a disparar y ahí las estadísticas
     de "vehículos más vistos" dejan de servir. La clave unaVezPor hace
     que, pase lo que pase dentro de esta carga de página, se envíe una
     sola vez por vehículo. Al navegar a otro auto hay carga nueva (son
     documentos separados, no una SPA), así que el contador se reinicia
     solo y la vista siguiente sí se cuenta. */
  Analytics.track('view_vehicle',
    Analytics.paramsVehiculo(car),
    { unaVezPor: car.slug || car.id });

  initGallery(car);
  // La consulta viaja con la unidad identificada, para que la
  // concesionaria sepa por qué auto están preguntando.
  initMiniForm('vf', {
    seccion: 'ficha',
    vehiculoId: car.id,
    vehiculo: `${car.name} ${car.year}`,
    precio: car.price
  });
  renderSimilares(car, allCars);
}

/* ---------- Galería ----------
   La UI se adapta a la cantidad real de fotos: con una sola imagen
   no se muestran ni miniaturas ni flechas, porque no habría nada
   que navegar. Nunca se repite una foto para simular una galería. */
function initGallery(car) {
  const mainImg = document.getElementById('fichaMainImg');
  const thumbs = document.getElementById('fichaThumbs');
  const prevBtn = document.getElementById('fichaPrev');
  const nextBtn = document.getElementById('fichaNext');
  const counter = document.getElementById('fichaGalCount');
  const photos = car.photos || [];
  let galIndex = 0;

  mainImg.setAttribute('fetchpriority', 'high');
  mainImg.decoding = 'async';

  if (!photos.length) {
    /* Publicar sin fotos es posible desde el panel. Antes quedaba un
       recuadro beige sin explicación; ahora usa la misma leyenda que una
       foto que no carga, así el visitante entiende qué está viendo y no
       hay dos maneras distintas de decir lo mismo. */
    mainImg.hidden = true;
    const marco = mainImg.closest('.ficha-main-img-wrap');
    if (marco) marco.classList.add('img-sin-foto');
    thumbs.hidden = true;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    if (counter) counter.hidden = true;
    return;
  }

  const multiple = photos.length > 1;
  // Con una sola foto no hay miniaturas: la imagen ocupa esa altura en
  // lugar de dejar un hueco blanco debajo.
  const gallery = mainImg.closest('.ficha-gallery');
  if (gallery) gallery.classList.toggle('is-single', !multiple);
  thumbs.hidden = !multiple;
  prevBtn.hidden = !multiple;
  nextBtn.hidden = !multiple;
  if (counter) counter.hidden = !multiple;

  function render() {
    // El <img> es siempre el mismo: si la foto anterior había fallado hay
    // que sacarle la marca antes de cambiar el src, o la nueva —aunque
    // cargue bien— se vería tapada por el respaldo de la anterior.
    limpiarFotoRespaldo(mainImg);
    mainImg.src = photos[galIndex];
    mainImg.alt = `${car.name} ${car.year} — foto ${galIndex + 1} de ${photos.length}`;
    if (counter) counter.textContent = `${galIndex + 1} / ${photos.length}`;

    if (!multiple) return;
    thumbs.innerHTML = '';
    photos.forEach((ph, n) => {
      const t = el('button', 'ficha-thumb' + (n === galIndex ? ' is-active' : ''));
      t.type = 'button';
      t.style.backgroundImage = `url('${ph}')`;
      t.setAttribute('aria-label', 'Ver foto ' + (n + 1));
      t.setAttribute('aria-current', n === galIndex ? 'true' : 'false');
      t.addEventListener('click', () => { galIndex = n; render(); });
      thumbs.appendChild(t);
    });
  }

  if (multiple) {
    prevBtn.addEventListener('click', () => { galIndex = (galIndex + photos.length - 1) % photos.length; render(); });
    nextBtn.addEventListener('click', () => { galIndex = (galIndex + 1) % photos.length; render(); });
  }

  render();
}

/* ---------- Vehículos similares (misma marca primero, si no hay, otros) ---------- */
function renderSimilares(car, allCars) {
  const section = document.getElementById('fichaSimilares');
  const grid = document.getElementById('fichaSimilaresGrid');

  let similares = allCars.filter((c) => c.id !== car.id && c.marca === car.marca);
  if (similares.length < 3) {
    const otros = allCars.filter((c) => c.id !== car.id && c.marca !== car.marca);
    similares = similares.concat(otros);
  }
  similares = similares.slice(0, 3);

  if (!similares.length) return;

  grid.innerHTML = '';
  similares.forEach((c) => grid.appendChild(createCarCard(c)));
  section.hidden = false;
}
