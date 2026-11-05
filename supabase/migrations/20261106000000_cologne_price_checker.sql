-- Price checker: how each store is checked, and where each price came from.

alter table public.cologne_stores
  add column mode text not null default 'link' check (mode in ('auto', 'link')),
  add column search_url text; -- {q} is replaced with the URL-encoded search

update public.cologne_stores set mode = 'auto', search_url = 'https://www.aurafragrance.com/search?q={q}' where id = 'aura';
update public.cologne_stores set mode = 'auto', search_url = 'https://www.maxaroma.com/p4u/key-{q}/view' where id = 'maxaroma';
update public.cologne_stores set mode = 'auto', search_url = 'https://www.venbafragrance.com/search?q={q}' where id = 'venba';
-- These stores disallow automated search (robots.txt) or block it, so the app links out.
update public.cologne_stores set search_url = 'https://www.jomashop.com/search?q={q}' where id = 'jomashop';
update public.cologne_stores set search_url = 'https://ediscountperfumes.com/search.php?search_query={q}' where id = 'ediscount';
update public.cologne_stores set search_url = 'https://www.google.com/search?q=site%3Afragrancenet.com+{q}' where id = 'fragrancenet';
update public.cologne_stores set search_url = 'https://www.google.com/search?q=site%3Afragrancex.com+{q}' where id = 'fragrancex';

alter table public.cologne_prices
  add column source text not null default 'auto' check (source in ('auto', 'manual'));
