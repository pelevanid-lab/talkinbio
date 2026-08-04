'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface MobileMenuProps {
  isLoggedIn: boolean;
  texts: {
    pricing?: string;
    login: string;
    dashboard?: string;
  };
}

export default function MobileMenu({ isLoggedIn, texts }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button 
        className="p-2 text-[var(--ink)]" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="6" y2="6"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[80px] left-0 w-full bg-[var(--paper)] border-b border-[var(--border)] shadow-lg z-50 flex flex-col p-4 gap-4 animate-fade-down">
          <div className="flex justify-between items-center px-2">
            <span className="text-[var(--ink-soft)] font-medium text-sm">Dil / Language</span>
            <LanguageSwitcher />
          </div>
          <div className="h-[1px] bg-[var(--border)] w-full"></div>
          
          {texts.pricing && (
            <Link 
              href="/pricing" 
              className="text-[var(--ink)] font-medium text-lg px-2 py-1"
              onClick={() => setIsOpen(false)}
            >
              {texts.pricing}
            </Link>
          )}
          
          {isLoggedIn ? (
            <Link 
              href="/dashboard" 
              className="btn btn-primary w-full text-center mt-2"
              onClick={() => setIsOpen(false)}
            >
              {texts.dashboard || 'Dashboard'}
            </Link>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              <Link 
                href="/login" 
                className="btn btn-ghost w-full text-center border border-[var(--border)]"
                onClick={() => setIsOpen(false)}
              >
                {texts.login}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
