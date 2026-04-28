create extension if not exists vector;

alter table restaurants
  alter column id type uuid using id::uuid;

alter table restaurants
  add column if not exists address text,
  add column if not exists price_range varchar,
  add column if not exists opening_hours varchar,
  add column if not exists image_url text,
  add column if not exists rating_avg float8,
  add column if not exists sentiment_score float8,
  add column if not exists top_review_text text,
  add column if not exists is_active boolean default true,
  add column if not exists embedding_vector vector(768),
  add column if not exists total_reviews int4,
  add column if not exists open_time time,
  add column if not exists close_time time,
  add column if not exists timezone text,
  add column if not exists is_open_now boolean,
  add column if not exists google_maps_url text;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name varchar unique not null
);

create table if not exists res_tags (
  id uuid primary key default gen_random_uuid(),
  res_id uuid not null references restaurants(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  unique (res_id, tag_id)
);
