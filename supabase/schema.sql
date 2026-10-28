-- CampusSpot database schema, security policies and realtime setup.
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------- staff accounts
-- A row here marks a Supabase Auth user as café/library staff. Add rows by hand (see README, step 4).
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note    text
);

-- security definer so the policies below can check the staff list without exposing it.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- café seats (staff write)
create table if not exists public.cafe_seats (
  seat       int primary key check (seat between 0 and 15),   -- table*4 + chair
  taken      boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.cafe_seats (seat, taken)
  select s, false from generate_series(0, 15) s
  on conflict (seat) do nothing;

-- ---------------------------------------------------------------- library ILS (anonymous students write)
-- Marks are never deleted: the app treats a 'taken' mark older than 2 hours and a 'free' mark older than
-- 1 hour as expired, so a forgotten mark cannot stay red forever.
create table if not exists public.ils_marks (
  ils_id    text primary key check (ils_id ~ '^[ABC][0-9]{1,2}-[1-4]$'),
  state     text not null check (state in ('taken', 'free')),
  marked_at timestamptz not null default now(),
  device_id text not null check (char_length(device_id) between 8 and 64)
);

-- ---------------------------------------------------------------- parking (anonymous students write)
-- One row per space that has been logged. The app treats a space as free again 10 minutes after ends_at.
create table if not exists public.parking_logs (
  spot_id    text primary key check (spot_id ~ '^[A-E][0-9]{1,2}$'),
  started_at timestamptz not null default now(),
  ends_at    timestamptz not null,
  device_id  text not null check (char_length(device_id) between 8 and 64),
  check (ends_at > started_at),
  check (ends_at <= started_at + interval '12 hours')
);

-- ---------------------------------------------------------------- collab room bookings (staff write)
create table if not exists public.room_bookings (
  room_id text not null check (room_id in ('R1', 'R2')),
  day     date not null,
  slot    int  not null check (slot between 0 and 10),         -- 0 = 8:30 am ... 10 = 6:30 pm
  primary key (room_id, day, slot)
);

-- ---------------------------------------------------------------- Row Level Security
alter table public.staff         enable row level security;
alter table public.cafe_seats    enable row level security;
alter table public.ils_marks     enable row level security;
alter table public.parking_logs  enable row level security;
alter table public.room_bookings enable row level security;

-- Staff can see their own row (the app uses this to know whether to show edit controls).
drop policy if exists "staff read own" on public.staff;
create policy "staff read own" on public.staff for select to authenticated using (user_id = auth.uid());

-- Everyone (including signed-out students) can read availability.
drop policy if exists "read all" on public.cafe_seats;    create policy "read all" on public.cafe_seats    for select using (true);
drop policy if exists "read all" on public.ils_marks;     create policy "read all" on public.ils_marks     for select using (true);
drop policy if exists "read all" on public.parking_logs;  create policy "read all" on public.parking_logs  for select using (true);
drop policy if exists "read all" on public.room_bookings; create policy "read all" on public.room_bookings for select using (true);

-- Only staff can change café seats and room bookings.
drop policy if exists "staff write" on public.cafe_seats;
create policy "staff write" on public.cafe_seats for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff write" on public.room_bookings;
create policy "staff write" on public.room_bookings for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Anyone can mark an ILS or log parking. The column checks above limit what can be written
-- (valid ids, valid states, sensible times), but there is no per-person limit. See README "Limits".
drop policy if exists "students write" on public.ils_marks;
create policy "students write" on public.ils_marks for insert to anon, authenticated with check (true);
drop policy if exists "students update" on public.ils_marks;
create policy "students update" on public.ils_marks for update to anon, authenticated using (true) with check (true);

drop policy if exists "students insert" on public.parking_logs;
create policy "students insert" on public.parking_logs for insert to anon, authenticated with check (true);
drop policy if exists "students update" on public.parking_logs;
create policy "students update" on public.parking_logs for update to anon, authenticated using (true) with check (true);
drop policy if exists "students delete" on public.parking_logs;
create policy "students delete" on public.parking_logs for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------- realtime
-- Lets the app hear about changes instantly instead of polling.
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.cafe_seats;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.ils_marks;     exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.parking_logs;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.room_bookings; exception when duplicate_object then null; end;
  end if;
end $$;
