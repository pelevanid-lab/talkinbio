import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

const MAX_LENGTHS = {
  name: 80,
  contact: 200,
  choice: 160,
  question: 240,
  answer: 3000,
} as const;

const REQUEST_PATHS: Record<string, Record<string, string>> = {
  'I need a new website': {
    'For myself / my personal brand': 'What should people understand about you first?',
    'For my business / brand': 'What should the website help your business achieve?',
  },
  'My website feels outdated': {
    'The design and visual identity': 'Do you want an evolution or a completely new direction?',
    'The way people interact with it': 'What should visitors be able to do that they can’t do today?',
  },
  'I want more from my website': {
    'I want it to generate opportunities': 'What matters most: leads, bookings, applications or sales?',
    'I want it to create a better experience': 'What should visitors be able to discover, ask or do?',
  },
};

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Quietly accept honeypot submissions without storing them.
    if (clean(body.company, 100)) {
      return NextResponse.json({ success: true });
    }

    const firstName = clean(body.firstName, MAX_LENGTHS.name);
    const lastName = clean(body.lastName, MAX_LENGTHS.name);
    const phone = clean(body.phone, MAX_LENGTHS.contact);
    const email = clean(body.email, MAX_LENGTHS.contact).toLowerCase();
    const website = clean(body.website, MAX_LENGTHS.contact);
    const socialMedia = clean(body.socialMedia, MAX_LENGTHS.contact);
    const primaryChoice = clean(body.primaryChoice, MAX_LENGTHS.choice);
    const secondaryChoice = clean(body.secondaryChoice, MAX_LENGTHS.choice);
    const question = clean(body.question, MAX_LENGTHS.question);
    const answer = clean(body.answer, MAX_LENGTHS.answer);
    const locale = clean(body.locale, 12);

    if (!firstName || !lastName || !primaryChoice || !secondaryChoice || !question || !answer) {
      return NextResponse.json({ error: 'Please complete the required fields.' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Please add your email address.' }, { status: 400 });
    }

    if (REQUEST_PATHS[primaryChoice]?.[secondaryChoice] !== question) {
      return NextResponse.json({ error: 'Invalid request path.' }, { status: 400 });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('website_project_requests').insert({
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      email: email || null,
      website: website || null,
      social_media: socialMedia || null,
      primary_choice: primaryChoice,
      secondary_choice: secondaryChoice,
      question,
      answer,
      locale: locale || null,
    });

    if (error) {
      console.error('Website project request insert error:', error);
      return NextResponse.json({ error: 'Your request could not be saved.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Website project request error:', error);
    return NextResponse.json({ error: 'Your request could not be sent.' }, { status: 500 });
  }
}
