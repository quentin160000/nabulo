-- Thermo·Mot · Mot du jour
-- Le mot secret ne quitte jamais le serveur : l'appli n'a accès qu'aux fonctions ci-dessous.

create extension if not exists vector;

-- Vocabulaire et vecteurs (fastText 300 dimensions, normalisés), une ligne par mot et par langue.
create table if not exists public.words (
  lang      text   not null check (lang in ('fr', 'en')),
  word      text   not null,
  embedding vector(300) not null,
  primary key (lang, word)
);

-- Programme des mots du jour : jour n°1 = 1er janvier 2026.
create table if not exists public.daily_words (
  lang text    not null check (lang in ('fr', 'en')),
  day  integer not null check (day >= 1),
  word text    not null,
  primary key (lang, day),
  foreign key (lang, word) references public.words (lang, word)
);

-- Les 1 000 voisins les plus proches de chaque mot du jour, calculés à l'avance (rang « ‰ » et indices).
create table if not exists public.daily_neighbors (
  lang        text    not null,
  day         integer not null,
  rank        integer not null check (rank between 1 and 1000),
  word        text    not null,
  similarity  real    not null,
  primary key (lang, day, rank),
  foreign key (lang, day) references public.daily_words (lang, day) on delete cascade
);
create index if not exists daily_neighbors_word on public.daily_neighbors (lang, day, word);

-- Personne ne lit ces tables directement depuis l'appli.
alter table public.words enable row level security;
alter table public.daily_words enable row level security;
alter table public.daily_neighbors enable row level security;

-- Jour courant côté serveur (Europe/Paris) : on n'accepte pas les jours futurs.
create or replace function public.current_day() returns integer
language sql stable as $$
  select (((now() at time zone 'Europe/Paris')::date - date '2026-01-01') + 1)::integer
$$;

-- Température d'un essai.
create or replace function public.guess_word(p_lang text, p_day integer, p_word text)
returns table (known boolean, temperature numeric, rank integer, found boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_secret text; v_sim real;
begin
  if p_day > current_day() then raise exception 'jour pas encore ouvert'; end if;
  select d.word into v_secret from daily_words d where d.lang = p_lang and d.day = p_day;
  if v_secret is null then raise exception 'pas de mot pour ce jour'; end if;
  select 1 - (w.embedding <=> s.embedding) into v_sim
    from words w, words s
   where w.lang = p_lang and w.word = lower(trim(p_word)) and s.lang = p_lang and s.word = v_secret;
  if v_sim is null then
    return query select false, null::numeric, null::integer, false; return;
  end if;
  return query select true,
    case when lower(trim(p_word)) = v_secret then 100::numeric else least(99.9, round((v_sim * 100)::numeric, 1)) end,
    (select n.rank from daily_neighbors n where n.lang = p_lang and n.day = p_day and n.word = lower(trim(p_word))),
    lower(trim(p_word)) = v_secret;
end $$;

-- Indice : le voisin le plus froid qui reste au-dessus du meilleur essai.
create or replace function public.hint_word(p_lang text, p_day integer, p_above numeric, p_exclude text[])
returns table (word text, temperature numeric)
language sql stable security definer set search_path = public as $$
  select n.word, least(99.9, round((n.similarity * 100)::numeric, 1))
    from daily_neighbors n
   where n.lang = p_lang and n.day = p_day and n.day <= current_day()
     and n.rank between 2 and 300
     and not (n.word = any (coalesce(p_exclude, '{}')))
   order by (n.similarity * 100 > p_above) desc, n.similarity asc
   limit 1
$$;

-- Mots les plus proches et mot secret : seulement pour les jours passés, ou pour celui qui a trouvé
-- (vérification côté appli pour la V1 ; à durcir avec les comptes utilisateurs).
create or replace function public.closest_words(p_lang text, p_day integer, p_count integer)
returns table (word text, temperature numeric)
language sql stable security definer set search_path = public as $$
  select n.word, case when n.rank = 1 then 100::numeric else least(99.9, round((n.similarity * 100)::numeric, 1)) end
    from daily_neighbors n
   where n.lang = p_lang and n.day = p_day and n.day <= current_day()
   order by n.rank
   limit least(greatest(p_count, 1), 100)
$$;

create or replace function public.reveal_word(p_lang text, p_day integer)
returns text language sql stable security definer set search_path = public as $$
  select d.word from daily_words d where d.lang = p_lang and d.day = p_day and d.day <= current_day()
$$;

grant execute on function public.guess_word(text, integer, text) to anon, authenticated;
grant execute on function public.hint_word(text, integer, numeric, text[]) to anon, authenticated;
grant execute on function public.closest_words(text, integer, integer) to anon, authenticated;
grant execute on function public.reveal_word(text, integer) to anon, authenticated;
