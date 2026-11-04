-- Cologne Catalog schema. Lives in the shared "World Cup" Supabase project,
-- so every object is prefixed cologne_ and access is limited to an allowlist.

create extension if not exists pg_trgm with schema extensions;

-- Allowlist: only members can use the cologne app.
create table public.cologne_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  created_at timestamptz not null default now()
);

create or replace function public.cologne_is_member()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.cologne_members m where m.user_id = auth.uid()) $$;

create or replace function public.cologne_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

-- Shared fragrance catalog, filled by the live lookup (server-side, service role).
create table public.cologne_fragrances (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text not null,
  concentration text,
  release_year int,
  gender text,
  perfumers text[] not null default '{}',
  description text,
  image_url text,
  accords jsonb not null default '[]',         -- [{name, strength 0-100}]
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  rating_overall numeric(3,2),                -- out of 5
  rating_votes int,
  longevity numeric(3,2),                     -- out of 5
  sillage numeric(3,2),                       -- out of 4
  value_rating numeric(3,2),                  -- out of 5
  seasons jsonb not null default '{}',        -- {winter,spring,summer,fall} 0-100
  time_of_day jsonb not null default '{}',    -- {day,night} 0-100
  review_summary jsonb not null default '{}', -- {summary, pros[], cons[], compliments}
  similar_fragrances text[] not null default '{}',
  sources jsonb not null default '[]',        -- [{title,url}]
  lookup_status text not null default 'complete' check (lookup_status in ('pending','complete','failed')),
  looked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cologne_fragrances_search_idx on public.cologne_fragrances
  using gin ((brand || ' ' || name) extensions.gin_trgm_ops);
create trigger cologne_fragrances_touch before update on public.cologne_fragrances
  for each row execute function public.cologne_touch_updated_at();

-- My collection (full bottles only).
create table public.cologne_bottles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fragrance_id uuid not null references public.cologne_fragrances(id),
  size_ml numeric(6,1),
  concentration text,
  fill_level int check (fill_level between 0 and 100),
  purchase_price numeric(10,2),
  purchase_date date,
  purchased_from text,
  my_rating int check (my_rating between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.cologne_bottles (user_id);
create index on public.cologne_bottles (fragrance_id);
create trigger cologne_bottles_touch before update on public.cologne_bottles
  for each row execute function public.cologne_touch_updated_at();

-- Wishlist.
create table public.cologne_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fragrance_id uuid not null references public.cologne_fragrances(id),
  priority int not null default 2 check (priority between 1 and 3),
  target_price numeric(10,2),
  desired_size_ml numeric(6,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fragrance_id)
);
create index on public.cologne_wishlist (fragrance_id);
create trigger cologne_wishlist_touch before update on public.cologne_wishlist
  for each row execute function public.cologne_touch_updated_at();

-- Discounter stores.
create table public.cologne_stores (
  id text primary key,
  name text not null,
  base_url text not null,
  active boolean not null default true,
  sort_order int not null default 0
);
insert into public.cologne_stores (id, name, base_url, sort_order) values
  ('aura',         'Aura Fragrance',    'https://www.aurafragrance.com/',  1),
  ('fragrancenet', 'FragranceNet',      'https://www.fragrancenet.com/',   2),
  ('jomashop',     'Jomashop',          'https://www.jomashop.com/',       3),
  ('ediscount',    'eDiscountPerfumes', 'https://ediscountperfumes.com/',  4),
  ('fragrancex',   'FragranceX',        'https://www.fragrancex.com/',     5),
  ('maxaroma',     'MaxAroma',          'https://www.maxaroma.com/',       6),
  ('venba',        'Venba Fragrance',   'https://www.venbafragrance.com/', 7);

-- Price checks (one per "Check prices" press) and their per-store results.
create table public.cologne_price_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fragrance_id uuid not null references public.cologne_fragrances(id),
  checked_at timestamptz not null default now()
);
create index on public.cologne_price_checks (user_id, fragrance_id, checked_at desc);
create index on public.cologne_price_checks (fragrance_id);

create table public.cologne_prices (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.cologne_price_checks(id) on delete cascade,
  store_id text not null references public.cologne_stores(id),
  status text not null check (status in ('ok','not_found','blocked','error')),
  product_title text,
  url text,
  size_ml numeric(6,1),
  concentration text,
  price numeric(10,2),
  shipping numeric(10,2),
  in_stock boolean,
  is_tester boolean not null default false,
  error text
);
create index on public.cologne_prices (check_id);
create index on public.cologne_prices (store_id);

-- Row level security.
alter table public.cologne_members      enable row level security;
alter table public.cologne_fragrances   enable row level security;
alter table public.cologne_bottles      enable row level security;
alter table public.cologne_wishlist     enable row level security;
alter table public.cologne_stores       enable row level security;
alter table public.cologne_price_checks enable row level security;
alter table public.cologne_prices       enable row level security;

create policy "members read own membership" on public.cologne_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members read catalog" on public.cologne_fragrances
  for select to authenticated using ((select public.cologne_is_member()));

create policy "members read stores" on public.cologne_stores
  for select to authenticated using ((select public.cologne_is_member()));

create policy "own bottles" on public.cologne_bottles
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.cologne_is_member()))
  with check (user_id = (select auth.uid()) and (select public.cologne_is_member()));

create policy "own wishlist" on public.cologne_wishlist
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.cologne_is_member()))
  with check (user_id = (select auth.uid()) and (select public.cologne_is_member()));

create policy "own price checks" on public.cologne_price_checks
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.cologne_is_member()))
  with check (user_id = (select auth.uid()) and (select public.cologne_is_member()));

create policy "own prices" on public.cologne_prices
  for all to authenticated
  using (exists (select 1 from public.cologne_price_checks c
                 where c.id = check_id and c.user_id = (select auth.uid()))
         and (select public.cologne_is_member()))
  with check (exists (select 1 from public.cologne_price_checks c
                 where c.id = check_id and c.user_id = (select auth.uid()))
         and (select public.cologne_is_member()));

revoke execute on function public.cologne_is_member() from anon, public;
grant execute on function public.cologne_is_member() to authenticated;
