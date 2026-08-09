'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { track } from '@vercel/analytics';
import {
  defaultOrder,
  intentCopy,
  type HomepageIntent,
  type HomepageSectionId,
} from './homeData';
import {
  AskThePageSection,
  CapabilitiesSection,
  ExamplesSection,
  FinalCTA,
  Footer,
  HeroSection,
  PricingSection,
  SearchSection,
  SetupSection,
  TransformationSection,
} from './HomepageSections';
import styles from './home.module.css';

const SESSION_KEY = 'talkinbio.homepage.intent';
const allSections: HomepageSectionId[] = ['ask', 'search', 'transformation', 'capabilities', 'examples', 'setup', 'pricing'];
type SearchGuideResult = {
  answer: string;
  mode: 'section' | 'link' | 'answer' | 'contact';
  targetSection: HomepageSectionId | null;
  linkHref: string | null;
  linkLabel: string | null;
  provider: string;
};

function isHomepageIntent(value: string | null): value is HomepageIntent {
  return value === 'curious' || value === 'create_page' || value === 'existing_link_bio';
}

function getSectionOrder(intent: HomepageIntent | null, guidedSection: HomepageSectionId | null): Record<HomepageSectionId, number> {
  const preferred = intent ? intentCopy[intent].order : defaultOrder;
  const merged = [...preferred, ...allSections.filter((section) => !preferred.includes(section))];
  if (guidedSection && guidedSection !== 'search' && guidedSection !== 'pricing') {
    const withoutGuided = merged.filter((section) => section !== guidedSection);
    const searchIndex = withoutGuided.indexOf('search');
    withoutGuided.splice(searchIndex >= 0 ? searchIndex + 1 : 1, 0, guidedSection);
    return withoutGuided.reduce(
      (acc, section, index) => {
        acc[section] = index + 1;
        return acc;
      },
      {} as Record<HomepageSectionId, number>
    );
  }
  return merged.reduce(
    (acc, section, index) => {
      acc[section] = index + 1;
      return acc;
    },
    {} as Record<HomepageSectionId, number>
  );
}

export default function AdaptiveHomepage() {
  const [intent, setIntent] = useState<HomepageIntent | null>(null);
  const [adapted, setAdapted] = useState(false);
  const [searchGuide, setSearchGuide] = useState<SearchGuideResult | null>(null);
  const adaptedTimer = useRef<number | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      const storedIntent = window.sessionStorage.getItem(SESSION_KEY);
      if (isHomepageIntent(storedIntent)) setIntent(storedIntent);
    }, 0);
    track('homepage_intent_shown');
  }, []);

  useEffect(() => {
    return () => {
      if (adaptedTimer.current) window.clearTimeout(adaptedTimer.current);
    };
  }, []);

  const sectionOrder = useMemo(() => getSectionOrder(intent, searchGuide?.targetSection || null), [intent, searchGuide]);
  const orderedSections = useMemo(
    () => [...allSections].sort((a, b) => sectionOrder[a] - sectionOrder[b]),
    [sectionOrder]
  );

  function flashAdapted() {
    setAdapted(true);
    if (adaptedTimer.current) window.clearTimeout(adaptedTimer.current);
    adaptedTimer.current = window.setTimeout(() => setAdapted(false), 3200);
  }

  function handleIntentSelect(nextIntent: HomepageIntent) {
    setIntent(nextIntent);
    window.sessionStorage.setItem(SESSION_KEY, nextIntent);
    flashAdapted();
    track('homepage_intent_selected', { intent: nextIntent });
    track('homepage_interface_adapted', { intent: nextIntent });
  }

  function handleCreateClick(source: string) {
    track('homepage_create_clicked', { source });
  }

  function handleSearchGuide(result: SearchGuideResult) {
    setSearchGuide(result);
    if (result.targetSection) {
      track('homepage_search_guided', { target: result.targetSection, provider: result.provider });
    } else if (result.linkHref) {
      track('homepage_search_linked', { href: result.linkHref, provider: result.provider });
    }
  }

  return (
    <>
      <main className={styles.main} data-adapted={adapted}>
          <HeroSection
          activeIntent={intent}
          activeResponse={intent ? intentCopy[intent].response : null}
          adapted={adapted}
          orderedSections={orderedSections}
          onIntentSelect={handleIntentSelect}
          onCreateClick={handleCreateClick}
        />
        <div className={styles.adaptiveStatus} aria-live="polite">
          {adapted ? 'ADAPTED' : intent ? intentCopy[intent].response : 'LISTENING'}
        </div>
        <div className={styles.composer} style={{ '--ask-order': sectionOrder.ask, '--search-order': sectionOrder.search, '--transformation-order': sectionOrder.transformation, '--capabilities-order': sectionOrder.capabilities, '--examples-order': sectionOrder.examples, '--setup-order': sectionOrder.setup, '--pricing-order': sectionOrder.pricing } as CSSProperties}>
          <div style={{ order: 'var(--ask-order)' }}>
            <AskThePageSection />
          </div>
          <div style={{ order: 'var(--search-order)' }} className={searchGuide?.targetSection === 'search' ? styles.highlightSection : ''}>
            <SearchSection result={searchGuide} onQuestionRoute={handleSearchGuide} />
          </div>
          <div style={{ order: 'var(--transformation-order)' }} className={searchGuide?.targetSection === 'transformation' ? styles.highlightSection : ''}>
            <TransformationSection />
          </div>
          <div style={{ order: 'var(--capabilities-order)' }} className={searchGuide?.targetSection === 'capabilities' ? styles.highlightSection : ''}>
            <CapabilitiesSection />
          </div>
          <div style={{ order: 'var(--examples-order)' }} className={searchGuide?.targetSection === 'examples' ? styles.highlightSection : ''}>
            <ExamplesSection active={searchGuide?.targetSection === 'examples'} />
          </div>
          <div style={{ order: 'var(--setup-order)' }} className={searchGuide?.targetSection === 'setup' ? styles.highlightSection : ''}>
            <SetupSection />
          </div>
          <div style={{ order: 'var(--pricing-order)' }} className={searchGuide?.targetSection === 'pricing' ? styles.highlightSection : ''}>
            <PricingSection active={searchGuide?.targetSection === 'pricing'} onCreateClick={handleCreateClick} />
          </div>
        </div>
        <FinalCTA onCreateClick={handleCreateClick} />
      </main>
      <Footer />
    </>
  );
}
