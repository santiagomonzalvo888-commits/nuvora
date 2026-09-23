/* =====================================================================
   rutas.js — URLs de los vehículos.

   Cada vehículo tiene DOS identificadores y cumplen roles distintos:

     id    → identificador interno y estable. En Supabase es el uuid; en
             el stock de demo, el número del array. Nunca cambia y es lo
             que se usa para hablar con la base.
     slug  → texto legible para la URL ("toyota-corolla-xei-2022").
             Se genera UNA sola vez, cuando el vehículo se crea, y no se
             recalcula al editar: así cambiar el precio o los kilómetros
             no rompe un link que alguien ya compartió o que Google ya
             indexó.

   FORMA DE LA URL
   ---------------
   En producción:   /vehiculos/toyota-corolla-xei-2022
   Abriendo el archivo local (file://) o con SITE_CONFIG.urlsLimpias en
   false:           ficha.html?v=toyota-corolla-xei-2022

   Las dos formas se resuelven igual al leerlas, y además se sigue
   aceptando el viejo ficha.html?id=3 para no romper nada ya compartido.

   ⚠️ Las URLs limpias NECESITAN una regla de rewrite en el hosting
   (ver _redirects, vercel.json y .htaccess en la raíz del proyecto).
   Sin esa regla funcionan al navegar desde la home pero dan 404 al
   recargar o al entrar directo desde WhatsApp. Si el hosting no puede
   hacer rewrites, poner SITE_CONFIG.urlsLimpias en false y todo pasa a
   ficha.html?v=… , que funciona en cualquier lado sin configurar nada.

   Este archivo NO depende de ningún otro: se carga primero.
   ===================================================================== */
(function (global) {
  'use strict';

  var PREFIJO = 'vehiculos';     // el /vehiculos/ de la URL
  var PAGINA  = 'ficha.html';    // el documento real que la sirve

  /* -------------------------------------------------------------------
     1. SLUGIFY
     ------------------------------------------------------------------- */

  /* Pasa un texto cualquiera a un slug seguro para URL:
       "Peugeot 208 Allure 1.6 (2021)" → "peugeot-208-allure-1-6-2021"
       "Ñandú  Automóvil"              → "nandu-automovil"

     normalize('NFD') separa la letra de su tilde y después se borran los
     diacríticos sueltos, que es la forma de sacar acentos sin una tabla
     de reemplazos a mano (cubre á é í ó ú ü ñ ç y el resto). */
  function slugify(texto) {
    return String(texto == null ? '' : texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // acentos y diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')       // todo lo que no sea letra/número
      .replace(/-{2,}/g, '-')            // guiones repetidos
      .replace(/^-+|-+$/g, '');          // guiones al principio o al final
  }

  /* Slug a partir de los datos del vehículo. Se usan marca, modelo,
     versión y año porque son los datos que NO cambian durante la vida de
     la publicación — a diferencia del precio o los kilómetros, que sí.
     Es la misma combinación que usa el trigger de Supabase, para que las
     dos fuentes generen la misma URL. */
  function slugDeVehiculo(v) {
    var partes = [v.marca || v.brand, v.modelo || v.model, v.version, v.year || v.anio];
    var base = slugify(partes.filter(Boolean).join(' '));
    return base || 'vehiculo';   // nunca vacío
  }

  /* Si dos vehículos generan el mismo slug (dos unidades del mismo modelo
     y año), el segundo pasa a "-2", el tercero a "-3", etc. Misma
     estrategia que el trigger de la base, así el comportamiento no
     depende de dónde salieron los datos.

     `usados` es un Set con los slugs ya tomados; la función lo actualiza. */
  function slugUnico(base, usados) {
    var limpio = slugify(base) || 'vehiculo';
    if (!usados.has(limpio)) {
      usados.add(limpio);
      return limpio;
    }
    var n = 2;
    while (usados.has(limpio + '-' + n)) n++;
    var final = limpio + '-' + n;
    usados.add(final);
    return final;
  }

  /* -------------------------------------------------------------------
     2. MODO DE URL
     ------------------------------------------------------------------- */

  /* SITE_CONFIG vive en catalog-data.js, que se carga DESPUÉS de este
     archivo: por eso se lee acá adentro (en tiempo de llamada) y no en
     una constante de arriba.

     Se lee por su nombre y no como global.SITE_CONFIG: allá está
     declarada con `const`, y un const de nivel superior NO crea una
     propiedad de window. Leyéndola por la ventana daba siempre undefined
     y el flag urlsLimpias no hacía absolutamente nada — poner false
     seguía generando /vehiculos/…, que es justo lo que rompe en un
     hosting sin rewrites. El typeof es la guarda por si catalog-data.js
     no llegó a cargar. */
  function urlsLimpiasActivadas() {
    var cfg = (typeof SITE_CONFIG !== 'undefined') ? SITE_CONFIG : global.SITE_CONFIG;
    return !cfg || cfg.urlsLimpias !== false;
  }

  /* file:// no puede tener URLs limpias: no hay servidor que reescriba
     nada. Abriendo el index con doble clic, los links caen solos a
     ficha.html?v=… y todo sigue andando. */
  function servidoPorHttp() {
    return global.location &&
      (location.protocol === 'http:' || location.protocol === 'https:');
  }

  function modo() {
    return (servidoPorHttp() && urlsLimpiasActivadas()) ? 'limpias' : 'query';
  }

  /* -------------------------------------------------------------------
     3. ARMAR LA URL
     ------------------------------------------------------------------- */

  /* Identificador que va en la URL: el slug si existe, y si no el id.
     Nunca un índice del array. */
  function refDe(car) {
    if (!car) return '';
    return String(car.slug || car.id || '');
  }

  /* Ruta relativa al sitio, sin dominio. Es lo que va en el href de las
     tarjetas del catálogo. */
  function rutaVehiculo(car) {
    var ref = refDe(car);
    if (!ref) return PAGINA;
    return modo() === 'limpias'
      ? '/' + PREFIJO + '/' + encodeURIComponent(ref)
      : PAGINA + '?v=' + encodeURIComponent(ref);
  }

  /* Igual que la anterior pero siempre en forma limpia y sin barra
     inicial. Se usa para el canonical y el sitemap, que describen la URL
     pública del recurso más allá de cómo se esté navegando ahora. */
  function rutaCanonica(car) {
    var ref = refDe(car);
    if (!ref) return '';
    return urlsLimpiasActivadas()
      ? PREFIJO + '/' + encodeURIComponent(ref)
      : PAGINA + '?v=' + encodeURIComponent(ref);
  }

  /* URL absoluta completa, para compartir por WhatsApp, para el canonical
     y para Open Graph.

     El dominio sale de SITE_CONFIG.baseUrl. Mientras ese valor siga
     siendo el placeholder, se usa el origen real desde donde se está
     sirviendo la página, que al menos es una URL que funciona. Y si la
     página se abrió como archivo local no hay ninguna URL pública
     posible, así que devuelve vacío — quien la use decide qué hacer
     (por ejemplo, el mensaje de WhatsApp simplemente no la incluye). */
  function urlAbsolutaVehiculo(car) {
    var ruta = rutaCanonica(car);
    if (!ruta) return '';

    var cfg = global.SITE_CONFIG;
    var base = cfg && cfg.baseUrl ? String(cfg.baseUrl) : '';
    var esPlaceholder = !base || base.indexOf('tu-dominio-real') !== -1;

    if (!esPlaceholder) return base.replace(/\/+$/, '') + '/' + ruta;
    if (servidoPorHttp()) return location.origin + '/' + ruta;
    return '';
  }

  /* -------------------------------------------------------------------
     4. LEER LA URL
     ------------------------------------------------------------------- */

  /* Devuelve el identificador del vehículo que pide la URL actual, mire
     donde mire:
       /vehiculos/toyota-corolla-2022   (producción)
       ficha.html?v=toyota-corolla-2022 (archivo local / sin rewrites)
       ficha.html?id=3                  (formato viejo, se sigue aceptando)
     Devuelve '' si la URL no identifica ningún vehículo. */
  function refDeLaUrl() {
    if (!global.location) return '';

    var camino = decodeURIComponent(location.pathname || '');
    var marca = '/' + PREFIJO + '/';
    var i = camino.indexOf(marca);
    if (i !== -1) {
      var resto = camino.slice(i + marca.length).replace(/\/+$/, '');
      if (resto) return resto;
    }

    var q = new URLSearchParams(location.search);
    return q.get('v') || q.get('id') || '';
  }

  /* Busca el vehículo que corresponde a un identificador. Primero por
     slug (que es lo que viaja en las URLs nuevas) y después por id, que
     cubre los links viejos con ?id= y el caso de un vehículo sin slug. */
  function buscarVehiculo(cars, ref) {
    if (!ref || !Array.isArray(cars)) return null;
    var texto = String(ref);
    return cars.find(function (c) { return String(c.slug || '') === texto; }) ||
           cars.find(function (c) { return String(c.id || '') === texto; }) ||
           null;
  }

  global.Rutas = {
    slugify: slugify,
    slugDeVehiculo: slugDeVehiculo,
    slugUnico: slugUnico,
    rutaVehiculo: rutaVehiculo,
    rutaCanonica: rutaCanonica,
    urlAbsolutaVehiculo: urlAbsolutaVehiculo,
    refDeLaUrl: refDeLaUrl,
    buscarVehiculo: buscarVehiculo,
    modo: modo,
    PREFIJO: PREFIJO
  };
})(window);
