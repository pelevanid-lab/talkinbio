'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    contacts: {
      whatsapp: { selected: true, value: '' },
      phone: { selected: false, value: '' },
      instagram: { selected: false, value: '' },
      email: { selected: false, value: '' },
    },
    services: [] as any[],
    hours: {} as any,
  });

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        // For MVP, if not logged in, we should ideally ask them to login first. 
        // We'll redirect to login or show an error.
        alert(t('loginRequiredAlert'));
        setIsSubmitting(false);
        return;
      }

      // 1. Create Business
      const username = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
      const selectedContacts = Object.entries(formData.contacts).filter(([_, v]) => v.selected);
      const contactMethods = selectedContacts.map(([k]) => k).join(',');
      const contactValues = JSON.stringify(
        selectedContacts.reduce((acc, [k, v]) => ({ ...acc, [k]: v.value }), {})
      );

      const { data: business, error: bizError } = await supabase.from('businesses').insert({
        owner_id: userData.user.id,
        username,
        name: formData.name,
        category: formData.category,
        contact_method: contactMethods,
        contact_value: contactValues,
        credit_balance: 200,
      }).select().single();

      if (bizError || !business) throw new Error(t('businessCreationFailedError'));

      // 2. Create Blocks (Services)
      if (formData.services.length > 0) {
        await supabase.from('blocks').insert({
          business_id: business.id,
          type: 'services',
          title: t('servicesBlockTitle'),
          content: { items: formData.services },
          order: 1
        });
      }

      // 3. Create Blocks (Hours)
      if (Object.keys(formData.hours).length > 0) {
        await supabase.from('blocks').insert({
          business_id: business.id,
          type: 'hours',
          title: t('hoursBlockTitle'),
          content: { schedule: formData.hours },
          order: 2
        });
      }

      router.push(`/${business.username}`);
    } catch (error) {
      console.error(error);
      alert(t('genericErrorAlert'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-slate-100 h-2 w-full">
          <div 
            className="bg-blue-600 h-full transition-all duration-300" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{t('step1.title')}</h2>
              <p className="text-slate-500">{t('step1.subtitle')}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('step1.businessNameLabel')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={t('step1.businessNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('step1.categoryLabel')}</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={t('step1.categoryPlaceholder')}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{t('step2.title')}</h2>
              <p className="text-slate-500">{t('step2.subtitle')}</p>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">{t('step2.contactMethodsLabel')}</label>

                {(Object.keys(formData.contacts) as Array<keyof typeof formData.contacts>).map((method) => {
                  const labels: Record<string, string> = {
                    whatsapp: t('step2.contacts.whatsapp'),
                    phone: t('step2.contacts.phone'),
                    instagram: t('step2.contacts.instagram'),
                    email: t('step2.contacts.email')
                  };
                  const placeholders: Record<string, string> = {
                    whatsapp: t('step2.contactPlaceholders.whatsapp'),
                    phone: t('step2.contactPlaceholders.phone'),
                    instagram: t('step2.contactPlaceholders.instagram'),
                    email: t('step2.contactPlaceholders.email')
                  };

                  return (
                    <div key={method} className="flex flex-col space-y-2 p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="flex items-center">
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
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`contact-${method}`} className="ml-2 block text-sm font-medium text-slate-900">
                          {labels[method]}
                        </label>
                      </div>
                      
                      {formData.contacts[method].selected && (
                        <div className="ml-6">
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            placeholder={placeholders[method]}
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
            <div className="space-y-6 text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">{t('step6.title')}</h2>
              <p className="text-slate-500">{t('step6.subtitle')}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
            <button 
              onClick={handlePrev}
              disabled={step === 1 || isSubmitting}
              className="px-4 py-2 text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium transition"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('back')}
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting || (step === 1 && !formData.name)}
                className="px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium shadow-md transition"
              >
                {t('next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={submitForm}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium shadow-md transition"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSubmitting ? t('creating') : t('create')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
