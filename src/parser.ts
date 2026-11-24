import type { Message } from './types';

/**
 * Mendukung format export Android (`12/03/2024, 21:45 - Nama: pesan`)
 * dan iOS (`[12/03/24, 21.45.10] Nama: pesan`), termasuk AM/PM.
 */
const HEADER =
  /^\[?(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([ap]\.?m\.?)?\]?\s*(?:-\s*)?(.*)$/i;

const MEDIA = /<media[^>]*>|<lampiran[^>]*>|\bomitted\b|tidak disertakan|\(file attached\)/i;
const INVISIBLE = /[\u200e\u200f\u202a-\u202f]/g;

interface RawEntry {
  a: number;
  b: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
  author: string;
  text: string;
}

type DateOrder = 'DMY' | 'MDY';

export class ChatParser {
  private entries: RawEntry[] = [];
  private current: RawEntry | null = null;

  feed(rawLine: string): void {
    const line = rawLine.replace(INVISIBLE, '').replace(/\r$/, '');
    const match = HEADER.exec(line);
    const body = match?.[8] ?? '';
    const sep = body.indexOf(': ');

    // Baris tanpa header ATAU header tanpa "Nama: " (pesan sistem) bukan pesan baru.
    if (!match || sep === -1) {
      if (!match && this.current) this.current.text += `\n${line}`;
      else this.current = null;
      return;
    }

    let hour = Number(match[4]);
    const meridiem = match[7]?.toLowerCase().replace(/\./g, '');
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

    let year = Number(match[3]);
    if (year < 100) year += 2000;

    this.current = {
      a: Number(match[1]),
      b: Number(match[2]),
      year,
      hour,
      minute: Number(match[5]),
      second: Number(match[6] ?? 0),
      author: body.slice(0, sep).trim(),
      text: body.slice(sep + 2),
    };
    this.entries.push(this.current);
  }

  finish(): Message[] {
    const order = this.detectOrder();
    const out: Message[] = [];
    for (const e of this.entries) {
      if (MEDIA.test(e.text)) continue;
      const [day, month] = order === 'DMY' ? [e.a, e.b] : [e.b, e.a];
      const ts = new Date(e.year, month - 1, day, e.hour, e.minute, e.second).getTime();
      if (Number.isNaN(ts)) continue;
      out.push({ ts, author: e.author, text: e.text.trim() });
    }
    return out;
  }

  /** Angka > 12 pasti hari. Kalau ambigu, default ke DD/MM (umum di Indonesia). */
  private detectOrder(): DateOrder {
    for (const e of this.entries) {
      if (e.a > 12) return 'DMY';
      if (e.b > 12) return 'MDY';
    }
    return 'DMY';
  }
}

export function parseChat(text: string): Message[] {
  const parser = new ChatParser();
  for (const line of text.split('\n')) parser.feed(line);
  return parser.finish();
}
