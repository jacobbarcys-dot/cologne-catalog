-- Typo- and accent-tolerant catalog search ("dior savage" finds Sauvage,
-- "althair" finds Althaïr).

create or replace function public.cologne_fold(t text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select translate(lower(t),
    'àáâäãåèéêëìíîïòóôöõøùúûüýÿçñ',
    'aaaaaaeeeeiiiiooooooouuuuyycn')
$$;

alter table public.cologne_fragrances
  add column search_text text
  generated always as (public.cologne_fold(brand || ' ' || name || ' ' || coalesce(concentration, ''))) stored;

drop index if exists public.cologne_fragrances_search_idx;
create index cologne_fragrances_search_idx on public.cologne_fragrances
  using gin (search_text extensions.gin_trgm_ops);

-- security invoker: RLS on cologne_fragrances still applies.
create or replace function public.cologne_search(q text)
returns setof public.cologne_fragrances
language sql stable security invoker set search_path = ''
as $$
  with query as (select public.cologne_fold(trim(q)) as q)
  select f.*
  from public.cologne_fragrances f, query
  where length(query.q) > 0
    and (f.search_text like '%' || query.q || '%'
         or extensions.word_similarity(query.q, f.search_text) >= 0.4)
  order by extensions.word_similarity(query.q, f.search_text) desc, f.brand, f.name
  limit 30
$$;

revoke execute on function public.cologne_search(text) from anon, public;
grant execute on function public.cologne_search(text) to authenticated;
