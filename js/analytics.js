/* =====================================================================
   analytics.js — capa única de medición.

   TODO lo que se mide pasa por acá. No hay una sola llamada a gtag()
   suelta en el resto del código: si mañana se cambia GA4 por otra
   herramienta, se toca este archivo y nada más.

   DECISIÓN: GA4 directo (gtag.js), NO Google Tag Manager.
   GTM sirve cuando alguien de marketing necesita agregar o cambiar
   etiquetas sin tocar el código ni esperar un deploy. Acá los eventos
   salen del propio código (hay que saber qué vehículo se miró, qué filtro
   se usó), así que GTM sólo agregaría ~100 KB, un panel más que mantener
   y un contenedor que puede desincronizarse del sitio. Si más adelante se
   suman el píxel de Meta Ads, Google Ads y otros, ahí GTM empieza a
   convenir — y migrar es fácil justamente porque todo pasa por track().

   SI NO HAY MEASUREMENT ID, este archivo no carga nada y no rompe nada:
   track() sigue existiendo y simplemente no envía. Lo mismo si un
   bloqueador de publicidad corta gtag: el sitio funciona igual, porque
   ninguna funcionalidad depende de que esto ande.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ===================================================================
     1. CONFIGURACIÓN — es lo único que hay que tocar
     =================================================================== */
  const ANALYTICS_CONFIG = {
    /* Pegar acá el Measurement ID de GA4. Se saca de:
       Google Analytics → Administrar → Flujos de datos → (el flujo web)
       Tiene la forma G-XXXXXXXXXX.

       Mientras esté vacío NO se carga gtag y no se envía nada: el sitio
       anda normal. No hay ningún ID de ejemplo puesto a propósito —
       un ID inventado mandaría datos a una propiedad ajena. */
    measurementId: '',

    /* CONSENTIMIENTO (Consent Mode v2 de Google).

       El sitio opera en Argentina, bajo la Ley 25.326 de Protección de
       Datos Personales. A diferencia del RGPD europeo, no exige
       consentimiento previo para analítica propia con datos no
       identificables. Por eso el valor por defecto es false.

       Poniéndolo en true, el consentimiento arranca DENEGADO y no se
       mide nada hasta que alguien llame a Analytics.otorgarConsentimiento().
       Esa es la pieza que hay que activar si algún día:
         - el sitio apunta a visitantes de la Unión Europea, o
         - se suman píxeles de publicidad (Meta, Google Ads), que sí
           tienen otro encuadre.

       A propósito NO se incluye ningún banner de cookies: un banner que
       no corta de verdad las cookies es peor que no tenerlo. Cuando haga
       falta, el banner llama a otorgarConsentimiento() y recién ahí
       empieza la medición — el corte es real. */
    requerirConsentimiento: false,

    /* Con true, cada evento se imprime en la consola. No hace falta
       tocarlo: se activa solo agregando ?debug_analytics=1 a la URL. */
    debug: false
  };

  /* ===================================================================
     2. PARÁMETROS PERMITIDOS — la defensa contra mandar datos personales
     ===================================================================
     track() descarta cualquier parámetro que no esté en esta lista. No es
     una convención que haya que recordar: es estructural. Aunque alguien
     más adelante escriba track('x', { telefono: ... }) por error, ese dato
     no sale del navegador.

     Por eso mismo acá NO hay ningún campo de texto libre: el nombre, el
     teléfono y el mensaje del formulario de contacto nunca se envían. De
     un lead se mide que ocurrió y desde qué vehículo, nunca quién es. */
  const PARAMS_PERMITIDOS = new Set([
    // vehículo
    'vehicle_id', 'vehicle_slug', 'vehicle_brand', 'vehicle_model',
    'vehicle_year', 'vehicle_price', 'vehicle_status',
    // comercio
    'currency', 'value',
    // contexto de la acción
    'source', 'page_section', 'cta_label', 'cta_target', 'method',
    // catálogo
    'filter_name', 'filter_value', 'sort_by',
    'results_count', 'filters_active', 'shown_count'
  ]);

  /* ===================================================================
     3. Estado interno
     =================================================================== */
  let listo = false;          // gtag cargado
  let habilitado = false;     // hay ID configurado
  const cola = [];            // eventos disparados antes de que gtag cargue
  const yaEnviados = new Set(); // control de duplicados

  function debugActivo() {
    if (ANALYTICS_CONFIG.debug) return true;
    try {
      if (new URLSearchParams(location.search).has('debug_analytics')) return true;
      return localStorage.getItem('debug_analytics') === '1';
    } catch (e) {
      return false;   // modo privado, storage bloqueado: no es un error
    }
  }
  const DEBUG = debugActivo();

  function log(...args) {
    if (DEBUG) console.log('%c[analytics]', 'color:#C8102E;font-weight:bold', ...args);
  }

  /* ===================================================================
     4. Carga de gtag
     =================================================================== */
  function init() {
    const id = String(ANALYTICS_CONFIG.measurementId || '').trim();

    if (!id) {
      log('sin measurementId: no se carga GA4. El sitio funciona igual.');
      if (DEBUG) log('los eventos se van a mostrar acá igual, para poder probarlos.');
      return;
    }
    if (!/^G-[A-Z0-9]+$/i.test(id)) {
      console.warn('[analytics] measurementId con formato raro:', id, '— se esperaba G-XXXXXXXXXX');
    }

    habilitado = true;

    // dataLayer y gtag tienen que existir ANTES de que cargue el script:
    // así los eventos disparados durante la carga no se pierden.
    global.dataLayer = global.dataLayer || [];
    function gtag() { global.dataLayer.push(arguments); }
    global.gtag = gtag;

    // Consent Mode v2: los defaults van antes del config, si no llegan tarde.
    if (ANALYTICS_CONFIG.requerirConsentimiento) {
      gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
      });
      log('consentimiento requerido: medición en pausa hasta otorgarlo.');
    }

    gtag('js', new Date());
    gtag('config', id, {
      // Las UTM las lee GA4 solo de la URL de entrada. La navegación
      // interna no las arrastra y no hace falta: la atribución queda
      // fijada en la sesión, no en cada página.
      send_page_view: true,
      // Sin esto GA4 recorta la URL; con las fichas en /vehiculos/<slug>
      // interesa saber exactamente qué vehículo se vio.
      page_path: location.pathname + location.search,
      debug_mode: DEBUG
    });

    // async + al final: no bloquea el primer pintado. Si el script no
    // llega (sin red, bloqueador), no pasa nada más que no medir.
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    s.onerror = () => log('gtag bloqueado o sin red. El sitio sigue normal.');
    document.head.appendChild(s);

    listo = true;
    vaciarCola();
    log('GA4 inicializado', id, DEBUG ? '(debug_mode activo)' : '');
  }

  function vaciarCola() {
    while (cola.length) {
      const [evento, params] = cola.shift();
      enviar(evento, params);
    }
  }

  function enviar(evento, params) {
    if (!habilitado || typeof global.gtag !== 'function') return;
    try {
      global.gtag('event', evento, params);
    } catch (e) {
      // Medir nunca puede romper el sitio.
      log('falló el envío de', evento, e.message);
    }
  }

  /* ===================================================================
     5. track() — el único punto de entrada
     ===================================================================
     opciones.unaVezPor: clave para no repetir el mismo evento en esta
     carga de página. Es lo que evita que view_vehicle se dispare dos
     veces si algo vuelve a renderizar la ficha. */
  function track(evento, params, opciones) {
    if (!evento) return false;
    const opts = opciones || {};

    if (opts.unaVezPor) {
      const clave = evento + ':' + opts.unaVezPor;
      if (yaEnviados.has(clave)) {
        log('descartado por duplicado:', clave);
        return false;
      }
      yaEnviados.add(clave);
    }

    // Filtrado por lista blanca: lo que no está permitido, no sale.
    const limpio = {};
    const descartados = [];
    Object.keys(params || {}).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === '') return;
      if (!PARAMS_PERMITIDOS.has(k)) { descartados.push(k); return; }
      limpio[k] = typeof v === 'string' ? v.slice(0, 100) : v;
    });
    if (descartados.length) {
      console.warn('[analytics] parámetros descartados por no estar permitidos:', descartados,
        '— si hacen falta, agregarlos a PARAMS_PERMITIDOS en js/analytics.js');
    }

    log(evento, limpio);

    if (!habilitado) return true;          // sin ID: se registra en debug y listo
    if (!listo) { cola.push([evento, limpio]); return true; }
    enviar(evento, limpio);
    return true;
  }

  /* ===================================================================
     6. Ayudas
     =================================================================== */

  /* Parámetros estándar de un vehículo. Se arma siempre acá para que
     todos los eventos usen los mismos nombres y GA4 pueda cruzarlos. */
  function paramsVehiculo(car) {
    if (!car) return {};
    const p = {
      vehicle_id: String(car.id || ''),
      vehicle_slug: car.slug || '',
      vehicle_brand: car.marca || '',
      vehicle_model: car.modelo || '',
      vehicle_status: car.status || ''
    };
    if (car.year) p.vehicle_year = Number(car.year);
    // priceNum es null cuando va "Consultar precio": ahí no se manda un 0
    // que después ensuciaría cualquier promedio.
    if (typeof car.priceNum === 'number' && isFinite(car.priceNum)) {
      p.vehicle_price = car.priceNum;
      p.value = car.priceNum;
      p.currency = 'ARS';
    }
    return p;
  }

  /* Consentimiento real: actualiza Consent Mode. No hay banner acá — esto
     es la pieza que un banner llamaría cuando exista. */
  function otorgarConsentimiento() {
    if (typeof global.gtag !== 'function') return;
    global.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
    log('consentimiento otorgado: medición activa.');
  }

  function revocarConsentimiento() {
    if (typeof global.gtag !== 'function') return;
    global.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    log('consentimiento revocado.');
  }

  global.Analytics = {
    CONFIG: ANALYTICS_CONFIG,
    init,
    track,
    paramsVehiculo,
    otorgarConsentimiento,
    revocarConsentimiento,
    debug: DEBUG,
    // Para las pruebas automatizadas: lista de eventos ya enviados.
    _enviados: yaEnviados
  };

  init();
})(window);
