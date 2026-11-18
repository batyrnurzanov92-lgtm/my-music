'use strict';
/*
 * Tiny wrapper around IndexedDB — the browser's built-in database.
 * Everything (song info, audio files, covers, playlists) is stored on the device.
 * Stores:
 *   tracks    — song info objects { id, title, artist, album, ... }
 *   playlists — { id, name, trackIds: [] }
 *   audio     — audio Blob per track id
 *   covers    — cover image Blob per track id
 */
const DB = (() => {
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open('my-music', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore('tracks', { keyPath: 'id' });
          db.createObjectStore('playlists', { keyPath: 'id' });
          db.createObjectStore('audio');
          db.createObjectStore('covers');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  // Runs fn(store) inside a transaction and resolves with the last request's result.
  async function run(storeName, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      const req = fn(store);
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  return {
    all: (store) => run(store, 'readonly', (s) => s.getAll()),
    get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
    has: async (store, key) => (await run(store, 'readonly', (s) => s.count(key))) > 0,
    put: (store, value, key) => run(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key))),
    putMany: (store, values) => run(store, 'readwrite', (s) => { values.forEach((v) => s.put(v)); }),
    del: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
  };
})();
