'use strict';
/*
 * Parsers for exported libraries and playlists:
 *   - Apple Music / iTunes library or playlist XML  (File > Library > Export...)
 *   - iTunes playlist text export (.txt, tab separated, UTF-16)
 *   - CSV from transfer services (TuneMyMusic, Soundiiz, Exportify, ...)
 *   - M3U / M3U8 playlists
 * Every parser returns { tracks: [{ref, title, artist, album, duration}], playlists: [{name, refs}] }.
 */
const Importers = (() => {
  async function readText(file) {
    const b = new Uint8Array(await file.arrayBuffer());
    if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
    if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, ''); }
    catch { return new TextDecoder('windows-1251').decode(b); }
  }

  const baseName = (name) => name.replace(/\.[^.]+$/, '');

  // "01 - Artist - Title" / "Artist – Title" -> { artist, title }
  function splitArtistTitle(name) {
    const clean = name.replace(/^\s*\d{1,3}\s*[-.)]\s*/, '').trim();
    const m = clean.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: clean };
  }

  function parseDuration(v) {
    v = String(v || '').trim();
    if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(v)) return v.split(':').reduce((acc, x) => acc * 60 + Number(x), 0);
    return Number(v) || 0;
  }

  /* ---------- Apple Music / iTunes XML (property list) ---------- */
  function plist(node) {
    switch (node.tagName) {
      case 'dict': {
        const o = {};
        let key = null;
        for (const c of node.children) {
          if (c.tagName === 'key') key = c.textContent;
          else o[key] = plist(c);
        }
        return o;
      }
      case 'array': return [...node.children].map(plist);
      case 'integer': case 'real': return Number(node.textContent);
      case 'true': return true;
      case 'false': return false;
      case 'data': return null;
      default: return node.textContent;
    }
  }

  function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Файл XML повреждён или это не экспорт из Apple Music/iTunes.');
    const root = doc.querySelector('plist > dict');
    if (!root) throw new Error('В файле нет библиотеки Apple Music/iTunes.');
    const lib = plist(root);
    const isVideo = (t) => t['Has Video'] || t.Podcast || t['Music Video'] || t.Movie || t['TV Show'] || /video|видео/i.test(t.Kind || '');
    const tracks = Object.values(lib.Tracks || {})
      .filter((t) => t && t.Name && !isVideo(t))
      .map((t) => ({
        ref: String(t['Track ID']),
        title: String(t.Name),
        artist: String(t.Artist || t['Album Artist'] || ''),
        albumArtist: String(t['Album Artist'] || ''),
        album: String(t.Album || ''),
        duration: (t['Total Time'] || 0) / 1000,
        trackNo: t['Track Number'] || 0,
        addedAt: Date.parse(t['Date Added']) || 0,
      }));
    const playlists = (lib.Playlists || [])
      .filter((p) => !p.Master && !p['Distinguished Kind'] && !p.Folder && p.Visible !== false && p['Playlist Items'])
      .map((p) => ({ name: String(p.Name || 'Плейлист'), refs: p['Playlist Items'].map((i) => String(i['Track ID'])) }));
    return { tracks, playlists };
  }

  /* ---------- CSV / TSV tables ---------- */
  function parseDelimited(text) {
    const first = text.split(/\r?\n/, 1)[0];
    const count = (ch) => first.split(ch).length - 1;
    const delim = count('\t') ? '\t' : count(';') > count(',') ? ';' : ',';
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
        else cell += c;
      } else if (c === '"' && cell === '') quoted = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  const COLUMNS = {
    title: /^(name|title|track ?name|track ?title|song|song ?name|название|название трека|песня|трек)$/i,
    artist: /^(artist|artists|artist ?name(\(s\))?|artist ?names|исполнитель|исполнители|артист)$/i,
    album: /^(album|album ?name|альбом)$/i,
    playlist: /^(playlist|playlist ?name|плейлист)$/i,
    time: /^(time|duration|duration ?\(ms\)|track ?duration ?\(ms\)|длительность|время)$/i,
  };

  function parseTable(text, fileName) {
    const rows = parseDelimited(text);
    if (rows.length < 2) throw new Error('В файле нет песен.');
    const head = rows[0].map((h) => h.trim());
    const col = (k) => head.findIndex((h) => COLUMNS[k].test(h));
    const ti = col('title'), ai = col('artist'), bi = col('album'), pi = col('playlist'), di = col('time');
    if (ti < 0) throw new Error('Не нашёл колонку с названием песни. В файле нужны колонки «Name/Title» и «Artist».');
    const inMs = di >= 0 && /ms/i.test(head[di]);
    const tracks = [];
    const groups = new Map();
    rows.slice(1).forEach((r, i) => {
      const title = (r[ti] || '').trim();
      if (!title) return;
      const ref = String(i);
      let duration = di >= 0 ? parseDuration(r[di]) : 0;
      if (inMs) duration /= 1000;
      tracks.push({ ref, title, artist: ai >= 0 ? (r[ai] || '').trim() : '', album: bi >= 0 ? (r[bi] || '').trim() : '', duration });
      const pl = pi >= 0 && (r[pi] || '').trim() ? r[pi].trim() : baseName(fileName);
      if (!groups.has(pl)) groups.set(pl, []);
      groups.get(pl).push(ref);
    });
    return { tracks, playlists: [...groups].map(([name, refs]) => ({ name, refs })) };
  }

  /* ---------- M3U ---------- */
  function parseM3U(text, fileName) {
    const tracks = [];
    let info = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#EXTINF:')) {
        const m = line.match(/^#EXTINF:(-?\d+)[^,]*,(.*)$/);
        info = m ? { dur: Number(m[1]), name: m[2] } : null;
        continue;
      }
      if (line.startsWith('#')) continue;
      let fileTitle = line.split(/[\\/]/).pop();
      try { fileTitle = decodeURIComponent(fileTitle); } catch { /* keep as is */ }
      const p = splitArtistTitle(info?.name || baseName(fileTitle));
      tracks.push({ ref: String(tracks.length), title: p.title, artist: p.artist, album: '', duration: info?.dur > 0 ? info.dur : 0 });
      info = null;
    }
    return { tracks, playlists: [{ name: baseName(fileName), refs: tracks.map((t) => t.ref) }] };
  }

  async function parse(file) {
    const text = await readText(file);
    const head = text.slice(0, 3000);
    if (/<plist|<!DOCTYPE plist/i.test(head)) return parseXml(text);
    if (/^#EXTM3U/.test(head.trim()) || /\.m3u8?$/i.test(file.name)) return parseM3U(text, file.name);
    return parseTable(text, file.name);
  }

  return { parse, splitArtistTitle };
})();
