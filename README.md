# WA Wrapped

Statistik chat WhatsApp yang diproses **100% di browser**. Upload file export chat, langsung dapat heatmap jam aktif, siapa paling cerewet, waktu balas, kata dan emoji favorit, plus kartu yang bisa dibagikan. **Tidak ada server, tidak ada upload.**

> **Live demo:** `https://wa-wrapped-livid.vercel.app/` &nbsp;|&nbsp; ![demo](docs/demo.gif)

## Fitur

- Statistik per orang: jumlah pesan, kata, tawa ("wkwk", "haha"), median waktu balas
- **Siapa yang selalu mulai chat** dan **siapa yang sering ditinggal** (pesan terakhir tidak dibalas)
- Heatmap aktivitas 7 hari x 24 jam
- Kata dan emoji favorit (stopword Indonesia dan Inggris sudah disaring)
- Kartu share 1080x1350 (PNG), digambar langsung di canvas
- Mendukung format export **Android** dan **iOS**, termasuk AM/PM dan urutan tanggal DD/MM atau MM/DD

## Privacy by design

```
File .txt ──► Web Worker (di browser lo) ──► Statistik ──► UI
                      ▲
          tidak ada request jaringan ke mana pun
```

Satu-satunya request jaringan adalah memuat aset statis aplikasi itu sendiri. Isi chat tidak pernah dikirim ke server mana pun. Silakan cek di tab Network di DevTools.

## Cara pakai

1. Di WhatsApp: buka chat, lalu **titik tiga, Lainnya, Ekspor chat, Tanpa media**.
2. Buka aplikasi, lalu tarik file `.txt` ke area upload.

## Jalankan lokal

```bash
npm install
npm run dev        # development
npm test           # unit test parser + statistik
npm run build      # typecheck + production build ke dist/
```

Butuh Node.js 18+. File demo ada di [`public/sample-chat.txt`](public/sample-chat.txt).

## Arsitektur

```
src/
  parser.ts   Parser stateful per-baris (Android, iOS, multi-baris, pesan sistem, media)
  stats.ts    Fungsi murni: Message[] -> Stats (mudah dites)
  worker.ts   Membaca file streaming, parsing + statistik di luar main thread
  render.ts   UI dengan DOM API (textContent, bukan innerHTML) + kartu share via canvas
  main.ts     Wiring: upload, drag and drop, progress, error
tests/        Vitest untuk parser dan statistik
```

## Tantangan teknis dan keputusan

**1. Format export yang berantakan.** Android menulis `12/03/2024, 21:45 - Nama: pesan`, iOS menulis `[12/03/24, 21.45.10] Nama: pesan`. Satu pesan bisa memakan banyak baris, pesan sistem tidak punya `Nama:`, dan karakter tak terlihat (LRM) menyelip di beberapa locale. Parser memakai satu regex toleran dan state "pesan saat ini" untuk menyambung baris lanjutan.

**2. Tanggal ambigu.** `03/04/2024` itu 3 April atau 4 Maret? Parser menyimpan angka mentah dulu, lalu memindai seluruh file: angka pertama > 12 berarti DD/MM, angka kedua > 12 berarti MM/DD, selain itu default DD/MM. Keputusan diambil sekali per file, bukan per baris.

**3. File besar tanpa membekukan UI.** File dibaca per potongan lewat `Blob.stream()` di dalam Web Worker, lalu dipecah per baris dengan sisa potongan disimpan antar chunk. Memori tetap rendah dan progress bar tetap hidup.

**4. Definisi metrik yang jujur.** Percakapan baru dimulai kalau jeda > 6 jam. "Ditinggal" dihitung hanya kalau percakapan punya lebih dari satu pesan, supaya monolog tidak dihitung sebagai ghosting. Median dipilih (bukan rata-rata) karena waktu balas punya ekor panjang.

**5. Aman dari XSS.** Nama dan isi chat berasal dari file orang lain. Semua teks dirender lewat `textContent`.

## Benchmark

Isi bagian ini setelah lo ukur sendiri, misalnya generate chat sintetis 100 ribu pesan lalu catat waktu parsing di DevTools Performance. Cantumkan spesifikasi mesin dan angkanya.

| Jumlah pesan | Waktu parsing | Mesin |
| ------------ | ------------- | ----- |
| 100.000      | _isi_         | _isi_ |

## Roadmap

- [ ] Mode grup dengan kartu share khusus
- [ ] Word cloud dan timeline mingguan
- [ ] Opsional: roast berbasis statistik (bukan isi chat) lewat LLM
- [ ] i18n (EN)

## Lisensi

MIT. Lihat [LICENSE](LICENSE). Proyek ini tidak berafiliasi dengan WhatsApp atau Meta.
