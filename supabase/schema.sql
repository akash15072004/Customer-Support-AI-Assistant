-- Customer Support AI Assistant schema aligned with the current Supabase tables.
-- This version uses messages.sender and escalations, matching the existing project database.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text not null default 'Guest',
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  status text not null default 'open' check (status in ('open','escalated','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender text not null check (sender in ('customer','ai','human')),
  content text not null,
  classification text check (classification in ('general_question','technical_issue','billing','urgent')),
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create table if not exists escalations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  classification text,
  reason text not null,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending','notified','resolved')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_one_pending_escalation_per_conversation
on escalations(conversation_id)
where status = 'pending';

create table if not exists ai_failures (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  failure_type text not null check (failure_type in ('api_error','timeout','invalid_output')),
  detail text,
  created_at timestamptz not null default now()
);

-- Safe migration for an existing database that was missing updated_at.
alter table conversations add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_conversations_status on conversations(status);

create or replace function touch_conversation_updated_at()
returns trigger as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_conversation on messages;
create trigger trg_touch_conversation
after insert on messages
for each row execute function touch_conversation_updated_at();

alter table users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table escalations enable row level security;
alter table ai_failures enable row level security;
