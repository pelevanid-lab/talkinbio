'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { touchpointCategories, type TouchpointFrameworkStep, type TouchpointPageContent } from '@/components/home/homeData';
import { editorialArticles } from '@/components/editorial/editorialData';
import styles from './touchpoints.module.css';

// Keys match the SIGNAL framework letters exactly — see homeData's touchpointPages[...].framework.steps,
// the single source of truth both this result grid and the "SIGNAL modeli" card render against.
type SignalBreakdown = {
  s: string;
  i: string;
  g: string;
  n: string;
  a: string;
  l: string;
};

type CaseStudyRecord = {
  id: string;
  query: string;
  title: string;
  narrative: string;
  signal: SignalBreakdown;
  created_at: string;
};

// The 6 cards this page owns outright. "nextHub" is a small waypoint card sitting exactly where
// the orange thread forks into the 3 next-touchpoint cards (see nextCardStyles below) — it marks
// the branch, the 3 cards past it are the actual destinations.
type OwnCardId = 'signal' | 'paths' | 'articles' | 'caseStudy' | 'framework' | 'nextHub';
type CardId = OwnCardId | string;

const cardMeta: Record<OwnCardId, { eyebrow: string; label: string; style: CSSProperties }> = {
  signal: { eyebrow: 'İNTERAKTİF', label: 'Arama sinyali', style: { top: '8%', right: '32%', transform: 'rotate(-2deg)' } },
  paths: { eyebrow: 'DÖRT YOL', label: 'Keşif yolları', style: { top: '6%', right: '4%', transform: 'rotate(1.8deg)' } },
  framework: { eyebrow: 'FRAMEWORK', label: 'SIGNAL modeli', style: { top: '30%', right: '20%', transform: 'rotate(-1deg)' } },
  caseStudy: { eyebrow: 'İNTERAKTİF', label: 'Vaka çalışması', style: { top: '50%', right: '2%', transform: 'rotate(1deg)' } },
  articles: { eyebrow: 'YAKINDA', label: 'Makaleler', style: { top: '60%', right: '32%', transform: 'rotate(-1.6deg)' } },
  nextHub: { eyebrow: 'SONRAKİ', label: 'Sonraki temas noktaları', style: { top: '66%', right: '24%', transform: 'rotate(0.6deg)' } },
};

const cardOrder: OwnCardId[] = ['signal', 'paths', 'framework', 'caseStudy', 'articles', 'nextHub'];

// Positions for up to 3 "next touchpoint" cards, filled in order from content.nextTouchpointIds —
// generic slots (not tied to a specific category) so this stays reusable for future /kesfet pages.
const nextCardStyles: CSSProperties[] = [
  { bottom: '18%', right: '36%', transform: 'rotate(1deg)' },
  { bottom: '8%', right: '18%', transform: 'rotate(-1.4deg)' },
  { bottom: '2%', right: '1%', transform: 'rotate(0.6deg)' },
];

function SignalDemo({
  prompt,
  examplePlaceholder,
  frameworkSteps,
  onRequestCaseStudy,
}: {
  prompt: string;
  examplePlaceholder: string;
  frameworkSteps: TouchpointFrameworkStep[];
  onRequestCaseStudy: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [signal, setSignal] = useState<SignalBreakdown | null>(null);
  const [error, setError] = useState('');

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/kesfet/search-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Analiz şu an yapılamadı.');
      setSignal(data.signal as SignalBreakdown);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz şu an yapılamadı.');
      setStatus('error');
    }
  }

  return (
    <div className={styles.signalCard}>
      <form className={styles.signalForm} onSubmit={submitQuery}>
        <label className="sr-only" htmlFor="signal-query">{prompt}</label>
        <input
          id="signal-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={examplePlaceholder}
          maxLength={140}
          autoComplete="off"
        />
        <button type="submit" disabled={!query.trim() || status === 'loading'}>
          {status === 'loading' ? <Loader2 className="animate-spin" aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={16} />}
          Niyeti oku
        </button>
      </form>

      {status === 'loading' ? <p className={styles.signalStatus}>Talkinbio aramanı okuyor...</p> : null}
      {status === 'error' ? <p className={styles.signalError} role="alert">{error}</p> : null}

      {status === 'done' && signal ? (
        <div aria-live="polite">
          <span className={styles.signalResultLabel}>SIGNAL modeliyle analiz et</span>
          <div className={styles.frameworkGrid}>
            {frameworkSteps.map((step) => (
              <div key={step.letter} className={styles.frameworkStep}>
                <strong><span>{step.letter}</span>{step.word}</strong>
                <p>{signal[step.letter.toLowerCase() as keyof SignalBreakdown]}</p>
              </div>
            ))}
          </div>
          <button type="button" className={styles.caseStudyCta} onClick={() => onRequestCaseStudy(query.trim())}>
            Bu aramadan vaka analizi oluştur <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CaseStudyDemo({
  categorySlug,
  teaser,
  seedQuery,
  onSeeded,
}: {
  categorySlug: string;
  teaser: { title: string; teaser: string };
  seedQuery: string | null;
  onSeeded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<CaseStudyRecord | null>(null);
  const [error, setError] = useState('');
  const [gallery, setGallery] = useState<CaseStudyRecord[]>([]);
  const [galleryStatus, setGalleryStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const lastSeedRef = useRef<string | null>(null);

  async function runCaseStudy(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/kesfet/case-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, categorySlug }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Vaka analizi oluşturulamadı.');
      const saved = data.caseStudy as CaseStudyRecord;
      setResult(saved);
      setStatus('done');
      setGallery((current) => [saved, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vaka analizi oluşturulamadı.');
      setStatus('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadGallery() {
      try {
        const response = await fetch(`/api/kesfet/case-study?slug=${encodeURIComponent(categorySlug)}`);
        const data = await response.json().catch(() => ({}));
        if (!cancelled) {
          setGallery((current) => (current.length > 0 ? current : (data.caseStudies as CaseStudyRecord[]) || []));
          setGalleryStatus('done');
        }
      } catch {
        if (!cancelled) setGalleryStatus('error');
      }
    }
    void loadGallery();
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  useEffect(() => {
    if (seedQuery && lastSeedRef.current !== seedQuery) {
      lastSeedRef.current = seedQuery;
      setQuery(seedQuery);
      void runCaseStudy(seedQuery);
      onSeeded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery]);

  return (
    <>
      <div className={styles.caseStudyIntro}>
        <p>{teaser.teaser}</p>
      </div>

      <div className={styles.signalCard}>
        <form
          className={styles.signalForm}
          onSubmit={(event) => {
            event.preventDefault();
            void runCaseStudy(query);
          }}
        >
          <label className="sr-only" htmlFor="case-study-query">Bir arama yaz</label>
          <input
            id="case-study-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="örn. çocuğum için en iyi kaleci eldiveni"
            maxLength={140}
            autoComplete="off"
          />
          <button type="submit" disabled={!query.trim() || status === 'loading'}>
            {status === 'loading' ? <Loader2 className="animate-spin" aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={16} />}
            Vaka analizi oluştur
          </button>
        </form>

        {status === 'loading' ? <p className={styles.signalStatus}>Talkinbio vaka analizini yazıyor...</p> : null}
        {status === 'error' ? <p className={styles.signalError} role="alert">{error}</p> : null}

        {status === 'done' && result ? (
          <div className={styles.caseStudyResult} aria-live="polite">
            <span className={styles.signalResultLabel}>{result.title}</span>
            <p>{result.narrative}</p>
          </div>
        ) : null}
      </div>

      <div className={styles.caseStudyGallery}>
        <span>HAZIR VAKA ANALİZLERİNİ İNCELE</span>
        {galleryStatus === 'loading' ? <p className={styles.signalStatus}>Yükleniyor...</p> : null}
        {galleryStatus === 'error' ? <p className={styles.signalStatus}>Analizler şu an yüklenemedi.</p> : null}
        {galleryStatus === 'done' && gallery.length === 0 ? (
          <p className={styles.signalStatus}>Henüz bir analiz yok — ilkini sen oluştur.</p>
        ) : null}
        <div className={styles.galleryList}>
          {gallery.map((item) => {
            const open = expandedId === item.id;
            return (
              <div key={item.id} className={styles.galleryRow} data-open={open}>
                <button type="button" onClick={() => setExpandedId((current) => (current === item.id ? null : item.id))} aria-expanded={open}>
                  <span>{item.title}</span>
                  <ArrowRight aria-hidden="true" size={14} />
                </button>
                {open ? <p>{item.narrative}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function TouchpointCategoryPage({ content }: { content: TouchpointPageContent }) {
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const [caseStudySeedQuery, setCaseStudySeedQuery] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenCard(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const nextTouchpoints = content.nextTouchpointIds
    .map((id) => touchpointCategories.find((category) => category.id === id))
    .filter((category): category is (typeof touchpointCategories)[number] => Boolean(category));

  function requestCaseStudy(query: string) {
    if (!query) return;
    setCaseStudySeedQuery(query);
    setOpenCard('caseStudy');
  }

  function renderPanelBody(card: CardId): ReactNode {
    switch (card) {
      case 'signal':
        return (
          <>
            <header className={styles.panelHeader}>
              <span>İNTERAKTİF ARAMA SİNYALİ</span>
              <h2>{content.signal.prompt}</h2>
              <p>Bir arama yaz, Talkinbio arkasındaki niyeti SIGNAL modeliyle okusun.</p>
            </header>
            <SignalDemo
              prompt={content.signal.prompt}
              examplePlaceholder={content.signal.examplePlaceholder}
              frameworkSteps={content.framework.steps}
              onRequestCaseStudy={requestCaseStudy}
            />
          </>
        );
      case 'paths':
        return (
          <>
            <header className={styles.panelHeader}>
              <span>DÖRT KEŞİF YOLU</span>
              <h2>Aynı niyet, dört farklı yüzey.</h2>
            </header>
            <div className={styles.pathGrid}>
              {content.discoveryPaths.map((path) => (
                <article key={path.title} className={styles.pathCard}>
                  <h3>{path.title}</h3>
                  <p>{path.question}</p>
                  <ul>
                    {path.topics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </>
        );
      case 'articles':
        const linkedArticles = editorialArticles.filter((article) =>
          content.articles.includes(article.title.replace(/\.$/, '')) ||
          article.topicSlugs.includes('customer-and-market-insights')
        );
        return (
          <>
            <header className={styles.panelHeader}>
              <span>ÖNE ÇIKAN MAKALELER</span>
              <h2>Aramadan pazarlama kararına.</h2>
            </header>
            <div className={styles.articleGrid}>
              {linkedArticles.map((article) => (
                <Link key={article.slug} href={`/articles/${article.slug}`} className={styles.articleCard}>
                  <small>{article.eyebrow} · {article.readingTime}</small>
                  <h3>{article.title}</h3>
                </Link>
              ))}
            </div>
            <div className={styles.manifesto}>
              {content.manifesto.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <span className={styles.manifestoClaim}>{content.coreClaim}</span>
            </div>
          </>
        );
      case 'caseStudy':
        return (
          <>
            <header className={styles.panelHeader}>
              <span>VAKA ÇALIŞMASI</span>
              <h2>{content.caseStudy.title}</h2>
            </header>
            <CaseStudyDemo
              categorySlug={content.slug}
              teaser={content.caseStudy}
              seedQuery={caseStudySeedQuery}
              onSeeded={() => setCaseStudySeedQuery(null)}
            />
          </>
        );
      case 'framework':
        return (
          <>
            <header className={styles.panelHeader}>
              <span>KULLANILABİLİR FRAMEWORK</span>
              <h2>{content.framework.name} modeli</h2>
            </header>
            <div className={styles.frameworkGrid}>
              {content.framework.steps.map((step) => (
                <div key={step.letter} className={styles.frameworkStep}>
                  <strong><span>{step.letter}</span>{step.word}</strong>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
            <div className={styles.frameworkRun}>
              <span>SONUÇLARI SIGNAL MODELİYLE ANALİZ ET</span>
              <p>Model tanım olarak kalmasın — bir arama yaz, yukarıdaki 6 adımı gerçek bir sonuç üzerinde canlı gör.</p>
              <SignalDemo
                prompt={content.signal.prompt}
                examplePlaceholder={content.signal.examplePlaceholder}
                frameworkSteps={content.framework.steps}
                onRequestCaseStudy={requestCaseStudy}
              />
            </div>
          </>
        );
      case 'nextHub':
        return (
          <>
            <header className={styles.panelHeader}>
              <span>SONRAKİ TEMAS NOKTALARI</span>
              <h2>Yol burada bitmiyor.</h2>
              <p>Bu arama sinyali seni üç yöne birden götürebilir — hangisi olduğunu seç.</p>
            </header>
            <div className={styles.nextGrid}>
              {nextTouchpoints.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={styles.nextCardButton}
                  onClick={() => setOpenCard(category.id)}
                >
                  <span>
                    <small>{category.eyebrow}</small>
                    <strong>{category.label}</strong>
                  </span>
                  <ArrowRight aria-hidden="true" size={14} />
                </button>
              ))}
            </div>
          </>
        );
      default: {
        const nextCategory = nextTouchpoints.find((category) => category.id === card);
        if (!nextCategory) return null;
        return (
          <>
            <header className={styles.panelHeader}>
              <span>{nextCategory.eyebrow}</span>
              <h2>{nextCategory.label}</h2>
              <p>Yol burada bitmiyor — bu temas noktasının kendi sayfası hazırlanıyor.</p>
            </header>
            <div className={styles.nextGrid}>
              <div className={styles.nextCard}>
                <small>{nextCategory.eyebrow}</small>
                <strong>{nextCategory.label}</strong>
                <p>Sayfası yakında.</p>
              </div>
            </div>
          </>
        );
      }
    }
  }

  return (
    <div className={styles.page} data-revealed="true">
      <video
        className={styles.media}
        src={content.videoSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
      />
      <div className={styles.scrim} aria-hidden="true" />
      <svg className={styles.line} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {/* Main thread through the owned cards, ending at the nextHub waypoint, then forks into
            up to 3 branches — one per next touchpoint — right where nextHub sits. */}
        <path d="M68,8 C84,2 94,2 96,6 C99,10 82,24 80,30 C77,36 100,44 98,50 C96,56 74,58 70,60 C68,62 78,64 76,66" />
        {nextTouchpoints[0] ? <path d="M76,66 C72,72 68,78 64,82" /> : null}
        {nextTouchpoints[1] ? <path d="M76,66 C80,75 82,86 84,92" /> : null}
        {nextTouchpoints[2] ? <path d="M76,66 C88,75 96,90 100,98" /> : null}
      </svg>
      <Link href="/" className={styles.logo} aria-label="Talkinbio ana sayfa">
        <span>talkinbio</span>
      </Link>

      <div className={styles.homeScreen} aria-hidden={Boolean(openCard)} data-hidden={Boolean(openCard)}>
        <div className={styles.homeCopy}>
          <span>{content.eyebrow}</span>
          <h1>{content.headline}</h1>
          <p>{content.subhead}</p>
        </div>
        <div className={styles.cardField} aria-label={`${content.eyebrow} — bölümler`}>
          {cardOrder.map((card) => {
            // On mobile this one card stands in for the whole fork (see .cardMobileLabel /
            // .nextTouchpointCard in CSS) — it shows the first next touchpoint's name instead of
            // the generic hub label, and the 3 individual cards below hide themselves entirely.
            if (card === 'nextHub' && nextTouchpoints[0]) {
              return (
                <button key={card} type="button" className={styles.card} style={cardMeta[card].style} onClick={() => setOpenCard(card)}>
                  <span className={styles.cardDesktopLabel}>
                    <small>{cardMeta[card].eyebrow}</small>
                    <span>{cardMeta[card].label}</span>
                  </span>
                  <span className={styles.cardMobileLabel}>
                    <small>{`${cardMeta[card].eyebrow} - ${nextTouchpoints[0].eyebrow}`}</small>
                    <span>{nextTouchpoints[0].label}</span>
                  </span>
                </button>
              );
            }
            return (
              <button
                key={card}
                type="button"
                className={styles.card}
                style={cardMeta[card].style}
                onClick={() => setOpenCard(card)}
              >
                <small>{cardMeta[card].eyebrow}</small>
                <span>{cardMeta[card].label}</span>
              </button>
            );
          })}
          {nextTouchpoints.map((category, index) => (
            <button
              key={category.id}
              type="button"
              className={`${styles.card} ${styles.nextTouchpointCard}`}
              style={nextCardStyles[index]}
              onClick={() => setOpenCard(category.id)}
            >
              <small>{category.eyebrow}</small>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {openCard ? (
        <button type="button" className={styles.backdrop} aria-label="Arama & Keşif ana ekranına dön" onClick={() => setOpenCard(null)} />
      ) : null}

      <article className={styles.panel} data-open={Boolean(openCard)} aria-hidden={!openCard}>
        <div className={styles.panelScroll}>
          <button type="button" className={styles.panelBack} onClick={() => setOpenCard(null)}>
            <ArrowLeft aria-hidden="true" size={15} /> {content.eyebrow}
          </button>
          {openCard ? renderPanelBody(openCard) : null}
        </div>
      </article>
    </div>
  );
}
