-- Esquema para el login por RFC + documentos.
-- Ejecutar contra la base de datos Postgres del proyecto en Vercel
-- (Storage -> tu base de datos -> pestaña "Query", o con psql "$POSTGRES_URL" -f db/schema.sql).

create extension if not exists pgcrypto;

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  rfc text not null unique,
  nombre text,
  creado_en timestamptz not null default now()
);

create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  rfc text not null references clientes (rfc) on delete cascade,
  nombre_archivo text not null,
  tipo_mime text,
  tamano_bytes bigint not null,
  ruta_storage text not null,
  blob_url text not null,
  creado_en timestamptz not null default now()
);

create index if not exists documentos_rfc_idx on documentos (rfc);
