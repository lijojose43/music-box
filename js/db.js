const DB_NAME = 'MusicBox';
const DB_VER = 1;
const STORE = 'tiles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('order', 'order', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

const db = {
  async getAll() {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('order');
      const req = index.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
        d.close();
      };
      req.onerror = e => {
        reject(e.target.error);
        d.close();
      };
    });
  },

  async add(tile) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.add(tile);
      req.onsuccess = () => {
        resolve(tile.id);
        d.close();
      };
      req.onerror = e => {
        reject(e.target.error);
        d.close();
      };
    });
  },

  async put(tile) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put(tile);
      req.onsuccess = () => {
        resolve(tile.id);
        d.close();
      };
      req.onerror = e => {
        reject(e.target.error);
        d.close();
      };
    });
  },

  async remove(id) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete(id);
      req.onsuccess = () => {
        resolve();
        d.close();
      };
      req.onerror = e => {
        reject(e.target.error);
        d.close();
      };
    });
  },

  async updateOrder(items) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let remaining = items.length;
      items.forEach(({ id, order }) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const tile = getReq.result;
          if (tile) {
            tile.order = order;
            store.put(tile);
          }
          if (--remaining === 0) {
            resolve();
            d.close();
          }
        };
        getReq.onerror = () => {
          if (--remaining === 0) {
            resolve();
            d.close();
          }
        };
      });
      tx.onerror = e => {
        reject(e.target.error);
        d.close();
      };
    });
  }
};
