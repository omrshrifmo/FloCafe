import en from './messages/en.json';
import { LANGUAGES, type Language } from './languages';

export type Messages = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeMessages(base: Messages, override: Messages): Messages {
  const merged: Messages = { ...base };

  for (const [key, value] of Object.entries(override ?? {})) {
    const existing = merged[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      merged[key] = mergeMessages(existing as Messages, value as Messages);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

/** Shared locale message loader and cache with bundled English cold-boot
 * fallback and deduplicated in-flight dynamic chunk fetches. */
const messageCache = new Map<Language, Messages>();
const inFlightPromises = new Map<Language, Promise<Messages>>();

messageCache.set('en', en as Messages);

/** Synchronously cached messages for a language (undefined until loaded). */
export function getCachedMessages(lang: Language): Messages | undefined {
  return messageCache.get(lang);
}

/** True when a language's messages are available synchronously. */
export function isLocaleLoaded(lang: Language): boolean {
  return messageCache.has(lang);
}

/** Loads and caches messages for a language, deduplicating in-flight
 * requests and falling back to English for unknown locales. */
export function loadLocaleMessages(lang: Language): Promise<Messages> {
  const cached = messageCache.get(lang);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightPromises.get(lang);
  if (inFlight) return inFlight;

  const fallback = (messageCache.get('en') ?? en) as Messages;
  const config = LANGUAGES[lang] ?? LANGUAGES.en;
  const promise = (config.load ? config.load() : Promise.resolve({ default: {} })).then((mod) => {
    const loaded = (mod.default ?? mod ?? {}) as Messages;
    const merged = lang === 'en' ? { ...fallback } : mergeMessages(fallback, loaded);
    messageCache.set(lang, merged);
    inFlightPromises.delete(lang);
    return merged;
  });

  promise.catch(() => {
    messageCache.set(lang, fallback);
    inFlightPromises.delete(lang);
  });

  inFlightPromises.set(lang, promise);
  return promise;
}
