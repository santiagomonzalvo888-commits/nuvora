/* =====================================================================
   catalog-api.js — de dónde sale el catálogo.

   El sitio siempre consumió los datos que arma buildCatalog() en
   catalog-data.js. Este archivo NO cambia esa forma: se conecta a
   Supabase y traduce cada fila de la base a ESE MISMO formato, así
   app.js y ficha.js no se enteran de dónde vinieron los datos.

   Orden de prioridad:
     1. Los vehículos publicados en Supabase (los que carga el panel).
     2. Si no hay Supabase configurado, la API falla, o la base todavía
        no tiene ningún vehículo publicado → el stock de demo de
        catalog-data.js, PERO sólo mientras USAR_DEMO_SI_VACIO esté en
        true (ver abajo).

   Ese segundo punto es a propósito: un catálogo vacío se ve roto, y
   mientras la concesionaria no cargó su stock real conviene que el
   sitio siga mostrando algo. Cuando el stock real esté cargado hay que
   poner USAR_DEMO_SI_VACIO en false; a partir de ahí el respaldo deja
   de existir y cada situación se muestra como lo que es: sin stock, o
   no se pudo cargar (con botón de reintentar).

   Cargar DESPUÉS de catalog-data.js y ANTES de app.js / ficha.js:
     <script src="js/catalog-data.js"></script>
     <script src="js/catalog-api.js"></script>
     <script src="js/app.js" defer></script>
   ===================================================================== */
(function (global) {
  'use strict';

  const CFG = {
    SUPABASE_URL:      'https://cocdosatsigpevqpwtju.supabase.co',
    // Clave "publishable": pública por diseño. Lo que protege los datos
    // son las políticas RLS de supabase/schema.sql, no esta clave.
    SUPABASE_ANON_KEY: 'sb_publishable_0EyUiccj8_xItLaU442TmA_pWa1sDyX',
    BUCKET: 'vehiculos',

    // ⚠️ Pasar a false cuando la concesionaria tenga su stock real
    // cargado en el panel. Si queda en true y algún día la base queda
    // vacía —o se cae— el sitio mostraría los autos de demo como si
    // fueran reales, que es la peor forma de fallar. En false, el
    // respaldo no se usa en ningún caso.
    USAR_DEMO_SI_VACIO: true,

    // Días que la ficha de un vendido sigue online antes de desaparecer.
    VENTANA_VENDIDOS: 60,

    // El catálogo y la ficha no dibujan nada hasta tener los datos, así que
    // una base lenta o colgada dejaría la página en blanco. Pasado este
    // tiempo se corta y se usa el respaldo: más vale mostrar el stock de
    // demo en un segundo que una pantalla vacía durante medio minuto.
    TIMEOUT_MS: 5000,

    CACHE_MS: 60 * 1000
  };

  /* -------------------------------------------------------------------
     Traducción base → sitio
     La izquierda es lo que el sitio ya usaba (ver buildCatalog en
     catalog-data.js); la derecha, de dónde sale en la base.
     ------------------------------------------------------------------- */

  // El sitio maneja disponible/reservado/vendido; la base, el ciclo de
  // trabajo del panel (draft/published/reserved/sold). Los borradores no
  // llegan hasta acá: los filtra RLS del lado del servidor.
  const ESTADOS = {
    published: 'disponible',
    reserved:  'reservado',
    sold:      'vendido'
  };

  function fotosDe(v) {
    return (v.fotos || []).map((f) =>
      `${CFG.SUPABASE_URL}/storage/v1/object/public/${CFG.BUCKET}/${f.path}`);
  }

  /* money() y kmLabel() viven en catalog-data.js y ya formatean en pesos
     argentinos. Si un vehículo está cargado en USD no se puede usar
     money(): se escribe la moneda tal cual, sin convertir a pesos con una
     cotización inventada. */
  function precioTexto(v) {
    if (v.precio_consultar || v.precio == null) return 'Consultar precio';
    if (v.moneda === 'USD') {
      return 'USD ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
        .format(v.precio);
    }
    return money(Number(v.precio));
  }

  function mapear(v) {
    const nombre = [v.marca, v.modelo, v.version].filter(Boolean).join(' ');
    const precio = v.precio_consultar || v.precio == null ? null : Number(v.precio);
    const anterior = v.precio_anterior == null ? 0 : Number(v.precio_anterior);
    const tieneRebaja = precio != null && anterior > precio;

    return {
      // El uuid es el identificador interno y no se pisa con el slug: uno
      // sirve para hablar con la base, el otro para armar la URL. El slug
      // lo generó el trigger de Supabase al insertar el vehículo y no
      // cambia al editarlo, así que la URL sobrevive a cualquier edición.
      id: v.id,
      slug: v.slug || '',
      marca: v.marca,
      modelo: [v.modelo, v.version].filter(Boolean).join(' '),
      name: nombre,
      year: v.anio || '',
      km: typeof v.km === 'number' ? v.km : null,
      seg: v.segmento || '',
      motor: v.motor || '',
      comb: v.combustible || '',
      trans: v.transmision || '',
      tracc: v.traccion || '',
      cons: '',                    // la base no lo guarda: no se inventa
      pas: v.pasajeros || '',
      pue: v.puertas || '',
      desc: v.descripcion || '',
      status: ESTADOS[v.estado] || 'disponible',
      price: precioTexto(v),
      priceNum: precio,
      oldPrice: tieneRebaja ? money(anterior) : '',
      badges: dealershipConfig.trustBadges,
      photos: fotosDe(v),
      destacado: !!v.destacado
    };
  }

  /* -------------------------------------------------------------------
     Carga
     ------------------------------------------------------------------- */
  let cache = null;
  let cacheEn = 0;
  let enVuelo = null;

  function configurado() {
    return !!CFG.SUPABASE_URL && !!CFG.SUPABASE_ANON_KEY &&
           !CFG.SUPABASE_URL.includes('TU-PROYECTO') &&
           !CFG.SUPABASE_ANON_KEY.includes('TU-ANON-KEY');
  }

  /* Un vendido se muestra un tiempo (sirve para SEO y para el que vuelve
     por un link viejo) y después sale del catálogo. */
  function vigente(v) {
    if (v.estado !== 'sold') return true;
    if (!v.vendido_at) return true;
    const dias = (Date.now() - new Date(v.vendido_at).getTime()) / 86400000;
    return dias <= CFG.VENTANA_VENDIDOS;
  }

  async function traerDeApi() {
    const url = `${CFG.SUPABASE_URL}/rest/v1/vehiculos_publicos` +
                `?select=*&order=orden.asc,published_at.desc`;

    // Las claves nuevas (sb_publishable_…) NO son JWT: mandarlas también
    // como "Authorization: Bearer" no autentica nada y hay endpoints que
    // las rechazan con "Invalid JWT". Solo la clave anon vieja —que sí es
    // un JWT y empieza con "eyJ"— se manda además como Bearer.
    const headers = {
      apikey: CFG.SUPABASE_ANON_KEY,
      Accept: 'application/json'
    };
    if (/^eyJ/.test(CFG.SUPABASE_ANON_KEY)) {
      headers.Authorization = 'Bearer ' + CFG.SUPABASE_ANON_KEY;
    }

    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), CFG.TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('la base tardó más de ' + CFG.TIMEOUT_MS + ' ms');
      throw e;
    } finally {
      clearTimeout(reloj);
    }
  }

  /* El respaldo es el stock estático de catalog-data.js, pasado por la
     MISMA función que usaba el sitio antes de existir este archivo. */
  function respaldoEstatico(motivo) {
    if (typeof buildCatalog !== 'function') {
      console.error('[catalogo] no está cargado catalog-data.js');
      return [];
    }
    console.warn('[catalogo] usando el stock de demo —', motivo);
    return buildCatalog();
  }

  /* De dónde salieron los datos de la última carga. La interfaz lo usa
     para distinguir tres situaciones que se ven parecidas si sólo se mira
     la cantidad de vehículos, pero que hay que contarle distinto a quien
     está mirando la pantalla:

       'supabase' → stock real
       'demo'     → el respaldo estático (la base no está configurada,
                    no respondió, o todavía no tiene nada publicado)
       'error'    → no se pudo cargar Y no hay respaldo disponible.
                    Es el único caso donde corresponde ofrecer reintentar. */
  let ultimoOrigen = 'cargando';

  async function cargar({ forzar = false } = {}) {
    if (!forzar && cache && Date.now() - cacheEn < CFG.CACHE_MS) return cache;
    if (enVuelo) return enVuelo;
    if (forzar) { cache = null; cacheEn = 0; }

    enVuelo = (async () => {
      let datos;
      let origen;

      /* El respaldo de demo es una muleta de la etapa de demo y está
         atado a USAR_DEMO_SI_VACIO. Con el flag en false (producción,
         stock real cargado) NO se usa nunca: si la base no contesta hay
         que decirlo y ofrecer reintentar, no rellenar la pantalla con 23
         autos de ejemplo que el visitante leería como stock real. */
      const hayRespaldo = CFG.USAR_DEMO_SI_VACIO;

      if (!configurado()) {
        datos = hayRespaldo ? respaldoEstatico('Supabase no está configurado') : [];
        origen = datos.length ? 'demo' : 'error';
      } else {
        try {
          const filas = (await traerDeApi()).filter(vigente).map(mapear);
          if (!filas.length && hayRespaldo) {
            datos = respaldoEstatico('todavía no hay vehículos publicados');
            origen = datos.length ? 'demo' : 'sin-stock';
          } else if (!filas.length) {
            // La base respondió bien y dice que no hay stock publicado.
            // Eso NO es un error: es una concesionaria sin autos cargados.
            datos = [];
            origen = 'sin-stock';
          } else {
            datos = filas;
            origen = 'supabase';
          }
        } catch (e) {
          console.error('[catalogo] falló la API:', e.message);
          datos = hayRespaldo ? respaldoEstatico('no se pudo contactar la base') : [];
          // Sin respaldo es un error de verdad y hay que decirlo: mostrar
          // un catálogo vacío haría creer que la concesionaria no tiene
          // autos, que es una cosa muy distinta a que se cayó la base.
          origen = datos.length ? 'demo' : 'error';
        }
      }

      cache = datos;
      cacheEn = Date.now();
      ultimoOrigen = origen;
      enVuelo = null;
      document.dispatchEvent(new CustomEvent('catalogo:listo', {
        detail: { vehiculos: datos, origen: origen }
      }));
      return datos;
    })();

    return enVuelo;
  }

  function origen() { return ultimoOrigen; }

  /* Destacados: si los datos vienen de la base manda el tilde "Destacado"
     del panel; con el stock de demo se usa la selección curada de
     catalog-data.js, que es la que existía antes. */
  function destacados(cars) {
    const marcados = cars.filter((c) => c.destacado && c.status !== 'vendido');
    if (marcados.length) return marcados.slice(0, 6);
    return typeof getFeatured === 'function' ? getFeatured(cars) : cars.slice(0, 4);
  }

  global.Catalogo = { CFG, cargar, destacados, configurado, origen };
})(window);
