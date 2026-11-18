'use strict';
/*
 * My Music — main app logic.
 * Sections: helpers → dialogs → data/matching → screens → imports → player → events → start.
 */

/* ================= Helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const AUDIO_EXT = /\.(mp3|m4a|m4b|aac|flac|ogg|oga|opus|wav|webm|weba)$/i;
const MIME = { mp3: 'audio/mpeg', m4a: 'audio/mp4', m4b: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', weba: 'audio/webm' };
const LIST_ACCEPT = '.xml,.txt,.csv,.tsv,.m3u,.m3u8,text/*,application/xml';
const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.flac,.ogg,.opus,.wav';

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  prev: 'M6 6h2v12H6zm3.5 6 8.5 6V6z',
  next: 'M16 6h2v12h-2zM6 18l8.5-6L6 6z',
  shuffle: 'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  repeatOne: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
  note: 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z',
  playlist: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A3 3 0 1 0 19 17V8h3V6h-5z',
  playlistAdd: 'M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  more: 'M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  back: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  attach: 'M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  folder: 'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 0-10z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  save: 'M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z',
  delete: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  volume: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z',
  album: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  help: 'M11 18h2v-2h-2v2zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z',
  install: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
};
const ic = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (sec) => { if (!sec || !isFinite(sec)) return '0:00'; sec = Math.round(sec); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const fmtLong = (sec) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`; };
const fmtSize = (b) => (b > 1e9 ? (b / 1e9).toFixed(1) + ' ГБ' : Math.round(b / 1e6) + ' МБ');
const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many; };
const songs = (n) => `${n} ${plural(n, 'песня', 'песни', 'песен')}`;
const hue = (s) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const extOf = (name) => (name.match(/\.([^.]+)$/) || [])[1]?.toLowerCase() || '';
const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

// Normalized text for matching songs: "Song (Remastered)" == "song", "ё" == "е".
function norm(s) {
  const raw = String(s || '').toLowerCase().replace(/ё/g, 'е');
  const cleaned = raw.replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
  return cleaned || raw.trim();
}

function toast(msg, ms = 3200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), ms);
}

function busy(text) {
  $('#busy').hidden = text === false;
  if (text !== false) $('#busy-text').textContent = text;
}

/* ================= Dialogs ================= */
// Form dialog. Resolves with { fieldName: value } on OK, or null on cancel.
function modal({ title, body = '', ok = 'Готово', cancel = 'Отмена', danger = false, onOpen }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><div class="mbody">${body}</div>
      <div class="mbtns">${ok ? `<button value="ok" class="btn ${danger ? 'danger' : 'primary'}">${esc(ok)}</button>` : ''}
      ${cancel ? `<button value="cancel" class="btn" formnovalidate>${esc(cancel)}</button>` : ''}</div></form>`;
    document.body.append(d);
    d.addEventListener('close', () => {
      let result = null;
      if (d.returnValue === 'ok') {
        result = {};
        $$('[name]', d).forEach((el) => { result[el.name] = el.type === 'file' ? [...el.files] : el.value; });
      }
      d.remove();
      resolve(result);
    });
    d.showModal();
    onOpen?.(d);
  });
}

const confirmBox = (title, text, ok = 'Удалить') => modal({ title, body: `<p>${text}</p>`, ok, danger: true }).then(Boolean);

// Bottom action sheet. items: [{ icon, label, value, danger }]
function sheet(title, items) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'sheet';
    d.innerHTML = `<div class="sheet-title">${esc(title)}</div>` +
      items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${ic(it.icon)}<span>${esc(it.label)}</span></button>`).join('') +
      '<button data-i="-1" class="cancel">Отмена</button>';
    let value = null;
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) { const i = Number(b.dataset.i); value = i >= 0 ? items[i].value : null; d.close(); }
      else if (e.target === d) d.close();
    });
    d.addEventListener('close', () => { d.remove(); resolve(value); });
    document.body.append(d);
    d.showModal();
  });
}

// File picker inside a dialog. The tap on the label opens the system picker directly,
// which iPhones require (they block pickers opened from code after a delay).
function filePrompt({ title, text, accept, multiple = false, button = 'Выбрать файл' }) {
  return modal({
    title, ok: null,
    body: `${text ? `<p>${text}</p>` : ''}<label class="btn primary" style="width:100%">${ic('upload')} ${esc(button)}
      <input class="vh" type="file" name="files" accept="${accept}" ${multiple ? 'multiple' : ''}></label>`,
    onOpen: (d) => { $('input[type=file]', d).onchange = () => d.close('ok'); },
  }).then((r) => r?.files || []);
}

/* ================= Data ================= */
const state = {
  tracks: new Map(),
  playlists: new Map(),
  tab: 'songs',
  detail: null,               // { type: 'album', key } | { type: 'playlist', id }
  songsMode: localStorage.getItem('songsMode') || 'list',
  sort: localStorage.getItem('sort') || 'added',
  search: '',
  onlyMissing: false,
  entries: [],                // what is on screen now: [{ t, pos }]
};

const SORTS = {
  added: ['Недавно добавленные', (a, b) => (b.addedAt || 0) - (a.addedAt || 0)],
  title: ['По названию', (a, b) => collator.compare(a.title, b.title)],
  artist: ['По исполнителю', (a, b) => collator.compare(a.artist || '', b.artist || '') || collator.compare(a.album || '', b.album || '') || (a.trackNo || 0) - (b.trackNo || 0)],
  album: ['По альбому', (a, b) => collator.compare(a.album || '', b.album || '') || (a.trackNo || 0) - (b.trackNo || 0)],
};

async function loadData() {
  for (const t of await DB.all('tracks')) state.tracks.set(t.id, t);
  for (const p of await DB.all('playlists')) state.playlists.set(p.id, p);
}

const saveTrack = (t) => { state.tracks.set(t.id, t); return DB.put('tracks', t); };
const savePlaylist = (p) => { state.playlists.set(p.id, p); return DB.put('playlists', p); };
const countMissing = () => { let n = 0; for (const t of state.tracks.values()) if (!t.hasAudio) n++; return n; };
const sortedPlaylists = () => [...state.playlists.values()].sort((a, b) => collator.compare(a.name, b.name));
const firstCover = (tracks) => tracks.find((t) => t.hasCover)?.id || null;
const totalDuration = (tracks) => tracks.reduce((s, t) => s + (t.duration || 0), 0);

async function createPlaylist(name, trackIds = []) {
  const p = { id: uid(), name, trackIds, createdAt: Date.now() };
  await savePlaylist(p);
  return p;
}

/* Matching: find the same song already in the library by title + artist. */
function buildIndex() {
  const idx = new Map();
  for (const t of state.tracks.values()) addToIndex(idx, t);
  return idx;
}
function addToIndex(idx, t) {
  const k = norm(t.title);
  if (!idx.has(k)) idx.set(k, []);
  idx.get(k).push(t);
}
function findMatch(idx, title, artist) {
  const list = idx.get(norm(title));
  if (!list) return null;
  const a = norm(artist);
  return list.find((t) => norm(t.artist) === a)
    || list.find((t) => { const b = norm(t.artist); return a && b && (a.includes(b) || b.includes(a)); })
    || (!a ? list[0] : null)
    || list.find((t) => !t.artist);
}

function albumKey(t) { return t.album ? norm(t.album) + '|' + norm(t.albumArtist || t.artist) : null; }
function albumList() {
  const m = new Map();
  for (const t of state.tracks.values()) {
    const k = albumKey(t);
    if (!k) continue;
    if (!m.has(k)) m.set(k, { key: k, name: t.album, artist: t.albumArtist || t.artist || '', tracks: [] });
    m.get(k).tracks.push(t);
  }
  return [...m.values()].sort((a, b) => collator.compare(a.name, b.name));
}

/* ================= Covers (loaded lazily when visible) ================= */
const coverCache = new Map();
async function coverUrl(id) {
  if (!coverCache.has(id)) {
    const blob = await DB.get('covers', id);
    coverCache.set(id, blob ? URL.createObjectURL(blob) : null);
  }
  return coverCache.get(id);
}
function forgetCover(id) {
  const u = coverCache.get(id);
  if (u) URL.revokeObjectURL(u);
  coverCache.delete(id);
}
async function paintCover(el) {
  const u = await coverUrl(el.dataset.cover);
  if (u) { el.style.backgroundImage = `url("${u}")`; el.classList.add('has'); }
}
const coverObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) { coverObserver.unobserve(e.target); paintCover(e.target); } }), { rootMargin: '400px' })
  : null;
function lazyCovers(root) { $$('[data-cover]', root).forEach((el) => (coverObserver ? coverObserver.observe(el) : paintCover(el))); }
const coverHtml = (id, label, cls) => `<div class="cover ${cls}" style="--h:${hue(label)}"${id ? ` data-cover="${esc(id)}"` : ''}>${ic('note')}</div>`;

/* ================= Screens ================= */
function render() {
  $$('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === state.tab));
  const v = $('#view');
  if (state.detail?.type === 'playlist') v.innerHTML = playlistDetail();
  else if (state.detail?.type === 'album') v.innerHTML = albumDetail();
  else if (state.tab === 'songs') v.innerHTML = songsScreen();
  else if (state.tab === 'playlists') v.innerHTML = playlistsScreen();
  else v.innerHTML = addScreen();
  if (state.tab === 'songs' && !state.detail) renderSongsContent();
  if (state.tab === 'add' && !state.detail) fillAddExtras();
  lazyCovers(v);
  markPlaying();
}

function go(tab, detail = null) {
  state.tab = tab;
  state.detail = detail;
  render();
  window.scrollTo(0, 0);
}

const playButtons = () => `<button class="btn primary" data-action="play">${ic('play')} Слушать</button>
  <button class="btn" data-action="shuffle">${ic('shuffle')} Перемешать</button>`;

function rowHtml(t, i, pos) {
  return `<div class="row${t.hasAudio ? '' : ' missing'}" data-i="${i}" data-id="${esc(t.id)}"${pos != null ? ` data-pos="${pos}"` : ''}>
    ${coverHtml(t.hasCover ? t.id : null, t.album || t.title, 'sm')}
    <div class="meta"><div class="t1">${esc(t.title)}</div>
      <div class="t2">${t.hasAudio ? '' : '<span class="badge">нет файла</span>'}${esc(t.artist || 'Неизвестный исполнитель')}</div></div>
    <div class="dur">${t.hasAudio ? fmt(t.duration) : ''}</div>
    <button class="icon-btn" data-action="row-menu" aria-label="Действия: ${esc(t.title)}">${ic('more')}</button>
  </div>`;
}
const rowsHtml = (entries) => `<div class="rows">${entries.map((e, i) => rowHtml(e.t, i, e.pos)).join('')}</div>`;

const emptyHtml = (icon, title, text, buttons = '') =>
  `<div class="empty">${ic(icon)}<h2>${esc(title)}</h2><p>${text}</p>${buttons ? `<div class="toolbar">${buttons}</div>` : ''}</div>`;

const pickInput = (kind, accept, multiple, dir) =>
  `<input class="vh" type="file" data-pick="${kind}" ${accept ? `accept="${accept}"` : ''} ${multiple ? 'multiple' : ''} ${dir ? 'webkitdirectory' : ''}>`;

function songsScreen() {
  const n = state.tracks.size;
  return `<header class="top"><h1>Песни</h1><span class="count">${n ? songs(n) : ''}</span></header>
    ${n ? `<div class="search">${ic('search')}<input id="search" type="search" placeholder="Название, исполнитель, альбом" value="${esc(state.search)}" autocomplete="off" aria-label="Поиск"></div>
    <div class="seg">
      <button data-action="mode" data-mode="list" class="${state.songsMode === 'list' ? 'on' : ''}" aria-pressed="${state.songsMode === 'list'}">${ic('list')} Список</button>
      <button data-action="mode" data-mode="albums" class="${state.songsMode === 'albums' ? 'on' : ''}" aria-pressed="${state.songsMode === 'albums'}">${ic('album')} Альбомы</button>
    </div>` : ''}
    <div id="content"></div>`;
}

function renderSongsContent() {
  const c = $('#content');
  if (!c) return;
  if (!state.tracks.size) {
    c.innerHTML = emptyHtml('note', 'Добавьте свою музыку',
      'Загрузите аудиофайлы с устройства или перенесите плейлисты из Apple Music.',
      `<label class="btn primary">${ic('upload')} Добавить файлы${pickInput('audio', AUDIO_ACCEPT, true)}</label>
       <label class="btn">${ic('playlistAdd')} Импорт плейлиста${pickInput('playlist', LIST_ACCEPT, true)}</label>`);
    return;
  }
  const q = state.search.trim().toLowerCase();
  if (state.songsMode === 'albums') {
    const list = albumList().filter((a) => !q || `${a.name} ${a.artist}`.toLowerCase().includes(q));
    c.innerHTML = list.length
      ? `<div class="grid">${list.map((a) => `<button class="tile" data-album="${esc(a.key)}">
          ${coverHtml(firstCover(a.tracks), a.name, 'lg')}<div class="tile-t">${esc(a.name)}</div><div class="tile-s">${esc(a.artist)}</div></button>`).join('')}</div>`
      : emptyHtml('album', 'Альбомов нет', q ? 'По этому запросу ничего не нашлось.' : 'Альбомы появятся, когда у песен указан альбом.');
  } else {
    let list = [...state.tracks.values()];
    if (q) list = list.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q));
    if (state.onlyMissing) list = list.filter((t) => !t.hasAudio);
    list.sort(SORTS[state.sort][1]);
    state.entries = list.map((t) => ({ t }));
    const missing = countMissing();
    c.innerHTML = `<div class="toolbar">${playButtons()}
        <select id="sort" aria-label="Сортировка">${Object.entries(SORTS).map(([k, [label]]) => `<option value="${k}" ${k === state.sort ? 'selected' : ''}>${label}</option>`).join('')}</select>
        ${missing ? `<button class="chip ${state.onlyMissing ? 'on' : ''}" data-action="only-missing" aria-pressed="${state.onlyMissing}">Без файла: ${missing}</button>` : ''}
      </div>
      ${list.length ? rowsHtml(state.entries) : emptyHtml('search', 'Ничего не найдено', 'Попробуйте другой запрос.')}`;
  }
  lazyCovers(c);
  markPlaying();
}

function detailHead({ coverId, label, title, sub, menu }) {
  return `<button class="back" data-action="back">${ic('back')} Назад</button>
    <div class="dhead">${coverHtml(coverId, label, 'xl')}<div><h1>${esc(title)}</h1><div class="sub">${sub}</div></div></div>
    <div class="toolbar">${playButtons()}${menu ? `<button class="icon-btn" data-action="${menu}" aria-label="Ещё">${ic('more')}</button>` : ''}</div>`;
}

function missingNotice(tracks) {
  const n = tracks.filter((t) => !t.hasAudio).length;
  return n ? `<div class="notice"><b>${songs(n)} без аудиофайла.</b> Добавьте свои файлы этих песен во вкладке «Добавить» — они сами встанут на место.</div>` : '';
}

function albumDetail() {
  const a = albumList().find((x) => x.key === state.detail.key);
  if (!a) { state.detail = null; return songsScreen(); }
  const tracks = a.tracks.sort((x, y) => (x.trackNo || 0) - (y.trackNo || 0) || collator.compare(x.title, y.title));
  state.entries = tracks.map((t) => ({ t }));
  return detailHead({ coverId: firstCover(tracks), label: a.name, title: a.name, sub: `${esc(a.artist)}<br>${songs(tracks.length)} · ${fmtLong(totalDuration(tracks))}` })
    + missingNotice(tracks) + rowsHtml(state.entries);
}

function playlistsScreen() {
  const pls = sortedPlaylists();
  return `<header class="top"><h1>Плейлисты</h1></header>
    <div class="toolbar">
      <button class="btn primary" data-action="new-playlist">${ic('add')} Новый плейлист</button>
      <label class="btn">${ic('playlistAdd')} Импорт из Apple Music${pickInput('playlist', LIST_ACCEPT, true)}</label>
      <button class="icon-btn" data-action="howto" aria-label="Как получить файл плейлиста из Apple Music">${ic('help')}</button>
    </div>
    ${pls.length ? `<div class="grid" style="margin-top:12px">${pls.map((p) => {
      const tracks = p.trackIds.map((id) => state.tracks.get(id)).filter(Boolean);
      return `<button class="tile" data-playlist="${esc(p.id)}">${coverHtml(firstCover(tracks), p.name, 'lg')}
        <div class="tile-t">${esc(p.name)}</div><div class="tile-s">${songs(tracks.length)}</div></button>`;
    }).join('')}</div>`
    : emptyHtml('playlist', 'Плейлистов пока нет', 'Создайте новый или перенесите свои плейлисты из Apple Music: названия песен и их порядок сохранятся.')}`;
}

function playlistDetail() {
  const p = state.playlists.get(state.detail.id);
  if (!p) { state.detail = null; return playlistsScreen(); }
  state.entries = p.trackIds.map((id, pos) => ({ t: state.tracks.get(id), pos })).filter((e) => e.t);
  const tracks = state.entries.map((e) => e.t);
  return detailHead({ coverId: firstCover(tracks), label: p.name, title: p.name, sub: `${songs(tracks.length)} · ${fmtLong(totalDuration(tracks))}`, menu: 'playlist-menu' })
    + missingNotice(tracks)
    + (tracks.length ? rowsHtml(state.entries) : emptyHtml('playlist', 'Плейлист пуст', 'Нажмите «⋯» у любой песни и выберите «Добавить в плейлист».'));
}

function addScreen() {
  const card = (icon, title, text, inner = '', action = '') => (action
    ? `<button class="card" data-action="${action}">${ic(icon)}<div><b>${title}</b><span>${text}</span></div></button>`
    : `<label class="card">${ic(icon)}<div><b>${title}</b><span>${text}</span></div>${inner}</label>`);
  return `<header class="top"><h1>Добавить</h1></header>
    <div class="cards">
      ${card('upload', 'Файлы с устройства', 'MP3, M4A (AAC), FLAC, WAV, OGG. Можно выбрать сразу много.', pickInput('audio', AUDIO_ACCEPT, true))}
      ${IS_IOS ? '' : card('folder', 'Целая папка', 'Все песни из папки и вложенных папок.', pickInput('folder', '', true, true))}
      ${card('playlistAdd', 'Импорт плейлиста или библиотеки', 'Apple Music / iTunes (.xml, .txt), CSV из TuneMyMusic или Soundiiz, M3U.', pickInput('playlist', LIST_ACCEPT, true))}
      ${card('help', 'Как получить файл из Apple Music', 'Пошаговая инструкция для компьютера и телефона.', '', 'howto')}
      ${card('link', 'По ссылке', 'Прямая ссылка на аудиофайл с сайта, где скачивание разрешено.', '', 'url')}
      ${card('edit', 'Вручную', 'Ввести название и исполнителя. Файл можно прикрепить потом.', '', 'manual')}
    </div>
    <h2>Резервная копия</h2>
    <div class="cards">
      ${card('save', 'Сохранить копию библиотеки', 'Файл со списком песен и плейлистов, без самих аудиофайлов.', '', 'export')}
      ${card('install', 'Восстановить из копии', 'Выберите сохранённый ранее файл .json.', pickInput('backup', '.json,application/json'))}
    </div>
    <div id="install-box"></div>
    <p class="storage" id="storage"></p>`;
}

let installPrompt = null;
async function fillAddExtras() {
  const box = $('#install-box');
  if (box && !IS_STANDALONE) {
    if (installPrompt) box.innerHTML = `<h2>Приложение</h2><div class="cards"><button class="card" data-action="install">${ic('install')}<div><b>Установить на устройство</b><span>Значок на главном экране, работает без интернета.</span></div></button></div>`;
    else if (IS_IOS) box.innerHTML = `<h2>Приложение</h2><div class="notice">Чтобы поставить на iPhone: откройте эту страницу в <b>Safari</b> → кнопка <b>«Поделиться»</b> → <b>«На экран Домой»</b>.</div>`;
  }
  if (navigator.storage?.estimate) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const el = $('#storage');
    if (el) el.textContent = `Занято музыкой: ${fmtSize(usage)} из доступных ${fmtSize(quota)}.`;
  }
}

function markPlaying() {
  const id = player.queue[player.idx];
  $$('.row').forEach((r) => r.classList.toggle('playing', r.dataset.id === id));
}

/* ================= Imports ================= */
// Ask the browser not to auto-delete our data when the device is low on space.
const askPersist = () => navigator.storage?.persist?.().catch(() => {});

// Checks the browser can play the file and gets its length. Returns null if it can't.
function probe(blob) {
  return new Promise((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(blob);
    const done = (v) => { URL.revokeObjectURL(url); a.removeAttribute('src'); resolve(v); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => done(null);
    setTimeout(() => done(0), 10000);
    a.src = url;
  });
}

async function storeAudio(t, file, meta) {
  const type = (file.type && file.type !== 'application/octet-stream') ? file.type : MIME[extOf(file.name)] || 'audio/mpeg';
  const blob = new Blob([await file.arrayBuffer()], { type });
  const duration = await probe(blob);
  if (duration === null) return false;
  await DB.put('audio', blob, t.id);
  Object.assign(t, { hasAudio: true, duration: duration || t.duration || 0, fileName: file.name, size: blob.size });
  if (meta.cover && !t.hasCover) { await DB.put('covers', meta.cover, t.id); t.hasCover = true; forgetCover(t.id); }
  if (!t.album && meta.album) t.album = meta.album;
  if (!t.albumArtist && meta.albumArtist) t.albumArtist = meta.albumArtist;
  if (!t.trackNo && meta.trackNo) t.trackNo = meta.trackNo;
  return true;
}

async function importAudio(files, extra = {}) {
  files = files.filter((f) => extra.force || /^audio\//.test(f.type) || AUDIO_EXT.test(f.name));
  if (!files.length) return toast('Аудиофайлы не найдены');
  askPersist();
  const idx = buildIndex();
  let added = 0, linked = 0, dup = 0, bad = 0;
  try {
    for (const [n, f] of files.entries()) {
      busy(`Добавляю ${n + 1} из ${files.length}\n${f.name}`);
      const meta = await Tags.read(f);
      const fromName = Importers.splitArtistTitle(f.name.replace(/\.[^.]+$/, ''));
      const title = meta.title || fromName.title || f.name;
      const artist = meta.artist || fromName.artist || '';
      let t = findMatch(idx, title, artist);
      if (t && t.hasAudio) { dup++; continue; }
      const isNew = !t;
      if (isNew) t = { id: uid(), title, artist, album: meta.album || '', addedAt: Date.now(), source: extra.source || 'file', url: extra.url };
      if (!(await storeAudio(t, f, meta))) { bad++; continue; }
      await saveTrack(t);
      if (isNew) { addToIndex(idx, t); added++; } else linked++;
    }
  } catch (e) {
    console.error(e);
    toast('Ошибка: ' + e.message, 6000);
  } finally {
    busy(false);
  }
  render();
  const parts = [];
  if (added) parts.push(`добавлено ${songs(added)}`);
  if (linked) parts.push(`${linked} подставлено в плейлисты`);
  if (dup) parts.push(`${dup} уже были`);
  if (bad) parts.push(`${bad} не открылись (формат не поддерживается)`);
  toast(parts.length ? parts.join(', ').replace(/^./, (c) => c.toUpperCase()) : 'Ничего не добавлено', 5000);
}

async function importLists(files) {
  if (!files.length) return;
  askPersist();
  const idx = buildIndex();
  let newTracks = 0, plCount = 0, plTracks = 0;
  try {
    for (const f of files) {
      busy(`Читаю ${f.name}…`);
      const data = await Importers.parse(f);
      const refMap = new Map();
      const toSave = [];
      for (const [i, tr] of data.tracks.entries()) {
        if (!tr.title) continue;
        let t = findMatch(idx, tr.title, tr.artist);
        if (!t) {
          t = { id: uid(), title: tr.title, artist: tr.artist || '', album: tr.album || '', albumArtist: tr.albumArtist || '',
            duration: tr.duration || 0, trackNo: tr.trackNo || 0, addedAt: tr.addedAt || Date.now() - i, hasAudio: false, source: 'import' };
          addToIndex(idx, t);
          state.tracks.set(t.id, t);
          toSave.push(t);
          newTracks++;
        }
        refMap.set(tr.ref, t.id);
      }
      busy(`Сохраняю ${songs(toSave.length)}…`);
      await DB.putMany('tracks', toSave);
      for (const pl of data.playlists) {
        const ids = pl.refs.map((r) => refMap.get(r)).filter(Boolean);
        if (!ids.length) continue;
        // Re-importing a playlist with the same name updates it instead of making a copy.
        const existing = [...state.playlists.values()].find((p) => p.name === pl.name);
        if (existing) { existing.trackIds = ids; await savePlaylist(existing); }
        else await createPlaylist(pl.name, ids);
        plCount++;
        plTracks += ids.length;
      }
    }
  } catch (e) {
    console.error(e);
    busy(false);
    return modal({ title: 'Не получилось импортировать', body: `<p>${esc(e.message)}</p>`, ok: 'Понятно', cancel: null });
  }
  busy(false);
  go('playlists');
  const missing = countMissing();
  modal({
    title: 'Импорт готов', ok: 'Отлично', cancel: null,
    body: `<p>Плейлистов: <b>${plCount}</b> (${songs(plTracks)}).<br>Новых песен в библиотеке: <b>${newTracks}</b>.</p>
      ${missing ? `<p><b>${songs(missing)} пока без звука</b> — у них есть только название. Добавьте свои аудиофайлы этих песен
      (вкладка «Добавить» → «Файлы»), и приложение само подставит их в плейлисты.</p>` : ''}`,
  });
}

function showHowTo() {
  modal({
    title: 'Как перенести из Apple Music', ok: 'Понятно', cancel: null,
    body: `<p><b>На компьютере с iTunes (Windows) или «Музыкой» (Mac):</b></p>
      <ol><li>Вся библиотека: меню <b>Файл → Медиатека (Библиотека) → Экспортировать медиатеку…</b> → сохраните файл <b>.xml</b>.</li>
      <li>Один плейлист: выберите его и нажмите <b>Файл → Медиатека → Экспортировать плейлист…</b> (.xml или .txt).</li>
      <li>Перекиньте файл на телефон (почта, облако, кабель) и выберите его в «Импорт плейлиста».</li></ol>
      <p><b>Только с телефона:</b> откройте сайт-переносчик вроде TuneMyMusic или Soundiiz, выберите источник «Apple Music»,
      нужные плейлисты, а как цель — <b>файл (CSV)</b>. У бесплатных тарифов бывает лимит на число песен.</p>
      <p>⚠ Переносятся <b>названия и порядок песен</b>. Звук песен из подписки Apple Music защищён и не переносится —
      добавьте свои файлы (купленные, с дисков), приложение само найдёт совпадения.</p>`,
  });
}

async function addFromUrl() {
  const r = await modal({
    title: 'Добавить по ссылке', ok: 'Скачать',
    body: `<p>Вставьте прямую ссылку на аудиофайл (.mp3, .m4a…) с сайта, где скачивание разрешено: Bandcamp (купленное), Jamendo, Free Music Archive, Internet Archive.</p>
      <label>Ссылка<input name="url" type="url" required placeholder="https://example.com/song.mp3" inputmode="url"></label>`,
  });
  if (!r) return;
  busy('Скачиваю…');
  try {
    const resp = await fetch(r.url);
    if (!resp.ok) throw new Error('сайт ответил ошибкой ' + resp.status);
    const blob = await resp.blob();
    if (blob.type && !/^(audio\/|video\/(mp4|webm|ogg)|application\/(octet-stream|ogg))/.test(blob.type)) throw new Error('по ссылке не аудиофайл, а ' + blob.type);
    let name = new URL(r.url).pathname.split('/').pop() || 'track';
    try { name = decodeURIComponent(name); } catch { /* keep */ }
    busy(false);
    await importAudio([new File([blob], name, { type: blob.type })], { force: true, source: 'url', url: r.url });
  } catch (e) {
    busy(false);
    modal({
      title: 'Не получилось скачать', ok: 'Понятно', cancel: null,
      body: `<p>${esc(e.message === 'Failed to fetch' ? 'Сайт не разрешает скачивать файлы из других приложений.' : e.message)}</p>
        <p>Что делать: откройте ссылку в браузере, скачайте файл обычным способом и добавьте его через «Файлы с устройства».</p>`,
    });
  }
}

async function addManual() {
  const r = await modal({
    title: 'Добавить вручную', ok: 'Добавить',
    body: `<label>Название<input name="title" required placeholder="Название песни"></label>
      <label>Исполнитель<input name="artist" placeholder="Имя исполнителя"></label>
      <label>Альбом<input name="album" placeholder="Необязательно"></label>
      <label>Аудиофайл (можно позже)<input name="file" type="file" accept="${AUDIO_ACCEPT}"></label>`,
  });
  if (!r) return;
  const t = { id: uid(), title: r.title.trim(), artist: r.artist.trim(), album: r.album.trim(), addedAt: Date.now(), hasAudio: false, source: 'manual' };
  if (r.file[0]) {
    busy('Добавляю файл…');
    const ok = await storeAudio(t, r.file[0], await Tags.read(r.file[0]));
    busy(false);
    if (!ok) toast('Этот формат не воспроизводится, песня добавлена без файла', 5000);
  }
  await saveTrack(t);
  render();
  toast('Песня добавлена');
}

async function attachAudio(t) {
  const [file] = await filePrompt({ title: 'Прикрепить аудиофайл', text: `Выберите файл песни «${esc(t.title)}».`, accept: AUDIO_ACCEPT });
  if (!file) return;
  busy('Добавляю файл…');
  const ok = await storeAudio(t, file, await Tags.read(file));
  busy(false);
  if (!ok) return toast('Этот формат не воспроизводится', 5000);
  await saveTrack(t);
  render();
  toast('Файл прикреплён');
}

async function editTrack(t) {
  const r = await modal({
    title: 'Изменить песню', ok: 'Сохранить',
    body: `<label>Название<input name="title" required value="${esc(t.title)}"></label>
      <label>Исполнитель<input name="artist" value="${esc(t.artist)}"></label>
      <label>Альбом<input name="album" value="${esc(t.album)}"></label>
      <label>Новая обложка (картинка)<input name="cover" type="file" accept="image/*"></label>`,
  });
  if (!r) return;
  Object.assign(t, { title: r.title.trim() || t.title, artist: r.artist.trim(), album: r.album.trim() });
  if (r.cover[0]) { await DB.put('covers', r.cover[0], t.id); t.hasCover = true; forgetCover(t.id); }
  await saveTrack(t);
  render();
  if (currentTrack()?.id === t.id) updateNowPlaying();
}

async function deleteTrack(t) {
  if (!(await confirmBox('Удалить песню?', `«${esc(t.title)}» исчезнет из библиотеки и всех плейлистов. Отменить это нельзя.`))) return;
  await Promise.all([DB.del('tracks', t.id), DB.del('audio', t.id), DB.del('covers', t.id)]);
  state.tracks.delete(t.id);
  forgetCover(t.id);
  for (const p of state.playlists.values()) {
    if (p.trackIds.includes(t.id)) { p.trackIds = p.trackIds.filter((id) => id !== t.id); await savePlaylist(p); }
  }
  render();
  toast('Удалено');
}

async function addToPlaylist(ids) {
  const pls = sortedPlaylists();
  const r = await modal({
    title: 'Добавить в плейлист', ok: 'Добавить',
    body: `<label>Плейлист<select name="pl">${pls.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}
      <option value="__new">+ Новый плейлист…</option></select></label>
      <label class="newname">Название нового плейлиста<input name="name" placeholder="Мой плейлист"></label>`,
    onOpen: (d) => {
      const sel = $('select', d), nn = $('.newname', d);
      const upd = () => { nn.hidden = sel.value !== '__new'; };
      sel.onchange = upd;
      upd();
    },
  });
  if (!r) return;
  const p = r.pl === '__new' ? await createPlaylist(r.name.trim() || 'Новый плейлист') : state.playlists.get(r.pl);
  p.trackIds.push(...ids);
  await savePlaylist(p);
  render();
  toast(`Добавлено в «${p.name}»`);
}

async function newPlaylist() {
  const r = await modal({ title: 'Новый плейлист', ok: 'Создать', body: '<label>Название<input name="name" required placeholder="Мой плейлист"></label>' });
  if (!r) return;
  const p = await createPlaylist(r.name.trim());
  go('playlists', { type: 'playlist', id: p.id });
}

async function playlistMenu() {
  const p = state.playlists.get(state.detail.id);
  const v = await sheet(p.name, [
    { icon: 'edit', label: 'Переименовать', value: 'rename' },
    { icon: 'delete', label: 'Удалить плейлист', value: 'delete', danger: true },
  ]);
  if (v === 'rename') {
    const r = await modal({ title: 'Переименовать', ok: 'Сохранить', body: `<label>Название<input name="name" required value="${esc(p.name)}"></label>` });
    if (r) { p.name = r.name.trim(); await savePlaylist(p); render(); }
  } else if (v === 'delete') {
    if (!(await confirmBox('Удалить плейлист?', `Плейлист «${esc(p.name)}» будет удалён. Сами песни останутся в библиотеке.`))) return;
    await DB.del('playlists', p.id);
    state.playlists.delete(p.id);
    go('playlists');
  }
}

async function rowMenu(t, pos) {
  const items = [];
  if (t.hasAudio) items.push({ icon: 'play', label: 'Играть', value: 'play' }, { icon: 'next', label: 'Играть следующей', value: 'next' });
  else items.push({ icon: 'attach', label: 'Прикрепить аудиофайл', value: 'attach' });
  items.push({ icon: 'playlistAdd', label: 'Добавить в плейлист', value: 'addpl' }, { icon: 'edit', label: 'Изменить', value: 'edit' });
  if (pos != null) items.push({ icon: 'close', label: 'Убрать из этого плейлиста', value: 'unpl' });
  items.push({ icon: 'delete', label: 'Удалить из библиотеки', value: 'del', danger: true });
  const v = await sheet(t.artist ? `${t.title} — ${t.artist}` : t.title, items);
  if (v === 'play') playList([t], 0);
  else if (v === 'next') playNext(t);
  else if (v === 'attach') attachAudio(t);
  else if (v === 'addpl') addToPlaylist([t.id]);
  else if (v === 'edit') editTrack(t);
  else if (v === 'del') deleteTrack(t);
  else if (v === 'unpl') {
    const p = state.playlists.get(state.detail.id);
    p.trackIds.splice(pos, 1);
    await savePlaylist(p);
    render();
  }
}

async function exportBackup() {
  const data = { app: 'my-music', version: 1, exportedAt: new Date().toISOString(), tracks: [...state.tracks.values()], playlists: [...state.playlists.values()] };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `моя-музыка-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Копия сохранена в «Загрузки»');
}

async function restoreBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'my-music') throw new Error('Это не файл копии «Моей музыки».');
    busy('Восстанавливаю…');
    let added = 0;
    for (const t of data.tracks) {
      if (state.tracks.has(t.id)) continue;
      t.hasAudio = await DB.has('audio', t.id);
      t.hasCover = t.hasCover && (await DB.has('covers', t.id));
      state.tracks.set(t.id, t);
      added++;
    }
    await DB.putMany('tracks', [...state.tracks.values()]);
    for (const p of data.playlists) await savePlaylist(p);
    busy(false);
    render();
    modal({ title: 'Копия восстановлена', ok: 'Хорошо', cancel: null, body: `<p>Песен добавлено: <b>${added}</b>, плейлистов: <b>${data.playlists.length}</b>.</p><p>Если у песен нет звука — добавьте аудиофайлы, они подставятся сами.</p>` });
  } catch (e) {
    busy(false);
    modal({ title: 'Не получилось восстановить', ok: 'Понятно', cancel: null, body: `<p>${esc(e.message)}</p>` });
  }
}

/* ================= Player ================= */
const audio = new Audio();
audio.preload = 'auto';
const player = {
  queue: [], idx: -1, history: [], url: null,
  shuffle: localStorage.getItem('shuffle') === '1',
  repeat: localStorage.getItem('repeat') || 'off', // off | all | one
};
const currentTrack = () => state.tracks.get(player.queue[player.idx]);

// iPhones only allow sound that starts from a tap. Play silence once on the first tap to "unlock" the player.
function silentWavUrl() {
  const n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
document.addEventListener('pointerdown', () => {
  if (player.idx >= 0) return;
  audio.src = silentWavUrl();
  audio.play().then(() => audio.pause()).catch(() => {});
}, { once: true, capture: true });

function playList(tracks, start = 0, shuffle = false) {
  const playable = tracks.filter((t) => t.hasAudio);
  if (!playable.length) return toast('Здесь нет песен с аудиофайлами');
  player.queue = playable.map((t) => t.id);
  player.history = [];
  let i = Math.max(0, player.queue.indexOf(tracks[start]?.id));
  if (shuffle) {
    setShuffle(true);
    i = Math.floor(Math.random() * player.queue.length);
  }
  playAt(i);
}

function playNext(t) {
  if (player.idx < 0) return playList([t], 0);
  player.queue.splice(player.idx + 1, 0, t.id);
  toast('Сыграет следующей');
}

async function playAt(i, fromPrev = false) {
  if (i < 0 || i >= player.queue.length) return;
  if (!fromPrev && player.idx >= 0 && player.idx !== i) player.history.push(player.idx);
  player.idx = i;
  const t = currentTrack();
  const blob = t && (await DB.get('audio', t.id));
  if (!blob) {
    toast('Файл песни не найден, пропускаю');
    if (i < player.queue.length - 1) playAt(i + 1);
    return;
  }
  if (player.url) URL.revokeObjectURL(player.url);
  player.url = URL.createObjectURL(blob);
  audio.src = player.url;
  audio.play().catch((e) => { if (e.name !== 'AbortError') toast('Нажмите «Играть», чтобы начать'); });
  updateNowPlaying();
  markPlaying();
}

function nextIndex() {
  const n = player.queue.length;
  if (!n) return -1;
  if (player.shuffle && n > 1) {
    let j;
    do j = Math.floor(Math.random() * n); while (j === player.idx);
    return j;
  }
  if (player.idx < n - 1) return player.idx + 1;
  return player.repeat === 'all' ? 0 : -1;
}

function next() {
  const j = nextIndex();
  if (j >= 0) playAt(j);
  else { audio.pause(); audio.currentTime = 0; }
}

function prev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (player.history.length) return playAt(player.history.pop(), true);
  if (player.idx > 0) return playAt(player.idx - 1, true);
  audio.currentTime = 0;
}

function togglePlay() {
  if (player.idx < 0) {
    const list = state.entries.length ? state.entries.map((e) => e.t) : [...state.tracks.values()];
    return playList(list, 0);
  }
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function setShuffle(on) {
  player.shuffle = on;
  localStorage.setItem('shuffle', on ? '1' : '0');
  updateModes();
}

function cycleRepeat() {
  player.repeat = { off: 'all', all: 'one', one: 'off' }[player.repeat];
  localStorage.setItem('repeat', player.repeat);
  updateModes();
  toast({ off: 'Повтор выключен', all: 'Повтор всех песен', one: 'Повтор одной песни' }[player.repeat]);
}

function updateModes() {
  const sh = $('#full-shuffle'), rp = $('#full-repeat');
  sh.classList.toggle('on', player.shuffle);
  sh.setAttribute('aria-pressed', player.shuffle);
  rp.innerHTML = ic(player.repeat === 'one' ? 'repeatOne' : 'repeat');
  rp.classList.toggle('on', player.repeat !== 'off');
  rp.setAttribute('aria-label', { off: 'Повтор: выключен', all: 'Повтор: все песни', one: 'Повтор: одна песня' }[player.repeat]);
}

function updatePlayIcons() {
  const playing = !audio.paused && player.idx >= 0;
  for (const id of ['#mini-play', '#full-play']) {
    const b = $(id);
    b.innerHTML = ic(playing ? 'pause' : 'play');
    b.setAttribute('aria-label', playing ? 'Пауза' : 'Играть');
  }
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}

async function updateNowPlaying() {
  const t = currentTrack();
  $('#mini').hidden = !t;
  document.body.classList.toggle('has-mini', !!t);
  if (!t) return;
  $('#mini-title').textContent = $('#full-title').textContent = t.title;
  $('#mini-artist').textContent = $('#full-artist').textContent = [t.artist, t.album].filter(Boolean).join(' — ') || 'Неизвестный исполнитель';
  $('#mini-cover').innerHTML = coverHtml(t.hasCover ? t.id : null, t.album || t.title, 'sm');
  $('#full-cover').innerHTML = coverHtml(t.hasCover ? t.id : null, t.album || t.title, 'lg');
  $$('#mini-cover [data-cover], #full-cover [data-cover]').forEach(paintCover);
  document.title = `${t.title} — Моя музыка`;
  if ('mediaSession' in navigator) {
    const art = t.hasCover ? await coverUrl(t.id) : null;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist || '', album: t.album || '',
      artwork: art ? [{ src: art, sizes: '512x512' }] : [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  }
}

function updateTime() {
  const d = audio.duration || 0, c = audio.currentTime || 0;
  const pct = d ? (c / d) * 100 : 0;
  $('#mini-bar').style.width = pct + '%';
  if (!updateTime.dragging) {
    $('#seek').value = Math.round(pct * 10);
    $('#seek').style.setProperty('--p', pct + '%');
    $('#t-cur').textContent = fmt(c);
  }
  $('#t-dur').textContent = fmt(d);
  if ('mediaSession' in navigator && d && navigator.mediaSession.setPositionState) {
    try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(c, d), playbackRate: audio.playbackRate }); } catch { /* ignore */ }
  }
}

function openFull(open) {
  const f = $('#full');
  f.classList.toggle('open', open);
  f.setAttribute('aria-hidden', !open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) $('#full-close').focus();
}

audio.addEventListener('play', updatePlayIcons);
audio.addEventListener('pause', updatePlayIcons);
audio.addEventListener('timeupdate', updateTime);
audio.addEventListener('loadedmetadata', updateTime);
audio.addEventListener('ended', () => {
  if (player.idx < 0) return;
  if (player.repeat === 'one') { audio.currentTime = 0; audio.play(); }
  else next();
});

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch { /* unsupported */ } };
  set('play', () => audio.play());
  set('pause', () => audio.pause());
  set('previoustrack', prev);
  set('nexttrack', next);
  set('seekto', (e) => { audio.currentTime = e.seekTime; });
}

/* ================= Events ================= */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tabbar [data-tab]');
  if (tab) return go(tab.dataset.tab);

  const album = e.target.closest('[data-album]');
  if (album) return go('songs', { type: 'album', key: album.dataset.album });
  const pl = e.target.closest('[data-playlist]');
  if (pl) return go('playlists', { type: 'playlist', id: pl.dataset.playlist });

  const actionEl = e.target.closest('[data-action]');
  const row = e.target.closest('.row');
  if (row) {
    const t = state.tracks.get(row.dataset.id);
    const pos = row.dataset.pos !== undefined ? Number(row.dataset.pos) : null;
    if (actionEl) return rowMenu(t, pos);
    if (!t.hasAudio) return attachAudio(t);
    return playList(state.entries.map((x) => x.t), Number(row.dataset.i));
  }
  if (!actionEl) return;
  const tracksOnScreen = () => state.entries.map((x) => x.t);
  switch (actionEl.dataset.action) {
    case 'play': setShuffle(false); return playList(tracksOnScreen(), 0);
    case 'shuffle': return playList(tracksOnScreen(), 0, true);
    case 'mode':
      state.songsMode = actionEl.dataset.mode;
      localStorage.setItem('songsMode', state.songsMode);
      return render();
    case 'only-missing': state.onlyMissing = !state.onlyMissing; return renderSongsContent();
    case 'back': return go(state.tab);
    case 'new-playlist': return newPlaylist();
    case 'playlist-menu': return playlistMenu();
    case 'howto': return showHowTo();
    case 'url': return addFromUrl();
    case 'manual': return addManual();
    case 'export': return exportBackup();
    case 'install':
      installPrompt?.prompt();
      installPrompt = null;
      return;
  }
});

document.addEventListener('change', (e) => {
  const inp = e.target.closest('input[data-pick]');
  if (inp) {
    const files = [...inp.files];
    inp.value = '';
    const kind = inp.dataset.pick;
    if (kind === 'audio' || kind === 'folder') importAudio(files);
    else if (kind === 'playlist') importLists(files);
    else if (kind === 'backup') restoreBackup(files[0]);
    return;
  }
  if (e.target.id === 'sort') {
    state.sort = e.target.value;
    localStorage.setItem('sort', state.sort);
    renderSongsContent();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'search') { state.search = e.target.value; renderSongsContent(); }
});

// Player buttons
$('#mini-open').onclick = () => openFull(true);
$('#full-close').onclick = () => openFull(false);
$('#mini-play').onclick = $('#full-play').onclick = togglePlay;
$('#mini-next').onclick = $('#full-next').onclick = next;
$('#full-prev').onclick = prev;
$('#full-shuffle').onclick = () => setShuffle(!player.shuffle);
$('#full-repeat').onclick = cycleRepeat;
$('#full-more').onclick = () => { const t = currentTrack(); if (t) rowMenu(t, null); };
const seek = $('#seek');
seek.oninput = () => {
  updateTime.dragging = true;
  seek.style.setProperty('--p', seek.value / 10 + '%');
  $('#t-cur').textContent = fmt((seek.value / 1000) * (audio.duration || 0));
};
seek.onchange = () => {
  if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
  updateTime.dragging = false;
};
const vol = $('#volume');
vol.value = localStorage.getItem('volume') ?? 1;
audio.volume = Number(vol.value);
vol.style.setProperty('--p', vol.value * 100 + '%');
vol.oninput = () => {
  audio.volume = Number(vol.value);
  vol.style.setProperty('--p', vol.value * 100 + '%');
  localStorage.setItem('volume', vol.value);
};
if (IS_IOS) $('#volume-row').hidden = true; // iPhone volume is controlled by its buttons only

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, dialog')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'Escape') openFull(false);
});

// Drag and drop files onto the window (computer)
let dragDepth = 0;
addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { dragDepth++; $('#drop').hidden = false; } });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#drop').hidden = true; } });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('#drop').hidden = true;
  const files = [...(e.dataTransfer?.files || [])];
  const lists = files.filter((f) => /\.(xml|txt|csv|tsv|m3u8?)$/i.test(f.name));
  const audioFiles = files.filter((f) => !lists.includes(f));
  if (lists.length) importLists(lists);
  else if (audioFiles.length) importAudio(audioFiles);
});

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  if (state.tab === 'add') fillAddExtras();
});

/* ================= Start ================= */
$$('.ic-slot').forEach((s) => { s.outerHTML = ic(s.dataset.icon); });
$('#mini-next').innerHTML = $('#full-next').innerHTML = ic('next');
$('#full-prev').innerHTML = ic('prev');
$('#full-shuffle').innerHTML = ic('shuffle');
$('#full-close').innerHTML = ic('down');
$('#full-more').innerHTML = ic('more');
updateModes();
updatePlayIcons();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW failed', e));
}

loadData()
  .then(render)
  .catch((e) => {
    console.error(e);
    $('#view').innerHTML = emptyHtml('close', 'Не удалось открыть библиотеку', esc(e.message));
  });
