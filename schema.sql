-- =====================================================================
-- Catálogo de vehículos + panel de administración
-- Pegar entero en Supabase → SQL Editor → Run.
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- =====================================================================

create extension if not exists "unaccent";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. ADMINISTRADORES
--    Un usuario de Auth NO es admin hasta que tiene fila acá.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nombre     text,
  created_at timestamptz not null default now()
);

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2. VEHÍCULOS
-- ---------------------------------------------------------------------
create table if not exists public.vehiculos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique,

  -- Información principal
  marca             text        not null,
  modelo            text        not null,
  version           text,
  anio              smallint    not null,
  km                integer     not null default 0,
  precio            numeric(12,2),
  moneda            text        not null default 'USD',
  precio_consultar  boolean     not null default false,

  -- Características
  combustible       text,
  transmision       text,
  motor             text,
  color             text,
  puertas           smallint,

  -- Publicación
  descripcion       text,
  destacado         boolean     not null default false,
  estado            text        not null default 'draft',
  orden             integer     not null default 0,

  -- SEO (override manual opcional; si es null se genera desde los datos)
  seo_title         text,
  seo_description   text,

  published_at      timestamptz,
  vendido_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Las constraints se agregan aparte para que el script se pueda re-correr.
alter table public.vehiculos
  drop constraint if exists vehiculos_anio_ok;
alter table public.vehiculos
  add constraint vehiculos_anio_ok
  check (anio between 1950 and 2100);   -- CHECK exige expresión inmutable

-- 'reserved' = reservado: sigue visible en la web, con su cartel, pero ya
-- no está a la venta. Se agregó para que el panel pueda expresar el mismo
-- estado que la web pública ya sabía mostrar.
alter table public.vehiculos
  drop constraint if exists vehiculos_estado_ok;
alter table public.vehiculos
  add constraint vehiculos_estado_ok
  check (estado in ('draft','published','reserved','sold'));

alter table public.vehiculos
  drop constraint if exists vehiculos_moneda_ok;
alter table public.vehiculos
  add constraint vehiculos_moneda_ok
  check (moneda in ('USD','ARS'));

alter table public.vehiculos
  drop constraint if exists vehiculos_combustible_ok;
alter table public.vehiculos
  add constraint vehiculos_combustible_ok
  check (combustible is null or combustible in
    ('Nafta','Diésel','GNC','Híbrido','Eléctrico'));

alter table public.vehiculos
  drop constraint if exists vehiculos_transmision_ok;
alter table public.vehiculos
  add constraint vehiculos_transmision_ok
  check (transmision is null or transmision in ('Manual','Automática'));

alter table public.vehiculos
  drop constraint if exists vehiculos_km_ok;
alter table public.vehiculos
  add constraint vehiculos_km_ok check (km >= 0);

alter table public.vehiculos
  drop constraint if exists vehiculos_precio_ok;
alter table public.vehiculos
  add constraint vehiculos_precio_ok
  check (precio_consultar = true or precio is not null);

-- ---------------------------------------------------------------------
-- 2b. CAMPOS QUE LA WEB PÚBLICA YA MOSTRABA
--     La ficha del sitio muestra segmento, tracción y pasajeros, y la
--     tarjeta sabe dibujar precio tachado + porcentaje de rebaja y una
--     etiqueta comercial ("Nuevo ingreso"). Sin estas columnas, todo eso
--     quedaba vacío apenas el catálogo pasaba a salir de la base.
-- ---------------------------------------------------------------------
alter table public.vehiculos add column if not exists segmento        text;
alter table public.vehiculos add column if not exists traccion        text;
alter table public.vehiculos add column if not exists pasajeros       smallint;
alter table public.vehiculos add column if not exists precio_anterior numeric(12,2);
alter table public.vehiculos add column if not exists etiqueta        text;

-- El precio anterior solo tiene sentido si es MAYOR al actual: si no, la
-- web dibujaría una "rebaja" negativa.
alter table public.vehiculos
  drop constraint if exists vehiculos_precio_anterior_ok;
alter table public.vehiculos
  add constraint vehiculos_precio_anterior_ok
  check (precio_anterior is null
         or (precio is not null and precio_anterior > precio));

alter table public.vehiculos
  drop constraint if exists vehiculos_segmento_ok;
alter table public.vehiculos
  add constraint vehiculos_segmento_ok
  check (segmento is null or segmento in
    ('Sedán','Hatchback','SUV','Pick-up','Utilitario','Coupé','Familiar','Monovolumen'));

alter table public.vehiculos
  drop constraint if exists vehiculos_traccion_ok;
alter table public.vehiculos
  add constraint vehiculos_traccion_ok
  check (traccion is null or traccion in ('Delantera','Trasera','4x4','AWD'));

create index if not exists vehiculos_estado_idx   on public.vehiculos (estado);
create index if not exists vehiculos_destacado_idx on public.vehiculos (destacado)
  where destacado = true;
create index if not exists vehiculos_orden_idx
  on public.vehiculos (orden asc, created_at desc);
create index if not exists vehiculos_marca_idx    on public.vehiculos (marca);

-- ---------------------------------------------------------------------
-- 3. FOTOS
--    La portada es la foto con "orden" más bajo. No hay flag aparte.
-- ---------------------------------------------------------------------
create table if not exists public.vehiculo_fotos (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos(id) on delete cascade,
  path        text not null,
  orden       smallint not null default 0,
  alt         text,
  created_at  timestamptz not null default now()
);

create index if not exists vehiculo_fotos_vehiculo_idx
  on public.vehiculo_fotos (vehiculo_id, orden asc);

-- ---------------------------------------------------------------------
-- 4. SLUG AUTOMÁTICO
--    Se genera una sola vez, al insertar. No cambia al editar,
--    para no romper links ya compartidos.
-- ---------------------------------------------------------------------
create or replace function public.slugify(txt text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(unaccent(coalesce(txt,''))), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

create or replace function public.vehiculos_set_slug()
returns trigger
language plpgsql
as $$
declare
  base    text;
  intento text;
  n       int := 1;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base := public.slugify(
    concat_ws(' ', new.marca, new.modelo, new.version, new.anio::text)
  );
  if base = '' then
    base := 'vehiculo';
  end if;

  intento := base;
  while exists (select 1 from public.vehiculos v
                where v.slug = intento and v.id <> new.id) loop
    n := n + 1;
    intento := base || '-' || n::text;
  end loop;

  new.slug := intento;
  return new;
end $$;

drop trigger if exists trg_vehiculos_slug on public.vehiculos;
create trigger trg_vehiculos_slug
  before insert on public.vehiculos
  for each row execute function public.vehiculos_set_slug();

-- ---------------------------------------------------------------------
-- 5. TIMESTAMPS DE ESTADO
-- ---------------------------------------------------------------------
create or replace function public.vehiculos_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  -- 'reserved' también es contenido visible: cuenta como publicado.
  if new.estado in ('published','reserved') and new.published_at is null then
    new.published_at := now();
  end if;

  if new.estado = 'sold' and (old.estado is distinct from 'sold') then
    new.vendido_at := now();
    new.destacado  := false;   -- un vendido nunca queda en destacados
  end if;

  if new.estado <> 'sold' then
    new.vendido_at := null;
  end if;

  return new;
end $$;

drop trigger if exists trg_vehiculos_touch on public.vehiculos;
create trigger trg_vehiculos_touch
  before update on public.vehiculos
  for each row execute function public.vehiculos_touch();

create or replace function public.vehiculos_touch_insert()
returns trigger
language plpgsql
as $$
begin
  if new.estado in ('published','reserved') and new.published_at is null then
    new.published_at := now();
  end if;
  if new.estado = 'sold' and new.vendido_at is null then
    new.vendido_at := now();
    new.destacado  := false;
  end if;
  return new;
end $$;

drop trigger if exists trg_vehiculos_touch_ins on public.vehiculos;
create trigger trg_vehiculos_touch_ins
  before insert on public.vehiculos
  for each row execute function public.vehiculos_touch_insert();

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------
alter table public.vehiculos      enable row level security;
alter table public.vehiculo_fotos enable row level security;
alter table public.admins         enable row level security;

-- Lectura pública: SOLO publicados y vendidos. Un draft es invisible
-- incluso pegándole directo a la API con la anon key.
drop policy if exists "lectura publica vehiculos" on public.vehiculos;
create policy "lectura publica vehiculos"
  on public.vehiculos for select
  to anon, authenticated
  using (estado in ('published','reserved','sold'));

drop policy if exists "admin lee todo" on public.vehiculos;
create policy "admin lee todo"
  on public.vehiculos for select
  to authenticated
  using (public.es_admin());

drop policy if exists "admin escribe vehiculos" on public.vehiculos;
create policy "admin escribe vehiculos"
  on public.vehiculos for insert
  to authenticated
  with check (public.es_admin());

drop policy if exists "admin edita vehiculos" on public.vehiculos;
create policy "admin edita vehiculos"
  on public.vehiculos for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "admin borra vehiculos" on public.vehiculos;
create policy "admin borra vehiculos"
  on public.vehiculos for delete
  to authenticated
  using (public.es_admin());

-- Fotos: visibles solo si su vehículo es visible.
drop policy if exists "lectura publica fotos" on public.vehiculo_fotos;
create policy "lectura publica fotos"
  on public.vehiculo_fotos for select
  to anon, authenticated
  using (exists (
    select 1 from public.vehiculos v
    where v.id = vehiculo_id and v.estado in ('published','reserved','sold')
  ));

drop policy if exists "admin lee fotos" on public.vehiculo_fotos;
create policy "admin lee fotos"
  on public.vehiculo_fotos for select
  to authenticated using (public.es_admin());

drop policy if exists "admin escribe fotos" on public.vehiculo_fotos;
create policy "admin escribe fotos"
  on public.vehiculo_fotos for insert
  to authenticated with check (public.es_admin());

drop policy if exists "admin edita fotos" on public.vehiculo_fotos;
create policy "admin edita fotos"
  on public.vehiculo_fotos for update
  to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admin borra fotos" on public.vehiculo_fotos;
create policy "admin borra fotos"
  on public.vehiculo_fotos for delete
  to authenticated using (public.es_admin());

-- admins: cada uno ve su propia fila. Las altas se hacen desde el
-- dashboard de Supabase, no hay registro público.
drop policy if exists "admin se ve a si mismo" on public.admins;
create policy "admin se ve a si mismo"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7. VISTA PÚBLICA
--    Un solo request para todo el catálogo, con las fotos adentro.
-- ---------------------------------------------------------------------
drop view if exists public.vehiculos_publicos;
create view public.vehiculos_publicos
with (security_invoker = true)
as
select
  v.id, v.slug, v.marca, v.modelo, v.version, v.anio, v.km,
  v.precio, v.moneda, v.precio_consultar, v.precio_anterior,
  v.combustible, v.transmision, v.motor, v.color, v.puertas,
  v.segmento, v.traccion, v.pasajeros, v.etiqueta,
  v.descripcion, v.destacado, v.estado, v.orden,
  v.seo_title, v.seo_description,
  v.published_at, v.vendido_at,
  coalesce(
    (select jsonb_agg(jsonb_build_object('path', f.path, 'alt', f.alt)
                      order by f.orden asc, f.created_at asc)
     from public.vehiculo_fotos f where f.vehiculo_id = v.id),
    '[]'::jsonb
  ) as fotos
from public.vehiculos v
where v.estado in ('published','reserved','sold');

grant select on public.vehiculos_publicos to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. STORAGE
--    Bucket público para lectura, escritura solo admins.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehiculos', 'vehiculos', true, 15728640,
        array['image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 15728640,
      allowed_mime_types = array['image/webp','image/jpeg','image/png','image/avif'];

drop policy if exists "fotos lectura publica" on storage.objects;
create policy "fotos lectura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'vehiculos');

drop policy if exists "fotos admin sube" on storage.objects;
create policy "fotos admin sube"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vehiculos' and public.es_admin());

drop policy if exists "fotos admin actualiza" on storage.objects;
create policy "fotos admin actualiza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vehiculos' and public.es_admin());

drop policy if exists "fotos admin borra" on storage.objects;
create policy "fotos admin borra"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehiculos' and public.es_admin());

-- =====================================================================
-- DESPUÉS DE CORRER ESTO
-- =====================================================================
-- 1) Authentication → Users → Add user → email + password del admin.
--    (Marcar "Auto Confirm User".)
-- 2) Copiar su UUID y correr:
--
--    insert into public.admins (user_id, email, nombre)
--    values ('PEGAR-UUID-ACA', 'admin@concesionaria.com', 'Administrador');
--
-- 3) Authentication → Providers → Email → desactivar "Enable sign ups".
--    No queremos registro público.
-- 4) Project Settings → API → copiar Project URL y la clave "anon public".
--    Van en admin/config.js y en js/catalog-api.js.
--    La clave "service_role" NO se usa en ningún lado de este sistema.
-- =====================================================================
