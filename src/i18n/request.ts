import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { DEFAULT_LOCALE, isRoutingLocale } from './locales';

type Messages = Record<string, unknown>;

function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = mergeMessages(base[key] as Messages, value as Messages);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!isRoutingLocale(locale)) {
    locale = routing.defaultLocale;
  }

  const defaultMessages = (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default;
  const localeMessages =
    locale === DEFAULT_LOCALE ? defaultMessages : (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages: locale === DEFAULT_LOCALE ? defaultMessages : mergeMessages(defaultMessages, localeMessages)
  };
});
