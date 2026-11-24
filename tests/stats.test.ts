import { describe, expect, it } from 'vitest';
import { parseChat } from '../src/parser';
import { computeStats, median } from '../src/stats';

const chat = [
  '01/02/2024, 10:00 - Rina: pagi wkwk',
  '01/02/2024, 10:10 - Dimas: pagi juga 😄',
  '01/02/2024, 10:11 - Rina: makan dimana',
  '02/02/2024, 20:00 - Dimas: halo lagi',
].join('\n');

describe('computeStats', () => {
  const stats = computeStats(parseChat(chat));

  it('menghitung total dan urutan penulis', () => {
    expect(stats.total).toBe(4);
    expect(stats.authors[0]!.name).toBe('Rina');
  });

  it('menghitung siapa yang memulai percakapan', () => {
    const dimas = stats.authors.find((a) => a.name === 'Dimas')!;
    expect(dimas.started).toBe(1);
  });

  it('menghitung median waktu balas (menit)', () => {
    const dimas = stats.authors.find((a) => a.name === 'Dimas')!;
    expect(dimas.medianReplyMin).toBe(10);
  });

  it('menghitung tawa dan emoji', () => {
    expect(stats.authors.find((a) => a.name === 'Rina')!.laughs).toBe(1);
    expect(stats.topEmoji[0]![0]).toBe('😄');
  });

  it('median menangani genap dan kosong', () => {
    expect(median([])).toBeNull();
    expect(median([1, 3])).toBe(2);
  });
});
