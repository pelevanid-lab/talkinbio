'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { CheckCircle2, Loader2, ArrowLeft, X } from 'lucide-react';
import '../landing.css'; // Import brand styles

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="140" height="35" role="img" aria-labelledby="logoTitle">
    <title id="logoTitle">Talkinbio</title>
    <g transform="translate(4,26)">
      <rect x="0" y="0" width="108" height="108" rx="26" fill="#14231F"/>
      <rect x="14" y="60" width="80" height="34" rx="17" fill="#FF6A5C"/>
      <circle cx="34" cy="77" r="4.5" fill="#14231F"/>
      <circle cx="54" cy="77" r="4.5" fill="#14231F"/>
      <circle cx="74" cy="77" r="4.5" fill="#14231F"/>
    </g>
    <text x="140" y="102" className="word" fontSize="64" fill="#14231F" letterSpacing="-1.5" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800 }}>talkin<tspan fill="#FF6A5C">bio</tspan></text>
  </svg>
);

export default function RequestAccessPage() {
  const t = useTranslations('RequestAccess');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    accountEmail: '',
    contacts: {
      whatsapp: { selected: true, value: '' },
      phone: { selected: false, value: '' },
      instagram: { selected: false, value: '' },
      email: { selected: false, value: '' },
    }
  });

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(t('alerts.error'));
      }

      setStep(3);
    } catch (error) {
      console.error(error);
      alert(t('alerts.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header>
        <div className="wrap nav" style={{ borderBottom: 'none' }}>
          <Link href="/">
            <LogoSVG />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '14px' }}>
              <X className="w-4 h-4" /> Kapat
            </Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '540px', 
          background: 'var(--paper-raised)', 
          borderRadius: 'var(--radius)', 
          border: '0.5px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -20px rgba(20,35,31,0.1)'
        }}>
          {/* Progress Bar */}
          <div style={{ background: 'var(--paper)', height: '4px', width: '100%' }}>
            <div 
              style={{ 
                background: 'var(--coral)', 
                height: '100%', 
                width: `${(step / 3) * 100}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          <div style={{ padding: '40px 32px' }}>
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>{t('step1.title')}</h2>
                  <p style={{ color: 'var(--ink-soft)' }}>{t('step1.desc')}</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                      {t('step1.emailLabel')} <span style={{ color: 'var(--coral)' }}>*</span>
                    </label>
                    <input 
                      type="email" 
                      required
                      value={formData.accountEmail}
                      onChange={e => setFormData({...formData, accountEmail: e.target.value})}
                      style={{ 
                        width: '100%', padding: '12px 16px', border: '0.5px solid var(--border)', 
                        borderRadius: '12px', background: 'var(--paper)', outline: 'none',
                        fontFamily: 'inherit', fontSize: '15px'
                      }}
                      placeholder={t('step1.emailPlaceholder')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                      {t('step1.nameLabel')} <span style={{ color: 'var(--coral)' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      style={{ 
                        width: '100%', padding: '12px 16px', border: '0.5px solid var(--border)', 
                        borderRadius: '12px', background: 'var(--paper)', outline: 'none',
                        fontFamily: 'inherit', fontSize: '15px'
                      }}
                      placeholder={t('step1.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                      {t('step1.categoryLabel')}
                    </label>
                    <input 
                      type="text" 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      style={{ 
                        width: '100%', padding: '12px 16px', border: '0.5px solid var(--border)', 
                        borderRadius: '12px', background: 'var(--paper)', outline: 'none',
                        fontFamily: 'inherit', fontSize: '15px'
                      }}
                      placeholder={t('step1.categoryPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>{t('step2.title')}</h2>
                  <p style={{ color: 'var(--ink-soft)' }}>{t('step2.desc')}</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>{t('step2.methodsLabel')}</label>
                  
                  {(Object.keys(formData.contacts) as Array<keyof typeof formData.contacts>).map((method) => {
                    return (
                      <div key={method} style={{ 
                        display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', 
                        border: '0.5px solid var(--border)', borderRadius: '12px', background: 'var(--paper)' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            id={`contact-${method}`}
                            checked={formData.contacts[method].selected}
                            onChange={(e) => setFormData({
                              ...formData, 
                              contacts: { 
                                ...formData.contacts, 
                                [method]: { ...formData.contacts[method], selected: e.target.checked } 
                              }
                            })}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--coral)' }}
                          />
                          <label htmlFor={`contact-${method}`} style={{ marginLeft: '10px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
                            {t(`step2.methods.${method}`)}
                          </label>
                        </div>
                        
                        {formData.contacts[method].selected && (
                          <div style={{ marginLeft: '28px' }}>
                            <input 
                              type={method === 'email' ? 'email' : 'text'}
                              value={formData.contacts[method].value}
                              onChange={(e) => setFormData({
                                ...formData, 
                                contacts: { 
                                  ...formData.contacts, 
                                  [method]: { ...formData.contacts[method], value: e.target.value } 
                                }
                              })}
                              style={{ 
                                width: '100%', padding: '10px 14px', border: '0.5px solid var(--border)', 
                                borderRadius: '8px', background: 'var(--paper-raised)', outline: 'none',
                                fontFamily: 'inherit', fontSize: '14px'
                              }}
                              placeholder={t(`step2.placeholders.${method}`)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  background: 'var(--coral-tint)', color: 'var(--coral)', marginBottom: '24px' 
                }}>
                  <CheckCircle2 style={{ width: '32px', height: '32px' }} />
                </div>
                <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>{t('step3.title')}</h2>
                <p style={{ color: 'var(--ink-soft)', marginBottom: '32px' }}>{t('step3.desc')}</p>
                
                <button 
                  onClick={() => router.push('/')}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {t('step3.homeBtn')}
                </button>
              </div>
            )}

            {/* Navigation */}
            {step < 3 && (
              <div style={{ 
                marginTop: '32px', paddingTop: '24px', borderTop: '0.5px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <button 
                  onClick={handlePrev}
                  disabled={step === 1 || isSubmitting}
                  className="btn btn-ghost"
                  style={{ opacity: (step === 1 || isSubmitting) ? 0.5 : 1, padding: '10px 20px' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('nav.prev')}
                </button>
                
                {step === 1 ? (
                  <button 
                    onClick={handleNext}
                    disabled={!formData.name || !formData.accountEmail}
                    className="btn btn-primary"
                    style={{ opacity: (!formData.name || !formData.accountEmail) ? 0.5 : 1, padding: '10px 24px' }}
                  >
                    {t('nav.next')}
                  </button>
                ) : (
                  <button 
                    onClick={submitForm}
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ opacity: isSubmitting ? 0.5 : 1, padding: '10px 24px' }}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isSubmitting ? t('nav.submitting') : t('nav.submit')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer minimal */}
      <footer style={{ padding: '24px', borderTop: '0.5px solid var(--border)', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
        &copy; {new Date().getFullYear()} Talkinbio.
      </footer>
    </div>
  );
}
