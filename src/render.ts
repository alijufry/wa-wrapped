import type { Stats } from './types';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const nf = new Intl.NumberFormat('id-ID');

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text; // textContent, bukan innerHTML: aman dari XSS lewat nama/isi chat
  return node;
}

function card(title: string, ...children: HTMLElement[]): HTMLElement {
  const section = el('section', 'card');
  section.append(el('h2', '', title), ...children);
  return section;
}

function bars(rows: [string, number][]): HTMLElement {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  const list = el('div', 'bars');
  for (const [label, n] of rows) {
    const row = el('div', 'bar');
    const fill = el('i');
    fill.style.width = `${(n / max) * 100}%`;
    row.append(el('span', 'label', label), fill, el('b', '', nf.format(n)));
    list.append(row);
  }
  return list;
}

function heatmap(heat: number[][]): HTMLElement {
  const max = Math.max(1, ...heat.flat());
  const grid = el('div', 'heat');
  heat.forEach((row, day) => {
    grid.append(el('span', 'day', DAYS[day]));
    row.forEach((n, hour) => {
      const cell = el('i');
      cell.style.opacity = String(0.08 + (n / max) * 0.92);
      cell.title = `${DAYS[day]} ${String(hour).padStart(2, '0')}:00, ${n} pesan`;
      grid.append(cell);
    });
  });
  return grid;
}

export function renderStats(root: HTMLElement, s: Stats): void {
  const days = Math.max(1, Math.round((s.lastTs - s.firstTs) / 86_400_000));
  const [a, b] = s.authors;

  const summary = el('div', 'summary');
  const tiles: [string, string][] = [
    ['Total pesan', nf.format(s.total)],
    ['Rentang', `${nf.format(days)} hari`],
    ['Jam tersibuk', `${String(s.busiestHour).padStart(2, '0')}:00`],
    ['Total "wkwk"', nf.format(s.authors.reduce((n, x) => n + x.laughs, 0))],
  ];
  for (const [label, value] of tiles) {
    const tile = el('div', 'tile');
    tile.append(el('b', '', value), el('span', '', label));
    summary.append(tile);
  }

  const people = s.authors.slice(0, 8).map((x) => {
    const reply = x.medianReplyMin === null ? 'n/a' : `${x.medianReplyMin} mnt`;
    return [`${x.name}`, x.messages, `balas ${reply} · mulai chat ${x.started}× · ditinggal ${x.ghosted}×`] as const;
  });
  const peopleList = el('div', 'people');
  for (const [name, count, meta] of people) {
    const row = el('div', 'person');
    row.append(el('b', '', name), el('span', '', `${nf.format(count)} pesan`), el('small', '', meta));
    peopleList.append(row);
  }

  const share = el('button', 'btn', 'Unduh kartu share');
  share.addEventListener('click', () => downloadCard(s, a?.name, b?.name));

  root.replaceChildren(
    summary,
    card('Siapa paling cerewet', peopleList),
    card('Kapan lo paling aktif', heatmap(s.heat)),
    card('Kata favorit', bars(s.topWords)),
    ...(s.topEmoji.length ? [card('Emoji favorit', bars(s.topEmoji))] : []),
    share,
  );
}

function downloadCard(s: Stats, top1?: string, top2?: string): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#0f2027');
  bg.addColorStop(1, '#25d366');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = '#fff';
  ctx.font = '700 84px system-ui, sans-serif';
  ctx.fillText('WA Wrapped', 80, 170);

  const lines: [string, string][] = [
    ['Total pesan', nf.format(s.total)],
    ['Paling cerewet', top1 ?? '-'],
    ['Runner-up', top2 ?? '-'],
    ['Jam tersibuk', `${String(s.busiestHour).padStart(2, '0')}:00`],
    ['Kata favorit', s.topWords[0]?.[0] ?? '-'],
    ['Emoji favorit', s.topEmoji[0]?.[0] ?? '-'],
  ];
  lines.forEach(([label, value], i) => {
    const y = 360 + i * 150;
    ctx.globalAlpha = 0.7;
    ctx.font = '400 36px system-ui, sans-serif';
    ctx.fillText(label, 80, y);
    ctx.globalAlpha = 1;
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText(value.slice(0, 22), 80, y + 68);
  });

  const link = el('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'wa-wrapped.png';
  link.click();
}
