import type { LucideIcon } from 'lucide-react';
import { BarChart3, Compass, Link2, MessageCircle, MonitorSmartphone, PenLine, Send, Sparkles } from 'lucide-react';

export type HomepageIntent = 'curious' | 'create_page' | 'existing_link_bio';
export type HomepageSectionId = 'ask' | 'search' | 'transformation' | 'capabilities' | 'examples' | 'setup' | 'pricing';
export type HomepageAction = 'pricing' | 'examples' | 'how_it_works' | 'booking' | 'create';

export type NavCopy = {
  pricing: string;
  login: string;
  dashboard: string;
  create: string;
};

export const navCopy: Record<string, NavCopy> = {
  en: {
    pricing: 'Pricing',
    login: 'Log in',
    dashboard: 'Dashboard',
    create: 'Create your page',
  },
  tr: {
    pricing: 'Pricing',
    login: 'Log in',
    dashboard: 'Dashboard',
    create: 'Create your page',
  },
  ru: {
    pricing: 'Pricing',
    login: 'Log in',
    dashboard: 'Dashboard',
    create: 'Create your page',
  },
};

export const intentCopy: Record<HomepageIntent, { label: string; response: string; order: HomepageSectionId[] }> = {
  curious: {
    label: "I'm curious.",
    response: 'Good. Let me show you what we mean.',
    order: ['ask', 'search', 'transformation', 'capabilities', 'examples', 'setup', 'pricing'],
  },
  create_page: {
    label: 'I want a page.',
    response: "Good. Let's make yours talk.",
    order: ['ask', 'examples', 'setup', 'pricing', 'search', 'transformation', 'capabilities'],
  },
  existing_link_bio: {
    label: 'I already use a link-in-bio.',
    response: 'Keep your links. Give them a voice.',
    order: ['transformation', 'search', 'capabilities', 'ask', 'examples', 'setup', 'pricing'],
  },
};

export const defaultOrder = intentCopy.curious.order;

export type HomepageSection = {
  id: HomepageSectionId;
  eyebrow: string;
  title: string;
};

export const sectionMeta: Record<HomepageSectionId, HomepageSection> = {
  ask: { id: 'ask', eyebrow: '02', title: 'Ask the page.' },
  search: { id: 'search', eyebrow: '03', title: "A page shouldn't make people search." },
  transformation: { id: 'transformation', eyebrow: '04', title: 'Link -> page -> conversation.' },
  capabilities: { id: 'capabilities', eyebrow: '05', title: 'What can a page do?' },
  examples: { id: 'examples', eyebrow: '05', title: 'Every page has something to say.' },
  setup: { id: 'setup', eyebrow: '06', title: 'From zero to talking in minutes.' },
  pricing: { id: 'pricing', eyebrow: '07', title: 'Create your page for free.' },
};

export const suggestedQuestions = [
  'What do you charge?',
  'Are you available this week?',
  'Where can I see your work?',
  'Do you work internationally?',
];

export const capabilityItems: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: MessageCircle, title: 'Answer', body: 'Questions about you, your work or your content.' },
  { icon: Compass, title: 'Guide', body: 'Take visitors exactly where they need to go.' },
  { icon: MonitorSmartphone, title: 'Show', body: 'Products, work, content, services and releases.' },
  { icon: Link2, title: 'Connect', body: 'Booking, payment, WhatsApp, social and external tools.' },
  { icon: BarChart3, title: 'Learn', body: 'Understand what visitors actually want.' },
];

export const setupSteps: Array<{ icon: LucideIcon; step: string; title: string; body: string }> = [
  { icon: PenLine, step: '01', title: 'Create', body: 'Tell Talkinbio who you are.' },
  { icon: Send, step: '02', title: 'Publish', body: 'Your page goes live.' },
  { icon: MessageCircle, step: '03', title: 'Talk', body: 'Visitors arrive with questions.' },
];

export const examplePages = [
  { name: 'Aria Rey', role: 'Musician', accent: '#343b2b', prompts: ['Book', 'Listen', 'Tour dates'] },
  { name: 'Daniel Kim', role: 'Designer', accent: '#151515', prompts: ['Portfolio', 'Rates', 'Contact'] },
  { name: "Mira O'Rourk", role: 'Dietitian', accent: '#6f7054', prompts: ['Programs', 'Book a call', 'Meal guide'] },
  { name: 'Jamee Carter', role: 'Photographer', accent: '#252525', prompts: ['Work', 'Availability', 'Contact'] },
  { name: 'Lena Moreau', role: 'Coach', accent: '#314246', prompts: ['Sessions', 'Who I help', 'Results'] },
  { name: 'Noah Brown', role: 'Freelancer', accent: '#4d4a39', prompts: ['Services', 'Timeline', 'Start'] },
];

export type QuestionRoute = {
  match: string[];
  category: string;
  action: HomepageAction;
  target: HomepageSectionId;
  answer: string;
};

export const questionRoutes: QuestionRoute[] = [
  {
    match: ['cost', 'price', 'pricing', 'charge', 'free', 'pay', 'plan'],
    category: 'pricing',
    action: 'pricing',
    target: 'pricing',
    answer: 'Create your page for free, start with 200 visitor credits, and upgrade when your page starts talking more.',
  },
  {
    match: ['example', 'show', 'creator', 'musician', 'designer', 'portfolio'],
    category: 'examples',
    action: 'examples',
    target: 'examples',
    answer: 'Here are pages with different identities. The point is not another grid of links. It is a page that can respond.',
  },
  {
    match: ['work', 'how', 'link', 'bio', 'conversation', 'search'],
    category: 'how_it_works',
    action: 'how_it_works',
    target: 'transformation',
    answer: 'A visitor asks. Talkinbio answers and moves the interface to the right place.',
  },
  {
    match: ['book', 'booking', 'call', 'available', 'appointment', 'calendar'],
    category: 'booking',
    action: 'booking',
    target: 'ask',
    answer: 'Yes. A Talkinbio page can answer availability questions and guide the visitor into a booking action.',
  },
  {
    match: ['create', 'start', 'publish', 'build', 'page'],
    category: 'create',
    action: 'create',
    target: 'setup',
    answer: 'Create the page, publish it, and let visitors ask. The setup is intentionally short.',
  },
];

export const fallbackQuestionRoute: QuestionRoute = {
  match: [],
  category: 'general',
  action: 'how_it_works',
  target: 'capabilities',
  answer: 'Talkinbio answers, guides, shows, connects and learns. The interface changes because the visitor asked.',
};

export const heroStructuredDataDescription =
  'Talkinbio turns a public page into an interactive space that can answer, guide and respond to every visitor.';

export const systemArtifact = Sparkles;
