-- Shop Khata — database schema
-- Run this once in Supabase: Project > SQL Editor > New query > paste all > Run

create extension if not exists "pgcrypto";

-- 1. Profile per shopkeeper (one row per signed-up user, keyed by phone)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  shop_name text default 'My Shop',
  created_at timestamptz default now()
);

-- 2. One row per calendar day per shop
create table if not exists shop_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  opening_time time,
  opening_amount numeric,
  closing_time time,
  closing_amount numeric,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- 3. Small daily expenses (tea, food, etc.), linked to a shop_day
create table if not exists shop_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references shop_days(id) on delete cascade,
  description text not null,
  amount numeric not null,
  time time,
  created_at timestamptz default now()
);

-- 4. Monthly rent, one row per user per month
create table if not exists monthly_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month char(7) not null, -- 'YYYY-MM'
  rent numeric default 0,
  created_at timestamptz default now(),
  unique (user_id, month)
);

-- 5. Individual monthly bills (electricity, gas, etc.)
create table if not exists monthly_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month char(7) not null,
  description text not null,
  amount numeric not null,
  created_at timestamptz default now()
);

-- 6. Inventory purchases and sales
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  qty numeric not null,
  cost numeric not null,
  purchase_date date not null,
  status text not null default 'pending', -- 'pending' | 'sold'
  sale_amount numeric,
  sale_date date,
  created_at timestamptz default now()
);

-- Indexes for the queries the app actually runs
create index if not exists idx_shop_days_user_date on shop_days(user_id, date);
create index if not exists idx_expenses_user_day on shop_expenses(user_id, day_id);
create index if not exists idx_monthly_expenses_user_month on monthly_expenses(user_id, month);
create index if not exists idx_monthly_bills_user_month on monthly_bills(user_id, month);
create index if not exists idx_inventory_user on inventory_items(user_id);

-- Auto-create a profile row the moment someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ ROW LEVEL SECURITY ============
-- This is what keeps every shopkeeper's data private from every other one,
-- even though they all share the same database and tables.

alter table profiles enable row level security;
alter table shop_days enable row level security;
alter table shop_expenses enable row level security;
alter table monthly_expenses enable row level security;
alter table monthly_bills enable row level security;
alter table inventory_items enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own days" on shop_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own expenses" on shop_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own monthly expenses" on monthly_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own monthly bills" on monthly_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own inventory" on inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
