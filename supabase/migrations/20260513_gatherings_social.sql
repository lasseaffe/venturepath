-- VenturePath · Phase 3 · Gatherings Social Layer
-- Adds: gathering_messages (Realtime chat), gathering_proposals (Ledger votes)
-- Depends on: 20260512_gatherings.sql (gatherings, attendees, profiles + helper fns)

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.gathering_messages (
  id           uuid        primary key default gen_random_uuid(),
  gathering_id uuid        not null references public.gatherings(id) on delete cascade,
  pioneer_id   uuid        not null references public.profiles(id) on delete cascade,
  body         text        not null check (length(body) > 0 and length(body) <= 2000),
  reply_to     uuid        references public.gathering_messages(id) on delete set null,
  attachments  jsonb       not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_msg_gathering on public.gathering_messages(gathering_id, created_at desc);
create index if not exists idx_msg_reply_to  on public.gathering_messages(reply_to);

create table if not exists public.gathering_proposals (
  id              uuid        primary key default gen_random_uuid(),
  gathering_id    uuid        not null references public.gatherings(id) on delete cascade,
  field           text        not null check (field in ('time','location','menu','gear','custom')),
  proposed_value  jsonb       not null,
  proposed_by     uuid        not null references public.profiles(id) on delete cascade,
  status          text        not null default 'open'
                              check (status in ('open','adopted','rejected')),
  votes           jsonb       not null default '{}'::jsonb,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_proposal_gathering on public.gathering_proposals(gathering_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS + POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.gathering_messages  enable row level security;
alter table public.gathering_proposals enable row level security;

-- ─── messages ──────────────────────────────────────────────────────────────

drop policy if exists "messages_select" on public.gathering_messages;
create policy "messages_select"
  on public.gathering_messages for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "messages_insert_self" on public.gathering_messages;
create policy "messages_insert_self"
  on public.gathering_messages for insert to authenticated
  with check (
    pioneer_id = auth.uid()
    and can_view_gathering(gathering_id)
  );

drop policy if exists "messages_delete_self" on public.gathering_messages;
create policy "messages_delete_self"
  on public.gathering_messages for delete to authenticated
  using (pioneer_id = auth.uid() or is_gathering_convener(gathering_id));

-- ─── proposals ─────────────────────────────────────────────────────────────

drop policy if exists "proposals_select" on public.gathering_proposals;
create policy "proposals_select"
  on public.gathering_proposals for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "proposals_insert_self" on public.gathering_proposals;
create policy "proposals_insert_self"
  on public.gathering_proposals for insert to authenticated
  with check (
    proposed_by = auth.uid()
    and can_view_gathering(gathering_id)
  );

-- Anyone who can view can update votes (UI restricts to vote field only);
-- convener can also flip status (adopt/reject).
drop policy if exists "proposals_update" on public.gathering_proposals;
create policy "proposals_update"
  on public.gathering_proposals for update to authenticated
  using (can_view_gathering(gathering_id))
  with check (can_view_gathering(gathering_id));

drop policy if exists "proposals_delete" on public.gathering_proposals;
create policy "proposals_delete"
  on public.gathering_proposals for delete to authenticated
  using (proposed_by = auth.uid() or is_gathering_convener(gathering_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RPC: cast_proposal_vote — atomic vote update
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.cast_proposal_vote(p_id uuid, p_vote text)
returns public.gathering_proposals
language plpgsql security definer
set search_path = public
as $$
declare
  v_row public.gathering_proposals;
  v_uid uuid := auth.uid();
begin
  if p_vote not in ('up','down','clear') then
    raise exception 'invalid vote: %', p_vote;
  end if;

  -- Permission check via existing helper
  select * into v_row from public.gathering_proposals where id = p_id;
  if not found then raise exception 'proposal not found'; end if;
  if not public.can_view_gathering(v_row.gathering_id) then
    raise exception 'forbidden';
  end if;

  if p_vote = 'clear' then
    update public.gathering_proposals
       set votes = votes - v_uid::text
     where id = p_id
     returning * into v_row;
  else
    update public.gathering_proposals
       set votes = jsonb_set(votes, array[v_uid::text], to_jsonb(p_vote), true)
     where id = p_id
     returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. REALTIME publication
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tables to supabase_realtime publication (idempotent).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.gathering_messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.gathering_proposals;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.gathering_beacons;
    exception when duplicate_object then null;
    end;
  end if;
end$$;
