-- =====================================================================
-- hardening.sql — refuerzos de seguridad sobre el esquema existente.
-- =====================================================================
-- CORRER DESPUÉS de schema.sql, en Supabase → SQL Editor → Run.
--
-- ⚠️ NO ES DESTRUCTIVO: no borra tablas, ni filas, ni políticas de datos.
--    Sólo agrega restricciones de validación y ajusta políticas de
--    Storage. Es idempotente: se puede correr las veces que haga falta.
--
--    La única operación que puede FALLAR es agregar una restricción si
--    algún vehículo ya cargado la incumple (por ejemplo, un slug con
--    mayúsculas). En ese caso Postgres rechaza esa restricción y no toca
--    nada más: hay que corregir ese registro y volver a correr. Por eso
--    cada bloque va por separado y no en una transacción única.
--
-- QUÉ NO HACE FALTA TOCAR
--    Las políticas RLS de vehiculos, vehiculo_fotos y admins que ya están
--    en schema.sql son correctas: escritura sólo para administradores,
--    lectura pública limitada a estados publicados. Esto las complementa.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. LÍMITES DE LARGO EN LOS TEXTOS
--    Hoy marca, modelo o descripción aceptan texto de cualquier tamaño.
--    Una sesión de administrador comprometida podría cargar megabytes en
--    un campo y volver lentas todas las consultas del sitio público, que
--    lee esa misma tabla. Los topes son holgados para el uso real.
-- ---------------------------------------------------------------------
alter table public.vehiculos drop constraint if exists vehiculos_textos_largo_ok;
alter table public.vehiculos add constraint vehiculos_textos_largo_ok check (
      char_length(coalesce(marca, ''))           <= 60
  and char_length(coalesce(modelo, ''))          <= 80
  and char_length(coalesce(version, ''))         <= 80
  and char_length(coalesce(motor, ''))           <= 40
  and char_length(coalesce(color, ''))           <= 40
  and char_length(coalesce(etiqueta, ''))        <= 40
  and char_length(coalesce(descripcion, ''))     <= 4000
  and char_length(coalesce(seo_title, ''))       <= 120
  and char_length(coalesce(seo_description, '')) <= 320
);

-- Campos obligatorios que no pueden quedar en blanco disfrazado
-- (una cadena de espacios pasaba el NOT NULL).
alter table public.vehiculos drop constraint if exists vehiculos_obligatorios_ok;
alter table public.vehiculos add constraint vehiculos_obligatorios_ok check (
      btrim(marca)  <> ''
  and btrim(modelo) <> ''
);


-- ---------------------------------------------------------------------
-- 2. FORMATO DEL SLUG
--    El slug va en la URL pública. Sin restricción, un slug con '../',
--    con espacios o con caracteres raros produce URLs rotas o ambiguas.
--    Se exige el mismo formato que genera el trigger: minúsculas,
--    números y guiones simples, sin guion al principio ni al final.
-- ---------------------------------------------------------------------
alter table public.vehiculos drop constraint if exists vehiculos_slug_ok;
alter table public.vehiculos add constraint vehiculos_slug_ok check (
  slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
);

alter table public.vehiculos drop constraint if exists vehiculos_slug_largo_ok;
alter table public.vehiculos add constraint vehiculos_slug_largo_ok check (
  slug is null or char_length(slug) between 3 and 120
);


-- ---------------------------------------------------------------------
-- 3. RANGOS NUMÉRICOS CON SENTIDO
--    anio y km ya tenían control. Faltaban el precio y las cantidades:
--    un precio negativo o un número absurdo rompe el orden del catálogo
--    y los promedios de las estadísticas.
-- ---------------------------------------------------------------------
alter table public.vehiculos drop constraint if exists vehiculos_precio_rango_ok;
alter table public.vehiculos add constraint vehiculos_precio_rango_ok check (
  precio is null or (precio >= 0 and precio < 100000000000)
);

alter table public.vehiculos drop constraint if exists vehiculos_km_rango_ok;
alter table public.vehiculos add constraint vehiculos_km_rango_ok check (
  km >= 0 and km <= 2000000
);

alter table public.vehiculos drop constraint if exists vehiculos_puertas_ok;
alter table public.vehiculos add constraint vehiculos_puertas_ok check (
  puertas is null or puertas between 1 and 7
);

alter table public.vehiculos drop constraint if exists vehiculos_pasajeros_ok;
alter table public.vehiculos add constraint vehiculos_pasajeros_ok check (
  pasajeros is null or pasajeros between 1 and 25
);


-- ---------------------------------------------------------------------
-- 4. RUTAS DE FOTOS
--    path se usa para armar la URL pública del archivo y para borrarlo
--    del Storage. Sin control, un valor como '../otro-bucket/x' o una
--    URL completa apuntando a otro dominio se colaría en el <img> del
--    sitio público. Se exige el formato que genera el panel:
--    <uuid del vehículo>/<nombre>.<extensión de imagen>
-- ---------------------------------------------------------------------
alter table public.vehiculo_fotos drop constraint if exists vehiculo_fotos_path_ok;
alter table public.vehiculo_fotos add constraint vehiculo_fotos_path_ok check (
  path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png|avif)$'
);

alter table public.vehiculo_fotos drop constraint if exists vehiculo_fotos_alt_ok;
alter table public.vehiculo_fotos add constraint vehiculo_fotos_alt_ok check (
  alt is null or char_length(alt) <= 200
);


-- ---------------------------------------------------------------------
-- 5. STORAGE
--    El bucket ya era público de lectura y de escritura sólo para
--    administradores. Se refuerzan dos cosas:
--
--    a) El tipo y el tamaño se vuelven a declarar en el bucket. Esto se
--       valida DEL LADO DEL SERVIDOR: la compresión a WebP que hace el
--       panel es del lado del navegador y cualquiera con la sesión
--       abierta podría saltearla llamando a la API directamente.
--
--    b) La política de subida exige además que el archivo caiga dentro
--       de una carpeta con forma de UUID. Sin esto, un administrador
--       (o alguien con su sesión) podía escribir en cualquier ruta del
--       bucket, incluso pisando archivos de otros vehículos.
-- ---------------------------------------------------------------------
update storage.buckets
   set public = true,
       file_size_limit = 15728640,                       -- 15 MB
       allowed_mime_types = array['image/webp','image/jpeg','image/png','image/avif']
 where id = 'vehiculos';

drop policy if exists "fotos admin sube" on storage.objects;
create policy "fotos admin sube"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehiculos'
    and public.es_admin()
    -- Primer segmento = carpeta con forma de uuid; sin subcarpetas extra.
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png|avif)$'
  );

drop policy if exists "fotos admin actualiza" on storage.objects;
create policy "fotos admin actualiza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vehiculos' and public.es_admin())
  with check (
    bucket_id = 'vehiculos'
    and public.es_admin()
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png|avif)$'
  );


-- ---------------------------------------------------------------------
-- 6. LA TABLA admins NO SE TOCA DESDE LA API
--    Ya estaba bien y conviene dejar constancia de por qué:
--    tiene RLS activo y UNA sola política, de SELECT. Al no existir
--    política de INSERT, UPDATE ni DELETE, PostgreSQL las deniega para
--    cualquiera que entre por la API — incluido un usuario autenticado.
--    O sea: registrarse NO alcanza para volverse administrador; hay que
--    insertar la fila desde el dashboard de Supabase, que usa la clave
--    service_role y esa nunca sale del servidor.
--
--    Esta consulta es sólo para verificarlo, no cambia nada:
-- ---------------------------------------------------------------------
select tablename,
       policyname,
       cmd as operacion
  from pg_policies
 where schemaname = 'public'
   and tablename in ('admins','vehiculos','vehiculo_fotos')
 order by tablename, cmd, policyname;


-- ---------------------------------------------------------------------
-- 7. VERIFICACIÓN: RLS activo en todas las tablas del esquema público
--    Si alguna aparece con rls_activo = false, está expuesta.
-- ---------------------------------------------------------------------
select relname as tabla,
       relrowsecurity as rls_activo,
       relforcerowsecurity as rls_forzado
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relkind = 'r'
 order by relname;
