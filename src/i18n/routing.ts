import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['tr', 'en', 'ru'],
  defaultLocale: 'tr',
  localePrefix: 'as-needed' // We don't prefix the default locale if we don't want to, but standard next-intl often uses 'always' or 'as-needed'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
