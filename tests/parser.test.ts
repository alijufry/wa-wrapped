import { describe, expect, it } from 'vitest';
import { parseChat } from '../src/parser';

describe('parseChat', () => {
  it('membaca format Android', () => {
    const [m] = parseChat('12/03/2024, 21:45 - Rina: halo dunia');
    expect(m).toMatchObject({ author: 'Rina', text: 'halo dunia' });
    expect(new Date(m!.ts).getMonth()).toBe(2); // Maret
  });

  it('membaca format iOS dengan detik dan tanda kurung', () => {
    const [m] = parseChat('[12/03/24, 21.45.10] Dimas: oke siap');
    expect(m).toMatchObject({ author: 'Dimas', text: 'oke siap' });
  });

  it('menggabungkan pesan multi-baris', () => {
    const msgs = parseChat('01/02/2024, 10:00 - A: baris satu\nbaris dua\n01/02/2024, 10:01 - B: ok');
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.text).toBe('baris satu\nbaris dua');
  });

  it('mengabaikan pesan sistem dan media', () => {
    const msgs = parseChat(
      [
        '01/02/2024, 10:00 - Pesan dan panggilan dienkripsi end-to-end.',
        '01/02/2024, 10:01 - A: <Media tidak disertakan>',
        '01/02/2024, 10:02 - A: halo',
      ].join('\n'),
    );
    expect(msgs).toHaveLength(1);
  });

  it('mendeteksi urutan MM/DD kalau angka kedua > 12', () => {
    const [m] = parseChat('03/25/2024, 10:00 AM - A: hi');
    const d = new Date(m!.ts);
    expect([d.getMonth(), d.getDate()]).toEqual([2, 25]);
  });

  it('mengonversi PM ke 24 jam', () => {
    const [m] = parseChat('03/25/2024, 9:05 PM - A: hi');
    expect(new Date(m!.ts).getHours()).toBe(21);
  });
});
