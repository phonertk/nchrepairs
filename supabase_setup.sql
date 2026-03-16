-- ============================================================
-- FixFlow v2 — Supabase Setup (Username-based Login)
-- รัน script นี้ใน SQL Editor (ลบของเดิมออกก่อน หรือ run ทับได้เลย)
-- ============================================================

-- ─── 1. ตาราง profiles (มี username) ───
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  username   text unique not null,
  full_name  text not null default '',
  phone      text default '',
  department text default '',
  role       text not null default 'user',
  created_at timestamptz default now()
);

-- ─── 2. ตาราง tickets ───
create table if not exists public.tickets (
  id          serial primary key,
  ticket_no   text unique,
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text default '',
  user_email  text default '',
  title       text not null,
  type        text not null,
  priority    text not null default 'med',
  location    text default '',
  description text not null,
  phone       text default '',
  status      text not null default 'pending',
  admin_note  text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── 3. ตาราง ticket_logs ───
create table if not exists public.ticket_logs (
  id         serial primary key,
  ticket_id  integer references public.tickets(id) on delete cascade,
  message    text not null,
  created_by text default 'system',
  created_at timestamptz default now()
);

-- ─── 4. Auto updated_at ───
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists on_ticket_updated on public.tickets;
create trigger on_ticket_updated
  before update on public.tickets
  for each row execute procedure public.handle_updated_at();

-- ─── 5. Auto create profile เมื่อ user ถูกสร้างผ่าน Admin API ───
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 6. Auto generate ticket_no ───
create or replace function public.generate_ticket_no()
returns trigger language plpgsql as $$
declare next_num integer;
begin
  select coalesce(max(id), 0) + 1 into next_num from public.tickets;
  new.ticket_no = 'TK-' || lpad(next_num::text, 4, '0');
  return new;
end; $$;

drop trigger if exists before_ticket_insert on public.tickets;
create trigger before_ticket_insert
  before insert on public.tickets
  for each row execute procedure public.generate_ticket_no();

-- ─── 7. Helper: is_admin ───
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── 8. Row Level Security ───
alter table public.profiles    enable row level security;
alter table public.tickets     enable row level security;
alter table public.ticket_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_admin_all"  on public.profiles;
drop policy if exists "tickets_select_own"  on public.tickets;
drop policy if exists "tickets_insert_own"  on public.tickets;
drop policy if exists "tickets_admin_all"   on public.tickets;
drop policy if exists "logs_select_own"     on public.ticket_logs;
drop policy if exists "logs_insert_any"     on public.ticket_logs;
drop policy if exists "logs_admin_all"      on public.ticket_logs;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "profiles_insert_own" on public.profiles for insert with check (true);
create policy "profiles_admin_all"  on public.profiles for delete using (public.is_admin());

create policy "tickets_select_own"  on public.tickets for select using (user_id = auth.uid() or public.is_admin());
create policy "tickets_insert_own"  on public.tickets for insert with check (user_id = auth.uid());
create policy "tickets_admin_all"   on public.tickets for all    using (public.is_admin());

create policy "logs_select_own"     on public.ticket_logs for select
  using (public.is_admin() or exists (
    select 1 from public.tickets where id = ticket_id and user_id = auth.uid()
  ));
create policy "logs_insert_any"     on public.ticket_logs for insert with check (true);
create policy "logs_admin_all"      on public.ticket_logs for all using (public.is_admin());

-- ============================================================
-- ขั้นตอนสร้าง Admin คนแรก:
-- 1. ไปที่ Supabase Dashboard → Authentication → Users → Add user
--    email: admin@internal.local  |  password: ตั้งเอง
-- 2. รัน SQL นี้ (แทน UUID ที่ได้จากขั้นตอน 1):
--    UPDATE public.profiles
--    SET username='admin', role='admin', full_name='Administrator'
--    WHERE id = 'วาง-UUID-ตรงนี้';
-- ============================================================
