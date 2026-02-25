export type LibraryItem = {
  id: string;
  status: string;
  created: number;
  elements: any[];
  name?: string;
  svg?: string;
};

const DB_NAME = "BoardLibraryDB";
const STORE_NAME = "libraryItems";
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB for storing custom Excalidraw-like library items.
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error", event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Saves a single library item or an array of library items.
 */
export async function saveLibraryItems(items: LibraryItem | LibraryItem[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const itemsToSave = Array.isArray(items) ? items : [items];

    itemsToSave.forEach((item) => {
      // Ensure it has an id, fallback if standard format wasn't respected
      if (!item.id) {
        item.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      }
      store.put(item);
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Error saving library items", event);
      db.close();
      reject((event.target as IDBRequest).error);
    };
  });
}

/**
 * Retrieves all saved library items.
 */
export async function getAllLibraryItems(): Promise<LibraryItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result as LibraryItem[];
      db.close();
      resolve(result || []);
    };

    request.onerror = (event) => {
      console.error("Error fetching library items", event);
      db.close();
      reject((event.target as IDBRequest).error);
    };
  });
}
