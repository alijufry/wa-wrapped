export interface Message {
  /** Epoch millis (zona waktu lokal browser). */
  ts: number;
  author: string;
  text: string;
}

export interface AuthorStats {
  name: string;
  messages: number;
  words: number;
  laughs: number;
  /** Berapa kali dia memulai percakapan baru. */
  started: number;
  /** Berapa kali pesan terakhirnya tidak dibalas sampai percakapan mati. */
  ghosted: number;
  medianReplyMin: number | null;
}

export interface Stats {
  total: number;
  firstTs: number;
  lastTs: number;
  authors: AuthorStats[];
  topWords: [string, number][];
  topEmoji: [string, number][];
  /** heat[hari 0=Minggu][jam 0-23] */
  heat: number[][];
  busiestHour: number;
}

export type WorkerOut =
  | { type: 'progress'; pct: number }
  | { type: 'done'; stats: Stats }
  | { type: 'error'; message: string };
