// ==========================================================
// NUVORA — catalog-data.js
// FUENTE ÚNICA DE VERDAD del sitio.
// Acá vive TODO lo que cambia de una concesionaria a otra:
// los datos del negocio (dealershipConfig), las condiciones de
// la simulación de crédito (FINANCING_CONFIG) y el stock
// (vehicles). El resto de los archivos sólo lee de acá.
//
// Cargar este script ANTES de app.js / ficha.js.
// ==========================================================


/* ==========================================================
   1. DATOS DE LA CONCESIONARIA
   ----------------------------------------------------------
   TODO lo que dice [DEMO] son datos de ejemplo: hay que
   reemplazarlos por los reales del cliente ANTES de presentar
   la web. No agregar acá ninguna cifra que el cliente no pueda
   respaldar (reseñas, premios, certificaciones).
========================================================== */

const dealershipConfig = {
  name: 'CarCompany',
  // Cómo se posiciona el negocio. Tiene que coincidir con el stock real:
  // si no hay 0km, acá no se promete 0km.
  positioning: 'Concesionaria multimarca de usados seleccionados',

  // Descripción larga del negocio. Es la base de la meta description de la
  // home y del JSON-LD. Sin repetir palabras clave a la fuerza: describe
  // lo que la concesionaria hace, en una frase que una persona leería.
  description: 'Concesionaria de autos usados multimarca en Mar del Plata. ' +
    'Vehículos seleccionados, financiación, tasamos tu usado y atención personalizada.',

  // Número de WhatsApp en formato internacional, sin + ni espacios.
  // Es el único lugar donde se escribe: todos los botones lo toman de acá.
  whatsapp: '5492236974817',       // [DEMO]

  // Teléfono fijo, si la concesionaria tiene uno distinto del WhatsApp.
  // Vacío a propósito: no hay dato real. Si queda vacío, el JSON-LD usa
  // el WhatsApp como telephone y no inventa un segundo número.
  phone: '',

  // País en formato ISO 3166-1 alpha-2. No es un dato inventado: ya era
  // implícito en el proyecto (los precios se formatean con es-AR / ARS).
  country: 'AR',

  // Logo del negocio, para el JSON-LD y como referencia única.
  logo: 'assets/brand/logo.png',

  // Sucursales. Agregar o quitar objetos de este array alcanza:
  // la sección de contacto se arma sola.
  //
  // Campos opcionales para SEO (datos estructurados LocalBusiness/AutoDealer,
  // ver buildAutoDealerJsonLd() más abajo). Se dejan sin completar a propósito
  // hasta tener el dato real confirmado — mientras falten, el JSON-LD
  // simplemente no los incluye:
  //   province:     provincia (ej. 'Buenos Aires')
  //   postalCode:   código postal
  //   hoursStructured: [{ dayOfWeek: ['Monday', ...], opens: '09:00', closes: '19:00' }]
  branches: [                       // [DEMO]
    {
      name: 'Showroom',
      address: 'Av. Colón 1234',
      city: 'Mar del Plata',
      province: 'Buenos Aires',
      postalCode: '',               // sin dato real: no se inventa
      hours: 'Lun a Sáb de 9 a 19 h',
      hoursStructured: []           // ver formato en el comentario de arriba
    }
  ],

  /* La sucursal 0 es la principal: de ahí salen la localidad y la
     provincia que usan el título de la home, el JSON-LD y el sitemap.
     Se lee siempre desde acá y no se repite escrita en ningún HTML. */

  // Franja de marcas. "Trabajamos" ≠ "somos oficiales": no usar
  // la palabra "oficial" salvo que el cliente tenga la representación.
  brandsLabel: 'Marcas que trabajamos',
  brands: [
    { name: 'Ford', logo: 'assets/brands/ford.svg' },
    { name: 'Renault', logo: 'assets/brands/renault.svg' },
    { name: 'Fiat', logo: 'assets/brands/fiat.svg' },
    { name: 'Peugeot', logo: 'assets/brands/peugeot.svg' }
  ],

  // Sellos de confianza que se muestran en cada ficha.
  // Sólo poner lo que la concesionaria efectivamente cumple.
  // Un vehículo puede pisar esta lista con su propio campo `badges`.
  trustBadges: [                    // [DEMO]
    'Informe de dominio',
    'Transferencia gestionada',
    'Garantía escrita'
  ]

  // Opcionales para SEO local, hoy sin dato real (no se inventan):
  // geo: { latitude: 0, longitude: 0 },
  // sameAs: ['https://www.instagram.com/...', 'https://www.facebook.com/...']
};


/* ==========================================================
   1b. CONFIGURACIÓN TÉCNICA DEL SITIO (SEO)
   ----------------------------------------------------------
   SITE_CONFIG.baseUrl es un PLACEHOLDER. Reemplazarlo por el dominio
   real (con https:// y sin barra final) antes de publicar el sitio:
   de este valor dependen el canonical de cada página, robots.txt,
   sitemap.xml y las URLs absolutas de Open Graph. Mientras no se
   reemplace, todo eso queda correctamente ESTRUCTURADO pero apuntando
   a un dominio de ejemplo que no existe.

   ogImage: foto ya publicada en el proyecto, usada como vista previa
   al compartir el sitio (WhatsApp/Facebook/Instagram/X). Se puede
   reemplazar por cualquier otra imagen de assets/ — idealmente, más
   adelante, una pensada específicamente para eso (1200×630).
========================================================== */

const SITE_CONFIG = {
  /* ⚠️ ÚNICO lugar donde se escribe el dominio. Al cambiarlo hay que
     correr `node build-seo.js`, que lo propaga a las meta estáticas de
     index.html y ficha.html, a robots.txt y a sitemap.xml. Mientras siga
     siendo este placeholder, build-seo.js avisa en cada corrida. */
  baseUrl: 'https://www.tu-dominio-real.com.ar',   // [PLACEHOLDER] reemplazar antes de publicar

  ogImage: 'assets/images/hero-1.jpg',

  /* Idioma y región para Open Graph. Coincide con el lang="es" del HTML
     y con el formato de precios (es-AR). */
  locale: 'es_AR',

  /* URLs de los vehículos (ver js/rutas.js).

     true  → /vehiculos/toyota-corolla-xei-2022
             Necesita que el hosting reescriba /vehiculos/* a ficha.html.
             Ya están los archivos para eso en la raíz del proyecto:
             _redirects (Netlify), vercel.json (Vercel) y .htaccess
             (Apache/cPanel). Sin esa regla, los links funcionan al
             navegar desde la home pero dan 404 al recargar o al entrar
             directo desde WhatsApp.

     false → ficha.html?v=toyota-corolla-xei-2022
             Anda en cualquier hosting sin configurar nada. Es la salida
             si el servidor no permite rewrites.

     Abriendo el sitio como archivo local (file://) se usa siempre la
     segunda forma, sin importar este valor: no hay servidor que reescriba. */
  urlsLimpias: true
};

/* Arma una URL absoluta a partir de una ruta relativa del proyecto,
   usando SITE_CONFIG.baseUrl. No valida si el dominio ya es real:
   eso es responsabilidad de quien complete el placeholder de arriba. */
function absoluteUrl(path) {
  const base = SITE_CONFIG.baseUrl.replace(/\/+$/, '');
  const clean = String(path || '').replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}


/* ==========================================================
   1c. HELPERS DE <head> COMPARTIDOS (index.html y ficha.html)
========================================================== */

/* Crea o actualiza una <meta> por atributo (name o property), sin
   duplicarla si ya existe en el HTML estático. Ignora valores vacíos
   para no pisar un fallback ya escrito en el HTML con contenido vacío. */
function setMetaTag(attr, key, content) {
  if (!content) return;
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/* Crea o actualiza <link rel="canonical">. Cada página es un recurso
   distinto (la home, cada ficha con su ?id=N): NUNCA debe apuntar a
   una URL genérica compartida, porque eso le diría a Google que todo
   el catálogo es contenido duplicado de una sola página. */
function setCanonical(path) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', absoluteUrl(path));
}

/* Agrega (una sola vez) <meta name="robots" content="noindex">. Sólo
   se usa cuando hay un motivo real: una ficha cuyo id no corresponde
   a ningún vehículo del stock actual. */
function setNoindex() {
  if (document.querySelector('meta[name="robots"]')) return;
  const tag = document.createElement('meta');
  tag.setAttribute('name', 'robots');
  tag.setAttribute('content', 'noindex');
  document.head.appendChild(tag);
}

/* Inyecta (o actualiza) un bloque JSON-LD en <head>, identificado por
   `id` para no duplicarlo si la función se llama más de una vez. */
function injectJsonLd(data, id) {
  if (!data) return;
  const scriptId = id || ('ld-' + (data['@type'] || 'data'));
  let script = document.getElementById(scriptId);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}


/* ==========================================================
   1d. DATOS ESTRUCTURADOS DE LA CONCESIONARIA (LocalBusiness)
   ----------------------------------------------------------
   Un solo nodo AutoDealer (subtipo de LocalBusiness pensado
   específicamente para concesionarias — schema.org/AutoDealer) reúne
   lo que normalmente se repartiría entre Organization y LocalBusiness:
   declarar los dos por separado para el mismo negocio sería
   redundante y podría confundir más que ayudar.

   TODO sale de dealershipConfig. Los campos para los que todavía no
   hay un dato real (código postal, provincia, coordenadas, redes
   sociales, horario en formato estructurado) se dejan sin valor y por
   eso no aparecen en el JSON-LD final: no se inventa nada.

   addressCountry se completa como 'AR' porque ya es un dato implícito
   en el proyecto (money() formatea con Intl.NumberFormat('es-AR',
   { currency: 'ARS' })), no un dato nuevo agregado sin fuente. */
function buildAutoDealerJsonLd() {
  const cfg = dealershipConfig;
  const branch = (cfg.branches && cfg.branches[0]) || null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: cfg.name,
    description: cfg.description || cfg.positioning,
    url: absoluteUrl('/'),
    logo: absoluteUrl(cfg.logo || 'assets/brand/logo.png'),
    image: absoluteUrl(SITE_CONFIG.ogImage)
  };

  // Teléfono fijo si existe; si no, el WhatsApp. Nunca los dos inventados.
  if (cfg.phone) data.telephone = cfg.phone;
  else if (cfg.whatsapp) data.telephone = '+' + cfg.whatsapp;

  if (branch) {
    const address = { '@type': 'PostalAddress' };
    if (branch.address) address.streetAddress = branch.address;
    if (branch.city) address.addressLocality = branch.city;
    if (branch.province) address.addressRegion = branch.province;
    if (branch.postalCode) address.postalCode = branch.postalCode;
    if (cfg.country) address.addressCountry = cfg.country;
    data.address = address;

    if (branch.hoursStructured && branch.hoursStructured.length) {
      data.openingHoursSpecification = branch.hoursStructured.map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.dayOfWeek,
        opens: h.opens,
        closes: h.closes
      }));
    }
  }

  if (cfg.geo && cfg.geo.latitude && cfg.geo.longitude) {
    data.geo = { '@type': 'GeoCoordinates', latitude: cfg.geo.latitude, longitude: cfg.geo.longitude };
  }

  if (cfg.sameAs && cfg.sameAs.length) data.sameAs = cfg.sameAs;

  return data;
}


/* ==========================================================
   1e. DATOS ESTRUCTURADOS DE UN VEHÍCULO (Vehicle + Offer)
   ----------------------------------------------------------
   Se usa SÓLO en la ficha, además del AutoDealer del negocio: son dos
   cosas distintas y Google las entiende por separado (quién vende, y qué
   se vende en esta página).

   Regla estricta: cada propiedad se agrega únicamente si hay un dato real
   cargado. Nada de rellenar con 0, con cadenas vacías ni con valores
   "razonables". Un Vehicle con menos propiedades pero todas ciertas vale
   más que uno completo a fuerza de inventar — y declarar datos falsos en
   structured data es motivo de penalización manual de Google.

   NO se incluyen aggregateRating ni review: la concesionaria no tiene
   reseñas propias cargadas, y ponerlas inventadas para conseguir estrellas
   en el resultado de búsqueda es exactamente lo que Google sanciona.

   El mismo JSON-LD lo genera también la Edge Function (ver
   netlify/edge-functions/vehiculo-meta.js) para los rastreadores que no
   ejecutan JS. Comparten el id "ld-vehiculo": si los dos corren, el
   segundo actualiza el bloque en lugar de duplicarlo.
========================================================== */
function buildVehicleJsonLd(car) {
  if (!car) return null;

  /* La URL se arma con absoluteUrl() sobre la ruta canónica, igual que el
     <link rel="canonical"> de la ficha: los datos estructurados tienen que
     declarar EXACTAMENTE la misma dirección que el canonical, o Google ve
     dos URLs distintas para la misma página.

     Ojo con no usar acá Rutas.urlAbsolutaVehiculo(): esa función cae al
     origen real del navegador cuando el dominio todavía es el placeholder,
     que es lo correcto para el link de WhatsApp (tiene que abrir hoy) pero
     no para el canonical (que declara la URL oficial del recurso). */
  const url = absoluteUrl(Rutas.rutaCanonica(car));

  const d = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: car.year ? `${car.name} ${car.year}` : car.name
  };
  if (url) d.url = url;

  if (car.marca) d.brand = { '@type': 'Brand', name: car.marca };
  if (car.modelo) d.model = car.modelo;
  if (car.year) d.vehicleModelDate = String(car.year);
  if (typeof car.km === 'number' && isFinite(car.km)) {
    d.mileageFromOdometer = { '@type': 'QuantitativeValue', value: car.km, unitCode: 'KMT' };
  }
  if (car.comb) d.fuelType = car.comb;
  if (car.trans) d.vehicleTransmission = car.trans;
  if (car.pue) d.numberOfDoors = Number(car.pue);
  if (car.pas) d.seatingCapacity = { '@type': 'QuantitativeValue', value: Number(car.pas) };
  if (car.desc) d.description = car.desc;

  const fotos = (car.photos || []).map((p) => absoluteUrl(p)).filter(Boolean);
  if (fotos.length) d.image = fotos;

  const oferta = {
    '@type': 'Offer',
    // Un usado es UsedCondition: es un dato del producto, no una opinión.
    itemCondition: 'https://schema.org/UsedCondition',
    availability: car.status === 'vendido'
      ? 'https://schema.org/SoldOut'
      : 'https://schema.org/InStock',
    seller: { '@type': 'AutoDealer', name: dealershipConfig.name }
  };
  if (url) oferta.url = url;
  // priceNum es null cuando la unidad va con "Consultar precio": ahí la
  // oferta existe pero sin importe, que es la verdad.
  if (typeof car.priceNum === 'number' && isFinite(car.priceNum)) {
    oferta.price = car.priceNum;
    oferta.priceCurrency = 'ARS';
  }
  d.offers = oferta;

  return d;
}


/* ==========================================================
   2. SIMULACIÓN DE CUOTA
   ----------------------------------------------------------
   La tasa NO está escondida dentro de la función: se edita acá.
   IMPORTANTE: 1,2 % mensual es el valor con el que venía la demo
   y es MUY inferior a las tasas reales del mercado argentino.
   Antes de mostrarle esto a un cliente, poner la tasa que ese
   cliente realmente ofrece, o la de la entidad con la que trabaja.
   El sitio muestra siempre la tasa usada y aclara que es una
   simulación, nunca una oferta.

   amount.max y term.max son el techo que usa la ficha para el
   "Desde $X por mes" (plazo más largo, sin anticipo: es el piso
   real de la cuota). No hay más simulador que ése. */

const FINANCING_CONFIG = {
  monthlyRate: 0.012,               // [DEMO] 1,2 % mensual
  amount: { max: 45000000 },
  term:   { max: 60 }
};


/* ==========================================================
   2b. FORMULARIO DE CONSULTA
   ----------------------------------------------------------
   Lo usa la ficha del vehículo (ver initMiniForm más abajo).

   PARA ACTIVARLO: pegar la URL del webhook de n8n en
   webhookUrl y poner enabled en true. Nada más.

   Mientras webhookUrl esté vacío el sitio funciona en modo
   demo: no hace ninguna petición y avisa en pantalla que la
   consulta todavía no se envía a ningún lado. Nunca le decimos
   al usuario que recibimos algo que en realidad se perdió.
========================================================== */

const FORM_CONFIG = {
  webhookUrl: '',
  enabled: false,
  timeoutMs: 10000,
  textos: {
    enviando: 'Enviando…',
    exito: 'Solicitud recibida. Nos vamos a contactar a la brevedad.',
    demo: 'Modo demo: el formulario está completo y validado, pero todavía no hay un webhook conectado, así que la solicitud no se envió.',
    error: 'Hubo un problema al enviar la solicitud. Intentá nuevamente o escribinos por WhatsApp.'
  }
};

function formsHabilitados() {
  return !!(FORM_CONFIG.enabled && FORM_CONFIG.webhookUrl);
}

/* Único punto de salida de los leads. Devuelve siempre un objeto
   { ok, demo?, error? } para que cada formulario decida qué mostrar. */
async function submitLead(payload) {
  if (!formsHabilitados()) return { ok: true, demo: true };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FORM_CONFIG.timeoutMs);

  try {
    const res = await fetch(FORM_CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        origen: window.location.href,
        enviadoEn: new Date().toISOString()
      }, payload)),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}


/* ---------- Validación ----------
   Cada regla devuelve true si el valor sirve. Los mensajes los
   define cada formulario, para que digan qué falta y no un
   "Error" genérico. */

const reglas = {
  requerido: (v) => v.trim().length > 0,
  telefono: (v) => v.replace(/\D/g, '').length >= 8
};

/* campos: [{ el, regla, mensaje }]
   Marca los inválidos, limpia los válidos y devuelve el primer error. */
function validarCampos(campos) {
  let primerError = null;

  campos.forEach((c) => {
    const ok = reglas[c.regla](c.el.value || '');
    c.el.classList.toggle('is-invalid', !ok);
    c.el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok && !primerError) primerError = c;
  });

  return primerError;
}

/* Limpia la marca de error de un campo en cuanto el usuario lo corrige. */
function limpiarErrorAlEscribir(campos, onLimpio) {
  campos.forEach((c) => {
    const evento = c.el.tagName === 'SELECT' ? 'change' : 'input';
    c.el.addEventListener(evento, () => {
      if (reglas[c.regla](c.el.value || '')) {
        c.el.classList.remove('is-invalid');
        c.el.setAttribute('aria-invalid', 'false');
        if (campos.every((x) => reglas[x.regla](x.el.value || '')) && onLimpio) onLimpio();
      }
    });
  });
}

/* Estado del botón mientras se envía: sin doble envío y perceptible
   también para un lector de pantalla. */
function setBotonEnviando(btn, enviando, textoOriginal) {
  btn.disabled = enviando;
  btn.setAttribute('aria-busy', enviando ? 'true' : 'false');
  btn.textContent = enviando ? FORM_CONFIG.textos.enviando : textoOriginal;
}


/* ==========================================================
   3. MENSAJES DE WHATSAPP
   ----------------------------------------------------------
   Cada botón manda un mensaje distinto según desde dónde se
   toca. Nunca repetir el mismo texto en dos lugares: el que
   recibe la consulta tiene que saber de dónde viene.
========================================================== */

const WA_MESSAGES = {
  nav: () => '¡Hola! Quiero hacer una consulta.',
  flotante: () => '¡Hola! Estoy viendo la web y quiero hacer una consulta.',
  cierre: () => '¡Hola! Vi la web y quiero que me ayuden a elegir un vehículo.',
  // La referencia (#id) le permite a la concesionaria identificar la
  // unidad exacta sin tener que preguntar.
  // Van con la URL de la ficha para que la concesionaria vea exactamente
  // la misma página que está mirando quien escribe. urlAbsolutaVehiculo()
  // saca el dominio de SITE_CONFIG.baseUrl — nunca hardcodeado acá — y
  // devuelve vacío si todavía no hay dominio real ni servidor (por
  // ejemplo, abriendo el sitio como archivo local): en ese caso el
  // mensaje sale sin link en vez de con una URL inventada que no abre.
  vehiculo: (car) => [
    `¡Hola! Quiero consultar por el ${car.name}${car.year ? ' ' + car.year : ''} (${car.price}).`,
    Rutas.urlAbsolutaVehiculo(car),
    `Ref: #${car.slug || car.id}.`
  ].filter(Boolean).join('\n'),

  visita: (car) => [
    `¡Hola! Quiero coordinar una visita para ver el ${car.name}${car.year ? ' ' + car.year : ''}.`,
    Rutas.urlAbsolutaVehiculo(car),
    `Ref: #${car.slug || car.id}. ¿Qué días tienen disponibles?`
  ].filter(Boolean).join('\n'),
  formError: () => '¡Hola! Quise enviar una consulta desde la web y me dio error. ¿Me ayudan por acá?'
};

/* Devuelve el link de WhatsApp ya armado. `kind` es una clave de
   WA_MESSAGES; `ctx` son los datos que ese mensaje necesite. */
function waLink(kind, ctx) {
  const build = WA_MESSAGES[kind] || WA_MESSAGES.nav;
  return `https://wa.me/${dealershipConfig.whatsapp}?text=${encodeURIComponent(build(ctx))}`;
}

/* Completa todos los <a data-wa="clave"> estáticos de la página.
   El link de la ficha (fichaWa/fichaWaVisit) se arma aparte, en
   ficha.js, porque depende del vehículo que se está mirando. */
/* De dónde salió el clic. Los nombres son los que se van a ver en GA4,
   así que se eligen legibles y estables: cambiarlos después parte las
   series históricas del informe. */
const WA_ORIGEN = {
  nav: 'nav',
  flotante: 'floating',
  cierre: 'closing',
  formError: 'form_error'
};

function initWhatsAppLinks(root) {
  (root || document).querySelectorAll('[data-wa]').forEach((a) => {
    a.href = waLink(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    // Se mide en 'click' y no en el href: el clic es la intención real.
    // gtag despacha por sendBeacon, así que el evento sobrevive aunque la
    // pestaña cambie de inmediato.
    a.addEventListener('click', () => {
      Analytics.track('whatsapp_click', {
        source: WA_ORIGEN[a.dataset.wa] || a.dataset.wa,
        // Los mismos botones (nav, flotante) existen en las dos páginas:
        // sin esto no se podría distinguir un clic desde la home de uno
        // desde una ficha. Se detecta por el contenedor de la ficha, que
        // sólo existe ahí.
        page_section: document.getElementById('fichaContent') ? 'ficha' : 'home'
      });
    });
  });
}


/* ==========================================================
   4. UTILIDADES COMPARTIDAS
========================================================== */

/* Precios en pesos argentinos. Si algún día se publica en otra
   moneda, este es el único lugar a tocar. */
function money(n) {
  const v = Math.round(n / 100) * 100;
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(v);
  } catch (e) {
    return '$ ' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}

/* Cuota del sistema francés. Una sola implementación, usada por el
   simulador de la home y por el "desde" de la ficha. */
function cuotaFrancesa(capital, meses, tasaMensual) {
  const r = tasaMensual === undefined ? FINANCING_CONFIG.monthlyRate : tasaMensual;
  if (capital <= 0 || meses <= 0) return 0;
  return capital * (r * Math.pow(1 + r, meses)) / (Math.pow(1 + r, meses) - 1);
}

function kmLabel(km) {
  // Defensivo: un vehículo "próximamente" (ver sección 5) puede no tener
  // km todavía. Sin esto se mostraba "NaN km" o "undefined km".
  if (typeof km !== 'number' || !isFinite(km)) return '';
  return km === 0 ? '0 km' : String(km).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' km';
}

function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* ----------------------------------------------------------
   ESCAPADO DE HTML — obligatorio para cualquier dato del stock

   Los datos de los vehículos los carga una persona desde el panel y
   llegan desde la base. Si se interpolan crudos dentro de una plantilla
   con innerHTML, un campo como marca o motor puede traer
   `<img src=x onerror=...>` y ese código se ejecuta en el navegador de
   TODOS los visitantes (XSS almacenado).

   No es un riesgo teórico ni "sólo si el admin es malicioso": si alguna
   vez le roban la contraseña al panel, el atacante no sólo edita autos —
   se queda con JavaScript persistente en la web pública, con el que
   puede cambiar el número de WhatsApp que ve la gente y quedarse con
   todas las consultas.

   Regla: TODO valor que venga del stock se pasa por acá antes de entrar
   en una plantilla. Para texto plano sigue siendo mejor textContent.
---------------------------------------------------------- */
/* ----------------------------------------------------------
   FOTO QUE NO CARGA

   Una foto puede fallar por muchas razones fuera de nuestro control: la
   borraron del Storage, el link quedó viejo, la conexión se cortó a mitad
   de la descarga. Sin manejarlo, el navegador dibuja su ícono de imagen
   rota, que en una ficha de auto se ve como un error del sitio.

   El reemplazo es CSS puro sobre el mismo <img>: no se cambia el src por
   otra imagen (eso agregaría una descarga que también puede fallar), se
   marca el elemento y la hoja de estilos dibuja un fondo neutro con la
   leyenda. Como el contenedor ya reserva el alto con aspect-ratio, el
   layout no se mueve ni un píxel.

   Se engancha en 'error' con captura, una sola vez para toda la página:
   sirve para las fotos que ya están y para las que se agreguen después
   (galería, similares, "mostrar más"), sin tener que acordarse en cada
   lugar donde se crea un <img>.
---------------------------------------------------------- */
function initFotoRespaldo(root) {
  const nodo = root || document;

  nodo.addEventListener('error', (ev) => {
    const img = ev.target;
    if (!img || img.tagName !== 'IMG') return;
    if (img.dataset.sinFoto === '1') return;   // ya marcada, no repetir
    img.dataset.sinFoto = '1';
    // alt vacío: el texto de respaldo ya lo pone el CSS y repetirlo haría
    // que un lector de pantalla lea la misma frase dos veces. Se guarda
    // el original para poder devolverlo si después carga bien.
    img.dataset.altPrevio = img.alt || '';
    img.classList.add('img-sin-foto');
    img.alt = '';
  }, true);   // captura: los eventos 'error' de <img> no burbujean

  /* La galería de la ficha reutiliza el MISMO <img> para todas las fotos.
     Si la primera falla y la segunda carga bien, sin esto la buena
     quedaría tapada por el respaldo de la anterior. */
  nodo.addEventListener('load', (ev) => {
    const img = ev.target;
    if (!img || img.tagName !== 'IMG') return;
    if (img.dataset.sinFoto !== '1') return;
    limpiarFotoRespaldo(img);
  }, true);
}

/* Saca la marca de "foto rota". Se llama sola cuando una imagen vuelve a
   cargar bien, y a mano justo antes de cambiarle el src a un <img> que se
   reutiliza, para que no se vea el respaldo de la foto anterior mientras
   baja la nueva. */
function limpiarFotoRespaldo(img) {
  if (!img || img.dataset.sinFoto !== '1') return;
  delete img.dataset.sinFoto;
  img.classList.remove('img-sin-foto');
  if (img.dataset.altPrevio !== undefined) {
    img.alt = img.dataset.altPrevio;
    delete img.dataset.altPrevio;
  }
}

function escHtml(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ==========================================================
   5. STOCK
   ----------------------------------------------------------
   ACÁ VA EL STOCK REAL. Para agregar, sacar o editar un auto se
   toca sólo este array: catálogo, destacados y ficha se
   actualizan solos porque todos leen de acá.

   Obligatorios: id (único), brand, model, year, price, km,
   fuel, transmission, photos.

   Opcionales (si no están, esa fila no aparece en la ficha):
   engine, traction, consumption, seats, doors, segment,
   description, badge, oldPrice, status.

   photos: array de imágenes. Una sola foto es un caso válido y
   la ficha se adapta (no muestra miniaturas ni flechas). NUNCA
   repetir la misma foto para simular una galería.

   status: 'disponible' | 'reservado' | 'vendido' | 'proximamente'.

   'proximamente': unidad cargada con la foto y marca/modelo
   identificados, pero SIN ficha técnica todavía (año, precio, km,
   combustible, transmisión, etc. no se inventan — quedan sin
   completar hasta tener el dato real). Estas unidades:
     - SÍ aparecen en el catálogo público, los filtros (como marca/
       modelo) y "Similares", con badge "Próximamente" y precio
       "Consultar precio" en vez de los datos que todavía no están
       (ver cardBadge/cardLine/buildCatalog más abajo).
     - NO aparecen si se filtra por año, precio, combustible o
       transmisión (no tienen ese dato para matchear) ni ganan el
       orden por precio/año/km (quedan siempre al final — ver
       initCatalog en app.js).
     - Su ficha.html?id=N lleva noindex automático (ver renderFicha
       en ficha.js) y no entra en sitemap.xml, para no indexar una
       página con ficha técnica incompleta mientras tanto.
   Para completar una de estas unidades: cargar sus datos reales en
   el objeto de abajo y sacarle status: 'proximamente' (o pasarlo a
   'disponible').

   HOY ninguna unidad usa 'proximamente': el mecanismo queda
   disponible para cuando entre un auto del que todavía no se tenga
   la ficha técnica y se quiera publicar igual la foto.

   Las fichas técnicas son datos públicos del modelo. Cuando un
   dato no se puede afirmar con certeza para la unidad concreta
   (el consumo real, por ejemplo), se deja vacío en lugar de
   inventarlo.
========================================================== */

const vehicles = [
  {
    id: 1,
    brand: 'Toyota',
    model: 'Corolla XEI',
    year: 2023,
    price: 28500000,
    km: 32000,
    fuel: 'Nafta',
    transmission: 'CVT',
    engine: '2.0 16v',
    traction: 'Delantera',
    segment: 'Sedán',
    seats: 5,
    doors: 4,
    consumption: '',
    description: 'Sedán de 2.0 con caja CVT. Andar silencioso y cómodo para uso diario y viajes largos, con el respaldo de uno de los modelos más buscados del mercado.',
    status: 'disponible',
    photos: ['assets/images/vehicle-1.jpg']
  },
  {
    id: 2,
    brand: 'Volkswagen',
    model: 'T-Cross Highline',
    year: 2024,
    price: 34900000,
    km: 18000,
    fuel: 'Nafta',
    transmission: 'Automática',
    engine: '1.4 TSI',
    traction: 'Delantera',
    segment: 'SUV',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'SUV compacta en su versión full, con motor turbo 1.4 y caja automática. Buena altura al piso y baúl amplio para uso familiar.',
    status: 'disponible',
    photos: ['assets/images/vehicle-2.jpg']
  },
  {
    id: 3,
    brand: 'Ford',
    model: 'Ranger XLT',
    year: 2023,
    price: 42500000,
    oldPrice: 44900000,
    km: 41000,
    fuel: 'Diésel',
    transmission: 'Automática',
    engine: '',
    traction: '4x4',
    segment: 'Pick-up',
    seats: 5,
    doors: 4,
    consumption: '',
    description: 'Pick-up doble cabina 4x4 con caja automática. Pensada para trabajo y viaje, con capacidad de carga y remolque.',
    status: 'disponible',
    photos: ['assets/images/vehicle-3.jpg']
  },
  {
    id: 4,
    brand: 'Fiat',
    model: 'Cronos Precision',
    year: 2024,
    price: 23500000,
    km: 15000,
    fuel: 'Nafta',
    transmission: 'Automática',
    engine: '1.3 Firefly',
    traction: 'Delantera',
    segment: 'Sedán',
    seats: 5,
    doors: 4,
    consumption: '',
    description: 'La versión tope de gama del Cronos, con pocos kilómetros. Sedán económico de mantener y con buen espacio interior.',
    status: 'disponible',
    photos: ['assets/images/vehicle-4.jpg']
  },
  {
    id: 5,
    brand: 'Peugeot',
    model: '208 GT',
    year: 2023,
    price: 27800000,
    oldPrice: 29900000,
    km: 27000,
    fuel: 'Nafta',
    transmission: 'Automática',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Hatchback en la versión más equipada de la gama. Manejo ágil en ciudad y terminación interior por encima del segmento.',
    status: 'disponible',
    photos: ['assets/images/vehicle-5.jpg']
  },
  {
    id: 6,
    brand: 'Renault',
    model: 'Duster Iconic',
    year: 2024,
    price: 29900000,
    km: 21000,
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'SUV',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'SUV robusta con buena altura al piso, pensada para camino de tierra y uso mixto. Versión Iconic, la más equipada.',
    status: 'disponible',
    photos: ['assets/images/vehicle-6.jpg']
  },

  /* ==========================================================
     [DEMO] UNIDADES 7 A 23 — DATOS DE EJEMPLO, NO REALES
     ----------------------------------------------------------
     De estas unidades lo ÚNICO verificado es la marca y el modelo
     (identificados desde la foto). Año, precio, kilómetros, motor,
     transmisión y descripción están INVENTADOS para que la demo se
     vea completa al presentársela al cliente.

     ⚠️ ANTES DE PUBLICAR: reemplazar cada uno de estos objetos por
     el stock real con sus datos reales. Publicar estas cifras tal
     como están sería publicitar vehículos que no existen con
     precios y kilometrajes que nadie puede respaldar.

     Las fotos también son de demo (ver nota aparte): varias tienen
     marca de agua o patente visible de terceros.
  ========================================================== */
  {
    id: 7,
    brand: 'Renault',
    model: 'Kangoo Express',
    year: 2019,                       // [DEMO]
    price: 19800000,                  // [DEMO]
    km: 96000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Utilitario',
    seats: 2,
    doors: 4,
    consumption: '',
    description: 'Furgón utilitario de dos plazas con amplio espacio de carga y piso plano. Pensado para reparto y uso comercial diario, con mecánica simple y mantenimiento económico.',
    status: 'disponible',
    photos: ['assets/images/vehicle-7.jpg']
  },
  {
    id: 8,
    brand: 'Fiat',
    model: 'Cronos Drive',
    year: 2022,                       // [DEMO]
    price: 21900000,                  // [DEMO]
    km: 48000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.3 Firefly',
    traction: 'Delantera',
    segment: 'Sedán',
    seats: 5,
    doors: 4,
    consumption: '',
    description: 'Sedán compacto con muy buen aprovechamiento del espacio interior y uno de los baúles más grandes del segmento. Motor Firefly de consumo contenido, cómodo tanto en ciudad como en ruta.',
    status: 'disponible',
    photos: ['assets/images/vehicle-8.jpg']
  },
  {
    id: 9,
    brand: 'Renault',
    model: 'Sandero Authentique',
    year: 2018,                       // [DEMO]
    price: 15900000,                  // [DEMO]
    km: 87000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 8v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Hatchback de habitáculo amplio y buena altura al piso para el uso urbano. Mecánica conocida, repuestos accesibles y un costo de mantenimiento bajo.',
    status: 'disponible',
    photos: ['assets/images/vehicle-9.jpg']
  },
  {
    id: 10,
    brand: 'Fiat',
    model: 'Cronos Precision',
    year: 2023,                       // [DEMO]
    price: 24800000,                  // [DEMO]
    km: 29000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'CVT',
    engine: '1.3 Firefly',
    traction: 'Delantera',
    segment: 'Sedán',
    seats: 5,
    doors: 4,
    consumption: '',
    description: 'Versión tope de gama con caja automática CVT y pocos kilómetros. Equipamiento completo, pantalla central y sensores de estacionamiento para el uso diario.',
    status: 'disponible',
    photos: ['assets/images/vehicle-10.jpg']
  },
  {
    id: 11,
    brand: 'Fiat',
    model: 'Palio Attractive',
    year: 2015,                       // [DEMO]
    price: 11500000,                  // [DEMO]
    km: 124000,                       // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.4 8v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Hatchback compacto ideal como primer auto o segundo vehículo familiar. Mecánica probada, repuestos económicos y buen comportamiento en ciudad.',
    status: 'disponible',
    photos: ['assets/images/vehicle-11.jpg']
  },
  {
    id: 12,
    brand: 'Fiat',
    model: 'Punto Attractive',
    year: 2013,                       // [DEMO]
    price: 10900000,                  // [DEMO]
    km: 138000,                       // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.4 8v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Interior espacioso para el segmento y terminación de diseño italiano. Suspensión cómoda y buen andar en ruta, con baúl bien aprovechable.',
    status: 'disponible',
    photos: ['assets/images/vehicle-12.jpg']
  },
  {
    id: 13,
    brand: 'Ford',
    model: 'Fiesta Kinetic SE',
    year: 2016,                       // [DEMO]
    price: 14200000,                  // [DEMO]
    km: 98000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Sedán',
    seats: 5,
    doors: 4,
    consumption: '',
    description: 'Uno de los mejores chasis de su generación: dirección precisa y andar firme en ruta. Sedán con baúl amplio y equipamiento completo para viajar.',
    status: 'disponible',
    photos: ['assets/images/vehicle-13.jpg']
  },
  {
    id: 14,
    brand: 'Ford',
    model: 'EcoSport XLS',
    year: 2012,                       // [DEMO]
    price: 13800000,                  // [DEMO]
    km: 142000,                       // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 8v',
    traction: 'Delantera',
    segment: 'SUV',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'SUV compacta con buena altura al piso, cómoda para calles irregulares y camino de tierra. Mecánica robusta y de mantenimiento simple.',
    status: 'disponible',
    photos: ['assets/images/vehicle-14.jpg']
  },
  {
    id: 15,
    brand: 'Peugeot',
    model: 'Expert Confort',
    year: 2020,                       // [DEMO]
    price: 26500000,                  // [DEMO]
    km: 78000,                        // [DEMO]
    fuel: 'Diésel',
    transmission: 'Manual',
    engine: '1.6 HDi',
    traction: 'Delantera',
    segment: 'Utilitario',
    seats: 3,
    doors: 4,
    consumption: '',
    description: 'Furgón de gran volumen de carga con motor diésel de bajo consumo. Pensado para trabajo intensivo, reparto de bultos grandes y logística urbana.',
    status: 'disponible',
    photos: ['assets/images/vehicle-15.jpg']
  },
  {
    id: 16,
    brand: 'Renault',
    model: 'Kwid Intense',
    year: 2022,                       // [DEMO]
    price: 16900000,                  // [DEMO]
    km: 34000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.0 12v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Citycar con estética de SUV y altura al piso por encima del promedio. Muy económico de usar y fácil de maniobrar: una gran opción como primer auto.',
    status: 'disponible',
    photos: ['assets/images/vehicle-16.jpg']
  },
  {
    id: 17,
    brand: 'Renault',
    model: 'Captur Intens',
    year: 2019,                       // [DEMO]
    price: 22400000,                  // [DEMO]
    km: 71000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'CVT',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'SUV',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'SUV con caja automática CVT y puesto de conducción elevado. Interior bien terminado, buen aislamiento acústico y baúl amplio para viajes en familia.',
    status: 'disponible',
    photos: ['assets/images/vehicle-17.jpg']
  },
  {
    id: 18,
    brand: 'Fiat',
    model: 'Argo Drive',
    year: 2019,                       // [DEMO]
    price: 17500000,                  // [DEMO]
    km: 62000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.3 Firefly',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Hatchback moderno con motor Firefly, ágil en ciudad y cómodo en ruta. Buen nivel de seguridad de serie y pantalla multimedia central.',
    status: 'disponible',
    photos: ['assets/images/vehicle-18.jpg']
  },
  {
    id: 19,
    brand: 'Peugeot',
    model: '308 Active',
    year: 2018,                       // [DEMO]
    price: 18900000,                  // [DEMO]
    km: 84000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Hatchback de andar noble y suspensión cómoda, con una terminación interior por encima de lo habitual en el segmento. Muy buen auto para hacer kilómetros.',
    status: 'disponible',
    photos: ['assets/images/vehicle-19.jpg']
  },
  {
    id: 20,
    brand: 'Peugeot',
    model: '2008 Allure',
    year: 2019,                       // [DEMO]
    price: 21800000,                  // [DEMO]
    oldPrice: 23500000,               // [DEMO]
    km: 69000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Automática',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'SUV',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'SUV urbana con caja automática, buena altura al piso y baúl generoso. Combina el manejo liviano de un hatchback con la posición de manejo elevada de una SUV.',
    status: 'disponible',
    photos: ['assets/images/vehicle-20.jpg']
  },
  {
    id: 21,
    brand: 'Peugeot',
    model: '308 Feline',
    year: 2017,                       // [DEMO]
    price: 17200000,                  // [DEMO]
    km: 96000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Versión más equipada de la gama, con techo panorámico y tapizados de mayor calidad. Pensado para quien busca confort de viaje en un auto compacto.',
    status: 'disponible',
    photos: ['assets/images/vehicle-21.jpg']
  },
  {
    id: 22,
    brand: 'Peugeot',
    model: '208 Allure',
    year: 2020,                       // [DEMO]
    price: 19400000,                  // [DEMO]
    km: 58000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Automática',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Hatchback con caja automática, muy cómodo para el tránsito diario. Interior cuidado, dirección liviana y buen nivel de equipamiento de confort.',
    status: 'reservado',
    photos: ['assets/images/vehicle-22.jpg']
  },
  {
    id: 23,
    brand: 'Peugeot',
    model: '208 Active',
    year: 2021,                       // [DEMO]
    price: 20600000,                  // [DEMO]
    km: 41000,                        // [DEMO]
    fuel: 'Nafta',
    transmission: 'Manual',
    engine: '1.6 16v',
    traction: 'Delantera',
    segment: 'Hatchback',
    seats: 5,
    doors: 5,
    consumption: '',
    description: 'Última generación del 208, con diseño renovado y puesto de conducción moderno. Manejo preciso, consumo bajo y pocos kilómetros para el año.',
    status: 'disponible',
    photos: ['assets/images/vehicle-23.jpg']
  }
];


/* ==========================================================
   6. MODELO INTERNO
========================================================== */

function buildCatalog() {
  // Slugs del stock de demo. En Supabase los genera el trigger al insertar
  // y quedan guardados; acá no hay base donde guardarlos, así que se
  // calculan igual que allá (marca + modelo + versión + año, que son los
  // datos que no cambian) y con la misma resolución de colisiones. Un
  // vehículo puede traer su propio `slug` y entonces manda ese.
  const slugsUsados = new Set();
  const slugs = vehicles.map((v) =>
    v.slug
      ? Rutas.slugUnico(v.slug, slugsUsados)
      : Rutas.slugUnico(Rutas.slugDeVehiculo({
          marca: v.brand, modelo: v.model, version: v.version, year: v.year
        }), slugsUsados)
  );

  return vehicles.map((v, i) => {
    const photos = (v.photos && v.photos.length) ? v.photos.slice() : (v.image ? [v.image] : []);
    // Defensivo: una unidad 'proximamente' (ver sección 5) puede no tener
    // precio todavía. Sin esto, money(undefined) mostraba "$ NaN".
    const tienePrecio = typeof v.price === 'number' && isFinite(v.price) && v.price > 0;
    const oldPrice = tienePrecio && v.oldPrice && v.oldPrice > v.price ? v.oldPrice : 0;

    return {
      id: v.id,              // identificador interno estable
      slug: slugs[i],        // identificador legible para la URL
      marca: v.brand,
      modelo: v.model,
      name: v.brand + ' ' + v.model,
      year: v.year || '',
      km: v.km,
      seg: v.segment || '',
      motor: v.engine || '',
      comb: v.fuel || '',
      trans: v.transmission || '',
      tracc: v.traction || '',
      cons: v.consumption || '',
      pas: v.seats || '',
      pue: v.doors || '',
      desc: v.description || '',
      status: v.status || 'disponible',
      price: tienePrecio ? money(v.price) : 'Consultar precio',
      priceNum: tienePrecio ? v.price : null,
      oldPrice: oldPrice ? money(oldPrice) : '',
      badges: v.badges || dealershipConfig.trustBadges,
      photos: photos
    };
  });
}

/* Selección curada para el carrusel de Destacados.
   Se filtran los ids que ya no existen, así borrar un auto del
   stock nunca rompe la home. */
function getFeatured(allCars) {
  const featuredIds = [2, 3, 5, 1];
  return featuredIds
    .map((id) => allCars.find((c) => c.id === id))
    .filter(Boolean);
}


/* ==========================================================
   7. TARJETA DE VEHÍCULO
   ----------------------------------------------------------
   Se define una sola vez y la usan el catálogo y los "similares"
   de la ficha, para que no se desincronicen.
========================================================== */

/* Etiqueta que va arriba a la izquierda de la foto.
   El estado de la unidad manda por sobre el badge comercial. */
/* El único cartel que se dibuja sobre la foto es el ESTADO real de la
   unidad. Las etiquetas comerciales libres ("Nuevo ingreso",
   "Oportunidad") se sacaron: eran decoración sobre la imagen, no
   información que haga falta para evaluar el auto. */
function cardBadge(c) {
  if (c.status === 'proximamente') return { text: 'Próximamente', cls: 'badge-dark' };
  if (c.status === 'vendido') return { text: 'Vendido', cls: 'badge-dark' };
  if (c.status === 'reservado') return { text: 'Reservado', cls: 'badge-dark' };
  return null;
}

/* Precio actual y, si hubo rebaja, el anterior tachado al lado. Sin la
   pastilla roja con el porcentaje: los dos precios juntos ya dicen que
   bajó, y el -7% era una etiqueta de más sobre la tarjeta. */
function priceBlock(c) {
  const precio = escHtml(c.price);
  if (!c.oldPrice) return `<span class="card-price">${precio}</span>`;
  return `
    <span class="card-price-group">
      <span class="card-price">${precio}</span>
      <span class="card-oldprice">${escHtml(c.oldPrice)}</span>
    </span>`;
}

/* Línea "2023 · 32.000 km · CVT" de la tarjeta. Una unidad 'proximamente'
   (ver sección 5) puede no tener todavía alguno de estos tres datos —
   se arma sólo con los que sí están, para no dejar " · · " o "undefined"
   a la vista. Si no hay ninguno, la línea directamente no se muestra. */
function cardLine(c) {
  return [c.year, kmLabel(c.km), c.trans].filter(Boolean).join(' · ');
}

function createCarCard(c) {
  const card = el('a', 'car-card');
  card.href = Rutas.rutaVehiculo(c);
  const badge = cardBadge(c);
  const linea = cardLine(c);
  // Todo lo que sale del stock va escapado: ver escHtml() en la sección 4.
  card.innerHTML = `
    <div class="car-card-media">
      <img src="${escHtml(c.photos[0])}" alt="${escHtml(c.name + (c.year ? ' ' + c.year : ''))}" loading="lazy" decoding="async">
      ${badge ? `<span class="badge ${escHtml(badge.cls)}">${escHtml(badge.text)}</span>` : ''}
    </div>
    <div class="car-card-body">
      <div class="car-card-name">${escHtml(c.name)}</div>
      ${linea ? `<div class="car-card-line">${escHtml(linea)}</div>` : ''}
      <div class="car-card-price-row">
        ${priceBlock(c)}
        <span class="car-card-cta">Ver ficha →</span>
      </div>
    </div>`;

  // select_vehicle: el paso del catálogo a la ficha. Es el escalón del
  // embudo que muestra qué unidades despiertan interés aunque después no
  // terminen en consulta.
  card.addEventListener('click', () => {
    Analytics.track('select_vehicle', Object.assign(
      Analytics.paramsVehiculo(c),
      { page_section: card.dataset.origen || 'catalog' }
    ));
  });

  return card;
}


/* ==========================================================
   8. MINI FORMULARIO (prefijo 'vf', el de la ficha del vehículo)
   ----------------------------------------------------------
   PENDIENTE: hoy esto NO envía la consulta a ningún lado.
   Antes de publicar hay que conectarlo a un webhook real (n8n)
   con estados de carga y error — ver FORM_CONFIG más arriba.

   Queda parametrizada por prefijo (no hardcodeada a 'vf') por si
   el día de mañana se agrega otro formulario en el sitio: alcanza
   con llamar initMiniForm('xx', contexto) sobre un bloque con los
   mismos ids (xxSend, xxPending, xxSuccess, etc.). */

function initMiniForm(prefix, contexto) {
  const sendBtn = document.getElementById(prefix + 'Send');
  const pending = document.getElementById(prefix + 'Pending');
  const success = document.getElementById(prefix + 'Success');
  const successMsg = document.getElementById(prefix + 'SuccessMsg');
  const nombre = document.getElementById(prefix + 'Nombre');
  const telefono = document.getElementById(prefix + 'Telefono');
  const mensaje = document.getElementById(prefix + 'Mensaje');
  const error = document.getElementById(prefix + 'Error');
  if (!sendBtn) return { reset() {} };

  const textoBoton = sendBtn.textContent;
  let enviando = false;

  const campos = [
    { el: nombre, regla: 'requerido', mensaje: 'Escribí tu nombre para saber con quién hablamos.' },
    { el: telefono, regla: 'telefono', mensaje: 'Completá tu teléfono para poder contactarte.' },
    { el: mensaje, regla: 'requerido', mensaje: 'Contanos qué estás buscando.' }
  ];

  const ocultarError = () => { if (error) error.hidden = true; };
  const mostrarError = (texto, conWhatsapp) => {
    if (!error) return;
    error.innerHTML = conWhatsapp
      ? `${texto} <a href="${waLink('formError')}" target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.`
      : texto;
    error.hidden = false;
  };

  limpiarErrorAlEscribir(campos, ocultarError);

  sendBtn.addEventListener('click', async () => {
    if (enviando) return;                       // corta el doble click

    const fallo = validarCampos(campos);
    if (fallo) {
      mostrarError(fallo.mensaje, false);
      fallo.el.focus();
      return;
    }
    ocultarError();

    // contact_click: intención de contacto por formulario. Se manda el
    // vehículo desde el que se consulta, NUNCA el nombre, el teléfono ni
    // el mensaje — de hecho track() los descartaría aunque se intentara.
    Analytics.track('contact_click', Object.assign(
      { method: 'form', page_section: 'ficha' },
      contexto && contexto.vehiculoId ? { vehicle_id: String(contexto.vehiculoId) } : {}
    ));

    enviando = true;
    setBotonEnviando(sendBtn, true, textoBoton);

    const res = await submitLead(Object.assign({
      formulario: prefix,
      nombre: nombre.value.trim(),
      telefono: telefono.value.trim(),
      mensaje: mensaje.value.trim()
    }, contexto || {}));

    enviando = false;
    setBotonEnviando(sendBtn, false, textoBoton);

    if (!res.ok) {
      // Los datos quedan como estaban: el usuario reintenta sin reescribir.
      mostrarError(FORM_CONFIG.textos.error, true);
      sendBtn.focus();
      return;
    }

    // generate_lead es el nombre recomendado por GA4 para un contacto
    // concretado: usarlo (y no uno propio) hace que GA4 lo entienda como
    // conversión sin configuración extra. En modo demo el formulario no
    // envía a ningún lado, así que tampoco se cuenta como lead: contarlo
    // sería inflar la estadística con algo que no pasó.
    if (!res.demo) {
      Analytics.track('generate_lead', Object.assign(
        { method: 'form', page_section: 'ficha' },
        contexto && contexto.vehiculoId ? { vehicle_id: String(contexto.vehiculoId) } : {}
      ));
    }

    if (successMsg) {
      successMsg.textContent = res.demo ? FORM_CONFIG.textos.demo : FORM_CONFIG.textos.exito;
    }
    success.classList.toggle('is-demo', !!res.demo);
    pending.hidden = true;
    success.hidden = false;
    success.focus();
  });

  return {
    reset() {
      campos.forEach((c) => {
        c.el.value = '';
        c.el.classList.remove('is-invalid');
        c.el.setAttribute('aria-invalid', 'false');
      });
      ocultarError();
      setBotonEnviando(sendBtn, false, textoBoton);
      enviando = false;
      pending.hidden = false;
      success.hidden = true;
    }
  };
}


/* ==========================================================
   9. CONTENIDO QUE SALE DE LA CONFIGURACIÓN
   ----------------------------------------------------------
   Marcas, estadísticas, sucursales, imagen de "Nosotros" y
   footer. Todo esto se arma desde dealershipConfig para que
   adaptar la demo a un cliente sea editar un objeto.
========================================================== */

/* ---------- Revelado al scroll ----------
   Un solo observador para toda la página. Cada elemento se revela una
   vez y se deja de observar. Si el navegador no lo soporta o el sistema
   pide movimiento reducido, todo aparece directamente visible. */
function initReveal() {
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elementos = document.querySelectorAll('[data-reveal]');
  if (!elementos.length) return;

  document.documentElement.classList.add('js-reveal');

  if (quieto || !('IntersectionObserver' in window)) {
    elementos.forEach((e) => e.classList.add('is-visible'));
    return;
  }

  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  elementos.forEach((e) => obs.observe(e));
}

function initConfigContent(cars) {
  const cfg = dealershipConfig;

  // — Franja de marcas —
  const brandsLabel = document.getElementById('brandsLabel');
  if (brandsLabel && cfg.brandsLabel) brandsLabel.textContent = cfg.brandsLabel;

  const brandLogos = document.getElementById('brandLogos');
  if (brandLogos) {
    brandLogos.innerHTML = '';
    cfg.brands.forEach((b) => {
      const box = el('div', 'brand-logo');
      box.innerHTML = `<img src="${escHtml(b.logo)}" alt="${escHtml(b.name)}">`;
      brandLogos.appendChild(box);
    });
  }

  // — Sucursales, en el pie de las dos páginas —
  const branchList = document.getElementById('branchList');
  if (branchList) {
    branchList.innerHTML = '';
    cfg.branches.forEach((b) => {
      const card = el('div', 'branch-card');
      const titulo = [b.name, b.city].filter(Boolean).join(' · ');
      card.innerHTML = `<h3>${escHtml(titulo)}</h3><p>${escHtml(b.address)}<br>${escHtml(b.hours)}</p>`;
      branchList.appendChild(card);
    });
  }

  // — Textos que salen de la configuración —
  document.querySelectorAll('[data-config="name"]').forEach((n) => { n.textContent = cfg.name; });
  document.querySelectorAll('[data-config="positioning"]').forEach((n) => { n.textContent = cfg.positioning; });
  document.querySelectorAll('[data-config="year"]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });

  initWhatsAppLinks();
  // Después de inyectar el contenido de configuración, para que lo
  // que se arma desde acá también entre en el observador.
  initReveal();
}
