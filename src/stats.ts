import type { AuthorStats, Message, Stats } from './types';

/** Jeda lebih dari ini dianggap percakapan baru. */
const CONVERSATION_GAP_MS = 6 * 3600_000;

const STOPWORDS = new Set(
  'yang dan di ke ya itu ini aku gue gw lo lu kamu nya aja udah yg sih dong deh kan tapi juga ada apa kok mau gak ga nggak the and to of is in you for dari buat sama atau kalo kalau jadi bisa lagi'.split(' '),
);
const EMOJI = /\p{Extended_Pictographic}/gu;
const LAUGH = /(?:wk){2,}|(?:ha){2,}|(?:xi){2,}/gi;
const TOKEN_SPLIT = /[^\p{L}\p{N}']+/u;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function top(map: Map<string, number>, n: number): [string, number][] {
  return [...map].sort((x, y) => y[1] - x[1]).slice(0, n);
}

export function computeStats(messages: Message[]): Stats {
  const authors = new Map<string, AuthorStats>();
  const replies = new Map<string, number[]>();
  const words = new Map<string, number>();
  const emoji = new Map<string, number>();
  const heat = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));

  const ensure = (name: string): AuthorStats => {
    let a = authors.get(name);
    if (!a) {
      a = { name, messages: 0, words: 0, laughs: 0, started: 0, ghosted: 0, medianReplyMin: null };
      authors.set(name, a);
      replies.set(name, []);
    }
    return a;
  };

  let prev: Message | null = null;
  let conversationLength = 0;

  for (const m of messages) {
    const a = ensure(m.author);
    a.messages++;

    const d = new Date(m.ts);
    heat[d.getDay()]![d.getHours()]!++;

    const lower = m.text.toLowerCase();
    a.laughs += lower.match(LAUGH)?.length ?? 0;
    for (const e of m.text.match(EMOJI) ?? []) bump(emoji, e);
    for (const w of lower.split(TOKEN_SPLIT)) {
      if (w.length < 3 || STOPWORDS.has(w) || w.startsWith('http')) continue;
      a.words++;
      bump(words, w);
    }

    if (!prev || m.ts - prev.ts > CONVERSATION_GAP_MS) {
      a.started++;
      if (prev && conversationLength > 1) ensure(prev.author).ghosted++;
      conversationLength = 1;
    } else {
      conversationLength++;
      if (prev.author !== m.author) replies.get(m.author)!.push((m.ts - prev.ts) / 60_000);
    }
    prev = m;
  }

  for (const a of authors.values()) {
    const med = median(replies.get(a.name) ?? []);
    a.medianReplyMin = med === null ? null : Math.round(med * 10) / 10;
  }

  const hourTotals = Array.from({ length: 24 }, (_, h) => heat.reduce((s, row) => s + row[h]!, 0));

  return {
    total: messages.length,
    firstTs: messages[0]?.ts ?? 0,
    lastTs: messages.at(-1)?.ts ?? 0,
    authors: [...authors.values()].sort((x, y) => y.messages - x.messages),
    topWords: top(words, 10),
    topEmoji: top(emoji, 8),
    heat,
    busiestHour: hourTotals.indexOf(Math.max(...hourTotals)),
  };
}
