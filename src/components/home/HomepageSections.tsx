'use client';

import Image from 'next/image';
import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, Camera, Mail, Music } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import {
  capabilityItems,
  examplePages,
  intentCopy,
  sectionMeta,
  setupSteps,
  suggestedQuestions,
  type HomepageIntent,
  type HomepageSectionId,
} from './homeData';
import PresenceIndicator from './PresenceIndicator';
import VoicePromptButton from './VoicePromptButton';
import styles from './home.module.css';

type HomepageGuideResult = {
  answer: string;
  mode: 'section' | 'link' | 'answer' | 'contact';
  targetSection: HomepageSectionId | null;
  linkHref: string | null;
  linkLabel: string | null;
  provider: string;
};

const askPageDemos: Record<string, { answer: string; actions: [string, string] }> = {
  'What do you charge?': {
    answer: 'My page can show pricing first, then guide you to the right package or booking step.',
    actions: ['See pricing', 'Ask a follow-up'],
  },
  'Are you available this week?': {
    answer: 'Yes. I have two available slots this week. Would you like to book a call?',
    actions: ['Book a call', 'See my work'],
  },
  'Where can I see your work?': {
    answer: 'You can start with the selected reel, then open the full portfolio without searching.',
    actions: ['See my work', 'Play reel'],
  },
  'Do you work internationally?': {
    answer: 'Yes. I work remotely with clients in Europe, the US and the UK.',
    actions: ['Check fit', 'Send brief'],
  },
};

export function BrandLogo() {
  return (
    <span className={styles.logo} aria-label="talkinbio">
      <span>talkinbio</span>
      <PresenceIndicator state="idle" />
    </span>
  );
}

export function HeroSection({
  activeIntent,
  activeResponse,
  adapted,
  orderedSections,
  onIntentSelect,
  onCreateClick,
}: {
  activeIntent: HomepageIntent | null;
  activeResponse: string | null;
  adapted: boolean;
  orderedSections: HomepageSectionId[];
  onIntentSelect: (intent: 'curious' | 'create_page' | 'existing_link_bio') => void;
  onCreateClick: (source: string) => void;
}) {
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);

  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroCopy}>
        <span className={styles.sectionNumber}>01</span>
        <h1 id="home-hero-title">
          <span>The web</span>
          <span>is too</span>
          <span>quiet.</span>
        </h1>
        <p className={styles.heroLead}>
          Pages were made to be visited.
          <br />
          We think they should talk back.
        </p>
        <p className={styles.heroProduct}>
          Talkinbio turns your page into an interactive space that can answer, guide and respond to every visitor.
        </p>
        <div className={styles.heroActions}>
          <Link href="/register" className={styles.primaryButton} onClick={() => onCreateClick('hero')}>
            Create your page <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <a href="#ask" className={styles.textButton}>
            See it talk <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
      </div>

      <div className={styles.heroInterface} data-voice-speaking={voiceSpeaking}>
        <div className={styles.brushField} aria-hidden="true" />
        <div className={styles.intentPanel}>
          <div className={styles.systemRow}>
            <PresenceIndicator state={adapted ? 'adapted' : activeResponse ? 'responding' : 'listening'} />
            <span>{adapted ? 'INTERFACE ADAPTED TO YOUR INTENT' : 'STATUS: LISTENING'}</span>
            <VoicePromptButton onSpeakingChange={setVoiceSpeaking} />
          </div>
          <p className={styles.intentQuestion}>So, what brought you here?</p>
          <div className={styles.intentChoices} aria-label="Choose what brought you here">
            <button type="button" data-selected={activeIntent === 'curious'} onClick={() => onIntentSelect('curious')}>
              I&apos;m curious.
            </button>
            <button type="button" data-selected={activeIntent === 'create_page'} onClick={() => onIntentSelect('create_page')}>
              I want a page.
            </button>
            <button type="button" data-selected={activeIntent === 'existing_link_bio'} onClick={() => onIntentSelect('existing_link_bio')}>
              I already use a link-in-bio.
            </button>
          </div>
          <div className={styles.intentResponse} aria-live="polite">
            {activeResponse || 'Listening for intent...'}
          </div>
          <div className={styles.compositionPreview} aria-live="polite">
            <div className={styles.previewHeader}>
              <span>{adapted ? 'LIVE COMPOSITION UPDATED' : 'LIVE COMPOSITION'}</span>
              <span>{activeIntent ? intentCopy[activeIntent].label : 'waiting for intent'}</span>
            </div>
            <ol>
              {orderedSections.slice(0, 4).map((section, index) => (
                <li key={section}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {sectionMeta[section].title}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className={styles.heroAside}>
          <PresenceIndicator state="idle" />
          <span>The interface is changing.</span>
        </div>
      </div>
    </section>
  );
}

export function AskThePageSection() {
  const [demoQuestion, setDemoQuestion] = useState('Are you available this week?');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [demoActions, setDemoActions] = useState<[string, string] | null>(null);
  const [isAskingSophia, setIsAskingSophia] = useState(false);
  const [liveLineIndex, setLiveLineIndex] = useState(0);
  const activeDemo = askPageDemos[demoQuestion] || {
    answer: isAskingSophia
      ? 'Sophia is listening...'
      : customAnswer || 'Sophia can answer from the page, then guide the visitor to the right action.',
    actions: demoActions || (['Open answer', 'Continue'] as [string, string]),
  };
  const liveExpressions = isAskingSophia
    ? [
        'Talkinbio is listening to the visitor signal.',
        'Talkinbio is scanning the page context.',
        'Talkinbio is preparing the next best move.',
      ]
    : [
        'Talkinbio keeps the conversation alive after the first click.',
        'The page can answer, guide, and change direction with the visitor.',
        'Every question becomes a usable next step inside the page.',
      ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveLineIndex((current) => (current + 1) % liveExpressions.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [liveExpressions.length]);

  async function askSophiaDemo(nextQuestion: string) {
    const normalized = nextQuestion.trim();
    if (!normalized) return;

    const directMatch = Object.keys(askPageDemos).find((item) => item.toLowerCase() === normalized.toLowerCase());
    if (directMatch) {
      setLiveLineIndex(0);
      setDemoQuestion(directMatch);
      setCustomAnswer(null);
      setDemoActions(null);
      return;
    }

    setDemoQuestion(normalized);
    setLiveLineIndex(0);
    setCustomAnswer(null);
    setDemoActions(null);
    setIsAskingSophia(true);
    try {
      const response = await fetch('/api/homepage/sophia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: normalized }),
      });
      if (!response.ok) throw new Error('Sophia request failed');
      const data = await response.json();
      setCustomAnswer(data.answer || 'Sophia reads the page context, answers here, and keeps the visitor inside the experience.');
      if (Array.isArray(data.actions) && data.actions.length >= 2) {
        setDemoActions([String(data.actions[0]), String(data.actions[1])]);
      }
    } catch {
      setCustomAnswer('Sophia reads the page context, answers here, and keeps the visitor inside the experience.');
      setDemoActions(['Open answer', 'Continue']);
    } finally {
      setIsAskingSophia(false);
    }
  }

  return (
    <section className={styles.paperSection} id="ask" data-section="ask" aria-labelledby="ask-title">
      <div className={styles.sectionIntro}>
        <span className={styles.sectionNumber}>{sectionMeta.ask.eyebrow}</span>
        <h2 id="ask-title">Ask the page.</h2>
        <p>
          Your visitors already have questions.
          <br />
          Now your page can answer.
        </p>
      </div>
      <div className={styles.askGrid}>
        <div className={styles.askConsole}>
          <QuestionForm onQuestionSubmit={askSophiaDemo} />
          <div className={styles.suggestions}>
            <span>Or try one of these</span>
            <div>
              {suggestedQuestions.map((item) => (
                <button type="button" key={item} onClick={() => askSophiaDemo(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.answerBox} aria-live="polite">
            <PresenceIndicator state="responding" />
            <p key={`${demoQuestion}-${liveLineIndex}-${isAskingSophia}`}>{liveExpressions[liveLineIndex]}</p>
          </div>
        </div>
        <div className={styles.browserMock} data-active={demoQuestion === 'Are you available this week?'}>
          <div className={styles.browserBar}>
            <span />
            <span />
            <span />
            <div>talkinbio.com/sophialee</div>
          </div>
          <div className={styles.profileHeader}>
            <div className={styles.avatar} />
            <div>
              <strong>Sophia Lee</strong>
              <span>Sound Designer & Producer</span>
              <span>Berlin, Germany</span>
            </div>
            <div className={styles.profileIcons}>
              <Camera size={16} aria-hidden="true" />
              <Music size={16} aria-hidden="true" />
              <Mail size={16} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.chatStack}>
            <div className={styles.visitorBubble}>
              <span>Visitor</span>
              {demoQuestion}
            </div>
            <div className={styles.pageBubble}>
              <span>Sophia</span>
              {activeDemo.answer}
              <div className={styles.bubbleActions}>
                <button type="button">{activeDemo.actions[0]}</button>
                <button type="button">{activeDemo.actions[1]}</button>
              </div>
            </div>
          </div>
          <div className={styles.browserInput}>
            <span>Ask anything...</span>
            <button type="button" aria-label="Send example question">
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuestionForm({ onQuestionSubmit }: { onQuestionSubmit: (question: string) => void }) {
  return (
    <form
      className={styles.questionForm}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form.elements.namedItem('homepage-question') as HTMLInputElement | null;
        if (!input?.value.trim()) return;
        onQuestionSubmit(input.value);
        form.reset();
      }}
    >
      <label className="sr-only" htmlFor="homepage-question">
        What do you want to know?
      </label>
      <input id="homepage-question" name="homepage-question" placeholder="What do you want to know?" autoComplete="off" />
      <button type="submit" aria-label="Ask the page">
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}

export function SearchSection({
  result,
  onQuestionRoute,
}: {
  result: HomepageGuideResult | null;
  onQuestionRoute: (result: HomepageGuideResult) => void;
}) {
  const router = useRouter();
  const [pageHandle, setPageHandle] = useState('');
  const [question, setQuestion] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const normalizedHandle = pageHandle.trim().replace(/^@+/, '').replace(/\s+/g, '-').toLowerCase();

  async function routeHomepageQuestion(nextQuestion: string) {
    const normalized = nextQuestion.trim();
    if (!normalized) return;
    setIsRouting(true);
    try {
      const response = await fetch('/api/homepage/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: normalized }),
      });
      if (!response.ok) throw new Error('Homepage router request failed');
      const data = await response.json();
      onQuestionRoute(data);
    } catch {
      onQuestionRoute({
        answer: 'I do not have enough page context to answer that reliably yet. Please email info@talkinbio.com.',
        mode: 'contact',
        targetSection: null,
        linkHref: 'mailto:info@talkinbio.com',
        linkLabel: 'Email info@talkinbio.com',
        provider: 'fallback',
      });
    } finally {
      setIsRouting(false);
    }
  }

  return (
    <section className={styles.paperSection} id="search" data-section="search" aria-labelledby="search-title">
      <div className={styles.searchLayout}>
        <div className={styles.searchCopy}>
          <span className={styles.sectionNumber}>{sectionMeta.search.eyebrow}</span>
          <h2 id="search-title">
            A page shouldn&apos;t
            <br />
            make people search.
          </h2>
          <p>People don&apos;t visit your page to browse. They arrive with a question.</p>
          <strong>Talkinbio lets them ask.</strong>
          <div className={styles.searchLiveLine}>
            <PresenceIndicator state={isRouting ? 'thinking' : 'responding'} />
            <p>So we let you talk. Ask away.</p>
          </div>
          <form
            className={styles.searchQuestionForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (!question.trim()) return;
              void routeHomepageQuestion(question);
            }}
          >
            <label className="sr-only" htmlFor="homepage-route-question">
              Ask Talkinbio what should come next
            </label>
            <input
              id="homepage-route-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask what should happen next..."
              autoComplete="off"
            />
            <button type="submit" aria-label="Route the homepage question" disabled={!question.trim() || isRouting}>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <div className={styles.searchResultBox} aria-live="polite">
            <p>
              {isRouting
                ? 'Talkinbio is reading the question, checking the page model, and deciding the next best move.'
                : result?.answer || 'Ask a question here. If we know the answer, we answer and bring the right block closer.'}
            </p>
            {result?.linkHref ? (
              result.linkHref.startsWith('mailto:') ? (
                <a href={result.linkHref} className={styles.inlineAnswerLink}>
                  {result.linkLabel || 'Open link'} <ArrowRight size={15} aria-hidden="true" />
                </a>
              ) : (
                <Link href={result.linkHref} className={styles.inlineAnswerLink}>
                  {result.linkLabel || 'Open link'} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )
            ) : result?.targetSection ? (
              <a href={`#${result.targetSection}`} className={styles.inlineAnswerLink}>
                Open that block <ArrowRight size={15} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
        <div className={styles.searchDiagram} aria-label="Question turns into conversation">
          <form
            className={styles.runStage}
            onSubmit={(event) => {
              event.preventDefault();
              if (!normalizedHandle) return;
              const onboardingPath = normalizedHandle ? `/onboarding?username=${encodeURIComponent(normalizedHandle)}` : '/onboarding';
              router.push(onboardingPath);
            }}
          >
            <div className={styles.runCard}>
              <label className="sr-only" htmlFor="homepage-page-handle">
                Choose your Talkinbio page
              </label>
              <div className={styles.urlBuilder}>
                <span>talkinbio.com/</span>
                <input
                  id="homepage-page-handle"
                  value={pageHandle}
                  onChange={(event) => {
                    setPageHandle(event.target.value);
                  }}
                  placeholder="yourpage"
                  autoComplete="off"
                  inputMode="url"
                  aria-label="Your page name"
                />
              </div>
            </div>
            <button type="submit" className={styles.runButton} disabled={!normalizedHandle}>
              Run
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <ArrowRight aria-hidden="true" />
          <div className={styles.miniPage}>Page</div>
          <ArrowRight aria-hidden="true" />
          <div className={styles.miniConversation}>Conversation</div>
        </div>
      </div>
    </section>
  );
}

export function TransformationSection() {
  return (
    <section className={`${styles.paperSection} ${styles.darkSection}`} id="transformation" data-section="transformation" aria-labelledby="transformation-title">
      <div className={styles.transformGrid}>
        <div>
          <span className={styles.sectionNumber}>{sectionMeta.transformation.eyebrow}</span>
          <h2 id="transformation-title">
            Stop linking.
            <br />
            Start talking.
          </h2>
          <p>Conversation does not sit on top of the website. Conversation controls the website.</p>
          <div className={styles.systemTag}>
            <PresenceIndicator state="thinking" />
            <span>THE INTERFACE IS CHANGING.</span>
          </div>
        </div>
        <div className={styles.flowStage}>
          <div className={styles.flowCard}>LINK / yourdomain.com</div>
          <ArrowRight aria-hidden="true" />
          <div className={styles.flowCard}>PAGE / identity + content</div>
          <ArrowRight aria-hidden="true" />
          <div className={styles.flowCardActive}>
            Visitor: Can I book for Saturday?
            <br />
            Page: Yes. There are two available times.
          </div>
        </div>
      </div>
    </section>
  );
}

export function CapabilitiesSection() {
  return (
    <section className={styles.paperSection} id="capabilities" data-section="capabilities" aria-labelledby="capabilities-title">
      <div className={styles.centerIntro}>
        <span className={styles.sectionNumber}>{sectionMeta.capabilities.eyebrow}</span>
        <h2 id="capabilities-title">What can a page do?</h2>
      </div>
      <div className={styles.capabilityGrid}>
        {capabilityItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title}>
              <Icon aria-hidden="true" size={30} strokeWidth={1.6} />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ExamplesSection({ active }: { active: boolean }) {
  return (
    <section className={styles.paperSection} id="examples" data-section="examples" data-active={active} aria-labelledby="examples-title">
      <div className={styles.examplesLayout}>
        <div>
          <span className={styles.sectionNumber}>{sectionMeta.examples.eyebrow}</span>
          <h2 id="examples-title">
            Every page
            <br />
            has something
            <br />
            to say.
          </h2>
          <p>Meet some of them.</p>
          <div className={styles.languageNote}>
            <PresenceIndicator state="idle" />
            <p>
              Pages can speak in English, Turkish and Russian.
              <span>Visitors open them in their browser language.</span>
            </p>
          </div>
          <a href="#ask" className={styles.textButton}>
            Ask for examples <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
        <div className={styles.phoneRail}>
          {examplePages.map((page, index) => (
            <article
              className={styles.phoneCard}
              key={page.name}
              style={{ '--accent': page.accent, '--portrait-position': `${(index / Math.max(examplePages.length - 1, 1)) * 100}%` } as CSSProperties}
            >
              <div className={styles.phoneChrome} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className={styles.phonePortrait}>
                <div>
                  <strong>{page.name}</strong>
                  <span>{page.role}</span>
                </div>
              </div>
              <div className={styles.phoneActions}>
                {page.prompts.map((prompt) => (
                  <small key={prompt}>
                    <span aria-hidden="true" />
                    {prompt}
                    <ArrowRight size={12} aria-hidden="true" />
                  </small>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
      <FounderStatement />
    </section>
  );
}

function FounderStatement() {
  return (
    <aside className={styles.founder}>
      <div className={styles.founderPortrait}>
        <Image src="/enes-founder-portrait-sketch.png" alt="Enes Pehlivan charcoal portrait" width={420} height={240} />
      </div>
      <div className={styles.founderCopy}>
        <blockquote>
          <p>&ldquo;I don&apos;t think people need another link-in-bio.&rdquo;</p>
          <p>&ldquo;We&apos;re building pages that behave less like documents and more like conversations.&rdquo;</p>
        </blockquote>
        <cite>Enes Pehlivan<br />Founder, Talkinbio</cite>
        <div className={styles.founderDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className={styles.founderGeometry} aria-hidden="true">
        <span className={styles.formulaPrimary}>C = B log<sub>2</sub>(1 + S/N)</span>
        <span>H(X) = -&Sigma; p(x<sub>i</sub>) log<sub>2</sub> p(x<sub>i</sub>)</span>
        <span>X(f) = &int; x(t)e<sup>-i2&pi;ft</sup> dt</span>
        <span>R<sub>max</sub> = 2B</span>
      </div>
    </aside>
  );
}

export function SetupSection() {
  return (
    <section className={styles.paperSection} id="setup" data-section="setup" aria-labelledby="setup-title">
      <div className={styles.centerIntro}>
        <span className={styles.sectionNumber}>{sectionMeta.setup.eyebrow}</span>
        <h2 id="setup-title">From zero to talking in minutes.</h2>
      </div>
      <div className={styles.setupGrid}>
        {setupSteps.map((step) => {
          const Icon = step.icon;
          return (
            <Link href="/onboarding" className={styles.setupCard} key={step.step} aria-label={`Open setup wizard: ${step.title}`}>
              <Icon aria-hidden="true" size={28} strokeWidth={1.6} />
              <span>{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function PricingSection({ active, onCreateClick }: { active: boolean; onCreateClick: (source: string) => void }) {
  return (
    <section className={styles.pricingSection} id="pricing" data-section="pricing" data-active={active} aria-labelledby="pricing-title">
      <div>
        <span className={styles.sectionNumber}>{sectionMeta.pricing.eyebrow}</span>
        <h2 id="pricing-title">Create your page for free.</h2>
        <p>
          Upgrade by adding credits as your page talks more.
          <br />
          No credit card required to start.
        </p>
      </div>
      <Link href="/pricing" className={styles.secondaryButton}>
        See pricing <ArrowRight aria-hidden="true" size={16} />
      </Link>
      <Link href="/register" className={styles.primaryButton} onClick={() => onCreateClick('pricing')}>
        Create your Talkinbio <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </section>
  );
}

export function FinalCTA({ onCreateClick }: { onCreateClick: (source: string) => void }) {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-title">
      <PresenceIndicator state="idle" />
      <h2 id="final-cta-title">
        Your page is still quiet.
        <br />
        <span>Change that.</span>
      </h2>
      <div>
        <Link href="/register" className={styles.lightButton} onClick={() => onCreateClick('final_cta')}>
          Create your Talkinbio <ArrowRight aria-hidden="true" size={16} />
        </Link>
        <p>No credit card required.</p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <BrandLogo />
      <span>© 2026 talkinbio.</span>
      <a href="mailto:info@talkinbio.com">info@talkinbio.com</a>
    </footer>
  );
}
