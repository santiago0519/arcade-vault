-- SPEC 07 — Catálogo de juegos y leaderboard en Supabase
-- Tablas games y scores, RLS con políticas abiertas y semilla de 'asteroides'.

create table public.games (
  id                text primary key,            -- slug: 'asteroides'
  title             text not null,
  short_description text not null,
  long_description  text not null,
  category          text not null,               -- 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
  cover             text not null,               -- clase CSS: 'cover-asteroides'
  color             text not null,               -- 'cyan' | 'magenta' | 'yellow' | 'green'
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null,
  score       integer not null,
  user_id     uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_leaderboard_idx on public.scores (game_id, score desc, created_at asc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_public" on public.scores for insert to anon, authenticated with check (true);

insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'asteroides',
  'ASTEROIDES',
  'Rota, propulsa y dispara: parte las rocas antes de que te alcancen.',
  'Tu nave vectorial flota en un espacio sin bordes: lo que sale por un lado entra por el otro. Cada disparo parte los asteroides grandes en medianos y los medianos en pequeños. Recoge el power-up cian para disparar en triple durante unos segundos y limpia el campo para saltar de nivel, con más rocas cada vez.',
  'SHOOTER',
  'cover-asteroides',
  'cyan',
  0
);
