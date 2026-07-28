'use client';

import React, { useState } from 'react';
import Image from 'next/image';

import { useTranslations } from 'next-intl';

export default function ShowcaseSection() {
  const t = useTranslations('Landing.showcase');
  const [activeTab, setActiveTab] = useState<'saule' | 'beiwe'>('saule');
  
  const showcases = {
    saule: [
      {
        title: t('saule.kuafor.title'),
        icon: '✂️',
        desc: t('saule.kuafor.desc'),
        image: '/showcase/saule_salon_1785185434647.png',
        size: 'md:col-span-4 md:row-span-2'
      },
      {
        title: t('saule.spa.title'),
        icon: '💆‍♀️',
        desc: t('saule.spa.desc'),
        image: '/showcase/saule_spa_1785185442109.png',
        size: 'md:col-span-4 md:row-span-1'
      },
      {
        title: t('saule.tattoo.title'),
        icon: '🎨',
        desc: t('saule.tattoo.desc'),
        image: '/showcase/saule_tattoo.png',
        size: 'md:col-span-4 md:row-span-1'
      },
      {
        title: t('saule.antrenor.title'),
        icon: '🏋️‍♂️',
        desc: t('saule.antrenor.desc'),
        image: '/showcase/saule_trainer_1785185450565.png',
        size: 'md:col-span-4 md:row-span-1'
      },
      {
        title: t('saule.diyet.title'),
        icon: '🥑',
        desc: t('saule.diyet.desc'),
        image: '/showcase/saule_clinic_1785185459260.png',
        size: 'md:col-span-4 md:row-span-1'
      }
    ],
    beiwe: [
      {
        title: t('beiwe.store.title'),
        icon: '🛍️',
        desc: t('beiwe.store.desc'),
        image: '/showcase/beiwe_store_1785185466900.png',
        size: 'md:col-span-8 md:row-span-1'
      },
      {
        title: t('beiwe.portfolio.title'),
        icon: '💻',
        desc: t('beiwe.portfolio.desc'),
        image: '/showcase/beiwe_portfolio_1785185474713.png',
        size: 'md:col-span-4 md:row-span-2'
      },
      {
        title: t('beiwe.booking.title'),
        icon: '📅',
        desc: t('beiwe.booking.desc'),
        image: '/showcase/beiwe_booking_1785185482959.png',
        size: 'md:col-span-4 md:row-span-1'
      },
      {
        title: t('beiwe.gallery.title'),
        icon: '📸',
        desc: t('beiwe.gallery.desc'),
        image: '/showcase/beiwe_gallery_1785185491840.png',
        size: 'md:col-span-4 md:row-span-1'
      }
    ]
  };

  const currentShowcase = showcases[activeTab];

  return (
    <section className="py-24 bg-white relative z-10">
      <div className="wrap">
        <div className="text-center mb-12">
          <h2 
            className="text-4xl md:text-[52px] font-bold text-[var(--ink)] mb-8 tracking-tight" 
            style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em', lineHeight: '1.1' }}
            dangerouslySetInnerHTML={{ __html: t.raw('title') }}
          />
          
          <div className="inline-flex bg-[var(--paper)] rounded-full p-1.5 border border-[var(--border)] shadow-inner">
            <button
              onClick={() => setActiveTab('saule')}
              className={`px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-300 ${
                activeTab === 'saule'
                  ? 'bg-white shadow-sm text-[var(--ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {t('sauleTab')}
            </button>
            <button
              onClick={() => setActiveTab('beiwe')}
              className={`px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-300 ${
                activeTab === 'beiwe'
                  ? 'bg-white shadow-sm text-[var(--ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {t('beiweTab')}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
          {currentShowcase.map((item, idx) => (
            <div key={item.title + activeTab} className={`${item.size} relative rounded-[32px] overflow-hidden group animate-fade-up bg-[var(--ink)]`} style={{ animationDelay: `${idx * 100}ms` }}>
              <Image 
                src={item.image} 
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="text-white font-bold text-2xl mb-3 flex items-center gap-3 drop-shadow-md">
                  {item.title}
                </div>
                <p className="text-white/80 text-[15px] font-medium leading-relaxed drop-shadow-sm max-w-md">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
