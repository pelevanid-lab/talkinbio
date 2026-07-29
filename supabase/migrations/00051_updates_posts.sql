-- Create Updates Posts table
create table public.updates_posts (
    id uuid primary key default uuid_generate_v4(),
    slug text unique not null,
    title text not null,
    excerpt text,
    content text not null,
    category text default 'news',
    image_url text,
    published_at timestamp with time zone default timezone('utc'::text, now()),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Updates Comments table
create table public.updates_comments (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.updates_posts(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.updates_posts enable row level security;
alter table public.updates_comments enable row level security;

-- Posts: Anyone can read published posts
create policy "Public can view updates posts" on public.updates_posts for select using (
    published_at <= now()
);

-- Comments: Anyone can read comments
create policy "Public can view updates comments" on public.updates_comments for select using (true);

-- Comments: Only logged in users can insert
create policy "Logged in users can post comments" on public.updates_comments for insert with check (
    auth.uid() = user_id
);

-- Comments: Users can delete their own comments
create policy "Users can delete their own comments" on public.updates_comments for delete using (
    auth.uid() = user_id
);

-- Insert 3 mock articles
insert into public.updates_posts (slug, title, excerpt, content, category, image_url) values
('talkinbio-v2-yayinda', 'Talkinbio V2 Yayında', 'Talkinbio V2 ile yepyeni bir altyapı ve gelişmiş yapay zeka özellikleri', 'Talkinbio V2 sürümü ile artık asistanlarınızı çok daha hızlı ve akıllı hale getirdik. Yeni sistemimiz sayesinde...', 'Ürün', null),
('saule-egitimi', 'Saule Eğitimi', 'Asistanınızı sadece 5 dakikada nasıl eğitirsiniz? Yeni rehber...', 'Saule, işletmenizin sorularına en doğru yanıtları verebilmesi için özel olarak tasarlandı. Onu eğitmek için...', 'Kılavuz', null),
('gelismis-analitik', 'Gelişmiş Analitik', 'Müşteri taleplerini veriye dönüştürün: Gelişmiş analitik...', 'Müşterilerinizin en çok ne sorduğunu bilmek ister misiniz? Gelişmiş analitik özelliklerimizle artık bu çok kolay...', 'Özellik', null);
