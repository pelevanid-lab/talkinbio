'use client';

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Mail, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import hubStyles from '@/components/touchpoints/touchpoints.module.css';
import { IMMERSIVE_VIDEO } from '@/config/immersiveMedia';
import type { EditorialArticle, EditorialTopic } from './editorialData';
import { normalizeEditorialLocale } from './editorialTranslations';
import { topicUiCopy } from './editorialUiTranslations';
import { getTopicLearningPlan } from './topicLearningData';
import styles from './editorial.module.css';
import learningStyles from './customerInsight.module.css';

type CardId = 'first' | 'second' | 'third' | 'pattern' | 'simulation' | 'articles' | 'next';

type TopicSimulation = {
  scene: string;
  stages: Array<{ title: string; observation: string; tension: string }>;
  pattern: string;
  decision: string;
  test: string;
  turningPoint: string;
  checks: Array<{ criterion: string; finding: string }>;
};

const cardPositions: Record<CardId, CSSProperties> = {
  first: { top: '7%', right: '33%', transform: 'rotate(-2deg)' },
  second: { top: '6%', right: '4%', transform: 'rotate(1.5deg)' },
  third: { top: '28%', right: '20%', transform: 'rotate(-1deg)' },
  pattern: { top: '45%', right: '3%', transform: 'rotate(1deg)' },
  simulation: { top: '58%', right: '31%', transform: 'rotate(-1.6deg)' },
  articles: { top: '70%', right: '17%', transform: 'rotate(0.7deg)' },
  next: { top: '82%', right: '3%', transform: 'rotate(-1deg)' },
};

const cardOrder = Object.keys(cardPositions) as CardId[];

function normalizeTitle(value: string, localeCode: string) {
  return value.toLocaleUpperCase(localeCode);
}

function buildAssignmentHref(topic: EditorialTopic, questions: string[], copy: Record<string, string>) {
  const body = [
    copy.greeting,
    '',
    `${copy.assignmentShare} ${topic.title}.`,
    '',
    ...questions.map((question, index) => `${index + 1}. ${question}:`),
    '',
    copy.thanks,
  ].join('\n');
  return `mailto:info@talkinbio.com?subject=${encodeURIComponent(`${topic.shortTitle} - ${copy.assignmentSubject}`)}&body=${encodeURIComponent(body)}`;
}

export default function EditorialTopicExperience({
  locale,
  topic,
  relatedArticles,
  nextTopics,
}: {
  locale: string;
  topic: EditorialTopic;
  relatedArticles: EditorialArticle[];
  nextTopics: EditorialTopic[];
}) {
  const normalizedLocale = normalizeEditorialLocale(locale);
  const copy = topicUiCopy[normalizedLocale];
  const plan = getTopicLearningPlan(topic.slug, normalizedLocale);
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const [idea, setIdea] = useState('');
  const [simulation, setSimulation] = useState<TopicSimulation | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenCard(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const cardMeta = useMemo(() => {
    if (!plan) return null;
    return {
      first: { eyebrow: `01 · ${copy.separate}`, label: plan.elements[0].title },
      second: { eyebrow: `02 · ${copy.separate}`, label: plan.elements[1].title },
      third: { eyebrow: `03 · ${copy.separate}`, label: plan.elements[2].title },
      pattern: { eyebrow: copy.pattern, label: plan.pattern.title },
      simulation: { eyebrow: copy.withClaude, label: copy.caseSimulation },
      articles: { eyebrow: copy.reading, label: copy.relatedArticles },
      next: { eyebrow: copy.next, label: nextTopics[0]?.title || copy.continue },
    } satisfies Record<CardId, { eyebrow: string; label: string }>;
  }, [copy, nextTopics, plan]);

  if (!plan || !cardMeta) return null;

  async function runSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSimulation(null);
    setStatus('loading');
    try {
      const response = await fetch('/api/editorial/topic-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, topicSlug: topic.slug, locale: normalizedLocale }),
      });
      const data = await response.json();
      if (!response.ok || !data.simulation) throw new Error(data.error || copy.error);
      setSimulation(data.simulation as TopicSimulation);
      setStatus('idle');
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : copy.error);
      setStatus('error');
    }
  }

  function renderElementPanel(index: 0 | 1 | 2) {
    const element = plan.elements[index];
    return (
      <>
        <header className={hubStyles.panelHeader}>
          <span>{String(index + 1).padStart(2, '0')} · {copy.separate}</span>
          <h2>{element.title}: {element.caption.toLocaleLowerCase(copy.localeCode)}.</h2>
          <p>{element.definition}</p>
        </header>
        <div className={learningStyles.lensQuestion}>
          <small>{copy.coreQuestion}</small>
          <strong>{element.question}</strong>
        </div>
        <section className={learningStyles.deterministicExamples}>
          <div className={learningStyles.exampleIntro}>
            <small>{copy.examples}</small>
            <div>
              <h3>{plan.exampleGroups ? copy.threeMarkets : copy.threeSituations}</h3>
              <p>{copy.examplesNote}</p>
            </div>
          </div>
          {plan.exampleGroups ? (
            <div className={styles.exampleMarketStack}>
              {plan.exampleGroups.map((group, groupIndex) => (
                <section key={group.title} className={styles.exampleMarket}>
                  <header className={styles.exampleMarketHeader}>
                    <small>{copy.exampleMarket} {String(groupIndex + 1).padStart(2, '0')}</small>
                    <div>
                      <h4>{group.title}</h4>
                      <p>{group.description}</p>
                    </div>
                  </header>
                  <div className={styles.elementExampleGrid}>
                    {group.examples.map((example) => (
                      <article key={example.id}>
                        <small>{example.id}</small>
                        <p>{example.values[index]}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className={styles.elementExampleGrid}>
              {plan.examples.map((example) => (
                <article key={example.id}>
                  <small>{example.id}</small>
                  <p>{example.values[index]}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  function renderPatternPanel() {
    const flow = plan.pattern.flow || `${plan.elements.map((element) => element.title).join(' → ')} → ${copy.decision} → ${copy.learning}`;
    return (
      <>
        <header className={hubStyles.panelHeader}>
          <span>{copy.buildPattern}</span>
          <h2>{plan.pattern.title}</h2>
          <p>{plan.pattern.body}</p>
        </header>
        <div className={hubStyles.frameworkGrid}>
          {plan.pattern.steps.map((step, index) => (
            <div key={step.title} className={hubStyles.frameworkStep}>
              <strong><span>{String(index + 1).padStart(2, '0')}</span>{step.title}</strong>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
        <div className={hubStyles.manifesto}>
          <p>{plan.pattern.body}</p>
          <span className={hubStyles.manifestoClaim}>{flow}</span>
        </div>
        <section className={learningStyles.assignmentCard} aria-labelledby={`${topic.slug}-assignment-title`}>
          <div className={learningStyles.assignmentCopy}>
            <small>{copy.fieldAssignment}</small>
            <h3 id={`${topic.slug}-assignment-title`}>{plan.assignment.title}</h3>
            <p>{plan.assignment.intro} {copy.assignmentTail}</p>
            <a href={buildAssignmentHref(topic, plan.assignment.questions, copy)} className={learningStyles.assignmentMailLink}>
              <Mail aria-hidden="true" size={15} />
              {copy.send}
            </a>
          </div>
          <ol className={learningStyles.assignmentQuestions}>
            {plan.assignment.questions.map((question, index) => (
              <li key={question}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{question}</p>
              </li>
            ))}
          </ol>
        </section>
      </>
    );
  }

  function renderSimulationPanel() {
    return (
      <>
        <header className={hubStyles.panelHeader}>
          <span>{copy.simulationKicker}</span>
          <h2>{copy.simulationTitle}</h2>
          <p>{plan.simulation.intro}</p>
        </header>
        <form className={learningStyles.simulatorForm} onSubmit={runSimulation}>
          <label htmlFor={`${topic.slug}-idea`}>{copy.describe}</label>
          <textarea id={`${topic.slug}-idea`} value={idea} onChange={(event) => setIdea(event.target.value)} maxLength={500} placeholder={plan.simulation.placeholder} />
          <div className={learningStyles.ideaStarters}>
            {plan.simulation.starters.map((starter) => <button type="button" key={starter} onClick={() => setIdea(starter)}>{starter}</button>)}
          </div>
          <div className={learningStyles.simulatorActions}>
            <span>{idea.length}/500</span>
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? <Loader2 className={learningStyles.spinner} aria-hidden="true" size={16} /> : <Sparkles aria-hidden="true" size={16} />}
              {status === 'loading' ? copy.building : copy.simulate}
            </button>
          </div>
          {status === 'error' ? <p className={learningStyles.simulatorError} role="alert">{error}</p> : null}
        </form>
        {status === 'loading' ? <p className={learningStyles.simulatorStatus} aria-live="polite">{copy.loading}</p> : null}
        {simulation ? (
          <div className={learningStyles.simulationResult} aria-live="polite">
            <div className={learningStyles.sceneCard}><small>{copy.scene}</small><p>{simulation.scene}</p></div>
            <div className={learningStyles.resultGrid}>
              {simulation.stages.map((stage, index) => (
                <article key={`${stage.title}-${index}`}>
                  <small>{String(index + 1).padStart(2, '0')} · {stage.title}</small>
                  <h3>{stage.observation}</h3>
                  <dl><div><dt>{copy.tension}</dt><dd>{stage.tension}</dd></div></dl>
                </article>
              ))}
            </div>
            <div className={styles.simulationSynthesis}>
              <article><small>{copy.pattern}</small><p>{simulation.pattern}</p></article>
              <article><small>{copy.changedDecision}</small><p>{simulation.decision}</p></article>
              <article><small>{copy.firstTest}</small><p>{simulation.test}</p></article>
            </div>
            {simulation.checks.length > 0 ? (
              <section className={styles.simulationChecks} aria-label={copy.segmentTest}>
                <header>
                  <small>{copy.segmentTest}</small>
                  <h3>{copy.segmentTestTitle}</h3>
                </header>
                <div>
                  {simulation.checks.map((check) => (
                    <article key={check.criterion}>
                      <strong>{check.criterion}</strong>
                      <p>{check.finding}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            <div className={learningStyles.turningPoint}>
              <div><small>{copy.turningPoint}</small><strong>{simulation.turningPoint}</strong></div>
              <button type="button" onClick={() => { setSimulation(null); setStatus('idle'); }}><RotateCcw aria-hidden="true" size={14} /> {copy.tryAgain}</button>
            </div>
            <p className={learningStyles.aiDisclaimer}>{copy.disclaimer}</p>
          </div>
        ) : null}
      </>
    );
  }

  function renderPanelBody(card: CardId): ReactNode {
    if (card === 'first') return renderElementPanel(0);
    if (card === 'second') return renderElementPanel(1);
    if (card === 'third') return renderElementPanel(2);
    if (card === 'pattern') return renderPatternPanel();
    if (card === 'simulation') return renderSimulationPanel();

    if (card === 'articles') {
      return (
        <>
          <header className={hubStyles.panelHeader}>
            <span>{copy.articlesKicker}</span>
            <h2>{relatedArticles.length > 0 ? copy.articlesTitle : copy.articlesUnavailableTitle}</h2>
            <p>{relatedArticles.length > 0 ? copy.articlesBody : copy.articlesUnavailableBody}</p>
          </header>
          {relatedArticles.length > 0 ? (
            <div className={hubStyles.articleGrid}>
              {relatedArticles.map((article) => (
                <Link key={article.slug} href={`/articles/${article.slug}`} className={hubStyles.articleCard}>
                  <small>{article.eyebrow} · {article.readingTime}</small>
                  <h3>{article.title}</h3>
                </Link>
              ))}
            </div>
          ) : null}
        </>
      );
    }

    return (
      <>
        <header className={hubStyles.panelHeader}>
          <span>{copy.nextStep}</span>
          <h2>{copy.nextTitle}</h2>
          <p>{copy.nextBody}</p>
        </header>
        <div className={learningStyles.nextTopicGrid}>
          {nextTopics.map((next) => (
            <Link key={next.slug} href={`/topics/${next.slug}`} className={learningStyles.nextTopicCard}>
              <small>{next.number} · {normalizeTitle(next.shortTitle, copy.localeCode)}</small>
              <strong>{next.title}</strong>
              <p>{next.question}</p>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className={hubStyles.page} data-revealed="true">
      <video className={hubStyles.media} src={IMMERSIVE_VIDEO.layer} autoPlay muted playsInline preload="auto" />
      <div className={hubStyles.scrim} aria-hidden="true" />
      <svg className={hubStyles.line} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M69,8 C84,1 96,2 97,7 C98,14 78,22 79,29 C80,36 99,39 98,46 C97,53 75,54 69,59 C64,64 87,66 84,72 C82,77 99,79 98,84" /></svg>
      <Link href="/" className={hubStyles.logo} aria-label={copy.home}><span>talkinbio</span></Link>
      <div className={hubStyles.homeScreen} aria-hidden={Boolean(openCard)} data-hidden={Boolean(openCard)}>
        <div className={hubStyles.homeCopy}>
          <span>{topic.number} · {normalizeTitle(topic.shortTitle, copy.localeCode)}</span>
          <h1>{topic.thesis}</h1>
          <p>{topic.question}</p>
        </div>
        <div className={hubStyles.cardField} aria-label={`${topic.title} ${copy.steps}`}>
          {cardOrder.map((card) => (
            <button key={card} type="button" className={hubStyles.card} style={cardPositions[card]} onClick={() => setOpenCard(card)}>
              <small>{cardMeta[card].eyebrow}</small>
              <span>{cardMeta[card].label}</span>
            </button>
          ))}
        </div>
      </div>
      {openCard ? <button type="button" className={hubStyles.backdrop} aria-label={`${topic.title}: ${copy.back}`} onClick={() => setOpenCard(null)} /> : null}
      <article className={hubStyles.panel} data-open={Boolean(openCard)} aria-hidden={!openCard}>
        <div className={hubStyles.panelScroll}>
          <button type="button" className={hubStyles.panelBack} onClick={() => setOpenCard(null)}><ArrowLeft aria-hidden="true" size={15} /> {topic.title}</button>
          {openCard ? renderPanelBody(openCard) : null}
        </div>
      </article>
    </div>
  );
}
