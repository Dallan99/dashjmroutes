create table public.real_savings_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_hash text not null,
  sheet_name text,
  mapping jsonb not null default '{}'::jsonb,
  valid_rows integer not null default 0 check (valid_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index real_savings_imports_completed_hash_uk
  on public.real_savings_imports(file_hash)
  where status = 'completed';

create table public.real_savings_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.real_savings_imports(id) on delete cascade,
  reference_date date,
  base text,
  classification text,
  status text,
  charged_amount numeric(16,2),
  reversed_amount numeric(16,2),
  real_discount numeric(16,2) generated always as (
    case
      when charged_amount is null or reversed_amount is null then null
      else charged_amount - reversed_amount
    end
  ) stored,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index real_savings_items_import_idx on public.real_savings_items(import_id);
create index real_savings_items_date_idx on public.real_savings_items(reference_date);
create index real_savings_items_base_idx on public.real_savings_items(base);

alter table public.real_savings_imports enable row level security;
alter table public.real_savings_items enable row level security;

grant select, insert, update, delete on public.real_savings_imports to anon, authenticated;
grant select, insert, update, delete on public.real_savings_items to anon, authenticated;
grant all on public.real_savings_imports to service_role;
grant all on public.real_savings_items to service_role;

create policy "dashboard read real savings imports"
  on public.real_savings_imports for select to anon, authenticated using (true);
create policy "dashboard insert real savings imports"
  on public.real_savings_imports for insert to anon, authenticated with check (true);
create policy "dashboard update real savings imports"
  on public.real_savings_imports for update to anon, authenticated using (true) with check (true);
create policy "dashboard delete real savings imports"
  on public.real_savings_imports for delete to anon, authenticated using (true);

create policy "dashboard read real savings items"
  on public.real_savings_items for select to anon, authenticated using (true);
create policy "dashboard insert real savings items"
  on public.real_savings_items for insert to anon, authenticated with check (true);
create policy "dashboard delete real savings items"
  on public.real_savings_items for delete to anon, authenticated using (true);
