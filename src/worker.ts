/// <reference lib="webworker" />
import { ChatParser } from './parser';
import { computeStats } from './stats';
import type { WorkerOut } from './types';

const post = (msg: WorkerOut) => self.postMessage(msg);

/** Baca file per potongan supaya file ratusan MB tidak dimuat sekaligus ke memori. */
async function parseStream(file: Blob): Promise<ReturnType<ChatParser['finish']>> {
  const parser = new ChatParser();
  const decoder = new TextDecoder('utf-8');
  const reader = file.stream().getReader();
  let leftover = '';
  let read = 0;
  let lastPct = -1;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    const lines = (leftover + decoder.decode(value, { stream: true })).split('\n');
    leftover = lines.pop() ?? '';
    for (const line of lines) parser.feed(line);

    const pct = Math.floor((read / file.size) * 100);
    if (pct !== lastPct) post({ type: 'progress', pct: (lastPct = pct) });
  }
  if (leftover) parser.feed(leftover);
  return parser.finish();
}

self.onmessage = async (event: MessageEvent<Blob>) => {
  try {
    const messages = await parseStream(event.data);
    if (messages.length === 0) throw new Error('Tidak ada pesan yang bisa dibaca. Pastikan ini file export chat WhatsApp (.txt).');
    post({ type: 'done', stats: computeStats(messages) });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
  }
};
