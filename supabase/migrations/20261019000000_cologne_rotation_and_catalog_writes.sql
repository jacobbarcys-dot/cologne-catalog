-- Which part of the rotation a bottle belongs to (Winter / Summer / Everyday ...).
alter table public.cologne_bottles
  add column rotation text
  check (rotation in ('everyday','winter','summer','spring','fall','night','special'));

-- Members can add fragrances to the shared catalog and correct them.
create policy "members add to catalog" on public.cologne_fragrances
  for insert to authenticated with check ((select public.cologne_is_member()));

create policy "members update catalog" on public.cologne_fragrances
  for update to authenticated
  using ((select public.cologne_is_member()))
  with check ((select public.cologne_is_member()));
