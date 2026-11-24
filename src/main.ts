import './style.css';
import { renderStats } from './render';
import type { WorkerOut } from './types';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header>
    <h1>WA Wrapped</h1>
    <p>Statistik chat WhatsApp lo. <strong>File nggak pernah di-upload</strong>, semua diproses di browser.</p>
  </header>
  <label class="drop" id="drop">
    <input type="file" id="file" accept=".txt,text/plain" hidden />
    <span>Tarik file export chat (.txt) ke sini, atau klik untuk memilih</span>
  </label>
  <button class="btn ghost" id="demo">Coba pakai data demo</button>
  <progress id="progress" max="100" value="0" hidden></progress>
  <p id="error" role="alert"></p>
  <div id="result"></div>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const progress = $<HTMLProgressElement>('progress');
const errorBox = $('error');
const result = $('result');

function analyze(file: Blob): void {
  errorBox.textContent = '';
  result.replaceChildren();
  progress.hidden = false;
  progress.value = 0;

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const msg = e.data;
    if (msg.type === 'progress') progress.value = msg.pct;
    else {
      progress.hidden = true;
      worker.terminate();
      if (msg.type === 'done') renderStats(result, msg.stats);
      else errorBox.textContent = msg.message;
    }
  };
  worker.postMessage(file);
}

const input = $<HTMLInputElement>('file');
input.addEventListener('change', () => input.files?.[0] && analyze(input.files[0]));

const drop = $('drop');
drop.addEventListener('dragover', (e) => e.preventDefault());
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (file) analyze(file);
});

$('demo').addEventListener('click', async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}sample-chat.txt`);
  analyze(await res.blob());
});
