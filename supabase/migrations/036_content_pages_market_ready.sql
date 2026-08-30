create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('blog','landing')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  excerpt text,
  body text not null default '',
  hero_title text,
  hero_subtitle text,
  cta_label text,
  cta_href text,
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_pages enable row level security;
create policy "public reads published content" on public.content_pages for select to anon using (status='published' and (published_at is null or published_at <= now()));
create policy "authenticated reads published content" on public.content_pages for select to authenticated using ((status='published' and (published_at is null or published_at <= now())) or private.is_admin());
create policy "admins manage content" on public.content_pages for all to authenticated using (private.is_admin()) with check (private.is_admin());
create index if not exists content_pages_public_idx on public.content_pages(kind,status,published_at desc);
grant select on public.content_pages to anon, authenticated;
