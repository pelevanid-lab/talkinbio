'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, BarChart3, Camera, CheckCircle2, Compass, Link2, Loader2, Mail, MessageCircle, MonitorUp, Music, Send, Volume2, VolumeX } from 'lucide-react';
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

export function DesktopConversionHero({
  onIntentSelect,
}: {
  onIntentSelect: (intent: HomepageIntent) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [desktopScene, setDesktopScene] = useState<'intro' | 'create' | 'redesign' | 'potential'>('intro');

  function replayIntro() {
    const video = videoRef.current;
    if (!video) return;
    setDesktopScene('intro');
    setRevealed(false);
    video.currentTime = 0;
    video.muted = !audioEnabled;
    void video.play();
  }

  function toggleAudio() {
    const video = videoRef.current;
    if (!video) return;
    const nextEnabled = !audioEnabled;
    video.muted = !nextEnabled;
    video.volume = 1;
    if (!revealed && video.paused) void video.play();
    setAudioEnabled(nextEnabled);
  }

  function selectDesktopIntent(intent: HomepageIntent) {
    onIntentSelect(intent);
    setDesktopScene(intent === 'create_page' ? 'create' : intent === 'existing_link_bio' ? 'redesign' : 'potential');
  }

  return (
    <section className={styles.desktopConversionHero} data-revealed={revealed} aria-label="Talkinbio desktop discovery">
      <video
        ref={videoRef}
        className={styles.desktopConversionMedia}
        src="/videos/cicada-hero-mobile.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setRevealed(true)}
      />
      <div className={styles.desktopConversionScrim} aria-hidden="true" />

      <button type="button" className={styles.desktopConversionLogo} onClick={replayIntro} aria-label="Replay Talkinbio intro">
        <span>talkinbio</span>
        <span aria-hidden="true"><i /><i /><i /></span>
      </button>
      <button
        type="button"
        className={styles.desktopConversionAudio}
        onClick={toggleAudio}
        aria-label={audioEnabled ? 'Turn cicada sound off' : 'Turn cicada sound on'}
      >
        {audioEnabled ? <Volume2 aria-hidden="true" size={21} /> : <VolumeX aria-hidden="true" size={21} />}
      </button>

      {desktopScene === 'intro' ? <div className={styles.desktopAboutReveal} aria-hidden={!revealed}>
        <div className={styles.desktopAboutCopy}>
          <span>OPEN WEBSITE</span>
          <h1>
            The web is too quiet.
          </h1>
          <p className={styles.desktopAboutLead}>
            Pages were made to be visited. We think they should talk back.
          </p>
          <div className={styles.desktopAboutStatement}>
            <Image src="/enes-founder-portrait-sketch.png" alt="Enes Pehlivan portrait" width={160} height={160} loading="eager" />
            <div>
              <strong>Stop linking. Start talking.</strong>
              <p>
                We design interactive, live, voice-enabled and moving websites that listen to intent, guide people in context and turn attention into conversation.
              </p>
              <small>Enes Pehlivan · Founder, Talkinbio</small>
            </div>
          </div>
        </div>

        <div className={styles.desktopScatteredActions} aria-label="Choose what brings you here">
          <button className={styles.desktopIntentCreate} type="button" onClick={() => selectDesktopIntent('create_page')}>
            <small>PROJECT</small><span>I need a new website</span><ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className={styles.desktopIntentRedesign} type="button" onClick={() => selectDesktopIntent('existing_link_bio')}>
            <small>PROJECT</small><span>My website feels outdated</span><ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className={styles.desktopIntentMore} type="button" onClick={() => selectDesktopIntent('curious')}>
            <small>GOAL</small><span>I want more from my website</span><ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </div> : <DesktopIntentScene scene={desktopScene} />}
    </section>
  );
}

function MobileProjectRequestForm({
  primaryChoice,
  secondaryChoice,
  question,
}: {
  primaryChoice: string;
  secondaryChoice: string;
  question: string;
}) {
  const [form, setForm] = useState({ answer: '', firstName: '', lastName: '', phone: '', email: '', website: '', socialMedia: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/website-project-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          company: formData.get('company'),
          primaryChoice,
          secondaryChoice,
          question,
          locale: document.documentElement.lang,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Your request could not be sent.');
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Your request could not be sent.');
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.mobileRequestSuccess} role="status">
        <CheckCircle2 aria-hidden="true" size={24} />
        <div>
          <strong>Your request is with us.</strong>
          <p>We will review what you shared and get in touch.</p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.mobileRequestForm} onSubmit={submitRequest}>
      <label className={styles.mobileRequestAnswer}>
        <span>YOUR ANSWER</span>
        <textarea required rows={5} maxLength={3000} value={form.answer} onChange={(event) => updateField('answer', event.target.value)} placeholder="Tell us in your own words..." />
      </label>

      <div className={styles.mobileRequestIdentity}>
        <p>How can we reach you?</p>
        <div className={styles.mobileRequestFields}>
          <label><span>First name *</span><input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
          <label><span>Last name *</span><input required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
          <label><span>Phone <small>optional</small></span><input type="tel" maxLength={200} autoComplete="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
          <label><span>Email *</span><input required type="email" maxLength={200} autoComplete="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label>
          <label><span>Website <small>optional</small></span><input type="text" maxLength={200} inputMode="url" autoComplete="url" value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="yourwebsite.com" /></label>
          <label><span>Social media <small>optional</small></span><input type="text" maxLength={200} value={form.socialMedia} onChange={(event) => updateField('socialMedia', event.target.value)} placeholder="@username or profile link" /></label>
        </div>
        <p className={styles.mobileRequestContactNote}>We will use your email to respond to this request.</p>
      </div>

      <label className={styles.mobileRequestHoneypot} aria-hidden="true">Company<input name="company" type="text" tabIndex={-1} autoComplete="off" /></label>
      {status === 'error' ? <p className={styles.mobileRequestError} role="alert">{message}</p> : null}
      <button className={styles.mobileRequestSubmit} type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? <Loader2 className={styles.mobileRequestSpinner} aria-hidden="true" size={17} /> : <Send aria-hidden="true" size={17} />}
        {status === 'submitting' ? 'Sending...' : 'Send request'}
      </button>
    </form>
  );
}

function DesktopIntentScene({ scene }: { scene: 'create' | 'redesign' | 'potential' }) {
  const [secondaryChoice, setSecondaryChoice] = useState<string | null>(null);

  const config = scene === 'create'
    ? {
        title: 'Create your website.',
        lead: 'We turn a request into a living website: interactive, voice-enabled, moving, conversational and built to convert.',
        copy: [
          'You send the first request. We meet, understand what the website needs to achieve, price the work, build a focused demo, then move through payment and delivery.',
          'The goal is not just to publish pages. The goal is to create a website that explains, listens, guides and helps the visitor take the right next step.',
        ],
        promptLabel: 'START WITH YOU',
        prompt: 'Who are we building this website around?',
        options: [
          { label: 'For myself / my personal brand', question: 'What should people understand about you first?' },
          { label: 'For my business / brand', question: 'What should the website help your business achieve?' },
        ],
        primaryChoice: 'I need a new website',
      }
    : scene === 'redesign'
      ? {
          title: 'Every page has something to say.',
          lead: 'Outdated does not always mean old. Sometimes the brand has moved forward while the website is still speaking in its previous voice. Sometimes it looks polished, but gives people nothing to feel, explore or do.',
          copy: [
            'We begin with what the page should say and how people should answer. Image, typography, motion, voice and interaction become one living narrative.',
            'The right move may be a precise evolution or a clean break. Either way, the new experience should feel unmistakably yours and turn attention into conversation, trust and conversion.',
          ],
          promptLabel: 'FIRST SIGNAL',
          prompt: 'What makes you feel most that your website is outdated?',
          options: [
            { label: 'The design and visual identity', question: 'Do you want an evolution or a completely new direction?' },
            { label: 'The way people interact with it', question: 'What should visitors be able to do that they can’t do today?' },
          ],
          primaryChoice: 'My website feels outdated',
        }
      : {
          title: 'What can a page do?',
          lead: 'A website can do more than explain who you are. It can answer at the right moment, guide each visitor, reveal the right offer, connect people to the next step and learn what they actually need.',
          copy: [
            'Instead of asking every visitor to search through the same fixed structure, the page can respond to intent and bring the most useful path forward.',
            'That may mean creating measurable opportunities, or making the website more useful, memorable and satisfying for the people using it.',
          ],
          promptLabel: 'NEXT MOVE',
          prompt: 'What do you want your website to do more of?',
          options: [
            { label: 'I want it to generate opportunities', question: 'What matters most: leads, bookings, applications or sales?' },
            { label: 'I want it to create a better experience', question: 'What should visitors be able to discover, ask or do?' },
          ],
          primaryChoice: 'I want more from my website',
        };

  const selectedOption = config.options.find((option) => option.label === secondaryChoice) || null;

  return (
    <article className={styles.desktopIntentScene} aria-labelledby="desktop-intent-title">
      <div className={styles.desktopIntentScroll}>
        <header className={styles.desktopIntentHeader}>
          <h2 id="desktop-intent-title">{config.title}</h2>
          <p>{config.lead}</p>
        </header>

        <div className={styles.desktopIntentBody}>
          <div className={styles.desktopIntentNarrative}>
            {config.copy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          <div className={styles.desktopIntentVisual} data-scene={scene} aria-hidden="true">
            {scene === 'create' ? (
              <>
                <Image src="/singing-cicada-stage.png" alt="" width={520} height={780} loading="eager" />
                <div className={styles.desktopProcessTrack}>
                  {['Request', 'Meet', 'Pricing', 'Demo', 'Payment', 'Delivery'].map((step) => <span key={step}>{step}</span>)}
                </div>
              </>
            ) : scene === 'redesign' ? (
              <div className={styles.desktopCreativeStrip}>
                <span className={styles.mobileMarqueeBotanical} />
                <span className={styles.mobileMarqueeUliana} />
                <span className={styles.mobileMarqueeDance} />
                <span className={styles.mobileMarqueeFounder} />
                <span className={styles.mobileMarqueeInstallation} />
              </div>
            ) : (
              <div className={styles.desktopCapabilityList}>
                <span><MessageCircle size={21} />Answer</span>
                <span><Compass size={21} />Guide</span>
                <span><MonitorUp size={21} />Show</span>
                <span><Link2 size={21} />Connect</span>
                <span><BarChart3 size={21} />Learn</span>
              </div>
            )}
          </div>

          <div className={styles.desktopIntentDecision}>
            <div className={styles.desktopIntentPrompt}>
              <span>{config.promptLabel}</span>
              <p>{config.prompt}</p>
            </div>
            <div className={styles.desktopIntentChoices}>
              {config.options.map((option) => (
                <button key={option.label} type="button" data-selected={secondaryChoice === option.label} onClick={() => setSecondaryChoice(option.label)}>
                  <span>{option.label}</span><ArrowRight aria-hidden="true" size={17} />
                </button>
              ))}
            </div>

            {selectedOption ? (
              <div className={styles.desktopIntentAnswer}>
                <div className={styles.desktopIntentFollowup}>
                  <span>YOUR TURN</span>
                  <p>{selectedOption.question}</p>
                </div>
                <MobileProjectRequestForm
                  primaryChoice={config.primaryChoice}
                  secondaryChoice={selectedOption.label}
                  question={selectedOption.question}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function MobileConversionHero({
  onIntentSelect,
}: {
  onIntentSelect: (intent: HomepageIntent) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [mobileScene, setMobileScene] = useState<'discover' | 'about' | 'createWebsite' | 'redesignWebsite' | 'websitePotential'>('discover');
  const [websiteAudience, setWebsiteAudience] = useState<'personal' | 'business' | null>(null);
  const [redesignFocus, setRedesignFocus] = useState<'identity' | 'interaction' | null>(null);
  const [potentialFocus, setPotentialFocus] = useState<'opportunities' | 'experience' | null>(null);

  function toggleAudio() {
    const video = videoRef.current;
    if (!video) return;
    const nextEnabled = !audioEnabled;
    video.muted = !nextEnabled;
    video.volume = 1;
    if (video.paused) void video.play();
    setAudioEnabled(nextEnabled);
  }

  function returnToMobileIntro() {
    setMobileScene('discover');
    setWebsiteAudience(null);
    setRedesignFocus(null);
    setPotentialFocus(null);
  }

  function openCreateWebsite() {
    onIntentSelect('create_page');
    setWebsiteAudience(null);
    setRedesignFocus(null);
    setPotentialFocus(null);
    setMobileScene('createWebsite');
  }

  function openRedesignWebsite() {
    onIntentSelect('existing_link_bio');
    setWebsiteAudience(null);
    setRedesignFocus(null);
    setPotentialFocus(null);
    setMobileScene('redesignWebsite');
  }

  function openWebsitePotential() {
    onIntentSelect('curious');
    setWebsiteAudience(null);
    setRedesignFocus(null);
    setPotentialFocus(null);
    setMobileScene('websitePotential');
  }

  const intentActions = (
    <div className={styles.mobileConversionActions}>
      <span>DISCOVER.</span>
      <button type="button" onClick={openCreateWebsite}>
        <span>
          <small>PROJECT</small>
          I need a new website
        </span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
      <button type="button" onClick={openRedesignWebsite}>
        <span>
          <small>PROJECT</small>
          My website feels outdated
        </span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
      <button type="button" onClick={openWebsitePotential}>
        <span>
          <small>GOAL</small>
          I want more from my website
        </span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </div>
  );

  return (
    <section className={styles.mobileConversionHero} aria-label="Talkinbio discovery">
      <video
        ref={videoRef}
        className={styles.mobileConversionMedia}
        src="/videos/cicada-hero-mobile.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className={styles.mobileConversionScrim} aria-hidden="true" />
      <button type="button" className={styles.mobileConversionLogo} onClick={returnToMobileIntro} aria-label="Return to Talkinbio intro">
        <span>talkinbio</span>
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      <button
        type="button"
        className={styles.mobileConversionMenu}
        onClick={toggleAudio}
        aria-label={audioEnabled ? 'Turn cicada sound off' : 'Turn cicada sound on'}
        data-audio-enabled={audioEnabled}
      >
        {audioEnabled ? <Volume2 aria-hidden="true" size={19} /> : <VolumeX aria-hidden="true" size={19} />}
      </button>
      <div className={styles.mobileConversionContent} data-scene={mobileScene}>
        {mobileScene === 'discover' ? (
          <>
            <button type="button" className={styles.mobileConversionProfile} onClick={() => setMobileScene('about')}>
              <span>OPEN WEBSITE</span>
              <h1>
                The web
                <br />
                is too quiet.
              </h1>
              <p>
                Pages were made to be visited.
                <br />
                We think they should talk back.
              </p>
            </button>
            {intentActions}
          </>
        ) : mobileScene === 'about' ? (
          <article className={styles.mobileAboutPanel} aria-labelledby="mobile-about-title">
            <div className={styles.mobileAboutScroll}>
              <h2 id="mobile-about-title">
                Stop linking.
                <br />
                Start talking.
              </h2>
              <p className={styles.mobileAboutLead}>
                Conversation does not sit on top of the website. Conversation controls the website.
              </p>
              <div className={styles.mobileAboutSignal}>
                <PresenceIndicator state="thinking" />
                <span>THE INTERFACE IS CHANGING.</span>
              </div>
              <figure className={styles.mobileAboutFounder}>
                <Image src="/enes-founder-portrait-sketch.png" alt="Enes Pehlivan portrait" width={420} height={260} loading="eager" />
                <figcaption>
                  <strong>Enes Pehlivan</strong>
                  <span>Founder, Talkinbio</span>
                </figcaption>
              </figure>
              <div className={styles.mobileAboutCopy}>
                <p>
                  We design interactive, live, voice-enabled and moving websites for people and institutions that need more than a static page.
                </p>
                <p>
                  A Talkinbio website can listen to intent, answer in context, guide the visitor, show the right service and move the interface toward conversion.
                </p>
                <p>
                  The point is not to add another link. The point is to turn the page into a conversational experience: creative, alive and built around the next action.
                </p>
              </div>
            </div>
          </article>
        ) : mobileScene === 'createWebsite' ? (
          <article className={styles.mobileAboutPanel} aria-labelledby="mobile-create-title">
            <div className={styles.mobileAboutScroll}>
              <h2 id="mobile-create-title">
                Create your
                <br />
                website.
              </h2>
              <p className={styles.mobileAboutLead}>
                We turn a request into a living website: interactive, voice-enabled, moving, conversational and built to convert.
              </p>
              <div className={styles.mobileProcessList} aria-label="Website creation process">
                {['Request', 'Meet', 'Pricing', 'Demo', 'Payment', 'Delivery'].map((step, index) => (
                  <div key={step}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {step}
                  </div>
                ))}
              </div>
              <div className={styles.mobileAboutCopy}>
                <p>
                  You send the first request. We meet, understand what the website needs to achieve, price the work, build a focused demo, then move through payment and delivery.
                </p>
                <p>
                  The goal is not just to publish pages. The goal is to create a website that explains, listens, guides and helps the visitor take the right next step.
                </p>
              </div>
              <div className={styles.mobileCicadaStage} aria-hidden="true">
                <Image src="/cicada-hero-closeup.jpg" alt="" width={520} height={780} loading="eager" />
              </div>
              <div className={styles.mobileIntentQuestion}>
                <span>START WITH YOU</span>
                <p>Who are we building this website around?</p>
              </div>
              <div className={styles.mobileQuestionChoices}>
                <button type="button" data-selected={websiteAudience === 'personal'} onClick={() => setWebsiteAudience('personal')}>
                  <span>For myself / my personal brand</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
                <button type="button" data-selected={websiteAudience === 'business'} onClick={() => setWebsiteAudience('business')}>
                  <span>For my business / brand</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
              {websiteAudience ? (
                <>
                  <div className={styles.mobileQuestionPrompt} aria-live="polite">
                    <span>{websiteAudience === 'personal' ? 'PERSONAL BRAND' : 'BUSINESS / BRAND'}</span>
                    <p>{websiteAudience === 'personal' ? 'What should people understand about you first?' : 'What should the website help your business achieve?'}</p>
                  </div>
                  <MobileProjectRequestForm
                    primaryChoice="I need a new website"
                    secondaryChoice={websiteAudience === 'personal' ? 'For myself / my personal brand' : 'For my business / brand'}
                    question={websiteAudience === 'personal' ? 'What should people understand about you first?' : 'What should the website help your business achieve?'}
                  />
                </>
              ) : null}
            </div>
          </article>
        ) : mobileScene === 'redesignWebsite' ? (
          <article className={styles.mobileAboutPanel} aria-labelledby="mobile-redesign-title">
            <div className={styles.mobileAboutScroll}>
              <h2 id="mobile-redesign-title">
                Every page
                <br />
                has something
                <br />
                to say.
              </h2>
              <p className={styles.mobileAboutLead}>
                Outdated does not always mean old. Sometimes the brand has moved forward while the website is still speaking in its previous voice. Sometimes it looks polished, but gives people nothing to feel, explore or do.
              </p>
              <div className={styles.mobileImageMarquee} aria-hidden="true">
                <div>
                  <span className={styles.mobileMarqueeBotanical} />
                  <span className={styles.mobileMarqueeMaterial} />
                  <span className={styles.mobileMarqueeUliana} />
                  <span className={styles.mobileMarqueeDance} />
                  <span className={styles.mobileMarqueeFounder} />
                  <span className={styles.mobileMarqueeCeramic} />
                  <span className={styles.mobileMarqueeInstallation} />
                  <span className={styles.mobileMarqueeBotanical} />
                  <span className={styles.mobileMarqueeMaterial} />
                  <span className={styles.mobileMarqueeUliana} />
                  <span className={styles.mobileMarqueeDance} />
                  <span className={styles.mobileMarqueeFounder} />
                  <span className={styles.mobileMarqueeCeramic} />
                  <span className={styles.mobileMarqueeInstallation} />
                </div>
              </div>
              <div className={styles.mobileAboutCopy}>
                <p>
                  We begin with what the page should say and how people should answer. Image, typography, motion, voice and interaction become one living narrative: make the value understood, then make the next action feel natural.
                </p>
                <p>
                  The right move may be a precise evolution or a clean break. Either way, the new experience should feel unmistakably yours and turn attention into conversation, trust and conversion.
                </p>
              </div>
              <div className={styles.mobileIntentQuestion}>
                <span>FIRST SIGNAL</span>
                <p>What makes you feel most that your website is outdated?</p>
              </div>
              <div className={styles.mobileQuestionChoices}>
                <button type="button" data-selected={redesignFocus === 'identity'} onClick={() => setRedesignFocus('identity')}>
                  <span>The design and visual identity</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
                <button type="button" data-selected={redesignFocus === 'interaction'} onClick={() => setRedesignFocus('interaction')}>
                  <span>The way people interact with it</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
              {redesignFocus ? (
                <>
                  <div className={styles.mobileQuestionPrompt} aria-live="polite">
                    <span>{redesignFocus === 'identity' ? 'DESIGN / IDENTITY' : 'INTERACTION'}</span>
                    <p>{redesignFocus === 'identity' ? 'Do you want an evolution or a completely new direction?' : 'What should visitors be able to do that they can’t do today?'}</p>
                  </div>
                  <MobileProjectRequestForm
                    primaryChoice="My website feels outdated"
                    secondaryChoice={redesignFocus === 'identity' ? 'The design and visual identity' : 'The way people interact with it'}
                    question={redesignFocus === 'identity' ? 'Do you want an evolution or a completely new direction?' : 'What should visitors be able to do that they can’t do today?'}
                  />
                </>
              ) : null}
            </div>
          </article>
        ) : (
          <article className={styles.mobileAboutPanel} aria-labelledby="mobile-potential-title">
            <div className={styles.mobileAboutScroll}>
              <h2 id="mobile-potential-title">
                What can a
                <br />
                page do?
              </h2>
              <p className={styles.mobileAboutLead}>
                A website can do more than explain who you are. It can answer at the right moment, guide each visitor toward what matters, reveal the right work or offer, connect people to the next step and learn what they actually need.
              </p>
              <div className={styles.mobileCapabilityGrid} aria-label="What a Talkinbio page can do">
                <div>
                  <MessageCircle aria-hidden="true" size={20} />
                  <strong>Answer</strong>
                  <span>Questions in context.</span>
                </div>
                <div>
                  <Compass aria-hidden="true" size={20} />
                  <strong>Guide</strong>
                  <span>Each visitor forward.</span>
                </div>
                <div>
                  <MonitorUp aria-hidden="true" size={20} />
                  <strong>Show</strong>
                  <span>Work, offers and ideas.</span>
                </div>
                <div>
                  <Link2 aria-hidden="true" size={20} />
                  <strong>Connect</strong>
                  <span>People to the next step.</span>
                </div>
                <div>
                  <BarChart3 aria-hidden="true" size={20} />
                  <strong>Learn</strong>
                  <span>What people really want.</span>
                </div>
              </div>
              <div className={styles.mobileAboutCopy}>
                <p>
                  Instead of asking every visitor to search through the same fixed structure, the page can respond to intent and bring the most useful path forward. The experience becomes shorter, clearer and more personal.
                </p>
                <p>
                  That may mean creating measurable opportunities for the business, or simply making the website more useful, memorable and satisfying for the people using it.
                </p>
              </div>
              <div className={styles.mobileIntentQuestion}>
                <span>NEXT MOVE</span>
                <p>What do you want your website to do more of?</p>
              </div>
              <div className={styles.mobileQuestionChoices}>
                <button type="button" data-selected={potentialFocus === 'opportunities'} onClick={() => setPotentialFocus('opportunities')}>
                  <span>I want it to generate opportunities</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
                <button type="button" data-selected={potentialFocus === 'experience'} onClick={() => setPotentialFocus('experience')}>
                  <span>I want it to create a better experience</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
              {potentialFocus ? (
                <>
                  <div className={styles.mobileQuestionPrompt} aria-live="polite">
                    <span>{potentialFocus === 'opportunities' ? 'OPPORTUNITIES' : 'EXPERIENCE'}</span>
                    <p>{potentialFocus === 'opportunities' ? 'What matters most: leads, bookings, applications or sales?' : 'What should visitors be able to discover, ask or do?'}</p>
                  </div>
                  <MobileProjectRequestForm
                    primaryChoice="I want more from my website"
                    secondaryChoice={potentialFocus === 'opportunities' ? 'I want it to generate opportunities' : 'I want it to create a better experience'}
                    question={potentialFocus === 'opportunities' ? 'What matters most: leads, bookings, applications or sales?' : 'What should visitors be able to discover, ask or do?'}
                  />
                </>
              ) : null}
            </div>
          </article>
        )}
        {mobileScene === 'about' ? intentActions : null}
      </div>
    </section>
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
