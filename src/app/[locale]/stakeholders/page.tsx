'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ChevronLeft } from 'lucide-react';
import '../landing.css';

export default function StakeholdersPage() {
  const t = useTranslations('Stakeholders');
  const tNav = useTranslations('Landing.nav');

  return (
    <div id="landing-page" className="min-h-screen bg-[var(--paper)]">
      <header>
        <div className="wrap nav">
          <Link href="/">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="180" height="45">
              <defs>
                <style>{`.word { font-family: 'Bricolage Grotesque', 'Arial Black', sans-serif; font-weight: 800; }`}</style>
              </defs>
              <g transform="translate(4,26)">
                <rect x="0" y="0" width="108" height="108" rx="26" fill="#14231F"/>
                <rect x="14" y="60" width="80" height="34" rx="17" fill="#FF6A5C"/>
                <circle cx="34" cy="77" r="4.5" fill="#14231F"/>
                <circle cx="54" cy="77" r="4.5" fill="#14231F"/>
                <circle cx="74" cy="77" r="4.5" fill="#14231F"/>
              </g>
              <text x="140" y="102" className="word" fontSize="64" fill="#14231F" letterSpacing="-1.5">talkin<tspan fill="#FF6A5C">bio</tspan></text>
            </svg>
          </Link>
          <div className="links" style={{ display: 'none' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <LanguageSwitcher />
            <Link href="/login" className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {tNav('login')}
            </Link>
            <Link href="/request-access" className="btn btn-primary nav-cta">
              {tNav('startFree')}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-20">
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[var(--ink)] transition-colors mb-8">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Geri
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--ink)] mb-6 tracking-tight font-['Bricolage_Grotesque']">
            {t('title')}
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed font-medium">
            {t('intro')}
          </p>
        </div>

        <div className="space-y-16">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <section key={num} className="group">
              <h2 className="text-2xl font-bold text-[var(--ink)] mb-4 font-['Bricolage_Grotesque'] flex items-baseline gap-3">
                <span className="text-[var(--coral)] text-lg opacity-70 font-mono">0{num}</span>
                {t(`q${num}.title`).replace(/^\d+\.\s*/, '')}
              </h2>
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 transition-all group-hover:shadow-md group-hover:border-slate-200">
                <p className="text-[1.05rem] text-slate-700 leading-loose">
                  {t(`q${num}.content`)}
                </p>
              </div>
            </section>
          ))}
        </div>
        
        <div className="mt-20 text-center bg-[var(--ink)] text-[var(--paper)] rounded-3xl p-10">
          <h3 className="text-2xl font-bold font-['Bricolage_Grotesque'] mb-4">Hazır mısınız?</h3>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">
            Geleceğin iş modelini birlikte inşa edelim.
          </p>
          <Link href="/request-access" className="btn btn-primary bg-[var(--coral)] text-[var(--ink)] hover:bg-[#ff8075] border-none shadow-lg">
            {tNav('startFree')}
          </Link>
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-200 py-12">
        <div className="max-w-3xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} talkinbio. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
