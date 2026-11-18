'use strict';
/*
 * Reads song info (title, artist, album, track number, cover) from audio files.
 * Supports ID3 (MP3), MP4 atoms (M4A/AAC/ALAC) and FLAC Vorbis comments.
 * Returns {} when nothing could be read — the app then falls back to the file name.
 */
const Tags = (() => {
  const str = (b, p, n) => { let s = ''; for (let i = 0; i < n && p + i < b.length; i++) s += String.fromCharCode(b[p + i]); return s; };
  const be32 = (b, p) => b[p] * 0x1000000 + ((b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]);
  const synchsafe = (b, p) => ((b[p] & 0x7f) << 21) | ((b[p + 1] & 0x7f) << 14) | ((b[p + 2] & 0x7f) << 7) | (b[p + 3] & 0x7f);
  const decode = (enc, bytes) => { try { return new TextDecoder(enc).decode(bytes); } catch { return ''; } };
  const utf8 = (bytes) => decode('utf-8', bytes);
  const tidy = (s) => s.split('\0').map((x) => x.trim()).filter(Boolean).join(', ');

  // ID3 "latin1" text is very often actually Windows-1251 in Russian MP3s.
  function latin(bytes) {
    let high = 0;
    for (const b of bytes) if (b >= 0xc0) high++;
    return decode(high > bytes.length * 0.3 ? 'windows-1251' : 'windows-1252', bytes);
  }

  function id3Text(d) {
    const enc = d[0];
    const body = d.subarray(1);
    if (enc === 0) return tidy(latin(body));
    if (enc === 1) {
      const le = !(body[0] === 0xfe && body[1] === 0xff);
      return tidy(decode(le ? 'utf-16le' : 'utf-16be', body).replace(/^﻿/, ''));
    }
    if (enc === 2) return tidy(decode('utf-16be', body));
    return tidy(utf8(body));
  }

  function id3Picture(d, v22) {
    const enc = d[0];
    let p = 1;
    let mime;
    if (v22) {
      mime = str(d, 1, 3).toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
      p = 4;
    } else {
      const z = d.indexOf(0, p);
      mime = str(d, p, z - p).toLowerCase() || 'image/jpeg';
      if (!mime.includes('/')) mime = 'image/' + mime;
      p = z + 1;
    }
    p++; // picture type byte
    if (enc === 1 || enc === 2) { while (p + 1 < d.length && (d[p] || d[p + 1])) p += 2; p += 2; }
    else { while (p < d.length && d[p]) p++; p++; }
    return new Blob([d.slice(p)], { type: mime });
  }

  function id3(b) {
    const v = b[3];
    const flags = b[5];
    const end = Math.min(b.length, 10 + synchsafe(b, 6));
    let p = 10;
    if (flags & 0x40) p += v === 4 ? synchsafe(b, p) : be32(b, p) + 4;
    const out = {};
    const hdr = v === 2 ? 6 : 10;
    while (p + hdr <= end) {
      const id = str(b, p, v === 2 ? 3 : 4);
      const size = v === 2 ? (b[p + 3] << 16) | (b[p + 4] << 8) | b[p + 5] : v === 4 ? synchsafe(b, p + 4) : be32(b, p + 4);
      if (!/^[A-Z0-9]{3,4}$/.test(id) || size <= 0) break;
      const d = b.subarray(p + hdr, p + hdr + size);
      p += hdr + size;
      if (id === 'TIT2' || id === 'TT2') out.title = id3Text(d);
      else if (id === 'TPE1' || id === 'TP1') out.artist = id3Text(d);
      else if (id === 'TPE2' || id === 'TP2') out.albumArtist = id3Text(d);
      else if (id === 'TALB' || id === 'TAL') out.album = id3Text(d);
      else if (id === 'TRCK' || id === 'TRK') out.trackNo = parseInt(id3Text(d), 10) || 0;
      else if ((id === 'APIC' || id === 'PIC') && !out.cover) out.cover = id3Picture(d, id === 'PIC');
    }
    return out;
  }

  function mp4(b) {
    const out = {};
    const walk = (start, end, parent) => {
      let p = start;
      while (p + 8 <= end) {
        let size = be32(b, p);
        const type = str(b, p + 4, 4);
        let h = 8;
        if (size === 1) { size = be32(b, p + 8) * 2 ** 32 + be32(b, p + 12); h = 16; }
        else if (size === 0) size = end - p;
        if (size < h) break;
        const cs = p + h;
        const ce = Math.min(p + size, end);
        if (type === 'moov' || type === 'udta' || type === 'ilst') walk(cs, ce, type);
        else if (type === 'meta') walk(cs + 4, ce, type); // "meta" is a full box: skip version/flags
        else if (parent === 'ilst' && str(b, cs + 4, 4) === 'data') {
          const kind = be32(b, cs + 8) & 0xffffff;
          const val = b.subarray(cs + 16, cs + be32(b, cs));
          if (type === '\xa9nam') out.title = utf8(val);
          else if (type === '\xa9ART') out.artist = utf8(val);
          else if (type === 'aART') out.albumArtist = utf8(val);
          else if (type === '\xa9alb') out.album = utf8(val);
          else if (type === 'trkn') out.trackNo = (val[2] << 8) | val[3];
          else if (type === 'covr' && !out.cover) out.cover = new Blob([val.slice()], { type: kind === 14 ? 'image/png' : 'image/jpeg' });
        }
        p += size;
      }
    };
    walk(0, b.length, '');
    return out;
  }

  function flac(b) {
    const out = {};
    let p = 4;
    while (p + 4 <= b.length) {
      const hdr = b[p];
      const type = hdr & 0x7f;
      const len = (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
      const s = p + 4;
      if (type === 4) {
        const dv = new DataView(b.buffer, b.byteOffset + s, Math.min(len, b.length - s));
        let q = 4 + dv.getUint32(0, true);
        const count = dv.getUint32(q, true);
        q += 4;
        for (let i = 0; i < count && q + 4 <= dv.byteLength; i++) {
          const l = dv.getUint32(q, true);
          q += 4;
          const c = utf8(b.subarray(s + q, s + q + l));
          q += l;
          const eq = c.indexOf('=');
          const key = c.slice(0, eq).toUpperCase();
          const val = c.slice(eq + 1).trim();
          if (key === 'TITLE') out.title = val;
          else if (key === 'ARTIST' && !out.artist) out.artist = val;
          else if (key === 'ALBUMARTIST') out.albumArtist = val;
          else if (key === 'ALBUM') out.album = val;
          else if (key === 'TRACKNUMBER') out.trackNo = parseInt(val, 10) || 0;
        }
      } else if (type === 6 && !out.cover) {
        const dv = new DataView(b.buffer, b.byteOffset + s);
        let q = 4;
        const ml = dv.getUint32(q); q += 4;
        const mime = str(b, s + q, ml); q += ml;
        const dl = dv.getUint32(q); q += 4 + dl + 16;
        const pl = dv.getUint32(q); q += 4;
        out.cover = new Blob([b.slice(s + q, s + q + pl)], { type: mime || 'image/jpeg' });
      }
      if (hdr & 0x80) break; // last metadata block
      p = s + len;
    }
    return out;
  }

  async function read(file) {
    try {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (str(head, 0, 3) === 'ID3') {
        const size = synchsafe(head, 6) + 10;
        return id3(new Uint8Array(await file.slice(0, Math.min(size, 30e6)).arrayBuffer()));
      }
      if (str(head, 0, 4) === 'fLaC') return flac(new Uint8Array(await file.slice(0, 16e6).arrayBuffer()));
      if (str(head, 4, 4) === 'ftyp' && file.size < 500e6) return mp4(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      console.warn('Tag read failed', file.name, e);
    }
    return {};
  }

  return { read };
})();
