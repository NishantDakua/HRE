/**
 * Social Signal Service
 *
 * Provides public/social signals related to weather and events.
 * Live signals come from Reddit's public search JSON endpoint (no API key
 * required for read-only search) so this is genuinely real-world public
 * data, not a mock. Demo signals are used only as a fallback when the live
 * fetch returns nothing (no matching posts, network blocked, rate limited),
 * and are always labeled "DEMO PUBLIC SIGNAL" — never presented as live.
 */

export interface SocialSignal {
  id: string;
  location: string;
  timestamp: Date;
  type: 'WEATHER_REPORT' | 'INCIDENT' | 'TRAFFIC' | 'EVENT_IMPACT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  source: string; // "reddit:r/mumbai", "twitter", "news", etc.
  url?: string;
  isDemo: boolean; // CRITICAL: Always mark demo signals
}

/**
 * Demo social signals for Thane area
 */
const DEMO_SIGNALS: SocialSignal[] = [
  {
    id: 'demo-signal-1',
    location: 'Thane',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    type: 'WEATHER_REPORT',
    severity: 'MEDIUM',
    message: 'Heavy rainfall reported near major road corridor connecting Thane-Powai area.',
    source: 'twitter',
    isDemo: true,
  },
  {
    id: 'demo-signal-2',
    location: 'Andheri',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    type: 'TRAFFIC',
    severity: 'HIGH',
    message: 'Traffic congestion on Western Express Highway due to waterlogging at Powai junction.',
    source: 'traffic_app',
    isDemo: true,
  },
  {
    id: 'demo-signal-3',
    location: 'Bandra',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    type: 'INCIDENT',
    severity: 'MEDIUM',
    message: 'Minor flooding reported in residential areas. Municipal corporation responding.',
    source: 'news',
    isDemo: true,
  },
];

/**
 * Get demo social signals for a location
 */
export function getDemoSocialSignals(location: string, limit = 10): SocialSignal[] {
  return DEMO_SIGNALS
    .filter((s) => s.location.toLowerCase() === location.toLowerCase() || !location)
    .slice(0, limit)
    .map((s) => ({
      ...s,
      timestamp: new Date(s.timestamp),
    }));
}

/** Keyword-based severity, same "transparent rule, not black box" approach
 * as the impact engine — no sentiment model, just visible thresholds. */
function severityFromText(text: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const lower = text.toLowerCase();
  if (/flood|severe|warning|evacuat|disaster|collapse|landslide/.test(lower)) return 'HIGH';
  if (/rain|storm|waterlog|traffic|delay|jam|downpour/.test(lower)) return 'MEDIUM';
  return 'LOW';
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

/** Regex-based RSS parse — Google News RSS is a fixed, simple shape, so a
 * full XML parser dependency isn't worth adding for this. */
function parseGoogleNewsRSS(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) && items.length < limit) {
    const block = match[1];
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = decodeEntities(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    const source = decodeEntities(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? 'Google News');
    if (title) items.push({ title, link, pubDate, source });
  }
  return items;
}

/**
 * Live public signals from Google News' public RSS search — no auth/API key
 * needed, and these are genuine published articles, not fabricated posts.
 * Returns [] on any failure (network blocked, no matching coverage) so the
 * caller can fall back to demo signals cleanly.
 */
export async function getLiveSocialSignals(location: string, weatherCondition = 'rain', limit = 5): Promise<SocialSignal[]> {
  const query = `${location} ${weatherCondition}`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = parseGoogleNewsRSS(xml, limit);

    return items.map((item, i) => ({
      id: `gnews-${Date.parse(item.pubDate) || Date.now()}-${i}`,
      location,
      timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
      type: 'WEATHER_REPORT' as const,
      severity: severityFromText(item.title),
      message: item.title,
      source: `news:${item.source}`,
      url: item.link,
      isDemo: false,
    }));
  } catch {
    // Network blocked, timeout, or malformed response — caller falls back to demo.
    return [];
  }
}

/**
 * Real-world signals with a labeled demo fallback. Never mixes the two
 * silently — the caller (route) reports which source was actually used.
 */
export async function getSocialSignals(
  location: string,
  weatherCondition = 'rain',
  limit = 5
): Promise<{ signals: SocialSignal[]; source: 'live' | 'demo' }> {
  const live = await getLiveSocialSignals(location, weatherCondition, limit);
  if (live.length > 0) return { signals: live, source: 'live' };
  return { signals: getDemoSocialSignals(location, limit), source: 'demo' };
}

/**
 * Format signal for display with clear demo labeling
 */
export function formatSignal(signal: SocialSignal): string {
  const label = signal.isDemo ? '🔔 DEMO PUBLIC SIGNAL' : '📢 PUBLIC SIGNAL';
  const time = signal.timestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
  const severity = signal.severity === 'HIGH' ? '⚠️ HIGH' : signal.severity === 'MEDIUM' ? '⚡ MEDIUM' : '✓ LOW';

  return `
${label}

Location: ${signal.location}
Time: ${time}
Severity: ${severity}
Type: ${signal.type}

${signal.message}

Source: ${signal.source}
`.trim();
}
