-- Where a fragrance profile's details came from, so the page can say how
-- trustworthy they are: web-researched, model knowledge only, or curated by hand.
alter table public.cologne_fragrances
  add column profile_origin text
  check (profile_origin in ('web_search', 'model_knowledge', 'curated'));

update public.cologne_fragrances set profile_origin = 'curated' where lookup_status = 'complete';
